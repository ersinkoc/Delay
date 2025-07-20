import { RetryOptions, DelayError, DelayErrorCode } from '../types/index.js';
import { validateRetryOptions, validateFunction } from '../utils/validation.js';
import { calculateBackoffDelay } from '../utils/random.js';
import { createBasicDelay } from './delay.js';

export async function retryDelay<T>(
  fn: () => T | Promise<T>,
  options: RetryOptions
): Promise<T> {
  validateFunction(fn, 'retry function');
  validateRetryOptions(options);

  const {
    attempts,
    delay,
    backoff = 'linear',
    backoffFactor = 2,
    maxDelay = Infinity,
    onRetry,
    retryIf,
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry this error
      if (retryIf && !retryIf(lastError)) {
        throw lastError;
      }

      // If this was the last attempt, throw the error
      if (attempt === attempts) {
        throw new DelayError(
          `Retry exhausted after ${attempts} attempts: ${lastError.message}`,
          DelayErrorCode.RETRY_EXHAUSTED,
          { 
            attempts,
            lastError: lastError.message,
            originalError: lastError,
          }
        );
      }

      // Call the retry callback if provided
      if (onRetry) {
        try {
          onRetry(lastError, attempt);
        } catch (callbackError) {
          // Don't let callback errors break the retry logic
          console.error('Error in retry callback:', callbackError);
        }
      }

      // Calculate delay for next attempt
      let delayMs: number;
      if (typeof delay === 'function') {
        delayMs = delay(attempt);
      } else {
        delayMs = calculateBackoffDelay(
          delay,
          attempt,
          backoff,
          backoffFactor,
          maxDelay
        );
      }

      // Wait before next attempt
      if (delayMs > 0) {
        await createBasicDelay(delayMs);
      }
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError!;
}

export function createRetryWithDefaults(defaultOptions: Partial<RetryOptions>) {
  return function<T>(
    fn: () => T | Promise<T>,
    options?: Partial<RetryOptions>
  ): Promise<T> {
    const mergedOptions = { ...defaultOptions, ...options } as RetryOptions;
    return retryDelay(fn, mergedOptions);
  };
}

export function retryWithExponentialBackoff<T>(
  fn: () => T | Promise<T>,
  attempts = 3,
  baseDelay = 1000,
  maxDelay = 30000
): Promise<T> {
  return retryDelay(fn, {
    attempts,
    delay: baseDelay,
    backoff: 'exponential',
    maxDelay,
  });
}

export function retryWithLinearBackoff<T>(
  fn: () => T | Promise<T>,
  attempts = 3,
  baseDelay = 1000,
  maxDelay = 10000
): Promise<T> {
  return retryDelay(fn, {
    attempts,
    delay: baseDelay,
    backoff: 'linear',
    maxDelay,
  });
}