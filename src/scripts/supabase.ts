import { site } from '../data/site';

// Minimal read-only Supabase REST client. Returns [] on any failure so the page
// keeps showing its built-in content when the database is unreachable.
export async function fetchTable<T>(table: string, query: string): Promise<T[]> {
  try {
    const res = await fetch(`${site.supabase.url}/rest/v1/${table}?${query}`, {
      headers: { apikey: site.supabase.publishableKey, Authorization: `Bearer ${site.supabase.publishableKey}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
