/**
 * @file ONNX runtime provider/device types and error helpers.
 *
 * Mechanically converted from ShinobuTranslator `src/runtime/onnxTypes.ts`
 * (TS → JS). Types → JSDoc @typedef + placeholder exports; functions are
 * preserved as-is. `toErrorMessage` was inlined from `src/shared/utils.ts`
 * (4-line helper, no other dependency).
 */

/** @typedef {'webnn'|'webgpu'|'wasm'|'cuda'|'cpu'} RuntimeProvider */
export const RuntimeProvider = {}

/** @typedef {'gpu'|'cpu'|'default'} WebNnDeviceType */
export const WebNnDeviceType = {}

function toErrorMessage(error) {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

export function isContextLostError(message) {
  const lower = message.toLowerCase()
  return (
    lower.includes('context is lost') ||
    (lower.includes('mlgraphbuilder') && lower.includes('invalidstateerror'))
  )
}

export function isContextLostRuntimeError(error) {
  return isContextLostError(toErrorMessage(error))
}

export function isCreateTimeoutError(message) {
  return message.includes('Session 创建超时')
}
