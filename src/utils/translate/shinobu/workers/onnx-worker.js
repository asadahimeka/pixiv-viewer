/**
 * @file ONNX Runtime Web Worker (Shinobu).
 *
 * Mechanically converted from ShinobuTranslator `src/workers/onnx-worker.ts`
 * (TS → JS). Communicates with the main thread via comlink.
 *
 * Exposes: init, createSession, runInference, probeRuntime,
 *          probePaddleGraphCapture, runDetectWithGpuPreprocess,
 *          disposeSession, disposeAll
 */

/* globals GPUBufferUsage */

import * as ortAll from 'onnxruntime-web/all'
import * as Comlink from 'comlink'
import localforage from 'localforage'
import { serializeOnnxSessionOptions } from '../runtime/onnxSessionOptions.js'
import { isContextLostRuntimeError, isCreateTimeoutError } from '../runtime/onnxTypes.js'
import { preprocessLetterboxGpu } from './gpuPreprocess.js'
import { SerialInferenceQueue } from './inferenceQueue.js'

// ---------------------------------------------------------------------------
// Inline helpers (replacing src/shared/utils.ts imports — not yet ported)
// ---------------------------------------------------------------------------

/**
 * @param {unknown} error
 * @returns {string}
 */
function toErrorMessage(error) {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

// ---------------------------------------------------------------------------
// Model binary cache — IndexedDB via localforage (worker-safe, no rAF)
// ---------------------------------------------------------------------------

/**
 * Dedicated IndexedDB store for model binaries.
 *
 * NOTE: we deliberately use localforage directly here instead of
 * src/utils/storage/localDb.js — that wrapper's constructor touches
 * `window.requestIdleCallback`, which is undefined inside a worker.
 *
 * @type {LocalForage}
 */
const modelCache = localforage.createInstance({
  name: 'shinobu-models',
  storeName: 'models',
})

/**
/**
 * Build a stable cache key for a model URL.
 *
 * Uses only the filename (not the full URL) so the same model binary is
 * shared across sources: local `./models/detector.onnx` and the GitHub CDN
 * release URL both resolve to `detector.onnx` → the same cache entry. This
 * means switching between local dev and CDN keeps previously cached models.
 *
 * @param {string} modelUrl
 * @returns {string}
 */
function cacheKeyFor(modelUrl) {
  const filename = modelUrl.split('/').pop()
  return `shinobu-model:${filename}`
}

/**
 * Look up a cached model binary. Returns `null` on miss or read error —
 * callers fall back to a network download.
 *
 * Reads the filename-based key first. On miss, falls back to the legacy
 * full-URL key (used before cache keys were normalized to filenames) and
 * migrates the hit to the new key so old caches survive the upgrade.
 *
 * @param {string} modelUrl
 * @returns {Promise<ArrayBuffer | null>}
 */
async function getCachedModel(modelUrl) {
  try {
    const key = cacheKeyFor(modelUrl)
    const value = await modelCache.getItem(key)
    if (value instanceof ArrayBuffer) return value
    // 旧缓存 key 是完整 URL（可能是 GitHub URL 或本地 /models/ 路径），逐一回退并迁移
    const legacyKeys = [
      `shinobu-model:${modelUrl}`,
      `shinobu-model:/models/${modelUrl.split('/').pop()}`,
    ]
    for (const legacyKey of legacyKeys) {
      if (legacyKey === key) continue
      const legacyValue = await modelCache.getItem(legacyKey)
      if (legacyValue instanceof ArrayBuffer) {
        await modelCache.setItem(key, legacyValue)
        return legacyValue
      }
    }
    return null
  } catch (error) {
    console.warn(`[onnx-worker] 读取模型缓存失败，将重新下载: ${toErrorMessage(error)}`)
    return null
  }
}

/**
 * Write a model binary to the cache.
 *
 * On `QuotaExceededError` the largest cached model is evicted and the write is
 * retried once. If that still fails (or on any other storage error) we degrade
 * gracefully: warn, notify the main thread, and keep the already-downloaded
 * ArrayBuffer so session creation is never blocked.
 *
 * @param {string} modelUrl
 * @param {ArrayBuffer} buffer
 * @returns {Promise<boolean>} `true` when the write succeeded, `false` otherwise
 */
async function setCachedModel(modelUrl, buffer) {
  try {
    await modelCache.setItem(cacheKeyFor(modelUrl), buffer)
    return true
  } catch (error) {
    const isQuota =
      (error && error.name === 'QuotaExceededError') ||
      /quota/i.test((error && error.message) || '')
    if (isQuota) {
      console.warn(
        `[onnx-worker] 模型缓存空间不足（${cacheKeyFor(modelUrl)}），清除最大缓存项后重试...`
      )
      await evictLargestModel()
      try {
        await modelCache.setItem(cacheKeyFor(modelUrl), buffer)
        console.log(`[onnx-worker] 清除后模型缓存写入成功: ${cacheKeyFor(modelUrl)}`)
        return true
      } catch (retryError) {
        console.warn(
          `[onnx-worker] 清除后模型缓存仍写入失败，将每次重新下载: ${toErrorMessage(retryError)}`
        )
        notifyCacheQuotaWarning()
        return false
      }
    }
    console.warn(`[onnx-worker] 模型缓存写入失败，继续使用已下载数据: ${toErrorMessage(error)}`)
    return false
  }
}

/**
 * Remove the single largest cached model binary to free up IndexedDB quota.
 *
 * Deliberately minimal (not a full LRU): only called on `QuotaExceededError`
 * before one retry. Unreadable entries are skipped — they can't help anyway.
 *
 * @returns {Promise<void>}
 */
async function evictLargestModel() {
  try {
    const keys = await modelCache.keys()
    let largestKey = null
    let largestSize = -1
    for (const key of keys) {
      try {
        const value = await modelCache.getItem(key)
        const size = value instanceof ArrayBuffer ? value.byteLength : 0
        if (size > largestSize) {
          largestSize = size
          largestKey = key
        }
      } catch (error) {
        // Skip unreadable entries.
      }
    }
    if (largestKey) {
      await modelCache.removeItem(largestKey)
      console.log(
        `[onnx-worker] 已清除最大模型缓存项: ${largestKey} (${(largestSize / 1024 / 1024).toFixed(1)} MB)`
      )
    }
  } catch (error) {
    console.warn(`[onnx-worker] 清除模型缓存失败: ${toErrorMessage(error)}`)
  }
}

/**
 * Notify the main thread that model caching is permanently unavailable (quota
 * still too small even after eviction), so it can surface a user-facing toast.
 *
 * Uses a plain `postMessage` — Comlink's message filter ignores payloads
 * without an `id`, so this never interferes with the RPC protocol.
 */
function notifyCacheQuotaWarning() {
  try {
    self.postMessage({ type: 'shinobu-cache-quota-warning' })
  } catch (error) {
    console.warn(`[onnx-worker] 模型缓存空间不足，将每次重新下载: ${toErrorMessage(error)}`)
  }
}

/**
 * Fetch a model binary with CORS fallback via COMMON_PROXY.
 *
 * GitHub release URLs redirect to objects.githubusercontent.com which may fail
 * CORS in the worker. When a direct fetch fails, retry through COMMON_PROXY
 * by simply prefixing the URL (the proxy forwards the request server-side).
 *
 * @param {string} modelUrl
 * @returns {Promise<Response>}
 */
async function fetchModelWithFallback(modelUrl) {
  try {
    const direct = await fetch(modelUrl)
    if (direct.ok) return direct
  } catch (e) {
    // direct fetch failed (network/CORS) — fall through to proxy
  }
  const COMMON_PROXY = process.env.VUE_APP_COMMON_PROXY
  const proxyUrl = COMMON_PROXY ? COMMON_PROXY + modelUrl : null
  if (proxyUrl) {
    const proxied = await fetch(proxyUrl)
    if (proxied.ok) return proxied
  }
  throw new Error(`模型下载失败: ${modelUrl}`)
}

/**
 * Load a model binary, cache-first.
 *
 * Hit → return cached ArrayBuffer (no network). Miss → fetch the URL, write
 * the bytes into the cache (best-effort), and return them.
 *
 * @param {string} modelUrl
 * @returns {Promise<ArrayBuffer>}
 */
async function loadModelBuffer(modelUrl) {
  const cached = await getCachedModel(modelUrl)
  if (cached) {
    return cached
  }
  const response = await fetchModelWithFallback(modelUrl)
  const buffer = await response.arrayBuffer()
  await setCachedModel(modelUrl, buffer)
  return buffer
}

// ---------------------------------------------------------------------------
// ORT environment
// ---------------------------------------------------------------------------

let envInitialized = false
/** @type {string | null} */
let ortPathOverride = null

/**
 * @param {string} ortPath
 * @returns {Promise<void>}
 */
function init(ortPath) {
  ortPathOverride = ortPath
  return Promise.resolve()
}

function ensureOrtEnv() {
  if (envInitialized) return

  // Blob URL Workers run in the page's origin and cannot access chrome.runtime.
  // The ORT WASM path is provided by the main thread via init() (priority),
  // falling back to VUE_APP_ORT_WASM_PATH, then the jsdelivr CDN default.
  const envWasmPath = process.env.VUE_APP_ORT_WASM_PATH
  const ortPath = ortPathOverride ?? (envWasmPath || 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/')

  const hwThreads =
    typeof navigator !== 'undefined' && typeof navigator.hardwareConcurrency === 'number'
      ? navigator.hardwareConcurrency
      : 1
  const canUseWasmThreads =
    typeof globalThis !== 'undefined' && !!globalThis.crossOriginIsolated
  const wasmThreads = canUseWasmThreads ? Math.max(1, Math.min(8, hwThreads)) : 1

  ortAll.env.wasm.wasmPaths = ortPath
  ortAll.env.wasm.numThreads = wasmThreads
  ortAll.env.wasm.proxy = false

  if (ortAll.env.webgpu) {
    ortAll.env.webgpu.powerPreference = 'high-performance'
  }

  if (!canUseWasmThreads && hwThreads > 1) {
    console.warn('[onnx-worker] 非 crossOriginIsolated，WASM 线程数被限制为 1')
  }

  envInitialized = true
}

/** @returns {GPUDevice | undefined} */
function getWebGpuDevice() {
  return ortAll.env.webgpu?.device
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

const SESSION_CREATE_TIMEOUT_MS = 30000
/** @type {Map<string, Promise<void>>} */
const perModelLocks = new Map()
const inferenceQueue = new SerialInferenceQueue()

/**
 * @typedef {Object} SessionEntry
 * @property {import('onnxruntime-common').InferenceSession} session
 * @property {import('../runtime/onnxTypes.js').RuntimeProvider} provider
 * @property {import('../runtime/onnxTypes.js').WebNnDeviceType} [webnnDeviceType]
 * @property {string} modelUrl
 */

/** @type {Map<string, SessionEntry>} */
const sessions = new Map()

/**
 * @template T
 * @param {string} modelUrl
 * @param {() => Promise<T>} task
 * @returns {Promise<T>}
 */
async function withPerModelLock(modelUrl, task) {
  const previous = perModelLocks.get(modelUrl) ?? Promise.resolve()
  /** @type {() => void} */
  let release = () => undefined
  perModelLocks.set(modelUrl, new Promise(resolve => { release = resolve }))
  await previous
  try {
    return await task()
  } finally {
    release()
  }
}

/** @returns {{ available: boolean, reason?: string }} */
function probeWebNnAvailability() {
  const isSecure = typeof globalThis !== 'undefined' && globalThis.isSecureContext === true
  if (!isSecure) {
    return { available: false, reason: '当前不是安全上下文，WebNN 不可用' }
  }
  const nav = typeof navigator === 'undefined' ? null : navigator
  if (!nav?.ml) {
    return { available: false, reason: 'navigator.ml 不可用' }
  }
  return { available: true }
}

/** @returns {Promise<{ available: boolean, reason?: string }>} */
async function probeWebGpuAvailability() {
  const nav = typeof navigator === 'undefined' ? null : navigator
  if (!nav?.gpu?.requestAdapter) {
    return { available: false, reason: 'navigator.gpu 不可用' }
  }
  try {
    const adapter = await nav.gpu.requestAdapter()
    if (!adapter) {
      return { available: false, reason: 'navigator.gpu.requestAdapter() 返回空' }
    }
    return { available: true }
  } catch (error) {
    return { available: false, reason: `WebGPU 适配器初始化失败: ${toErrorMessage(error)}` }
  }
}

/**
 * @param {import('../runtime/onnxTypes.js').RuntimeProvider} provider
 * @returns {Array<import('onnxruntime-common').InferenceSession.ExecutionProviderConfig>}
 */
function getExecutionProviderAttempts(provider) {
  if (provider === 'webnn') {
    return [
      { name: 'webnn', deviceType: 'gpu', powerPreference: 'high-performance' },
      { name: 'webnn', deviceType: 'cpu' },
      'webnn',
    ]
  }
  return [provider]
}

/**
 * @param {import('onnxruntime-common').InferenceSession.ExecutionProviderConfig} ep
 * @returns {import('../runtime/onnxTypes.js').WebNnDeviceType}
 */
function inferWebNnDeviceType(ep) {
  if (typeof ep === 'object' && ep !== null && 'name' in ep && ep.name === 'webnn') {
    if ('deviceType' in ep && ep.deviceType === 'gpu') return 'gpu'
    if ('deviceType' in ep && ep.deviceType === 'cpu') return 'cpu'
  }
  return 'default'
}

/**
 * @param {string} modelUrl
 * @param {*} options
 * @param {number} timeoutMs
 * @returns {Promise<import('onnxruntime-common').InferenceSession>}
 */
async function createSessionWithTimeout(modelUrl, options, timeoutMs) {
  /** @type {ReturnType<typeof setTimeout> | null} */
  let timer = null
  try {
    return await Promise.race([
      (async () => {
        const buffer = await loadModelBuffer(modelUrl)
        return ortAll.InferenceSession.create(buffer, options)
      })(),
      new Promise((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`Session 创建超时(${timeoutMs}ms)`)), timeoutMs)
      }),
    ])
  } finally {
    if (timer !== null) clearTimeout(timer)
  }
}

