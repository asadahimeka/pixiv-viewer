/**
 * @file ONNX session options types and serializer.
 *
 * Mechanically converted from ShinobuTranslator `src/runtime/onnxSessionOptions.ts`
 * (TS → JS). Types → JSDoc @typedef + placeholder exports; functions preserved
 * as-is.
 */

/** @typedef {'cpu'|'cpu-pinned'|'gpu-buffer'|'ml-tensor'} OnnxValueDataLocation */
export const OnnxValueDataLocation = {}

/**
 * @typedef {Object} OnnxSessionOptions
 * @property {boolean} [enableGraphCapture]
 * @property {OnnxValueDataLocation|Object.<string, OnnxValueDataLocation>} [preferredOutputLocation]
 * @property {Object.<string, number>} [freeDimensionOverrides]
 */
export const OnnxSessionOptions = {}

function stableRecord(record) {
  if (!record) return undefined
  return Object.fromEntries(
    Object.entries(record).sort(([a], [b]) => a.localeCompare(b))
  )
}

export function serializeOnnxSessionOptions(options) {
  if (!options) return 'default'
  const normalized = {}
  if (typeof options.enableGraphCapture === 'boolean') {
    normalized.enableGraphCapture = options.enableGraphCapture
  }
  if (typeof options.preferredOutputLocation === 'string') {
    normalized.preferredOutputLocation = options.preferredOutputLocation
  } else if (options.preferredOutputLocation) {
    normalized.preferredOutputLocation = stableRecord(options.preferredOutputLocation)
  }
  const freeDimensionOverrides = stableRecord(options.freeDimensionOverrides)
  if (freeDimensionOverrides) {
    normalized.freeDimensionOverrides = freeDimensionOverrides
  }
  return JSON.stringify(normalized)
}
