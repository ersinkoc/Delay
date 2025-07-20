import { DelayError, DelayErrorCode, TimeUnit } from '../types/index.js';

export const TIME_UNITS: Record<TimeUnit, number> = {
  ms: 1,
  milliseconds: 1,
  s: 1000,
  seconds: 1000,
  m: 60 * 1000,
  minutes: 60 * 1000,
  h: 60 * 60 * 1000,
  hours: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  days: 24 * 60 * 60 * 1000,
};

export function convertToMs(value: number, unit: TimeUnit): number {
  const multiplier = TIME_UNITS[unit];
  if (multiplier === undefined) {
    throw new DelayError(
      `Invalid time unit: ${unit}`,
      DelayErrorCode.INVALID_TIME,
      { unit, value }
    );
  }
  return value * multiplier;
}

export function parseTimeString(timeString: string): number {
  if (typeof timeString !== 'string') {
    throw new DelayError(
      'Time string must be a string',
      DelayErrorCode.INVALID_TIME_STRING,
      { timeString }
    );
  }

  const cleaned = timeString.trim().toLowerCase();
  
  // Handle pure numbers (assume milliseconds)
  if (/^\d+(\.\d+)?$/.test(cleaned)) {
    return parseFloat(cleaned);
  }

  // Pattern: number followed by unit, with optional whitespace
  const pattern = /(\d+(?:\.\d+)?)\s*([a-z]+)/g;
  const matches = [...cleaned.matchAll(pattern)];

  if (matches.length === 0) {
    throw new DelayError(
      `Invalid time string format: ${timeString}`,
      DelayErrorCode.INVALID_TIME_STRING,
      { timeString }
    );
  }

  let totalMs = 0;

  for (const match of matches) {
    const value = parseFloat(match[1]!);
    const unitStr = match[2]!;
    
    let unit: TimeUnit;
    
    // Normalize unit names
    switch (unitStr) {
      case 'ms':
      case 'millisecond':
      case 'milliseconds':
        unit = 'ms';
        break;
      case 's':
      case 'sec':
      case 'second':
      case 'seconds':
        unit = 's';
        break;
      case 'm':
      case 'min':
      case 'minute':
      case 'minutes':
        unit = 'm';
        break;
      case 'h':
      case 'hr':
      case 'hour':
      case 'hours':
        unit = 'h';
        break;
      case 'd':
      case 'day':
      case 'days':
        unit = 'd';
        break;
      default:
        throw new DelayError(
          `Unknown time unit: ${unitStr}`,
          DelayErrorCode.INVALID_TIME_STRING,
          { timeString, unit: unitStr }
        );
    }

    totalMs += convertToMs(value, unit);
  }

  return totalMs;
}

export function parseTimeUntil(target: string): number {
  const now = new Date();
  
  // Handle time format like "14:30" or "2:30 PM"
  const timePattern = /^(\d{1,2}):(\d{2})(?:\s*(am|pm))?$/i;
  const match = target.trim().match(timePattern);
  
  if (!match) {
    throw new DelayError(
      `Invalid time format: ${target}. Expected format: "HH:MM" or "HH:MM AM/PM"`,
      DelayErrorCode.INVALID_TIME_STRING,
      { target }
    );
  }

  let hours = parseInt(match[1]!, 10);
  const minutes = parseInt(match[2]!, 10);
  const ampm = match[3]?.toLowerCase();

  if (minutes < 0 || minutes > 59) {
    throw new DelayError(
      `Invalid minutes: ${minutes}. Must be between 0 and 59`,
      DelayErrorCode.INVALID_TIME_STRING,
      { target, minutes }
    );
  }

  if (ampm) {
    if (hours < 1 || hours > 12) {
      throw new DelayError(
        `Invalid hours for 12-hour format: ${hours}. Must be between 1 and 12`,
        DelayErrorCode.INVALID_TIME_STRING,
        { target, hours }
      );
    }
    
    if (ampm === 'pm' && hours !== 12) {
      hours += 12;
    } else if (ampm === 'am' && hours === 12) {
      hours = 0;
    }
  } else {
    if (hours < 0 || hours > 23) {
      throw new DelayError(
        `Invalid hours for 24-hour format: ${hours}. Must be between 0 and 23`,
        DelayErrorCode.INVALID_TIME_STRING,
        { target, hours }
      );
    }
  }

  const targetTime = new Date(now);
  targetTime.setHours(hours, minutes, 0, 0);

  // If the target time is earlier today, assume it's for tomorrow
  if (targetTime <= now) {
    targetTime.setDate(targetTime.getDate() + 1);
  }

  return targetTime.getTime() - now.getTime();
}

export function getHighResolutionTime(): number {
  if (typeof performance !== 'undefined' && performance.now) {
    return performance.now();
  }
  
  if (typeof process !== 'undefined' && process.hrtime) {
    const hr = process.hrtime();
    return hr[0] * 1000 + hr[1] / 1000000;
  }
  
  return Date.now();
}