/**
 * @param {string} modelKey
 * @param {string} modelUrl
 * @param {Array<import('../runtime/onnxTypes.js').RuntimeProvider>} preferred
 * @param {import('../runtime/onnxSessionOptions.js').OnnxSessionOptions} [experimentalSessionOptions]
 * @returns {Promise<import('../runtime/onnxWorkerTypes.js').WorkerSessionHandle>}
 */
async function createSession(modelKey, modelUrl, preferred, experimentalSessionOptions) {
  return withPerModelLock(modelUrl, async () => {
    ensureOrtEnv()
    const normalized = preferred.filter((item, idx) => preferred.indexOf(item) === idx)
    const sessionOptionsKey = serializeOnnxSessionOptions(experimentalSessionOptions)
    const sessionId = `${modelKey}:${normalized.join(',')}:${sessionOptionsKey}`

    // Check if session already cached
    const existing = sessions.get(sessionId)
    if (existing) {
      return {
        sessionId,
        provider: existing.provider,
        webnnDeviceType: existing.webnnDeviceType,
        inputNames: [...existing.session.inputNames],
        outputNames: [...existing.session.outputNames],
      }
    }

    /** @type {Array<import('../runtime/onnxTypes.js').RuntimeProvider>} */
    const providerOrder = []
    /** @type {Partial<Record<import('../runtime/onnxTypes.js').RuntimeProvider, string>>} */
    const providerErrors = {}

    for (const provider of normalized) {
      if (provider === 'webnn') {
        const probe = probeWebNnAvailability()
        if (probe.available) {
          providerOrder.push(provider)
        } else if (probe.reason) {
          providerErrors.webnn = probe.reason
        }
        continue
      }
      if (provider === 'webgpu') {
        const probe = await probeWebGpuAvailability()
        if (probe.available) {
          providerOrder.push(provider)
        } else if (probe.reason) {
          providerErrors.webgpu = probe.reason
        }
        continue
      }
      providerOrder.push(provider)
    }

    if (providerOrder.length === 0) {
      providerOrder.push('wasm')
    }

    for (const provider of providerOrder) {
      const attemptErrors = []
      let abortProvider = false
      for (const ep of getExecutionProviderAttempts(provider)) {
        if (abortProvider) break
        const maxAttempts = provider === 'webnn' ? 2 : 1
        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
          try {
            const sessionOptions = {
              executionProviders: [ep],
              graphOptimizationLevel: 'all',
            }
            if (provider === 'webgpu' && experimentalSessionOptions) {
              if (typeof experimentalSessionOptions.enableGraphCapture === 'boolean') {
                sessionOptions.enableGraphCapture = experimentalSessionOptions.enableGraphCapture
              }
              if (experimentalSessionOptions.preferredOutputLocation !== undefined) {
                sessionOptions.preferredOutputLocation = experimentalSessionOptions.preferredOutputLocation
              }
              if (experimentalSessionOptions.freeDimensionOverrides) {
                sessionOptions.freeDimensionOverrides = experimentalSessionOptions.freeDimensionOverrides
              }
            }
            if (provider === 'webgpu' && modelKey === 'detector') {
              sessionOptions.preferredOutputLocation = 'gpu-buffer'
            }
            const session = await createSessionWithTimeout(
              modelUrl,
              sessionOptions,
              SESSION_CREATE_TIMEOUT_MS
            )

            const webnnDeviceType = provider === 'webnn' ? inferWebNnDeviceType(ep) : undefined

            if (provider === 'wasm') {
              if (providerErrors.webnn) {
                console.warn(`[onnx-worker] WebNN 不可用，回退到 WASM: ${providerErrors.webnn}`)
              }
              if (providerErrors.webgpu) {
                console.warn(`[onnx-worker] WebGPU 不可用，回退到 WASM: ${providerErrors.webgpu}`)
              }
            }

            sessions.set(sessionId, { session, provider, webnnDeviceType, modelUrl })

            return {
              sessionId,
              provider,
              webnnDeviceType,
              inputNames: [...session.inputNames],
              outputNames: [...session.outputNames],
            }
          } catch (error) {
            const message = toErrorMessage(error)
            attemptErrors.push(message)
            if (isCreateTimeoutError(message)) {
              abortProvider = true
              break
            }
            if (provider === 'webnn' && attempt + 1 < maxAttempts && isContextLostRuntimeError(error)) {
              await new Promise(resolve => setTimeout(resolve, 120))
              continue
            }
            break
          }
        }
      }
      providerErrors[provider] = attemptErrors.join(' || ')
    }

    const detail = ['webnn', 'webgpu', 'wasm']
      .filter(p => providerErrors[p])
      .map(p => `${p}: ${providerErrors[p]}`)
      .join(' | ')

    throw new Error(`ONNX Session 创建失败: ${detail || '未知错误'}`)
  })
}

