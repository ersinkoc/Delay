import { forDelay, untilDelay, whileDelay } from '../../src/core/parser';
import { parseTimeString, parseTimeUntil } from '../../src/utils/time.js';
import { DelayError } from '../../src/types/index.js';

describe('Time Parsing and Conditional Delays', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('parseTimeString', () => {
    it('should parse simple milliseconds', () => {
      expect(parseTimeString('100')).toBe(100);
      expect(parseTimeString('1000')).toBe(1000);
      expect(parseTimeString('50.5')).toBe(50.5);
    });

    it('should parse milliseconds with unit', () => {
      expect(parseTimeString('100ms')).toBe(100);
      expect(parseTimeString('500 ms')).toBe(500);
      expect(parseTimeString('250milliseconds')).toBe(250);
    });

    it('should parse seconds', () => {
      expect(parseTimeString('1s')).toBe(1000);
      expect(parseTimeString('2 seconds')).toBe(2000);
      expect(parseTimeString('1.5sec')).toBe(1500);
      expect(parseTimeString('0.5 second')).toBe(500);
    });

    it('should parse minutes', () => {
      expect(parseTimeString('1m')).toBe(60000);
      expect(parseTimeString('2 minutes')).toBe(120000);
      expect(parseTimeString('1.5min')).toBe(90000);
      expect(parseTimeString('0.5 minute')).toBe(30000);
    });

    it('should parse hours', () => {
      expect(parseTimeString('1h')).toBe(3600000);
      expect(parseTimeString('2 hours')).toBe(7200000);
      expect(parseTimeString('1.5hr')).toBe(5400000);
      expect(parseTimeString('0.5 hour')).toBe(1800000);
    });

    it('should parse days', () => {
      expect(parseTimeString('1d')).toBe(86400000);
      expect(parseTimeString('2 days')).toBe(172800000);
      expect(parseTimeString('0.5 day')).toBe(43200000);
    });

    it('should parse compound time strings', () => {
      expect(parseTimeString('1h 30m')).toBe(3600000 + 1800000);
      expect(parseTimeString('2m 30s')).toBe(120000 + 30000);
      expect(parseTimeString('1d 2h 30m 45s')).toBe(86400000 + 7200000 + 1800000 + 45000);
      expect(parseTimeString('5m 30s 500ms')).toBe(300000 + 30000 + 500);
    });

    it('should handle case insensitive input', () => {
      expect(parseTimeString('1H 30M')).toBe(3600000 + 1800000);
      expect(parseTimeString('2S')).toBe(2000);
      expect(parseTimeString('500MS')).toBe(500);
    });

    it('should throw error for invalid format', () => {
      expect(() => parseTimeString('invalid')).toThrow(DelayError);
      expect(() => parseTimeString('')).toThrow(DelayError);
      expect(() => parseTimeString('abc123')).toThrow(DelayError);
    });

    it('should throw error for unknown units', () => {
      expect(() => parseTimeString('10xyz')).toThrow(DelayError);
      expect(() => parseTimeString('5 years')).toThrow(DelayError);
    });

    it('should handle non-string input', () => {
      expect(() => parseTimeString(null as any)).toThrow(DelayError);
      expect(() => parseTimeString(123 as any)).toThrow(DelayError);
      expect(() => parseTimeString(undefined as any)).toThrow(DelayError);
    });
  });

  describe('parseTimeUntil', () => {
    beforeAll(() => {
      jest.useFakeTimers();
      // Mock the current time to a specific date
      jest.setSystemTime(new Date('2024-01-01 10:00:00'));
    });
    
    afterAll(() => {
      jest.useRealTimers();
    });

    it('should parse 24-hour format', () => {
      jest.setSystemTime(new Date('2024-01-01 10:00:00'));
      const ms = parseTimeUntil('14:30');
      expect(ms).toBe(4.5 * 60 * 60 * 1000); // 4.5 hours from 10:00 to 14:30
    });

    it('should parse 12-hour format with AM/PM', () => {
      jest.setSystemTime(new Date('2024-01-01 10:00:00'));
      const ms1 = parseTimeUntil('2:30 PM');
      expect(ms1).toBe(4.5 * 60 * 60 * 1000); // 4.5 hours from 10:00 to 14:30
      
      jest.setSystemTime(new Date('2024-01-01 10:00:00'));
      const ms2 = parseTimeUntil('11:00 AM');
      expect(ms2).toBe(1 * 60 * 60 * 1000); // 1 hour from 10:00 to 11:00
    });

    it('should handle next day if time has passed', () => {
      jest.setSystemTime(new Date('2024-01-01 10:00:00'));
      const ms = parseTimeUntil('09:00'); // 9 AM tomorrow
      expect(ms).toBe(23 * 60 * 60 * 1000); // 23 hours until 9 AM next day
    });

    it('should handle midnight correctly', () => {
      jest.setSystemTime(new Date('2024-01-01 10:00:00'));
      const ms1 = parseTimeUntil('00:00');
      expect(ms1).toBe(14 * 60 * 60 * 1000); // 14 hours until midnight

      jest.setSystemTime(new Date('2024-01-01 10:00:00'));
      const ms2 = parseTimeUntil('12:00 AM');
      expect(ms2).toBe(14 * 60 * 60 * 1000); // 14 hours until midnight
    });

    it('should handle noon correctly', () => {
      jest.setSystemTime(new Date('2024-01-01 10:00:00'));
      const ms = parseTimeUntil('12:00 PM');
      expect(ms).toBe(2 * 60 * 60 * 1000); // 2 hours until noon
    });

    it('should throw error for invalid time format', () => {
      expect(() => parseTimeUntil('25:00')).toThrow(DelayError);
      expect(() => parseTimeUntil('12:60')).toThrow(DelayError);
      expect(() => parseTimeUntil('13:00 PM')).toThrow(DelayError);
      expect(() => parseTimeUntil('invalid')).toThrow(DelayError);
    });

    it('should validate minutes range', () => {
      expect(() => parseTimeUntil('12:60')).toThrow(DelayError);
      expect(() => parseTimeUntil('12:-1')).toThrow(DelayError);
    });

    it('should validate hours range for 12-hour format', () => {
      expect(() => parseTimeUntil('13:00 AM')).toThrow(DelayError);
      expect(() => parseTimeUntil('0:00 PM')).toThrow(DelayError);
    });
  });

  describe('forDelay', () => {
    it('should create delay from time string', async () => {
      const promise = forDelay('500ms');
      
      jest.advanceTimersByTime(499);
      expect(promise).not.toHaveResolved();
      
      jest.advanceTimersByTime(1);
      await expect(promise).resolves.toBeUndefined();
    });

    it('should work with compound time strings', async () => {
      const promise = forDelay('1s 500ms');
      
      jest.advanceTimersByTime(1499);
      expect(promise).not.toHaveResolved();
      
      jest.advanceTimersByTime(1);
      await expect(promise).resolves.toBeUndefined();
    });

    it('should handle cancellation', async () => {
      const controller = new AbortController();
      const promise = forDelay('1s', { signal: controller.signal });
      
      jest.advanceTimersByTime(500);
      controller.abort();
      
      await expect(promise).rejects.toThrow(DelayError);
    });
  });

  describe('untilDelay with Date', () => {
    beforeAll(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01 10:00:00'));
    });
    
    afterAll(() => {
      jest.useRealTimers();
    });

    it('should wait until specific date', async () => {
      const targetDate = new Date('2024-01-01 10:00:30'); // 30 seconds later
      const promise = untilDelay(targetDate);
      
      jest.advanceTimersByTime(29000);
      expect(promise).not.toHaveResolved();
      
      jest.advanceTimersByTime(1000);
      await expect(promise).resolves.toBeUndefined();
    });

    it('should resolve immediately if date is in the past', async () => {
      jest.setSystemTime(new Date('2024-01-01 10:00:00'));
      const pastDate = new Date('2024-01-01 09:00:00');
      const promise = untilDelay(pastDate);
      
      // Past date should resolve immediately
      await jest.runOnlyPendingTimersAsync();
      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('untilDelay with time string', () => {
    beforeAll(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01 10:00:00'));
    });
    
    afterAll(() => {
      jest.useRealTimers();
    });

    it('should wait until specific time', async () => {
      jest.setSystemTime(new Date('2024-01-01 10:00:00'));
      const promise = untilDelay('10:01'); // 1 minute later
      
      jest.advanceTimersByTime(59000);
      expect(promise).not.toHaveResolved();
      
      jest.advanceTimersByTime(1000);
      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('untilDelay with predicate', () => {
    it('should wait until predicate returns true', async () => {
      let counter = 0;
      const predicate = () => {
        counter++;
        return counter >= 3;
      };
      
      const promise = untilDelay(predicate);
      
      // Initial check happens immediately
      expect(counter).toBe(1);
      
      jest.advanceTimersByTime(100); // Second check
      expect(counter).toBeGreaterThanOrEqual(2);
      
      jest.advanceTimersByTime(100); // Third check
      await expect(promise).resolves.toBeUndefined();
      expect(counter).toBeGreaterThanOrEqual(3);
    });

    it('should handle predicate errors', async () => {
      const predicate = () => { throw new Error('Predicate error'); };
      const promise = untilDelay(predicate);
      
      jest.advanceTimersByTime(100);
      await expect(promise).rejects.toThrow('Predicate error');
    });

    it('should handle cancellation', async () => {
      const controller = new AbortController();
      const predicate = () => false;
      const promise = untilDelay(predicate, { signal: controller.signal });
      
      jest.advanceTimersByTime(100);
      controller.abort();
      
      await expect(promise).rejects.toThrow('cancelled');
    });
  });

  describe('whileDelay', () => {
    it('should wait while predicate returns true', async () => {
      let counter = 0;
      const predicate = () => {
        counter++;
        return counter < 3;
      };
      
      const promise = whileDelay(predicate);
      
      // Initial check happens immediately
      expect(counter).toBe(1);
      
      jest.advanceTimersByTime(100); // Second check
      expect(counter).toBeGreaterThanOrEqual(2);
      
      jest.advanceTimersByTime(100); // Third check
      await expect(promise).resolves.toBeUndefined();
      expect(counter).toBeGreaterThanOrEqual(3);
    });

    it('should resolve immediately if predicate is initially false', async () => {
      const predicate = () => false;
      const promise = whileDelay(predicate);
      
      await expect(promise).resolves.toBeUndefined();
    });
  });
});

// Helper for promise resolution testing
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveResolved(): R;
    }
  }
}

expect.extend({
  toHaveResolved(received: Promise<any>) {
    const promise = received;
    let resolved = false;
    
    promise.then(() => { resolved = true; }).catch(() => {});
    
    return new Promise((resolve) => {
      setImmediate(() => {
        resolve({
          message: () => resolved 
            ? `Expected promise not to have resolved`
            : `Expected promise to have resolved`,
          pass: resolved,
        });
      });
    });
  },
});