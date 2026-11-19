// Business Desk → Google: Business Profile updates (weekly drafts for approval, the owner's own
// updates, offers and events), photos (1200×900) and review replies.
// Plain JavaScript; the "desk" Edge Function talks to Google.

const PHONE = /(\+?\d[\d\s-]{8,}\d)/;
const LINK = /(https?:\/\/|www\.)\S+/i;
function problems(text) {
  const out = [];
  if (!text.trim()) out.push('Write the post text.');
  if (text.length > 1500) out.push(`Too long: ${text.length}/1500 letters.`);
  if (PHONE.test(text)) out.push('Google rejects a phone number in the text. The "Call now" button carries the number.');
  if (LINK.test(text)) out.push('Google rejects links in the text. Use a button instead.');
  return out;
}
const POST_STATUS = { pending: 'waiting for your OK', draft: 'draft', scheduled: 'scheduled', posting: 'posting…', posted: 'posted ✓', failed: 'failed', skipped: 'skipped' };
const TOPIC = { STANDARD: 'Update', OFFER: 'Offer', EVENT: 'Event / announcement' };
const REVIEW_STATUS = { new: 'new', drafted: 'reply waiting for you', posted: 'replied ✓', skipped: 'answered before', failed: 'failed' };
const stars = (n) => '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n));
const localInput = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const today = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
const thumbStyle = 'height:72px;border-radius:8px;cursor:pointer;flex:none;border:3px solid transparent;object-fit:cover';

// 1200×900 JPG from a picked file, keeping the upper-middle part where faces usually are.
async function to1200x900(file) {
  const bmp = await createImageBitmap(file);
  const W = 1200, H = 900, s = Math.max(W / bmp.width, H / bmp.height);
  const w = bmp.width * s, hh = bmp.height * s;
  const c = Object.assign(document.createElement('canvas'), { width: W, height: H });
  c.getContext('2d').drawImage(bmp, (W - w) / 2, (H - hh) * 0.35, w, hh);
  return await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.86));
}

async function cropUpload(sb, wsId, srcUrl) {
  const res = await fetch(srcUrl); if (!res.ok) throw new Error('Could not load the photo.');
  const blob = await to1200x900(await res.blob());
  const path = `${wsId}/gbp/${crypto.randomUUID()}.jpg`;
  const up = await sb.storage.from('library').upload(path, blob, { contentType: 'image/jpeg' }); if (up.error) throw up.error;
  return path;
}

