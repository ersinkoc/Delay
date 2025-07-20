/**
 * Advanced delay usage examples - Retry and Repeat
 * Run with: node examples/advanced-usage/retry-and-repeat.js
 */

const delay = require('@oxog/delay').default;

// Simulate an unreliable API
let apiCallCount = 0;
async function unreliableAPI() {
  apiCallCount++;
  console.log(`📡 API call attempt #${apiCallCount}`);
  
  if (apiCallCount < 3) {
    throw new Error(`Network error (attempt ${apiCallCount})`);
  }
  
  return { data: 'Success!', attempt: apiCallCount };
}

async function retryExample() {
  console.log('🔄 Retry Mechanism Example');
  console.log('==========================\n');

  // Reset counter
  apiCallCount = 0;

  console.log('⏰ Attempting unreliable API with retry...');
  
  try {
    const result = await delay.retry(unreliableAPI, {
      attempts: 5,
      delay: 1000,
      backoff: 'exponential',
      backoffFactor: 2,
      maxDelay: 5000,
      onRetry: (error, attempt) => {
        console.log(`⚠️  Retry attempt ${attempt}: ${error.message}`);
        console.log(`⏳ Waiting before next attempt...`);
      }
    });
    
    console.log(`✅ Success after ${result.attempt} attempts:`, result.data);
  } catch (error) {
    console.log(`❌ Failed after all retry attempts: ${error.message}`);
  }
}

async function conditionalRetryExample() {
  console.log('\n🎯 Conditional Retry Example');
  console.log('============================\n');

  let attempts = 0;
  
  async function flakyService() {
    attempts++;
    
    if (attempts === 1) {
      throw new Error('RATE_LIMITED');
    } else if (attempts === 2) {
      throw new Error('AUTH_ERROR'); // Should not retry this
    } else {
      return 'Success';
    }
  }

  attempts = 0; // Reset

  try {
    const result = await delay.retry(flakyService, {
      attempts: 5,
      delay: 500,
      retryIf: (error) => {
        // Only retry specific errors
        return error.message.includes('RATE_LIMITED') || 
               error.message.includes('TIMEOUT');
      },
      onRetry: (error, attempt) => {
        console.log(`🔍 Checking if should retry "${error.message}": ${error.message.includes('RATE_LIMITED')}`);
      }
    });
    
    console.log('✅ Success:', result);
  } catch (error) {
    console.log(`❌ Failed with non-retryable error: ${error.message}`);
  }
}

async function repeatExample() {
  console.log('\n🔁 Repeat Functionality Example');
  console.log('===============================\n');

  let counter = 0;
  
  async function periodicTask() {
    counter++;
    console.log(`🔄 Periodic task execution #${counter} at ${new Date().toISOString()}`);
    
    // Simulate some work
    await delay(200);
    
    return counter;
  }

  console.log('⏰ Starting periodic task (every 1 second)...');
  const controller = delay.repeat(periodicTask, 1000);

  // Let it run for 3.5 seconds
  await delay(3500);
  
  console.log('⏸️  Pausing periodic task...');
  controller.pause();
  
  await delay(2000);
  
  console.log('▶️  Resuming periodic task...');
  controller.resume();
  
  await delay(2000);
  
  console.log('🛑 Stopping periodic task...');
  controller.stop();
  
  console.log(`📊 Task executed ${counter} times`);
  console.log(`📊 Is paused: ${controller.isPaused()}`);
  console.log(`📊 Is stopped: ${controller.isStopped()}`);
}

async function conditionalDelaysExample() {
  console.log('\n⏳ Conditional Delays Example');
  console.log('=============================\n');

  // Simulate loading state
  let isLoading = true;
  let loadProgress = 0;

  // Simulate progress
  const progressInterval = setInterval(() => {
    loadProgress += 10;
    console.log(`📈 Loading progress: ${loadProgress}%`);
    
    if (loadProgress >= 100) {
      isLoading = false;
      clearInterval(progressInterval);
      console.log('✅ Loading completed!');
    }
  }, 300);

  console.log('⏰ Waiting while loading...');
  await delay.while(() => isLoading);
  console.log('🎉 Loading finished, continuing...');

  // Wait until a specific condition
  let serverStatus = 'starting';
  
  setTimeout(() => {
    serverStatus = 'ready';
    console.log('🚀 Server is now ready!');
  }, 2000);

  console.log('⏰ Waiting until server is ready...');
  await delay.until(() => {
    console.log(`🔍 Checking server status: ${serverStatus}`);
    return serverStatus === 'ready';
  });
  
  console.log('✅ Server is ready, proceeding...');
}

async function timeBasedDelaysExample() {
  console.log('\n🕐 Time-Based Delays Example');
  console.log('============================\n');

  // Wait until a specific time (simulate waiting until 2 seconds from now)
  const targetTime = new Date(Date.now() + 2000);
  console.log(`⏰ Waiting until ${targetTime.toISOString()}...`);
  
  await delay.until(targetTime);
  console.log('✅ Target time reached!');

  // Note: This would normally be used like:
  // await delay.until('14:30'); // Wait until 2:30 PM today
  console.log('💡 In real usage, you could use: await delay.until("14:30")');
}

async function advancedRetryStrategies() {
  console.log('\n🎛️  Advanced Retry Strategies Example');
  console.log('=====================================\n');

  let attemptCount = 0;
  
  async function customDelayFunction() {
    attemptCount++;
    if (attemptCount < 4) {
      throw new Error(`Attempt ${attemptCount} failed`);
    }
    return `Success on attempt ${attemptCount}`;
  }

  attemptCount = 0; // Reset

  // Custom delay function (fibonacci-like progression)
  const result = await delay.retry(customDelayFunction, {
    attempts: 5,
    delay: (attempt) => {
      const delays = [0, 500, 800, 1300, 2100]; // Fibonacci-like
      return delays[attempt - 1] || 3000;
    },
    onRetry: (error, attempt) => {
      console.log(`📊 Custom delay strategy - attempt ${attempt}: ${error.message}`);
    }
  });

  console.log('✅ Advanced retry completed:', result);
}

// Run all examples
async function runAllExamples() {
  try {
    await retryExample();
    await conditionalRetryExample();
    await repeatExample();
    await conditionalDelaysExample();
    await timeBasedDelaysExample();
    await advancedRetryStrategies();
    
    console.log('\n🎉 All advanced examples completed successfully!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  runAllExamples();
}

module.exports = {
  retryExample,
  conditionalRetryExample,
  repeatExample,
  conditionalDelaysExample,
  timeBasedDelaysExample,
  advancedRetryStrategies
};