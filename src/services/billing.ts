export type BillingPlan = 'monthly' | 'annual' | 'lifetime';

export type BillingReturnStatus = 'success' | 'cancel';

export async function createBillingCheckoutSession(
  apiOrigin: string,
  accessToken: string,
  plan: BillingPlan,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  const origin = apiOrigin.trim().replace(/\/+$/, '');
  if (!origin) throw new Error('Backend API origin is not configured.');

  const response = await fetcher(`${origin}/api/v1/billing/checkout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ plan }),
  });
  if (!response.ok) {
    throw new Error(checkoutErrorMessage(response.status));
  }

  const payload: unknown = await response.json();
  if (
    !payload ||
    typeof payload !== 'object' ||
    !('checkoutUrl' in payload) ||
    typeof payload.checkoutUrl !== 'string'
  ) {
    throw new Error('Invalid Checkout response.');
  }
  if (!isTrustedStripeDestination(payload.checkoutUrl, 'checkout.stripe.com')) {
    throw new Error('Checkout destination is not trusted.');
  }

  return payload.checkoutUrl;
}

export function getBillingReturnStatus(pathname: string): BillingReturnStatus | null {
  const match = pathname.match(/\/billing\/(success|cancel)\/?$/);
  return match?.[1] === 'success' || match?.[1] === 'cancel' ? match[1] : null;
}

export function getBillingReturnPath(pathname: string): string {
  return pathname.replace(/\/billing\/(?:success|cancel)\/?$/, '') || '/';
}

function checkoutErrorMessage(status: number): string {
  if (status === 401) return 'Tu sesión ha caducado. Inicia sesión de nuevo.';
  if (status === 503) {
    return 'El servicio de pagos no está disponible. Inténtalo de nuevo más tarde.';
  }
  return 'No se pudo iniciar el pago. Inténtalo de nuevo.';
}

function isTrustedStripeDestination(value: string, hostname: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname === hostname &&
      url.origin === `https://${hostname}` &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
