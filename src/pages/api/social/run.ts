import type { APIRoute } from 'astro';
import { requireAdmin, json, fail } from '../../../lib/social/server';
import { tick } from '../../../lib/social/tick';

// "Run now" in the admin panel: send due posts and check reviews immediately.
export const POST: APIRoute = async ({ request }) => {
  try {
    await requireAdmin(request);
    return json(await tick(true));
  } catch (e) { return fail(e); }
};
