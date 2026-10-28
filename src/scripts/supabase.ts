import { supabase } from '../data/supabase';

// Minimal read-only Supabase REST client. Returns [] on any failure so the page
// keeps showing its built-in content when the database is unreachable.
export async function fetchTable<T>(table: string, query: string): Promise<T[]> {
  try {
    const res = await fetch(`${supabase.url}/rest/v1/${table}?${query}`, {
      headers: { apikey: supabase.publishableKey, Authorization: `Bearer ${supabase.publishableKey}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
