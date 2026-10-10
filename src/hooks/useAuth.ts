import { useEffect, useRef, useState } from 'react';
import {
  loadAccountEntitlement,
  signInWithGoogle as startGoogleSignIn,
  signOut as endSupabaseSession,
  type AccountEntitlementResponse,
} from '../services/auth';
import {
  getSupabaseBrowserClient,
  type SupabaseBrowserClient,
} from '../services/supabase';
import {
  createBillingPortalSession,
  createBillingCheckoutSession,
  type BillingPlan,
} from '../services/billing';

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
  isBillingLoading: boolean;
  error: string | null;
  refreshEntitlement: () => Promise<AccountEntitlementResponse | null>;
  requestCheckoutSession: (plan: BillingPlan) => Promise<string | null>;
  requestBillingPortalSession: () => Promise<string | null>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

// Billing migration is intentionally deferred; this origin is not used for auth or sync.
const billingApiOrigin = import.meta.env.VITE_BACKEND_API_ORIGIN ?? '';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Account status could not be loaded.';
}

export function hasAccountPremiumAccess(
  user: AuthenticatedIdentity | null,
): boolean {
  return user !== null;
}

export function useAuth(): UseAuthReturn {
  const clientRef = useRef<SupabaseBrowserClient | null>(null);
  const [user, setUser] = useState<AuthenticatedIdentity | null>(null);
  const [entitlement, setEntitlement] = useState<AccountEntitlementResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEntitlementLoading, setIsEntitlementLoading] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isBillingLoading, setIsBillingLoading] = useState(false);
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
      setIsEntitlementLoading(Boolean(session));
      setEntitlement(null);
      setUser(
        session
          ? { id: session.user.id, email: session.user.email ?? null }
          : null,
      );
      if (!session) return;

      void loadAccountEntitlement(client, session.user.id)
        .then((result) => {
          if (!isMounted || currentResolution !== resolutionRef.current) return;
          if (result.userId !== session.user.id) {
            throw new Error('Account entitlement does not match the signed-in user.');
          }
          setEntitlement(result);
        })
        .catch((loadError: unknown) => {
          if (!isMounted || currentResolution !== resolutionRef.current) return;
          setEntitlement(null);
          setError(getErrorMessage(loadError));
        })
        .finally(() => {
          if (isMounted && currentResolution === resolutionRef.current) {
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
      resolutionRef.current += 1;
      data.subscription.unsubscribe();
    };
  }, []);

  const refreshEntitlement = async () => {
    const client = clientRef.current ?? getSupabaseBrowserClient();
    if (!client) {
      setUser(null);
      setEntitlement(null);
      setIsEntitlementLoading(false);
      return null;
    }

    const currentResolution = ++resolutionRef.current;
    setIsEntitlementLoading(true);
    setError(null);
    try {
      const { data, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      if (currentResolution !== resolutionRef.current) return null;
      const session = data.session;
      if (!session) {
        if (currentResolution === resolutionRef.current) {
          setUser(null);
          setEntitlement(null);
        }
        return null;
      }

      setUser({ id: session.user.id, email: session.user.email ?? null });
      const result = await loadAccountEntitlement(client, session.user.id);
      if (result.userId !== session.user.id) {
        throw new Error('Account entitlement does not match the signed-in user.');
      }
      if (currentResolution === resolutionRef.current) setEntitlement(result);
      return result;
    } catch (refreshError: unknown) {
      if (currentResolution === resolutionRef.current) {
        setEntitlement(null);
        setError(getErrorMessage(refreshError));
      }
      return null;
    } finally {
      if (currentResolution === resolutionRef.current) {
        setIsEntitlementLoading(false);
      }
    }
  };

  const requestCheckoutSession = async (plan: BillingPlan) => {
    setIsBillingLoading(true);
    setError(null);
    try {
      const client = clientRef.current ?? getSupabaseBrowserClient();
      if (!client) {
        throw new Error('Supabase authentication is not configured.');
      }
      const { data, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      if (!data.session) {
        throw new Error('Inicia sesión para continuar con Premium.');
      }
      return await createBillingCheckoutSession(
        billingApiOrigin,
        data.session.access_token,
        plan,
      );
    } catch (billingError: unknown) {
      setError(getErrorMessage(billingError));
      return null;
    } finally {
      setIsBillingLoading(false);
    }
  };

  const requestBillingPortalSession = async () => {
    setIsBillingLoading(true);
    setError(null);
    try {
      const client = clientRef.current ?? getSupabaseBrowserClient();
      if (!client) {
        throw new Error('Supabase authentication is not configured.');
      }
      const { data, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      if (!data.session) {
        throw new Error('Inicia sesión para gestionar tus pagos.');
      }
      return await createBillingPortalSession(
        billingApiOrigin,
        data.session.access_token,
      );
    } catch (billingError: unknown) {
      setError(getErrorMessage(billingError));
      return null;
    } finally {
      setIsBillingLoading(false);
    }
  };

  const isPremiumActive = hasAccountPremiumAccess(user);

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
    isBillingLoading,
    error,
    refreshEntitlement,
    requestCheckoutSession,
    requestBillingPortalSession,
    signInWithGoogle,
    signOut,
  };
}
