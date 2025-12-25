import { BatchScheduler, BatchDelayOptions, DelayError, DelayErrorCode } from '../types/index.js';
import { getHighResolutionTime } from '../utils/time.js';
import { createBasicDelay } from './delay.js';

export function createBatchScheduler(options: BatchDelayOptions = {}): BatchScheduler {
  const { maxBatchSize = 100, batchWindow = 16 } = options; // 16ms ≈ 1 frame
  
  const pendingDelays: Array<{
    ms: number;
    resolve: () => void;
    reject: (error: Error) => void;
  }> = [];
  
  let batchTimeoutId: NodeJS.Timeout | number | undefined;
  let isProcessing = false;

  const processBatch = async (): Promise<void> => {
    // Guard against concurrent execution and empty queue
    if (isProcessing || pendingDelays.length === 0) {
      return;
    }

    // Set processing flag immediately to prevent re-entry
    isProcessing = true;
    batchTimeoutId = undefined;

    // Group delays by duration for efficiency
    const delayGroups = new Map<number, Array<{ resolve: () => void; reject: (error: Error) => void }>>();
    
    const itemsToProcess = pendingDelays.splice(0, maxBatchSize);
    
    for (const item of itemsToProcess) {
      const group = delayGroups.get(item.ms) || [];
      group.push({ resolve: item.resolve, reject: item.reject });
      delayGroups.set(item.ms, group);
    }

    // Process each group
    const promises = Array.from(delayGroups.entries()).map(async ([ms, items]) => {
      try {
        await createBasicDelay(ms);
        items.forEach(item => item.resolve());
      } catch (error) {
        items.forEach(item => item.reject(error as Error));
      }
    });

    await Promise.all(promises);
    isProcessing = false;

    // Schedule next batch if there are more items
    if (pendingDelays.length > 0) {
      scheduleBatch();
    }
  };

  const scheduleBatch = (): void => {
    if (batchTimeoutId === undefined && !isProcessing) {
      batchTimeoutId = setTimeout(processBatch, batchWindow);
    }
  };

  return {
    add(ms: number): Promise<void> {
      return new Promise<void>((resolve, reject) => {
        pendingDelays.push({ ms, resolve, reject });
        scheduleBatch();
      });
    },

    flush(): void {
      if (batchTimeoutId !== undefined) {
        clearTimeout(batchTimeoutId);
        batchTimeoutId = undefined;
      }
      void processBatch();
    },

    clear(): void {
      if (batchTimeoutId !== undefined) {
        clearTimeout(batchTimeoutId);
        batchTimeoutId = undefined;
      }

      // Reject all pending delays
      const error = new Error('Batch scheduler cleared');
      pendingDelays.forEach(item => item.reject(error));
      pendingDelays.length = 0;
      isProcessing = false;
    },
  };
}

export async function preciseDelay(ms: number): Promise<void> {
  const startTime = getHighResolutionTime();
  let remaining = ms;

  // Use a combination of setTimeout and busy waiting for high precision
  const threshold = 4; // Switch to busy waiting when less than 4ms remain

  while (remaining > threshold) {
    const sleepTime = Math.min(remaining - threshold, 15); // Sleep in chunks
    await createBasicDelay(sleepTime);

    const elapsed = getHighResolutionTime() - startTime;
    remaining = ms - elapsed;
  }

  // Busy wait for the remaining time with safety limit
  const maxIterations = 10000000; // Safety limit to prevent infinite loops
  let iterations = 0;
  while (getHighResolutionTime() - startTime < ms) {
    iterations++;
    if (iterations > maxIterations) {
      throw new DelayError(
        'Busy wait exceeded maximum iterations - possible time measurement issue',
        DelayErrorCode.TIMEOUT,
        { ms, iterations, elapsed: getHighResolutionTime() - startTime }
      );
    }
  }
}

export class DelayScheduler {
  private scheduler = createBatchScheduler();
  
  schedule(ms: number): Promise<void> {
    return this.scheduler.add(ms);
  }
  
  flush(): void {
    this.scheduler.flush();
  }
  
  clear(): void {
    this.scheduler.clear();
  }
}

export function createDriftCompensatedTimer(
  callback: () => void,
  interval: number
): () => void {
  const start = getHighResolutionTime();
  let count = 0;
  let timeoutId: NodeJS.Timeout | number;
  
  const tick = (): void => {
    count++;
    const target = start + count * interval;
    const current = getHighResolutionTime();
    const drift = current - target;

    // Detect if time went backwards (drift is very negative)
    if (drift < -interval) {
      console.warn('System time appears to have jumped backwards, resetting drift compensation');
      // When time jumps backwards, use the standard interval without drift compensation
      // (BUG-001 FIX: Previous logic had adjustedDrift always equal 0 due to math cancellation)
      callback();
      timeoutId = setTimeout(tick, interval);
      return;
    }

    callback();

    // Clamp nextInterval to reasonable bounds (0 to 2x interval)
    const nextInterval = Math.max(0, Math.min(interval * 2, interval - drift));
    timeoutId = setTimeout(tick, nextInterval);
  };
  
  timeoutId = setTimeout(tick, interval);
  
  return (): void => {
    clearTimeout(timeoutId);
  };
}