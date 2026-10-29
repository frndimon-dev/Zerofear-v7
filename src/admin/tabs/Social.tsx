// Social media scheduler: connect Google / Facebook / Instagram, schedule posts
// and stories, and answer Google reviews. Works directly on the database
// (no "Save" button); the website server sends the posts when they are due.
import { useEffect, useState } from 'preact/hooks';
import { sb, explain, uploadImage } from '../supabase';
import { prepareJpeg } from '../images';
import { Field } from '../ui';
import { problems, limits, type Provider, type Kind } from '../../lib/social/policy';
import type { TabProps } from '../App';

type Account = { id: string; provider: Provider; external_id: string; name: string; enabled: boolean };
type Post = { id: string; account_id: string; kind: Kind; text: string; image_url: string | null; cta: string | null; cta_url: string | null; scheduled_at: string; status: string; error: string | null; posted_at: string | null };
type Review = { id: string; account_id: string; reviewer: string; rating: number; comment: string; created_time: string | null; reply: string; status: string; error: string | null };
type Status = { database: boolean; google: boolean; meta: boolean; ai: boolean; callbacks: { google: string; meta: string } };

const LABEL: Record<Provider, string> = { google: 'Google', facebook: 'Facebook', instagram: 'Instagram' };
const ICON: Record<Provider, string> = { google: 'G', facebook: 'f', instagram: '◎' };

