// src/utils/translate/__tests__/llmClient.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseSseLines,
  classifyFetchFailure,
  helperRequest,
  chatCompletionStream,
  LlmApiError,
} from '../llmClient.js'

test('parseSseLines 解析标准 SSE 数据行', () => {
  const raw = 'data: {"choices":[{"delta":{"content":"你好"}}]}\ndata: [DONE]\n'
  const arr = parseSseLines(raw)
  assert.equal(arr.length, 1)
  assert.equal(arr[0].choices[0].delta.content, '你好')
})

test('parseSseLines 跳过空行与坏 JSON', () => {
  const raw = '\n\ndata: not-json\ndata: {"ok":1}\n'
  const arr = parseSseLines(raw)
  assert.deepEqual(arr, [{ ok: 1 }])
})

test('parseSseLines 容忍无 data: 前缀的 JSON 行', () => {
  const arr = parseSseLines('{"choices":[]}')
  assert.equal(arr.length, 1)
})

test('classifyFetchFailure: TypeError 归为 network', () => {
  assert.equal(classifyFetchFailure(new TypeError('Failed to fetch')), 'network')
})

test('classifyFetchFailure: 普通 Error 归为 api', () => {
  assert.equal(classifyFetchFailure(new Error('HTTP 401')), 'api')
})

// 以下三个测试共享 globalThis 上的 window/fetch 桩，作为顺序子测试执行以避免并发污染
test('兜底与流式降级（C-1/I-1/I-2）', async (t) => {
  await t.test('C-1 helperRequest 归一化 header 键为 Content-Type/Authorization', async () => {
    const captured = {}
    globalThis.window = {
      __httpRequest__: async (url, configStr) => {
        captured.config = JSON.parse(configStr)
        return { data: {} }
      },
    }
    try {
      await helperRequest('http://x', {
        method: 'POST',
        headers: { 'authorization': 'Bearer k', 'content-type': 'application/json' },
        data: { a: 1 },
      })
      assert.equal(captured.config.headers['Content-Type'], 'application/json')
      assert.equal(captured.config.headers['Authorization'], 'Bearer k')
    } finally {
      delete globalThis.window
    }
  })

  await t.test('I-1 chatCompletionStream 跨 chunk 断行不丢字', async () => {
    const full = 'data: {"choices":[{"delta":{"content":"你好"}}]}\ndata: {"choices":[{"delta":{"content":"世界"}}]}\ndata: [DONE]\n'
    const mid = full.indexOf('世界')
    const c1 = full.slice(0, mid) // 在事件中间切断
    const c2 = full.slice(mid)
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(c1))
        controller.enqueue(new TextEncoder().encode(c2))
        controller.close()
      },
    })
    globalThis.fetch = async () => ({ ok: true, body: stream })
    try {
      const received = []
      await chatCompletionStream({
        baseUrl: 'http://x',
        apiKey: 'k',
        body: {},
        onRead: ({ content, done }) => { if (!done) received.push(content) },
      })
      assert.equal(received.join(''), '你好世界')
    } finally {
      delete globalThis.fetch
    }
  })

  await t.test('I-2 兜底错误包装为 LlmApiError 且 kind 映射 auth', async () => {
    globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
    globalThis.window = {
      __httpRequest__: async () => { throw new Error('HTTP 401 Unauthorized') },
    }
    let thrown
    try {
      await chatCompletionStream({
        baseUrl: 'http://x',
        apiKey: 'k',
        body: {},
        onRead: () => {},
      })
    } catch (e) {
      thrown = e
    } finally {
      delete globalThis.fetch
      delete globalThis.window
    }
    assert.ok(thrown instanceof LlmApiError)
    assert.equal(thrown.kind, 'auth')
  })
})
