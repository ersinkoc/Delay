import { 
  addJitter, 
  randomBetween, 
  calculateBackoffDelay 
} from '../../src/utils/random';
import { DelayError, DelayErrorCode } from '../../src/types/index';

describe('Random Utilities', () => {
  describe('addJitter', () => {
    it('should add jitter within specified range', () => {
      const baseMs = 1000;
      const jitter = 0.1; // 10%
      
      // Run multiple times to test randomness
      for (let i = 0; i < 100; i++) {
        const result = addJitter(baseMs, jitter);
        expect(result).toBeGreaterThanOrEqual(900); // 1000 - 10%
        expect(result).toBeLessThanOrEqual(1100); // 1000 + 10%
      }
    });

    it('should handle zero jitter', () => {
      const result = addJitter(1000, 0);
      expect(result).toBe(1000);
    });

    it('should handle maximum jitter', () => {
      const baseMs = 1000;
      const result = addJitter(baseMs, 1);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(2000);
    });

    it('should never return negative values', () => {
      const baseMs = 100;
      const jitter = 1; // 100% jitter
      
      for (let i = 0; i < 100; i++) {
        const result = addJitter(baseMs, jitter);
        expect(result).toBeGreaterThanOrEqual(0);
      }
    });

    it('should throw error for invalid jitter values', () => {
      expect(() => addJitter(1000, -0.1)).toThrow(DelayError);
      expect(() => addJitter(1000, 1.1)).toThrow(DelayError);
      expect(() => addJitter(1000, -1)).toThrow(DelayError);
      expect(() => addJitter(1000, 2)).toThrow(DelayError);
    });

    it('should throw error with correct error code', () => {
      try {
        addJitter(1000, -0.1);
      } catch (error) {
        expect(error).toBeInstanceOf(DelayError);
        expect((error as DelayError).code).toBe(DelayErrorCode.INVALID_OPTIONS);
        expect((error as DelayError).details).toEqual({ jitter: -0.1 });
      }
    });

    it('should handle edge case values', () => {
      expect(addJitter(0, 0.5)).toBe(0);
      expect(addJitter(1, 0.5)).toBeGreaterThanOrEqual(0.5);
      expect(addJitter(1, 0.5)).toBeLessThanOrEqual(1.5);
    });
  });

  describe('randomBetween', () => {
    it('should return values within specified range', () => {
      const min = 100;
      const max = 200;
      
      for (let i = 0; i < 100; i++) {
        const result = randomBetween(min, max);
        expect(result).toBeGreaterThanOrEqual(min);
        expect(result).toBeLessThanOrEqual(max);
      }
    });

    it('should handle equal min and max values', () => {
      const result = randomBetween(100, 100);
      expect(result).toBe(100);
    });

    it('should handle zero values', () => {
      const result = randomBetween(0, 100);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });

    it('should handle fractional values', () => {
      const result = randomBetween(0.5, 1.5);
      expect(result).toBeGreaterThanOrEqual(0.5);
      expect(result).toBeLessThanOrEqual(1.5);
    });

    it('should throw error when min > max', () => {
      expect(() => randomBetween(200, 100)).toThrow(DelayError);
      expect(() => randomBetween(1, 0)).toThrow(DelayError);
    });

    it('should throw error for negative values', () => {
      expect(() => randomBetween(-100, 100)).toThrow(DelayError);
      expect(() => randomBetween(100, -50)).toThrow(DelayError);
      expect(() => randomBetween(-200, -100)).toThrow(DelayError);
    });

    it('should throw error with correct details', () => {
      try {
        randomBetween(200, 100);
      } catch (error) {
        expect(error).toBeInstanceOf(DelayError);
        expect((error as DelayError).code).toBe(DelayErrorCode.INVALID_OPTIONS);
        expect((error as DelayError).details).toEqual({ min: 200, max: 100 });
      }

      try {
        randomBetween(-100, 100);
      } catch (error) {
        expect(error).toBeInstanceOf(DelayError);
        expect((error as DelayError).code).toBe(DelayErrorCode.NEGATIVE_DELAY);
        expect((error as DelayError).details).toEqual({ min: -100, max: 100 });
      }
    });
  });

  describe('calculateBackoffDelay', () => {
    describe('linear backoff', () => {
      it('should calculate linear backoff correctly', () => {
        expect(calculateBackoffDelay(100, 1, 'linear')).toBe(100);
        expect(calculateBackoffDelay(100, 2, 'linear')).toBe(200);
        expect(calculateBackoffDelay(100, 3, 'linear')).toBe(300);
        expect(calculateBackoffDelay(100, 4, 'linear')).toBe(400);
      });

      it('should respect maxDelay for linear backoff', () => {
        expect(calculateBackoffDelay(100, 5, 'linear', 2, 350)).toBe(350);
        expect(calculateBackoffDelay(100, 10, 'linear', 2, 500)).toBe(500);
      });
    });

    describe('exponential backoff', () => {
      it('should calculate exponential backoff correctly', () => {
        expect(calculateBackoffDelay(100, 1, 'exponential')).toBe(100);
        expect(calculateBackoffDelay(100, 2, 'exponential')).toBe(200);
        expect(calculateBackoffDelay(100, 3, 'exponential')).toBe(400);
        expect(calculateBackoffDelay(100, 4, 'exponential')).toBe(800);
      });

      it('should use custom factor for exponential backoff', () => {
        expect(calculateBackoffDelay(100, 1, 'exponential', 3)).toBe(100);
        expect(calculateBackoffDelay(100, 2, 'exponential', 3)).toBe(300);
        expect(calculateBackoffDelay(100, 3, 'exponential', 3)).toBe(900);
        expect(calculateBackoffDelay(100, 4, 'exponential', 3)).toBe(2700);
      });

      it('should respect maxDelay for exponential backoff', () => {
        expect(calculateBackoffDelay(100, 5, 'exponential', 2, 500)).toBe(500);
        expect(calculateBackoffDelay(100, 10, 'exponential', 2, 1000)).toBe(1000);
      });
    });

    it('should handle zero base delay', () => {
      expect(calculateBackoffDelay(0, 1, 'linear')).toBe(0);
      expect(calculateBackoffDelay(0, 5, 'exponential')).toBe(0);
    });

    it('should handle fractional delays', () => {
      expect(calculateBackoffDelay(100.5, 2, 'linear')).toBe(201);
      expect(calculateBackoffDelay(100.5, 2, 'exponential')).toBe(201);
    });

    it('should handle large attempt numbers', () => {
      const result = calculateBackoffDelay(1, 20, 'exponential', 2, 10000);
      expect(result).toBeLessThanOrEqual(10000);
    });

    it('should throw error for unknown strategy', () => {
      expect(() => calculateBackoffDelay(100, 1, 'unknown' as any)).toThrow(DelayError);
      expect(() => calculateBackoffDelay(100, 1, 'quadratic' as any)).toThrow(DelayError);
    });

    it('should throw error with correct details for unknown strategy', () => {
      try {
        calculateBackoffDelay(100, 1, 'unknown' as any);
      } catch (error) {
        expect(error).toBeInstanceOf(DelayError);
        expect((error as DelayError).code).toBe(DelayErrorCode.INVALID_OPTIONS);
        expect((error as DelayError).details).toEqual({ strategy: 'unknown' });
      }
    });

    it('should handle infinite maxDelay', () => {
      expect(calculateBackoffDelay(100, 10, 'exponential', 2, Infinity)).toBe(51200);
      expect(calculateBackoffDelay(100, 10, 'linear', 2, Infinity)).toBe(1000);
    });

    it('should handle zero maxDelay', () => {
      expect(calculateBackoffDelay(100, 1, 'linear', 2, 0)).toBe(0);
      expect(calculateBackoffDelay(100, 1, 'exponential', 2, 0)).toBe(0);
    });
  });
});