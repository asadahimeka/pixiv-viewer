/**
 * Serial queue for ONNX inference calls.
 * ORT's InferenceSession.run() does NOT support concurrent invocations,
 * so all inference must be serialized.
 *
 * Copied from ShinobuTranslator src/workers/inferenceQueue.ts
 */

export class SerialInferenceQueue {
  constructor() {
    this.tail = Promise.resolve()
  }

  /**
   * Enqueue a task to run after all previous tasks complete.
   * @template T
   * @param {() => Promise<T>} task - Async function to execute
   * @returns {Promise<T>}
   */
  enqueue(task) {
    const run = this.tail.then(task)
    this.tail = run.then(() => undefined, () => undefined)
    return run
  }
}
