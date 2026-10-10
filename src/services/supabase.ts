import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

export interface SupabasePublicConfig {
  url: string;
  publishableKey: string;
}

export type SupabaseBrowserClient = SupabaseClient<Database>;

let browserClient: SupabaseBrowserClient | null | undefined;

export function createSupabaseBrowserClient(
  config: SupabasePublicConfig = {
    url: import.meta.env.VITE_SUPABASE_URL ?? '',
    publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
  },
): SupabaseBrowserClient | null {
  const url = config.url.trim();
  const publishableKey = config.publishableKey.trim();
  if (!url || !publishableKey) return null;

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') return null;

    return createClient<Database>(url, publishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    });
  } catch {
    return null;
  }
}

export function getSupabaseBrowserClient(): SupabaseBrowserClient | null {
  if (browserClient === undefined) {
    browserClient = createSupabaseBrowserClient();
  }
  return browserClient;
}
