import { describe, expect, it } from 'vitest';
import { formatSecondsToTime } from '../../src/utils/timeCalculations';

describe('formatSecondsToTime', () => {
  it('rounds fractional estimates to whole seconds', () => {
    expect(formatSecondsToTime(95.14933333333333)).toBe('1m 35s');
    expect(formatSecondsToTime(95.8)).toBe('1m 36s');
    expect(formatSecondsToTime(12.4)).toBe('12s');
  });

  it('carries rounded seconds across minute and hour boundaries', () => {
    expect(formatSecondsToTime(59.8)).toBe('1 min');
    expect(formatSecondsToTime(3599.8)).toBe('1h');
    expect(formatSecondsToTime(0.2)).toBe('0s');
  });
});
