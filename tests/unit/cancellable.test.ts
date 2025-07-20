import { createCancellableDelay, CancellationToken } from '../../src/core/cancellable';
import { DelayError } from '../../src/types/index.js';

describe('Cancellable Delays', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('createCancellableDelay', () => {
    it('should resolve normally when not cancelled', async () => {
      const delay = createCancellableDelay(1000);
      
      jest.advanceTimersByTime(1000);
      await expect(delay).resolves.toBeUndefined();
      expect(delay.isCancelled()).toBe(false);
    });

    it('should cancel and reject when cancel() is called', async () => {
      const delay = createCancellableDelay(1000);
      
      jest.advanceTimersByTime(500);
      delay.cancel();
      
      await expect(delay).rejects.toThrow(DelayError);
      expect(delay.isCancelled()).toBe(true);
    });

    it('should handle multiple cancel calls gracefully', async () => {
      const delay = createCancellableDelay(1000);
      
      delay.cancel();
      delay.cancel();
      delay.cancel();
      
      await expect(delay).rejects.toThrow(DelayError);
      expect(delay.isCancelled()).toBe(true);
    });

    it('should be cancellable even after resolution', async () => {
      const delay = createCancellableDelay(100);
      
      jest.advanceTimersByTime(100);
      await delay;
      
      expect(delay.isCancelled()).toBe(false);
      delay.cancel();
      expect(delay.isCancelled()).toBe(true);
    });

    it('should respect external AbortSignal', async () => {
      const controller = new AbortController();
      const delay = createCancellableDelay(1000, { signal: controller.signal });
      
      // Abort the signal
      controller.abort();
      
      await expect(delay).rejects.toThrow();
      expect(delay.isCancelled()).toBe(true);
    });

    it('should be cancelled if external signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();
      
      const delay = createCancellableDelay(1000, { signal: controller.signal });
      
      expect(delay.isCancelled()).toBe(true);
      await expect(delay).rejects.toThrow();
    });

    it('should work with progress callbacks', async () => {
      const onProgress = jest.fn();
      const delay = createCancellableDelay(1000, { 
        onProgress, 
        progressInterval: 100 
      });
      
      jest.advanceTimersByTime(300);
      expect(onProgress).toHaveBeenCalled();
      
      delay.cancel();
      await expect(delay).rejects.toThrow(DelayError);
    });
  });

  describe('CancellationToken', () => {
    it('should start as not cancelled', () => {
      const token = new CancellationToken();
      expect(token.isCancelled).toBe(false);
    });

    it('should become cancelled when cancel() is called', () => {
      const token = new CancellationToken();
      token.cancel();
      expect(token.isCancelled).toBe(true);
    });

    it('should call onCancel callbacks immediately if already cancelled', () => {
      const token = new CancellationToken();
      const callback = jest.fn();
      
      token.cancel();
      token.onCancel(callback);
      
      expect(callback).toHaveBeenCalled();
    });

    it('should call onCancel callbacks when cancelled', () => {
      const token = new CancellationToken();
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      token.onCancel(callback1);
      token.onCancel(callback2);
      
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
      
      token.cancel();
      
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should handle callback errors gracefully', () => {
      const token = new CancellationToken();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      token.onCancel(() => { throw new Error('Callback error'); });
      token.onCancel(() => { /* This should still be called */ });
      
      expect(() => token.cancel()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should throw when throwIfCancelled() is called on cancelled token', () => {
      const token = new CancellationToken();
      
      expect(() => token.throwIfCancelled()).not.toThrow();
      
      token.cancel();
      
      expect(() => token.throwIfCancelled()).toThrow(DelayError);
      expect(() => token.throwIfCancelled()).toThrow('cancelled');
    });

    it('should not call callbacks multiple times', () => {
      const token = new CancellationToken();
      const callback = jest.fn();
      
      token.onCancel(callback);
      token.cancel();
      token.cancel();
      
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero delay cancellation', async () => {
      const delay = createCancellableDelay(0);
      delay.cancel();
      
      // Advance timer to trigger the setTimeout(0)
      jest.advanceTimersByTime(0);
      
      await expect(delay).rejects.toThrow(DelayError);
      expect(delay.isCancelled()).toBe(true);
    });

    it('should preserve the promise interface', () => {
      const delay = createCancellableDelay(1000);
      
      expect(typeof delay.then).toBe('function');
      expect(typeof delay.catch).toBe('function');
      expect(typeof delay.finally).toBe('function');
      expect(typeof delay.cancel).toBe('function');
      expect(typeof delay.isCancelled).toBe('function');
    });

    it('should work with Promise.all', async () => {
      const delay1 = createCancellableDelay(500);
      const delay2 = createCancellableDelay(1000);
      
      const combined = Promise.all([delay1, delay2]);
      
      jest.advanceTimersByTime(500);
      delay2.cancel();
      
      await expect(combined).rejects.toThrow(DelayError);
    });

    it('should work with Promise.race', async () => {
      const delay1 = createCancellableDelay(1000);
      const delay2 = createCancellableDelay(500);
      
      const combined = Promise.race([delay1, delay2]);
      
      jest.advanceTimersByTime(500);
      
      await expect(combined).resolves.toBeUndefined();
      expect(delay1.isCancelled()).toBe(false);
      expect(delay2.isCancelled()).toBe(false);
    });
  });
});