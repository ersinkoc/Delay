# @oxog/delay

A comprehensive, zero-dependency delay/timeout utility library with advanced timing features for Node.js and browsers.

[![npm version](https://badge.fury.io/js/@oxog%2Fdelay.svg)](https://badge.fury.io/js/@oxog%2Fdelay)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Coverage](https://img.shields.io/badge/Coverage-100%25-green.svg)]()

## Features

- 🚀 **Zero dependencies** - Lightweight and fast
- 📦 **Dual format** - CommonJS and ESM support
- 🔧 **TypeScript first** - Full type safety with generated declarations
- ⏰ **Human-friendly syntax** - Parse strings like '2s', '100ms', '5m 30s'
- ❌ **Cancellable delays** - AbortController support
- 🔄 **Retry mechanism** - Exponential and linear backoff strategies  
- 🔁 **Repeating delays** - Interval-based execution with pause/resume
- 🎯 **Conditional delays** - Wait until/while conditions are met
- 📊 **Progress tracking** - Monitor delay progress with callbacks
- 🎲 **Randomization** - Add jitter and random delays
- ⚡ **High precision** - Drift-compensated timing for accuracy
- 🚦 **Throttle & Debounce** - Rate limiting utilities
- 🌐 **Browser utilities** - requestAnimationFrame and requestIdleCallback wrappers
- 🔌 **Plugin system** - Extensible architecture
- 📈 **Batch processing** - Optimize multiple delays
- 🛡️ **100% test coverage** - Thoroughly tested

## Installation

```bash
npm install @oxog/delay
```

## Quick Start

```typescript
import delay from '@oxog/delay';

// Basic delays
await delay(1000);                 // 1 second
await delay.seconds(5);            // 5 seconds
await delay.minutes(2);            // 2 minutes

// Human-friendly syntax
await delay.for('5s');             // 5 seconds
await delay.for('2m 30s');         // 2 minutes 30 seconds
await delay.for('1h 30m');         // 1 hour 30 minutes

// Cancellable delays
const cancellable = delay.cancellable(5000);
setTimeout(() => cancellable.cancel(), 1000);

// Wait until conditions
await delay.until(() => document.readyState === 'complete');
await delay.until('14:30');        // Wait until 2:30 PM today

// Retry with backoff
const result = await delay.retry(async () => {
  const response = await fetch('/api/data');
  if (!response.ok) throw new Error('Failed');
  return response.json();
}, {
  attempts: 3,
  delay: 1000,
  backoff: 'exponential'
});
```

## API Reference

### Basic Delays

```typescript
// Time in milliseconds
await delay(1000);
await delay.ms(1000);

// Time units
await delay.seconds(2);
await delay.minutes(5);
await delay.hours(1);
await delay.days(1);
```

### Human-Friendly Time Strings

```typescript
// Simple formats
await delay.for('500ms');
await delay.for('2s');
await delay.for('5m');
await delay.for('1h');
await delay.for('2d');

// Compound formats
await delay.for('1h 30m 45s');
await delay.for('5m 30s 200ms');

// Alternative units
await delay.for('2 seconds');
await delay.for('5 minutes 30 seconds');
```

### Cancellable Delays

```typescript
// Create cancellable delay
const cancellable = delay.cancellable(5000);

// Cancel it
cancellable.cancel();

// Check if cancelled
if (cancellable.isCancelled()) {
  console.log('Delay was cancelled');
}

// With AbortController
const controller = new AbortController();
await delay(5000, { signal: controller.signal });
```

### Conditional Delays

```typescript
// Wait until condition is true
await delay.until(() => document.readyState === 'complete');
await delay.until(() => window.myGlobalVar !== undefined);

// Wait until specific time
await delay.until('14:30');        // 2:30 PM today
await delay.until('9:00 AM');      // 9:00 AM today/tomorrow

// Wait until specific date
await delay.until(new Date('2024-12-25'));

// Wait while condition is true
await delay.while(() => isLoading);
```

### Retry Mechanism

```typescript
// Basic retry
const result = await delay.retry(async () => {
  // Your async operation
  return await fetchData();
}, {
  attempts: 3,
  delay: 1000
});

// Exponential backoff
await delay.retry(operation, {
  attempts: 5,
  delay: 1000,
  backoff: 'exponential',
  backoffFactor: 2,
  maxDelay: 30000
});

// Custom retry condition
await delay.retry(operation, {
  attempts: 3,
  delay: 1000,
  retryIf: (error) => error.code === 'NETWORK_ERROR',
  onRetry: (error, attempt) => {
    console.log(`Retry attempt ${attempt}: ${error.message}`);
  }
});

// Dynamic delay function
await delay.retry(operation, {
  attempts: 3,
  delay: (attempt) => Math.min(1000 * Math.pow(2, attempt), 10000)
});
```

### Repeating Delays

```typescript
// Repeat every 1 second
const controller = delay.repeat(async () => {
  console.log('Executing...');
  await doSomething();
}, 1000);

// Control execution
controller.pause();
controller.resume();
controller.stop();

// Check status
console.log(controller.isPaused());
console.log(controller.isStopped());
```

### Progress Tracking

```typescript
await delay(10000, {
  onProgress: (elapsed, total) => {
    const percent = (elapsed / total) * 100;
    console.log(`Progress: ${percent.toFixed(1)}%`);
  },
  progressInterval: 500  // Update every 500ms
});
```

### Randomization

```typescript
// Add jitter (±10% randomization)
await delay.random(1000, { jitter: 0.1 });

// Random delay between min and max
await delay.between(500, 1500);
```

### Promise Utilities

```typescript
// Race with timeout
const result = await delay.race([
  fetchUserData(),
  fetchCachedData()
], 5000, new Error('Operation timed out'));

// Ensure minimum execution time
const result = await delay.minimum(
  quickOperation(),
  1000  // Ensure it takes at least 1 second
);

// Create timeout promise
const timeoutPromise = delay.timeout(5000, new Error('Custom timeout'));
```

### High-Precision Timing

```typescript
// Drift-compensated precision timing
await delay.precise(1000);

// Batch multiple delays for efficiency
const scheduler = delay.batch({ maxBatchSize: 50 });
const promises = [
  scheduler.add(100),
  scheduler.add(100),
  scheduler.add(200)
];
await Promise.all(promises);
```

### Rate Limiting

```typescript
// Throttle function calls
const throttledSave = delay.throttle(saveData, 1000);
throttledSave();  // Executes immediately
throttledSave();  // Ignored (within 1 second)

// Debounce function calls
const debouncedSearch = delay.debounce(performSearch, 300);
debouncedSearch('query1');  // Cancelled
debouncedSearch('query2');  // Cancelled  
debouncedSearch('query3');  // Executes after 300ms

// Cancel or flush
debouncedSearch.cancel();
debouncedSearch.flush();
```

### Browser Utilities

```typescript
// Wait for next animation frame
const timestamp = await delay.nextFrame();

// Wait for idle time
const deadline = await delay.idle({ timeout: 5000 });

// Wait for DOM ready
await delay.until(() => document.readyState === 'complete');
```

### Plugin System

```typescript
// Use built-in plugins
import { createLoggingPlugin, createMetricsPlugin } from '@oxog/delay';

delay.use(createLoggingPlugin());
delay.use(createMetricsPlugin());

// Create custom plugin
const customPlugin = {
  name: 'custom',
  version: '1.0.0',
  init(delayInstance) {
    // Enhance delay instance
    delayInstance.customMethod = () => {
      console.log('Custom functionality');
    };
  }
};

delay.use(customPlugin);
```

## Error Handling

The library provides a comprehensive error system with specific error codes:

```typescript
import { DelayError, DelayErrorCode } from '@oxog/delay';

try {
  await delay(-100);  // Invalid negative delay
} catch (error) {
  if (error instanceof DelayError) {
    console.log(error.code);     // DelayErrorCode.NEGATIVE_DELAY
    console.log(error.details);  // { value: -100 }
  }
}

// Error codes
DelayErrorCode.CANCELLED        // Delay was cancelled
DelayErrorCode.INVALID_TIME     // Invalid time value
DelayErrorCode.INVALID_TIME_STRING  // Invalid time string format
DelayErrorCode.NEGATIVE_DELAY   // Negative delay value
DelayErrorCode.TIMEOUT          // Operation timed out
DelayErrorCode.RETRY_EXHAUSTED  // Retry attempts exhausted
DelayErrorCode.INVALID_OPTIONS  // Invalid options provided
DelayErrorCode.UNSUPPORTED_ENVIRONMENT  // Feature not supported
```

## Performance Considerations

- **Batch processing**: Use `delay.batch()` for multiple similar delays
- **Precise timing**: Use `delay.precise()` only when high accuracy is required
- **Memory management**: Always clean up repeat controllers and cancellable delays
- **Progress callbacks**: Use reasonable `progressInterval` values (default: 100ms)

## Browser Support

- Modern browsers with ES2020 support
- Node.js 14+
- Automatic fallbacks for missing APIs (requestIdleCallback, etc.)

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import delay, { DelayOptions, CancellableDelay, RetryOptions } from '@oxog/delay';

const options: DelayOptions = {
  signal: new AbortController().signal,
  onProgress: (elapsed, total) => console.log(`${elapsed}/${total}`)
};

const cancellable: CancellableDelay = delay.cancellable(1000, options);
```

## Contributing

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) for details.

## License

MIT © [Ersin Koç](https://github.com/ersinkoc)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for details about changes in each version.

---

Made with ❤️ by the @oxog team