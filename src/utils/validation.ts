import { DelayError, DelayErrorCode } from '../types/index.js';

export function validateDelay(ms: number): void {
  if (typeof ms !== 'number') {
    throw new DelayError(
      `Delay must be a number, got ${typeof ms}`,
      DelayErrorCode.INVALID_TIME,
      { value: ms }
    );
  }

  if (!Number.isFinite(ms)) {
    throw new DelayError(
      `Delay must be a finite number, got ${ms}`,
      DelayErrorCode.INVALID_TIME,
      { value: ms }
    );
  }

  if (ms < 0) {
    throw new DelayError(
      `Delay cannot be negative, got ${ms}`,
      DelayErrorCode.NEGATIVE_DELAY,
      { value: ms }
    );
  }
}

export function validateRetryOptions(options: unknown): void {
  if (!options || typeof options !== 'object') {
    throw new DelayError(
      'Retry options must be an object',
      DelayErrorCode.INVALID_OPTIONS,
      { options }
    );
  }

  const opts = options as Record<string, unknown>;

  if (typeof opts['attempts'] !== 'number' || opts['attempts'] < 1) {
    throw new DelayError(
      'Retry attempts must be a positive number',
      DelayErrorCode.INVALID_OPTIONS,
      { attempts: opts['attempts'] }
    );
  }

  if (opts['delay'] !== undefined) {
    if (typeof opts['delay'] !== 'number' && typeof opts['delay'] !== 'function') {
      throw new DelayError(
        'Retry delay must be a number or function',
        DelayErrorCode.INVALID_OPTIONS,
        { delay: opts['delay'] }
      );
    }

    if (typeof opts['delay'] === 'number' && opts['delay'] < 0) {
      throw new DelayError(
        'Retry delay cannot be negative',
        DelayErrorCode.NEGATIVE_DELAY,
        { delay: opts['delay'] }
      );
    }
  }

  if (opts['backoff'] && !['linear', 'exponential'].includes(opts['backoff'] as string)) {
    throw new DelayError(
      'Backoff strategy must be "linear" or "exponential"',
      DelayErrorCode.INVALID_OPTIONS,
      { backoff: opts['backoff'] }
    );
  }
}

export function validateFunction(fn: unknown, name: string): void {
  if (typeof fn !== 'function') {
    throw new DelayError(
      `${name} must be a function`,
      DelayErrorCode.INVALID_OPTIONS,
      { fn, name }
    );
  }
}