import { createClient } from '@supabase/supabase-js';
import { supabase as cfg } from '../data/supabase';
import type { Overrides } from '../cms/schema';
import type { PostRow } from '../lib/blog';

export const sb = createClient(cfg.url, cfg.publishableKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export const BUCKET = 'site-media';

// Supabase error → short message the owner can act on.
export function explain(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? String(e);
  if (/relation .* does not exist|Could not find the table/i.test(msg)) return 'The database is not set up yet. Run supabase/admin-setup.sql once (see the admin guide).';
  if (/row-level security|permission denied|not authorized/i.test(msg)) return 'This account is not allowed to edit. Add its e-mail to admin_users (see the admin guide).';
  if (/Invalid login credentials/i.test(msg)) return 'Wrong e-mail or password.';
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'No internet connection. Your changes are still here; try again.';
  return msg;
}

export async function loadContent(): Promise<{ data: Overrides; updatedAt: string | null }> {
  const { data, error } = await sb.from('site_content').select('data, updated_at').eq('key', 'site').maybeSingle();
  if (error) throw error;
  return { data: (data?.data as Overrides) ?? {}, updatedAt: data?.updated_at ?? null };
}

export async function saveContent(content: Overrides, email: string) {
  const { error } = await sb.from('site_content').upsert({ key: 'site', data: content, updated_at: new Date().toISOString(), updated_by: email });
  if (error) throw error;
}

export async function loadHistory() {
  const { data, error } = await sb.from('site_content_history').select('id, saved_at, saved_by').eq('key', 'site').order('id', { ascending: false }).limit(30);
  if (error) throw error;
  return data as { id: number; saved_at: string; saved_by: string | null }[];
}

export async function loadHistoryVersion(id: number): Promise<Overrides> {
  const { data, error } = await sb.from('site_content_history').select('data').eq('id', id).single();
  if (error) throw error;
  return data.data as Overrides;
}

export async function loadPosts(): Promise<PostRow[]> {
  const { data, error } = await sb.from('posts').select('*').order('date', { ascending: false });
  if (error) throw error;
  return data as PostRow[];
}

export async function savePost(row: PostRow) {
  const { error } = await sb.from('posts').upsert(row);
  if (error) throw error;
}

export async function deletePost(slug: string) {
  const { error } = await sb.from('posts').delete().eq('slug', slug);
  if (error) throw error;
}

export async function uploadImage(blob: Blob, name: string): Promise<string> {
  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${new Date().getFullYear()}/${crypto.randomUUID().slice(0, 8)}-${name}.${ext}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false });
  if (error) throw error;
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