// ---------------------------------------------------------------------------
// Inference
// ---------------------------------------------------------------------------

/**
 * @param {ortAll.Tensor} tensor
 * @returns {Promise<import('../runtime/onnxWorkerTypes.js').TensorTransport>}
 */
async function tensorToTransport(tensor) {
  // Handle GPU-buffer-located tensors (preferredOutputLocation: "gpu-buffer")
  if (tensor.location === 'gpu-buffer') {
    const data = await tensor.getData()
    return { data, dims: [...tensor.dims], type: tensor.type }
  }
  if (tensor.data instanceof Float32Array) {
    return { data: tensor.data, dims: [...tensor.dims], type: 'float32' }
  }
  if (tensor.data instanceof BigInt64Array) {
    return { data: tensor.data, dims: [...tensor.dims], type: 'int64' }
  }
  if (tensor.data instanceof Uint8Array) {
    return { data: tensor.data, dims: [...tensor.dims], type: 'bool' }
  }
  // Fallback for other typed arrays
  if (tensor.type === 'float32' && tensor.data instanceof Float32Array) {
    return { data: tensor.data, dims: [...tensor.dims], type: 'float32' }
  }
  throw new Error(`不支持的 tensor 类型: ${tensor.type}`)
}

/**
 * @param {import('../runtime/onnxWorkerTypes.js').TensorTransport} transport
 * @returns {ortAll.Tensor}
 */
