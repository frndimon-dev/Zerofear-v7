import type { APIRoute } from 'astro';
import { configured, requireAdmin, json, fail, callbackUrl } from '../../../lib/social/server';

// Which secrets are set on the server (never the values).
export const GET: APIRoute = async ({ request }) => {
  try {
    await requireAdmin(request);
    return json({ ...configured(), callbacks: { google: callbackUrl('google'), meta: callbackUrl('meta') } });
  } catch (e) { return fail(e); }
};
