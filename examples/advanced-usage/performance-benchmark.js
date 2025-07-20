/**
 * Performance Benchmark for @oxog/delay
 * Tests various delay operations for performance characteristics
 * Run with: node examples/advanced-usage/performance-benchmark.js
 */

const delay = require('../../dist/cjs/index.js').default;
const { performance } = require('perf_hooks');

class PerformanceBenchmark {
  constructor() {
    this.results = [];
    this.totalTests = 0;
    this.passedTests = 0;
  }

  async run() {
    console.log('🚀 @oxog/delay Performance Benchmark');
    console.log('=====================================\n');

    await this.testBasicDelayAccuracy();
    await this.testProgressCallbackOverhead();
    await this.testCancellationPerformance();
    await this.testRetryPerformance();
    await this.testThrottlePerformance();
    await this.testDebouncePerformance();
    await this.testBatchSchedulingPerformance();
    await this.testMemoryUsage();
    await this.testConcurrentDelays();
    await this.testTimeParsingPerformance();

    this.printSummary();
  }

  async benchmark(name, testFn, expectedTime = null, tolerance = 0.1) {
    console.log(`🔍 Testing: ${name}`);
    
    const start = performance.now();
    const result = await testFn();
    const end = performance.now();
    const elapsed = end - start;

    this.totalTests++;

    const testResult = {
      name,
      elapsed: Math.round(elapsed * 100) / 100,
      result,
      expected: expectedTime,
      tolerance: tolerance * 100,
      passed: true
    };

    if (expectedTime !== null) {
      const deviation = Math.abs(elapsed - expectedTime) / expectedTime;
      if (deviation > tolerance) {
        testResult.passed = false;
        console.log(`❌ FAILED: Expected ~${expectedTime}ms, got ${testResult.elapsed}ms (${Math.round(deviation * 100)}% deviation)`);
      } else {
        this.passedTests++;
        console.log(`✅ PASSED: ${testResult.elapsed}ms (within ${tolerance * 100}% tolerance)`);
      }
    } else {
      this.passedTests++;
      console.log(`📊 COMPLETED: ${testResult.elapsed}ms`);
    }

    if (result && typeof result === 'object') {
      Object.keys(result).forEach(key => {
        console.log(`   ${key}: ${result[key]}`);
      });
    }

    this.results.push(testResult);
    console.log('');
  }

  async testBasicDelayAccuracy() {
    console.log('📍 Basic Delay Accuracy Tests');
    console.log('------------------------------');

    // Test different delay durations for accuracy
    await this.benchmark('100ms delay', () => delay(100), 100, 0.2);
    await this.benchmark('500ms delay', () => delay(500), 500, 0.1);
    await this.benchmark('1000ms delay', () => delay(1000), 1000, 0.05);

    // Test time unit helpers
    await this.benchmark('1 second delay', () => delay.seconds(1), 1000, 0.05);
    await this.benchmark('0.5 second delay', () => delay.seconds(0.5), 500, 0.1);
  }

  async testProgressCallbackOverhead() {
    console.log('📊 Progress Callback Overhead');
    console.log('------------------------------');

    const baselineTest = () => delay(1000);
    await this.benchmark('1s delay (no progress)', baselineTest, 1000, 0.1);

    const progressTest = () => delay(1000, {
      onProgress: () => {}, // Empty callback
      progressInterval: 10
    });
    await this.benchmark('1s delay (10ms progress)', progressTest);

    const heavyProgressTest = () => delay(1000, {
      onProgress: (elapsed, total) => {
        // Simulate some computation
        Math.sqrt(elapsed * total);
      },
      progressInterval: 10
    });
    await this.benchmark('1s delay (heavy progress)', heavyProgressTest);
  }

  async testCancellationPerformance() {
    console.log('❌ Cancellation Performance');
    console.log('----------------------------');

    // Test immediate cancellation
    await this.benchmark('Immediate cancellation', async () => {
      const cancellable = delay.cancellable(5000);
      cancellable.cancel();
      try {
        await cancellable;
        return { cancelled: false };
      } catch {
        return { cancelled: true };
      }
    });

    // Test delayed cancellation
    await this.benchmark('500ms then cancel', async () => {
      const cancellable = delay.cancellable(2000);
      setTimeout(() => cancellable.cancel(), 500);
      try {
        await cancellable;
        return { cancelled: false };
      } catch {
        return { cancelled: true };
      }
    }, 500, 0.2);

    // Test multiple cancellations
    await this.benchmark('Multiple cancellations', async () => {
      const promises = [];
      for (let i = 0; i < 100; i++) {
        const cancellable = delay.cancellable(1000);
        cancellable.cancel();
        promises.push(cancellable.catch(() => 'cancelled'));
      }
      await Promise.all(promises);
      return { count: 100 };
    });
  }

