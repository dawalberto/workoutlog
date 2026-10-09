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

export async function createBillingPortalSession(
  apiOrigin: string,
  accessToken: string,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  const origin = apiOrigin.trim().replace(/\/+$/, '');
  if (!origin) throw new Error('Backend API origin is not configured.');

  const response = await fetcher(`${origin}/api/v1/billing/portal`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(portalErrorMessage(response.status));
  }

  const payload: unknown = await response.json();
  if (
    !payload ||
    typeof payload !== 'object' ||
    !('portalUrl' in payload) ||
    typeof payload.portalUrl !== 'string'
  ) {
    throw new Error('Invalid Billing Portal response.');
  }
  if (!isTrustedStripeDestination(payload.portalUrl, 'billing.stripe.com')) {
    throw new Error('Portal destination is not trusted.');
  }

  return payload.portalUrl;
}

export function getBillingReturnStatus(
  pathname: string,
  basePath = import.meta.env.BASE_URL,
): BillingReturnStatus | null {
  const match = getBillingReturnMatch(pathname, basePath);
  return match?.[1] === 'success' || match?.[1] === 'cancel' ? match[1] : null;
}

export function getBillingReturnPath(
  pathname: string,
  basePath = import.meta.env.BASE_URL,
): string {
  return getBillingReturnMatch(pathname, basePath)
    ? `${getBasePathPrefix(basePath) || ''}/`
    : pathname;
}

function getBillingReturnMatch(
  pathname: string,
  basePath: string,
): RegExpMatchArray | null {
  const prefix = getBasePathPrefix(basePath);
  if (prefix && !pathname.startsWith(`${prefix}/`)) return null;
  const appPath = prefix ? pathname.slice(prefix.length) : pathname;
  return appPath.match(/^\/billing\/(success|cancel)\/?$/);
}

function getBasePathPrefix(basePath: string): string {
  const normalized = basePath.trim().replace(/\/+$/, '');
  return normalized && normalized !== '/'
    ? normalized.startsWith('/')
      ? normalized
      : `/${normalized}`
    : '';
}

function checkoutErrorMessage(status: number): string {
  if (status === 401) return 'Tu sesión ha caducado. Inicia sesión de nuevo.';
  if (status === 503) {
    return 'El servicio de pagos no está disponible. Inténtalo de nuevo más tarde.';
  }
  return 'No se pudo iniciar el pago. Inténtalo de nuevo.';
}

function portalErrorMessage(status: number): string {
  if (status === 401) return 'Tu sesión ha caducado. Inicia sesión de nuevo.';
  if (status === 404) {
    return 'No hay una cuenta de pagos vinculada a tu usuario.';
  }
  if (status === 503) {
    return 'El portal de pagos no está disponible. Inténtalo de nuevo más tarde.';
  }
  return 'No se pudo abrir el portal de pagos. Inténtalo de nuevo.';
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
