import { describe, expect, it, vi } from 'vitest';
import {
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

describe('billing return paths', () => {
  it.each([
    ['/billing/success', 'success'],
    ['/billing/cancel', 'cancel'],
    ['/app/billing/success/', 'success'],
    ['/routines', null],
  ] as const)('recognizes %s as %s', (pathname, expected) => {
    expect(getBillingReturnStatus(pathname)).toBe(expected);
  });

  it.each([
    ['/billing/success', '/'],
    ['/app/billing/cancel/', '/app'],
    ['/routines', '/routines'],
  ])('clears the billing return suffix from %s', (pathname, expected) => {
    expect(getBillingReturnPath(pathname)).toBe(expected);
  });
});
