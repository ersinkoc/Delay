import delay from '../../src/index.js';
import { DelayError } from '../../src/types/index.js';

describe('Delay Integration Tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Main delay function', () => {
    it('should work as a function', async () => {
      const promise = delay(100);
      
      jest.advanceTimersByTime(100);
      await expect(promise).resolves.toBeUndefined();
    });

    it('should have time unit methods', async () => {
      const promises = [
        delay.ms(100),
        delay.seconds(0.1),
        delay.minutes(1/600),
        delay.hours(1/36000),
        delay.days(1/864000)
      ];

      jest.advanceTimersByTime(100);
      
      for (const promise of promises) {
        await expect(promise).resolves.toBeUndefined();
      }
    });
  });

  describe('Human-friendly syntax', () => {
    it('should parse time strings', async () => {
      const promise = delay.for('100ms');
      
      jest.advanceTimersByTime(100);
      await expect(promise).resolves.toBeUndefined();
    });

    it('should handle compound time strings', async () => {
      const promise = delay.for('1s 500ms');
      
      jest.advanceTimersByTime(1500);
      await expect(promise).resolves.toBeUndefined();
    });

    it('should wait until Date', async () => {
      const futureDate = new Date(Date.now() + 1000);
      const promise = delay.until(futureDate);
      
      jest.advanceTimersByTime(1000);
      await expect(promise).resolves.toBeUndefined();
    });

    it('should wait until predicate is true', async () => {
      let counter = 0;
      const promise = delay.until(() => ++counter >= 3);
      
      jest.advanceTimersByTime(200); // Should check multiple times
      await expect(promise).resolves.toBeUndefined();
      expect(counter).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Cancellable delays', () => {
    it('should create cancellable delay', async () => {
      const cancellable = delay.cancellable(1000);
      
      jest.advanceTimersByTime(500);
      cancellable.cancel();
      
      await expect(cancellable).rejects.toThrow(DelayError);
      expect(cancellable.isCancelled()).toBe(true);
    });
  });

  describe('Retry mechanism', () => {
    it('should retry failing functions', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValue('Success');
      
      const promise = delay.retry(fn, { attempts: 2, delay: 100 });
      
      await jest.runAllTimersAsync();
      const result = await promise;
      
      expect(result).toBe('Success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Repeat functionality', () => {
    it('should repeat function at interval', async () => {
      const fn = jest.fn();
      const controller = delay.repeat(fn, 100);
      
      // Wait for async initialization
      await Promise.resolve();
      expect(fn).toHaveBeenCalledTimes(1);
      
      jest.advanceTimersByTime(100);
      await Promise.resolve();
      expect(fn).toHaveBeenCalledTimes(2);
      
      jest.advanceTimersByTime(100);
      await Promise.resolve();
      expect(fn).toHaveBeenCalledTimes(3);
      
      controller.stop();
    });

    it('should pause and resume repeating function', async () => {
      const fn = jest.fn();
      const controller = delay.repeat(fn, 100);
      
      await Promise.resolve();
      expect(fn).toHaveBeenCalledTimes(1); // Initial call
      
      controller.pause();
      
      jest.advanceTimersByTime(100);
      await Promise.resolve();
      expect(fn).toHaveBeenCalledTimes(1); // Still 1, paused
      
      controller.resume();
      jest.advanceTimersByTime(100);
      await Promise.resolve();
      expect(fn).toHaveBeenCalledTimes(2);
      
      controller.stop();
    });
  });

  describe('Randomization', () => {
    it('should add jitter to delays', async () => {
      const promise1 = delay.random(100, { jitter: 0.1 });
      const promise2 = delay.random(100, { jitter: 0.1 });
      
      // With jitter, the actual delays should be slightly different
      // but both should complete within a reasonable range
      jest.advanceTimersByTime(120);
      
      await expect(Promise.all([promise1, promise2])).resolves.toBeDefined();
    });

    it('should create random delays between min and max', async () => {
      const promise = delay.between(100, 200);
      
      jest.advanceTimersByTime(200);
      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('Promise utilities', () => {
    it('should race promises with timeout', async () => {
      const slowPromise = new Promise(resolve => setTimeout(resolve, 1000));
      const promise = delay.race([slowPromise], 500);
      
      jest.advanceTimersByTime(500);
      await expect(promise).rejects.toThrow('timed out');
    });

    it('should ensure minimum execution time', async () => {
      const fastPromise = Promise.resolve('fast');
      const promise = delay.minimum(fastPromise, 200);
      
      jest.advanceTimersByTime(100);
      expect(promise).not.toHaveResolved();
      
      jest.advanceTimersByTime(100);
      await expect(promise).resolves.toBe('fast');
    });
  });

  describe('Throttle and debounce', () => {
    it('should throttle function calls', () => {
      const fn = jest.fn();
      const throttled = delay.throttle(fn, 100);
      
      throttled();
      throttled();
      throttled();
      
      expect(fn).toHaveBeenCalledTimes(1);
      
      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should debounce function calls', () => {
      const fn = jest.fn();
      const debounced = delay.debounce(fn, 100);
      
      debounced();
      debounced();
      debounced();
      
      expect(fn).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Batch scheduling', () => {
    it('should batch multiple delays', async () => {
      const scheduler = delay.batch();
      
      const promises = [
        scheduler.add(100),
        scheduler.add(100),
        scheduler.add(100)
      ];
      
      // Batch processing happens on next tick
      jest.advanceTimersByTime(16);
      
      // Then advance to complete the delays
      jest.advanceTimersByTime(100);
      
      await expect(Promise.all(promises)).resolves.toBeDefined();
    });
  });

  describe('Progress tracking', () => {
    it('should track progress during delay', async () => {
      const onProgress = jest.fn();
      const promise = delay(1000, { onProgress, progressInterval: 100 });
      
      jest.advanceTimersByTime(300);
      expect(onProgress).toHaveBeenCalled();
      
      const calls = onProgress.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      
      // Check that progress values make sense
      calls.forEach(([elapsed, total]) => {
        expect(elapsed).toBeGreaterThanOrEqual(0);
        expect(elapsed).toBeLessThanOrEqual(total);
        expect(total).toBe(1000);
      });
      
      jest.advanceTimersByTime(700);
      await promise;
    });
  });

  describe('Error handling', () => {
    it('should throw DelayError for invalid inputs', () => {
      expect(() => delay(-100)).toThrow(DelayError);
      expect(() => delay(NaN)).toThrow(DelayError);
      expect(() => delay.for('invalid')).toThrow(DelayError);
    });

    it('should handle AbortSignal cancellation', async () => {
      const controller = new AbortController();
      const promise = delay(1000, { signal: controller.signal });
      
      jest.advanceTimersByTime(500);
      controller.abort();
      
      await expect(promise).rejects.toThrow(DelayError);
    });
  });

  describe('Complex scenarios', () => {
    it('should handle nested delays', async () => {
      const results: number[] = [];
      
      const promise = (async () => {
        results.push(1);
        await delay(100);
        
        results.push(2);
        await delay.for('50ms');
        
        results.push(3);
        await delay.seconds(0.05);
        
        results.push(4);
      })();
      
      // Run all timers to completion
      await jest.runAllTimersAsync();
      await promise;
      
      expect(results).toEqual([1, 2, 3, 4]);
    });

    it('should handle concurrent delays', async () => {
      const results: string[] = [];
      
      const promises = [
        delay(100).then(() => results.push('A')),
        delay(150).then(() => results.push('B')),
        delay(50).then(() => results.push('C'))
      ];
      
      jest.advanceTimersByTime(50);
      await Promise.resolve(); // Let microtasks run
      expect(results).toEqual(['C']);
      
      jest.advanceTimersByTime(50);
      await Promise.resolve(); // Let microtasks run
      expect(results).toEqual(['C', 'A']);
      
      jest.advanceTimersByTime(50);
      await Promise.resolve(); // Let microtasks run
      expect(results).toEqual(['C', 'A', 'B']);
      
      await Promise.all(promises);
    });

    it('should handle cancellation of concurrent delays', async () => {
      const delays = [
        delay.cancellable(100),
        delay.cancellable(200),
        delay.cancellable(300)
      ];
      
      jest.advanceTimersByTime(150);
      delays[1]?.cancel();
      
      jest.advanceTimersByTime(200);
      
      await expect(delays[0]).resolves.toBeUndefined();
      await expect(delays[1]).rejects.toThrow(DelayError);
      await expect(delays[2]).resolves.toBeUndefined();
    });
  });
});

// Helper matcher
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveResolved(): R;
    }
  }
}

expect.extend({
  toHaveResolved(received: Promise<any>) {
    let resolved = false;
    received.then(() => { resolved = true; }).catch(() => {});
    
    return new Promise((resolve) => {
      setImmediate(() => {
        resolve({
          message: () => resolved 
            ? `Expected promise not to have resolved`
            : `Expected promise to have resolved`,
          pass: resolved,
        });
      });
    });
  },
});