import { site } from '../../data/site';
import type { Info, TextField } from '../../cms/schema';
import { Field, LimitedText } from '../ui';
import type { TabProps } from '../App';

const tf = (value: string): TextField => ({ label: '', value, kind: 'line' });
const digits = (s: string) => s.replace(/\D/g, '').replace(/^(91)?(\d{10})$/, '$2');
const pretty = (d: string) => (d.length === 10 ? `${d.slice(0, 5)} ${d.slice(5)}` : d);

export function InfoTab({ content, edit }: TabProps) {
  const info: Partial<Info> = content.info ?? {};
  const set = (patch: Partial<Info>) => edit((c) => ({ ...c, info: { ...c.info, ...patch } }));
  const phone = info.phoneTel ? digits(info.phoneTel) : digits(site.phone.tel);
  const wa = info.whatsappNumber ? digits(info.whatsappNumber) : digits(site.whatsapp.number);
  const stats = info.stats ?? site.stats;
  const link = (key: 'instagram' | 'facebook' | 'youtube' | 'googleReviewsUrl', label: string, hint?: string) => {
    const def = key === 'googleReviewsUrl' ? site.googleReviewsUrl : site.social[key] ?? '';
    const value = info[key] ?? def;
    const bad = value && !/^https:\/\/[^\s]+$/.test(value);
    return (
      <Field label={label} hint={bad ? <span class="error">Must start with https://</span> : hint}>
        <input class="input" type="url" placeholder="https://…" value={value} onInput={(e) => set({ [key]: (e.currentTarget as HTMLInputElement).value.trim() })} />
      </Field>
    );
  };

  return (
    <div class="panel">
      <h2 class="panel__title">Contact & numbers</h2>
      <p class="note">Changes here update the header, footer, contact section, booking buttons and the details Google reads. Keep the phone and address <b>exactly the same as on your Google Business Profile</b>.</p>
      <div class="grid2">
        <Field label="Phone number (10 digits)" hint={phone.length === 10 ? `Shows as ${pretty(phone)}` : <span class="error">Enter 10 digits</span>}>
          <input class="input" inputMode="tel" value={phone} maxLength={14} onInput={(e) => {
            const d = digits((e.currentTarget as HTMLInputElement).value);
            if (d.length === 10) set({ phoneTel: `+91${d}`, phoneDisplay: pretty(d) });
          }} />
        </Field>
        <Field label="WhatsApp number (10 digits)" hint={wa.length === 10 ? `Shows as ${pretty(wa)}` : <span class="error">Enter 10 digits</span>}>
          <input class="input" inputMode="tel" value={wa} maxLength={14} onInput={(e) => {
            const d = digits((e.currentTarget as HTMLInputElement).value);
            if (d.length === 10) set({ whatsappNumber: `91${d}`, whatsappDisplay: pretty(d) });
          }} />
        </Field>
        <Field label="Address (as on Google)">
          <textarea class="input" rows={2} maxLength={160} value={info.address ?? site.address ?? ''} onInput={(e) => set({ address: (e.currentTarget as HTMLTextAreaElement).value })} />
        </Field>
        <Field label="Opening hours" hint="e.g. Mon–Sun · 6:00 AM – 9:00 PM. Leave empty to hide.">
          <input class="input" maxLength={60} value={info.hours ?? site.hours ?? ''} onInput={(e) => set({ hours: (e.currentTarget as HTMLInputElement).value })} />
        </Field>
        {link('instagram', 'Instagram link', 'Leave empty to hide the icon.')}
        {link('facebook', 'Facebook link', 'Leave empty to hide the icon.')}
        {link('youtube', 'YouTube link', 'Leave empty to hide the icon.')}
        {link('googleReviewsUrl', 'Google reviews link', 'Open your Google profile → Reviews → Share, and paste that link.')}
      </div>

      <h3>Numbers shown on the site</h3>
      <p class="muted">Used in the About section, the hero and the Reviews section. Update the review count as new Google reviews come in.</p>
      <div class="stats-edit">
        {stats.map((s, i) => (
          <div class="card">
            <Field label="Number"><LimitedText field={tf(site.stats[i].value)} maxWords={2} maxChars={10} value={s.value} onChange={(v) => set({ stats: stats.map((x, j) => (j === i ? { ...x, value: v } : x)) })} /></Field>
            <Field label="Label"><LimitedText field={tf(site.stats[i].label)} value={s.label} onChange={(v) => set({ stats: stats.map((x, j) => (j === i ? { ...x, label: v } : x)) })} /></Field>
          </div>
        ))}
      </div>
    </div>
  );
}