async function api<T>(path: string, body?: unknown): Promise<T> {
  const { data } = await sb.auth.getSession();
  const res = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { authorization: `Bearer ${data.session?.access_token ?? ''}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error ?? `Error ${res.status}`);
  return out as T;
}

const fmt = (iso: string) => new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
function tomorrowAt(h: number) { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(h, 0, 0, 0); return d; }

export function SocialTab(_: TabProps) {
  const [status, setStatus] = useState<Status | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [settings, setSettings] = useState({ autoReply: true, minRating: 4 });
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState('');

  const load = async () => {
    try {
      const [a, p, r, s] = await Promise.all([
        sb.from('social_accounts').select('*').order('provider'),
        sb.from('social_posts').select('*').order('scheduled_at', { ascending: true }).limit(300),
        sb.from('social_reviews').select('*').order('created_time', { ascending: false }).limit(50),
        sb.from('social_settings').select('value').eq('key', 'reviews').maybeSingle(),
      ]);
      for (const x of [a, p, r, s]) if (x.error) throw x.error;
      setAccounts(a.data as Account[]); setPosts(p.data as Post[]); setReviews(r.data as Review[]);
      if (s.data) setSettings({ autoReply: true, minRating: 4, ...(s.data.value as object) });
    } catch (e) { setMsg({ kind: 'error', text: explain(e) }); }
  };

  useEffect(() => {
    load();
    api<Status>('/api/social/status').then(setStatus).catch((e) => setMsg({ kind: 'error', text: e.message }));
    const q = new URLSearchParams(location.search);
    if (q.get('connected')) setMsg({ kind: 'ok', text: `Connected: ${q.get('connected')}` });
    if (q.get('connect_error')) setMsg({ kind: 'error', text: `Could not connect: ${q.get('connect_error')}` });
    if (q.has('connected') || q.has('connect_error')) history.replaceState(null, '', `/admin#social`);
  }, []);

  const guard = async (label: string, fn: () => Promise<void>) => {
    setBusy(label); setMsg(null);
    try { await fn(); } catch (e) { setMsg({ kind: 'error', text: explain(e) }); } finally { setBusy(''); }
  };
  const connect = (provider: 'google' | 'meta') => guard('connect', async () => {
    const { url } = await api<{ url: string }>(`/api/social/oauth/${provider}/start`, {});
    location.href = url;
  });
  const runNow = () => guard('run', async () => {
    const r = await api<{ posts?: { sent: number; failed: number }; reviews?: { drafted?: number; replied?: number; error?: string } | null }>('/api/social/run', {});
    const p = r.posts ? `${r.posts.sent} sent, ${r.posts.failed} failed` : 'nothing due';
    const rv = r.reviews?.error ? ` · Reviews: ${r.reviews.error}` : r.reviews ? ` · Reviews: ${r.reviews.replied ?? 0} answered, ${r.reviews.drafted ?? 0} waiting for you` : '';
    setMsg({ kind: 'ok', text: `Posts: ${p}${rv}` });
    await load();
  });

  const name = (id: string) => { const a = accounts.find((x) => x.id === id); return a ? `${LABEL[a.provider]} · ${a.name}` : 'Removed account'; };
  const upcoming = posts.filter((p) => p.status !== 'posted');
  const done = posts.filter((p) => p.status === 'posted').reverse().slice(0, 20);

  return (
    <div class="panel social">
      <div class="social__head">
        <h2 class="panel__title">Social media</h2>
        <button type="button" class="btn btn--light" disabled={!!busy || !status?.database} onClick={runNow}>{busy === 'run' ? 'Running…' : 'Run now'}</button>
      </div>
      <p class="note">Posts and stories you schedule here are sent automatically at their time. Google reviews are checked every 30 minutes: {settings.autoReply ? `${settings.minRating}★ and above get an AI reply automatically, lower ratings wait for you below.` : 'replies wait for you below.'}</p>
      {msg && <p class={msg.kind === 'ok' ? 'ok' : 'error'}>{msg.text}</p>}

      {status && !(status.database && status.ai && (status.google || status.meta)) && <Setup s={status} />}

      <h3>Accounts</h3>
      <div class="social__accounts">
        {accounts.map((a) => (
          <div class={`acct ${a.enabled ? '' : 'is-off'}`}>
            <span class={`acct__icon acct__icon--${a.provider}`}>{ICON[a.provider]}</span>
            <span><b>{a.name || a.external_id}</b><br /><small class="muted">{LABEL[a.provider]}</small></span>
            <label class="acct__toggle"><input type="checkbox" checked={a.enabled} onChange={(e) => guard('acct', async () => {
              const { error } = await sb.from('social_accounts').update({ enabled: (e.currentTarget as HTMLInputElement).checked }).eq('id', a.id);
              if (error) throw error; await load();
            })} /> On</label>
            <button type="button" class="link" onClick={() => confirm(`Disconnect ${a.name}? Its scheduled posts are deleted too.`) && guard('acct', async () => {
              const { error } = await sb.from('social_accounts').delete().eq('id', a.id); if (error) throw error; await load();
            })}>Disconnect</button>
          </div>
        ))}
        {!accounts.length && <p class="muted">No accounts connected yet.</p>}
      </div>
      <div class="social__connect">
        <button type="button" class="btn btn--light" disabled={!!busy || !status?.google} onClick={() => connect('google')}>+ Connect Google Business Profile</button>
        <button type="button" class="btn btn--light" disabled={!!busy || !status?.meta} onClick={() => connect('meta')}>+ Connect Facebook & Instagram</button>
      </div>

      <h3>New post or story</h3>
      <Composer accounts={accounts.filter((a) => a.enabled)} aiReady={!!status?.ai} onDone={async (n) => { setMsg({ kind: 'ok', text: `${n} scheduled.` }); await load(); }} onError={(t) => setMsg({ kind: 'error', text: t })} />

      <h3>Scheduled ({upcoming.length})</h3>
      <div class="queue">
        {upcoming.map((p) => (
          <div class={`qrow qrow--${p.status}`}>
            {p.image_url ? <img src={p.image_url} alt="" loading="lazy" /> : <div class="qrow__noimg">Text</div>}
            <div class="qrow__body">
              <div><b>{fmt(p.scheduled_at)}</b> · {name(p.account_id)} · {p.kind === 'story' ? 'Story' : 'Post'} <span class={`badge badge--${p.status === 'failed' ? 'bad' : p.status === 'draft' ? 'warn' : 'ok'}`}>{p.status}</span></div>
              <p class="qrow__text">{p.text || <i class="muted">(no text)</i>}</p>
              {p.error && <p class="error small">{p.error}</p>}
            </div>
            <div class="qrow__actions">
              {(p.status === 'failed' || p.status === 'draft') && <button type="button" class="link" onClick={() => guard('q', async () => {
                const { error } = await sb.from('social_posts').update({ status: 'scheduled', error: null, attempts: 0, scheduled_at: p.status === 'failed' ? new Date().toISOString() : p.scheduled_at }).eq('id', p.id);
                if (error) throw error; await load();
              })}>{p.status === 'failed' ? 'Retry now' : 'Schedule'}</button>}
              {p.status !== 'posting' && <button type="button" class="link" onClick={() => confirm('Delete this scheduled item?') && guard('q', async () => {
                const { error } = await sb.from('social_posts').delete().eq('id', p.id); if (error) throw error; await load();
              })}>Delete</button>}
            </div>
          </div>
        ))}
        {!upcoming.length && <p class="muted">Nothing scheduled.</p>}
      </div>
      {done.length > 0 && <details><summary>Recently posted ({done.length})</summary>
        <div class="queue">{done.map((p) => <div class="qrow qrow--posted"><div class="qrow__body"><b>{fmt(p.posted_at ?? p.scheduled_at)}</b> · {name(p.account_id)} · {p.kind}<p class="qrow__text">{p.text}</p></div></div>)}</div>
      </details>}

      <h3>Google reviews</h3>
      <div class="grid2">
        <Field label="Automatic replies">
          <select class="input" value={settings.autoReply ? String(settings.minRating) : 'off'} onChange={(e) => guard('set', async () => {
            const v = (e.currentTarget as HTMLSelectElement).value;
            const value = v === 'off' ? { ...settings, autoReply: false } : { autoReply: true, minRating: Number(v) };
            const { error } = await sb.from('social_settings').upsert({ key: 'reviews', value }); if (error) throw error; setSettings(value);
          })}>
            <option value="5">Auto-reply to 5★ only</option>
            <option value="4">Auto-reply to 4★ and 5★ (recommended)</option>
            <option value="off">Never — I check every reply</option>
          </select>
        </Field>
      </div>
      <div class="reviews">
        {reviews.map((r) => <ReviewRow r={r} aiReady={!!status?.ai} onSaved={load} onError={(t) => setMsg({ kind: 'error', text: t })} />)}
        {!reviews.length && <p class="muted">No reviews loaded yet. They appear here after the Google profile is connected.</p>}
      </div>
    </div>
  );
}

