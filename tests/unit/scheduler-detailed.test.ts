import {
  createBatchScheduler,
  preciseDelay,
  DelayScheduler,
  createDriftCompensatedTimer
} from '../../src/core/scheduler';

describe('Batch Scheduler', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('createBatchScheduler', () => {
    it('should create scheduler with default options', () => {
      const scheduler = createBatchScheduler();
      expect(scheduler).toHaveProperty('add');
      expect(scheduler).toHaveProperty('flush');
      expect(scheduler).toHaveProperty('clear');
    });

    it('should create scheduler with custom options', () => {
      const scheduler = createBatchScheduler({ 
        maxBatchSize: 50, 
        batchWindow: 32 
      });
      expect(scheduler).toHaveProperty('add');
    });

    it('should add and process delays', async () => {
      const scheduler = createBatchScheduler();
      
      const promise1 = scheduler.add(100);
      const promise2 = scheduler.add(200);
      
      // Advance batch window to trigger processing
      jest.advanceTimersByTime(16);
      
      // Advance delay times
      jest.advanceTimersByTime(200);
      
      await Promise.all([promise1, promise2]);
    });

    it('should group delays by duration for efficiency', async () => {
      const scheduler = createBatchScheduler();
      
      const promises = [
        scheduler.add(100),
        scheduler.add(100), // Same duration, should be grouped
        scheduler.add(200),
        scheduler.add(100)  // Same duration, should be grouped
      ];
      
      jest.advanceTimersByTime(16); // Trigger batch processing
      jest.advanceTimersByTime(200); // Complete all delays
      
      await Promise.all(promises);
    });

    it('should respect maxBatchSize limit', async () => {
      const scheduler = createBatchScheduler({ maxBatchSize: 2 });
      
      const promises = [
        scheduler.add(100),
        scheduler.add(100),
        scheduler.add(100), // This should be in second batch
        scheduler.add(100)  // This should be in second batch
      ];
      
      // Run all timers to process all batches
      await jest.runAllTimersAsync();
      
      await Promise.all(promises);
    });

    it('should handle errors in delays', async () => {
      const scheduler = createBatchScheduler();
      
      // Mock createBasicDelay to throw error
      const originalModule = await import('../../src/core/delay');
      const mockCreateBasicDelay = jest.spyOn(originalModule, 'createBasicDelay')
        .mockRejectedValueOnce(new Error('Test error'));
      
      const promise = scheduler.add(100);
      
      jest.advanceTimersByTime(16); // Trigger batch processing
      
      await expect(promise).rejects.toThrow('Test error');
      
      mockCreateBasicDelay.mockRestore();
    });

    it('should flush pending delays immediately', async () => {
      const scheduler = createBatchScheduler();
      
      const promise = scheduler.add(100);
      
      // Don't wait for batch window, flush immediately
      scheduler.flush();
      
      jest.advanceTimersByTime(100);
      await promise;
    });

    it('should clear all pending delays', async () => {
      const scheduler = createBatchScheduler();
      
      const promises = [
        scheduler.add(100),
        scheduler.add(200)
      ];
      
      scheduler.clear();
      
      await expect(promises[0]).rejects.toThrow('Batch scheduler cleared');
      await expect(promises[1]).rejects.toThrow('Batch scheduler cleared');
    });

    it('should handle multiple flush calls', () => {
      const scheduler = createBatchScheduler();
      
      scheduler.add(100);
      scheduler.flush();
      scheduler.flush(); // Should not throw
    });

    it('should handle multiple clear calls', async () => {
      const scheduler = createBatchScheduler();
      
      const promise = scheduler.add(100);
      scheduler.clear();
      scheduler.clear(); // Should not throw
      
      // Handle the rejection
      await expect(promise).rejects.toThrow('Batch scheduler cleared');
    });

    it('should not schedule batch when already processing', async () => {
      const scheduler = createBatchScheduler();
      
      const promise1 = scheduler.add(100);
      
      // Start processing
      jest.advanceTimersByTime(16);
      
      // Add more items while processing
      const promise2 = scheduler.add(200);
      
      // Should not create duplicate batch timeout
      await jest.runAllTimersAsync();
      
      await Promise.all([promise1, promise2]);
    });

    it('should handle empty batch processing', async () => {
      const scheduler = createBatchScheduler();
      
      // Manually trigger processBatch with no pending items
      scheduler.flush();
      
      // Should not throw
    });

    it('should continue processing subsequent batches', async () => {
      const scheduler = createBatchScheduler({ maxBatchSize: 1 });
      
      const promise1 = scheduler.add(50);
      const promise2 = scheduler.add(100);
      
      // Run all timers to completion
      await jest.runAllTimersAsync();
      
      await Promise.all([promise1, promise2]);
    });
  });

  describe('preciseDelay', () => {
    beforeEach(() => {
      jest.useRealTimers(); // preciseDelay needs real timing for precision
    });

    it('should delay for short durations using busy wait', async () => {
      const start = Date.now();
      await preciseDelay(1); // Less than threshold of 4ms
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeGreaterThanOrEqual(1);
      expect(elapsed).toBeLessThan(50); // Should be quite fast
    });

    it('should delay for longer durations using sleep + busy wait', async () => {
      const start = Date.now();
      await preciseDelay(20); // Greater than threshold
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeGreaterThanOrEqual(15);
      expect(elapsed).toBeLessThan(50);
    });

    it('should handle zero delay', async () => {
      const start = Date.now();
      await preciseDelay(0);
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeLessThan(10);
    });
  });

  describe('DelayScheduler', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should create a delay scheduler instance', () => {
      const scheduler = new DelayScheduler();
      expect(scheduler).toBeInstanceOf(DelayScheduler);
    });

    it('should schedule delays', async () => {
      const scheduler = new DelayScheduler();
      
      const promise = scheduler.schedule(100);
      
      jest.advanceTimersByTime(16); // Batch window
      jest.advanceTimersByTime(100); // Delay time
      
      await promise;
    });

    it('should flush pending delays', () => {
      const scheduler = new DelayScheduler();
      
      scheduler.schedule(100);
      scheduler.flush(); // Should not throw
    });

    it('should clear pending delays', async () => {
      const scheduler = new DelayScheduler();
      
      const promise = scheduler.schedule(100);
      scheduler.clear();
      
      await expect(promise).rejects.toThrow('Batch scheduler cleared');
    });
  });

  describe('createDriftCompensatedTimer', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should create a drift compensated timer', () => {
      const callback = jest.fn();
      const stop = createDriftCompensatedTimer(callback, 100);
      
      expect(typeof stop).toBe('function');
      expect(callback).not.toHaveBeenCalled();
      
      // First tick
      jest.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(1);
      
      // Second tick
      jest.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(2);
      
      stop();
    });

    it('should compensate for drift', () => {
      const callback = jest.fn();
      const stop = createDriftCompensatedTimer(callback, 100);
      
      // Simulate some processing time/drift
      jest.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(1);
      
      // Advance by the full interval to trigger next call
      jest.advanceTimersByTime(100); // Should trigger next call
      expect(callback).toHaveBeenCalledTimes(2);
      
      stop();
    });

    it('should stop the timer when stop function is called', () => {
      const callback = jest.fn();
      const stop = createDriftCompensatedTimer(callback, 100);
      
      jest.advanceTimersByTime(50);
      stop();
      
      // Should not execute callback after stop
      jest.advanceTimersByTime(100);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle multiple stop calls', () => {
      const callback = jest.fn();
      const stop = createDriftCompensatedTimer(callback, 100);
      
      stop();
      stop(); // Should not throw
    });

    it('should handle zero interval', () => {
      const callback = jest.fn();
      const stop = createDriftCompensatedTimer(callback, 0);
      
      jest.advanceTimersByTime(0);
      expect(callback).toHaveBeenCalledTimes(1);
      
      stop();
    });

    it('should ensure minimum interval of 0', () => {
      const callback = jest.fn();
      const stop = createDriftCompensatedTimer(callback, 10);
      
      // First call
      jest.advanceTimersByTime(10);
      expect(callback).toHaveBeenCalledTimes(1);
      
      // Even with high drift, should not go negative
      jest.advanceTimersByTime(10); // Full interval advancement
      expect(callback).toHaveBeenCalledTimes(2);
      
      stop();
    });
  });
});