import type { SupabaseBrowserClient } from './supabase';

export interface AuthActionResult {
  error: string | null;
}

export interface SignOutFlowResult {
  cancelled: boolean;
  signedOut: boolean;
  cleanupFailed: boolean;
  error: string | null;
}

export interface SignOutFlowOptions {
  syncBeforeSignOut: () => Promise<void>;
  getPendingChanges: () => Promise<number>;
  confirmPendingChanges: (count: number) => Promise<boolean>;
  endSession: () => Promise<AuthActionResult>;
  clearLocalData: () => Promise<void>;
  stopSync?: () => Promise<void>;
  resumeSync?: () => void;
}

export async function runSignOutFlow(
  options: SignOutFlowOptions,
): Promise<SignOutFlowResult> {
  try {
    await options.syncBeforeSignOut();
  } catch {
    // A failed final pass is handled by checking the durable outbox below.
  }

  let pendingChanges: number;
  try {
    pendingChanges = await options.getPendingChanges();
  } catch (error) {
    return {
      cancelled: false,
      signedOut: false,
      cleanupFailed: false,
      error: errorMessage(error),
    };
  }

  if (
    pendingChanges > 0 &&
    !(await options.confirmPendingChanges(pendingChanges))
  ) {
    return { cancelled: true, signedOut: false, cleanupFailed: false, error: null };
  }

  try {
    await options.stopSync?.();
  } catch (error) {
    options.resumeSync?.();
    return {
      cancelled: false,
      signedOut: false,
      cleanupFailed: false,
      error: errorMessage(error),
    };
  }

  let result: AuthActionResult;
  try {
    result = await options.endSession();
  } catch (error) {
    options.resumeSync?.();
    return {
      cancelled: false,
      signedOut: false,
      cleanupFailed: false,
      error: errorMessage(error),
    };
  }
  if (result.error) {
    options.resumeSync?.();
    return { cancelled: false, signedOut: false, cleanupFailed: false, error: result.error };
  }

  try {
    await options.clearLocalData();
    return { cancelled: false, signedOut: true, cleanupFailed: false, error: null };
  } catch (error) {
    return {
      cancelled: false,
      signedOut: false,
      cleanupFailed: true,
      error: `No se pudieron eliminar por completo los datos locales. Reintenta la limpieza antes de continuar. ${errorMessage(error)}`,
    };
  }
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
