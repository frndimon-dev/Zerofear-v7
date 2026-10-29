// Google Business Profile: connect, post updates, read reviews and reply.
// Uses the Business Profile APIs, which Google has to enable for the project
// first (access request form, see docs/SOCIAL.md).
import { env, call, callbackUrl, saveAccount, tokenOf, db } from './server';

const SCOPE = 'https://www.googleapis.com/auth/business.manage';

export function authUrl(state: string) {
  const q = new URLSearchParams({
    client_id: env('GOOGLE_CLIENT_ID'), redirect_uri: callbackUrl('google'), response_type: 'code',
    scope: SCOPE, access_type: 'offline', prompt: 'consent', state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

type TokenResponse = { access_token: string; refresh_token?: string; expires_in: number };

// After the owner allows access: save every location of every account they manage.
export async function connect(code: string) {
  const tok = await call<TokenResponse>('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: env('GOOGLE_CLIENT_ID'), client_secret: env('GOOGLE_CLIENT_SECRET'), redirect_uri: callbackUrl('google'), grant_type: 'authorization_code' }),
  });
  if (!tok.refresh_token) throw new Error('Google did not return a refresh token. Remove the app at myaccount.google.com/permissions and connect again.');
  const auth = { authorization: `Bearer ${tok.access_token}` };
  const { accounts = [] } = await call<{ accounts?: { name: string }[] }>('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', { headers: auth });
  const names: string[] = [];
  for (const acc of accounts) {
    const { locations = [] } = await call<{ locations?: { name: string; title: string }[] }>(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${acc.name}/locations?readMask=name,title&pageSize=100`, { headers: auth });
    for (const loc of locations) {
      await saveAccount('google', `${acc.name}/${loc.name}`, loc.title, { refresh_token: tok.refresh_token });
      names.push(loc.title);
    }
  }
  return names;
}

const access = new Map<string, { token: string; until: number }>();
async function accessToken(accountId: string) {
  const hit = access.get(accountId);
  if (hit && hit.until > Date.now() + 60_000) return hit.token;
  const { refresh_token } = await tokenOf(accountId);
  const tok = await call<TokenResponse>('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ refresh_token, client_id: env('GOOGLE_CLIENT_ID'), client_secret: env('GOOGLE_CLIENT_SECRET'), grant_type: 'refresh_token' }),
  });
  access.set(accountId, { token: tok.access_token, until: Date.now() + tok.expires_in * 1000 });
  return tok.access_token;
}

export type PostInput = { accountId: string; externalId: string; text: string; imageUrl?: string | null; cta?: string | null; ctaUrl?: string | null };

export async function publish(p: PostInput) {
  const body: Record<string, unknown> = { languageCode: 'en', summary: p.text, topicType: 'STANDARD' };
  if (p.imageUrl) body.media = [{ mediaFormat: 'PHOTO', sourceUrl: p.imageUrl }];
  if (p.cta === 'CALL') body.callToAction = { actionType: 'CALL' };
  else if (p.cta && p.ctaUrl) body.callToAction = { actionType: p.cta, url: p.ctaUrl };
  const res = await call<{ name: string }>(`https://mybusiness.googleapis.com/v4/${p.externalId}/localPosts`, {
    method: 'POST',
    headers: { authorization: `Bearer ${await accessToken(p.accountId)}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.name;
}

const STARS: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
type Review = { name: string; reviewer?: { displayName?: string }; starRating?: string; comment?: string; createTime?: string; reviewReply?: { comment: string } };

// Store reviews we haven't seen; returns the ones that still need a reply.
export async function syncReviews(accountId: string, externalId: string) {
  const { reviews = [] } = await call<{ reviews?: Review[] }>(`https://mybusiness.googleapis.com/v4/${externalId}/reviews?pageSize=50&orderBy=updateTime%20desc`, {
    headers: { authorization: `Bearer ${await accessToken(accountId)}` },
  });
  if (!reviews.length) return [];
  const { data: known = [] } = await db().from('social_reviews').select('id').in('id', reviews.map((r) => r.name));
  const seen = new Set((known ?? []).map((r) => r.id));
  const fresh = reviews.filter((r) => !seen.has(r.name)).map((r) => ({
    id: r.name, account_id: accountId, reviewer: r.reviewer?.displayName ?? '', rating: STARS[r.starRating ?? ''] ?? 0,
    comment: r.comment ?? '', created_time: r.createTime ?? null,
    reply: r.reviewReply?.comment ?? '', status: r.reviewReply ? 'skipped' : 'new',
  }));
  if (fresh.length) {
    const { error } = await db().from('social_reviews').insert(fresh);
    if (error) throw error;
  }
  return fresh.filter((r) => r.status === 'new');
}

export async function reply(accountId: string, reviewName: string, comment: string) {
  await call(`https://mybusiness.googleapis.com/v4/${reviewName}/reply`, {
    method: 'PUT',
    headers: { authorization: `Bearer ${await accessToken(accountId)}`, 'content-type': 'application/json' },
    body: JSON.stringify({ comment }),
  });
}
