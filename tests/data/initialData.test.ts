import { describe, expect, it } from 'vitest';
import {
  getStarterData,
  INITIAL_EXERCISE_DEFINITIONS,
  INITIAL_ROUTINES,
} from '../../src/data/initialData';
import {
  EXERCISE_IMAGE_LIBRARY,
  EXERCISE_LIBRARY_PREFIX,
  exerciseLibrarySlug,
} from '../../src/utils/exerciseImages';

const FILTER_CATEGORIES = ['Pecho', 'Espalda', 'Pierna', 'Hombro', 'Brazos', 'Core'];
const libraryKeys = new Set(EXERCISE_IMAGE_LIBRARY.map((option) => option.value));

describe('first-run starter data', () => {
  it('ships two editable upper/lower routines with seven exercises each', () => {
    expect(INITIAL_ROUTINES.map((routine) => routine.name)).toEqual(['Tren superior', 'Tren inferior']);
    for (const routine of INITIAL_ROUTINES) {
      expect(routine.exercises).toHaveLength(7);
      expect(routine.notes).toBeTruthy();
    }
    expect(INITIAL_EXERCISE_DEFINITIONS).toHaveLength(14);
  });

  it('uses unique starter ids and Spanish muscle-group categories', () => {
    const ids = INITIAL_EXERCISE_DEFINITIONS.map((definition) => definition.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const definition of INITIAL_EXERCISE_DEFINITIONS) {
      expect(definition.id.startsWith('starter-')).toBe(true);
      expect(definition.category).toBeTruthy();
      expect(FILTER_CATEGORIES).toContain(definition.category);
      expect(definition.categories).toEqual([definition.category]);
    }
  });

  it('gives every definition a technique note, numeric defaults, and a bundled image', () => {
    for (const definition of INITIAL_EXERCISE_DEFINITIONS) {
      expect(definition.notes?.trim().length).toBeGreaterThan(0);
      expect(definition.defaultSetsCount).toBe(3);
      expect(typeof definition.defaultReps).toBe('number');
      expect(typeof definition.defaultWeight).toBe('number');
      expect(definition.defaultWeight).toBeGreaterThanOrEqual(0);
      expect(typeof definition.defaultRestSeconds).toBe('number');

      const imageUrl = definition.imageUrl ?? '';
      const slug = exerciseLibrarySlug(imageUrl);
      expect(slug).not.toBeNull();
      expect(libraryKeys.has(`${EXERCISE_LIBRARY_PREFIX}${slug}`)).toBe(true);
    }
  });

  it('mirrors each catalog definition into exactly one routine exercise', () => {
    const definitionsById = new Map(
      INITIAL_EXERCISE_DEFINITIONS.map((definition) => [definition.id, definition] as const),
    );
    const usedDefinitionIds: string[] = [];

    for (const routine of INITIAL_ROUTINES) {
      for (const exercise of routine.exercises) {
        const definition = definitionsById.get(exercise.definitionId ?? '');
        expect(definition).toBeDefined();
        usedDefinitionIds.push(exercise.definitionId!);

        expect(exercise.name).toBe(definition!.name);
        expect(exercise.category).toBe(definition!.category);
        expect(exercise.imageUrl).toBe(definition!.imageUrl);
        expect(exercise.notes).toBe(definition!.notes);

        expect(exercise.sets).toHaveLength(3);
        exercise.sets.forEach((set, index) => {
          expect(set.setNumber).toBe(index + 1);
          expect(typeof set.reps).toBe('number');
          expect(typeof set.weight).toBe('number');
          expect(typeof set.restSeconds).toBe('number');
        });
      }
    }

    expect(usedDefinitionIds.sort()).toEqual(
      INITIAL_EXERCISE_DEFINITIONS.map((definition) => definition.id).sort(),
    );
  });

  it('seeds the technician weights chosen as the midpoint of each range', () => {
    const weightsById = Object.fromEntries(
      INITIAL_EXERCISE_DEFINITIONS.map((definition) => [definition.id, definition.defaultWeight]),
    );

    expect(weightsById).toMatchObject({
      'starter-machine-chest-press': 20,
      'starter-lat-pulldown': 25,
      'starter-calf-raises': 0,
      'starter-leg-press': 50,
    });
  });

  it('returns detached clones so seeded records cannot mutate the fixtures', () => {
    const first = getStarterData();
    first.routines[0]!.name = 'Mutated';
    first.routines[0]!.exercises[0]!.sets[0]!.weight = 999;
    first.catalog[0]!.name = 'Mutated';

    const second = getStarterData();
    expect(second.routines[0]!.name).not.toBe('Mutated');
    expect(second.routines[0]!.exercises[0]!.sets[0]!.weight).not.toBe(999);
    expect(second.catalog[0]!.name).not.toBe('Mutated');
  });
});
