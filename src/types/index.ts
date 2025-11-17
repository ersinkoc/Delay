export interface DelayOptions {
  signal?: AbortSignal;
  onProgress?: ProgressCallback;
  progressInterval?: number;
}

export type ProgressCallback = (elapsed: number, total: number) => void;

export interface CancellableDelay<T = void> extends Promise<T> {
  cancel(): void;
  isCancelled(): boolean;
}

export interface RetryOptions {
  attempts: number;
  delay: number | ((attempt: number) => number);
  backoff?: 'linear' | 'exponential';
  backoffFactor?: number;
  maxDelay?: number;
  onRetry?: (error: Error, attempt: number) => void;
  retryIf?: (error: Error) => boolean;
}

export interface RepeatOptions {
  onError?: (error: Error) => void;
  stopOnError?: boolean;
}

export interface RepeatController {
  stop(): void;
  pause(): void;
  resume(): void;
  isPaused(): boolean;
  isStopped(): boolean;
}

export interface RandomDelayOptions {
  jitter?: number;
}

export interface BatchDelayOptions {
  maxBatchSize?: number;
  batchWindow?: number;
}

export interface ThrottleOptions {
  leading?: boolean;
  trailing?: boolean;
}

export interface DebounceOptions {
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
}

export type TimeUnit = 'ms' | 'milliseconds' | 'seconds' | 's' | 'minutes' | 'm' | 'hours' | 'h' | 'days' | 'd';

export interface TimeString {
  value: number;
  unit: TimeUnit;
}

export interface DelayPlugin {
  name: string;
  version: string;
  init?(delay: DelayInstance): void;
  destroy?(): void;
}

export interface DelayInstance {
  (ms: number, options?: DelayOptions): Promise<void>;
  ms(milliseconds: number, options?: DelayOptions): Promise<void>;
  seconds(seconds: number, options?: DelayOptions): Promise<void>;
  minutes(minutes: number, options?: DelayOptions): Promise<void>;
  hours(hours: number, options?: DelayOptions): Promise<void>;
  days(days: number, options?: DelayOptions): Promise<void>;
  for(timeString: string, options?: DelayOptions): Promise<void>;
  until(target: Date | string | (() => boolean), options?: DelayOptions): Promise<void>;
  while(predicate: () => boolean, options?: DelayOptions): Promise<void>;
  cancellable<T = void>(ms: number, options?: DelayOptions): CancellableDelay<T>;
  retry<T>(fn: () => T | Promise<T>, options: RetryOptions): Promise<T>;
  repeat<T>(fn: () => T | Promise<T>, interval: number, options?: RepeatOptions): RepeatController;
  random(ms: number, options?: RandomDelayOptions): Promise<void>;
  between(min: number, max: number): Promise<void>;
  precise(ms: number): Promise<void>;
  batch(options?: BatchDelayOptions): BatchScheduler;
  race<T>(promises: Promise<T>[], timeout: number, timeoutError?: Error): Promise<T>;
  timeout(ms: number, error?: Error): Promise<never>;
  minimum<T>(promise: Promise<T>, ms: number): Promise<T>;
  throttle<T extends (...args: unknown[]) => unknown>(
    fn: T,
    ms: number,
    options?: ThrottleOptions
  ): T;
  debounce<T extends (...args: unknown[]) => unknown>(
    fn: T,
    ms: number,
    options?: DebounceOptions
  ): T & { cancel(): void; flush(): void };
  nextFrame(): Promise<number>;
  idle(options?: IdleRequestOptions): Promise<IdleDeadline>;
  use(plugin: DelayPlugin): void;
}

export interface BatchScheduler {
  add(ms: number): Promise<void>;
  flush(): void;
  clear(): void;
}

export class DelayError extends Error {
  constructor(
    message: string,
    public code: DelayErrorCode,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DelayError';
    Object.setPrototypeOf(this, DelayError.prototype);
  }
}

export enum DelayErrorCode {
  CANCELLED = 'DELAY_CANCELLED',
  INVALID_TIME = 'INVALID_TIME',
  INVALID_TIME_STRING = 'INVALID_TIME_STRING',
  NEGATIVE_DELAY = 'NEGATIVE_DELAY',
  TIMEOUT = 'TIMEOUT',
  RETRY_EXHAUSTED = 'RETRY_EXHAUSTED',
  INVALID_OPTIONS = 'INVALID_OPTIONS',
  UNSUPPORTED_ENVIRONMENT = 'UNSUPPORTED_ENVIRONMENT',
}