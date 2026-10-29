import type { APIRoute } from 'astro';
import { json } from '../../../lib/social/server';
import { tick } from '../../../lib/social/tick';

// Wake-up call for the scheduler (a GitHub Action calls it every 15 minutes in
// case the server was asleep). Only sends what is already due, so it is safe
// to call; it runs at most once a minute.
let last = 0;
export const GET: APIRoute = async () => {
  if (Date.now() - last < 60_000) return json({ ok: true, skipped: 'too soon' });
  last = Date.now();
  try {
    const r = await tick();
    return json({ ok: true, ...(r as object) });
  } catch (e) {
    console.error('[social] tick failed', e);
    return json({ ok: false }, 500);
  }
};
