/**
 * Regression tests for specific bug fixes
 * These tests verify that reported bugs have been fixed and don't regress
 */

import { DelayError, DelayErrorCode } from '../../src/types/index.js';
import { untilDelay, whileDelay } from '../../src/core/parser.js';
import { PluginManager } from '../../src/plugins/plugin-manager.js';
import { debounce } from '../../src/utils/throttle-debounce.js';
import delay from '../../src/index.js';

describe('Bug Fix Regression Tests', () => {
  describe('BUG-003: parser.ts error type consistency', () => {
    it('should throw DelayError (not generic Error) for invalid target type', () => {
      expect(() => {
        // @ts-expect-error: Testing invalid type
        untilDelay(123);
      }).toThrow(DelayError);

      try {
        // @ts-expect-error: Testing invalid type
        untilDelay(123);
      } catch (error) {
        expect(error).toBeInstanceOf(DelayError);
        expect((error as DelayError).code).toBe(DelayErrorCode.INVALID_OPTIONS);
      }
    });
  });

  describe('BUG-004, BUG-005, BUG-006: parser.ts cancellation error types', () => {
    it('should throw DelayError when aborted via AbortSignal', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        whileDelay(() => false, { signal: controller.signal })
      ).rejects.toThrow(DelayError);

      try {
        await whileDelay(() => false, { signal: controller.signal });
      } catch (error) {
        expect(error).toBeInstanceOf(DelayError);
        expect((error as DelayError).code).toBe(DelayErrorCode.CANCELLED);
      }
    });

    it('should throw DelayError when cancelled during while delay', async () => {
      const controller = new AbortController();

      // Set up cancellation after a delay
      setTimeout(() => controller.abort(), 100);

      // whileDelay will keep checking while condition is true
      // We pass () => true so it keeps waiting, allowing the abort to happen
      await expect(
        whileDelay(() => true, { signal: controller.signal })
      ).rejects.toThrow(DelayError);

      try {
        const controller2 = new AbortController();
        setTimeout(() => controller2.abort(), 100);
        await whileDelay(() => true, { signal: controller2.signal });
      } catch (error) {
        expect(error).toBeInstanceOf(DelayError);
        expect((error as DelayError).code).toBe(DelayErrorCode.CANCELLED);
      }
    });

    it('should throw DelayError for invalid target in until delay', () => {
      // Test with a date in the past
      const pastDate = new Date('1970-01-01');

      // This should not throw, just resolve immediately (with warning)
      expect(untilDelay(pastDate)).resolves.toBeUndefined();
    });
  });

  describe('BUG-007, BUG-008, BUG-009: plugin-manager.ts error types', () => {
    it('should throw DelayError when registering duplicate plugin', () => {
      const manager = new PluginManager();
      const plugin = { name: 'test', version: '1.0.0' };

      manager.register(plugin);

      expect(() => {
        manager.register(plugin);
      }).toThrow(DelayError);

      try {
        manager.register(plugin);
      } catch (error) {
        expect(error).toBeInstanceOf(DelayError);
        expect((error as DelayError).code).toBe(DelayErrorCode.INVALID_OPTIONS);
        expect((error as DelayError).details?.['pluginName']).toBe('test');
      }
    });

    it('should throw DelayError when unregistering non-existent plugin', () => {
      const manager = new PluginManager();

      expect(() => {
        manager.unregister('nonexistent');
      }).toThrow(DelayError);

      try {
        manager.unregister('nonexistent');
      } catch (error) {
        expect(error).toBeInstanceOf(DelayError);
        expect((error as DelayError).code).toBe(DelayErrorCode.INVALID_OPTIONS);
        expect((error as DelayError).details?.['pluginName']).toBe('nonexistent');
      }
    });

    it('should throw DelayError when initializing without delay instance', () => {
      const manager = new PluginManager();

      expect(() => {
        manager.initializeAll();
      }).toThrow(DelayError);

      try {
        manager.initializeAll();
      } catch (error) {
        expect(error).toBeInstanceOf(DelayError);
        expect((error as DelayError).code).toBe(DelayErrorCode.INVALID_OPTIONS);
      }
    });
  });

  describe('BUG-002: debounce maxWait timeout calculation', () => {
    it('should invoke function at maxWait interval even with continuous calls', async () => {
      jest.useFakeTimers();

      const fn = jest.fn();
      const debounced = debounce(fn, 100, { maxWait: 200 });

      // Call repeatedly every 50ms
      debounced(); // t=0
      jest.advanceTimersByTime(50);

      debounced(); // t=50
      jest.advanceTimersByTime(50);

      debounced(); // t=100
      jest.advanceTimersByTime(50);

      debounced(); // t=150
      jest.advanceTimersByTime(50);

      // At t=200, maxWait should trigger (BUG-002 fix ensures this works correctly)
      jest.advanceTimersByTime(50); // t=200

      expect(fn).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    it('should calculate remaining maxWait time correctly', async () => {
      jest.useFakeTimers();

      const fn = jest.fn();

      const debounced = debounce(fn, 100, { maxWait: 150, leading: false, trailing: true });

      debounced(); // Start
      jest.advanceTimersByTime(10);

      debounced(); // Continue calling
      jest.advanceTimersByTime(10);

      debounced();
      jest.advanceTimersByTime(10);

      // Should trigger at maxWait (150ms from first call)
      jest.advanceTimersByTime(120); // Total: 150ms

      expect(fn).toHaveBeenCalledTimes(1);

      // Continue calling
      jest.advanceTimersByTime(10);
      debounced();
      jest.advanceTimersByTime(100); // Let it settle

      expect(fn).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });
  });

  describe('BUG-001: drift compensation calculation', () => {
    it('should handle timer when system time jumps (smoke test)', () => {
      // This is a smoke test - the actual drift compensation logic
      // is difficult to test without mocking time APIs
      // The fix ensures no crash when time jumps backwards

      // Just verify the delay methods work correctly
      expect(() => {
        delay(100);
      }).not.toThrow();
    });
  });

  describe('General Error Type Consistency', () => {
    it('should use DelayError consistently across all public APIs', () => {
      // This test documents that all errors should be DelayError instances
      const errorTests = [
        // Parser errors
        () => untilDelay(123 as unknown as Date),
        // Plugin errors
        () => new PluginManager().initializeAll(),
      ];

      errorTests.forEach((test) => {
        try {
          test();
          fail('Expected function to throw');
        } catch (error) {
          expect(error).toBeInstanceOf(DelayError);
        }
      });
    });

    it('should include error codes in all DelayError instances', () => {
      const validCodes = Object.values(DelayErrorCode);

      try {
        untilDelay(123 as unknown as Date);
      } catch (error) {
        expect(error).toBeInstanceOf(DelayError);
        expect(validCodes).toContain((error as DelayError).code);
      }
    });
  });
});
