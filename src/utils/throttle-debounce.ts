import { ThrottleOptions, DebounceOptions } from '../types/index.js';

export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number,
  options: ThrottleOptions = {}
): T {
  const { leading = true, trailing = true } = options;

  let lastCallTime = 0;
  let lastInvokeTime = 0;
  let timerId: NodeJS.Timeout | number | undefined;
  let lastArgs: Parameters<T> | undefined;
  let lastThis: unknown;
  let result: ReturnType<T> | undefined = undefined;

  function invokeFunc(time: number): ReturnType<T> | undefined {
    if (!lastArgs) {
      return result;
    }

    const args = lastArgs;
    const thisArg = lastThis;

    lastArgs = undefined;
    lastThis = undefined;
    lastInvokeTime = time;
    result = fn.apply(thisArg, args) as ReturnType<T>;
    return result;
  }

  function leadingEdge(time: number): ReturnType<T> | undefined {
    lastInvokeTime = time;
    timerId = setTimeout(timerExpired, ms);
    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time: number): number {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = ms - timeSinceLastCall;

    return Math.min(timeWaiting, ms - timeSinceLastInvoke);
  }

  function shouldInvoke(time: number): boolean {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;

    return (
      lastCallTime === 0 ||
      timeSinceLastCall >= ms ||
      timeSinceLastCall < 0 ||
      timeSinceLastInvoke >= ms
    );
  }

  function timerExpired(): void {
    const time = Date.now();
    if (shouldInvoke(time)) {
      trailingEdge(time);
    } else {
      timerId = setTimeout(timerExpired, remainingWait(time));
    }
  }

  function trailingEdge(time: number): ReturnType<T> | undefined {
    timerId = undefined;

    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = undefined;
    lastThis = undefined;
    return result;
  }

  function cancel(): void {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    lastInvokeTime = 0;
    lastArgs = undefined;
    lastCallTime = 0;
    lastThis = undefined;
    timerId = undefined;
  }

  function flush(): ReturnType<T> | undefined {
    return timerId === undefined ? result : trailingEdge(Date.now());
  }

  function throttled(this: unknown, ...args: Parameters<T>): ReturnType<T> | undefined {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    // Store context for later invocation
    lastArgs = args;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timerId === undefined) {
        return leadingEdge(lastCallTime);
      }
      if (trailing) {
        timerId = setTimeout(timerExpired, ms);
        return invokeFunc(lastCallTime);
      }
    }
    if (timerId === undefined) {
      timerId = setTimeout(timerExpired, ms);
    }
    return result;
  }

  throttled.cancel = cancel;
  throttled.flush = flush;

  return throttled as unknown as T;
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number,
  options: DebounceOptions = {}
): T & { cancel(): void; flush(): void } {
  const { leading = false, trailing = true, maxWait } = options;

  let lastCallTime = 0;
  let lastInvokeTime = 0;
  let timerId: NodeJS.Timeout | number | undefined;
  let maxTimerId: NodeJS.Timeout | number | undefined;
  let lastArgs: Parameters<T> | undefined;
  let lastThis: unknown;
  let result: ReturnType<T> | undefined = undefined;

  function invokeFunc(time: number): ReturnType<T> | undefined {
    if (!lastArgs) {
      return result;
    }

    const args = lastArgs;
    const thisArg = lastThis;

    lastArgs = undefined;
    lastThis = undefined;
    lastInvokeTime = time;
    result = fn.apply(thisArg, args) as ReturnType<T>;
    return result;
  }

  function leadingEdge(time: number): ReturnType<T> | undefined {
    lastInvokeTime = time;
    timerId = setTimeout(timerExpired, ms);
    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time: number): number {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = ms - timeSinceLastCall;

    return maxWait === undefined
      ? timeWaiting
      : Math.min(timeWaiting, maxWait - timeSinceLastInvoke);
  }

  function shouldInvoke(time: number): boolean {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;

    return (
      lastCallTime === 0 ||
      timeSinceLastCall >= ms ||
      timeSinceLastCall < 0 ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    );
  }

  function timerExpired(): void {
    const time = Date.now();
    if (shouldInvoke(time)) {
      trailingEdge(time);
    } else {
      timerId = setTimeout(timerExpired, remainingWait(time));
    }
  }

  function trailingEdge(time: number): ReturnType<T> | undefined {
    timerId = undefined;

    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = undefined;
    lastThis = undefined;
    return result;
  }

  function cancel(): void {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    if (maxTimerId !== undefined) {
      clearTimeout(maxTimerId);
    }
    lastInvokeTime = 0;
    lastArgs = undefined;
    lastCallTime = 0;
    lastThis = undefined;
    timerId = undefined;
    maxTimerId = undefined;
  }

  function flush(): ReturnType<T> | undefined {
    return timerId === undefined ? result : trailingEdge(Date.now());
  }

  function debounced(this: unknown, ...args: Parameters<T>): ReturnType<T> | undefined {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    // Store context for later invocation
    lastArgs = args;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timerId === undefined) {
        return leadingEdge(lastCallTime);
      }
      if (maxWait !== undefined) {
        timerId = setTimeout(timerExpired, ms);
        maxTimerId = setTimeout(timerExpired, maxWait);
        return leading ? invokeFunc(lastCallTime) : result;
      }
    }
    if (timerId === undefined) {
      timerId = setTimeout(timerExpired, ms);
    }
    return result;
  }

  debounced.cancel = cancel;
  debounced.flush = flush;

  return debounced as unknown as T & { cancel(): void; flush(): void };
}