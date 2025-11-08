import { RepeatController } from '../types/index.js';
import { validateFunction, validateDelay } from '../utils/validation.js';

export function createRepeatDelay<T>(
  fn: () => T | Promise<T>,
  interval: number
): RepeatController {
  validateFunction(fn, 'repeat function');
  validateDelay(interval);

  let isRunning = true;
  let isPaused = false;
  let timeoutId: NodeJS.Timeout | number | undefined;

  const executeNext = async (): Promise<void> => {
    if (!isRunning) {
      return;
    }

    if (!isPaused) {
      try {
        await fn();
      } catch (error) {
        // Continue repeating even if the function throws an error
        console.error('Error in repeat function:', error);
      }
    }

    if (isRunning) {
      timeoutId = setTimeout(executeNext, interval);
    }
  };

  // Start the first execution
  void executeNext();

  return {
    stop(): void {
      isRunning = false;
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
    },

    pause(): void {
      isPaused = true;
    },

    resume(): void {
      isPaused = false;
    },

    isPaused(): boolean {
      return isPaused;
    },

    isStopped(): boolean {
      return !isRunning;
    },
  };
}

export function createIntervalDelay<T>(
  fn: () => T | Promise<T>,
  interval: number
): RepeatController {
  validateFunction(fn, 'interval function');
  validateDelay(interval);

  let isRunning = true;
  let isPaused = false;
  let intervalId: NodeJS.Timeout | number | undefined;

  const wrappedFn = async (): Promise<void> => {
    if (!isPaused && isRunning) {
      try {
        await fn();
      } catch (error) {
        console.error('Error in interval function:', error);
      }
    }
  };

  intervalId = setInterval(wrappedFn, interval);

  return {
    stop(): void {
      isRunning = false;
      if (intervalId !== undefined) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
    },

    pause(): void {
      isPaused = true;
    },

    resume(): void {
      isPaused = false;
    },

    isPaused(): boolean {
      return isPaused;
    },

    isStopped(): boolean {
      return !isRunning;
    },
  };
}

export class RepeatManager {
  private controllers: Set<RepeatController> = new Set();

  add(controller: RepeatController): void {
    this.controllers.add(controller);
  }

  stopAll(): void {
    this.controllers.forEach(controller => controller.stop());
    this.controllers.clear();
  }

  pauseAll(): void {
    this.controllers.forEach(controller => controller.pause());
  }

  resumeAll(): void {
    this.controllers.forEach(controller => controller.resume());
  }

  getActiveCount(): number {
    return Array.from(this.controllers).filter(c => !c.isStopped()).length;
  }

  cleanup(): void {
    this.controllers.forEach(controller => {
      if (controller.isStopped()) {
        this.controllers.delete(controller);
      }
    });
  }
}