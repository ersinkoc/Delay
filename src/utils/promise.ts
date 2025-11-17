import { DelayError, DelayErrorCode } from '../types/index.js';
import { createBasicDelay } from '../core/delay.js';

export async function raceWithTimeout<T>(
  promises: Promise<T>[],
  timeoutMs: number,
  timeoutError?: Error
): Promise<T> {
  let timeoutId: NodeJS.Timeout | number | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = timeoutError || new DelayError(
        `Operation timed out after ${timeoutMs}ms`,
        DelayErrorCode.TIMEOUT,
        { timeout: timeoutMs }
      );
      reject(error);
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([...promises, timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export function createTimeoutPromise<T>(
  ms: number,
  error?: Error
): Promise<T> {
  return new Promise<T>((_, reject) => {
    setTimeout(() => {
      const timeoutError = error || new DelayError(
        `Operation timed out after ${ms}ms`,
        DelayErrorCode.TIMEOUT,
        { timeout: ms }
      );
      reject(timeoutError);
    }, ms);
  });
}

export async function minimumDelay<T>(
  promise: Promise<T>,
  minMs: number
): Promise<T> {
  const [result] = await Promise.all([
    promise,
    createBasicDelay(minMs),
  ]);
  return result;
}

export async function raceArray<T>(
  promises: Promise<T>[],
  options: {
    timeout?: number;
    timeoutError?: Error;
    failFast?: boolean;
  } = {}
): Promise<T> {
  const { timeout, timeoutError, failFast = true } = options;

  if (promises.length === 0) {
    throw new DelayError(
      'Cannot race empty array of promises',
      DelayErrorCode.INVALID_OPTIONS,
      { promises: [] }
    );
  }

  const racePromises = [...promises];
  let timeoutId: NodeJS.Timeout | number | undefined;

  if (timeout !== undefined) {
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => {
        const error = timeoutError || new DelayError(
          `Operation timed out after ${timeout}ms`,
          DelayErrorCode.TIMEOUT,
          { timeout }
        );
        reject(error);
      }, timeout);
    });
    racePromises.push(timeoutPromise);
  }

  if (failFast) {
    try {
      const result = await Promise.race(racePromises);
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      return result;
    } catch (error) {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      throw error;
    }
  }

  // If not fail-fast, wait for the first successful result
  return new Promise<T>((resolve, reject) => {
    let rejectionCount = 0;
    const errors: Error[] = new Array(racePromises.length);
    let isSettled = false;

    racePromises.forEach((promise, index) => {
      promise
        .then(result => {
          if (!isSettled) {
            isSettled = true;
            if (timeoutId !== undefined) {
              clearTimeout(timeoutId);
            }
            resolve(result);
          }
        })
        .catch(error => {
          errors[index] = error;
          rejectionCount++;

          if (rejectionCount === racePromises.length) {
            if (timeoutId !== undefined) {
              clearTimeout(timeoutId);
            }
            reject(new DelayError(
              'All promises rejected',
              DelayErrorCode.RETRY_EXHAUSTED,
              { errors }
            ));
          }
        });
    });
  });
}

export function createDelayedPromise<T>(
  factory: () => Promise<T>,
  delayMs: number
): Promise<T> {
  return createBasicDelay(delayMs).then(() => factory());
}

export async function sequential<T>(
  factories: Array<() => Promise<T>>,
  delayBetween = 0
): Promise<T[]> {
  const results: T[] = [];
  
  for (const [i, factory] of factories.entries()) {
    if (i > 0 && delayBetween > 0) {
      await createBasicDelay(delayBetween);
    }

    const result = await factory();
    results.push(result);
  }
  
  return results;
}

export async function parallel<T>(
  factories: Array<() => Promise<T>>,
  concurrency = Infinity
): Promise<T[]> {
  if (concurrency <= 0) {
    throw new DelayError(
      'Concurrency must be positive',
      DelayErrorCode.INVALID_OPTIONS,
      { concurrency }
    );
  }

  if (concurrency >= factories.length) {
    return Promise.all(factories.map(factory => factory()));
  }

  const results: T[] = new Array(factories.length);
  let index = 0;

  const worker = async (): Promise<void> => {
    while (index < factories.length) {
      const currentIndex = index++;
      const factory = factories[currentIndex];
      if (factory) {
        results[currentIndex] = await factory();
      }
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, factories.length) }, worker);
  await Promise.all(workers);
  
  return results;
}