export async function google({ h, sb, api, busy, toast, field, fmt, state, render }) {
  const ws = state.ws;
  const [{ data: locs }, { data: posts }, { data: reviews }, { data: lib }] = await Promise.all([
    sb.from('accounts').select('*').eq('workspace_id', ws.id).eq('provider', 'google').order('name'),
    sb.from('gbp_posts').select('*, accounts(name)').eq('workspace_id', ws.id).neq('status', 'skipped').order('scheduled_at', { ascending: false }).limit(40),
    sb.from('gbp_reviews').select('*, accounts(name)').eq('workspace_id', ws.id).order('created_time', { ascending: false, nullsFirst: false }).limit(40),
    sb.from('media').select('id, path, kind, thumb_path').eq('workspace_id', ws.id).eq('status', 'ready').order('created_at', { ascending: false }).limit(60),
  ]);
  const on = (locs ?? []).filter((l) => l.enabled);
  const pending = (posts ?? []).filter((p) => p.status === 'pending').sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const others = (posts ?? []).filter((p) => p.status !== 'pending');

  // Signed links for every picture shown here (private library bucket).
  const libById = Object.fromEntries((lib ?? []).map((m) => [m.id, m]));
  const extraIds = pending.flatMap((p) => [...(p.extras ?? []), p.library_media_id]).filter((id) => id && !libById[id]);
  if (extraIds.length) { const { data } = await sb.from('media').select('id, path, kind, thumb_path').in('id', extraIds); (data ?? []).forEach((m) => { libById[m.id] = m; }); }
  const paths = [...new Set([...pending.map((p) => p.media_path), ...Object.values(libById).map((m) => (m.kind === 'video' ? m.thumb_path : m.path))].filter(Boolean))];
  const urls = {};
  if (paths.length) { const { data } = await sb.storage.from('library').createSignedUrls(paths, 3600); (data ?? []).forEach((d) => { if (d.signedUrl) urls[d.path] = d.signedUrl; }); }
  const thumbOf = (m) => urls[m?.kind === 'video' ? m.thumb_path : m?.path];

  // ---- connect + profiles ----
  const connect = (e) => busy(e.target, async () => {
    const { url } = await api('google-connect', { workspaceId: ws.id, returnUrl: location.origin + location.pathname });
    location.href = url;
  });
  const locCard = h('div', { class: 'card' }, h('h2', {}, `Google profiles of ${ws.name}`),
    (locs ?? []).length ? locs.map((a) => h('div', { class: 'acct' },
      h('span', {}, 'G'), h('b', {}, a.name), h('span', { class: 'pill' }, a.last_checked ? `reviews checked ${fmt(a.last_checked)}` : (a.enabled ? 'not checked yet' : 'off')),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: a.enabled, onchange: async (e) => {
        const { error } = await sb.from('accounts').update({ enabled: e.target.checked }).eq('id', a.id); if (error) toast(error.message, true); else render();
      } }), 'On'),
      h('button', { class: 'btn btn--small btn--danger', onclick: async () => {
        if (!confirm(`Remove ${a.name} from the desk? (Nothing changes on Google.)`)) return;
        const { error } = await sb.from('accounts').delete().eq('id', a.id); if (error) toast(error.message, true); else render();
      } }, 'Remove'))) : h('p', { class: 'muted' }, 'No Google profile connected yet.'),
    h('p', {}, h('button', { class: 'btn btn--primary', disabled: !state.status?.google, onclick: connect }, '+ Connect Google Business Profile')),
    !state.status?.google && h('p', { class: 'muted' }, 'The desk owner must add the Google keys first (Keys tab).'),
    h('p', { class: 'muted' }, 'Log in with the Google account that manages the profile. New profiles are added switched off: switch on only the ones that belong to this business. On the "unverified app" screen tap Advanced → Go to Business Desk; it is your own app.'));

  // ---- weekly drafts waiting for the owner ----
  const g = ws.settings?.google ?? {};
  const saveG = async (patch) => {
    const settings = { ...(ws.settings ?? {}), google: { ...(ws.settings?.google ?? {}), ...patch } };
    const { error } = await sb.from('workspaces').update({ settings }).eq('id', ws.id);
    if (error) toast(error.message, true); else { ws.settings = settings; toast('Saved.'); }
  };
  const autoDrafts = h('input', { type: 'checkbox', checked: g.autoDrafts ?? true, onchange: (e) => saveG({ autoDrafts: e.target.checked }) });
  const draftCard = (p) => {
    const box = h('textarea', { class: 'input', rows: 8 }); box.value = p.text;
    const warn = h('p', { class: 'muted' });
    const check = () => { const x = problems(box.value); warn.textContent = x.length ? `⚠ ${x.join(' ')}` : `${box.value.length}/1500`; warn.style.color = x.length ? '#c0392b' : ''; };
    box.addEventListener('input', check); check();
    let srcUrl = urls[p.media_path] ?? thumbOf(libById[p.library_media_id]) ?? '';
    let cropped = !!p.media_path;
    const img = h('img', { src: srcUrl, alt: '', style: `width:100%;max-width:480px;aspect-ratio:4/3;object-fit:cover;object-position:50% 35%;border-radius:10px;background:#eee;display:${srcUrl ? 'block' : 'none'}` });
    const extras = (p.extras ?? []).map((id) => libById[id]).filter(Boolean);
    return h('div', { class: 'card' },
      h('p', {}, h('b', {}, `${fmt(p.scheduled_at)} · ${p.accounts?.name ?? ''}`), ' ', h('span', { class: 'pill' }, p.theme ? `topic: ${p.theme}` : '')),
      img, srcUrl ? null : h('p', { class: 'muted' }, 'No photo (the library had none left). Tap "Another photo".'),
      extras.length ? h('div', {}, h('p', { class: 'muted', style: 'margin:8px 0 4px' }, 'Also goes to the profile\'s Photos:'),
        h('div', { style: 'display:flex;gap:6px' }, extras.map((m) => h('img', { src: thumbOf(m) ?? '', alt: m.kind, title: m.kind === 'video' ? 'video' : 'photo', style: `${thumbStyle};cursor:default` })))) : null,
      box, warn,
      h('p', {},
        h('button', { class: 'btn btn--primary', onclick: (e) => busy(e.target, async () => {
          const x = problems(box.value); if (x.length) throw new Error(x.join(' '));
          const patch = { text: box.value.trim(), status: 'scheduled' };
          if (!cropped && srcUrl) { patch.media_path = await cropUpload(sb, ws.id, srcUrl); cropped = true; } // 1200×900 for Google
          const { error } = await sb.from('gbp_posts').update(patch).eq('id', p.id); if (error) throw error;
          toast(`Approved. It goes out ${fmt(p.scheduled_at)}.`);
        }) }, '✓ Approve'), ' ',
        h('button', { class: 'btn', onclick: (e) => busy(e.target, async () => { const r = await api('google-rewrite', { postId: p.id }); box.value = r.text; check(); }) }, '✨ Rewrite'), ' ',
        h('button', { class: 'btn', onclick: (e) => busy(e.target, async () => { const r = await api('google-rephoto', { postId: p.id }); srcUrl = r.url; cropped = false; img.src = r.url; img.style.display = 'block'; }) }, '🖼 Another photo'), ' ',
        h('button', { class: 'btn btn--danger', onclick: (e) => busy(e.target, async () => {
          const { error } = await sb.from('gbp_posts').update({ status: 'skipped' }).eq('id', p.id); if (error) throw error; render();
        }) }, 'Skip')));
  };
  const weeklyCard = h('div', {},
    h('div', { class: 'card' }, h('h2', {}, 'Weekly updates'),
      h('label', { class: 'check' }, autoDrafts, 'Write 2 updates a week for every profile (Tue + Fri, 6:30 pm)'),
      h('p', { class: 'muted' }, 'Each draft has a 1200×900 photo from your library, local search words for that branch and a "Call now" button. Nothing goes out until you tap Approve. Approved updates also add their photo (and a short video once a week) to the profile\'s Photos.'),
      state.status?.isAdmin && h('button', { class: 'btn btn--small', onclick: (e) => busy(e.target, async () => { const r = await api('google-plan'); toast(r.made ? `${r.made} new drafts.` : 'Nothing new to draft for the next week.'); }) }, 'Make drafts now')),
    pending.length ? [h('h3', {}, `Waiting for your OK (${pending.length})`), ...pending.map(draftCard)] : null);

  // ---- the owner's own update / offer / event ----
  const loc = h('select', { class: 'input' }, on.map((a) => h('option', { value: a.id }, a.name)));
  const topic = h('select', { class: 'input' }, Object.entries(TOPIC).map(([v, l]) => h('option', { value: v }, l)));
  const title = h('input', { class: 'input', placeholder: 'e.g. Festive Season Offer / New branch in Patuli' });
  const from = h('input', { class: 'input', type: 'date', value: today() });
  const to = h('input', { class: 'input', type: 'date', value: today() });
  const extra = h('div', { style: 'display:none' }, field('Title', title), h('div', { class: 'row2' }, field('Starts', from), field('Ends', to)));
  topic.addEventListener('change', () => {
    extra.style.display = topic.value === 'STANDARD' ? 'none' : 'block';
    if (topic.value === 'OFFER') {
      const o = (ws.settings?.offers ?? []).find((x) => x.text && (!x.to || x.to >= today()));
      if (o) { title.value = o.text; if (o.from) from.value = o.from; if (o.to) to.value = o.to; }
      else toast('No offer in Stories → Offers. Add it there first; offers come only from there.', true);
    }
  });
  const notes = h('input', { class: 'input', placeholder: 'e.g. ladies batch every morning, beginners welcome' });
  const text = h('textarea', { class: 'input', rows: 6 });
  const warn = h('p', { class: 'muted' });
  const check = () => { const p = problems(text.value); warn.textContent = p.length ? `⚠ ${p.join(' ')}` : `${text.value.length}/1500`; warn.style.color = p.length && text.value ? '#c0392b' : ''; };
  text.addEventListener('input', check);
  let mediaPath = null, mediaId = null;
  const preview = h('img', { alt: '', style: 'display:none;width:100%;max-width:360px;aspect-ratio:4/3;object-fit:cover;border-radius:10px;margin:6px 0' });
  const setPhoto = (path, url, id = null) => { mediaPath = path; mediaId = id; preview.src = url; preview.style.display = path ? 'block' : 'none'; };
  const fileIn = h('input', { type: 'file', accept: 'image/*', class: 'input' });
  fileIn.addEventListener('change', () => busy(fileIn, async () => {
    const f = fileIn.files?.[0]; if (!f) return;
    const blob = await to1200x900(f);
    const path = `${ws.id}/gbp/${crypto.randomUUID()}.jpg`;
    const up = await sb.storage.from('library').upload(path, blob, { contentType: 'image/jpeg' }); if (up.error) throw up.error;
    const { data } = await sb.storage.from('library').createSignedUrl(path, 3600);
    setPhoto(path, data.signedUrl);
  }));
  const photos = (lib ?? []).filter((m) => m.kind === 'photo' && urls[m.path]).slice(0, 30);
  const strip = h('div', { style: 'display:flex;gap:6px;overflow-x:auto;padding:4px 0 10px' }, photos.map((m) => {
    const im = h('img', { src: urls[m.path], alt: '', loading: 'lazy', style: thumbStyle });
    im.addEventListener('click', () => busy(im, async () => {
      const path = await cropUpload(sb, ws.id, urls[m.path]);
      const { data } = await sb.storage.from('library').createSignedUrl(path, 3600); setPhoto(path, data.signedUrl, m.id);
      strip.querySelectorAll('img').forEach((x) => { x.style.borderColor = x === im ? '#2563eb' : 'transparent'; });
    }));
    return im;
  }));
  const when = h('input', { class: 'input', type: 'datetime-local', value: localInput(new Date(Date.now() + 10 * 60000)) });
  const save = (status) => (e) => busy(e.target, async () => {
    const p = problems(text.value); if (p.length) throw new Error(p.join(' '));
    if (!loc.value) throw new Error('Switch on a Google profile first.');
    if (topic.value !== 'STANDARD' && (!title.value.trim() || !from.value || !to.value)) throw new Error('An offer or event needs a title and dates.');
    const { error } = await sb.from('gbp_posts').insert({
      workspace_id: ws.id, account_id: loc.value, text: text.value.trim(), media_path: mediaPath, library_media_id: mediaId,
      topic: topic.value, title: topic.value === 'STANDARD' ? null : title.value.trim(), starts_on: topic.value === 'STANDARD' ? null : from.value, ends_on: topic.value === 'STANDARD' ? null : to.value,
      cta: 'CALL', scheduled_at: new Date(when.value).toISOString(), status, created_by: state.session.user.email,
    });
    if (error) throw error;
    toast(status === 'draft' ? 'Saved as draft.' : `Scheduled for ${fmt(new Date(when.value).toISOString())}.`);
  });
  const newCard = h('div', { class: 'card' }, h('h2', {}, 'Your own update, offer or announcement'),
    on.length ? [
      h('div', { class: 'row2' }, field('Profile', loc), field('Type', topic)), extra,
      h('div', { class: 'row2' }, field('What to say (for the AI)', notes),
        h('button', { class: 'btn', onclick: (e) => busy(e.target, async () => {
          const r = await api('google-caption', { workspaceId: ws.id, accountId: loc.value, notes: [topic.value !== 'STANDARD' ? `${TOPIC[topic.value]}: ${title.value}` : '', notes.value].filter(Boolean).join('. ') }); text.value = r.text; check();
        }) }, '✨ Write with AI')),
      field('Post text', text), warn,
      field('Photo (made 1200×900 automatically)', fileIn, 'Upload a photo, or tap one from your library below.'),
      strip, preview,
      field('When', when, 'India time. It goes out within 5 minutes of this time. Button: Call now.'),
      h('p', {}, h('button', { class: 'btn btn--primary', onclick: save('scheduled') }, 'Schedule'), ' ', h('button', { class: 'btn', onclick: save('draft') }, 'Save draft')),
      h('p', { class: 'muted' }, 'No prices, phone numbers or links in the text (Google rejects them; the AI never writes prices). Offers come only from Stories → Offers.'),
    ] : h('p', { class: 'muted' }, 'Connect and switch on a Google profile above first.'));
  check();

  // ---- planned / sent ----
  const postsCard = h('div', { class: 'card' }, h('h2', {}, 'Updates'),
    others.length ? others.map((p) => h('div', { class: 'acct' },
      h('b', {}, `${fmt(p.scheduled_at)} · ${p.accounts?.name ?? ''}`),
      h('span', { class: 'pill' }, `${p.topic && p.topic !== 'STANDARD' ? `${TOPIC[p.topic]} · ` : ''}${POST_STATUS[p.status] ?? p.status}`),
      h('p', { class: 'muted', style: 'flex-basis:100%;margin:2px 0' }, p.text.slice(0, 220) + (p.text.length > 220 ? '…' : '')),
      p.error && h('p', { class: 'muted', style: 'flex-basis:100%;color:#c0392b;margin:2px 0' }, p.error),
      (p.status === 'failed' || p.status === 'draft') && h('button', { class: 'btn btn--small', onclick: async () => {
        const { error } = await sb.from('gbp_posts').update({ status: 'scheduled', attempts: 0, error: null, scheduled_at: new Date().toISOString() }).eq('id', p.id);
        if (error) toast(error.message, true); else toast('It will go out within 5 minutes.');
      } }, p.status === 'draft' ? 'Send now' : 'Retry'),
      p.status === 'scheduled' && h('button', { class: 'btn btn--small', onclick: async () => {
        const { error } = await sb.from('gbp_posts').update({ status: 'pending' }).eq('id', p.id); if (error) toast(error.message, true); else render();
      } }, 'Hold'),
      p.status !== 'posted' && p.status !== 'posting' && h('button', { class: 'btn btn--small btn--danger', onclick: async () => {
        if (!confirm('Delete this update?')) return;
        const { error } = await sb.from('gbp_posts').delete().eq('id', p.id); if (error) toast(error.message, true); else render();
      } }, 'Delete'))) : h('p', { class: 'muted' }, 'No updates yet.'));

  // ---- reviews ----
  const auto = h('input', { type: 'checkbox', checked: g.autoReply ?? true, onchange: (e) => saveG({ autoReply: e.target.checked }) });
  const minR = h('select', { class: 'input', onchange: (e) => saveG({ minRating: Number(e.target.value) }) }, [5, 4, 3].map((n) => h('option', { value: n, selected: (g.minRating ?? 4) === n }, `${n}★ and above`)));
  const reviewRow = (r) => {
    const box = h('textarea', { class: 'input', rows: 3 }); box.value = r.reply ?? '';
    const open = r.status === 'new' || r.status === 'drafted' || r.status === 'failed';
    return h('div', { class: 'card' },
      h('p', {}, h('b', {}, `${stars(r.rating)} ${r.reviewer || 'Someone'}`), ' ', h('span', { class: 'pill' }, `${r.accounts?.name ?? ''} · ${fmt(r.created_time)} · ${REVIEW_STATUS[r.status] ?? r.status}`)),
      h('p', {}, r.comment || h('i', { class: 'muted' }, '(stars only)')),
      r.error && h('p', { class: 'muted', style: 'color:#c0392b' }, r.error),
      open ? [box, h('p', {},
        h('button', { class: 'btn', onclick: (e) => busy(e.target, async () => { const x = await api('google-draft', { reviewId: r.id }); box.value = x.text; }) }, '✨ Write with AI'), ' ',
        h('button', { class: 'btn btn--primary', onclick: (e) => busy(e.target, async () => { await api('google-reply', { reviewId: r.id, text: box.value }); toast('Reply posted on Google.'); }) }, 'Post reply'))]
        : r.reply && h('p', { class: 'muted' }, `↳ ${r.reply}`));
  };
  const waiting = (reviews ?? []).filter((r) => ['new', 'drafted', 'failed'].includes(r.status));
  const done = (reviews ?? []).filter((r) => !['new', 'drafted', 'failed'].includes(r.status));
  const reviewsCard = h('div', {},
    h('div', { class: 'card' }, h('h2', {}, 'Google reviews'),
      h('label', { class: 'check' }, auto, 'Reply by itself to good reviews'),
      field('Which reviews get the automatic reply', minR, 'Lower ratings get a reply written for you to check and send.'),
      h('p', { class: 'muted' }, 'Reviews are checked every 30 minutes.'),
      state.status?.isAdmin && h('button', { class: 'btn btn--small', onclick: (e) => busy(e.target, async () => { const r = await api('google-run'); toast(`Checked: ${JSON.stringify(r)}`); }) }, 'Check Google now')),
    waiting.length ? [h('h3', {}, `Waiting for you (${waiting.length})`), ...waiting.map(reviewRow)] : null,
    done.length ? [h('h3', {}, 'Recent'), ...done.slice(0, 15).map(reviewRow)] : null,
    !(reviews ?? []).length && h('p', { class: 'muted' }, 'No reviews loaded yet.'));

  return h('div', {}, weeklyCard, newCard, postsCard, reviewsCard, locCard);
}
