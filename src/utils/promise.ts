import { DelayError, DelayErrorCode } from '../types/index.js';
import { createBasicDelay } from '../core/delay.js';

export async function raceWithTimeout<T>(
  promises: Promise<T>[],
  timeoutMs: number,
  timeoutError?: Error
): Promise<T> {
  const timeoutPromise = createTimeoutPromise<T>(timeoutMs, timeoutError);
  
  try {
    const result = await Promise.race([...promises, timeoutPromise]);
    return result;
  } catch (error) {
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
  
  if (timeout !== undefined) {
    racePromises.push(createTimeoutPromise(timeout, timeoutError));
  }

  if (failFast) {
    return Promise.race(racePromises);
  }

  // If not fail-fast, wait for the first successful result
  return new Promise<T>((resolve, reject) => {
    let rejectionCount = 0;
    const errors: Error[] = [];

    racePromises.forEach((promise, index) => {
      promise
        .then(result => resolve(result))
        .catch(error => {
          errors[index] = error;
          rejectionCount++;
          
          if (rejectionCount === racePromises.length) {
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
  
  for (let i = 0; i < factories.length; i++) {
    if (i > 0 && delayBetween > 0) {
      await createBasicDelay(delayBetween);
    }
    
    const result = await factories[i]!();
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
      results[currentIndex] = await factories[currentIndex]!();
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, factories.length) }, worker);
  await Promise.all(workers);
  
  return results;
}