/**
 * @file GPU-accelerated preprocessing for ONNX inference in the Web Worker.
 *
 * Mechanically converted from ShinobuTranslator `src/workers/gpuPreprocess.ts`
 * (TS → JS). Uses WebGPU compute shaders for letterbox preprocessing.
 *
 * Data flow:
 *   ImageBitmap/OffscreenCanvas
 *     → copyExternalImageToTexture → GPUTexture (rgba8unorm)
 *     → compute shader (resize via texture sampling + pad + normalize + HWC→NCHW)
 *       → 3x GPUBuffer (per-channel float32)
 *     → copyBufferToBuffer → single NCHW GPUBuffer
 *     → ort.Tensor.fromGpuBuffer() → session.run feeds
 */

/* globals GPUShaderStage, GPUTextureUsage, GPUBufferUsage, GPUMapMode */

import * as ortAll from 'onnxruntime-web/all'

// ---------------------------------------------------------------------------
// JSDoc type definitions (replacing TS type aliases)
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} LetterboxParams
 * @property {number} ratio
 * @property {number} unpaddedWidth
 * @property {number} unpaddedHeight
 * @property {number} padX
 * @property {number} padY
 */

/**
 * @typedef {Object} LetterboxGpuResult
 * @property {ortAll.Tensor} tensor
 * @property {LetterboxParams} params
 */

// ---------------------------------------------------------------------------
// WGSL shader: letterbox preprocessing
//
// Input:  texture_2d<f32> (source image, rgba8unorm copied via copyExternalImageToTexture)
// Output: 3x storage<read_write> arrays (NCHW channel planes, float32, normalized to [0,1])
//
// The shader maps each output pixel (dst_x, dst_y) back to source coordinates
// using the letterbox ratio. GPU texture sampling provides bilinear filtering
// for the resize step. Padding areas are filled with 0.0 (black).
// ---------------------------------------------------------------------------

const LETTERBOX_SHADER = /* wgsl */ `
@group(0) @binding(0) var src: texture_2d<f32>;

@group(0) @binding(1) var<storage, read_write> dst_ch0: array<f32>;
@group(0) @binding(2) var<storage, read_write> dst_ch1: array<f32>;
@group(0) @binding(3) var<storage, read_write> dst_ch2: array<f32>;

struct Params {
  dst_size: u32,
  unpadded_width: u32,
  unpadded_height: u32,
  src_width: u32,
  src_height: u32,
  ratio: f32,
};

@group(0) @binding(4) var<uniform> params: Params;

// Bilinear sampling — matches canvas.drawImage with imageSmoothingEnabled=true
fn bilinearSample(u: f32, v: f32) -> vec4<f32> {
  let w = f32(params.src_width);
  let h = f32(params.src_height);
  let x = u * w - 0.5;
  let y = v * h - 0.5;
  let x0 = i32(floor(x));
  let y0 = i32(floor(y));
  let x1 = x0 + 1;
  let y1 = y0 + 1;
  let fx = x - f32(x0);
  let fy = y - f32(y0);

  let c00 = textureLoad(src, vec2<i32>(clamp(x0, 0, i32(params.src_width) - 1), clamp(y0, 0, i32(params.src_height) - 1)), 0);
  let c10 = textureLoad(src, vec2<i32>(clamp(x1, 0, i32(params.src_width) - 1), clamp(y0, 0, i32(params.src_height) - 1)), 0);
  let c01 = textureLoad(src, vec2<i32>(clamp(x0, 0, i32(params.src_width) - 1), clamp(y1, 0, i32(params.src_height) - 1)), 0);
  let c11 = textureLoad(src, vec2<i32>(clamp(x1, 0, i32(params.src_width) - 1), clamp(y1, 0, i32(params.src_height) - 1)), 0);

  let top = mix(c00, c10, fx);
  let bot = mix(c01, c11, fx);
  return mix(top, bot, fy);
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dst_idx = gid.x;
  let total = params.dst_size * params.dst_size;
  if (dst_idx >= total) { return; }

  let dst_x = dst_idx % params.dst_size;
  let dst_y = dst_idx / params.dst_size;

  // CPU letterbox: image drawn at (0,0), top-left aligned, bilinear interpolation
  if (dst_x < params.unpadded_width && dst_y < params.unpadded_height) {
    let u = (f32(dst_x) + 0.5) / f32(params.unpadded_width);
    let v = (f32(dst_y) + 0.5) / f32(params.unpadded_height);
    let color = bilinearSample(u, v);
    dst_ch0[dst_idx] = color.r;
    dst_ch1[dst_idx] = color.g;
    dst_ch2[dst_idx] = color.b;
  } else {
    dst_ch0[dst_idx] = 0.0;
    dst_ch1[dst_idx] = 0.0;
    dst_ch2[dst_idx] = 0.0;
  }
}
`

