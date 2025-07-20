/**
 * TypeScript usage examples showing type safety and advanced patterns
 * Run with: npx tsx examples/typescript-usage/type-safe-delays.ts
 */

import delay, {
  DelayOptions,
  CancellableDelay,
  RetryOptions,
  RepeatController,
  DelayError,
  DelayErrorCode,
  ProgressCallback,
  ThrottleOptions,
  DebounceOptions
} from '../../src/index.js';

// Type-safe progress callback
const progressCallback: ProgressCallback = (elapsed: number, total: number): void => {
  const percentage = Math.round((elapsed / total) * 100);
  console.log(`Progress: ${percentage}% (${elapsed.toFixed(0)}ms / ${total}ms)`);
};

async function typeSafeBasicDelays(): Promise<void> {
  console.log('🔒 Type-Safe Basic Delays');
  console.log('=========================\n');

  // Basic delay with options
  const options: DelayOptions = {
    onProgress: progressCallback,
    progressInterval: 500
  };

  console.log('⏰ Starting type-safe delay with progress...');
  await delay(2000, options);
  console.log('✅ Completed!\n');
}

async function typeSafeCancellableDelays(): Promise<void> {
  console.log('❌ Type-Safe Cancellable Delays');
  console.log('===============================\n');

  // Strongly typed cancellable delay
  const cancellable: CancellableDelay<void> = delay.cancellable(3000, {
    onProgress: (elapsed, total) => {
      console.log(`Cancellable delay progress: ${Math.round((elapsed / total) * 100)}%`);
    },
    progressInterval: 300
  });

  // Cancel after 1.5 seconds
  setTimeout(() => {
    console.log('🛑 Cancelling delay...');
    cancellable.cancel();
  }, 1500);

  try {
    await cancellable;
  } catch (error) {
    if (error instanceof DelayError) {
      console.log(`❌ Caught DelayError: ${error.message}`);
      console.log(`📊 Error code: ${error.code}`);
      console.log(`📊 Is cancelled: ${cancellable.isCancelled()}`);
    }
  }
  console.log();
}

async function typeSafeRetryMechanism(): Promise<void> {
  console.log('🔄 Type-Safe Retry Mechanism');
  console.log('============================\n');

  interface ApiResponse {
    data: string;
    attempt: number;
    timestamp: Date;
  }

  let apiAttempts = 0;

  // Type-safe async function for retry
  const fetchData = async (): Promise<ApiResponse> => {
    apiAttempts++;
    console.log(`📡 API attempt #${apiAttempts}`);
    
    if (apiAttempts < 3) {
      throw new Error(`Network timeout (attempt ${apiAttempts})`);
    }
    
    return {
      data: 'User profile data',
      attempt: apiAttempts,
      timestamp: new Date()
    };
  };

  // Strongly typed retry options
  const retryOptions: RetryOptions = {
    attempts: 5,
    delay: 800,
    backoff: 'exponential',
    backoffFactor: 1.5,
    maxDelay: 3000,
    onRetry: (error: Error, attempt: number) => {
      console.log(`⚠️  Retry ${attempt}: ${error.message}`);
    },
    retryIf: (error: Error) => {
      // Only retry network-related errors
      return error.message.includes('Network') || error.message.includes('timeout');
    }
  };

  try {
    const result: ApiResponse = await delay.retry(fetchData, retryOptions);
    console.log('✅ API Success:', {
      data: result.data,
      attempt: result.attempt,
      timestamp: result.timestamp.toISOString()
    });
  } catch (error) {
    console.error('❌ API failed after all retries:', error);
  }
  console.log();
}

async function typeSafeRepeatController(): Promise<void> {
  console.log('🔁 Type-Safe Repeat Controller');
  console.log('==============================\n');

  interface TaskResult {
    taskId: number;
    executedAt: Date;
    data: string;
  }

  let taskCounter = 0;

  // Type-safe repeating task
  const periodicTask = async (): Promise<TaskResult> => {
    taskCounter++;
    const result: TaskResult = {
      taskId: taskCounter,
      executedAt: new Date(),
      data: `Task execution ${taskCounter}`
    };
    
    console.log(`🔄 Executing task #${result.taskId} at ${result.executedAt.toISOString()}`);
    
    // Simulate async work
    await delay(100);
    
    return result;
  };

  console.log('⏰ Starting periodic task...');
  const controller: RepeatController = delay.repeat(periodicTask, 1000);

  // Let it run for 2.5 seconds
  await delay(2500);
  
  console.log('⏸️  Pausing...');
  controller.pause();
  
  await delay(1500);
  
  console.log('▶️  Resuming...');
  controller.resume();
  
  await delay(1500);
  
  console.log('🛑 Stopping...');
  controller.stop();
  
  console.log(`📊 Final status - Paused: ${controller.isPaused()}, Stopped: ${controller.isStopped()}`);
  console.log();
}

