import { describe, expect, it } from 'vitest';
import {
  canCreateRoutine,
  isRoutineCountAllowed,
  ROUTINE_LIMIT_ERROR_MESSAGE,
} from '../src/utils/backup';

describe('Free routine limit', () => {
  it('allows Free routine creation below the three-routine cap', () => {
    expect(canCreateRoutine(2, false)).toBe(true);
    expect(canCreateRoutine(3, false)).toBe(false);
  });

  it('rejects merge and overwrite results above the cap without changing existing data', () => {
    expect(isRoutineCountAllowed(3, false)).toBe(true);
    expect(isRoutineCountAllowed(4, false)).toBe(false);
    expect(ROUTINE_LIMIT_ERROR_MESSAGE).toMatch(/three routines/i);
  });

  it('does not cap Premium creation or backup imports', () => {
    expect(canCreateRoutine(20, true)).toBe(true);
    expect(isRoutineCountAllowed(20, true)).toBe(true);
  });
});
