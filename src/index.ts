import {
  DelayInstance,
  DelayOptions,
  CancellableDelay,
  RetryOptions,
  RepeatController,
  RandomDelayOptions,
  BatchDelayOptions,
  ThrottleOptions,
  DebounceOptions,
  DelayPlugin,
  BatchScheduler,
} from './types/index.js';

import {
  createBasicDelay,
  msDelay,
  secondsDelay,
  minutesDelay,
  hoursDelay,
  daysDelay,
} from './core/delay.js';

import { createCancellableDelay } from './core/cancellable.js';
import { forDelay, untilDelay, whileDelay } from './core/parser.js';
import { retryDelay } from './core/retry.js';
import { createRepeatDelay } from './core/repeat.js';
import { createBatchScheduler, preciseDelay } from './core/scheduler.js';

import { addJitter, randomBetween } from './utils/random.js';
import { throttle, debounce } from './utils/throttle-debounce.js';
import { 
  raceWithTimeout, 
  createTimeoutPromise, 
  minimumDelay 
} from './utils/promise.js';
import { nextFrame, idle } from './utils/browser.js';

import { PluginManager } from './plugins/plugin-manager.js';

class DelayImplementation {
  private pluginManager = new PluginManager();

  constructor() {
    this.pluginManager.setDelayInstance(this as unknown as DelayInstance);
  }

  // Main delay function - will be added as property
  delay(ms: number, options?: DelayOptions): Promise<void> {
    return createBasicDelay(ms, options);
  }

  // Time unit methods
  ms(milliseconds: number, options?: DelayOptions): Promise<void> {
    return msDelay(milliseconds, options);
  }

  seconds(seconds: number, options?: DelayOptions): Promise<void> {
    return secondsDelay(seconds, options);
  }

  minutes(minutes: number, options?: DelayOptions): Promise<void> {
    return minutesDelay(minutes, options);
  }

  hours(hours: number, options?: DelayOptions): Promise<void> {
    return hoursDelay(hours, options);
  }

  days(days: number, options?: DelayOptions): Promise<void> {
    return daysDelay(days, options);
  }

  // Human-friendly syntax
  for(timeString: string, options?: DelayOptions): Promise<void> {
    return forDelay(timeString, options);
  }

  until(target: Date | string | (() => boolean), options?: DelayOptions): Promise<void> {
    return untilDelay(target, options);
  }

  while(predicate: () => boolean, options?: DelayOptions): Promise<void> {
    return whileDelay(predicate, options);
  }

  // Cancellable delays
  cancellable<T = void>(ms: number, options?: DelayOptions): CancellableDelay<T> {
    return createCancellableDelay<T>(ms, options);
  }

  // Retry mechanism
  retry<T>(fn: () => T | Promise<T>, options: RetryOptions): Promise<T> {
    return retryDelay(fn, options);
  }

  // Repeating delays
  repeat<T>(fn: () => T | Promise<T>, interval: number): RepeatController {
    return createRepeatDelay(fn, interval);
  }

  // Randomization
  random(ms: number, options: RandomDelayOptions = {}): Promise<void> {
    const { jitter = 0.1 } = options;
    const randomMs = addJitter(ms, jitter);
    return createBasicDelay(randomMs);
  }

  between(min: number, max: number): Promise<void> {
    const randomMs = randomBetween(min, max);
    return createBasicDelay(randomMs);
  }

  // Performance features
  precise(ms: number): Promise<void> {
    return preciseDelay(ms);
  }

  batch(options?: BatchDelayOptions): BatchScheduler {
    return createBatchScheduler(options);
  }

  // Promise utilities
  race<T>(promises: Promise<T>[], timeout: number, timeoutError?: Error): Promise<T> {
    return raceWithTimeout(promises, timeout, timeoutError);
  }

  timeout(ms: number, error?: Error): Promise<never> {
    return createTimeoutPromise<never>(ms, error);
  }

  minimum<T>(promise: Promise<T>, ms: number): Promise<T> {
    return minimumDelay(promise, ms);
  }

  // Utility methods
  throttle<T extends (...args: unknown[]) => unknown>(
    fn: T,
    ms: number,
    options?: ThrottleOptions
  ): T {
    return throttle(fn, ms, options);
  }

  debounce<T extends (...args: unknown[]) => unknown>(
    fn: T,
    ms: number,
    options?: DebounceOptions
  ): T & { cancel(): void; flush(): void } {
    return debounce(fn, ms, options);
  }

  nextFrame(): Promise<number> {
    return nextFrame();
  }

  idle(options?: IdleRequestOptions): Promise<IdleDeadline> {
    return idle(options);
  }

  // Plugin system
  use(plugin: DelayPlugin): void {
    this.pluginManager.register(plugin);
  }
}

// Create a function that can be called directly but also has methods
function createDelayInstance(): DelayInstance {
  const instance = new DelayImplementation();
  
  // Create a callable function
  const delay = (ms: number, options?: DelayOptions): Promise<void> => {
    return instance.delay(ms, options);
  };

  // Copy all methods to the function, excluding the internal delay method
  const propertiesToCopy = Object.getOwnPropertyNames(Object.getPrototypeOf(instance))
    .filter(name => name !== 'constructor' && name !== 'delay');
  
  propertiesToCopy.forEach(name => {
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(instance), name);
    if (descriptor && typeof descriptor.value === 'function') {
      (delay as any)[name] = descriptor.value.bind(instance);
    }
  });

  // Also copy any instance properties
  Object.keys(instance).forEach(key => {
    if (key !== 'pluginManager') {
      (delay as any)[key] = (instance as any)[key];
    }
  });

  return delay as DelayInstance;
}

// Create the default instance
const delay = createDelayInstance();

// Export both the instance and types
export default delay;
export { delay };

// Export types for TypeScript users
export type {
  DelayInstance,
  DelayOptions,
  CancellableDelay,
  RetryOptions,
  RepeatController,
  RandomDelayOptions,
  BatchDelayOptions,
  ThrottleOptions,
  DebounceOptions,
  DelayPlugin,
  BatchScheduler,
  ProgressCallback,
  TimeUnit,
} from './types/index.js';

// Export error types
export { DelayError, DelayErrorCode } from './types/index.js';

// Export utility functions for advanced use cases
export { createBasicDelay } from './core/delay.js';
export { createCancellableDelay } from './core/cancellable.js';
export { retryDelay } from './core/retry.js';
export { createRepeatDelay } from './core/repeat.js';
export { createBatchScheduler, preciseDelay } from './core/scheduler.js';
export { throttle, debounce } from './utils/throttle-debounce.js';
export { 
  addJitter, 
  randomBetween, 
  calculateBackoffDelay 
} from './utils/random.js';
export { 
  parseTimeString, 
  parseTimeUntil, 
  convertToMs,
  getHighResolutionTime,
} from './utils/time.js';
export { 
  nextFrame, 
  idle, 
  waitForDOMReady, 
  waitForWindowLoad,
  getEnvironmentCapabilities,
} from './utils/browser.js';
export {
  PluginManager,
  createLoggingPlugin,
  createMetricsPlugin,
  createDebugPlugin,
} from './plugins/plugin-manager.js';