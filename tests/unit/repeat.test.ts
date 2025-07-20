import { 
  createRepeatDelay, 
  createIntervalDelay,
  RepeatManager 
} from '../../src/core/repeat';
import { DelayError } from '../../src/types/index';

describe('Repeat Functionality', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('createRepeatDelay', () => {
    it('should execute function immediately and then at intervals', async () => {
      const fn = jest.fn().mockResolvedValue('result');
      
      const controller = createRepeatDelay(fn, 1000);
      
      // Let any async operations complete
      await jest.runOnlyPendingTimersAsync();
      const initialCalls = fn.mock.calls.length;
      
      // Advance time and run all pending timers
      jest.advanceTimersByTime(1000);
      await jest.runOnlyPendingTimersAsync();
      const callsAfterFirst = fn.mock.calls.length;
      expect(callsAfterFirst).toBeGreaterThan(initialCalls);
      
      jest.advanceTimersByTime(1000);
      await jest.runOnlyPendingTimersAsync();
      const callsAfterSecond = fn.mock.calls.length;
      expect(callsAfterSecond).toBeGreaterThan(callsAfterFirst);
      
      controller.stop();
    });

    it('should handle async functions', async () => {
      const fn = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'async result';
      });
      
      const controller = createRepeatDelay(fn, 1000);
      
      expect(fn).toHaveBeenCalledTimes(1);
      
      jest.advanceTimersByTime(1000);
      await jest.runOnlyPendingTimersAsync();
      expect(fn).toHaveBeenCalledTimes(2);
      
      controller.stop();
    });

    it('should continue execution even if function throws', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const fn = jest.fn(() => {
        throw new Error('Function error');
      });
      
      const controller = createRepeatDelay(fn, 1000);
      
      expect(fn).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('Error in repeat function:', expect.any(Error));
      
      // Should continue despite error
      jest.advanceTimersByTime(1000);
      expect(fn).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      
      controller.stop();
      consoleSpy.mockRestore();
    });

    it('should stop execution when stop is called', () => {
      const fn = jest.fn();
      
      const controller = createRepeatDelay(fn, 1000);
      expect(fn).toHaveBeenCalledTimes(1);
      
      controller.stop();
      
      jest.advanceTimersByTime(2000);
      expect(fn).toHaveBeenCalledTimes(1); // No additional calls
    });

    it('should pause and resume execution', async () => {
      const fn = jest.fn();
      
      const controller = createRepeatDelay(fn, 1000);
      await jest.runOnlyPendingTimersAsync();
      const initialCalls = fn.mock.calls.length;
      
      controller.pause();
      expect(controller.isPaused()).toBe(true);
      
      jest.advanceTimersByTime(1000);
      await jest.runOnlyPendingTimersAsync();
      expect(fn).toHaveBeenCalledTimes(initialCalls); // Paused, no new calls
      
      controller.resume();
      expect(controller.isPaused()).toBe(false);
      
      jest.advanceTimersByTime(1000);
      await jest.runOnlyPendingTimersAsync();
      expect(fn.mock.calls.length).toBeGreaterThan(initialCalls); // Resumed, new call
      
      controller.stop();
    });

    it('should report correct status', () => {
      const fn = jest.fn();
      
      const controller = createRepeatDelay(fn, 1000);
      
      expect(controller.isPaused()).toBe(false);
      expect(controller.isStopped()).toBe(false);
      
      controller.pause();
      expect(controller.isPaused()).toBe(true);
      expect(controller.isStopped()).toBe(false);
      
      controller.resume();
      expect(controller.isPaused()).toBe(false);
      expect(controller.isStopped()).toBe(false);
      
      controller.stop();
      expect(controller.isPaused()).toBe(false);
      expect(controller.isStopped()).toBe(true);
    });

    it('should validate function parameter', () => {
      expect(() => createRepeatDelay('not a function' as any, 1000)).toThrow(DelayError);
      expect(() => createRepeatDelay(null as any, 1000)).toThrow(DelayError);
      expect(() => createRepeatDelay(undefined as any, 1000)).toThrow(DelayError);
    });

    it('should validate interval parameter', () => {
      const fn = jest.fn();
      
      expect(() => createRepeatDelay(fn, -1000)).toThrow(DelayError);
      expect(() => createRepeatDelay(fn, 'invalid' as any)).toThrow(DelayError);
      expect(() => createRepeatDelay(fn, NaN)).toThrow(DelayError);
    });

    it('should handle zero interval', async () => {
      const fn = jest.fn();
      
      const controller = createRepeatDelay(fn, 0);
      expect(fn).toHaveBeenCalledTimes(1);
      
      jest.advanceTimersByTime(0);
      await jest.runOnlyPendingTimersAsync();
      expect(fn).toHaveBeenCalledTimes(2);
      
      controller.stop();
    });

    it('should not execute after stop even if timer fires', () => {
      const fn = jest.fn();
      
      const controller = createRepeatDelay(fn, 1000);
      expect(fn).toHaveBeenCalledTimes(1);
      
      // Stop immediately
      controller.stop();
      
      // Even if timer somehow fires, function shouldn't be called
      jest.advanceTimersByTime(1000);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('createIntervalDelay', () => {
    it('should execute function at regular intervals', () => {
      const fn = jest.fn();
      
      const controller = createIntervalDelay(fn, 1000);
      
      // No immediate execution for interval-based
      expect(fn).toHaveBeenCalledTimes(0);
      
      jest.advanceTimersByTime(1000);
      expect(fn).toHaveBeenCalledTimes(1);
      
      jest.advanceTimersByTime(1000);
      expect(fn).toHaveBeenCalledTimes(2);
      
      controller.stop();
    });

    it('should handle async functions', async () => {
      const fn = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'async result';
      });
      
      const controller = createIntervalDelay(fn, 1000);
      
      jest.advanceTimersByTime(1000);
      expect(fn).toHaveBeenCalledTimes(1);
      
      controller.stop();
    });

    it('should continue execution even if function throws', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const fn = jest.fn(() => {
        throw new Error('Function error');
      });
      
      const controller = createIntervalDelay(fn, 1000);
      
      jest.advanceTimersByTime(1000);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('Error in interval function:', expect.any(Error));
      
      jest.advanceTimersByTime(1000);
      expect(fn).toHaveBeenCalledTimes(2);
      
      controller.stop();
      consoleSpy.mockRestore();
    });

    it('should respect pause/resume state', () => {
      const fn = jest.fn();
      
      const controller = createIntervalDelay(fn, 1000);
      
      controller.pause();
      
      jest.advanceTimersByTime(1000);
      expect(fn).toHaveBeenCalledTimes(0); // Paused, no execution
      
      controller.resume();
      
      jest.advanceTimersByTime(1000);
      expect(fn).toHaveBeenCalledTimes(1); // Resumed, executes
      
      controller.stop();
    });

    it('should stop execution when stop is called', () => {
      const fn = jest.fn();
      
      const controller = createIntervalDelay(fn, 1000);
      
      jest.advanceTimersByTime(1000);
      expect(fn).toHaveBeenCalledTimes(1);
      
      controller.stop();
      
      jest.advanceTimersByTime(2000);
      expect(fn).toHaveBeenCalledTimes(1); // No additional calls
    });

    it('should validate function parameter', () => {
      expect(() => createIntervalDelay('not a function' as any, 1000)).toThrow(DelayError);
    });

    it('should validate interval parameter', () => {
      const fn = jest.fn();
      
      expect(() => createIntervalDelay(fn, -1000)).toThrow(DelayError);
    });
  });

  describe('RepeatManager', () => {
    it('should manage multiple repeat controllers', () => {
      const manager = new RepeatManager();
      const fn1 = jest.fn();
      const fn2 = jest.fn();
      
      const controller1 = createRepeatDelay(fn1, 1000);
      const controller2 = createRepeatDelay(fn2, 2000);
      
      manager.add(controller1);
      manager.add(controller2);
      
      expect(manager.getActiveCount()).toBe(2);
      
      manager.stopAll();
      
      expect(controller1.isStopped()).toBe(true);
      expect(controller2.isStopped()).toBe(true);
      expect(manager.getActiveCount()).toBe(0);
    });

    it('should pause and resume all controllers', async () => {
      const manager = new RepeatManager();
      const fn1 = jest.fn();
      const fn2 = jest.fn();
      
      const controller1 = createRepeatDelay(fn1, 1000);
      const controller2 = createRepeatDelay(fn2, 1000);
      
      // Wait for initial calls to complete
      await jest.runOnlyPendingTimersAsync();
      const initialCalls1 = fn1.mock.calls.length;
      const initialCalls2 = fn2.mock.calls.length;
      
      manager.add(controller1);
      manager.add(controller2);
      
      manager.pauseAll();
      
      expect(controller1.isPaused()).toBe(true);
      expect(controller2.isPaused()).toBe(true);
      
      jest.advanceTimersByTime(1000);
      await jest.runOnlyPendingTimersAsync();
      
      // Functions should not be called when paused
      expect(fn1).toHaveBeenCalledTimes(initialCalls1); // Only initial calls
      expect(fn2).toHaveBeenCalledTimes(initialCalls2); // Only initial calls
      
      manager.resumeAll();
      
      expect(controller1.isPaused()).toBe(false);
      expect(controller2.isPaused()).toBe(false);
      
      jest.advanceTimersByTime(1000);
      await jest.runOnlyPendingTimersAsync();
      
      expect(fn1.mock.calls.length).toBeGreaterThan(initialCalls1);
      expect(fn2.mock.calls.length).toBeGreaterThan(initialCalls2);
      
      manager.stopAll();
    });

    it('should cleanup stopped controllers', () => {
      const manager = new RepeatManager();
      const fn1 = jest.fn();
      const fn2 = jest.fn();
      
      const controller1 = createRepeatDelay(fn1, 1000);
      const controller2 = createRepeatDelay(fn2, 1000);
      
      manager.add(controller1);
      manager.add(controller2);
      
      expect(manager.getActiveCount()).toBe(2);
      
      controller1.stop();
      
      expect(manager.getActiveCount()).toBe(1); // Still counts stopped ones
      
      manager.cleanup();
      
      expect(manager.getActiveCount()).toBe(1); // Only active ones remain
      
      manager.stopAll();
    });

    it('should handle empty manager operations', () => {
      const manager = new RepeatManager();
      
      expect(manager.getActiveCount()).toBe(0);
      
      // Should not throw
      manager.pauseAll();
      manager.resumeAll();
      manager.stopAll();
      manager.cleanup();
      
      expect(manager.getActiveCount()).toBe(0);
    });

    it('should track active count correctly', () => {
      const manager = new RepeatManager();
      
      expect(manager.getActiveCount()).toBe(0);
      
      const controller1 = createRepeatDelay(jest.fn(), 1000);
      manager.add(controller1);
      
      expect(manager.getActiveCount()).toBe(1);
      
      const controller2 = createRepeatDelay(jest.fn(), 1000);
      manager.add(controller2);
      
      expect(manager.getActiveCount()).toBe(2);
      
      controller1.stop();
      
      expect(manager.getActiveCount()).toBe(1); // One stopped, one active
      
      manager.cleanup();
      
      expect(manager.getActiveCount()).toBe(1); // Only active one remains
      
      manager.stopAll();
    });
  });
});