function transportToTensor(transport) {
  if (transport.type === 'float32') {
    return new ortAll.Tensor('float32', transport.data, transport.dims)
  }
  if (transport.type === 'int64') {
    return new ortAll.Tensor('int64', transport.data, transport.dims)
  }
  if (transport.type === 'bool') {
    return new ortAll.Tensor('bool', transport.data, transport.dims)
  }
  throw new Error(`不支持的 transport 类型: ${transport.type}`)
}

/**
 * @param {string} sessionId
 * @param {Object.<string, import('../runtime/onnxWorkerTypes.js').TensorTransport>} feeds
 * @returns {Promise<import('../runtime/onnxWorkerTypes.js').InferenceResult>}
 */
async function runInference(sessionId, feeds) {
  return inferenceQueue.enqueue(async () => {
    const entry = sessions.get(sessionId)
    if (!entry) {
      throw new Error(`Session 不存在: ${sessionId}`)
    }

    /** @type {Object.<string, ortAll.Tensor>} */
    const ortFeeds = {}
    for (const [name, transport] of Object.entries(feeds)) {
      ortFeeds[name] = transportToTensor(transport)
    }

    /** @type {Object.<string, ortAll.Tensor> | undefined} */
    let outputs
    try {
      try {
        outputs = await entry.session.run(ortFeeds)
      } catch (inferenceError) {
        return {
          outputs: {},
          error: toErrorMessage(inferenceError),
        }
      }

      const result = { outputs: {} }
      const outTransferables = []
      for (const [name, tensor] of Object.entries(outputs)) {
        const transport = await tensorToTransport(tensor)
        result.outputs[name] = transport
        if (transport.data instanceof Float32Array) {
          outTransferables.push(transport.data.buffer)
        } else if (transport.data instanceof BigInt64Array) {
          outTransferables.push(transport.data.buffer)
        }
      }

      return Comlink.transfer(result, outTransferables)
    } finally {
      for (const tensor of Object.values(outputs ?? {})) {
        tensor.dispose()
      }
      for (const tensor of Object.values(ortFeeds)) {
        tensor.dispose()
      }
    }
  })
}

