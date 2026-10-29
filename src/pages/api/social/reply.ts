import type { APIRoute } from 'astro';
import { requireAdmin, db, json, fail, HttpError } from '../../../lib/social/server';
import * as google from '../../../lib/social/google';

// Post (or change) the reply to one Google review.
export const POST: APIRoute = async ({ request }) => {
  try {
    await requireAdmin(request);
    const { reviewId, text } = await request.json();
    const reply = String(text ?? '').trim();
    if (!reply || reply.length > 4000) throw new HttpError(400, 'Write a reply (up to 4000 letters).');
    const { data, error } = await db().from('social_reviews').select('account_id').eq('id', reviewId).single();
    if (error) throw new HttpError(404, 'Review not found.');
    await google.reply(data.account_id, reviewId, reply);
    await db().from('social_reviews').update({ reply, status: 'posted', error: null, updated_at: new Date().toISOString() }).eq('id', reviewId);
    return json({ ok: true });
  } catch (e) { return fail(e); }
};
