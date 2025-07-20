import { DelayOptions } from '../types/index.js';
import { parseTimeString, parseTimeUntil } from '../utils/time.js';
import { createBasicDelay } from './delay.js';

export function forDelay(timeString: string, options?: DelayOptions): Promise<void> {
  const ms = parseTimeString(timeString);
  return createBasicDelay(ms, options);
}

export function untilDelay(
  target: Date | string | (() => boolean),
  options?: DelayOptions
): Promise<void> {
  if (typeof target === 'function') {
    return conditionalDelay(target, options);
  }

  if (target instanceof Date) {
    const ms = Math.max(0, target.getTime() - Date.now());
    return createBasicDelay(ms, options);
  }

  if (typeof target === 'string') {
    const ms = parseTimeUntil(target);
    return createBasicDelay(ms, options);
  }

  throw new Error('Invalid target type for until delay');
}

export function whileDelay(
  predicate: () => boolean,
  options?: DelayOptions
): Promise<void> {
  return conditionalDelay(() => !predicate(), options);
}

async function conditionalDelay(
  condition: () => boolean,
  options: DelayOptions = {}
): Promise<void> {
  const checkInterval = 50; // Check every 50ms
  const { signal } = options;

  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Delay was aborted'));
      return;
    }

    const check = (): void => {
      if (signal?.aborted) {
        reject(new Error('Delay was cancelled'));
        return;
      }

      try {
        if (condition()) {
          resolve();
          return;
        }
      } catch (error) {
        reject(error);
        return;
      }

      setTimeout(check, checkInterval);
    };

    const handleAbort = (): void => {
      reject(new Error('Delay was cancelled'));
    };

    signal?.addEventListener('abort', handleAbort);

    // Start checking
    check();
  });
}