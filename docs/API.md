# @oxog/delay API Reference

Complete API documentation for the @oxog/delay library.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core API](#core-api)
- [Time Units](#time-units)
- [Human-Friendly Syntax](#human-friendly-syntax)
- [Cancellable Delays](#cancellable-delays)
- [Conditional Delays](#conditional-delays)
- [Retry Mechanism](#retry-mechanism)
- [Repeating Delays](#repeating-delays)
- [Progress Tracking](#progress-tracking)
- [Randomization](#randomization)
- [High-Precision Timing](#high-precision-timing)
- [Promise Utilities](#promise-utilities)
- [Rate Limiting](#rate-limiting)
- [Browser Utilities](#browser-utilities)
- [Batch Processing](#batch-processing)
- [Plugin System](#plugin-system)
- [Error Handling](#error-handling)
- [TypeScript Types](#typescript-types)

## Installation

```bash
npm install @oxog/delay
```

## Quick Start

```typescript
import delay from '@oxog/delay';

// Basic delay
await delay(1000); // Wait 1 second

// Time units
await delay.seconds(2); // Wait 2 seconds

// Human-friendly syntax
await delay.for('1m 30s'); // Wait 1 minute 30 seconds

// Cancellable delay
const cancellable = delay.cancellable(5000);
setTimeout(() => cancellable.cancel(), 2000);
await cancellable; // Will be cancelled after 2 seconds
```

## Core API

### `delay(ms: number, options?: DelayOptions): Promise<void>`

Creates a basic delay for the specified number of milliseconds.

**Parameters:**
- `ms` - Delay duration in milliseconds
- `options` - Optional configuration object

**Options:**
```typescript
interface DelayOptions {
  signal?: AbortSignal;           // Cancellation signal
  onProgress?: ProgressCallback;  // Progress tracking
  progressInterval?: number;      // Progress update interval (default: 100ms)
}
```

**Example:**
```typescript
// Basic delay
await delay(1000);

// With progress tracking
await delay(5000, {
  onProgress: (elapsed, total) => {
    console.log(`Progress: ${Math.round((elapsed / total) * 100)}%`);
  },
  progressInterval: 100
});

// With cancellation
const controller = new AbortController();
setTimeout(() => controller.abort(), 2000);

try {
  await delay(5000, { signal: controller.signal });
} catch (error) {
  console.log('Delay was cancelled');
}
```

## Time Units

### `delay.ms(milliseconds: number, options?: DelayOptions): Promise<void>`

Equivalent to the main delay function. Provided for clarity.

```typescript
await delay.ms(500); // Wait 500ms
```

### `delay.seconds(seconds: number, options?: DelayOptions): Promise<void>`

Delay for the specified number of seconds.

```typescript
await delay.seconds(2.5); // Wait 2.5 seconds
```

### `delay.minutes(minutes: number, options?: DelayOptions): Promise<void>`

Delay for the specified number of minutes.

```typescript
await delay.minutes(1.5); // Wait 1.5 minutes
```

### `delay.hours(hours: number, options?: DelayOptions): Promise<void>`

Delay for the specified number of hours.

```typescript
await delay.hours(0.5); // Wait 30 minutes
```

### `delay.days(days: number, options?: DelayOptions): Promise<void>`

Delay for the specified number of days.

```typescript
await delay.days(1); // Wait 24 hours
```

## Human-Friendly Syntax

### `delay.for(timeString: string, options?: DelayOptions): Promise<void>`

Parse and delay for human-readable time strings.

**Supported formats:**
- `'500ms'`, `'2s'`, `'5m'`, `'2h'`, `'1d'`
- `'1h 30m'`, `'2m 30s'`, `'1d 2h 30m 45s'`
- `'500 milliseconds'`, `'2 seconds'`, `'5 minutes'`

```typescript
await delay.for('2s');           // 2 seconds
await delay.for('1m 30s');       // 1 minute 30 seconds
await delay.for('2 hours');      // 2 hours
await delay.for('1d 2h 30m');    // 1 day, 2 hours, 30 minutes
```

### `delay.until(date: Date | string, options?: DelayOptions): Promise<void>`

Wait until a specific date or time.

```typescript
// Wait until specific date
await delay.until(new Date('2024-12-31T23:59:59'));

// Wait until time today
await delay.until('14:30');     // Wait until 2:30 PM today
await delay.until('23:45:30');  // Wait until 11:45:30 PM today
```

## Cancellable Delays

### `delay.cancellable(ms: number, options?: DelayOptions): CancellablePromise<void>`

Creates a delay that can be cancelled.

**Methods:**
- `cancel()` - Cancel the delay
- `isCancelled()` - Check if cancelled

```typescript
const cancellable = delay.cancellable(5000);

// Cancel after 2 seconds
setTimeout(() => cancellable.cancel(), 2000);

try {
  await cancellable;
  console.log('Completed');
} catch (error) {
  if (cancellable.isCancelled()) {
    console.log('Was cancelled');
  }
}
```

## Conditional Delays

### `delay.while(predicate: () => boolean | Promise<boolean>, options?: ConditionalOptions): Promise<void>`

Wait while a condition is true.

```typescript
let loading = true;

// Wait while loading
await delay.while(() => loading, {
  checkInterval: 100,  // Check every 100ms
  timeout: 5000       // Timeout after 5 seconds
});
```

### `delay.until(predicate: () => boolean | Promise<boolean>, options?: ConditionalOptions): Promise<void>`

Wait until a condition becomes true.

```typescript
let dataLoaded = false;

// Wait until data is loaded
await delay.until(() => dataLoaded, {
  checkInterval: 50,   // Check every 50ms
  timeout: 10000      // Timeout after 10 seconds
});
```

## Retry Mechanism

### `delay.retry<T>(fn: () => T | Promise<T>, options?: RetryOptions): Promise<T>`

Retry a function with configurable backoff strategies.

**Options:**
```typescript
interface RetryOptions {
  attempts: number;                    // Maximum attempts
  delay: number;                       // Base delay between attempts
  backoff?: 'linear' | 'exponential'; // Backoff strategy
  backoffFactor?: number;              // Backoff multiplier
  maxDelay?: number;                   // Maximum delay cap
  onRetry?: (error: Error, attempt: number) => void;
}
```

```typescript
// Basic retry
const result = await delay.retry(async () => {
  const response = await fetch('/api/data');
  if (!response.ok) throw new Error('Request failed');
  return response.json();
}, {
  attempts: 3,
  delay: 1000
});

// Exponential backoff
await delay.retry(riskyOperation, {
  attempts: 5,
  delay: 1000,
  backoff: 'exponential',
  backoffFactor: 2,
  maxDelay: 10000,
  onRetry: (error, attempt) => {
    console.log(`Attempt ${attempt} failed: ${error.message}`);
  }
});
```

## Repeating Delays

### `delay.repeat(fn: Function, interval: number): RepeatController`

Execute a function repeatedly at intervals.

**Controller methods:**
- `pause()` - Pause execution
- `resume()` - Resume execution
- `stop()` - Stop completely
- `isPaused()` - Check if paused
- `isStopped()` - Check if stopped

```typescript
const controller = delay.repeat(() => {
  console.log('Heartbeat');
}, 1000);

// Pause after 5 seconds
setTimeout(() => controller.pause(), 5000);

// Resume after 10 seconds
setTimeout(() => controller.resume(), 10000);

// Stop after 20 seconds
setTimeout(() => controller.stop(), 20000);
```

### `delay.interval(fn: Function, interval: number): RepeatController`

Execute a function at regular intervals (no immediate execution).

```typescript
const controller = delay.interval(() => {
  console.log('Every 2 seconds');
}, 2000);
```

## Progress Tracking

Track delay progress with callbacks.

```typescript
await delay(10000, {
  onProgress: (elapsed, total) => {
    const percentage = Math.round((elapsed / total) * 100);
    console.log(`Progress: ${percentage}%`);
  },
  progressInterval: 100 // Update every 100ms
});
```

## Randomization

### `delay.random(min: number, max: number, options?: DelayOptions): Promise<void>`

Random delay between min and max milliseconds.

```typescript
await delay.random(1000, 3000); // Random delay 1-3 seconds
```

### `delay.between(min: number, max: number, options?: DelayOptions): Promise<void>`

Alias for `delay.random()`.

```typescript
await delay.between(500, 1500); // Random delay 0.5-1.5 seconds
```

## High-Precision Timing

### `delay.precise(ms: number, options?: DelayOptions): Promise<void>`

High-precision delay using performance timing.

```typescript
await delay.precise(100.5); // Precise 100.5ms delay
```

## Promise Utilities

### `delay.race<T>(promises: Promise<T>[], timeout: number): Promise<T>`

Race promises with timeout.

```typescript
const result = await delay.race([
  fetch('/api/fast'),
  fetch('/api/slow')
], 5000); // Timeout after 5 seconds
```

### `delay.timeout<T>(promise: Promise<T>, ms: number): Promise<T>`

Add timeout to any promise.

```typescript
const data = await delay.timeout(
  fetch('/api/data'),
  3000 // 3 second timeout
);
```

### `delay.minimum<T>(promise: Promise<T>, minTime: number): Promise<T>`

Ensure minimum execution time.

```typescript
// Ensure at least 1 second execution time
const result = await delay.minimum(
  quickOperation(),
  1000
);
```

## Rate Limiting

### `delay.throttle<T extends Function>(fn: T, ms: number, options?: ThrottleOptions): T`

Throttle function execution.

**Options:**
```typescript
interface ThrottleOptions {
  leading?: boolean;  // Execute on leading edge (default: true)
  trailing?: boolean; // Execute on trailing edge (default: true)
}
```

```typescript
const throttledSave = delay.throttle(() => {
  console.log('Saving...');
}, 1000);

// Call multiple times, executes max once per second
throttledSave();
throttledSave();
throttledSave();
```

### `delay.debounce<T extends Function>(fn: T, ms: number, options?: DebounceOptions): T`

Debounce function execution.

**Options:**
```typescript
interface DebounceOptions {
  leading?: boolean;  // Execute on leading edge (default: false)
  trailing?: boolean; // Execute on trailing edge (default: true)
  maxWait?: number;   // Maximum wait time
}
```

```typescript
const debouncedSearch = delay.debounce((query) => {
  console.log('Searching for:', query);
}, 300);

// Only executes once after typing stops
debouncedSearch('a');
debouncedSearch('ab');
debouncedSearch('abc'); // Only this triggers search after 300ms
```

## Browser Utilities

### `delay.nextFrame(): Promise<number>`

Wait for next animation frame.

```typescript
await delay.nextFrame();
// Animation code here
```

### `delay.idle(options?: IdleOptions): Promise<IdleDeadline>`

Wait for browser idle time.

```typescript
const deadline = await delay.idle({ timeout: 1000 });
console.log('Time remaining:', deadline.timeRemaining());
```

## Batch Processing

### `delay.batch(): BatchScheduler`

Create batch scheduler for multiple delays.

```typescript
const scheduler = delay.batch();

const promises = [
  scheduler.add(1000),
  scheduler.add(2000),
  scheduler.add(1500)
];

await Promise.all(promises);
```

## Plugin System

### `delay.use(plugin: DelayPlugin): void`

Register a plugin.

```typescript
import { createLoggingPlugin } from '@oxog/delay/plugins';

delay.use(createLoggingPlugin());
```

### Built-in Plugins

#### Logging Plugin
```typescript
import { createLoggingPlugin } from '@oxog/delay/plugins';

delay.use(createLoggingPlugin({
  level: 'info',
  prefix: '[delay]'
}));
```

#### Metrics Plugin
```typescript
import { createMetricsPlugin } from '@oxog/delay/plugins';

delay.use(createMetricsPlugin());

// Access metrics
const metrics = delay.getMetrics();
console.log(metrics.totalDelays);
```

#### Debug Plugin
```typescript
import { createDebugPlugin } from '@oxog/delay/plugins';

delay.use(createDebugPlugin());

// Enable debug mode
delay.debug.enabled = true;
```

## Error Handling

### DelayError

Custom error class for delay-specific errors.

```typescript
try {
  await delay(-1000); // Invalid delay
} catch (error) {
  if (error instanceof DelayError) {
    console.log('Error code:', error.code);
    console.log('Details:', error.details);
  }
}
```

### Error Codes

- `INVALID_DELAY` - Invalid delay value
- `INVALID_TIME_STRING` - Invalid time string format
- `DELAY_CANCELLED` - Delay was cancelled
- `TIMEOUT_EXCEEDED` - Timeout exceeded
- `RETRY_EXHAUSTED` - Retry attempts exhausted

## TypeScript Types

### Core Interfaces

```typescript
interface DelayInstance {
  (ms: number, options?: DelayOptions): Promise<void>;
  ms(milliseconds: number, options?: DelayOptions): Promise<void>;
  seconds(seconds: number, options?: DelayOptions): Promise<void>;
  minutes(minutes: number, options?: DelayOptions): Promise<void>;
  hours(hours: number, options?: DelayOptions): Promise<void>;
  days(days: number, options?: DelayOptions): Promise<void>;
  for(timeString: string, options?: DelayOptions): Promise<void>;
  until(condition: Date | string | (() => boolean | Promise<boolean>), options?: ConditionalOptions): Promise<void>;
  while(predicate: () => boolean | Promise<boolean>, options?: ConditionalOptions): Promise<void>;
  cancellable(ms: number, options?: DelayOptions): CancellablePromise<void>;
  retry<T>(fn: () => T | Promise<T>, options?: RetryOptions): Promise<T>;
  repeat(fn: Function, interval: number): RepeatController;
  random(min: number, max: number, options?: DelayOptions): Promise<void>;
  between(min: number, max: number, options?: DelayOptions): Promise<void>;
  precise(ms: number, options?: DelayOptions): Promise<void>;
  batch(): BatchScheduler;
  race<T>(promises: Promise<T>[], timeout: number): Promise<T>;
  timeout<T>(promise: Promise<T>, ms: number): Promise<T>;
  minimum<T>(promise: Promise<T>, minTime: number): Promise<T>;
  throttle<T extends Function>(fn: T, ms: number, options?: ThrottleOptions): T;
  debounce<T extends Function>(fn: T, ms: number, options?: DebounceOptions): T;
  nextFrame(): Promise<number>;
  idle(options?: IdleOptions): Promise<IdleDeadline>;
  use(plugin: DelayPlugin): void;
}
```

### Option Interfaces

```typescript
interface DelayOptions {
  signal?: AbortSignal;
  onProgress?: ProgressCallback;
  progressInterval?: number;
}

interface RetryOptions {
  attempts: number;
  delay: number;
  backoff?: 'linear' | 'exponential';
  backoffFactor?: number;
  maxDelay?: number;
  onRetry?: (error: Error, attempt: number) => void;
}

interface ConditionalOptions {
  checkInterval?: number;
  timeout?: number;
  signal?: AbortSignal;
}

interface ThrottleOptions {
  leading?: boolean;
  trailing?: boolean;
}

interface DebounceOptions {
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
}
```

### Utility Types

```typescript
type ProgressCallback = (elapsed: number, total: number) => void;

interface CancellablePromise<T> extends Promise<T> {
  cancel(): void;
  isCancelled(): boolean;
}

interface RepeatController {
  pause(): void;
  resume(): void;
  stop(): void;
  isPaused(): boolean;
  isStopped(): boolean;
}

interface BatchScheduler {
  add(ms: number, options?: DelayOptions): Promise<void>;
  addAll(delays: number[]): Promise<void[]>;
  clear(): void;
}
```

---

For more examples and advanced usage, see the [examples directory](../examples/) in the repository.