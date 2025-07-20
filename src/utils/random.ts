import { DelayError, DelayErrorCode } from '../types/index.js';

export function addJitter(ms: number, jitter: number): number {
  if (jitter < 0 || jitter > 1) {
    throw new DelayError(
      `Jitter must be between 0 and 1, got ${jitter}`,
      DelayErrorCode.INVALID_OPTIONS,
      { jitter }
    );
  }

  const variation = ms * jitter;
  const randomVariation = (Math.random() - 0.5) * 2 * variation;
  return Math.max(0, ms + randomVariation);
}

export function randomBetween(min: number, max: number): number {
  if (min > max) {
    throw new DelayError(
      `Minimum value (${min}) cannot be greater than maximum value (${max})`,
      DelayErrorCode.INVALID_OPTIONS,
      { min, max }
    );
  }

  if (min < 0 || max < 0) {
    throw new DelayError(
      `Values cannot be negative. Min: ${min}, Max: ${max}`,
      DelayErrorCode.NEGATIVE_DELAY,
      { min, max }
    );
  }

  return Math.random() * (max - min) + min;
}

export function calculateBackoffDelay(
  baseDelay: number,
  attempt: number,
  strategy: 'linear' | 'exponential',
  factor = 2,
  maxDelay = Infinity
): number {
  let delay: number;

  switch (strategy) {
    case 'linear':
      delay = baseDelay * attempt;
      break;
    case 'exponential':
      delay = baseDelay * Math.pow(factor, attempt - 1);
      break;
    default:
      throw new DelayError(
        `Unknown backoff strategy: ${strategy}`,
        DelayErrorCode.INVALID_OPTIONS,
        { strategy }
      );
  }

  return Math.min(delay, maxDelay);
}