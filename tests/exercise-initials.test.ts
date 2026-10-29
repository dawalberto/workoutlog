import { describe, expect, it } from 'vitest';
import { getExerciseInitials } from '../src/utils/exerciseInitials';

describe('getExerciseInitials', () => {
  it('uses a single letter for a single word', () => {
    expect(getExerciseInitials('Sentadilla')).toBe('S');
    expect(getExerciseInitials('Test')).toBe('T');
  });

  it('uses the first letter of the first two words', () => {
    expect(getExerciseInitials('Push up')).toBe('PU');
  });

  it('ignores Spanish connector words', () => {
    expect(getExerciseInitials('Remo con Barra')).toBe('RB');
    expect(getExerciseInitials('Press de Banca')).toBe('PB');
  });

  it('ignores punctuation and extra spaces', () => {
    expect(getExerciseInitials('  Press de Banca (Plano)  ')).toBe('PB');
  });

  it('returns an empty string when there are no letters or digits', () => {
    expect(getExerciseInitials('')).toBe('');
    expect(getExerciseInitials('   ')).toBe('');
    expect(getExerciseInitials('---')).toBe('');
  });
});
