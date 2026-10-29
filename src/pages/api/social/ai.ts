import type { APIRoute } from 'astro';
import { configured, requireAdmin, db, json, fail, HttpError } from '../../../lib/social/server';
import * as ai from '../../../lib/social/ai';

// "Write with AI" in the admin panel: a caption, or a reply to a review.
export const POST: APIRoute = async ({ request }) => {
  try {
    await requireAdmin(request);
    if (!configured().ai) throw new HttpError(400, 'ANTHROPIC_API_KEY is not set on the server yet. See docs/SOCIAL.md.');
    const body = await request.json();
    if (body.mode === 'caption') {
      if (!['google', 'facebook', 'instagram'].includes(body.provider)) throw new HttpError(400, 'Unknown platform.');
      return json({ text: await ai.caption(body.provider, String(body.notes ?? '').slice(0, 1000), body.imageUrl || null) });
    }
    if (body.mode === 'reply') {
      const { data, error } = await db().from('social_reviews').select('reviewer, rating, comment').eq('id', body.reviewId).single();
      if (error) throw new HttpError(404, 'Review not found.');
      return json({ text: await ai.reviewReply(data) });
    }
    throw new HttpError(400, 'Unknown request.');
  } catch (e) { return fail(e); }
};
