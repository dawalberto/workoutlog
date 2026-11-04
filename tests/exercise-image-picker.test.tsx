import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ExerciseImagePicker } from '../src/components/ExerciseImagePicker';
import { ExerciseImageAlbumModal } from '../src/components/ExerciseImageAlbumModal';
import { EXERCISE_IMAGE_LIBRARY } from '../src/utils/exerciseImages';

const backSquat = EXERCISE_IMAGE_LIBRARY.find((option) => option.value === 'library:back-squat');

describe('ExerciseImagePicker', () => {
  it('shows the fallback preview and a call to action when empty', () => {
    const markup = renderToStaticMarkup(
      <ExerciseImagePicker name="Sentadilla" value="" onChange={vi.fn()} />,
    );

    expect(markup).toContain('>Imagen<');
    expect(markup).toContain('Elegir imagen');
    expect(markup).toContain('aria-label="Elegir imagen del ejercicio"');
    expect(markup).toContain('lucide-dumbbell');
    expect(markup).not.toContain('Biblioteca');
    expect(markup).not.toContain('<img');
  });

  it('resolves a library key to the asset URL instead of storing the hashed path', () => {
    const markup = renderToStaticMarkup(
      <ExerciseImagePicker name="Sentadilla" value="library:back-squat" onChange={vi.fn()} />,
    );

    expect(backSquat).toBeDefined();
    expect(markup).toContain('Biblioteca');
    expect(markup).toContain('Cambiar imagen');
    expect(markup).toContain('aria-label="Cambiar imagen del ejercicio"');
    expect(markup).toContain(backSquat!.url);
    expect(markup).not.toContain('src="library:back-squat"');
  });

  it('renders a custom URL directly and does not flag it as a library image', () => {
    const markup = renderToStaticMarkup(
      <ExerciseImagePicker name="Remo" value="https://example.test/row.jpg" onChange={vi.fn()} />,
    );

    expect(markup).toContain('src="https://example.test/row.jpg"');
    expect(markup).toContain('Cambiar imagen');
    expect(markup).not.toContain('Biblioteca');
  });
});

describe('ExerciseImageAlbumModal', () => {
  it('lists every bundled image, the clear option, and the custom URL entry', () => {
    const markup = renderToStaticMarkup(
      <ExerciseImageAlbumModal
        name="Sentadilla"
        value=""
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain('Elegir imagen');
    expect(markup).toContain('Sin imagen (usar iniciales)');
    expect(markup).toContain('O usa una URL propia');
    expect(markup).toContain('placeholder="Buscar imagen..."');
    expect(markup).toContain('placeholder="https://ejemplo.com/imagen.jpg"');
    expect(markup).toContain('Sentadilla Trasera');

    const optionCount = markup.split('aspect-square').length - 1;
    expect(optionCount).toBe(EXERCISE_IMAGE_LIBRARY.length);
    // Empty value marks the "sin imagen" option as selected.
    expect(markup).toContain('aria-pressed="true"');
  });

  it('marks the current library image as selected and seeds the URL field with custom URLs', () => {
    const markup = renderToStaticMarkup(
      <ExerciseImageAlbumModal
        name="Sentadilla"
        value="library:back-squat"
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(markup).toContain(backSquat!.url);
    expect(markup).toContain('aria-pressed="true"');
  });
});
