import { 
  validateDelay, 
  validateRetryOptions, 
  validateFunction 
} from '../../src/utils/validation';
import { DelayError, DelayErrorCode } from '../../src/types/index';

describe('Validation Utilities', () => {
  describe('validateDelay', () => {
    it('should accept valid delay values', () => {
      expect(() => validateDelay(0)).not.toThrow();
      expect(() => validateDelay(100)).not.toThrow();
      expect(() => validateDelay(1000)).not.toThrow();
      expect(() => validateDelay(50.5)).not.toThrow();
      expect(() => validateDelay(Number.MAX_SAFE_INTEGER)).not.toThrow();
    });

    it('should reject non-number values', () => {
      expect(() => validateDelay('100' as any)).toThrow(DelayError);
      expect(() => validateDelay(null as any)).toThrow(DelayError);
      expect(() => validateDelay(undefined as any)).toThrow(DelayError);
      expect(() => validateDelay({} as any)).toThrow(DelayError);
      expect(() => validateDelay([] as any)).toThrow(DelayError);
      expect(() => validateDelay(true as any)).toThrow(DelayError);
    });

    it('should reject non-finite values', () => {
      expect(() => validateDelay(Infinity)).toThrow(DelayError);
      expect(() => validateDelay(-Infinity)).toThrow(DelayError);
      expect(() => validateDelay(NaN)).toThrow(DelayError);
    });

    it('should reject negative values', () => {
      expect(() => validateDelay(-1)).toThrow(DelayError);
      expect(() => validateDelay(-100)).toThrow(DelayError);
      expect(() => validateDelay(-0.1)).toThrow(DelayError);
    });

    it('should throw DelayError with correct error codes', () => {
      try {
        validateDelay('100' as any);
      } catch (error) {
        expect(error).toBeInstanceOf(DelayError);
        expect((error as DelayError).code).toBe(DelayErrorCode.INVALID_TIME);
        expect((error as DelayError).message).toContain('must be a number');
      }

      try {
        validateDelay(Infinity);
      } catch (error) {
        expect(error).toBeInstanceOf(DelayError);
        expect((error as DelayError).code).toBe(DelayErrorCode.INVALID_TIME);
        expect((error as DelayError).message).toContain('finite number');
      }

      try {
        validateDelay(-100);
      } catch (error) {
        expect(error).toBeInstanceOf(DelayError);
        expect((error as DelayError).code).toBe(DelayErrorCode.NEGATIVE_DELAY);
        expect((error as DelayError).message).toContain('cannot be negative');
      }
    });

    it('should include details in error', () => {
      try {
        validateDelay(-100);
      } catch (error) {
        expect((error as DelayError).details).toEqual({ value: -100 });
      }
    });
  });

  describe('validateRetryOptions', () => {
    it('should accept valid retry options', () => {
      expect(() => validateRetryOptions({ attempts: 3, delay: 1000 })).not.toThrow();
      expect(() => validateRetryOptions({ 
        attempts: 5, 
        delay: 500, 
        backoff: 'linear' 
      })).not.toThrow();
      expect(() => validateRetryOptions({ 
        attempts: 3, 
        delay: (attempt: number) => attempt * 1000 
      })).not.toThrow();
    });

    it('should reject non-object options', () => {
      expect(() => validateRetryOptions(null)).toThrow(DelayError);
      expect(() => validateRetryOptions(undefined)).toThrow(DelayError);
      expect(() => validateRetryOptions('string')).toThrow(DelayError);
      expect(() => validateRetryOptions(123)).toThrow(DelayError);
      expect(() => validateRetryOptions([])).toThrow(DelayError);
    });

    it('should validate attempts field', () => {
      // Invalid attempts
      expect(() => validateRetryOptions({ attempts: 0, delay: 1000 })).toThrow(DelayError);
      expect(() => validateRetryOptions({ attempts: -1, delay: 1000 })).toThrow(DelayError);
      expect(() => validateRetryOptions({ attempts: 'three' as any, delay: 1000 })).toThrow(DelayError);
      expect(() => validateRetryOptions({ attempts: null as any, delay: 1000 })).toThrow(DelayError);
      
      // Valid attempts
      expect(() => validateRetryOptions({ attempts: 1, delay: 1000 })).not.toThrow();
      expect(() => validateRetryOptions({ attempts: 10, delay: 1000 })).not.toThrow();
    });

    it('should validate delay field', () => {
      // Invalid delay types
      expect(() => validateRetryOptions({ 
        attempts: 3, 
        delay: 'one second' as any 
      })).toThrow(DelayError);
      expect(() => validateRetryOptions({ 
        attempts: 3, 
        delay: null as any 
      })).toThrow(DelayError);
      expect(() => validateRetryOptions({ 
        attempts: 3, 
        delay: {} as any 
      })).toThrow(DelayError);

      // Negative delay
      expect(() => validateRetryOptions({ 
        attempts: 3, 
        delay: -1000 
      })).toThrow(DelayError);

      // Valid delays
      expect(() => validateRetryOptions({ 
        attempts: 3, 
        delay: 0 
      })).not.toThrow();
      expect(() => validateRetryOptions({ 
        attempts: 3, 
        delay: 1000 
      })).not.toThrow();
      expect(() => validateRetryOptions({ 
        attempts: 3, 
        delay: (attempt: number) => attempt * 100 
      })).not.toThrow();
    });

    it('should validate backoff field', () => {
      // Invalid backoff
      expect(() => validateRetryOptions({ 
        attempts: 3, 
        delay: 1000, 
        backoff: 'quadratic' as any 
      })).toThrow(DelayError);
      expect(() => validateRetryOptions({ 
        attempts: 3, 
        delay: 1000, 
        backoff: 'fast' as any 
      })).toThrow(DelayError);

      // Valid backoff
      expect(() => validateRetryOptions({ 
        attempts: 3, 
        delay: 1000, 
        backoff: 'linear' 
      })).not.toThrow();
      expect(() => validateRetryOptions({ 
        attempts: 3, 
        delay: 1000, 
        backoff: 'exponential' 
      })).not.toThrow();
    });

    it('should allow undefined delay field', () => {
      expect(() => validateRetryOptions({ attempts: 3 })).not.toThrow();
    });

    it('should allow undefined backoff field', () => {
      expect(() => validateRetryOptions({ 
        attempts: 3, 
        delay: 1000 
      })).not.toThrow();
    });

    it('should throw errors with correct codes and details', () => {
      try {
        validateRetryOptions({ attempts: -1, delay: 1000 });
      } catch (error) {
        expect(error).toBeInstanceOf(DelayError);
        expect((error as DelayError).code).toBe(DelayErrorCode.INVALID_OPTIONS);
        expect((error as DelayError).details).toEqual({ attempts: -1 });
      }

      try {
        validateRetryOptions({ attempts: 3, delay: -1000 });
      } catch (error) {
        expect(error).toBeInstanceOf(DelayError);
        expect((error as DelayError).code).toBe(DelayErrorCode.NEGATIVE_DELAY);
        expect((error as DelayError).details).toEqual({ delay: -1000 });
      }

      try {
        validateRetryOptions({ attempts: 3, delay: 1000, backoff: 'invalid' as any });
      } catch (error) {
        expect(error).toBeInstanceOf(DelayError);
        expect((error as DelayError).code).toBe(DelayErrorCode.INVALID_OPTIONS);
        expect((error as DelayError).details).toEqual({ backoff: 'invalid' });
      }
    });
  });

  describe('validateFunction', () => {
    it('should accept valid functions', () => {
      expect(() => validateFunction(() => {}, 'test function')).not.toThrow();
      expect(() => validateFunction(function() {}, 'named function')).not.toThrow();
      expect(() => validateFunction(async () => {}, 'async function')).not.toThrow();
      expect(() => validateFunction(Date.now, 'built-in function')).not.toThrow();
    });

    it('should reject non-function values', () => {
      expect(() => validateFunction('not a function', 'test')).toThrow(DelayError);
      expect(() => validateFunction(123, 'test')).toThrow(DelayError);
      expect(() => validateFunction({}, 'test')).toThrow(DelayError);
      expect(() => validateFunction([], 'test')).toThrow(DelayError);
      expect(() => validateFunction(null, 'test')).toThrow(DelayError);
      expect(() => validateFunction(undefined, 'test')).toThrow(DelayError);
      expect(() => validateFunction(true, 'test')).toThrow(DelayError);
    });

    it('should throw DelayError with correct details', () => {
      const invalidValue = 'not a function';
      const name = 'test function';
      
      try {
        validateFunction(invalidValue, name);
      } catch (error) {
        expect(error).toBeInstanceOf(DelayError);
        expect((error as DelayError).code).toBe(DelayErrorCode.INVALID_OPTIONS);
        expect((error as DelayError).message).toContain(`${name} must be a function`);
        expect((error as DelayError).details).toEqual({ fn: invalidValue, name });
      }
    });

    it('should handle different function names in error messages', () => {
      try {
        validateFunction(123, 'retry callback');
      } catch (error) {
        expect((error as DelayError).message).toContain('retry callback must be a function');
      }

      try {
        validateFunction({}, 'progress handler');
      } catch (error) {
        expect((error as DelayError).message).toContain('progress handler must be a function');
      }
    });
  });
});