// ---------------------------------------------------------------------------
// Runtime self-check (adapted for Worker context)
// ---------------------------------------------------------------------------

/**
 * @typedef {'pass' | 'warn' | 'fail' | 'running' | 'skip'} CheckStatus
 */

/**
 * @typedef {Object} RuntimeCheckItem
 * @property {string} id
 * @property {string} title
 * @property {CheckStatus} status
 * @property {string} [code]
 * @property {string} message
 * @property {string} [detail]
 */

/**
 * @param {string} modelUrl
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
async function verifyWasmSession(modelUrl) {
  ensureOrtEnv()
  try {
    /** @type {ReturnType<typeof setTimeout> | null} */
    let timer = null
    const session = await Promise.race([
      (async () => {
        const buffer = await loadModelBuffer(modelUrl)
        return ortAll.InferenceSession.create(buffer, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        })
      })(),
      new Promise((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('Session 创建超时(12000ms)')), 12000)
      }),
    ])
    if (timer !== null) clearTimeout(timer)
    if (typeof session.release === 'function') {
      session.release()
    }
    return { ok: true }
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) }
  }
}

/**
 * @param {string} modelUrl
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
async function verifyWebnnSession(modelUrl) {
  const attempts = [
    { name: 'webnn', deviceType: 'gpu', powerPreference: 'high-performance' },
    { name: 'webnn', deviceType: 'cpu' },
    'webnn',
  ]
  const errors = []

  for (const ep of attempts) {
    try {
      /** @type {ReturnType<typeof setTimeout> | null} */
      let timer = null
      const session = await Promise.race([
        (async () => {
          const buffer = await loadModelBuffer(modelUrl)
          return ortAll.InferenceSession.create(buffer, {
            executionProviders: [ep],
            graphOptimizationLevel: 'all',
          })
        })(),
        new Promise((_resolve, reject) => {
          timer = setTimeout(() => reject(new Error('Session 创建超时(12000ms)')), 12000)
        }),
      ])
      if (timer !== null) clearTimeout(timer)
      if (typeof session.release === 'function') {
        session.release()
      }
      return { ok: true }
    } catch (error) {
      errors.push(toErrorMessage(error))
    }
  }

  return { ok: false, error: errors.join(' || ') }
}

