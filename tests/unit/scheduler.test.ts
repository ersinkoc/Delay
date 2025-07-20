// Mock declarations must come before imports
jest.mock('../../src/core/delay', () => ({
  createBasicDelay: jest.fn()
}));

jest.mock('../../src/utils/time', () => ({
  getHighResolutionTime: jest.fn()
}));

import {
  createBatchScheduler,
  preciseDelay,
  DelayScheduler,
  createDriftCompensatedTimer
} from '../../src/core/scheduler';

// Get the mocked functions
const { createBasicDelay } = require('../../src/core/delay');
const { getHighResolutionTime } = require('../../src/utils/time');

describe('Scheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    createBasicDelay.mockResolvedValue(undefined);
    getHighResolutionTime.mockReturnValue(0);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  describe('createBatchScheduler', () => {
    it('should create a batch scheduler with default options', () => {
      const scheduler = createBatchScheduler();
      expect(scheduler).toHaveProperty('add');
      expect(scheduler).toHaveProperty('flush');
      expect(scheduler).toHaveProperty('clear');
    });

    it('should batch multiple delays with same duration', async () => {
      const scheduler = createBatchScheduler();
      createBasicDelay.mockResolvedValue(undefined);

      const promises = [
        scheduler.add(100),
        scheduler.add(100),
        scheduler.add(100)
      ];

      await jest.runAllTimersAsync();

      expect(createBasicDelay).toHaveBeenCalledTimes(1);
      expect(createBasicDelay).toHaveBeenCalledWith(100);

      await Promise.all(promises);
    });

    it('should respect maxBatchSize', async () => {
      const scheduler = createBatchScheduler({ maxBatchSize: 2 });
      
      const promises = [
        scheduler.add(100),
        scheduler.add(100),
        scheduler.add(100)
      ];

      await jest.runAllTimersAsync();

      expect(createBasicDelay).toHaveBeenCalledTimes(2);
      
      await Promise.all(promises);
    });

    it('should group delays within batch window', async () => {
      const scheduler = createBatchScheduler({ batchWindow: 50 });
      
      scheduler.add(100);
      
      jest.advanceTimersByTime(25);
      scheduler.add(100);
      
      jest.advanceTimersByTime(100);
      scheduler.add(100);

      await jest.runAllTimersAsync();

      expect(createBasicDelay).toHaveBeenCalledTimes(2);
    });

    it('should handle different delay durations separately', async () => {
      const scheduler = createBatchScheduler();
      
      const promises = [
        scheduler.add(100),
        scheduler.add(200),
        scheduler.add(100)
      ];

      await jest.runAllTimersAsync();

      expect(createBasicDelay).toHaveBeenCalledTimes(2);
      expect(createBasicDelay).toHaveBeenCalledWith(100);
      expect(createBasicDelay).toHaveBeenCalledWith(200);
      
      await Promise.all(promises);
    });

    it('should flush pending batches', async () => {
      const scheduler = createBatchScheduler();
      
      const promise1 = scheduler.add(100);
      const promise2 = scheduler.add(200);
      
      scheduler.flush();
      
      await jest.runAllTimersAsync();
      await Promise.all([promise1, promise2]);
      
      expect(createBasicDelay).toHaveBeenCalledTimes(2);
    });

    it('should clear pending batches', async () => {
      const scheduler = createBatchScheduler();
      
      const promise1 = scheduler.add(100);
      const promise2 = scheduler.add(200);
      
      scheduler.clear();
      
      await expect(promise1).rejects.toThrow('Batch scheduler cleared');
      await expect(promise2).rejects.toThrow('Batch scheduler cleared');
      
      expect(createBasicDelay).not.toHaveBeenCalled();
    });

    it('should handle errors in batch processing', async () => {
      const scheduler = createBatchScheduler();
      const error = new Error('Batch error');
      createBasicDelay.mockRejectedValueOnce(error);
      
      const promise = scheduler.add(100);
      
      // Process the batch
      jest.runAllTimers();
      
      await expect(promise).rejects.toThrow('Batch error');
    });
  });

  describe('preciseDelay', () => {
    beforeEach(() => {
      let callCount = 0;
      getHighResolutionTime.mockImplementation(() => {
        callCount++;
        // Return values that will exit the busy wait loop quickly
        if (callCount === 1) return 0;  // Start time
        if (callCount === 2) return 5;  // First check
        if (callCount === 3) return 10; // Second check
        if (callCount === 4) return 95; // Near end
        return 100; // Exit condition for busy wait
      });
    });

    it('should use high resolution timing for precise delays', async () => {
      const promise = preciseDelay(100);
      
      // Simulate the drift correction loop
      await jest.runAllTimersAsync();
      
      await promise;
      
      expect(getHighResolutionTime).toHaveBeenCalled();
      expect(createBasicDelay).toHaveBeenCalled();
    });

    it('should handle sub-millisecond precision', async () => {
      getHighResolutionTime.mockReset();
      let callCount = 0;
      getHighResolutionTime.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return 0;
        return 1; // Exit immediately
      });
      
      const promise = preciseDelay(1);
      
      await jest.runAllTimersAsync();
      await promise;
      
      expect(getHighResolutionTime).toHaveBeenCalled();
    });

    it('should handle longer delays', async () => {
      getHighResolutionTime.mockReset();
      let callCount = 0;
      getHighResolutionTime.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return 0;
        if (callCount === 2) return 50;
        return 200; // Exit condition
      });
      
      const promise = preciseDelay(200);
      await jest.runAllTimersAsync();
      await promise;
      
      expect(createBasicDelay).toHaveBeenCalled();
    });
  });

  describe('DelayScheduler', () => {
    it('should schedule delays', async () => {
      const scheduler = new DelayScheduler();
      
      const promise = scheduler.schedule(100);
      
      await jest.runAllTimersAsync();
      await promise;
      
      expect(createBasicDelay).toHaveBeenCalledWith(100);
    });

    it('should handle multiple scheduled delays', async () => {
      const scheduler = new DelayScheduler();
      
      const promise1 = scheduler.schedule(100);
      const promise2 = scheduler.schedule(200);
      
      await jest.runAllTimersAsync();
      await Promise.all([promise1, promise2]);
      
      expect(createBasicDelay).toHaveBeenCalledWith(100);
      expect(createBasicDelay).toHaveBeenCalledWith(200);
    });

    it('should flush pending delays', async () => {
      const scheduler = new DelayScheduler();
      
      scheduler.schedule(100);
      scheduler.schedule(200);
      
      scheduler.flush();
      
      await jest.runAllTimersAsync();
      
      expect(createBasicDelay).toHaveBeenCalled();
    });

    it('should clear all scheduled delays', async () => {
      const scheduler = new DelayScheduler();
      
      const promise1 = scheduler.schedule(100);
      const promise2 = scheduler.schedule(200);
      
      scheduler.clear();
      
      await expect(promise1).rejects.toThrow('Batch scheduler cleared');
      await expect(promise2).rejects.toThrow('Batch scheduler cleared');
    });
  });

  describe('createDriftCompensatedTimer', () => {
    it('should compensate for timer drift', () => {
      const callback = jest.fn();
      const stop = createDriftCompensatedTimer(callback, 1000);
      
      // Simulate drift
      jest.advanceTimersByTime(1005);
      
      expect(callback).toHaveBeenCalledTimes(1);
      
      stop();
    });

    it('should handle stop', () => {
      const callback = jest.fn();
      const stop = createDriftCompensatedTimer(callback, 100);
      
      jest.advanceTimersByTime(50);
      stop();
      
      jest.advanceTimersByTime(100);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should execute callback multiple times', () => {
      getHighResolutionTime.mockImplementation(() => Date.now());
      
      const callback = jest.fn();
      const stop = createDriftCompensatedTimer(callback, 100);
      
      // First tick
      jest.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(1);
      
      // Second tick
      jest.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(2);
      
      // Third tick
      jest.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(3);
      
      stop();
    });
  });
});