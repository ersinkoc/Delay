import { 
  parseTimeString, 
  parseTimeUntil, 
  convertToMs,
  getHighResolutionTime,
  TIME_UNITS 
} from '../../src/utils/time';
import { DelayError } from '../../src/types/index';

describe('Time Utilities', () => {
  describe('TIME_UNITS', () => {
    it('should have correct time unit conversions', () => {
      expect(TIME_UNITS.ms).toBe(1);
      expect(TIME_UNITS.milliseconds).toBe(1);
      expect(TIME_UNITS.s).toBe(1000);
      expect(TIME_UNITS.seconds).toBe(1000);
      expect(TIME_UNITS.m).toBe(60 * 1000);
      expect(TIME_UNITS.minutes).toBe(60 * 1000);
      expect(TIME_UNITS.h).toBe(60 * 60 * 1000);
      expect(TIME_UNITS.hours).toBe(60 * 60 * 1000);
      expect(TIME_UNITS.d).toBe(24 * 60 * 60 * 1000);
      expect(TIME_UNITS.days).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe('convertToMs', () => {
    it('should convert different time units to milliseconds', () => {
      expect(convertToMs(1, 'ms')).toBe(1);
      expect(convertToMs(1, 'seconds')).toBe(1000);
      expect(convertToMs(2, 'minutes')).toBe(120000);
      expect(convertToMs(1, 'hours')).toBe(3600000);
      expect(convertToMs(1, 'days')).toBe(86400000);
    });

    it('should handle fractional values', () => {
      expect(convertToMs(1.5, 's')).toBe(1500);
      expect(convertToMs(0.5, 'm')).toBe(30000);
    });

    it('should throw error for invalid units', () => {
      expect(() => convertToMs(1, 'invalid' as any)).toThrow(DelayError);
      expect(() => convertToMs(1, 'invalid' as any)).toThrow('Invalid time unit');
    });
  });

  describe('parseTimeString', () => {
    it('should parse pure numbers as milliseconds', () => {
      expect(parseTimeString('100')).toBe(100);
      expect(parseTimeString('1000')).toBe(1000);
      expect(parseTimeString('50.5')).toBe(50.5);
    });

    it('should parse single time units', () => {
      expect(parseTimeString('100ms')).toBe(100);
      expect(parseTimeString('2s')).toBe(2000);
      expect(parseTimeString('5m')).toBe(300000);
      expect(parseTimeString('1h')).toBe(3600000);
      expect(parseTimeString('1d')).toBe(86400000);
    });

    it('should parse alternative unit names', () => {
      expect(parseTimeString('100 milliseconds')).toBe(100);
      expect(parseTimeString('2 seconds')).toBe(2000);
      expect(parseTimeString('5 minutes')).toBe(300000);
      expect(parseTimeString('1 hour')).toBe(3600000);
      expect(parseTimeString('2 days')).toBe(172800000);
    });

    it('should parse abbreviated unit names', () => {
      expect(parseTimeString('2sec')).toBe(2000);
      expect(parseTimeString('5min')).toBe(300000);
      expect(parseTimeString('1hr')).toBe(3600000);
    });

    it('should parse compound time strings', () => {
      expect(parseTimeString('1h 30m')).toBe(5400000);
      expect(parseTimeString('2m 30s')).toBe(150000);
      expect(parseTimeString('1d 2h 30m 45s')).toBe(95445000);
      expect(parseTimeString('5m 30s 500ms')).toBe(330500);
    });

    it('should handle case insensitive input', () => {
      expect(parseTimeString('1H 30M')).toBe(5400000);
      expect(parseTimeString('2S')).toBe(2000);
      expect(parseTimeString('500MS')).toBe(500);
    });

    it('should handle whitespace variations', () => {
      expect(parseTimeString('1h  30m')).toBe(5400000);
      expect(parseTimeString('  2s  ')).toBe(2000);
      expect(parseTimeString('5 m 30 s')).toBe(330000);
    });

    it('should throw error for invalid formats', () => {
      expect(() => parseTimeString('invalid')).toThrow(DelayError);
      expect(() => parseTimeString('')).toThrow(DelayError);
      expect(() => parseTimeString('abc123')).toThrow(DelayError);
      expect(() => parseTimeString('10xyz')).toThrow(DelayError);
      expect(() => parseTimeString('5 years')).toThrow(DelayError);
    });

    it('should throw error for non-string input', () => {
      expect(() => parseTimeString(null as any)).toThrow(DelayError);
      expect(() => parseTimeString(123 as any)).toThrow(DelayError);
      expect(() => parseTimeString(undefined as any)).toThrow(DelayError);
      expect(() => parseTimeString({} as any)).toThrow(DelayError);
    });

    it('should handle edge cases', () => {
      expect(parseTimeString('0ms')).toBe(0);
      expect(parseTimeString('0')).toBe(0);
      expect(parseTimeString('0.1s')).toBe(100);
    });
  });

  describe('parseTimeUntil', () => {
    it('should parse 24-hour format', () => {
      const now = new Date();
      const targetTime = new Date(now);
      targetTime.setHours(14, 30, 0, 0);
      
      // If target time has passed today, it should be tomorrow
      if (targetTime <= now) {
        targetTime.setDate(targetTime.getDate() + 1);
      }
      
      const expectedMs = targetTime.getTime() - now.getTime();
      const actualMs = parseTimeUntil('14:30');
      
      // Allow small time difference due to execution time
      expect(Math.abs(actualMs - expectedMs)).toBeLessThan(100);
    });

    it('should parse 12-hour format with AM/PM', () => {
      const now = new Date();
      
      // Test 2:30 PM
      const targetTime1 = new Date(now);
      targetTime1.setHours(14, 30, 0, 0);
      if (targetTime1 <= now) {
        targetTime1.setDate(targetTime1.getDate() + 1);
      }
      const expectedMs1 = targetTime1.getTime() - now.getTime();
      const actualMs1 = parseTimeUntil('2:30 PM');
      expect(Math.abs(actualMs1 - expectedMs1)).toBeLessThan(100);
      
      // Test 11:00 AM
      const targetTime2 = new Date(now);
      targetTime2.setHours(11, 0, 0, 0);
      if (targetTime2 <= now) {
        targetTime2.setDate(targetTime2.getDate() + 1);
      }
      const expectedMs2 = targetTime2.getTime() - now.getTime();
      const actualMs2 = parseTimeUntil('11:00 AM');
      expect(Math.abs(actualMs2 - expectedMs2)).toBeLessThan(100);
    });

    it('should handle midnight correctly', () => {
      const now = new Date();
      
      // Test 00:00
      const targetTime1 = new Date(now);
      targetTime1.setHours(0, 0, 0, 0);
      if (targetTime1 <= now) {
        targetTime1.setDate(targetTime1.getDate() + 1);
      }
      const expectedMs1 = targetTime1.getTime() - now.getTime();
      const actualMs1 = parseTimeUntil('00:00');
      expect(Math.abs(actualMs1 - expectedMs1)).toBeLessThan(100);

      // Test 12:00 AM (same as 00:00)
      const actualMs2 = parseTimeUntil('12:00 AM');
      expect(Math.abs(actualMs2 - expectedMs1)).toBeLessThan(100);
    });

    it('should handle noon correctly', () => {
      const now = new Date();
      const targetTime = new Date(now);
      targetTime.setHours(12, 0, 0, 0);
      
      if (targetTime <= now) {
        targetTime.setDate(targetTime.getDate() + 1);
      }
      
      const expectedMs = targetTime.getTime() - now.getTime();
      const actualMs = parseTimeUntil('12:00 PM');
      expect(Math.abs(actualMs - expectedMs)).toBeLessThan(100);
    });

    it('should handle next day if time has passed', () => {
      const now = new Date();
      const targetTime = new Date(now);
      targetTime.setHours(9, 0, 0, 0);
      
      // This should always go to next day if current time > 9:00 AM
      if (targetTime <= now) {
        targetTime.setDate(targetTime.getDate() + 1);
      }
      
      const expectedMs = targetTime.getTime() - now.getTime();
      const actualMs = parseTimeUntil('09:00');
      expect(Math.abs(actualMs - expectedMs)).toBeLessThan(100);
    });

    it('should validate time format', () => {
      expect(() => parseTimeUntil('25:00')).toThrow(DelayError);
      expect(() => parseTimeUntil('12:60')).toThrow(DelayError);
      expect(() => parseTimeUntil('invalid')).toThrow(DelayError);
      expect(() => parseTimeUntil('')).toThrow(DelayError);
    });

    it('should validate minutes range', () => {
      expect(() => parseTimeUntil('12:60')).toThrow(DelayError);
      expect(() => parseTimeUntil('12:-1')).toThrow(DelayError);
    });

    it('should validate hours for 12-hour format', () => {
      expect(() => parseTimeUntil('13:00 AM')).toThrow(DelayError);
      expect(() => parseTimeUntil('0:00 PM')).toThrow(DelayError);
    });

    it('should validate hours for 24-hour format', () => {
      expect(() => parseTimeUntil('24:00')).toThrow(DelayError);
      expect(() => parseTimeUntil('-1:00')).toThrow(DelayError);
    });

    it('should handle AM/PM case variations', () => {
      const now = new Date();
      
      // Test 2:30 PM in different cases
      const targetTime1 = new Date(now);
      targetTime1.setHours(14, 30, 0, 0);
      if (targetTime1 <= now) {
        targetTime1.setDate(targetTime1.getDate() + 1);
      }
      const expectedMs1 = targetTime1.getTime() - now.getTime();
      
      expect(Math.abs(parseTimeUntil('2:30 pm') - expectedMs1)).toBeLessThan(100);
      expect(Math.abs(parseTimeUntil('2:30 PM') - expectedMs1)).toBeLessThan(100);
      
      // Test 2:30 AM
      const targetTime2 = new Date(now);
      targetTime2.setHours(2, 30, 0, 0);
      if (targetTime2 <= now) {
        targetTime2.setDate(targetTime2.getDate() + 1);
      }
      const expectedMs2 = targetTime2.getTime() - now.getTime();
      
      expect(Math.abs(parseTimeUntil('2:30 Am') - expectedMs2)).toBeLessThan(100);
    });
  });

  describe('getHighResolutionTime', () => {
    it('should return a number', () => {
      const time = getHighResolutionTime();
      expect(typeof time).toBe('number');
      expect(time).toBeGreaterThanOrEqual(0);
    });

    it('should return increasing values', () => {
      const time1 = getHighResolutionTime();
      const time2 = getHighResolutionTime();
      expect(time2).toBeGreaterThanOrEqual(time1);
    });

    it('should use performance.now when available', () => {
      const originalPerformance = global.performance;
      global.performance = {
        now: jest.fn(() => 12345.678)
      } as any;

      const time = getHighResolutionTime();
      expect(time).toBe(12345.678);
      expect(performance.now).toHaveBeenCalled();

      global.performance = originalPerformance;
    });

    it('should use process.hrtime when performance.now is not available', () => {
      const originalPerformance = global.performance;
      const originalProcess = global.process;
      
      delete (global as any).performance;
      global.process = {
        hrtime: jest.fn(() => [1, 500000000]) // 1.5 seconds
      } as any;

      const time = getHighResolutionTime();
      expect(time).toBe(1500); // 1.5 seconds in milliseconds
      expect(process.hrtime).toHaveBeenCalled();

      global.performance = originalPerformance;
      global.process = originalProcess;
    });

    it('should fallback to Date.now when neither is available', () => {
      const originalPerformance = global.performance;
      const originalProcess = global.process;
      const originalDateNow = Date.now;
      
      delete (global as any).performance;
      delete (global as any).process;
      Date.now = jest.fn(() => 1640995200000);

      const time = getHighResolutionTime();
      expect(time).toBe(1640995200000);
      expect(Date.now).toHaveBeenCalled();

      global.performance = originalPerformance;
      global.process = originalProcess;
      Date.now = originalDateNow;
    });
  });
});