  async testRetryPerformance() {
    console.log('🔄 Retry Performance');
    console.log('---------------------');

    let attempts = 0;
    await this.benchmark('Retry (success on 3rd)', async () => {
      attempts = 0;
      const result = await delay.retry(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Simulated failure');
        }
        return 'success';
      }, {
        attempts: 5,
        delay: 100
      });
      return { attempts, result };
    }, 200, 0.3); // 2 failures * 100ms delay

    await this.benchmark('Retry with exponential backoff', async () => {
      attempts = 0;
      try {
        await delay.retry(async () => {
          attempts++;
          throw new Error('Always fails');
        }, {
          attempts: 4,
          delay: 50,
          backoff: 'exponential'
        });
      } catch {
        // Expected to fail
      }
      return { attempts };
    }, 350, 0.3); // 50 + 100 + 200 = 350ms
  }

  async testThrottlePerformance() {
    console.log('🚦 Throttle Performance');
    console.log('------------------------');

    await this.benchmark('Throttle overhead', async () => {
      let calls = 0;
      const throttled = delay.throttle(() => calls++, 100);
      
      // Call rapidly 1000 times
      for (let i = 0; i < 1000; i++) {
        throttled();
      }
      
      await delay(200); // Wait for trailing call
      return { totalCalls: 1000, actualExecutions: calls };
    });

    await this.benchmark('Throttle with load', async () => {
      let executions = 0;
      const throttled = delay.throttle(() => {
        // Simulate some work
        executions++;
        for (let i = 0; i < 1000; i++) {
          Math.sqrt(i);
        }
      }, 50);

      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        throttled();
        await delay(10); // Spread calls over time
      }
      await delay(100); // Wait for final execution
      
      return { 
        executions,
        totalTime: Math.round(performance.now() - start),
        efficiency: executions / 100
      };
    });
  }

  async testDebouncePerformance() {
    console.log('⏰ Debounce Performance');
    console.log('------------------------');

    await this.benchmark('Debounce overhead', async () => {
      let calls = 0;
      const debounced = delay.debounce(() => calls++, 100);
      
      // Call rapidly 1000 times
      for (let i = 0; i < 1000; i++) {
        debounced();
      }
      
      await delay(150); // Wait for debounced call
      return { totalCalls: 1000, actualExecutions: calls };
    });

    await this.benchmark('Debounce burst handling', async () => {
      let executions = 0;
      const debounced = delay.debounce(() => executions++, 50);

      // Create bursts of calls
      for (let burst = 0; burst < 10; burst++) {
        for (let i = 0; i < 10; i++) {
          debounced();
        }
        await delay(100); // Wait between bursts
      }
      
      await delay(100); // Final wait
      return { bursts: 10, executions };
    }, 1000, 0.2);
  }

  async testBatchSchedulingPerformance() {
    console.log('📦 Batch Scheduling Performance');
    console.log('--------------------------------');

    await this.benchmark('Batch 1000 delays', async () => {
      const scheduler = delay.batch();
      const promises = [];
      
      for (let i = 0; i < 1000; i++) {
        promises.push(scheduler.add(100));
      }
      
      await Promise.all(promises);
      return { count: 1000 };
    });

    await this.benchmark('Individual 1000 delays', async () => {
      const promises = [];
      
      for (let i = 0; i < 1000; i++) {
        promises.push(delay(100));
      }
      
      await Promise.all(promises);
      return { count: 1000 };
    });
  }

  async testMemoryUsage() {
    console.log('💾 Memory Usage Test');
    console.log('--------------------');

    const getMemoryUsage = () => {
      if (global.gc) {
        global.gc();
      }
      return process.memoryUsage();
    };

    await this.benchmark('Memory usage with 10000 delays', async () => {
      const before = getMemoryUsage();
      
      const promises = [];
      for (let i = 0; i < 10000; i++) {
        promises.push(delay(1)); // Very short delays
      }
      
      await Promise.all(promises);
      
      const after = getMemoryUsage();
      
      return {
        heapUsedBefore: Math.round(before.heapUsed / 1024 / 1024) + 'MB',
        heapUsedAfter: Math.round(after.heapUsed / 1024 / 1024) + 'MB',
        heapDelta: Math.round((after.heapUsed - before.heapUsed) / 1024) + 'KB'
      };
    });
  }

  async testConcurrentDelays() {
    console.log('🔀 Concurrent Delays Test');
    console.log('--------------------------');

    await this.benchmark('1000 concurrent 100ms delays', async () => {
      const promises = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(delay(100));
      }
      await Promise.all(promises);
      return { count: 1000 };
    }, 100, 0.2);

    await this.benchmark('Mixed duration concurrent delays', async () => {
      const durations = [50, 100, 150, 200, 250];
      const promises = [];
      
      for (let i = 0; i < 1000; i++) {
        const duration = durations[i % durations.length];
        promises.push(delay(duration));
      }
      
      await Promise.all(promises);
      return { count: 1000, maxDuration: 250 };
    }, 250, 0.2);
  }

  async testTimeParsingPerformance() {
    console.log('📝 Time Parsing Performance');
    console.log('----------------------------');

    const timeStrings = [
      '100ms', '2s', '5m', '1h', '1d',
      '1h 30m', '2m 30s', '1d 2h 30m 45s',
      '500 milliseconds', '2 seconds', '5 minutes'
    ];

    await this.benchmark('Parse 10000 time strings', async () => {
      let parsed = 0;
      for (let i = 0; i < 10000; i++) {
        const timeStr = timeStrings[i % timeStrings.length];
        await delay.for(timeStr);
        parsed++;
      }
      return { parsed };
    });
  }

  printSummary() {
    console.log('📋 BENCHMARK SUMMARY');
    console.log('====================');
    console.log(`Total Tests: ${this.totalTests}`);
    console.log(`Passed: ${this.passedTests}`);
    console.log(`Failed: ${this.totalTests - this.passedTests}`);
    console.log(`Success Rate: ${Math.round((this.passedTests / this.totalTests) * 100)}%`);
    console.log('');

    // Show slowest operations
    const sortedResults = this.results
      .filter(r => r.elapsed > 100)
      .sort((a, b) => b.elapsed - a.elapsed)
      .slice(0, 5);

    if (sortedResults.length > 0) {
      console.log('🐌 Slowest Operations:');
      sortedResults.forEach((result, index) => {
        console.log(`${index + 1}. ${result.name}: ${result.elapsed}ms`);
      });
      console.log('');
    }

    // Show fastest operations
    const fastResults = this.results
      .filter(r => r.elapsed < 100 && r.elapsed > 0)
      .sort((a, b) => a.elapsed - b.elapsed)
      .slice(0, 5);

    if (fastResults.length > 0) {
      console.log('⚡ Fastest Operations:');
      fastResults.forEach((result, index) => {
        console.log(`${index + 1}. ${result.name}: ${result.elapsed}ms`);
      });
      console.log('');
    }

    // Performance recommendations
    console.log('💡 Performance Recommendations:');
    
    const progressOverhead = this.results.find(r => r.name.includes('heavy progress'));
    if (progressOverhead && progressOverhead.elapsed > 1100) {
      console.log('- Consider using longer progress intervals for heavy callbacks');
    }

    const batchResult = this.results.find(r => r.name.includes('Batch 1000'));
    const individualResult = this.results.find(r => r.name.includes('Individual 1000'));
    if (batchResult && individualResult && batchResult.elapsed < individualResult.elapsed) {
      console.log('- Use batch scheduling for multiple concurrent delays');
    }

    console.log('- Use cancellable delays for long-running operations');
    console.log('- Consider throttling/debouncing for high-frequency operations');
    console.log('- Monitor memory usage with very large numbers of concurrent delays');
    
    console.log('\n✅ Benchmark completed!');
  }
}

// Run the benchmark
async function runBenchmark() {
  try {
    const benchmark = new PerformanceBenchmark();
    await benchmark.run();
  } catch (error) {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  runBenchmark();
}

module.exports = { PerformanceBenchmark };