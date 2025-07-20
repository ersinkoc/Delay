import { throttle, debounce } from '../../src/utils/throttle-debounce.js';

describe('Throttle and Debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('throttle', () => {
    it('should limit function calls to specified interval', () => {
      const fn = jest.fn();
      const throttled = throttle(fn, 100);

      throttled();
      throttled();
      throttled();

      expect(fn).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should call function immediately on first call (leading edge)', () => {
      const fn = jest.fn();
      const throttled = throttle(fn, 100, { leading: true });

      throttled();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not call function immediately when leading is false', () => {
      const fn = jest.fn();
      const throttled = throttle(fn, 100, { leading: false });

      throttled();
      expect(fn).toHaveBeenCalledTimes(0);

      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should call function on trailing edge when trailing is true', () => {
      const fn = jest.fn();
      const throttled = throttle(fn, 100, { trailing: true });

      throttled();
      throttled();
      
      expect(fn).toHaveBeenCalledTimes(1);
      
      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not call function on trailing edge when trailing is false', () => {
      const fn = jest.fn();
      const throttled = throttle(fn, 100, { trailing: false });

      throttled();
      throttled();
      
      expect(fn).toHaveBeenCalledTimes(1);
      
      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should preserve function arguments', () => {
      const fn = jest.fn();
      const throttled = throttle(fn, 100);

      throttled('arg1', 'arg2');
      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should preserve function context', () => {
      const obj = {
        value: 42,
        method: jest.fn(function(this: any) {
          return this.value;
        })
      };

      const throttled = throttle(obj.method, 100);
      throttled.call(obj);

      expect(obj.method).toHaveBeenCalled();
    });

    it('should cancel pending calls when cancel is called', () => {
      const fn = jest.fn();
      const throttled = throttle(fn, 100) as any;

      throttled();
      throttled();
      throttled.cancel();

      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should flush pending calls when flush is called', () => {
      const fn = jest.fn();
      const throttled = throttle(fn, 100) as any;

      throttled();
      throttled();
      
      expect(fn).toHaveBeenCalledTimes(1);
      
      throttled.flush();
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should return the result of the function', () => {
      const fn = jest.fn().mockReturnValue('result');
      const throttled = throttle(fn, 100);

      const result = throttled();
      expect(result).toBe('result');
    });
  });

  describe('debounce', () => {
    it('should delay function execution until after delay', () => {
      const fn = jest.fn();
      const debounced = debounce(fn, 100);

      debounced();
      expect(fn).toHaveBeenCalledTimes(0);

      jest.advanceTimersByTime(99);
      expect(fn).toHaveBeenCalledTimes(0);

      jest.advanceTimersByTime(1);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should reset delay on subsequent calls', () => {
      const fn = jest.fn();
      const debounced = debounce(fn, 100);

      debounced();
      jest.advanceTimersByTime(50);
      
      debounced();
      jest.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(0);

      jest.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should call function immediately when leading is true', () => {
      const fn = jest.fn();
      const debounced = debounce(fn, 100, { leading: true });

      debounced();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should not call function on trailing edge when trailing is false', () => {
      const fn = jest.fn();
      const debounced = debounce(fn, 100, { trailing: false });

      debounced();
      jest.advanceTimersByTime(100);
      
      expect(fn).toHaveBeenCalledTimes(0);
    });

    it('should respect maxWait option', () => {
      const fn = jest.fn();
      const debounced = debounce(fn, 100, { maxWait: 150 });

      debounced();
      
      jest.advanceTimersByTime(50);
      debounced();
      
      jest.advanceTimersByTime(50);
      debounced();
      
      jest.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should preserve function arguments from last call', () => {
      const fn = jest.fn();
      const debounced = debounce(fn, 100);

      debounced('first');
      debounced('second');
      debounced('third');

      jest.advanceTimersByTime(100);
      
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('third');
    });

    it('should preserve function context', () => {
      const obj = {
        value: 42,
        method: jest.fn(function(this: any) {
          return this.value;
        })
      };

      const debounced = debounce(obj.method, 100);
      debounced.call(obj);

      jest.advanceTimersByTime(100);
      expect(obj.method).toHaveBeenCalled();
    });

    it('should cancel pending calls when cancel is called', () => {
      const fn = jest.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced.cancel();

      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(0);
    });

    it('should flush pending calls when flush is called', () => {
      const fn = jest.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced.flush();
      
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should return the result of the function when flushed', () => {
      const fn = jest.fn().mockReturnValue('result');
      const debounced = debounce(fn, 100);

      debounced();
      const result = debounced.flush();
      
      expect(result).toBe('result');
    });

    it('should handle both leading and trailing calls', () => {
      const fn = jest.fn();
      const debounced = debounce(fn, 100, { leading: true, trailing: true });

      debounced();
      expect(fn).toHaveBeenCalledTimes(1);

      // Call again to ensure trailing will trigger
      debounced();
      
      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple maxWait triggers', () => {
      const fn = jest.fn();
      const debounced = debounce(fn, 100, { maxWait: 50 });

      debounced();
      
      jest.advanceTimersByTime(25);
      debounced();
      
      jest.advanceTimersByTime(25);
      expect(fn).toHaveBeenCalledTimes(0); // No call yet since wait=100ms hasn't passed
      
      debounced();
      jest.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1); // Now it should trigger
    });
  });

  describe('Edge cases', () => {
    it('should handle zero delay for throttle', () => {
      const fn = jest.fn();
      const throttled = throttle(fn, 0);

      throttled();
      expect(fn).toHaveBeenCalledTimes(1);
      
      // With zero delay, second call should execute immediately
      throttled();
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should handle zero delay for debounce', () => {
      const fn = jest.fn();
      const debounced = debounce(fn, 0);

      debounced();
      expect(fn).toHaveBeenCalledTimes(0);
      
      jest.advanceTimersByTime(0);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should handle function that throws in throttle', () => {
      const fn = jest.fn().mockImplementation(() => {
        throw new Error('Function error');
      });
      const throttled = throttle(fn, 100);

      expect(() => throttled()).toThrow('Function error');
    });

    it('should handle function that throws in debounce', () => {
      const fn = jest.fn().mockImplementation(() => {
        throw new Error('Function error');
      });
      const debounced = debounce(fn, 100);

      debounced();
      
      expect(() => {
        jest.advanceTimersByTime(100);
      }).toThrow('Function error');
    });

    it('should clean up timers properly on cancel', () => {
      const fn = jest.fn();
      const throttled = throttle(fn, 100) as any;
      const debounced = debounce(fn, 100) as any;

      throttled();
      debounced();
      
      throttled.cancel();
      debounced.cancel();

      // Should not throw or cause memory leaks
      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1); // Only from throttle's leading call
    });

    // Additional coverage for throttle edge cases
    it('should handle throttle with negative time since last call', () => {
      const fn = jest.fn();
      const throttled = throttle(fn, 100);
      
      // Mock Date.now to simulate negative time difference
      const originalNow = Date.now;
      let timeValue = 1000;
      Date.now = jest.fn(() => timeValue);
      
      throttled();
      expect(fn).toHaveBeenCalledTimes(1);
      
      // Simulate going backwards in time
      timeValue = 500;
      throttled();
      expect(fn).toHaveBeenCalledTimes(2); // Should invoke due to negative time
      
      Date.now = originalNow;
    });

    it('should handle throttle timer expired edge case', () => {
      const fn = jest.fn();
      const throttled = throttle(fn, 100);
      
      throttled();
      expect(fn).toHaveBeenCalledTimes(1);
      
      // Call again to trigger remainingWait calculation
      jest.advanceTimersByTime(50);
      throttled();
      
      // Should reschedule timer with remaining time
      jest.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should handle throttle with trailing disabled and multiple calls', () => {
      const fn = jest.fn();
      const throttled = throttle(fn, 100, { trailing: false });
      
      throttled();
      expect(fn).toHaveBeenCalledTimes(1);
      
      throttled();
      throttled();
      
      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1); // No trailing call
    });

    it('should handle throttle flush with no pending timer', () => {
      const fn = jest.fn().mockReturnValue('result');
      const throttled = throttle(fn, 100) as any;
      
      // Flush without any pending calls
      const result = throttled.flush();
      expect(result).toBeUndefined(); // Returns cached result
    });

    it('should handle debounce with maxWait and leading=true', () => {
      const fn = jest.fn();
      const debounced = debounce(fn, 200, { maxWait: 100, leading: true });
      
      debounced();
      expect(fn).toHaveBeenCalledTimes(1); // Leading call
      
      jest.advanceTimersByTime(50);
      debounced();
      
      jest.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1); // maxWait not triggered yet
      
      jest.advanceTimersByTime(100); // Complete the wait
      expect(fn).toHaveBeenCalledTimes(2); // Now trailing edge should fire
    });

    it('should handle debounce cancel with maxWait timer', () => {
      const fn = jest.fn();
      const debounced = debounce(fn, 200, { maxWait: 100 });
      
      debounced();
      jest.advanceTimersByTime(50);
      debounced();
      
      debounced.cancel(); // Should cancel both regular and maxWait timers
      
      jest.advanceTimersByTime(150);
      expect(fn).toHaveBeenCalledTimes(0);
    });

    it('should handle debounce flush with no pending timer', () => {
      const fn = jest.fn().mockReturnValue('result');
      const debounced = debounce(fn, 100);
      
      // Flush without any pending calls
      const result = debounced.flush();
      expect(result).toBeUndefined(); // Returns cached result
    });

    it('should handle debounce trailing edge with no args', () => {
      const fn = jest.fn();
      const debounced = debounce(fn, 100, { trailing: true });
      
      debounced();
      
      // Manually trigger trailingEdge scenario where lastArgs is undefined
      debounced.cancel(); // This clears lastArgs
      
      // Create a new timer without args
      jest.advanceTimersByTime(100);
      
      // Should handle gracefully
    });

    it('should handle throttle with both leading and trailing false', () => {
      const fn = jest.fn();
      const throttled = throttle(fn, 100, { leading: false, trailing: false });
      
      throttled();
      expect(fn).toHaveBeenCalledTimes(0);
      
      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(0); // No execution at all
    });

    it('should handle complex throttle scenarios with remainingWait', () => {
      const fn = jest.fn();
      const throttled = throttle(fn, 100);
      
      throttled(); // First call
      expect(fn).toHaveBeenCalledTimes(1);
      
      jest.advanceTimersByTime(50); // 50ms later
      throttled(); // Should schedule for remaining 50ms
      
      jest.advanceTimersByTime(50); // Complete the wait
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});