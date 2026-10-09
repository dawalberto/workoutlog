import { describe, expect, it, vi } from 'vitest';
import {
  createBillingPortalSession,
  createBillingCheckoutSession,
  getBillingReturnPath,
  getBillingReturnStatus,
} from '../../src/services/billing';

describe('billing Checkout client', () => {
  it.each(['monthly', 'annual', 'lifetime'] as const)(
    'requests the server-priced %s Checkout session',
    async (plan) => {
      const fetchMock = vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              checkoutUrl: 'https://checkout.stripe.com/c/pay/session',
            }),
          ),
      );

      await expect(
        createBillingCheckoutSession(
          'https://api.example.test/',
          'local-session-token',
          plan,
          fetchMock as unknown as typeof fetch,
        ),
      ).resolves.toBe('https://checkout.stripe.com/c/pay/session');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.test/api/v1/billing/checkout',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer local-session-token',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ plan }),
        }),
      );
    },
  );

  it('rejects untrusted or malformed Checkout destinations', async () => {
    for (const checkoutUrl of [
      'https://checkout.stripe.com.attacker.example/session',
      'https://attacker.example/session',
      'javascript:alert(1)',
    ]) {
      const fetchMock = vi.fn(
        async () => new Response(JSON.stringify({ checkoutUrl })),
      );

      await expect(
        createBillingCheckoutSession(
          'https://api.example.test',
          'local-session-token',
          'monthly',
          fetchMock as unknown as typeof fetch,
        ),
      ).rejects.toThrow('Checkout destination is not trusted.');
    }
  });

  it('rejects invalid backend responses and surfaces safe status errors', async () => {
    const invalidResponse = vi.fn(
      async () => new Response(JSON.stringify({ checkoutUrl: 1 })),
    );
    await expect(
      createBillingCheckoutSession(
        'https://api.example.test',
        'local-session-token',
        'monthly',
        invalidResponse as unknown as typeof fetch,
      ),
    ).rejects.toThrow('Invalid Checkout response.');

    const unavailableResponse = vi.fn(
      async () => new Response('{}', { status: 503 }),
    );
    await expect(
      createBillingCheckoutSession(
        'https://api.example.test',
        'local-session-token',
        'monthly',
        unavailableResponse as unknown as typeof fetch,
      ),
    ).rejects.toThrow('El servicio de pagos no está disponible. Inténtalo de nuevo más tarde.');
  });
});

describe('billing portal client', () => {
  it('requests the authenticated Portal and validates its destination', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            portalUrl: 'https://billing.stripe.com/p/session',
          }),
        ),
    );

    await expect(
      createBillingPortalSession(
        'https://api.example.test',
        'local-session-token',
        fetchMock as unknown as typeof fetch,
      ),
    ).resolves.toBe('https://billing.stripe.com/p/session');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/api/v1/billing/portal',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer local-session-token' },
      }),
    );
  });

  it('surfaces missing customer linkage and rejects untrusted Portal URLs', async () => {
    const missingCustomer = vi.fn(async () => new Response('{}', { status: 404 }));
    await expect(
      createBillingPortalSession(
        'https://api.example.test',
        'local-session-token',
        missingCustomer as unknown as typeof fetch,
      ),
    ).rejects.toThrow('No hay una cuenta de pagos vinculada a tu usuario.');

    const untrustedPortal = vi.fn(
      async () =>
        new Response(JSON.stringify({ portalUrl: 'https://attacker.example/' })),
    );
    await expect(
      createBillingPortalSession(
        'https://api.example.test',
        'local-session-token',
        untrustedPortal as unknown as typeof fetch,
      ),
    ).rejects.toThrow('Portal destination is not trusted.');
  });
});

describe('billing return paths', () => {
  it.each([
    ['/workoutlog/billing/success', '/workoutlog/', 'success'],
    ['/workoutlog/billing/cancel/', '/workoutlog/', 'cancel'],
    ['/billing/success', '/', 'success'],
    ['/billing/cancel/', '/', 'cancel'],
    ['/billing/success', '/workoutlog/', null],
    ['/workoutlog/routines', '/workoutlog/', null],
  ] as const)('recognizes %s under base %s as %s', (pathname, basePath, expected) => {
    expect(getBillingReturnStatus(pathname, basePath)).toBe(expected);
  });

  it.each([
    ['/workoutlog/billing/success', '/workoutlog/', '/workoutlog/'],
    ['/billing/cancel/', '/', '/'],
    ['/workoutlog/routines', '/workoutlog/', '/workoutlog/routines'],
  ] as const)('clears the billing return suffix from %s under %s', (pathname, basePath, expected) => {
    expect(getBillingReturnPath(pathname, basePath)).toBe(expected);
  });

  it('uses Vite BASE_URL when no explicit base is provided', () => {
    const basePrefix =
      import.meta.env.BASE_URL === '/'
        ? ''
        : import.meta.env.BASE_URL.replace(/\/+$/, '');

    expect(
      getBillingReturnStatus(`${basePrefix}/billing/success`),
    ).toBe('success');
    expect(getBillingReturnStatus(`${basePrefix}/routines`)).toBeNull();
  });
});
