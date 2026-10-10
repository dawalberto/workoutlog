import type { SupabaseBrowserClient } from './supabase';
import type { BillingPlan } from './billing';

export interface AccountEntitlementResponse {
  userId: string;
  entitlement: {
    tier: string;
    validUntil: string | null;
    activePlanIds: BillingPlan[];
  } | null;
  premium: boolean;
}

export interface AuthActionResult {
  error: string | null;
}

export async function loadAccountEntitlement(
  client: SupabaseBrowserClient,
  userId: string,
): Promise<AccountEntitlementResponse> {
  const { data, error } = await client.rpc('get_sync_entitlement');
  if (error) throw new Error(`Sync entitlement request failed: ${error.message}`);
  const payload = objectValue(data);
  if (!payload || payload.eligible !== true) throw new Error('Invalid sync entitlement response.');
  return {
    userId,
    premium: true,
    entitlement: {
      tier: 'sync',
      validUntil: null,
      activePlanIds: [],
    },
  };
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
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
