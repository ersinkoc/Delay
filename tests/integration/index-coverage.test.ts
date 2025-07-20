import delay, { 
  DelayError
} from '../../src/index';

describe('Index Module Coverage', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Main delay instance', () => {
    it('should have plugin manager available', () => {
      // This tests the main delay instance structure
      expect(delay).toBeDefined();
      // Plugin manager is part of the implementation, not exposed directly
      expect(delay.use).toBeDefined();
    });

    it('should test random method with default options', async () => {
      const promise = delay.random(100);
      
      jest.advanceTimersByTime(150); // Should cover jitter range
      await promise;
    });

    it('should test random method with custom jitter', async () => {
      const promise = delay.random(100, { jitter: 0.5 });
      
      jest.advanceTimersByTime(200); // Should cover larger jitter range
      await promise;
    });

    it('should test between method', async () => {
      const promise = delay.between(50, 150);
      
      jest.advanceTimersByTime(200); // Should cover random range
      await promise;
    });

    it('should test precise method', async () => {
      jest.useRealTimers(); // precise delay needs real timers
      
      const start = Date.now();
      await delay.precise(1);
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeGreaterThanOrEqual(1);
      expect(elapsed).toBeLessThan(50);
    });

    it('should test batch method with options', () => {
      const scheduler = delay.batch({ maxBatchSize: 50, batchWindow: 32 });
      expect(scheduler).toBeDefined();
      expect(scheduler.add).toBeDefined();
    });

    it('should test batch method without options', () => {
      const scheduler = delay.batch();
      expect(scheduler).toBeDefined();
    });

    it('should test race method', async () => {
      const promise1 = Promise.resolve('first');
      const promise2 = delay(1000).then(() => 'second');
      
      const result = await delay.race([promise1, promise2], 500);
      expect(result).toBe('first');
    });

    it('should test race method with timeout', async () => {
      const slowPromise = delay(2000).then(() => 'slow');
      
      const promise = delay.race([slowPromise], 500);
      
      jest.advanceTimersByTime(500);
      
      await expect(promise).rejects.toThrow('Operation timed out');
    });

    it('should test race method with custom timeout error', async () => {
      const slowPromise = delay(2000).then(() => 'slow');
      const customError = new Error('Custom timeout');
      
      const promise = delay.race([slowPromise], 500, customError);
      
      jest.advanceTimersByTime(500);
      
      await expect(promise).rejects.toBe(customError);
    });

    it('should test timeout method', async () => {
      const promise = delay.timeout(500);
      
      jest.advanceTimersByTime(500);
      
      await expect(promise).rejects.toThrow('Operation timed out');
    });

    it('should test timeout method with custom error', async () => {
      const customError = new Error('Custom timeout error');
      const promise = delay.timeout(500, customError);
      
      jest.advanceTimersByTime(500);
      
      await expect(promise).rejects.toBe(customError);
    });

    it('should test minimum method', async () => {
      const fastPromise = Promise.resolve('fast');
      
      const promise = delay.minimum(fastPromise, 1000);
      
      jest.advanceTimersByTime(1000);
      const result = await promise;
      
      expect(result).toBe('fast');
    });

    it('should test throttle method', () => {
      const fn = jest.fn();
      const throttled = delay.throttle(fn, 100);
      
      throttled();
      throttled();
      
      expect(fn).toHaveBeenCalledTimes(1);
      
      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should test throttle method with options', () => {
      const fn = jest.fn();
      const throttled = delay.throttle(fn, 100, { leading: false, trailing: true });
      
      throttled();
      expect(fn).toHaveBeenCalledTimes(0);
      
      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should test debounce method', () => {
      const fn = jest.fn();
      const debounced = delay.debounce(fn, 100);
      
      debounced();
      debounced();
      
      expect(fn).toHaveBeenCalledTimes(0);
      
      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
      
      // Test cancel and flush methods
      debounced();
      debounced.cancel();
      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
      
      debounced();
      (debounced as any).flush();
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should test debounce method with options', () => {
      const fn = jest.fn();
      const debounced = delay.debounce(fn, 100, { 
        leading: true, 
        trailing: false,
        maxWait: 200 
      });
      
      debounced();
      expect(fn).toHaveBeenCalledTimes(1);
      
      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1); // No trailing call
    });

    it('should test nextFrame method', async () => {
      // Mock requestAnimationFrame before calling delay.nextFrame()
      global.requestAnimationFrame = jest.fn((cb) => {
        setTimeout(() => cb(performance.now()), 16);
        return 1;
      });
      
      const promise = delay.nextFrame();
      
      jest.advanceTimersByTime(16);
      const result = await promise;
      
      expect(typeof result).toBe('number');
    });

    it('should test idle method', async () => {
      global.requestIdleCallback = jest.fn((cb) => {
        setTimeout(() => cb({
          timeRemaining: () => 50,
          didTimeout: false
        }), 0);
        return 1;
      });
      
      const promise = delay.idle();
      
      jest.advanceTimersByTime(0);
      const result = await promise;
      
      expect(result.timeRemaining()).toBe(50);
      expect(result.didTimeout).toBe(false);
    });

    it('should test idle method with options', async () => {
      global.requestIdleCallback = jest.fn((cb, options) => {
        setTimeout(() => cb({
          timeRemaining: () => 30,
          didTimeout: options?.timeout ? true : false
        }), 0);
        return 1;
      });
      
      const promise = delay.idle({ timeout: 100 });
      
      jest.advanceTimersByTime(0);
      const result = await promise;
      
      expect(result.timeRemaining()).toBe(30);
    });

    it('should test use method (plugin system)', () => {
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        init: jest.fn(),
        destroy: jest.fn()
      };
      
      expect(() => delay.use(plugin)).not.toThrow();
      expect(plugin.init).toHaveBeenCalled();
    });
  });

  describe('createDelayInstance function coverage', () => {
    it('should create callable instance with all methods', () => {
      // This tests the createDelayInstance function and property copying
      expect(typeof delay).toBe('function');
      expect(delay.ms).toBeDefined();
      expect(delay.seconds).toBeDefined();
      expect(delay.minutes).toBeDefined();
      expect(delay.hours).toBeDefined();
      expect(delay.days).toBeDefined();
      expect(delay.for).toBeDefined();
      expect(delay.until).toBeDefined();
      expect(delay.while).toBeDefined();
      expect(delay.cancellable).toBeDefined();
      expect(delay.retry).toBeDefined();
      expect(delay.repeat).toBeDefined();
      expect(delay.random).toBeDefined();
      expect(delay.between).toBeDefined();
      expect(delay.precise).toBeDefined();
      expect(delay.batch).toBeDefined();
      expect(delay.race).toBeDefined();
      expect(delay.timeout).toBeDefined();
      expect(delay.minimum).toBeDefined();
      expect(delay.throttle).toBeDefined();
      expect(delay.debounce).toBeDefined();
      expect(delay.nextFrame).toBeDefined();
      expect(delay.idle).toBeDefined();
      expect(delay.use).toBeDefined();
    });

    it('should test property descriptor handling in method copying', () => {
      // Test that delay instance has expected properties
      expect(delay).toBeDefined();
      expect(typeof delay.ms).toBe('function');
      expect(typeof delay.seconds).toBe('function');
    });

    it('should handle edge cases in property copying', () => {
      // Test that delay instance has necessary methods
      expect(delay.use).toBeDefined();
      expect(typeof delay.use).toBe('function');
    });
  });

  describe('Direct method calls', () => {
    it('should test all time unit methods', async () => {
      const promises = [
        delay.ms(100),
        delay.seconds(0.1),
        delay.minutes(0.001666), 
        delay.hours(0.0000277),
        delay.days(0.00000115)
      ];
      
      jest.advanceTimersByTime(150);
      await Promise.all(promises);
    });

    it('should test for method', async () => {
      const promise = delay.for('100ms');
      
      jest.advanceTimersByTime(100);
      await promise;
    });

    it('should test until method with Date', async () => {
      const futureDate = new Date(Date.now() + 100);
      const promise = delay.until(futureDate);
      
      jest.advanceTimersByTime(100);
      await promise;
    });

    it('should test until method with time string', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01 10:00:00'));
      
      // Use a time 1 minute in the future
      const promise = delay.until('10:01');
      
      jest.advanceTimersByTime(60000);
      await promise;
    });

    it('should test until method with predicate', async () => {
      let condition = false;
      setTimeout(() => { condition = true; }, 100);
      
      const promise = delay.until(() => condition);
      
      jest.advanceTimersByTime(150);
      await promise;
    });

    it('should test while method', async () => {
      let condition = true;
      setTimeout(() => { condition = false; }, 100);
      
      const promise = delay.while(() => condition);
      
      jest.advanceTimersByTime(150);
      await promise;
    });

    it('should test cancellable method', async () => {
      const cancellable = delay.cancellable(1000);
      
      setTimeout(() => cancellable.cancel(), 100);
      
      jest.advanceTimersByTime(100);
      
      await expect(cancellable).rejects.toThrow(DelayError);
    });

    it('should test retry method', async () => {
      let attempts = 0;
      const fn = jest.fn(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Retry error');
        }
        return 'success';
      });
      
      const promise = delay.retry(fn, { attempts: 3, delay: 100 });
      
      // Run all timers to completion
      await jest.runAllTimersAsync();
      const result = await promise;
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should test repeat method', async () => {
      const fn = jest.fn();
      const controller = delay.repeat(fn, 100);
      
      await Promise.resolve();
      expect(fn).toHaveBeenCalledTimes(1); // Immediate call
      
      jest.advanceTimersByTime(100);
      await Promise.resolve();
      expect(fn).toHaveBeenCalledTimes(2);
      
      jest.advanceTimersByTime(100);
      await Promise.resolve();
      expect(fn).toHaveBeenCalledTimes(3);
      
      controller.stop();
    });
  });
});