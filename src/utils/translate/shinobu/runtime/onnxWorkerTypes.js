/**
 * @file ONNX worker transfer types (comlink boundary).
 *
 * Mechanically converted from ShinobuTranslator `src/runtime/onnxWorkerTypes.ts`
 * (TS → JS). Plain-data representations crossing the comlink worker boundary.
 * Float32Array / BigInt64Array / Uint8Array are Transferable via ArrayBuffer
 * transfer.
 *
 * Imported types are doc-only JSDoc references; their definitions are converted
 * in later runtime tasks (`onnxTypes.js`, `onnxSessionOptions.js`,
 * `selfCheck.js`).
 */

/** @typedef {import('./onnxTypes.js').RuntimeProvider} RuntimeProvider */
/** @typedef {import('./onnxTypes.js').WebNnDeviceType} WebNnDeviceType */
/** @typedef {import('./onnxSessionOptions.js').OnnxSessionOptions} OnnxSessionOptions */
/** @typedef {import('./selfCheck.js').RuntimeSelfCheckReport} RuntimeSelfCheckReport */

/**
 * @typedef {Object} TensorTransport - Plain-data representation of ort.Tensor for comlink boundary
 * @property {Float32Array|BigInt64Array|Uint8Array} data - Tensor data buffer (transferable)
 * @property {Array<number>} dims - Tensor dimensions
 * @property {'float32'|'int64'|'bool'} type - Tensor element type
 */
export const TensorTransport = {}

/**
 * @typedef {Object} WorkerSessionHandle - Metadata returned by Worker after session creation.
 * The actual ort.InferenceSession lives inside the Worker.
 * @property {string} sessionId - Session identifier
 * @property {RuntimeProvider} provider - Execution provider
 * @property {WebNnDeviceType} [webnnDeviceType] - WebNN device type
 * @property {Array<string>} inputNames - Session input names
 * @property {Array<string>} outputNames - Session output names
 */
export const WorkerSessionHandle = {}

/**
 * @typedef {Object} InferenceResult - Output tensors from a single session.run() call
 * @property {Object.<string, TensorTransport>} outputs - Output tensors keyed by name
 * @property {string} [error] - Error message, if any
 */
export const InferenceResult = {}

/**
 * @typedef {Object} GpuDetectResult - Result from GPU-preprocessed detection inference
 * @property {Object.<string, TensorTransport>} outputs - Output tensors keyed by name
 * @property {number} ratio - Letterbox scale ratio
 * @property {number} unpaddedWidth - Original width before padding
 * @property {number} unpaddedHeight - Original height before padding
 */
export const GpuDetectResult = {}

/**
 * @typedef {Object} PaddleGraphCaptureProbeOptions
 * @property {string} modelUrl - Model URL to probe
 * @property {number} [inputWidth] - Input width
 * @property {number} [batchSize] - Batch size
 * @property {number} [classCount] - Number of classes
 * @property {number} [runs] - Number of probe runs
 */
export const PaddleGraphCaptureProbeOptions = {}

/**
 * @typedef {Object} PaddleGraphCaptureProbeResult
 * @property {boolean} ok - Whether the probe succeeded
 * @property {string} modelUrl - Probed model URL
 * @property {Array<number>} inputDims - Input tensor dimensions
 * @property {Array<number>} outputDims - Output tensor dimensions
 * @property {number} inputBytes - Input tensor byte size
 * @property {number} outputBytes - Output tensor byte size
 * @property {number} [createSessionMs] - Session creation duration in milliseconds
 * @property {Array<number>} runMs - Per-run durations in milliseconds
 * @property {string} [error] - Error message, if any
 */
export const PaddleGraphCaptureProbeResult = {}

/**
 * @typedef {Object} OnnxWorkerApi - The comlink-exposed worker interface
 * @property {function(string): Promise<void>} init - Initialize ONNX runtime from the given ort path
 * @property {function(string, string, Array<RuntimeProvider>, OnnxSessionOptions): Promise<WorkerSessionHandle>} createSession - Create an inference session
 * @property {function(string, Object.<string, TensorTransport>): Promise<InferenceResult>} runInference - Run inference on a session
 * @property {function(string): Promise<RuntimeSelfCheckReport>} probeRuntime - Probe runtime capabilities
 * @property {function(PaddleGraphCaptureProbeOptions): Promise<PaddleGraphCaptureProbeResult>} probePaddleGraphCapture - Probe Paddle graph capture
 * @property {function(string, ImageBitmap): Promise<GpuDetectResult>} runDetectWithGpuPreprocess - Run detection with GPU preprocessing
 * @property {function(string): Promise<void>} disposeSession - Dispose a session
 * @property {function(): Promise<void>} disposeAll - Dispose all sessions
 */
export const OnnxWorkerApi = {}
