/**
 * Basic delay usage examples
 * Run with: node examples/basic-usage/simple-delays.js
 */

// For Node.js CommonJS
const delay = require('../../dist/cjs/index.js').default;
// Alternative: After npm install, use: const delay = require('@oxog/delay').default;

async function basicDelaysExample() {
  console.log('🚀 Basic Delays Example');
  console.log('======================\n');

  // Simple millisecond delay
  console.log('⏰ Starting 1 second delay...');
  const start = Date.now();
  await delay(1000);
  console.log(`✅ Completed in ${Date.now() - start}ms\n`);

  // Using time unit helpers
  console.log('⏰ Using time unit helpers...');
  
  console.log('- delay.seconds(2)');
  await delay.seconds(2);
  console.log('✅ 2 seconds completed');
  
  console.log('- delay.minutes(0.05)');
  await delay.minutes(0.05); // 3 seconds
  console.log('✅ 3 seconds completed');

  // Human-friendly syntax
  console.log('\n⏰ Human-friendly time strings...');
  
  console.log('- delay.for("2s")');
  await delay.for('2s');
  console.log('✅ 2 seconds completed');
  
  console.log('- delay.for("3s")');
  await delay.for('3s');
  console.log('✅ 3 seconds completed');

  console.log('\n🎉 All basic delays completed!');
}

async function progressTrackingExample() {
  console.log('\n📊 Progress Tracking Example');
  console.log('============================\n');

  console.log('⏰ Starting 5 second delay with progress tracking...');
  
  await delay(5000, {
    onProgress: (elapsed, total) => {
      const percent = Math.floor((elapsed / total) * 100);
      const bar = '█'.repeat(Math.floor(percent / 5)) + '░'.repeat(20 - Math.floor(percent / 5));
      process.stdout.write(`\r[${bar}] ${percent}% (${elapsed.toFixed(0)}ms / ${total}ms)`);
    },
    progressInterval: 200
  });
  
  console.log('\n✅ Progress tracking completed!');
}

async function cancellationExample() {
  console.log('\n❌ Cancellation Example');
  console.log('=======================\n');

  // Cancellable delay
  console.log('⏰ Starting cancellable 10 second delay...');
  const cancellable = delay.cancellable(10000);
  
  // Cancel after 3 seconds
  setTimeout(() => {
    console.log('\n🛑 Cancelling delay...');
    cancellable.cancel();
  }, 3000);

  try {
    await cancellable;
  } catch (error) {
    console.log(`❌ Delay was cancelled: ${error.message}`);
    console.log(`📊 isCancelled(): ${cancellable.isCancelled()}`);
  }

  // AbortController example
  console.log('\n⏰ Using AbortController...');
  const controller = new AbortController();
  
  // Cancel after 2 seconds
  setTimeout(() => {
    console.log('🛑 Aborting via AbortController...');
    controller.abort();
  }, 2000);

  try {
    await delay(5000, { signal: controller.signal });
  } catch (error) {
    console.log(`❌ Delay was aborted: ${error.message}`);
  }
}

async function randomDelaysExample() {
  console.log('\n🎲 Random Delays Example');
  console.log('========================\n');

  // Random delay with jitter
  console.log('⏰ Random delay with 20% jitter (target: 1000ms)...');
  const start1 = Date.now();
  await delay.random(1000, { jitter: 0.2 });
  console.log(`✅ Completed in ${Date.now() - start1}ms`);

  // Random delay between min and max
  console.log('⏰ Random delay between 500ms and 1500ms...');
  const start2 = Date.now();
  await delay.between(500, 1500);
  console.log(`✅ Completed in ${Date.now() - start2}ms`);
}

// Run all examples
async function runAllExamples() {
  try {
    await basicDelaysExample();
    await progressTrackingExample();
    await cancellationExample();
    await randomDelaysExample();
    
    console.log('\n🎉 All examples completed successfully!');
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
  basicDelaysExample,
  progressTrackingExample,
  cancellationExample,
  randomDelaysExample
};