// ---------------------------------------------------------------------------
// Letterbox parameters (shared with CPU implementation)
// ---------------------------------------------------------------------------

/**
 * @param {number} srcWidth
 * @param {number} srcHeight
 * @param {number} dstSize
 * @returns {LetterboxParams}
 */
export function computeLetterboxParams(srcWidth, srcHeight, dstSize) {
  const ratio = Math.min(dstSize / srcHeight, dstSize / srcWidth)
  const unpaddedWidth = Math.max(1, Math.round(srcWidth * ratio))
  const unpaddedHeight = Math.max(1, Math.round(srcHeight * ratio))
  // CPU letterbox draws at (0,0) — top-left aligned, no centering
  return { ratio, unpaddedWidth, unpaddedHeight, padX: 0, padY: 0 }
}

// ---------------------------------------------------------------------------
// Pipeline cache (one per GPUDevice)
// ---------------------------------------------------------------------------

/** @type {GPUDevice | null} */
let cachedDevice = null
/** @type {GPUComputePipeline | null} */
let cachedPipeline = null
/** @type {GPUBindGroupLayout | null} */
let cachedBindGroupLayout = null

/** @returns {GPUDevice} */
function getOrtDevice() {
  const device = ortAll.env.webgpu.device
  if (!device) {
    throw new Error('[gpuPreprocess] ort.env.webgpu.device 不可用。请确保 WebGPU session 已创建。')
  }
  return device
}

/**
 * @param {GPUDevice} device
 * @returns {{ pipeline: GPUComputePipeline, bindGroupLayout: GPUBindGroupLayout }}
 */
function ensurePipeline(device) {
  if (cachedDevice === device && cachedPipeline && cachedBindGroupLayout) {
    return { pipeline: cachedPipeline, bindGroupLayout: cachedBindGroupLayout }
  }

  const shaderModule = device.createShaderModule({ code: LETTERBOX_SHADER })

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: 'float' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
    ],
  })

  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout],
  })

  const pipeline = device.createComputePipeline({
    layout: pipelineLayout,
    compute: { module: shaderModule, entryPoint: 'main' },
  })

  cachedDevice = device
  cachedPipeline = pipeline
  cachedBindGroupLayout = bindGroupLayout
  return { pipeline, bindGroupLayout }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Perform letterbox preprocessing on the GPU.
 *
 * Steps:
 * 1. copyExternalImageToTexture → GPUTexture (rgba8unorm)
 * 2. compute shader (resize via texture sampling + pad + normalize + HWC→NCHW)
 *    → 3x GPUBuffer (per-channel float32)
 * 3. copyBufferToBuffer → single NCHW GPUBuffer [1, 3, dstSize, dstSize]
 * 4. Wrap as ort.Tensor via fromGpuBuffer
 *
 * @param {ImageBitmap | OffscreenCanvas} imageSource
 * @param {number} dstSize
 * @returns {Promise<LetterboxGpuResult>}
 */
