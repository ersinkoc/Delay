import { DelayOptions, DelayError, DelayErrorCode, ProgressCallback } from '../types/index.js';
import { validateDelay } from '../utils/validation.js';
import { getHighResolutionTime } from '../utils/time.js';

export function createBasicDelay(ms: number, options: DelayOptions = {}): Promise<void> {
  validateDelay(ms);

  return new Promise<void>((resolve, reject) => {
    const { signal, onProgress, progressInterval = 100 } = options;

    // Check if already aborted
    if (signal?.aborted) {
      reject(new DelayError('Delay was aborted', DelayErrorCode.CANCELLED));
      return;
    }

    // Handle immediate resolve for zero delay (but still check for cancellation)
    if (ms === 0) {
      // Use setTimeout to allow for cancellation even on zero delay
      const timeoutId = setTimeout(() => {
        if (!signal?.aborted) {
          resolve();
        }
      }, 0);
      
      signal?.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new DelayError('Delay was cancelled', DelayErrorCode.CANCELLED));
      });
      
      return;
    }

    const startTime = getHighResolutionTime();
    let timeoutId: NodeJS.Timeout | number;
    let progressIntervalId: NodeJS.Timeout | number | undefined;
    let isResolved = false;

    const cleanup = (): void => {
      clearTimeout(timeoutId);

      if (progressIntervalId !== undefined) {
        clearInterval(progressIntervalId);
      }
    };

    const handleAbort = (): void => {
      if (!isResolved) {
        isResolved = true;
        cleanup();
        reject(new DelayError('Delay was cancelled', DelayErrorCode.CANCELLED));
      }
    };

    const handleResolve = (): void => {
      if (!isResolved) {
        isResolved = true;
        cleanup();
        signal?.removeEventListener('abort', handleAbort);
        resolve();
      }
    };

    // Set up abort handling
    signal?.addEventListener('abort', handleAbort);

    // Set up progress tracking
    if (onProgress && ms > progressInterval) {
      const updateProgress = (): void => {
        if (!isResolved) {
          const elapsed = getHighResolutionTime() - startTime;
          const clampedElapsed = Math.min(elapsed, ms);
          onProgress(clampedElapsed, ms);

          if (elapsed >= ms && progressIntervalId !== undefined) {
            clearInterval(progressIntervalId);
          }
        }
      };

      progressIntervalId = setInterval(updateProgress, progressInterval);
      
      // Call immediately for initial progress
      updateProgress();
    }

    // Set the main timeout
    timeoutId = setTimeout(handleResolve, ms);
  });
}

export function createProgressiveDelay(
  ms: number,
  onProgress: ProgressCallback,
  progressInterval = 100
): Promise<void> {
  return createBasicDelay(ms, { onProgress, progressInterval });
}

export function msDelay(milliseconds: number, options?: DelayOptions): Promise<void> {
  return createBasicDelay(milliseconds, options);
}

export function secondsDelay(seconds: number, options?: DelayOptions): Promise<void> {
  return createBasicDelay(seconds * 1000, options);
}

export function minutesDelay(minutes: number, options?: DelayOptions): Promise<void> {
  return createBasicDelay(minutes * 60 * 1000, options);
}

export function hoursDelay(hours: number, options?: DelayOptions): Promise<void> {
  return createBasicDelay(hours * 60 * 60 * 1000, options);
}

export function daysDelay(days: number, options?: DelayOptions): Promise<void> {
  return createBasicDelay(days * 24 * 60 * 60 * 1000, options);
}