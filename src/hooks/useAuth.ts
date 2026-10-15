import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  loadSyncEligibility,
  runSignOutFlow,
  signInWithGoogle as startGoogleSignIn,
  signOut as endSupabaseSession,
  type SignOutFlowOptions,
} from '../services/auth';
import {
  clearGuestLocalData,
  clearOwnerLocalData,
  flushScopedStorageWrites,
  getPendingSyncOperations,
} from '../services/db';
import {
  getSupabaseBrowserClient,
  type SupabaseBrowserClient,
} from '../services/supabase';
import { useAppStore } from '../store/appStore';
import type { AccountSnapshot } from '../store/slices/accountSlice';

export interface AuthenticatedIdentity {
  id: string;
  email: string | null;
}

export interface UseAuthReturn {
  user: AuthenticatedIdentity | null;
  isSyncEnabled: boolean;
  isLoading: boolean;
  isSyncEligibilityLoading: boolean;
  isSigningIn: boolean;
  isSigningOut: boolean;
  cleanupPending: boolean;
  error: string | null;
  refreshSyncEligibility: () => Promise<boolean>;
  signInWithGoogle: () => Promise<void>;
  signOut: (
    options: Pick<
      SignOutFlowOptions,
      'syncBeforeSignOut' | 'confirmPendingChanges' | 'stopSync' | 'resumeSync'
    >,
  ) => Promise<boolean>;
  retryLocalCleanup: () => Promise<boolean>;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Authentication status could not be loaded.';
}

export function getOAuthRedirectUrl(origin: string, baseUrl: string): string {
  return new URL(baseUrl, origin).toString();
}

