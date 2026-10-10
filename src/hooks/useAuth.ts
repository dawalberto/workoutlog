import { useEffect, useRef, useState } from 'react';
import {
  loadSyncEligibility,
  signInWithGoogle as startGoogleSignIn,
  signOut as endSupabaseSession,
} from '../services/auth';
import {
  getSupabaseBrowserClient,
  type SupabaseBrowserClient,
} from '../services/supabase';

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
  error: string | null;
  refreshSyncEligibility: () => Promise<boolean>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Authentication status could not be loaded.';
}

export function getOAuthRedirectUrl(origin: string, baseUrl: string): string {
  return new URL(baseUrl, origin).toString();
}

export function useAuth(): UseAuthReturn {
  const clientRef = useRef<SupabaseBrowserClient | null>(null);
  const [user, setUser] = useState<AuthenticatedIdentity | null>(null);
  const [isSyncEnabled, setIsSyncEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncEligibilityLoading, setIsSyncEligibilityLoading] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolutionRef = useRef(0);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    clientRef.current = client;
    if (!client) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    let authEventReceived = false;
    let sessionKey: string | null | undefined;
    const handleSession = (session: Awaited<ReturnType<typeof client.auth.getSession>>['data']['session']) => {
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
      authEventReceived = true;
      handleSession(session);
    });

    void client.auth
      .getSession()
      .then(({ data: sessionData, error: sessionError }) => {
        if (!isMounted || authEventReceived) return;
        if (sessionError) {
          setError(getErrorMessage(sessionError));
          setIsLoading(false);
          return;
        }
        handleSession(sessionData.session);
      })
      .catch((sessionError: unknown) => {
        if (!isMounted || authEventReceived) return;
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
    setIsSigningIn(false);
  };

  const signOut = async () => {
    const result = await endSupabaseSession(clientRef.current);
    if (result.error) {
      setError(result.error);
      return;
    }
    setUser(null);
    setIsSyncEnabled(false);
    setIsSyncEligibilityLoading(false);
    setError(null);
  };

  return {
    user,
    isSyncEnabled,
    isLoading,
    isSyncEligibilityLoading,
    isSigningIn,
    error,
    refreshSyncEligibility,
    signInWithGoogle,
    signOut,
  };
}
