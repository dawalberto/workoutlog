import { describe, expect, it } from 'vitest';
import { formatWeightInput, parseWeightInput } from '../../src/utils/weightInput';

describe('weight input helpers', () => {
  it('parses decimal kilograms with either separator and limits precision to two places', () => {
    expect(parseWeightInput('53,5')).toBe(53.5);
    expect(parseWeightInput('53.5')).toBe(53.5);
    expect(parseWeightInput('1,239')).toBe(1.24);
    expect(parseWeightInput('80')).toBe(80);
  });

  it('rejects incomplete or non-finite input', () => {
    expect(parseWeightInput('')).toBeNull();
    expect(parseWeightInput('53,5,1')).toBeNull();
    expect(parseWeightInput('Infinity')).toBeNull();
    expect(parseWeightInput('abc')).toBeNull();
  });

  it('formats values with a comma and removes trailing zeroes', () => {
    expect(formatWeightInput(53.5)).toBe('53,5');
    expect(formatWeightInput(53.25)).toBe('53,25');
    expect(formatWeightInput(53)).toBe('53');
    expect(formatWeightInput(Number.NaN)).toBe('');
  });
});
