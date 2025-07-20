jest.mock('../../src/core/delay', () => ({
  createBasicDelay: jest.fn((ms: number) => {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  })
}));

import { 
  retryDelay, 
  retryWithExponentialBackoff, 
  retryWithLinearBackoff,
  createRetryWithDefaults 
} from '../../src/core/retry.js';
import { DelayError } from '../../src/types/index.js';

describe('Retry Mechanism', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('retryDelay', () => {
    it('should succeed on first attempt if function succeeds', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      
      const promise = retryDelay(fn, { attempts: 3, delay: 100 });
      const result = await promise;
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');
      
      const promise = retryDelay(fn, { attempts: 3, delay: 100 });
      
      // First attempt fails immediately
      await jest.runAllTimersAsync();
      
      const result = await promise;
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should fail after exhausting all attempts', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Always fails'));
      
      const promise = retryDelay(fn, { attempts: 3, delay: 100 });
      
      // Advance timers and wait for the promise to reject
      await expect(
        Promise.all([
          promise,
          jest.runAllTimersAsync()
        ])
      ).rejects.toThrow(DelayError);
      
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should call onRetry callback on each retry', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValue('success');
      
      const onRetry = jest.fn();
      
      const promise = retryDelay(fn, { 
        attempts: 3, 
        delay: 100,
        onRetry 
      });
      
      await jest.runAllTimersAsync();
      await promise;
      
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'First failure' }),
        1
      );
    });

    it('should handle onRetry callback errors gracefully', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValue('success');
      
      const onRetry = jest.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const promise = retryDelay(fn, { 
        attempts: 3, 
        delay: 100,
        onRetry 
      });
      
      await jest.runAllTimersAsync();
      const result = await promise;
      
      expect(result).toBe('success');
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should respect retryIf condition', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Retryable error'))
        .mockRejectedValueOnce(new Error('Non-retryable error'))
        .mockResolvedValue('success');
      
      const retryIf = jest.fn((error: Error) => 
        error.message.includes('Retryable')
      );
      
      const promise = retryDelay(fn, { 
        attempts: 3, 
        delay: 100,
        retryIf 
      });
      
      // Advance timers and wait for the promise to reject
      await expect(
        Promise.all([
          promise,
          jest.runAllTimersAsync()
        ])
      ).rejects.toThrow('Non-retryable error');
      
      expect(fn).toHaveBeenCalledTimes(2);
      expect(retryIf).toHaveBeenCalledTimes(2);
    });

    it('should use delay function when provided', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');
      
      const delayFn = jest.fn((attempt: number) => attempt * 100);
      
      const promise = retryDelay(fn, { 
        attempts: 3, 
        delay: delayFn 
      });
      
      await jest.runAllTimersAsync();
      await promise;
      
      expect(delayFn).toHaveBeenCalledWith(1);
      expect(delayFn).toHaveBeenCalledWith(2);
    });

    it('should handle linear backoff', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');
      
      const promise = retryDelay(fn, { 
        attempts: 3, 
        delay: 100,
        backoff: 'linear'
      });
      
      await jest.runAllTimersAsync();
      await promise;
      
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should handle exponential backoff', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');
      
      const promise = retryDelay(fn, { 
        attempts: 3, 
        delay: 100,
        backoff: 'exponential',
        backoffFactor: 2
      });
      
      await jest.runAllTimersAsync();
      await promise;
      
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should respect maxDelay', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');
      
      const promise = retryDelay(fn, { 
        attempts: 3, 
        delay: 1000,
        backoff: 'exponential',
        backoffFactor: 10,
        maxDelay: 500
      });
      
      await jest.runAllTimersAsync();
      await promise;
      
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should work with async functions', async () => {
      const fn = jest.fn();
      fn.mockRejectedValueOnce(new Error('Async error'));
      fn.mockResolvedValueOnce('success');
      
      const promise = retryDelay(fn, { attempts: 2, delay: 100 });
      
      await jest.runAllTimersAsync();
      const result = await promise;
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should work with synchronous functions', async () => {
      const fn = jest.fn() as jest.MockedFunction<() => string>;
      
      // Set up the mock implementations
      fn.mockImplementationOnce(() => { throw new Error('Sync error'); });
      fn.mockImplementationOnce(() => 'success');
      
      const promise = retryDelay(fn, { attempts: 2, delay: 100 });
      
      await jest.runAllTimersAsync();
      const result = await promise;
      
      expect(result).toBe('success');
    });

    it('should handle non-Error rejections', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce('String error')
        .mockRejectedValueOnce(42)
        .mockRejectedValueOnce(null)
        .mockResolvedValue('success');
      
      const promise = retryDelay(fn, { attempts: 4, delay: 100 });
      
      await jest.runAllTimersAsync();
      const result = await promise;
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(4);
    });
  });

  describe('Input validation', () => {
    it('should validate retry options', async () => {
      const fn = jest.fn();
      
      await expect(retryDelay(fn, null as any)).rejects.toThrow(DelayError);
      await expect(retryDelay(fn, { attempts: 0, delay: 100 })).rejects.toThrow(DelayError);
      await expect(retryDelay(fn, { attempts: -1, delay: 100 })).rejects.toThrow(DelayError);
      await expect(retryDelay(fn, { attempts: 1, delay: -100 })).rejects.toThrow(DelayError);
      await expect(retryDelay(fn, { attempts: 1, delay: 100, backoff: 'invalid' as any })).rejects.toThrow(DelayError);
    });

    it('should validate function parameter', async () => {
      await expect(retryDelay(null as any, { attempts: 1, delay: 100 })).rejects.toThrow(DelayError);
      await expect(retryDelay('not a function' as any, { attempts: 1, delay: 100 })).rejects.toThrow(DelayError);
    });
  });

  describe('Convenience functions', () => {
    it('should work with retryWithExponentialBackoff', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Failure'))
        .mockResolvedValue('success');
      
      const promise = retryWithExponentialBackoff(fn, 3, 100, 1000);
      
      await jest.runAllTimersAsync();
      const result = await promise;
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should work with retryWithLinearBackoff', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Failure'))
        .mockResolvedValue('success');
      
      const promise = retryWithLinearBackoff(fn, 3, 100, 1000);
      
      await jest.runAllTimersAsync();
      const result = await promise;
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should work with createRetryWithDefaults', async () => {
      const retryWithDefaults = createRetryWithDefaults({
        attempts: 5,
        delay: 200,
        backoff: 'exponential',
        backoffFactor: 3
      });

      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Failure'))
        .mockResolvedValue('success');
      
      const promise = retryWithDefaults(fn);
      
      await jest.runAllTimersAsync();
      const result = await promise;
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should allow overriding defaults in createRetryWithDefaults', async () => {
      const retryWithDefaults = createRetryWithDefaults({
        attempts: 10,
        delay: 500,
        backoff: 'linear'
      });

      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Failure'))
        .mockResolvedValue('success');
      
      // Override the attempts
      const promise = retryWithDefaults(fn, { attempts: 2 });
      
      await jest.runAllTimersAsync();
      const result = await promise;
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero delay between retries', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Failure'))
        .mockResolvedValue('success');
      
      const promise = retryDelay(fn, { attempts: 2, delay: 0 });
      const result = await promise;
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should handle single attempt', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Failure'));
      
      const promise = retryDelay(fn, { attempts: 1, delay: 100 });
      
      await expect(promise).rejects.toThrow('Retry exhausted after 1 attempts');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should preserve original error type in DelayError', async () => {
      const originalError = new TypeError('Original error');
      const fn = jest.fn().mockRejectedValue(originalError);
      
      const promise = retryDelay(fn, { attempts: 1, delay: 100 });
      
      await expect(promise).rejects.toThrow(DelayError);
      
      try {
        await promise;
      } catch (error) {
        expect((error as DelayError).details?.['originalError']).toBe(originalError);
      }
    });
  });
});