// Server-only helpers for the social scheduler (admin → Social).
// Secrets come from environment variables set in hPanel (see docs/SOCIAL.md);
// nothing here is sent to the browser.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabase as cfg } from '../../data/supabase';
import { site } from '../../data/site';

export const env = (k: string) => process.env[k]?.trim() || '';

export const configured = () => ({
  database: !!env('SUPABASE_SECRET_KEY') && !!env('SOCIAL_SECRET'),
  google: !!env('GOOGLE_CLIENT_ID') && !!env('GOOGLE_CLIENT_SECRET'),
  meta: !!env('META_APP_ID') && !!env('META_APP_SECRET'),
  ai: !!env('ANTHROPIC_API_KEY'),
});

let admin: SupabaseClient | null = null;
// Supabase client with the secret key: bypasses row-level security, reads tokens.
export function db(): SupabaseClient {
  if (!env('SUPABASE_SECRET_KEY')) throw new Error('SUPABASE_SECRET_KEY is not set on the server.');
  admin ??= createClient(cfg.url, env('SUPABASE_SECRET_KEY'), { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}

// The signed-in admin panel user, checked with the same is_admin() rule as the database.
export async function requireAdmin(request: Request): Promise<string> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'Please sign in again.');
  const user = createClient(cfg.url, cfg.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: who } = await user.auth.getUser(token);
  const { data: ok } = await user.rpc('is_admin');
  if (!who.user || ok !== true) throw new HttpError(403, 'This account is not allowed to manage social media.');
  return who.user.email ?? '';
}

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export function fail(e: unknown) {
  const status = e instanceof HttpError ? e.status : 500;
  const message = e instanceof Error ? e.message : String(e);
  if (status === 500) console.error('[social]', e);
  return json({ error: message }, status);
}

// OAuth "state": who started the connection and when, signed so it can't be forged.
export function signState(data: Record<string, string>) {
  const body = Buffer.from(JSON.stringify({ ...data, t: Date.now() })).toString('base64url');
  const sig = createHmac('sha256', env('SOCIAL_SECRET')).update(body).digest('base64url');
  return `${body}.${sig}`;
}
export function readState(state: string): Record<string, string> {
  const [body, sig] = state.split('.');
  if (!body || !sig || !env('SOCIAL_SECRET')) throw new HttpError(400, 'Invalid connection link. Start again from the admin panel.');
  const want = createHmac('sha256', env('SOCIAL_SECRET')).update(body).digest();
  const got = Buffer.from(sig, 'base64url');
  if (got.length !== want.length || !timingSafeEqual(got, want)) throw new HttpError(400, 'Invalid connection link. Start again from the admin panel.');
  const data = JSON.parse(Buffer.from(body, 'base64url').toString());
  if (Date.now() - Number(data.t) > 15 * 60_000) throw new HttpError(400, 'The connection link expired. Start again from the admin panel.');
  return data;
}

export const callbackUrl = (provider: string) => `${site.url}/api/social/oauth/${provider}/callback`;

// Save a connected account and its token; returns the account id.
export async function saveAccount(provider: 'google' | 'facebook' | 'instagram', externalId: string, name: string, token: Record<string, unknown>) {
  const { data, error } = await db().from('social_accounts')
    .upsert({ provider, external_id: externalId, name }, { onConflict: 'provider,external_id' })
    .select('id').single();
  if (error) throw error;
  const { error: e2 } = await db().from('social_tokens').upsert({ account_id: data.id, token, updated_at: new Date().toISOString() });
  if (e2) throw e2;
  return data.id as string;
}

export async function tokenOf(accountId: string): Promise<Record<string, string>> {
  const { data, error } = await db().from('social_tokens').select('token').eq('account_id', accountId).single();
  if (error) throw new Error('This account is not connected any more. Connect it again in admin → Social.');
  return data.token;
}

// Fetch JSON and turn API errors into readable messages.
export async function call<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
  if (!res.ok) {
    const msg = body?.error?.message ?? body?.error_description ?? body?.error ?? text.slice(0, 300);
    throw new Error(`${res.status}: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
  }
  return body as T;
}
