// Facebook pages and Instagram business accounts: connect, posts and stories.
import { env, call, callbackUrl, saveAccount, tokenOf } from './server';

const V = () => env('META_GRAPH_VERSION') || 'v23.0';
const G = (path: string) => `https://graph.facebook.com/${V()}/${path}`;
const SCOPES = ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'business_management', 'instagram_basic', 'instagram_content_publish'];

export function authUrl(state: string) {
  const q = new URLSearchParams({ client_id: env('META_APP_ID'), redirect_uri: callbackUrl('meta'), state, scope: SCOPES.join(','), response_type: 'code' });
  return `https://www.facebook.com/${V()}/dialog/oauth?${q}`;
}

type Page = { id: string; name: string; access_token: string; instagram_business_account?: { id: string; username?: string } };

// Save every page the owner manages, and the Instagram account linked to each.
// Page tokens made from a long-lived user token don't expire.
export async function connect(code: string) {
  const app = { client_id: env('META_APP_ID'), client_secret: env('META_APP_SECRET') };
  const short = await call<{ access_token: string }>(G(`oauth/access_token?${new URLSearchParams({ ...app, redirect_uri: callbackUrl('meta'), code })}`));
  const long = await call<{ access_token: string }>(G(`oauth/access_token?${new URLSearchParams({ ...app, grant_type: 'fb_exchange_token', fb_exchange_token: short.access_token })}`));
  const { data = [] } = await call<{ data?: Page[] }>(G(`me/accounts?${new URLSearchParams({ fields: 'id,name,access_token,instagram_business_account{id,username}', access_token: long.access_token })}`));
  const names: string[] = [];
  for (const p of data) {
    await saveAccount('facebook', p.id, p.name, { page_token: p.access_token, page_id: p.id });
    names.push(`Facebook: ${p.name}`);
    if (p.instagram_business_account) {
      const ig = p.instagram_business_account;
      await saveAccount('instagram', ig.id, ig.username ? `@${ig.username}` : p.name, { page_token: p.access_token, page_id: p.id });
      names.push(`Instagram: ${ig.username ?? ig.id}`);
    }
  }
  return names;
}

const form = (params: Record<string, string>) => ({
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams(params),
});

export type MetaPost = { accountId: string; externalId: string; kind: 'post' | 'story'; text: string; imageUrl?: string | null };

export async function publishFacebook(p: MetaPost) {
  if (!p.imageUrl && p.kind === 'story') throw new Error('A story needs a photo.');
  const { page_token } = await tokenOf(p.accountId);
  if (p.kind === 'story') {
    const photo = await call<{ id: string }>(G(`${p.externalId}/photos`), form({ url: p.imageUrl!, published: 'false', access_token: page_token }));
    const story = await call<{ post_id?: string; id?: string }>(G(`${p.externalId}/photo_stories`), form({ photo_id: photo.id, access_token: page_token }));
    return story.post_id ?? story.id ?? photo.id;
  }
  if (p.imageUrl) {
    const res = await call<{ post_id?: string; id: string }>(G(`${p.externalId}/photos`), form({ url: p.imageUrl, message: p.text, access_token: page_token }));
    return res.post_id ?? res.id;
  }
  const res = await call<{ id: string }>(G(`${p.externalId}/feed`), form({ message: p.text, access_token: page_token }));
  return res.id;
}

export async function publishInstagram(p: MetaPost) {
  if (!p.imageUrl) throw new Error('Instagram needs a photo.');
  const { page_token } = await tokenOf(p.accountId);
  const params: Record<string, string> = { image_url: p.imageUrl, access_token: page_token };
  if (p.kind === 'story') params.media_type = 'STORIES';
  else params.caption = p.text;
  const container = await call<{ id: string }>(G(`${p.externalId}/media`), form(params));
  // Instagram fetches and checks the photo first; wait until it is ready.
  for (let i = 0; i < 10; i++) {
    const s = await call<{ status_code?: string }>(G(`${container.id}?fields=status_code&access_token=${encodeURIComponent(page_token)}`));
    if (s.status_code === 'FINISHED' || !s.status_code) break;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error('Instagram could not use this photo (it must be a JPEG, 320–1440 px wide, ratio between 4:5 and 1.91:1 for posts).');
    await new Promise((r) => setTimeout(r, 3000));
  }
  const res = await call<{ id: string }>(G(`${p.externalId}/media_publish`), form({ creation_id: container.id, access_token: page_token }));
  return res.id;
}