async function typeSafeRateLimiting(): Promise<void> {
  console.log('🚦 Type-Safe Rate Limiting');
  console.log('==========================\n');

  // Type-safe function for throttling
  const expensiveOperation = (id: number, data: string): string => {
    console.log(`💸 Expensive operation ${id}: ${data}`);
    return `Result for ${id}: ${data.toUpperCase()}`;
  };

  // Throttle options
  const throttleOptions: ThrottleOptions = {
    leading: true,
    trailing: true
  };

  const throttledOperation = delay.throttle(expensiveOperation, 1000, throttleOptions);

  // Call multiple times - should be throttled
  console.log('⏰ Calling throttled function multiple times...');
  throttledOperation(1, 'first');
  throttledOperation(2, 'second');
  throttledOperation(3, 'third');

  await delay(1200);

  // Debounce example
  const searchFunction = (query: string): void => {
    console.log(`🔍 Searching for: "${query}"`);
  };

  const debounceOptions: DebounceOptions = {
    leading: false,
    trailing: true,
    maxWait: 2000
  };

  const debouncedSearch = delay.debounce(searchFunction, 500, debounceOptions);

  console.log('⏰ Calling debounced search function...');
  debouncedSearch('query1');
  debouncedSearch('query2');
  debouncedSearch('query3');

  await delay(600);
  console.log();
}

async function typeSafeErrorHandling(): Promise<void> {
  console.log('🛡️  Type-Safe Error Handling');
  console.log('============================\n');

  try {
    // This will throw a DelayError
    await delay(-100);
  } catch (error) {
    if (error instanceof DelayError) {
      console.log('✅ Caught DelayError:');
      console.log(`  - Message: ${error.message}`);
      console.log(`  - Code: ${error.code}`);
      console.log(`  - Details:`, error.details);
      
      // Type-safe error code checking
      switch (error.code) {
        case DelayErrorCode.NEGATIVE_DELAY:
          console.log('  - This is a negative delay error');
          break;
        case DelayErrorCode.CANCELLED:
          console.log('  - This is a cancellation error');
          break;
        case DelayErrorCode.TIMEOUT:
          console.log('  - This is a timeout error');
          break;
        default:
          console.log('  - This is another type of delay error');
      }
    } else {
      console.log('❌ Unexpected error type:', error);
    }
  }

  try {
    // Invalid time string
    await delay.for('invalid time string');
  } catch (error) {
    if (error instanceof DelayError && error.code === DelayErrorCode.INVALID_TIME_STRING) {
      console.log('✅ Caught invalid time string error:', error.message);
    }
  }
  console.log();
}

async function typeSafePromiseUtilities(): Promise<void> {
  console.log('🤝 Type-Safe Promise Utilities');
  console.log('==============================\n');

  // Type-safe promise racing
  const slowPromise: Promise<string> = new Promise(resolve => 
    setTimeout(() => resolve('slow result'), 2000)
  );
  
  const fastPromise: Promise<string> = new Promise(resolve => 
    setTimeout(() => resolve('fast result'), 500)
  );

  try {
    console.log('⏰ Racing promises with 1 second timeout...');
    const result: string = await delay.race([slowPromise, fastPromise], 1000);
    console.log('✅ Race result:', result);
  } catch (error) {
    console.log('❌ Race timed out:', error);
  }

  // Type-safe minimum execution time
  const quickTask = async (): Promise<number> => {
    console.log('⚡ Executing quick task...');
    return 42;
  };

  console.log('⏰ Ensuring minimum 1 second execution time...');
  const start = Date.now();
  const result: number = await delay.minimum(quickTask(), 1000);
  const elapsed = Date.now() - start;
  
  console.log(`✅ Result: ${result}, Elapsed: ${elapsed}ms`);
  console.log();
}

// Generic type-safe delay wrapper
async function createTypeSafeDelayWrapper<T>(
  operation: () => Promise<T>,
  delayMs: number,
  options?: DelayOptions
): Promise<T> {
  await delay(delayMs, options);
  return operation();
}

async function typeSafeGenericExample(): Promise<void> {
  console.log('🔧 Type-Safe Generic Example');
  console.log('============================\n');

  interface UserData {
    id: number;
    name: string;
    email: string;
  }

  const fetchUserData = async (): Promise<UserData> => {
    return {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com'
    };
  };

  console.log('⏰ Using generic delay wrapper...');
  const userData: UserData = await createTypeSafeDelayWrapper(
    fetchUserData,
    1000,
    { 
      onProgress: (elapsed, total) => console.log(`Loading user: ${Math.round((elapsed/total)*100)}%`) 
    }
  );

  console.log('✅ User data loaded:', userData);
  console.log();
}

// Main execution function
async function runAllTypeSafeExamples(): Promise<void> {
  try {
    await typeSafeBasicDelays();
    await typeSafeCancellableDelays();
    await typeSafeRetryMechanism();
    await typeSafeRepeatController();
    await typeSafeRateLimiting();
    await typeSafeErrorHandling();
    await typeSafePromiseUtilities();
    await typeSafeGenericExample();
    
    console.log('🎉 All TypeScript examples completed successfully!');
  } catch (error) {
    console.error('❌ Error running TypeScript examples:', error);
    process.exit(1);
  }
}

// Run examples if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTypeSafeExamples();
}

export {
  typeSafeBasicDelays,
  typeSafeCancellableDelays,
  typeSafeRetryMechanism,
  typeSafeRepeatController,
  typeSafeRateLimiting,
  typeSafeErrorHandling,
  typeSafePromiseUtilities,
  typeSafeGenericExample
};