function Setup({ s }: { s: Status }) {
  const row = (ok: boolean, text: string) => <li class={ok ? 'ok' : ''}>{ok ? '✓' : '○'} {text}</li>;
  return (
    <div class="card setup">
      <b>Finish the setup</b> (once — the full guide is in <code>docs/SOCIAL.md</code>):
      <ul>
        {row(s.database, 'Server secrets: SUPABASE_SECRET_KEY and SOCIAL_SECRET in hPanel → Environment variables')}
        {row(s.ai, 'AI writing: ANTHROPIC_API_KEY')}
        {row(s.google, 'Google: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET')}
        {row(s.meta, 'Facebook & Instagram: META_APP_ID and META_APP_SECRET')}
      </ul>
      <p class="muted">Redirect addresses to paste into Google Cloud and Meta: <code>{s.callbacks.google}</code> and <code>{s.callbacks.meta}</code></p>
    </div>
  );
}

type Target = { account: Account; kind: Kind };

function Composer({ accounts, aiReady, onDone, onError }: { accounts: Account[]; aiReady: boolean; onDone: (n: number) => void; onError: (t: string) => void }) {
  const [photo, setPhoto] = useState<{ url: string; w: number; h: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [kind, setKind] = useState<Kind>('post');
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [texts, setTexts] = useState<Record<Provider, string>>({ google: '', facebook: '', instagram: '' });
  const [notes, setNotes] = useState('');
  const [cta, setCta] = useState('CALL');
  const [ctaUrl, setCtaUrl] = useState('https://zerofear.in');
  const [when, setWhen] = useState(localInput(tomorrowAt(10)));
  const [writing, setWriting] = useState<Provider | ''>('');
  const [saving, setSaving] = useState(false);

  const usable = accounts.filter((a) => !(kind === 'story' && a.provider === 'google'));
  const targets: Target[] = usable.filter((a) => chosen.has(a.id)).map((account) => ({ account, kind }));
  const providers = [...new Set(targets.map((t) => t.account.provider))];
  const issues = providers.flatMap((p) => problems(p, kind, texts[p], photo?.url).map((m) => `${LABEL[p]}: ${m}`));
  if (photo && providers.includes('instagram') && kind === 'post') {
    const r = photo.w / photo.h;
    if (r < 0.8 || r > 1.91) issues.push('Instagram: posts must be between 4:5 (portrait) and 1.91:1 (landscape). Crop the photo or choose Story.');
  }

  const pick = async (e: Event) => {
    const f = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const p = await prepareJpeg(f);
      const url = await uploadImage(p.blob, 'social');
      setPhoto({ url, w: p.w, h: p.h });
    } catch (err) { onError(explain(err)); } finally { setUploading(false); }
  };
  const write = async (p: Provider) => {
    setWriting(p);
    try {
      const { text } = await api<{ text: string }>('/api/social/ai', { mode: 'caption', provider: p, notes, imageUrl: photo?.url });
      setTexts((t) => ({ ...t, [p]: text }));
    } catch (e) { onError((e as Error).message); } finally { setWriting(''); }
  };
  const save = async (asDraft: boolean) => {
    if (!targets.length) { onError('Choose at least one account.'); return; }
    if (!asDraft && issues.length) { onError(issues[0]); return; }
    const at = new Date(when);
    if (!asDraft && at.getTime() < Date.now() - 60_000) { onError('Choose a time in the future.'); return; }
    setSaving(true);
    try {
      const rows = targets.map(({ account, kind }) => ({
        account_id: account.id, kind, text: kind === 'story' ? '' : texts[account.provider].trim(), image_url: photo?.url ?? null,
        cta: account.provider === 'google' && cta ? cta : null,
        cta_url: account.provider === 'google' && cta && cta !== 'CALL' ? ctaUrl : null,
        scheduled_at: at.toISOString(), status: asDraft ? 'draft' : 'scheduled',
      }));
      const { error } = await sb.from('social_posts').insert(rows);
      if (error) throw error;
      setPhoto(null); setTexts({ google: '', facebook: '', instagram: '' }); setNotes(''); setChosen(new Set());
      onDone(rows.length);
    } catch (e) { onError(explain(e)); } finally { setSaving(false); }
  };

  if (!accounts.length) return <p class="muted">Connect an account first.</p>;
  return (
    <div class="card composer">
      <div class="grid2">
        <Field label="Photo" hint="Real class photos only. Blur number plates and stickers first (Photos tab editor).">
          <input class="input" type="file" accept="image/*" onChange={pick} disabled={uploading} />
          {uploading && <span class="muted">Uploading…</span>}
          {photo && <div class="composer__photo"><img src={photo.url} alt="" /><button type="button" class="link" onClick={() => setPhoto(null)}>Remove photo</button></div>}
        </Field>
        <div>
          <Field label="Type">
            <select class="input" value={kind} onChange={(e) => setKind((e.currentTarget as HTMLSelectElement).value as Kind)}>
              <option value="post">Post</option>
              <option value="story">Story (Facebook & Instagram, photo only, 24 hours)</option>
            </select>
          </Field>
          <Field label="Where">
            <div class="checks">
              {usable.map((a) => (
                <label><input type="checkbox" checked={chosen.has(a.id)} onChange={(e) => {
                  const next = new Set(chosen); (e.currentTarget as HTMLInputElement).checked ? next.add(a.id) : next.delete(a.id); setChosen(next);
                }} /> {LABEL[a.provider]} · {a.name}</label>
              ))}
            </div>
          </Field>
          <Field label="When (India time)">
            <input class="input" type="datetime-local" value={when} onInput={(e) => setWhen((e.currentTarget as HTMLInputElement).value)} />
          </Field>
        </div>
      </div>

      {kind === 'post' && providers.length > 0 && (
        <>
          <Field label="What should the post say? (for the AI, optional)" hint="e.g. new batch for ladies starting Monday, or a learner who rode alone after 5 classes">
            <input class="input" value={notes} onInput={(e) => setNotes((e.currentTarget as HTMLInputElement).value)} />
          </Field>
          {providers.map((p) => (
            <Field label={`${LABEL[p]} text`} hint={<span>{texts[p].length}/{limits[p]} letters{p === 'google' ? ' · no phone numbers or links (the button carries them)' : ''}</span>}>
              <textarea class="input" rows={5} value={texts[p]} onInput={(e) => setTexts((t) => ({ ...t, [p]: (e.currentTarget as HTMLTextAreaElement).value }))} />
              <button type="button" class="btn btn--light" disabled={!aiReady || !!writing} onClick={() => write(p)}>{writing === p ? 'Writing…' : `✨ Write with AI for ${LABEL[p]}`}</button>
            </Field>
          ))}
          {providers.includes('google') && (
            <div class="grid2">
              <Field label="Google button">
                <select class="input" value={cta} onChange={(e) => setCta((e.currentTarget as HTMLSelectElement).value)}>
                  <option value="CALL">Call now</option>
                  <option value="LEARN_MORE">Learn more (link)</option>
                  <option value="BOOK">Book (link)</option>
                  <option value="">No button</option>
                </select>
              </Field>
              {cta && cta !== 'CALL' && <Field label="Button link"><input class="input" type="url" value={ctaUrl} onInput={(e) => setCtaUrl((e.currentTarget as HTMLInputElement).value)} /></Field>}
            </div>
          )}
        </>
      )}

      {issues.length > 0 && <ul class="issues">{issues.map((i) => <li>{i}</li>)}</ul>}
      <div class="composer__actions">
        <button type="button" class="btn btn--primary" disabled={saving || uploading} onClick={() => save(false)}>{saving ? 'Saving…' : `Schedule${targets.length ? ` (${targets.length})` : ''}`}</button>
        <button type="button" class="btn btn--light" disabled={saving || uploading} onClick={() => save(true)}>Save as draft</button>
      </div>
    </div>
  );
}