export function useAuth(): UseAuthReturn {
  const publishAccountState = useAppStore((state) => state.publishAccountState);
  const registerAccountControls = useAppStore((state) => state.registerAccountControls);
  const clientRef = useRef<SupabaseBrowserClient | null>(null);
  const [user, setUser] = useState<AuthenticatedIdentity | null>(null);
  const [isSyncEnabled, setIsSyncEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncEligibilityLoading, setIsSyncEligibilityLoading] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [cleanupOwnerId, setCleanupOwnerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resolutionRef = useRef(0);
  const isSigningOutRef = useRef(false);
  const cleanupOwnerIdRef = useRef<string | null>(null);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    clientRef.current = client;
    if (!client) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    let initialSessionResolved = false;
    let initialAuthUserSession: Awaited<ReturnType<typeof client.auth.getSession>>['data']['session'] = null;
    let sessionKey: string | null | undefined;
    const handleSession = (session: Awaited<ReturnType<typeof client.auth.getSession>>['data']['session']) => {
      if ((isSigningOutRef.current || cleanupOwnerIdRef.current) && !session) return;
      const nextSessionKey = session
        ? `${session.user.id}:${session.access_token}`
        : null;
      if (nextSessionKey === sessionKey) return;
      sessionKey = nextSessionKey;
      const currentResolution = ++resolutionRef.current;

      setIsLoading(false);
      setError(null);
      setIsSyncEligibilityLoading(Boolean(session));
      setIsSyncEnabled(false);
      setUser(
        session
          ? { id: session.user.id, email: session.user.email ?? null }
          : null,
      );
      if (!session) return;

      void loadSyncEligibility(client)
        .then((eligible) => {
          if (!isMounted || currentResolution !== resolutionRef.current) return;
          setIsSyncEnabled(eligible);
        })
        .catch((loadError: unknown) => {
          if (!isMounted || currentResolution !== resolutionRef.current) return;
          setError(getErrorMessage(loadError));
        })
        .finally(() => {
          if (isMounted && currentResolution === resolutionRef.current) {
            setIsSyncEligibilityLoading(false);
          }
        });
    };

    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (!initialSessionResolved) {
        if (session?.user) initialAuthUserSession = session;
        return;
      }
      handleSession(session);
    });

    void client.auth
      .getSession()
      .then(({ data: sessionData, error: sessionError }) => {
        if (!isMounted) return;
        initialSessionResolved = true;
        if (initialAuthUserSession) {
          handleSession(initialAuthUserSession);
          return;
        }
        if (sessionError) {
          setError(getErrorMessage(sessionError));
          setIsLoading(false);
          return;
        }
        handleSession(sessionData.session);
      })
      .catch((sessionError: unknown) => {
        if (!isMounted) return;
        initialSessionResolved = true;
        if (initialAuthUserSession) {
          handleSession(initialAuthUserSession);
          return;
        }
        setError(getErrorMessage(sessionError));
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
      resolutionRef.current += 1;
      data.subscription.unsubscribe();
    };
  }, []);

  const refreshSyncEligibility = async (): Promise<boolean> => {
    const client = clientRef.current ?? getSupabaseBrowserClient();
    if (!client) {
      setUser(null);
      setIsSyncEnabled(false);
      setIsSyncEligibilityLoading(false);
      return false;
    }

    const currentResolution = ++resolutionRef.current;
    setIsSyncEligibilityLoading(true);
    setError(null);
    try {
      const { data, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      if (currentResolution !== resolutionRef.current) return false;
      const session = data.session;
      if (!session) {
        if (currentResolution === resolutionRef.current) {
          setUser(null);
          setIsSyncEnabled(false);
        }
        return false;
      }

      setUser({ id: session.user.id, email: session.user.email ?? null });
      const eligible = await loadSyncEligibility(client);
      if (currentResolution === resolutionRef.current) setIsSyncEnabled(eligible);
      return eligible;
    } catch (refreshError: unknown) {
      if (currentResolution === resolutionRef.current) {
        setIsSyncEnabled(false);
        setError(getErrorMessage(refreshError));
      }
      return false;
    } finally {
      if (currentResolution === resolutionRef.current) {
        setIsSyncEligibilityLoading(false);
      }
    }
  };

  const signInWithGoogle = async () => {
    setIsSigningIn(true);
    setError(null);
    const result = await startGoogleSignIn(
      clientRef.current ?? getSupabaseBrowserClient(),
      typeof window === 'undefined'
        ? ''
        : getOAuthRedirectUrl(window.location.origin, import.meta.env.BASE_URL),
    );
    setError(result.error);
    if (result.error) setIsSigningIn(false);
  };

  const signOut = async (
    options: Pick<
      SignOutFlowOptions,
      'syncBeforeSignOut' | 'confirmPendingChanges' | 'stopSync' | 'resumeSync'
    >,
  ): Promise<boolean> => {
    const ownerId = user?.id;
    if (!ownerId || isSigningOutRef.current) return false;

    isSigningOutRef.current = true;
    setIsSigningOut(true);
    setError(null);
    try {
      const result = await runSignOutFlow({
        ...options,
        getPendingChanges: async () => {
          const scope = { ownerId };
          await flushScopedStorageWrites(scope);
          return (await getPendingSyncOperations(scope)).length;
        },
        endSession: () => endSupabaseSession(clientRef.current),
        clearLocalData: async () => {
          await clearOwnerLocalData(ownerId);
          await clearGuestLocalData();
        },
      });
      if (result.error) setError(result.error);
      if (result.cleanupFailed) {
        cleanupOwnerIdRef.current = ownerId;
        setCleanupOwnerId(ownerId);
        setIsSyncEnabled(false);
      }
      if (result.signedOut) {
        setUser(null);
        setIsSyncEnabled(false);
        setIsSyncEligibilityLoading(false);
      }
      return result.signedOut;
    } catch (signOutError: unknown) {
      setError(getErrorMessage(signOutError));
      return false;
    } finally {
      isSigningOutRef.current = false;
      setIsSigningOut(false);
    }
  };

  const retryLocalCleanup = async (): Promise<boolean> => {
    const ownerId = cleanupOwnerIdRef.current;
    if (!ownerId || isSigningOutRef.current) return false;
    isSigningOutRef.current = true;
    setIsSigningOut(true);
    setError(null);
    try {
      await clearOwnerLocalData(ownerId);
      await clearGuestLocalData();
      cleanupOwnerIdRef.current = null;
      setCleanupOwnerId(null);
      setUser(null);
      setIsSyncEnabled(false);
      setIsSyncEligibilityLoading(false);
      return true;
    } catch (cleanupError: unknown) {
      setError(
        `No se pudieron eliminar por completo los datos locales. Reintenta la limpieza antes de continuar. ${getErrorMessage(cleanupError)}`,
      );
      return false;
    } finally {
      isSigningOutRef.current = false;
      setIsSigningOut(false);
    }
  };

  useLayoutEffect(() => {
    const snapshot: AccountSnapshot = {
      user,
      isSyncEnabled,
      isLoading,
      isSyncEligibilityLoading,
      isSigningIn,
      isSigningOut,
      cleanupPending: cleanupOwnerId !== null,
      error,
    };
    publishAccountState(snapshot);
  }, [
    cleanupOwnerId,
    error,
    isLoading,
    isSigningIn,
    isSigningOut,
    isSyncEligibilityLoading,
    isSyncEnabled,
    publishAccountState,
    user,
  ]);

  useEffect(() => {
    const controls = {
      signInWithGoogle,
      signOut,
      retryLocalCleanup,
      refreshSyncEligibility,
    };
    registerAccountControls(controls);
    return () => registerAccountControls(null);
  }, [
    refreshSyncEligibility,
    registerAccountControls,
    retryLocalCleanup,
    signInWithGoogle,
    signOut,
  ]);

  return {
    user,
    isSyncEnabled,
    isLoading,
    isSyncEligibilityLoading,
    isSigningIn,
    isSigningOut,
    cleanupPending: cleanupOwnerId !== null,
    error,
    refreshSyncEligibility,
    signInWithGoogle,
    signOut,
    retryLocalCleanup,
  };
}
