// The scheduler: sends posts that are due and answers new Google reviews.
// Runs every few minutes inside the website server (startScheduler), and can
// also be started from the admin panel ("Run now") or /api/social/tick.
import { db, configured } from './server';
import { problems, type Provider, type Kind } from './policy';
import * as google from './google';
import * as meta from './meta';
import * as ai from './ai';

type Row = { id: string; account_id: string; kind: Kind; text: string; image_url: string | null; cta: string | null; cta_url: string | null; attempts: number;
  social_accounts: { provider: Provider; external_id: string; enabled: boolean } };

const MAX_ATTEMPTS = 3;

async function publish(r: Row) {
  const a = r.social_accounts;
  const bad = problems(a.provider, r.kind, r.text, r.image_url);
  if (bad.length) throw new Error(bad.join(' '));
  if (a.provider === 'google') return google.publish({ accountId: r.account_id, externalId: a.external_id, text: r.text, imageUrl: r.image_url, cta: r.cta, ctaUrl: r.cta_url });
  const p = { accountId: r.account_id, externalId: a.external_id, kind: r.kind, text: r.text, imageUrl: r.image_url };
  return a.provider === 'facebook' ? meta.publishFacebook(p) : meta.publishInstagram(p);
}

export async function sendDuePosts() {
  const now = new Date().toISOString();
  // A post stuck in "posting" means the server stopped mid-way; don't risk a double post.
  await db().from('social_posts').update({ status: 'failed', error: 'Stopped while posting. Check the account; if it did not appear, press Retry.' })
    .eq('status', 'posting').lt('scheduled_at', new Date(Date.now() - 30 * 60_000).toISOString());
  const { data, error } = await db().from('social_posts')
    .select('id, account_id, kind, text, image_url, cta, cta_url, attempts, social_accounts!inner(provider, external_id, enabled)')
    .eq('status', 'scheduled').lte('scheduled_at', now).eq('social_accounts.enabled', true)
    .order('scheduled_at').limit(10);
  if (error) throw error;
  let sent = 0, failed = 0;
  for (const r of (data ?? []) as unknown as Row[]) {
    // Claim the row so a second server process can't send it too.
    // scheduled_at becomes the claim time, so the stuck-post check above measures from now.
    const { data: claimed } = await db().from('social_posts').update({ status: 'posting', attempts: r.attempts + 1, scheduled_at: new Date().toISOString() })
      .eq('id', r.id).eq('status', 'scheduled').select('id');
    if (!claimed?.length) continue;
    try {
      const externalId = await publish(r);
      await db().from('social_posts').update({ status: 'posted', posted_at: new Date().toISOString(), external_id: externalId ?? null, error: null }).eq('id', r.id);
      sent++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const retry = r.attempts + 1 < MAX_ATTEMPTS && !/needs a photo|rejects|Too long|has no stories/.test(msg);
      await db().from('social_posts').update(retry
        ? { status: 'scheduled', error: msg, scheduled_at: new Date(Date.now() + 15 * 60_000).toISOString() }
        : { status: 'failed', error: msg }).eq('id', r.id);
      failed++;
    }
  }
  return { sent, failed };
}

export async function answerReviews() {
  const { data: setting } = await db().from('social_settings').select('value').eq('key', 'reviews').maybeSingle();
  const cfg = { autoReply: true, minRating: 4, ...(setting?.value ?? {}) };
  const { data: accounts = [] } = await db().from('social_accounts').select('id, external_id').eq('provider', 'google').eq('enabled', true);
  let drafted = 0, replied = 0;
  for (const acc of accounts ?? []) {
    await google.syncReviews(acc.id, acc.external_id);
    if (!configured().ai) continue;
    // Every review still waiting, including ones stored before the AI key was set.
    const { data: waiting } = await db().from('social_reviews').select('id, reviewer, rating, comment').eq('account_id', acc.id).eq('status', 'new').limit(20);
    for (const r of waiting ?? []) {
      try {
        const text = await ai.reviewReply(r);
        if (cfg.autoReply && r.rating >= cfg.minRating) {
          await google.reply(acc.id, r.id, text);
          await db().from('social_reviews').update({ reply: text, status: 'posted', updated_at: new Date().toISOString() }).eq('id', r.id);
          replied++;
        } else {
          // Lower ratings wait for the owner to check the reply in the admin panel.
          await db().from('social_reviews').update({ reply: text, status: 'drafted', updated_at: new Date().toISOString() }).eq('id', r.id);
          drafted++;
        }
      } catch (e) {
        await db().from('social_reviews').update({ status: 'failed', error: e instanceof Error ? e.message : String(e) }).eq('id', r.id);
      }
    }
  }
  return { drafted, replied };
}

let running: Promise<unknown> | null = null;
let lastReviews = 0;
// One run at a time; reviews at most every 30 minutes (Google rate limits).
export function tick(force = false) {
  if (!configured().database) return Promise.resolve({ skipped: 'not configured' });
  running ??= (async () => {
    const posts = await sendDuePosts();
    let reviews = null;
    if (force || Date.now() - lastReviews > 30 * 60_000) {
      lastReviews = Date.now();
      reviews = await answerReviews().catch((e) => ({ error: e instanceof Error ? e.message : String(e) }));
    }
    return { posts, reviews };
  })().finally(() => { running = null; });
  return running;
}

let started = false;
export function startScheduler() {
  if (started || !configured().database) return;
  started = true;
  const run = () => tick().catch((e) => console.error('[social] tick failed', e));
  setTimeout(run, 20_000);
  setInterval(run, 5 * 60_000).unref?.();
}
