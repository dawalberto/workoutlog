import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ExerciseThumbnail } from '../src/components/ExerciseThumbnail';
import { EXERCISE_IMAGE_LIBRARY } from '../src/utils/exerciseImages';

describe('ExerciseThumbnail', () => {
  it('shows the dumbbell placeholder with the exercise initials when there is no image', () => {
    const markup = renderToStaticMarkup(<ExerciseThumbnail name="Push up" imageUrl="" />);

    expect(markup).toContain('lucide-dumbbell');
    expect(markup).toContain('>PU<');
    expect(markup).not.toContain('<img');
  });

  it('renders the image and keeps the initials fallback behind it', () => {
    const markup = renderToStaticMarkup(
      <ExerciseThumbnail name="Remo con Barra" imageUrl="https://example.test/row.jpg" />,
    );

    expect(markup).toContain('src="https://example.test/row.jpg"');
    expect(markup).toContain('alt="Remo con Barra"');
    // Fallback stays mounted so it is revealed once a broken image hides itself.
    expect(markup).toContain('lucide-dumbbell');
    expect(markup).toContain('>RB<');
  });

  it('resolves a library key to the bundled asset URL', () => {
    const backSquat = EXERCISE_IMAGE_LIBRARY.find((option) => option.value === 'library:back-squat');
    const markup = renderToStaticMarkup(
      <ExerciseThumbnail name="Sentadilla" imageUrl="library:back-squat" />,
    );

    expect(backSquat).toBeDefined();
    expect(markup).toContain(`src="${backSquat!.url}"`);
    expect(markup).not.toContain('src="library:back-squat"');
  });

  it('shows the initials fallback when a library key no longer maps to a file', () => {
    const markup = renderToStaticMarkup(
      <ExerciseThumbnail name="Sentadilla" imageUrl="library:removed-image" />,
    );

    expect(markup).not.toContain('<img');
    expect(markup).toContain('>S<');
  });
});
