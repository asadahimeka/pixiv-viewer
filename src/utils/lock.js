// ref: https://github.com/expo/await-lock/blob/main/src/AwaitLock.ts

/**
 * A mutex lock for coordination across async functions
 */
export class AwaitLock {
  _acquired = false
  _waitingResolvers = new Set()

  /**
   * Whether the lock is currently acquired or not. Accessing this property does not affect the
   * status of the lock.
   */
  get acquired() {
    return this._acquired
  }

  /**
   * Acquires the lock, waiting if necessary for it to become free if it is already locked. The
   * returned promise is fulfilled once the lock is acquired.
   *
   * A timeout (in milliseconds) may be optionally provided. If the lock cannot be acquired before
   * the timeout elapses, the returned promise is rejected with an error. The behavior of invalid
   * timeout values depends on how `setTimeout` handles those values.
   *
   * After acquiring the lock, you **must** call `release` when you are done with it.
   */
  acquireAsync({ timeout } = {}) {
    if (!this._acquired) {
      this._acquired = true
      return Promise.resolve()
    }

    if (timeout == null) {
      return new Promise(resolve => {
        this._waitingResolvers.add(resolve)
      })
    }

    let resolver
    let timer

    return Promise.race([
      new Promise(resolve => {
        resolver = () => {
          clearTimeout(timer)
          resolve()
        }
        this._waitingResolvers.add(resolver)
      }),
      new Promise((_resolve, reject) => {
        timer = setTimeout(() => {
          this._waitingResolvers.delete(resolver)
          reject(new Error('Timed out waiting for lock'))
        }, timeout)
      }),
    ])
  }

  /**
   * Acquires the lock if it is free and otherwise returns immediately without waiting. Returns
   * `true` if the lock was free and is now acquired, and `false` otherwise.
   *
   * This method differs from calling `acquireAsync` with a zero-millisecond timeout in that it runs
   * synchronously without waiting for the JavaScript task queue.
   */
  tryAcquire() {
    if (!this._acquired) {
      this._acquired = true
      return true
    }

    return false
  }

  /**
   * Releases the lock and gives it to the next waiting acquirer, if there is one. Each acquirer
   * must release the lock exactly once.
   */
  release() {
    if (!this._acquired) {
      throw new Error('Cannot release an unacquired lock')
    }

    if (this._waitingResolvers.size > 0) {
      // Sets preserve insertion order like a queue
      const [resolve] = this._waitingResolvers
      this._waitingResolvers.delete(resolve)
      resolve()
    } else {
      this._acquired = false
    }
  }
}