/**
 * @param {string} modelUrl
 * @returns {Promise<import('../runtime/selfCheck.js').RuntimeSelfCheckReport>}
 */
async function probeRuntime(modelUrl) {
  ensureOrtEnv()

  /** @type {RuntimeCheckItem[]} */
  const checks = []
  const nav = typeof navigator === 'undefined' ? null : navigator
  const ua = nav?.userAgent ?? 'unknown'

  const isSecure = typeof globalThis !== 'undefined' && globalThis.isSecureContext === true
  checks.push({
    id: 'env.security',
    title: '安全上下文',
    status: isSecure ? 'pass' : 'fail',
    code: isSecure ? undefined : 'S001_INSECURE_CONTEXT',
    message: isSecure ? 'Worker 为安全上下文' : 'Worker 不是安全上下文，WebNN 可能不可用',
    detail: `isSecureContext=${String(isSecure)}, crossOriginIsolated=${String(globalThis.crossOriginIsolated ?? false)}`,
  })

  const hasMlApi = Boolean(nav?.ml)
  checks.push({
    id: 'webnn.api',
    title: 'WebNN API 可见性',
    status: hasMlApi ? 'pass' : 'fail',
    code: hasMlApi ? undefined : 'B002_NO_WEBNN',
    message: hasMlApi ? 'navigator.ml 可用' : 'navigator.ml 不可用',
    detail: `ua=${ua}`,
  })

  try {
    const response = await fetch(modelUrl, { method: 'GET' })
    checks.push({
      id: 'model.fetch',
      title: '诊断模型下载',
      status: response.ok ? 'pass' : 'fail',
      code: response.ok ? undefined : 'O004_MODEL_FETCH_FAILED',
      message: response.ok ? '诊断模型可访问' : `诊断模型请求失败 (${response.status})`,
      detail: `url=${modelUrl}`,
    })
  } catch (error) {
    checks.push({
      id: 'model.fetch',
      title: '诊断模型下载',
      status: 'fail',
      code: 'O004_MODEL_FETCH_FAILED',
      message: '诊断模型下载异常',
      detail: toErrorMessage(error),
    })
  }

  const webnnSession = hasMlApi ? await verifyWebnnSession(modelUrl) : { ok: false, error: '缺少 navigator.ml' }
  checks.push({
    id: 'ort.webnn.session',
    title: 'ORT WebNN 最小 Session',
    status: webnnSession.ok ? 'pass' : 'fail',
    code: webnnSession.ok ? undefined : 'O002_ORT_WEBNN_BACKEND_UNAVAILABLE',
    message: webnnSession.ok ? 'WebNN Session 创建成功' : 'WebNN Session 创建失败',
    detail: webnnSession.error,
  })

  const wasmSession = await verifyWasmSession(modelUrl)
  checks.push({
    id: 'ort.wasm.session',
    title: 'ORT WASM 对照 Session',
    status: wasmSession.ok ? 'pass' : 'fail',
    code: wasmSession.ok ? undefined : 'O003_ORT_WASM_ASSET_MISSING',
    message: wasmSession.ok ? 'WASM Session 创建成功' : 'WASM Session 创建失败',
    detail: wasmSession.error,
  })

  const effectiveRuntime = webnnSession.ok ? 'webnn' : wasmSession.ok ? 'wasm' : 'none'
  const reason = webnnSession.ok
    ? 'WebNN 可用'
    : wasmSession.ok
      ? 'WebNN 不可用，WASM 可用'
      : 'WebNN/WASM 均不可用'

  return {
    createdAt: new Date().toISOString(),
    env: {
      url: typeof globalThis !== 'undefined' ? String(globalThis.location?.href ?? 'worker') : 'worker',
      secureContext: isSecure,
      crossOriginIsolated: globalThis.crossOriginIsolated ?? false,
      userAgent: ua,
      ortVersion: ortAll.env.versions.web,
    },
    checks,
    summary: {
      ok: webnnSession.ok || wasmSession.ok,
      effectiveRuntime,
      reason,
    },
  }
}

