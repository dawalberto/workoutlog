import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ExerciseThumbnail } from '../src/components/ExerciseThumbnail';

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
});
