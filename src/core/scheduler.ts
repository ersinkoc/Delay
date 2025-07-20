import { BatchScheduler, BatchDelayOptions } from '../types/index.js';
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
    if (isProcessing || pendingDelays.length === 0) {
      return;
    }

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
        if (typeof batchTimeoutId === 'number') {
          clearTimeout(batchTimeoutId);
        } else {
          clearTimeout(batchTimeoutId);
        }
        batchTimeoutId = undefined;
      }
      void processBatch();
    },

    clear(): void {
      if (batchTimeoutId !== undefined) {
        if (typeof batchTimeoutId === 'number') {
          clearTimeout(batchTimeoutId);
        } else {
          clearTimeout(batchTimeoutId);
        }
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
  
  // Busy wait for the remaining time
  while (getHighResolutionTime() - startTime < ms) {
    // Busy wait - this is intentionally blocking for precision
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
    
    callback();
    
    const nextInterval = Math.max(0, interval - drift);
    timeoutId = setTimeout(tick, nextInterval);
  };
  
  timeoutId = setTimeout(tick, interval);
  
  return (): void => {
    if (typeof timeoutId === 'number') {
      clearTimeout(timeoutId);
    } else {
      clearTimeout(timeoutId);
    }
  };
}