export async function preprocessLetterboxGpu(imageSource, dstSize) {
  const device = getOrtDevice()

  const srcWidth = imageSource.width
  const srcHeight = imageSource.height
  const lbParams = computeLetterboxParams(srcWidth, srcHeight, dstSize)

  // Step 1: Copy image to GPUTexture via copyExternalImageToTexture
  const srcTexture = device.createTexture({
    size: [srcWidth, srcHeight],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
  })

  device.queue.copyExternalImageToTexture(
    { source: imageSource },
    { texture: srcTexture },
    [srcWidth, srcHeight]
  )

  // Step 2: Create output buffers for 3 channels
  const pixelCount = dstSize * dstSize
  const bufferSize = pixelCount * 4 // float32 per pixel per channel

  const ch0Buffer = device.createBuffer({
    size: bufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  })
  const ch1Buffer = device.createBuffer({
    size: bufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  })
  const ch2Buffer = device.createBuffer({
    size: bufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  })

  // Step 3: Create uniform buffer for shader params
  // Params struct: dst_size(u32), unpadded_width(u32), unpadded_height(u32),
  //               src_width(u32), src_height(u32), ratio(f32) = 24 bytes
  // Padded to 32 for WGSL uniform struct alignment (must be 16-byte aligned)
  const uniformData = new ArrayBuffer(32)
  const uniformView = new DataView(uniformData)
  uniformView.setUint32(0, dstSize, true)
  uniformView.setUint32(4, lbParams.unpaddedWidth, true)
  uniformView.setUint32(8, lbParams.unpaddedHeight, true)
  uniformView.setUint32(12, srcWidth, true)
  uniformView.setUint32(16, srcHeight, true)
  uniformView.setFloat32(20, lbParams.ratio, true)

  const uniformBuffer = device.createBuffer({
    size: uniformData.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  })
  device.queue.writeBuffer(uniformBuffer, 0, uniformData)

  // Step 4: Create bind group and dispatch compute
  const { pipeline, bindGroupLayout } = ensurePipeline(device)

  const textureView = srcTexture.createView()

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      { binding: 0, resource: textureView },
      { binding: 1, resource: { buffer: ch0Buffer } },
      { binding: 2, resource: { buffer: ch1Buffer } },
      { binding: 3, resource: { buffer: ch2Buffer } },
      { binding: 4, resource: { buffer: uniformBuffer } },
    ],
  })

  const workgroupCount = Math.ceil(pixelCount / 256)

  const commandEncoder = device.createCommandEncoder()
  const passEncoder = commandEncoder.beginComputePass()
  passEncoder.setPipeline(pipeline)
  passEncoder.setBindGroup(0, bindGroup)
  passEncoder.dispatchWorkgroups(workgroupCount)
  passEncoder.end()

  // Step 5: Copy 3 channel buffers into a single NCHW buffer
  const totalFloats = 3 * pixelCount
  const nchwBufferSize = totalFloats * 4
  const nchwBuffer = device.createBuffer({
    size: nchwBufferSize,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE,
  })

  commandEncoder.copyBufferToBuffer(ch0Buffer, 0, nchwBuffer, 0, bufferSize)
  commandEncoder.copyBufferToBuffer(ch1Buffer, 0, nchwBuffer, bufferSize, bufferSize)
  commandEncoder.copyBufferToBuffer(ch2Buffer, 0, nchwBuffer, bufferSize * 2, bufferSize)

  device.queue.submit([commandEncoder.finish()])

  // Wait for GPU work to complete
  await device.queue.onSubmittedWorkDone()

  // Clean up intermediate resources
  srcTexture.destroy()
  ch0Buffer.destroy()
  ch1Buffer.destroy()
  ch2Buffer.destroy()
  uniformBuffer.destroy()

  // Step 6: Create ort.Tensor from the NCHW GPUBuffer
  const tensor = ortAll.Tensor.fromGpuBuffer(nchwBuffer, {
    dims: [1, 3, dstSize, dstSize],
    dataType: 'float32',
    download: async () => {
      const stagingBuffer = device.createBuffer({
        size: nchwBufferSize,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      })
      const encoder = device.createCommandEncoder()
      encoder.copyBufferToBuffer(nchwBuffer, 0, stagingBuffer, 0, nchwBufferSize)
      device.queue.submit([encoder.finish()])
      await device.queue.onSubmittedWorkDone()
      await stagingBuffer.mapAsync(GPUMapMode.READ)
      const data = new Float32Array(stagingBuffer.getMappedRange().slice(0))
      stagingBuffer.unmap()
      stagingBuffer.destroy()
      return data
    },
    dispose: () => {
      nchwBuffer.destroy()
    },
  })

  return { tensor, params: lbParams }
}
