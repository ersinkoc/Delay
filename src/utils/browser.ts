import { DelayError, DelayErrorCode } from '../types/index.js';

export function nextFrame(): Promise<number> {
  if (typeof requestAnimationFrame === 'undefined') {
    throw new DelayError(
      'requestAnimationFrame is not available in this environment',
      DelayErrorCode.UNSUPPORTED_ENVIRONMENT,
      { feature: 'requestAnimationFrame' }
    );
  }

  return new Promise<number>((resolve) => {
    requestAnimationFrame(resolve);
  });
}

export function nextFrames(count: number): Promise<number> {
  if (count <= 0) {
    throw new DelayError(
      'Frame count must be positive',
      DelayErrorCode.INVALID_OPTIONS,
      { count }
    );
  }

  if (count === 1) {
    return nextFrame();
  }

  return new Promise<number>((resolve) => {
    let remaining = count;
    
    const tick = (timestamp: number): void => {
      remaining--;
      if (remaining <= 0) {
        resolve(timestamp);
      } else {
        requestAnimationFrame(tick);
      }
    };
    
    requestAnimationFrame(tick);
  });
}

export function idle(options: IdleRequestOptions = {}): Promise<IdleDeadline> {
  if (typeof requestIdleCallback === 'undefined') {
    // Fallback for environments without requestIdleCallback
    return new Promise<IdleDeadline>((resolve) => {
      setTimeout(() => {
        resolve({
          didTimeout: false,
          timeRemaining(): number {
            return 50; // Assume 50ms remaining
          },
        });
      }, 0);
    });
  }

  return new Promise<IdleDeadline>((resolve, reject) => {
    let isSettled = false;
    let timeoutId: NodeJS.Timeout | number | undefined;

    const id = requestIdleCallback((deadline) => {
      if (!isSettled) {
        isSettled = true;
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
        }
        resolve(deadline);
      }
    }, options);

    // Optional timeout handling
    if (options.timeout) {
      timeoutId = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          if (typeof cancelIdleCallback !== 'undefined') {
            cancelIdleCallback(id);
          }
          reject(new DelayError(
            `Idle callback timed out after ${options.timeout}ms`,
            DelayErrorCode.TIMEOUT,
            { timeout: options.timeout }
          ));
        }
      }, options.timeout);
    }
  });
}

export function waitForDOMReady(): Promise<void> {
  if (typeof document === 'undefined') {
    throw new DelayError(
      'DOM is not available in this environment',
      DelayErrorCode.UNSUPPORTED_ENVIRONMENT,
      { feature: 'document' }
    );
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const handler = (): void => {
      document.removeEventListener('DOMContentLoaded', handler);
      resolve();
    };
    
    document.addEventListener('DOMContentLoaded', handler);
  });
}

export function waitForWindowLoad(): Promise<void> {
  if (typeof window === 'undefined') {
    throw new DelayError(
      'Window is not available in this environment',
      DelayErrorCode.UNSUPPORTED_ENVIRONMENT,
      { feature: 'window' }
    );
  }

  if (document.readyState === 'complete') {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const handler = (): void => {
      window.removeEventListener('load', handler);
      resolve();
    };
    
    window.addEventListener('load', handler);
  });
}

export function waitForVisibilityChange(visible: boolean): Promise<void> {
  if (typeof document === 'undefined') {
    throw new DelayError(
      'Document is not available in this environment',
      DelayErrorCode.UNSUPPORTED_ENVIRONMENT,
      { feature: 'document' }
    );
  }

  // Check current state
  const isCurrentlyVisible = !document.hidden;
  if (isCurrentlyVisible === visible) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const handler = (): void => {
      const isVisible = !document.hidden;
      if (isVisible === visible) {
        document.removeEventListener('visibilitychange', handler);
        resolve();
      }
    };
    
    document.addEventListener('visibilitychange', handler);
  });
}

export function createFrameBasedDelay(frames: number): Promise<number> {
  return nextFrames(frames);
}

export function createIdleDelay(maxWait = 5000): Promise<IdleDeadline> {
  return idle({ timeout: maxWait });
}

export function isRequestAnimationFrameAvailable(): boolean {
  return typeof requestAnimationFrame !== 'undefined';
}

export function isRequestIdleCallbackAvailable(): boolean {
  return typeof requestIdleCallback !== 'undefined';
}

export function getEnvironmentCapabilities(): {
  hasRequestAnimationFrame: boolean;
  hasRequestIdleCallback: boolean;
  hasPerformanceNow: boolean;
  hasDocument: boolean;
  hasWindow: boolean;
} {
  return {
    hasRequestAnimationFrame: isRequestAnimationFrameAvailable(),
    hasRequestIdleCallback: isRequestIdleCallbackAvailable(),
    hasPerformanceNow: typeof performance !== 'undefined' && !!performance.now,
    hasDocument: typeof document !== 'undefined',
    hasWindow: typeof window !== 'undefined',
  };
}