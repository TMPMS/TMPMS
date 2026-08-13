import { describe, it, expect } from 'vitest';
import { formatDateVN, formatDateTimeVN, formatTimeVN } from './dateUtils';

describe('formatDateVN', () => {
  it('formats an ISO date as dd/MM/yyyy', () => {
    expect(formatDateVN('2026-08-13T00:00:00')).toBe('13/08/2026');
  });

  it('returns empty string for falsy input', () => {
    expect(formatDateVN('')).toBe('');
    expect(formatDateVN(null)).toBe('');
    expect(formatDateVN(undefined)).toBe('');
  });

  it('returns the raw value when it cannot be parsed as a date', () => {
    expect(formatDateVN('not-a-date')).toBe('not-a-date');
  });
});

describe('formatDateTimeVN', () => {
  it('formats an ISO datetime as dd/MM/yyyy HH:mm', () => {
    expect(formatDateTimeVN('2026-08-13T09:05:00')).toBe('13/08/2026 09:05');
  });

  it('pads single-digit day/month/hour/minute', () => {
    expect(formatDateTimeVN('2026-01-02T03:04:00')).toBe('02/01/2026 03:04');
  });

  it('returns empty string for falsy input', () => {
    expect(formatDateTimeVN(null)).toBe('');
  });
});

describe('formatTimeVN', () => {
  it('formats just the time part as HH:mm', () => {
    expect(formatTimeVN('2026-08-13T14:30:00')).toBe('14:30');
  });

  it('returns empty string for invalid input', () => {
    expect(formatTimeVN('garbage')).toBe('');
    expect(formatTimeVN(null)).toBe('');
  });
});
