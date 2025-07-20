import { createBasicDelay, secondsDelay } from '../../src/core/delay.js';
import { DelayError, DelayErrorCode } from '../../src/types/index.js';

describe('Core Delay Functionality', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('createBasicDelay', () => {
    it('should resolve after specified milliseconds', async () => {
      const promise = createBasicDelay(1000);
      
      jest.advanceTimersByTime(999);
      expect(promise).not.toHaveResolved();
      
      jest.advanceTimersByTime(1);
      await expect(promise).resolves.toBeUndefined();
    });

    it('should resolve immediately for zero delay', async () => {
      const promise = createBasicDelay(0);
      
      // Allow any immediate promises to resolve
      await jest.runOnlyPendingTimersAsync();
      
      await expect(promise).resolves.toBeUndefined();
    });

    it('should reject with DelayError for negative delay', () => {
      expect(() => createBasicDelay(-100)).toThrow(DelayError);
      expect(() => createBasicDelay(-100)).toThrow('cannot be negative');
    });

    it('should reject with DelayError for non-finite delay', () => {
      expect(() => createBasicDelay(Infinity)).toThrow(DelayError);
      expect(() => createBasicDelay(NaN)).toThrow(DelayError);
    });

    it('should reject with DelayError for non-number delay', () => {
      expect(() => createBasicDelay('100' as any)).toThrow(DelayError);
      expect(() => createBasicDelay(null as any)).toThrow(DelayError);
    });

    it('should handle AbortSignal cancellation', async () => {
      const controller = new AbortController();
      const promise = createBasicDelay(1000, { signal: controller.signal });
      
      jest.advanceTimersByTime(500);
      controller.abort();
      
      await expect(promise).rejects.toThrow(DelayError);
      await expect(promise).rejects.toThrow('cancelled');
    });

    it('should reject immediately if signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();
      
      const promise = createBasicDelay(1000, { signal: controller.signal });
      await expect(promise).rejects.toThrow(DelayError);
    });

    it('should call progress callback during delay', async () => {
      const onProgress = jest.fn();
      const promise = createBasicDelay(1000, { 
        onProgress, 
        progressInterval: 100 
      });
      
      // Initial call happens immediately
      expect(onProgress).toHaveBeenCalledTimes(1);
      expect(onProgress).toHaveBeenCalledWith(expect.any(Number), 1000);
      
      jest.advanceTimersByTime(100);
      expect(onProgress).toHaveBeenCalledTimes(2);
      
      jest.advanceTimersByTime(300);
      expect(onProgress).toHaveBeenCalledTimes(5); // Initial + 100 + 200 + 300 + 400
      
      jest.advanceTimersByTime(600);
      await promise;
      
      // Should have been called for: initial, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000
      expect(onProgress).toHaveBeenCalledTimes(11);
    });

    it('should not call progress callback for short delays', async () => {
      const onProgress = jest.fn();
      const promise = createBasicDelay(50, { 
        onProgress, 
        progressInterval: 100 
      });
      
      jest.advanceTimersByTime(50);
      await promise;
      
      expect(onProgress).not.toHaveBeenCalled();
    });
  });

  describe('Time unit helpers', () => {
    it('should convert seconds to milliseconds', async () => {
      const promise = secondsDelay(2);
      
      jest.advanceTimersByTime(1999);
      expect(promise).not.toHaveResolved();
      
      jest.advanceTimersByTime(1);
      await expect(promise).resolves.toBeUndefined();
    });

    it('should handle fractional seconds', async () => {
      const promise = secondsDelay(1.5);
      
      jest.advanceTimersByTime(1499);
      expect(promise).not.toHaveResolved();
      
      jest.advanceTimersByTime(1);
      await expect(promise).resolves.toBeUndefined();
    });

    it('should pass options to underlying delay', async () => {
      const controller = new AbortController();
      const promise = secondsDelay(1, { signal: controller.signal });
      
      jest.advanceTimersByTime(500);
      controller.abort();
      
      await expect(promise).rejects.toThrow(DelayError);
    });
  });

  describe('Error handling', () => {
    it('should create DelayError with correct code', () => {
      try {
        createBasicDelay(-100);
      } catch (error) {
        expect(error).toBeInstanceOf(DelayError);
        expect((error as DelayError).code).toBe(DelayErrorCode.NEGATIVE_DELAY);
        expect((error as DelayError).details).toEqual({ value: -100 });
      }
    });

    it('should preserve error prototype chain', () => {
      try {
        createBasicDelay(-100);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(DelayError);
        expect((error as DelayError).name).toBe('DelayError');
      }
    });
  });
});

// Custom Jest matchers for async testing
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveResolved(): R;
    }
  }
}

expect.extend({
  toHaveResolved(received: Promise<any>) {
    const promise = received;
    let resolved = false;
    let rejected = false;
    
    promise.then(() => { resolved = true; }).catch(() => { rejected = true; });
    
    // Force microtask queue to flush
    return new Promise((resolve) => {
      setImmediate(() => {
        if (resolved) {
          resolve({
            message: () => `Expected promise not to have resolved`,
            pass: true,
          });
        } else if (rejected) {
          resolve({
            message: () => `Expected promise to have resolved, but it rejected`,
            pass: false,
          });
        } else {
          resolve({
            message: () => `Expected promise to have resolved, but it's still pending`,
            pass: false,
          });
        }
      });
    });
  },
});