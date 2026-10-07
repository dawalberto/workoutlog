import { useEffect, useRef, useState } from 'react';
import {
  isPremiumEntitlementActive,
  loadAccountEntitlement,
  signInWithGoogle as startGoogleSignIn,
  signOut as endSupabaseSession,
  type AccountEntitlementResponse,
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
  entitlement: AccountEntitlementResponse | null;
  isPremiumActive: boolean;
  isLoading: boolean;
  isEntitlementLoading: boolean;
  isSigningIn: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const backendApiOrigin = import.meta.env.VITE_BACKEND_API_ORIGIN ?? '';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Account status could not be loaded.';
}

export function useAuth(): UseAuthReturn {
  const clientRef = useRef<SupabaseBrowserClient | null>(null);
  const [user, setUser] = useState<AuthenticatedIdentity | null>(null);
  const [entitlement, setEntitlement] = useState<AccountEntitlementResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEntitlementLoading, setIsEntitlementLoading] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clock, setClock] = useState(() => Date.now());

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
    let resolution = 0;

    const handleSession = (session: Awaited<ReturnType<typeof client.auth.getSession>>['data']['session']) => {
      const nextSessionKey = session
        ? `${session.user.id}:${session.access_token}`
        : null;
      if (nextSessionKey === sessionKey) return;
      sessionKey = nextSessionKey;
      const currentResolution = ++resolution;

      setIsLoading(false);
      setError(null);
      setIsEntitlementLoading(Boolean(session));
      setEntitlement(null);
      setUser(
        session
          ? { id: session.user.id, email: session.user.email ?? null }
          : null,
      );
      if (!session) return;

      void loadAccountEntitlement(backendApiOrigin, session.access_token)
        .then((result) => {
          if (!isMounted || currentResolution !== resolution) return;
          if (result.userId !== session.user.id) {
            throw new Error('Account entitlement does not match the signed-in user.');
          }
          setEntitlement(result);
        })
        .catch((loadError: unknown) => {
          if (!isMounted || currentResolution !== resolution) return;
          setEntitlement(null);
          setError(getErrorMessage(loadError));
        })
        .finally(() => {
          if (isMounted && currentResolution === resolution) {
            setIsEntitlementLoading(false);
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
      resolution += 1;
      data.subscription.unsubscribe();
    };
  }, []);

  const validUntil = entitlement?.entitlement?.validUntil;
  const isPremiumActive = isPremiumEntitlementActive(entitlement, clock);

  useEffect(() => {
    if (!isPremiumActive || !validUntil) return;
    const remaining = Date.parse(validUntil) - Date.now();
    if (remaining <= 0) {
      setClock(Date.now());
      return;
    }
    const timeout = window.setTimeout(
      () => setClock(Date.now()),
      Math.min(remaining + 1, 2_147_000_000),
    );
    return () => window.clearTimeout(timeout);
  }, [isPremiumActive, validUntil, clock]);

  const signInWithGoogle = async () => {
    setIsSigningIn(true);
    setError(null);
    const result = await startGoogleSignIn(
      clientRef.current ?? getSupabaseBrowserClient(),
      typeof window === 'undefined' ? '' : window.location.origin,
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
    setEntitlement(null);
    setIsEntitlementLoading(false);
    setError(null);
  };

  return {
    user,
    entitlement,
    isPremiumActive,
    isLoading,
    isEntitlementLoading,
    isSigningIn,
    error,
    signInWithGoogle,
    signOut,
  };
}
