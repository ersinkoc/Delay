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
    const delay = target.getTime() - Date.now();
    if (delay < 0) {
      console.warn(`delay.until() target date is in the past by ${Math.abs(delay)}ms, resolving immediately`);
    }
    const ms = Math.max(0, delay);
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

    let timeoutId: NodeJS.Timeout | number | undefined;
    let isSettled = false;

    const cleanup = (): void => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
      if (signal) {
        signal.removeEventListener('abort', handleAbort);
      }
    };

    const check = (): void => {
      if (isSettled) {
        return;
      }

      if (signal?.aborted) {
        isSettled = true;
        cleanup();
        reject(new Error('Delay was cancelled'));
        return;
      }

      try {
        if (condition()) {
          isSettled = true;
          cleanup();
          resolve();
          return;
        }
      } catch (error) {
        isSettled = true;
        cleanup();
        reject(error);
        return;
      }

      timeoutId = setTimeout(check, checkInterval);
    };

    const handleAbort = (): void => {
      if (!isSettled) {
        isSettled = true;
        cleanup();
        reject(new Error('Delay was cancelled'));
      }
    };

    signal?.addEventListener('abort', handleAbort);

    // Start checking
    check();
  });
}