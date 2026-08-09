// ---- cloud sync (Supabase): Google sign-in + per-user notebook snapshot backup ----
// Everything is optional — if the Vite env vars are missing, the app simply runs
// fully offline (local-only), exactly as before.
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const cloudEnabled = Boolean(url && anonKey);

let client: SupabaseClient | null = null;
if (cloudEnabled) {
  client = createClient(url!, anonKey!, {
    auth: { persistSession: true, autoRefreshToken: true }
  });
}

export interface CloudUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

function mapUser(u: User): CloudUser {
  return {
    id: u.id,
    email: u.email ?? '',
    name: (u.user_metadata?.full_name as string) ?? (u.user_metadata?.name as string) ?? u.email?.split('@')[0] ?? 'Inkster',
    avatar: (u.user_metadata?.avatar_url as string) ?? (u.user_metadata?.picture as string) ?? undefined
  };
}

export interface CloudSnapshot {
  data: unknown;
  updatedAt: number; // epoch ms
}

export const cloud = {
  enabled: cloudEnabled,

  /** subscribe to auth state changes; returns an unsubscribe fn */
  onAuthChange(cb: (u: CloudUser | null) => void): () => void {
    if (!client) return () => {};
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      cb(session?.user ? mapUser(session.user) : null);
    });
    return () => data.subscription.unsubscribe();
  },

  async getUser(): Promise<CloudUser | null> {
    if (!client) return null;
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) return null;
    return mapUser(data.user);
  },

  async signInWithGoogle(): Promise<void> {
    if (!client) return;
    await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  },

  async signOut(): Promise<void> {
    if (!client) return;
    await client.auth.signOut();
  },

  /** upsert this user's snapshot row (row-level security keeps each user's row private) */
  async pushSnapshot(data: unknown): Promise<boolean> {
    if (!client) return false;
    const { data: u } = await client.auth.getUser();
    if (!u.user) return false;
    const { error } = await client
      .from('snapshots')
      .upsert({ user_id: u.user.id, data, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    return !error;
  },

  /** fetch this user's latest snapshot row, if any */
  async pullSnapshot(): Promise<CloudSnapshot | null> {
    if (!client) return null;
    const { data: u } = await client.auth.getUser();
    if (!u.user) return null;
    const { data, error } = await client
      .from('snapshots')
      .select('data, updated_at')
      .eq('user_id', u.user.id)
      .maybeSingle();
    if (error || !data) return null;
    const ts = Date.parse(data.updated_at as string);
    return { data: data.data, updatedAt: Number.isFinite(ts) ? ts : 0 };
  }
};
