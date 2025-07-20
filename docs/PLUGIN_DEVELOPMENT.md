# Plugin Development Guide

This guide explains how to create custom plugins for @oxog/delay.

## Table of Contents

- [Plugin Architecture](#plugin-architecture)
- [Creating a Basic Plugin](#creating-a-basic-plugin)
- [Plugin Interface](#plugin-interface)
- [Plugin Lifecycle](#plugin-lifecycle)
- [Built-in Plugins](#built-in-plugins)
- [Advanced Plugin Examples](#advanced-plugin-examples)
- [Testing Plugins](#testing-plugins)
- [Publishing Plugins](#publishing-plugins)

## Plugin Architecture

The @oxog/delay plugin system allows you to extend the library's functionality by:

- Intercepting delay operations
- Adding custom methods to the delay instance
- Collecting metrics and analytics
- Implementing custom logging
- Extending error handling

Plugins are registered with the main delay instance and can hook into the delay lifecycle.

## Creating a Basic Plugin

Here's a minimal plugin that logs all delay operations:

```typescript
import { DelayPlugin, DelayInstance } from '@oxog/delay';

export function createSimpleLoggingPlugin(): DelayPlugin {
  return {
    name: 'simple-logging',
    version: '1.0.0',
    
    init(delayInstance: DelayInstance) {
      console.log('Simple logging plugin initialized');
      
      // Store original delay function
      const originalDelay = delayInstance;
      
      // Wrap the delay function
      const wrappedDelay = (ms: number, options?: any) => {
        console.log(`Starting delay: ${ms}ms`);
        const start = Date.now();
        
        return originalDelay(ms, options).then(() => {
          const actual = Date.now() - start;
          console.log(`Delay completed: ${actual}ms (expected: ${ms}ms)`);
        });
      };
      
      // Copy all other methods
      Object.setPrototypeOf(wrappedDelay, Object.getPrototypeOf(delayInstance));
      Object.assign(wrappedDelay, delayInstance);
      
      // Return the wrapped instance
      return wrappedDelay;
    },
    
    destroy() {
      console.log('Simple logging plugin destroyed');
    }
  };
}

// Usage
import delay from '@oxog/delay';
delay.use(createSimpleLoggingPlugin());
```

## Plugin Interface

```typescript
interface DelayPlugin {
  // Required: Unique plugin identifier
  name: string;
  
  // Required: Plugin version (semver)
  version: string;
  
  // Optional: Plugin description
  description?: string;
  
  // Optional: Plugin author
  author?: string;
  
  // Optional: Plugin dependencies
  dependencies?: string[];
  
  // Optional: Initialize plugin with delay instance
  init?(delayInstance: DelayInstance): DelayInstance | void;
  
  // Optional: Cleanup when plugin is unregistered
  destroy?(): void;
  
  // Optional: Plugin configuration
  config?: Record<string, any>;
}
```

## Plugin Lifecycle

### 1. Registration

Plugins are registered using `delay.use()`:

```typescript
delay.use(myPlugin);
```

### 2. Initialization

When registered, the plugin's `init()` method is called with the delay instance:

```typescript
init(delayInstance: DelayInstance): DelayInstance | void {
  // Your initialization code here
  
  // Option 1: Modify the instance in place
  delayInstance.customMethod = () => { /* ... */ };
  
  // Option 2: Return a wrapped instance
  return wrapDelayInstance(delayInstance);
}
```

### 3. Operation

The plugin can intercept and modify delay operations throughout the application lifecycle.

### 4. Destruction

When the plugin is unregistered or the application shuts down, the `destroy()` method is called:

```typescript
destroy() {
  // Cleanup resources, timers, etc.
}
```

## Built-in Plugins

### Logging Plugin

```typescript
import { createLoggingPlugin } from '@oxog/delay/plugins';

const loggingPlugin = createLoggingPlugin({
  level: 'info',        // Log level: 'debug', 'info', 'warn', 'error'
  prefix: '[delay]',    // Log prefix
  timestamp: true,      // Include timestamps
  colors: true         // Use colors in console
});

delay.use(loggingPlugin);
```

### Metrics Plugin

```typescript
import { createMetricsPlugin } from '@oxog/delay/plugins';

const metricsPlugin = createMetricsPlugin({
  trackAccuracy: true,  // Track timing accuracy
  trackMemory: true,    // Track memory usage
  reportInterval: 5000  // Report metrics every 5 seconds
});

delay.use(metricsPlugin);

// Access metrics
const metrics = delay.getMetrics();
console.log(metrics);
```

### Debug Plugin

```typescript
import { createDebugPlugin } from '@oxog/delay/plugins';

const debugPlugin = createDebugPlugin({
  enabled: process.env.NODE_ENV === 'development',
  logLevel: 'debug',
  stackTrace: true
});

delay.use(debugPlugin);

// Control debug mode
delay.debug.enabled = true;
delay.debug.log('Custom debug message');
```

## Advanced Plugin Examples

### Performance Monitoring Plugin

```typescript
export function createPerformancePlugin(options = {}) {
  const {
    slowThreshold = 1000,
    onSlowDelay = (actual, expected) => console.warn(`Slow delay: ${actual}ms (expected: ${expected}ms)`),
    trackAllDelays = false
  } = options;
  
  const metrics = {
    totalDelays: 0,
    slowDelays: 0,
    averageAccuracy: 0,
    delayHistory: []
  };
  
  return {
    name: 'performance-monitor',
    version: '1.0.0',
    description: 'Monitors delay performance and accuracy',
    
    init(delayInstance) {
      const originalDelay = delayInstance;
      
      const monitoredDelay = (ms, options = {}) => {
        const start = performance.now();
        const expectedEnd = start + ms;
        
        return originalDelay(ms, {
          ...options,
          onProgress: (elapsed, total) => {
            // Track progress if needed
            if (options.onProgress) {
              options.onProgress(elapsed, total);
            }
          }
        }).then(() => {
          const end = performance.now();
          const actual = end - start;
          const accuracy = Math.abs(actual - ms) / ms;
          
          // Update metrics
          metrics.totalDelays++;
          metrics.averageAccuracy = (metrics.averageAccuracy * (metrics.totalDelays - 1) + accuracy) / metrics.totalDelays;
          
          if (trackAllDelays) {
            metrics.delayHistory.push({ expected: ms, actual, accuracy, timestamp: Date.now() });
          }
          
          // Check for slow delays
          if (actual > ms + slowThreshold) {
            metrics.slowDelays++;
            onSlowDelay(actual, ms);
          }
        });
      };
      
      // Copy other methods
      Object.setPrototypeOf(monitoredDelay, Object.getPrototypeOf(delayInstance));
      Object.assign(monitoredDelay, delayInstance);
      
      // Add metrics access
      monitoredDelay.getPerformanceMetrics = () => ({ ...metrics });
      
      return monitoredDelay;
    },
    
    destroy() {
      // Clear metrics
      Object.assign(metrics, {
        totalDelays: 0,
        slowDelays: 0,
        averageAccuracy: 0,
        delayHistory: []
      });
    }
  };
}
```

### Retry Statistics Plugin

```typescript
export function createRetryStatsPlugin() {
  const stats = new Map();
  
  return {
    name: 'retry-stats',
    version: '1.0.0',
    description: 'Collects retry operation statistics',
    
    init(delayInstance) {
      const originalRetry = delayInstance.retry;
      
      delayInstance.retry = async (fn, options = {}) => {
        const startTime = Date.now();
        const functionName = fn.name || 'anonymous';
        
        if (!stats.has(functionName)) {
          stats.set(functionName, {
            totalCalls: 0,
            totalSuccesses: 0,
            totalFailures: 0,
            totalAttempts: 0,
            averageAttempts: 0,
            totalTime: 0
          });
        }
        
        const stat = stats.get(functionName);
        stat.totalCalls++;
        
        let attempts = 0;
        const wrappedOptions = {
          ...options,
          onRetry: (error, attempt) => {
            attempts = attempt;
            if (options.onRetry) {
              options.onRetry(error, attempt);
            }
          }
        };
        
        try {
          const result = await originalRetry.call(delayInstance, fn, wrappedOptions);
          const endTime = Date.now();
          
          stat.totalSuccesses++;
          stat.totalAttempts += Math.max(1, attempts);
          stat.totalTime += endTime - startTime;
          stat.averageAttempts = stat.totalAttempts / stat.totalCalls;
          
          return result;
        } catch (error) {
          const endTime = Date.now();
          
          stat.totalFailures++;
          stat.totalAttempts += attempts || options.attempts || 1;
          stat.totalTime += endTime - startTime;
          stat.averageAttempts = stat.totalAttempts / stat.totalCalls;
          
          throw error;
        }
      };
      
      // Add stats access
      delayInstance.getRetryStats = (functionName) => {
        if (functionName) {
          return stats.get(functionName);
        }
        return Object.fromEntries(stats);
      };
    },
    
    destroy() {
      stats.clear();
    }
  };
}
```

### Circuit Breaker Plugin

```typescript
export function createCircuitBreakerPlugin(options = {}) {
  const {
    failureThreshold = 5,
    resetTimeout = 60000,
    monitoredMethods = ['retry']
  } = options;
  
  const circuits = new Map();
  
  function getCircuitState(key) {
    if (!circuits.has(key)) {
      circuits.set(key, {
        state: 'CLOSED',  // CLOSED, OPEN, HALF_OPEN
        failureCount: 0,
        lastFailureTime: null,
        successCount: 0
      });
    }
    return circuits.get(key);
  }
  
  function shouldAllowRequest(circuit) {
    if (circuit.state === 'CLOSED') return true;
    if (circuit.state === 'OPEN') {
      return Date.now() - circuit.lastFailureTime > resetTimeout;
    }
    return true; // HALF_OPEN allows one request
  }
  
  function onSuccess(circuit) {
    circuit.failureCount = 0;
    circuit.state = 'CLOSED';
    if (circuit.state === 'HALF_OPEN') {
      circuit.successCount++;
    }
  }
  
  function onFailure(circuit) {
    circuit.failureCount++;
    circuit.lastFailureTime = Date.now();
    
    if (circuit.failureCount >= failureThreshold) {
      circuit.state = 'OPEN';
    }
  }
  
  return {
    name: 'circuit-breaker',
    version: '1.0.0',
    description: 'Implements circuit breaker pattern for retry operations',
    
    init(delayInstance) {
      // Wrap retry method
      if (monitoredMethods.includes('retry')) {
        const originalRetry = delayInstance.retry;
        
        delayInstance.retry = async (fn, options = {}) => {
          const circuitKey = fn.name || 'anonymous';
          const circuit = getCircuitState(circuitKey);
          
          if (!shouldAllowRequest(circuit)) {
            throw new Error(`Circuit breaker is OPEN for ${circuitKey}`);
          }
          
          try {
            const result = await originalRetry.call(delayInstance, fn, options);
            onSuccess(circuit);
            return result;
          } catch (error) {
            onFailure(circuit);
            throw error;
          }
        };
      }
      
      // Add circuit breaker status
      delayInstance.getCircuitStatus = (key) => {
        if (key) {
          return circuits.get(key);
        }
        return Object.fromEntries(circuits);
      };
    },
    
    destroy() {
      circuits.clear();
    }
  };
}
```

## Testing Plugins

### Unit Testing

```typescript
import { createSimpleLoggingPlugin } from './simple-logging-plugin';
import delay from '@oxog/delay';

describe('SimpleLoggingPlugin', () => {
  let consoleSpy;
  
  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });
  
  afterEach(() => {
    consoleSpy.mockRestore();
  });
  
  it('should log delay operations', async () => {
    const plugin = createSimpleLoggingPlugin();
    delay.use(plugin);
    
    await delay(100);
    
    expect(consoleSpy).toHaveBeenCalledWith('Starting delay: 100ms');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/Delay completed: \d+ms \(expected: 100ms\)/)
    );
  });
  
  it('should cleanup on destroy', () => {
    const plugin = createSimpleLoggingPlugin();
    delay.use(plugin);
    
    // Unregister plugin
    delay.unregister('simple-logging');
    
    expect(consoleSpy).toHaveBeenCalledWith('Simple logging plugin destroyed');
  });
});
```

### Integration Testing

```typescript
describe('Plugin Integration', () => {
  it('should work with multiple plugins', async () => {
    const loggingPlugin = createLoggingPlugin();
    const metricsPlugin = createMetricsPlugin();
    
    delay.use(loggingPlugin);
    delay.use(metricsPlugin);
    
    await delay(100);
    
    const metrics = delay.getMetrics();
    expect(metrics.totalDelays).toBe(1);
  });
  
  it('should handle plugin errors gracefully', async () => {
    const faultyPlugin = {
      name: 'faulty',
      version: '1.0.0',
      init() {
        throw new Error('Plugin initialization failed');
      }
    };
    
    expect(() => delay.use(faultyPlugin)).not.toThrow();
    
    // Delay should still work
    await expect(delay(100)).resolves.toBeUndefined();
  });
});
```

## Publishing Plugins

### Package Structure

```
my-delay-plugin/
├── src/
│   ├── index.ts
│   └── plugin.ts
├── dist/
├── test/
├── package.json
├── README.md
└── LICENSE
```

### package.json

```json
{
  "name": "@myorg/delay-plugin-example",
  "version": "1.0.0",
  "description": "Example plugin for @oxog/delay",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "keywords": ["delay", "plugin", "timer"],
  "peerDependencies": {
    "@oxog/delay": "^1.0.0"
  },
  "devDependencies": {
    "@oxog/delay": "^1.0.0",
    "typescript": "^5.0.0"
  }
}
```

### README Template

```markdown
# @myorg/delay-plugin-example

Example plugin for @oxog/delay.

## Installation

```bash
npm install @oxog/delay @myorg/delay-plugin-example
```

## Usage

```typescript
import delay from '@oxog/delay';
import { createExamplePlugin } from '@myorg/delay-plugin-example';

delay.use(createExamplePlugin({
  // Plugin options
}));
```

## API

### createExamplePlugin(options)

Creates an instance of the example plugin.

#### Options

- `option1` (boolean): Description of option1
- `option2` (number): Description of option2

## License

MIT
```

### Publishing Checklist

1. ✅ Plugin follows the DelayPlugin interface
2. ✅ Plugin has comprehensive tests
3. ✅ Plugin has TypeScript definitions
4. ✅ Plugin handles errors gracefully
5. ✅ Plugin cleans up resources in destroy()
6. ✅ Documentation is complete
7. ✅ Peer dependency on @oxog/delay is specified
8. ✅ Version follows semantic versioning

---

For more examples, see the [built-in plugins](../src/plugins/) in the @oxog/delay repository.