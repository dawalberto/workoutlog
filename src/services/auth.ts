import type { SupabaseBrowserClient } from './supabase';

export interface AccountEntitlementResponse {
  userId: string;
  entitlement: {
    tier: string;
    validUntil: string | null;
  } | null;
  premium: boolean;
}

export interface AuthActionResult {
  error: string | null;
}

function isAccountEntitlementResponse(value: unknown): value is AccountEntitlementResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  const response = value as Record<string, unknown>;
  if (
    typeof response.userId !== 'string' ||
    response.userId.length === 0 ||
    typeof response.premium !== 'boolean'
  ) {
    return false;
  }
  if (response.entitlement === null) return true;
  if (!response.entitlement || typeof response.entitlement !== 'object') return false;

  const entitlement = response.entitlement as Record<string, unknown>;
  return (
    typeof entitlement.tier === 'string' &&
    (entitlement.validUntil === null || typeof entitlement.validUntil === 'string')
  );
}

export async function loadAccountEntitlement(
  apiOrigin: string,
  accessToken: string,
  fetcher: typeof fetch = fetch,
): Promise<AccountEntitlementResponse> {
  const origin = apiOrigin.trim().replace(/\/+$/, '');
  if (!origin) throw new Error('Backend API origin is not configured.');

  const response = await fetcher(`${origin}/api/v1/account/entitlement`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Account entitlement request failed (${response.status}).`);
  }

  const payload: unknown = await response.json();
  if (!isAccountEntitlementResponse(payload)) {
    throw new Error('Invalid entitlement response.');
  }
  return payload;
}

export function isPremiumEntitlementActive(
  entitlement: AccountEntitlementResponse | null,
  now = Date.now(),
): boolean {
  if (!entitlement?.premium || !entitlement.entitlement) return false;
  const validUntil = entitlement.entitlement.validUntil;
  if (validUntil === null) return true;

  const expiration = Date.parse(validUntil);
  return Number.isFinite(expiration) && expiration > now;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Account operation failed.';
}

export async function signInWithGoogle(
  client: SupabaseBrowserClient | null,
  redirectTo: string,
): Promise<AuthActionResult> {
  if (!client) {
    return {
      error: 'Supabase authentication is not configured. Local use remains available.',
    };
  }

  try {
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    return { error: error?.message ?? null };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function signOut(
  client: SupabaseBrowserClient | null,
): Promise<AuthActionResult> {
  if (!client) {
    return {
      error: 'Supabase authentication is not configured. Local use remains available.',
    };
  }

  try {
    const { error } = await client.auth.signOut();
    return { error: error?.message ?? null };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