// ---------------------------------------------------------------------------
// GPU-preprocessed detection inference
// ---------------------------------------------------------------------------

/**
 * @param {string} sessionId
 * @param {ImageBitmap} imageSource
 * @returns {Promise<import('../runtime/onnxWorkerTypes.js').GpuDetectResult>}
 */
async function runDetectWithGpuPreprocess(sessionId, imageSource) {
  return inferenceQueue.enqueue(async () => {
    const entry = sessions.get(sessionId)
    if (!entry) {
      throw new Error(`Session 不存在: ${sessionId}`)
    }
    if (entry.provider !== 'webgpu') {
      throw new Error(`GPU 预处理仅支持 WebGPU EP，当前: ${entry.provider}`)
    }

    /** @type {ortAll.Tensor | undefined} */
    let inputTensor
    /** @type {Object.<string, ortAll.Tensor> | undefined} */
    let outputs
    try {
      const inputSize = 1024
      const preprocessed = await preprocessLetterboxGpu(imageSource, inputSize)
      inputTensor = preprocessed.tensor

      const inputName = entry.session.inputNames[0] ?? 'images'
      const feeds = { [inputName]: inputTensor }
      outputs = await entry.session.run(feeds)

      const result = {
        outputs: {},
        ratio: preprocessed.params.ratio,
        unpaddedWidth: preprocessed.params.unpaddedWidth,
        unpaddedHeight: preprocessed.params.unpaddedHeight,
      }
      const outTransferables = []

      for (const [name, outTensor] of Object.entries(outputs)) {
        /** @type {Float32Array | BigInt64Array | Uint8Array} */
        let data
        if (outTensor.location === 'gpu-buffer') {
          data = await outTensor.getData()
        } else {
          data = outTensor.data
        }
        const transport = { data, dims: [...outTensor.dims], type: outTensor.type }
        result.outputs[name] = transport
        if (data instanceof Float32Array) {
          outTransferables.push(data.buffer)
        } else if (data instanceof BigInt64Array) {
          outTransferables.push(data.buffer)
        }
      }

      return Comlink.transfer(result, outTransferables)
    } finally {
      for (const tensor of Object.values(outputs ?? {})) {
        tensor.dispose()
      }
      inputTensor?.dispose()
      imageSource.close()
    }
  })
}

/**
 * @param {import('../runtime/onnxWorkerTypes.js').PaddleGraphCaptureProbeOptions} options
 * @returns {Promise<import('../runtime/onnxWorkerTypes.js').PaddleGraphCaptureProbeResult>}
 */
