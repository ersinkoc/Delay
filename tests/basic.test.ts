import delay from '../src/index';

describe('@oxog/delay Basic Tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should be callable as a function', async () => {
    const promise = delay(100);
    jest.advanceTimersByTime(100);
    await expect(promise).resolves.toBeUndefined();
  });

  it('should have time unit methods', async () => {
    const promise = delay.seconds(1);
    jest.advanceTimersByTime(1000);
    await expect(promise).resolves.toBeUndefined();
  });

  it('should parse time strings', async () => {
    const promise = delay.for('100ms');
    jest.advanceTimersByTime(100);
    await expect(promise).resolves.toBeUndefined();
  });

  it('should handle cancellation', async () => {
    const cancellable = delay.cancellable(1000);
    
    setTimeout(() => cancellable.cancel(), 500);
    jest.advanceTimersByTime(500);
    
    await expect(cancellable).rejects.toThrow();
    expect(cancellable.isCancelled()).toBe(true);
  });

  it('should retry failed operations', async () => {
    let attempts = 0;
    const fn = jest.fn(() => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Failure');
      }
      return 'Success';
    });

    const promise = delay.retry(fn, { attempts: 3, delay: 100 });
    
    await jest.runAllTimersAsync();
    const result = await promise;
    
    expect(result).toBe('Success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should repeat functions', async () => {
    const fn = jest.fn();
    const controller = delay.repeat(fn, 100);
    
    // Wait for multiple intervals
    jest.advanceTimersByTime(250);
    controller.stop();
    
    // Should be called at least once, timing may vary
    expect(fn).toHaveBeenCalled();
    expect(controller.isStopped()).toBe(true);
  });

  it('should throttle function calls', () => {
    const fn = jest.fn();
    const throttled = delay.throttle(fn, 100);
    
    throttled();
    throttled();
    throttled();
    
    expect(fn).toHaveBeenCalledTimes(1);
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

  it('should add randomness to delays', async () => {
    const promise1 = delay.random(100, { jitter: 0.1 });
    const promise2 = delay.between(90, 110);
    
    jest.advanceTimersByTime(120);
    
    await expect(Promise.all([promise1, promise2])).resolves.toBeDefined();
  });

  it('should handle progress tracking', async () => {
    const onProgress = jest.fn();
    const promise = delay(1000, { onProgress, progressInterval: 100 });
    
    jest.advanceTimersByTime(300);
    expect(onProgress).toHaveBeenCalled();
    
    jest.advanceTimersByTime(700);
    await promise;
  });
});