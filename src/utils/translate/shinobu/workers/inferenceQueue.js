/**
 * @file Serialized inference queue for the ONNX worker.
 *
 * Mechanically converted from ShinobuTranslator `src/workers/inferenceQueue.ts`
 * (TS → JS).
 */

export class SerialInferenceQueue {
  /** @type {Promise<void>} */
  _tail = Promise.resolve()

  /**
   * @template T
   * @param {() => Promise<T>} task
   * @returns {Promise<T>}
   */
  enqueue(task) {
    const run = this._tail.then(task)
    this._tail = run.then(
      () => undefined,
      () => undefined
    )
    return run
  }

  /** @returns {Promise<void>} */
  async onIdle() {
    await this._tail
  }
}
