import { describe, expect, it } from 'vitest';
import {
  canCreateRoutine,
  GUEST_ROUTINE_LIMIT,
  isRoutineCountAllowed,
  ROUTINE_LIMIT_ERROR_MESSAGE,
} from '../src/utils/backup';

describe('Guest routine limit', () => {
  it('allows guest routine creation below the three-routine cap', () => {
    expect(canCreateRoutine(2, false)).toBe(true);
    expect(canCreateRoutine(3, false)).toBe(false);
    expect(GUEST_ROUTINE_LIMIT).toBe(3);
  });

  it('rejects merge and overwrite results above the cap without changing existing data', () => {
    expect(isRoutineCountAllowed(3, false)).toBe(true);
    expect(isRoutineCountAllowed(4, false)).toBe(false);
    expect(ROUTINE_LIMIT_ERROR_MESSAGE).toBe(
      'Sin sesión iniciada puedes tener como máximo tres rutinas. Elimina una rutina o inicia sesión para añadir o importar más.',
    );
  });

  it('does not cap signed-in routine creation or backup imports', () => {
    expect(canCreateRoutine(20, true)).toBe(true);
    expect(isRoutineCountAllowed(20, true)).toBe(true);
  });
});
