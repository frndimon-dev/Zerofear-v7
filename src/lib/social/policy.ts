// Rules each platform enforces on post text. Used by the admin panel (warnings
// while typing) and by the server (a post that breaks them is not sent).

export type Kind = 'post' | 'story';
export type Provider = 'google' | 'facebook' | 'instagram';

const PHONE = /(\+?\d[\d\s-]{8,}\d)/;
const URL_RE = /(https?:\/\/|www\.)\S+/i;

export const limits: Record<Provider, number> = { google: 1500, facebook: 2200, instagram: 2200 };

export function problems(provider: Provider, kind: Kind, text: string, imageUrl?: string | null): string[] {
  const out: string[] = [];
  if (kind === 'story' && provider === 'google') out.push('Google has no stories. Choose "Post".');
  if (kind === 'story' && !imageUrl) out.push('A story needs a photo.');
  if (provider === 'instagram' && !imageUrl) out.push('Instagram needs a photo.');
  if (kind === 'post' && !text.trim() && provider !== 'instagram') out.push('Write the post text.');
  if (text.length > limits[provider]) out.push(`Too long for ${provider}: ${text.length}/${limits[provider]} letters.`);
  if (provider === 'google' && PHONE.test(text)) out.push('Google rejects posts with a phone number in the text. Use the "Call now" button instead.');
  if (provider === 'google' && URL_RE.test(text)) out.push('Google rejects links in the text. Use the "Learn more" button instead.');
  return out;
}
