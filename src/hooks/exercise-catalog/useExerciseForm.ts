import { useState, type Dispatch, type SetStateAction } from 'react';
import type { ExerciseDefinition } from '../../types';
import type { ExerciseCatalogFormValues } from '../../utils/exerciseCatalog';

export interface ExerciseFormState extends ExerciseCatalogFormValues {
  setName: Dispatch<SetStateAction<string>>;
  setCategory: Dispatch<SetStateAction<string>>;
  setImageUrl: Dispatch<SetStateAction<string>>;
  setVideoUrl: Dispatch<SetStateAction<string>>;
  setNotes: Dispatch<SetStateAction<string>>;
  setDefaultSets: Dispatch<SetStateAction<number | string>>;
  setDefaultReps: Dispatch<SetStateAction<number | string>>;
  setDefaultWeight: Dispatch<SetStateAction<number | string>>;
  setDefaultRest: Dispatch<SetStateAction<number | string>>;
  imageError: boolean;
  setImageError: Dispatch<SetStateAction<boolean>>;
}

export function useExerciseForm() {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Pecho');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [defaultSets, setDefaultSets] = useState<number | string>(3);
  const [defaultReps, setDefaultReps] = useState<number | string>(10);
  const [defaultWeight, setDefaultWeight] = useState<number | string>(50);
  const [defaultRest, setDefaultRest] = useState<number | string>(90);
  const [imageError, setImageError] = useState(false);

  const reset = (exercise?: ExerciseDefinition) => {
    setName(exercise?.name ?? '');
    setCategory(exercise?.category || 'Pecho');
    setImageUrl(exercise?.imageUrl || '');
    setVideoUrl(exercise?.videoUrl || '');
    setNotes(exercise?.notes || '');
    setDefaultSets(exercise?.defaultSetsCount || 3);
    setDefaultReps(exercise?.defaultReps || 10);
    setDefaultWeight(exercise?.defaultWeight || 50);
    setDefaultRest(exercise?.defaultRestSeconds || 90);
    setImageError(false);
  };

  const form: ExerciseFormState = {
    name,
    setName,
    category,
    setCategory,
    imageUrl,
    setImageUrl,
    videoUrl,
    setVideoUrl,
    notes,
    setNotes,
    defaultSets,
    setDefaultSets,
    defaultReps,
    setDefaultReps,
    defaultWeight,
    setDefaultWeight,
    defaultRest,
    setDefaultRest,
    imageError,
    setImageError,
  };

  return { form, reset };
}
