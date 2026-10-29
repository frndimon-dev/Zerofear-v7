// Claude writes post captions and review replies in the Zero Fear voice.
import Anthropic from '@anthropic-ai/sdk';
import { site } from '../../data/site';
import { env } from './server';

const MODEL = 'claude-opus-5-5';
let client: Anthropic | null = null;
const claude = () => (client ??= new Anthropic({ apiKey: env('ANTHROPIC_API_KEY') }));

const BRAND = `You write for ${site.fullName} ("Zero Fear"), a scooty and bike training school in Kolkata.
Facts you may use (never invent others):
- One-to-one classes with patient, women-friendly trainers who have ${site.experienceYears}+ years of experience. Zero Fear itself started in ${site.founded}.
- Complete beginners welcome, even people who can't ride a cycle.
- Courses: Basic Scooty Training, Advanced Scooty Training, Bike (motorcycle) Training, RTO driving test preparation. From ₹2,500.
- Classes near Netaji Metro, Tollygunge; doorstep training within 10 km (Behala, Jadavpur, Garia, Naktala, Bansdroni, Kudghat, New Alipore).
- Tagline: Fear Out. Freedom In.
Never mention any other training brand. Never promise discounts, prices other than "from ₹2,500", or guaranteed licences.`;

async function ask(system: string, content: Anthropic.Beta.BetaContentBlockParam[]): Promise<string> {
  const res = await claude().beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low' },
    system,
    messages: [{ role: 'user', content }],
  });
  if (res.stop_reason === 'refusal') throw new Error('The AI could not write this one. Please write it yourself.');
  const text = res.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text').map((b) => b.text).join('').trim();
  if (!text) throw new Error('The AI returned an empty answer. Try again.');
  return text;
}

const CAPTION_RULES: Record<string, string> = {
  google: 'A Google Business Profile update. 300–600 characters, English, the main point in the first line. NO phone numbers, NO links, NO hashtags (Google rejects them) — the button carries the call or link. At most 2 emoji.',
  facebook: 'A Facebook page post. 300–700 characters, English with an optional short Bengali line. End with "Call or WhatsApp 79801 10273". 3–5 hashtags at the end.',
  instagram: 'An Instagram caption. First line is a hook naming the skill and place. 200–600 characters, English with an optional short Bengali line, then 4–5 hashtags such as #scootytraining #biketraining #kolkata #tollygunge #zerofear.',
};

export async function caption(provider: 'google' | 'facebook' | 'instagram', notes: string, imageUrl?: string | null) {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (imageUrl) content.push({ type: 'image', source: { type: 'url', url: imageUrl } });
  content.push({ type: 'text', text: `Write the text for this. ${CAPTION_RULES[provider]}\nWhat the owner wants to say: ${notes || '(nothing specific — describe the photo and invite beginners to book)'}\nReply with the post text only.` });
  return ask(BRAND, content);
}

export async function reviewReply(r: { reviewer: string; rating: number; comment: string }) {
  return ask(`${BRAND}
You reply to Google reviews as the Zero Fear team.
- Reply in the same language as the review (Bengali, Hindi or English). If there is no text, reply in English.
- 1–3 short sentences, warm and personal; use the reviewer's first name if it looks like a name.
- Mention what they learned (scooty / bike / RTO test) only if the review says so.
- For 1–3 stars: apologise without arguing, never reveal personal details, and invite them to call so we can make it right.
- No hashtags, no links, no phone numbers, no emoji except at most one 🙏 or 😊.
Reply with the reply text only.`, [{ type: 'text', text: `Review by ${r.reviewer || 'a learner'} (${r.rating}/5 stars):\n${r.comment || '(no text, stars only)'}` }]);
}
