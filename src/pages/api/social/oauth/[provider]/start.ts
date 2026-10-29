import type { APIRoute } from 'astro';
import { configured, requireAdmin, signState, json, fail, HttpError } from '../../../../../lib/social/server';
import * as google from '../../../../../lib/social/google';
import * as meta from '../../../../../lib/social/meta';

// Returns the Google / Facebook page where the owner allows access.
export const POST: APIRoute = async ({ request, params }) => {
  try {
    const email = await requireAdmin(request);
    const c = configured();
    if (!c.database) throw new HttpError(400, 'Server secrets are missing (SUPABASE_SECRET_KEY, SOCIAL_SECRET). See docs/SOCIAL.md.');
    const state = signState({ email, provider: params.provider ?? '' });
    if (params.provider === 'google' && c.google) return json({ url: google.authUrl(state) });
    if (params.provider === 'meta' && c.meta) return json({ url: meta.authUrl(state) });
    throw new HttpError(400, `${params.provider} keys are not set on the server yet. See docs/SOCIAL.md.`);
  } catch (e) { return fail(e); }
};