function ReviewRow({ r, aiReady, onSaved, onError }: { r: Review; aiReady: boolean; onSaved: () => void; onError: (t: string) => void }) {
  const [text, setText] = useState(r.reply);
  const [busy, setBusy] = useState('');
  const open = r.status !== 'posted' && r.status !== 'skipped';
  const draft = async () => {
    setBusy('ai');
    try { setText((await api<{ text: string }>('/api/social/ai', { mode: 'reply', reviewId: r.id })).text); }
    catch (e) { onError((e as Error).message); } finally { setBusy(''); }
  };
  const post = async () => {
    setBusy('post');
    try { await api('/api/social/reply', { reviewId: r.id, text }); onSaved(); }
    catch (e) { onError((e as Error).message); } finally { setBusy(''); }
  };
  return (
    <div class={`review ${open ? 'is-open' : ''}`}>
      <div><b>{r.reviewer || 'Google user'}</b> <span class="stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span> <small class="muted">{r.created_time ? fmt(r.created_time) : ''}</small>
        <span class={`badge badge--${r.status === 'posted' || r.status === 'skipped' ? 'ok' : r.status === 'failed' ? 'bad' : 'warn'}`}>{r.status === 'skipped' ? 'already answered' : r.status === 'posted' ? 'answered' : r.status === 'failed' ? 'failed' : 'needs you'}</span></div>
      {r.comment && <p class="review__text">{r.comment}</p>}
      {r.error && <p class="error small">{r.error}</p>}
      {open ? (
        <>
          <textarea class="input" rows={3} value={text} placeholder="Your reply…" onInput={(e) => setText((e.currentTarget as HTMLTextAreaElement).value)} />
          <div class="composer__actions">
            <button type="button" class="btn btn--primary" disabled={!text.trim() || !!busy} onClick={post}>{busy === 'post' ? 'Posting…' : 'Post reply'}</button>
            <button type="button" class="btn btn--light" disabled={!aiReady || !!busy} onClick={draft}>{busy === 'ai' ? 'Writing…' : '✨ Write with AI'}</button>
          </div>
        </>
      ) : r.reply && <p class="review__reply">↳ {r.reply}</p>}
    </div>
  );
}
