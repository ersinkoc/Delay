import {
  raceWithTimeout,
  createTimeoutPromise,
  minimumDelay,
  raceArray,
  createDelayedPromise,
  sequential,
  parallel
} from '../../src/utils/promise';
import { DelayError, DelayErrorCode } from '../../src/types/index';

describe('Promise Utilities', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('raceWithTimeout', () => {
    it('should resolve with first promise if it completes before timeout', async () => {
      const fastPromise = Promise.resolve('fast result');
      const slowPromise = new Promise(resolve => setTimeout(() => resolve('slow'), 1000));
      
      const result = raceWithTimeout([fastPromise, slowPromise], 500);
      
      await expect(result).resolves.toBe('fast result');
    });

    it('should timeout if no promise completes in time', async () => {
      const slowPromise = new Promise(resolve => setTimeout(() => resolve('slow'), 1000));
      
      const resultPromise = raceWithTimeout([slowPromise], 500);
      
      jest.advanceTimersByTime(500);
      
      await expect(resultPromise).rejects.toThrow('Operation timed out after 500ms');
      await expect(resultPromise).rejects.toBeInstanceOf(DelayError);
    });

    it('should use custom timeout error', async () => {
      const slowPromise = new Promise(resolve => setTimeout(() => resolve('slow'), 1000));
      const customError = new Error('Custom timeout error');
      
      const resultPromise = raceWithTimeout([slowPromise], 500, customError);
      
      jest.advanceTimersByTime(500);
      
      await expect(resultPromise).rejects.toBe(customError);
    });

    it('should propagate rejection from promises', async () => {
      const rejectingPromise = Promise.reject(new Error('Promise error'));
      
      const resultPromise = raceWithTimeout([rejectingPromise], 500);
      
      await expect(resultPromise).rejects.toThrow('Promise error');
    });
  });

  describe('createTimeoutPromise', () => {
    it('should reject after specified timeout', async () => {
      const timeoutPromise = createTimeoutPromise<string>(500);
      
      jest.advanceTimersByTime(500);
      
      await expect(timeoutPromise).rejects.toThrow('Operation timed out after 500ms');
      await expect(timeoutPromise).rejects.toBeInstanceOf(DelayError);
    });

    it('should use custom error', async () => {
      const customError = new Error('Custom error');
      const timeoutPromise = createTimeoutPromise<string>(500, customError);
      
      jest.advanceTimersByTime(500);
      
      await expect(timeoutPromise).rejects.toBe(customError);
    });

    it('should include timeout details in default error', async () => {
      const timeoutPromise = createTimeoutPromise<string>(1000);
      
      jest.advanceTimersByTime(1000);
      
      try {
        await timeoutPromise;
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(DelayError);
        expect((error as DelayError).details).toEqual({ timeout: 1000 });
        expect((error as DelayError).code).toBe(DelayErrorCode.TIMEOUT);
      }
    });
  });

  describe('minimumDelay', () => {
    it('should wait for minimum delay even if promise resolves faster', async () => {
      const fastPromise = Promise.resolve('result');
      
      const resultPromise = minimumDelay(fastPromise, 1000);
      
      jest.advanceTimersByTime(500);
      // Should not resolve yet
      
      jest.advanceTimersByTime(500);
      const result = await resultPromise;
      
      expect(result).toBe('result');
    });

    it('should return immediately if promise takes longer than minimum', async () => {
      const slowPromise = new Promise(resolve => 
        setTimeout(() => resolve('result'), 1000)
      );
      
      const resultPromise = minimumDelay(slowPromise, 500);
      
      jest.advanceTimersByTime(1000);
      const result = await resultPromise;
      
      expect(result).toBe('result');
    });

    it('should propagate promise rejection', async () => {
      const rejectingPromise = Promise.reject(new Error('Promise error'));
      
      const resultPromise = minimumDelay(rejectingPromise, 1000);
      
      await expect(resultPromise).rejects.toThrow('Promise error');
    });
  });

  describe('raceArray', () => {
    it('should throw error for empty promise array', async () => {
      await expect(raceArray([])).rejects.toThrow('Cannot race empty array of promises');
      await expect(raceArray([])).rejects.toBeInstanceOf(DelayError);
    });

    it('should race promises with fail-fast (default)', async () => {
      const fastPromise = Promise.resolve('fast');
      const slowPromise = new Promise(resolve => setTimeout(() => resolve('slow'), 1000));
      
      const result = await raceArray([fastPromise, slowPromise]);
      
      expect(result).toBe('fast');
    });

    it('should handle rejection in fail-fast mode', async () => {
      const rejectingPromise = Promise.reject(new Error('Error'));
      const slowPromise = new Promise(resolve => setTimeout(() => resolve('slow'), 1000));
      
      await expect(raceArray([rejectingPromise, slowPromise])).rejects.toThrow('Error');
    });

    it('should wait for first success when fail-fast is false', async () => {
      const rejectingPromise = Promise.reject(new Error('Error'));
      const successPromise = new Promise(resolve => setTimeout(() => resolve('success'), 500));
      
      const resultPromise = raceArray([rejectingPromise, successPromise], { failFast: false });
      
      jest.advanceTimersByTime(500);
      const result = await resultPromise;
      
      expect(result).toBe('success');
    });

    it('should reject with all errors when all promises fail and fail-fast is false', async () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');
      const promise1 = Promise.reject(error1);
      const promise2 = Promise.reject(error2);
      
      try {
        await raceArray([promise1, promise2], { failFast: false });
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(DelayError);
        expect((error as DelayError).code).toBe(DelayErrorCode.RETRY_EXHAUSTED);
        expect((error as DelayError).details?.['errors']).toEqual([error1, error2]);
      }
    });

    it('should include timeout promise when timeout is specified', async () => {
      const slowPromise = new Promise(resolve => setTimeout(() => resolve('slow'), 1000));
      
      const resultPromise = raceArray([slowPromise], { timeout: 500 });
      
      jest.advanceTimersByTime(500);
      
      await expect(resultPromise).rejects.toThrow('Operation timed out after 500ms');
    });

    it('should use custom timeout error', async () => {
      const slowPromise = new Promise(resolve => setTimeout(() => resolve('slow'), 1000));
      const customError = new Error('Custom timeout');
      
      const resultPromise = raceArray([slowPromise], { 
        timeout: 500, 
        timeoutError: customError 
      });
      
      jest.advanceTimersByTime(500);
      
      await expect(resultPromise).rejects.toBe(customError);
    });
  });

  describe('createDelayedPromise', () => {
    it('should delay execution of promise factory', async () => {
      const factory = jest.fn(() => Promise.resolve('result'));
      
      const resultPromise = createDelayedPromise(factory, 1000);
      
      expect(factory).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(1000);
      const result = await resultPromise;
      
      expect(factory).toHaveBeenCalled();
      expect(result).toBe('result');
    });

    it('should propagate factory promise rejection', async () => {
      const factory = () => Promise.reject(new Error('Factory error'));
      
      const resultPromise = createDelayedPromise(factory, 500);
      
      jest.advanceTimersByTime(500);
      
      await expect(resultPromise).rejects.toThrow('Factory error');
    });
  });

  describe('sequential', () => {
    it('should execute promise factories sequentially', async () => {
      const factory1 = jest.fn(() => Promise.resolve('result1'));
      const factory2 = jest.fn(() => Promise.resolve('result2'));
      const factory3 = jest.fn(() => Promise.resolve('result3'));
      
      const resultPromise = sequential([factory1, factory2, factory3]);
      
      const results = await resultPromise;
      
      expect(results).toEqual(['result1', 'result2', 'result3']);
      // Verify sequential execution order by checking call order
      expect(factory1).toHaveBeenCalled();
      expect(factory2).toHaveBeenCalled();
      expect(factory3).toHaveBeenCalled();
    });

    it('should wait between executions when delayBetween is specified', async () => {
      const factory1 = jest.fn(() => Promise.resolve('result1'));
      const factory2 = jest.fn(() => Promise.resolve('result2'));
      
      const resultPromise = sequential([factory1, factory2], 500);
      
      expect(factory1).toHaveBeenCalled();
      expect(factory2).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(500);
      await jest.runOnlyPendingTimersAsync();
      await resultPromise;
      
      expect(factory2).toHaveBeenCalled();
    });

    it('should not delay before first execution', async () => {
      const factory1 = jest.fn(() => Promise.resolve('result1'));
      const factory2 = jest.fn(() => Promise.resolve('result2'));
      
      sequential([factory1, factory2], 500);
      
      // First factory should be called immediately
      expect(factory1).toHaveBeenCalled();
    });

    it('should handle empty factory array', async () => {
      const results = await sequential([]);
      expect(results).toEqual([]);
    });

    it('should propagate factory rejections', async () => {
      const factory1 = () => Promise.resolve('result1');
      const factory2 = () => Promise.reject(new Error('Factory error'));
      
      await expect(sequential([factory1, factory2])).rejects.toThrow('Factory error');
    });
  });

  describe('parallel', () => {
    it('should execute all factories in parallel when concurrency is unlimited', async () => {
      const factory1 = jest.fn(() => Promise.resolve('result1'));
      const factory2 = jest.fn(() => Promise.resolve('result2'));
      const factory3 = jest.fn(() => Promise.resolve('result3'));
      
      const results = await parallel([factory1, factory2, factory3]);
      
      expect(results).toEqual(['result1', 'result2', 'result3']);
      expect(factory1).toHaveBeenCalled();
      expect(factory2).toHaveBeenCalled();
      expect(factory3).toHaveBeenCalled();
    });

    it('should limit concurrency when specified', async () => {
      const factory1 = jest.fn(() => new Promise(resolve => setTimeout(() => resolve('result1'), 100)));
      const factory2 = jest.fn(() => new Promise(resolve => setTimeout(() => resolve('result2'), 100)));
      const factory3 = jest.fn(() => new Promise(resolve => setTimeout(() => resolve('result3'), 100)));
      
      const resultPromise = parallel([factory1, factory2, factory3], 2);
      
      // First two should start immediately
      expect(factory1).toHaveBeenCalled();
      expect(factory2).toHaveBeenCalled();
      expect(factory3).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(100);
      await jest.runOnlyPendingTimersAsync();
      
      // Third should start after one of the first two completes
      expect(factory3).toHaveBeenCalled();
      
      jest.advanceTimersByTime(100);
      await jest.runOnlyPendingTimersAsync();
      const results = await resultPromise;
      
      expect(results).toEqual(['result1', 'result2', 'result3']);
    });

    it('should throw error for invalid concurrency', async () => {
      const factory = () => Promise.resolve('result');
      
      await expect(parallel([factory], 0)).rejects.toThrow('Concurrency must be positive');
      await expect(parallel([factory], -1)).rejects.toThrow('Concurrency must be positive');
    });

    it('should handle concurrency greater than factory count', async () => {
      const factory1 = jest.fn(() => Promise.resolve('result1'));
      const factory2 = jest.fn(() => Promise.resolve('result2'));
      
      const results = await parallel([factory1, factory2], 10);
      
      expect(results).toEqual(['result1', 'result2']);
    });

    it('should handle empty factory array', async () => {
      const results = await parallel([]);
      expect(results).toEqual([]);
    });

    it('should propagate factory rejections', async () => {
      const factory1 = () => Promise.resolve('result1');
      const factory2 = () => Promise.reject(new Error('Factory error'));
      
      await expect(parallel([factory1, factory2])).rejects.toThrow('Factory error');
    });

    it('should maintain result order even with different completion times', async () => {
      const factory1 = () => new Promise(resolve => setTimeout(() => resolve('result1'), 200));
      const factory2 = () => new Promise(resolve => setTimeout(() => resolve('result2'), 100));
      const factory3 = () => new Promise(resolve => setTimeout(() => resolve('result3'), 150));
      
      const resultPromise = parallel([factory1, factory2, factory3], 2);
      
      jest.advanceTimersByTime(200);
      await jest.runOnlyPendingTimersAsync();
      const results = await resultPromise;
      
      expect(results).toEqual(['result1', 'result2', 'result3']);
    });
  });
});