import { CancellableDelay, DelayOptions, DelayError, DelayErrorCode } from '../types/index.js';
import { createBasicDelay } from './delay.js';

export function createCancellableDelay<T = void>(
  ms: number,
  options: DelayOptions = {}
): CancellableDelay<T> {
  const controller = new AbortController();
  let isCancelled = false;

  const delayPromise = createBasicDelay(ms, {
    ...options,
    signal: controller.signal,
  }) as Promise<T>;

  const cancellablePromise = Object.assign(delayPromise, {
    cancel(): void {
      if (!isCancelled) {
        isCancelled = true;
        controller.abort();
      }
    },

    isCancelled(): boolean {
      return isCancelled;
    },
  });

  // Handle the case where the original signal is already aborted
  if (options.signal?.aborted) {
    isCancelled = true;
    controller.abort();
  }

  // Listen for abort on the original signal
  const abortHandler = (): void => {
    isCancelled = true;
    controller.abort();
  };

  if (options.signal) {
    options.signal.addEventListener('abort', abortHandler);

    // Clean up event listener when promise settles
    delayPromise.finally(() => {
      options.signal?.removeEventListener('abort', abortHandler);
    }).catch(() => {
      // Ignore errors in finally cleanup
    });
  }

  return cancellablePromise;
}

export class CancellationToken {
  private _isCancelled = false;
  private _callbacks: (() => void)[] = [];

  get isCancelled(): boolean {
    return this._isCancelled;
  }

  cancel(): void {
    if (!this._isCancelled) {
      this._isCancelled = true;
      this._callbacks.forEach(callback => {
        try {
          callback();
        } catch (error) {
          // Ignore callback errors to prevent one bad callback from affecting others
          console.error('Error in cancellation callback:', error);
        }
      });
      this._callbacks.length = 0;
    }
  }

  onCancel(callback: () => void): void {
    if (this._isCancelled) {
      callback();
    } else {
      this._callbacks.push(callback);
    }
  }

  throwIfCancelled(): void {
    if (this._isCancelled) {
      throw new DelayError('Operation was cancelled', DelayErrorCode.CANCELLED);
    }
  }
}