async function probePaddleGraphCapture(options) {
  ensureOrtEnv()
  const inputWidth = Math.max(1, Math.round(options.inputWidth ?? 320))
  const batchSize = Math.max(1, Math.round(options.batchSize ?? 1))
  const classCount = Math.max(1, Math.round(options.classCount ?? 18710))
  const runs = Math.max(1, Math.round(options.runs ?? 3))
  const inputDims = [batchSize, 3, 48, inputWidth]
  const outputDims = [batchSize, Math.max(1, Math.floor(inputWidth / 8)), classCount]
  const inputBytes = inputDims.reduce((size, dim) => size * dim, 4)
  const outputBytes = outputDims.reduce((size, dim) => size * dim, 4)
  const baseResult = {
    ok: false,
    modelUrl: options.modelUrl,
    inputDims,
    outputDims,
    inputBytes,
    outputBytes,
    runMs: [],
  }

  /** @type {import('onnxruntime-common').InferenceSession | null} */
  let session = null
  /** @type {GPUBuffer | null} */
  let inputBuffer = null
  /** @type {GPUBuffer | null} */
  let outputBuffer = null
  /** @type {ortAll.Tensor | null} */
  let inputTensor = null
  /** @type {ortAll.Tensor | null} */
  let outputTensor = null
  /** @type {number | undefined} */
  let createSessionMs
  try {
    const createT0 = performance.now()
    session = await createSessionWithTimeout(
      options.modelUrl,
      {
        executionProviders: ['webgpu'],
        graphOptimizationLevel: 'all',
        enableGraphCapture: true,
        preferredOutputLocation: 'gpu-buffer',
        freeDimensionOverrides: {
          'DynamicDimension.0': batchSize,
          'DynamicDimension.1': inputWidth,
        },
      },
      SESSION_CREATE_TIMEOUT_MS
    )
    createSessionMs = performance.now() - createT0

    const device = getWebGpuDevice()
    if (!device) {
      throw new Error('ort.env.webgpu.device 不可用')
    }
    const usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
    inputBuffer = device.createBuffer({ size: inputBytes, usage })
    outputBuffer = device.createBuffer({ size: outputBytes, usage })
    const inputName = session.inputNames[0]
    const outputName = session.outputNames[0]
    if (!inputName || !outputName) {
      throw new Error('PaddleOCR 模型缺少输入或输出名称')
    }
    inputTensor = ortAll.Tensor.fromGpuBuffer(inputBuffer, {
      dataType: 'float32',
      dims: inputDims,
    })
    outputTensor = ortAll.Tensor.fromGpuBuffer(outputBuffer, {
      dataType: 'float32',
      dims: outputDims,
    })
    const feeds = { [inputName]: inputTensor }
    const fetches = { [outputName]: outputTensor }
    const activeSession = session
    const runMs = await inferenceQueue.enqueue(async () => {
      /** @type {number[]} */
      const durations = []
      for (let i = 0; i < runs; i += 1) {
        const runT0 = performance.now()
        await activeSession.run(feeds, fetches)
        await device.queue.onSubmittedWorkDone()
        durations.push(performance.now() - runT0)
      }
      return durations
    })
    return {
      ...baseResult,
      ok: true,
      createSessionMs,
      runMs,
    }
  } catch (error) {
    return {
      ...baseResult,
      createSessionMs,
      error: toErrorMessage(error),
    }
  } finally {
    if (session) {
      await session.release()
    }
    inputTensor?.dispose()
    outputTensor?.dispose()
    inputBuffer?.destroy()
    outputBuffer?.destroy()
  }
}

// ---------------------------------------------------------------------------
// Dispose
// ---------------------------------------------------------------------------

/**
 * @param {string} sessionId
 * @returns {Promise<void>}
 */
async function disposeSession(sessionId) {
  await inferenceQueue.enqueue(async () => {
    /**
     * @param {string} key
     * @param {{ session: import('onnxruntime-common').InferenceSession }} entry
     */
    const releaseEntry = async (key, entry) => {
      sessions.delete(key)
      await entry.session.release()
    }

    const exact = sessions.get(sessionId)
    if (exact) {
      await releaseEntry(sessionId, exact)
    }
    const prefix = `${sessionId}:`
    for (const [key, entry] of [...sessions.entries()]) {
      if (key.startsWith(prefix)) {
        await releaseEntry(key, entry)
      }
    }
  })
}

/** @returns {Promise<void>} */
async function disposeAll() {
  await inferenceQueue.enqueue(async () => {
    const entries = [...sessions.values()]
    sessions.clear()
    perModelLocks.clear()
    for (const entry of entries) {
      await entry.session.release()
    }
  })
}

// ---------------------------------------------------------------------------
// Comlink expose
// ---------------------------------------------------------------------------

const api = {
  init,
  createSession,
  runInference,
  probeRuntime,
  probePaddleGraphCapture,
  runDetectWithGpuPreprocess,
  disposeSession,
  disposeAll,
}

Comlink.expose(api)
