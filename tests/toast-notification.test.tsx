import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ToastNotification } from '../src/components/ToastNotification';
import { ROUTINE_LIMIT_ERROR_MESSAGE } from '../src/utils/backup';
import {
  resetAppStore,
  seedAppStore,
  useCurrentStateAsServerSnapshot,
} from './store-test-utils';

describe('ToastNotification', () => {
  beforeEach(() => {
    resetAppStore();
    useCurrentStateAsServerSnapshot();
  });

  afterEach(() => {
    resetAppStore();
  });

  it('shows the full routine limit message with a sign-in action for guests', () => {
    seedAppStore({ feedbackMessage: ROUTINE_LIMIT_ERROR_MESSAGE, user: null });

    const html = renderToStaticMarkup(<ToastNotification />);

    expect(html).toContain(ROUTINE_LIMIT_ERROR_MESSAGE);
    expect(html).toContain('Iniciar sesión');
    expect(html).not.toContain('truncate');
  });

  it('hides the sign-in action for signed-in users', () => {
    seedAppStore({
      feedbackMessage: ROUTINE_LIMIT_ERROR_MESSAGE,
      user: { id: 'user-1', email: 'user@example.com' },
    });

    const html = renderToStaticMarkup(<ToastNotification />);

    expect(html).toContain(ROUTINE_LIMIT_ERROR_MESSAGE);
    expect(html).not.toContain('Iniciar sesión');
  });

  it('renders nothing without a feedback message', () => {
    seedAppStore({ feedbackMessage: null });

    expect(renderToStaticMarkup(<ToastNotification />)).toBe('');
  });
});
