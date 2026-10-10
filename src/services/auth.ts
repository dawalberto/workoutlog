import type { SupabaseBrowserClient } from './supabase';

export interface AuthActionResult {
  error: string | null;
}

export async function loadSyncEligibility(
  client: SupabaseBrowserClient,
): Promise<boolean> {
  const { data, error } = await client.rpc('get_sync_entitlement');
  if (error) throw new Error(`Sync eligibility request failed: ${error.message}`);
  return objectValue(data)?.eligible === true;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Authentication operation failed.';
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
