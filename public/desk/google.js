// Business Desk → Google: Business Profile updates (scheduled) and review replies.
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
const POST_STATUS = { draft: 'draft', scheduled: 'scheduled', posting: 'posting…', posted: 'posted ✓', failed: 'failed' };
const REVIEW_STATUS = { new: 'new', drafted: 'reply waiting for you', posted: 'replied ✓', skipped: 'answered before', failed: 'failed' };
const stars = (n) => '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n));
const localInput = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export async function google({ h, sb, api, busy, toast, field, fmt, state, render }) {
  const ws = state.ws;
  const [{ data: locs }, { data: posts }, { data: reviews }] = await Promise.all([
    sb.from('accounts').select('*').eq('workspace_id', ws.id).eq('provider', 'google').order('name'),
    sb.from('gbp_posts').select('*, accounts(name)').eq('workspace_id', ws.id).order('scheduled_at', { ascending: false }).limit(30),
    sb.from('gbp_reviews').select('*, accounts(name)').eq('workspace_id', ws.id).order('created_time', { ascending: false, nullsFirst: false }).limit(40),
  ]);
  const on = (locs ?? []).filter((l) => l.enabled);

  // ---- connect + locations ----
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

  // ---- new update ----
  const loc = h('select', { class: 'input' }, on.map((a) => h('option', { value: a.id }, a.name)));
  const notes = h('input', { class: 'input', placeholder: 'e.g. ladies batch every morning, beginners welcome' });
  const text = h('textarea', { class: 'input', rows: 6 });
  const warn = h('p', { class: 'muted' });
  const check = () => { const p = problems(text.value); warn.textContent = p.length ? `⚠ ${p.join(' ')}` : `${text.value.length}/1500`; warn.style.color = p.length && text.value ? '#c0392b' : ''; };
  text.addEventListener('input', check);
  const image = h('input', { class: 'input', type: 'url', placeholder: 'https://… (a photo link, optional)' });
  const cta = h('select', { class: 'input' }, [['CALL', 'Call now'], ['BOOK', 'Book'], ['LEARN_MORE', 'Learn more'], ['', 'No button']].map(([v, l]) => h('option', { value: v }, l)));
  const ctaUrl = h('input', { class: 'input', type: 'url', placeholder: 'https://… (for Book / Learn more)' });
  const when = h('input', { class: 'input', type: 'datetime-local', value: localInput(new Date(Date.now() + 10 * 60000)) });
  const save = (status) => (e) => busy(e.target, async () => {
    const p = problems(text.value);
    if (p.length) throw new Error(p.join(' '));
    if (!loc.value) throw new Error('Switch on a Google profile first.');
    if (cta.value && cta.value !== 'CALL' && !/^https:\/\//.test(ctaUrl.value)) throw new Error('This button needs a link (https://…).');
    const { error } = await sb.from('gbp_posts').insert({
      workspace_id: ws.id, account_id: loc.value, text: text.value.trim(), image_url: image.value.trim() || null,
      cta: cta.value || null, cta_url: cta.value && cta.value !== 'CALL' ? ctaUrl.value.trim() : null,
      scheduled_at: new Date(when.value).toISOString(), status, created_by: state.session.user.email,
    });
    if (error) throw error;
    toast(status === 'draft' ? 'Saved as draft.' : `Scheduled for ${fmt(new Date(when.value).toISOString())}.`);
  });
  const newCard = h('div', { class: 'card' }, h('h2', {}, 'New Google update'),
    on.length ? [
      field('Profile', loc),
      h('div', { class: 'row2' }, field('What to say (for the AI)', notes),
        h('button', { class: 'btn', onclick: (e) => busy(e.target, async () => {
          const r = await api('google-caption', { workspaceId: ws.id, notes: notes.value, imageUrl: image.value.trim() }); text.value = r.text; check();
        }) }, '✨ Write with AI')),
      field('Post text', text), warn,
      field('Photo link', image, 'Optional. A JPG/PNG link that anyone can open.'),
      h('div', { class: 'row2' }, field('Button', cta), field('Button link', ctaUrl)),
      field('When', when, 'India time. It goes out within 5 minutes of this time.'),
      h('p', {}, h('button', { class: 'btn btn--primary', onclick: save('scheduled') }, 'Schedule'), ' ', h('button', { class: 'btn', onclick: save('draft') }, 'Save draft')),
      h('p', { class: 'muted' }, 'No prices, phone numbers or links in the text (Google rejects them; the AI never writes prices). Offers only from Stories → Offers.'),
    ] : h('p', { class: 'muted' }, 'Connect and switch on a Google profile above first.'));
  check();

  // ---- planned / sent ----
  const postsCard = h('div', { class: 'card' }, h('h2', {}, 'Updates'),
    (posts ?? []).length ? posts.map((p) => h('div', { class: 'acct' },
      h('b', {}, `${fmt(p.scheduled_at)} · ${p.accounts?.name ?? ''}`),
      h('span', { class: 'pill' }, POST_STATUS[p.status] ?? p.status),
      h('p', { class: 'muted', style: 'flex-basis:100%;margin:2px 0' }, p.text.slice(0, 220) + (p.text.length > 220 ? '…' : '')),
      p.error && h('p', { class: 'muted', style: 'flex-basis:100%;color:#c0392b;margin:2px 0' }, p.error),
      (p.status === 'failed' || p.status === 'draft') && h('button', { class: 'btn btn--small', onclick: async () => {
        const { error } = await sb.from('gbp_posts').update({ status: 'scheduled', attempts: 0, error: null, scheduled_at: new Date().toISOString() }).eq('id', p.id);
        if (error) toast(error.message, true); else toast('It will go out within 5 minutes.');
      } }, p.status === 'draft' ? 'Send now' : 'Retry'),
      p.status !== 'posted' && p.status !== 'posting' && h('button', { class: 'btn btn--small btn--danger', onclick: async () => {
        if (!confirm('Delete this update?')) return;
        const { error } = await sb.from('gbp_posts').delete().eq('id', p.id); if (error) toast(error.message, true); else render();
      } }, 'Delete'))) : h('p', { class: 'muted' }, 'No updates yet.'));

  // ---- reviews ----
  const g = ws.settings?.google ?? {};
  const auto = h('input', { type: 'checkbox', checked: g.autoReply ?? true });
  const minR = h('select', { class: 'input' }, [5, 4, 3].map((n) => h('option', { value: n, selected: (g.minRating ?? 4) === n }, `${n}★ and above`)));
  const saveRules = async () => {
    const settings = { ...(ws.settings ?? {}), google: { autoReply: auto.checked, minRating: Number(minR.value) } };
    const { error } = await sb.from('workspaces').update({ settings }).eq('id', ws.id);
    if (error) toast(error.message, true); else { ws.settings = settings; toast('Saved.'); }
  };
  auto.addEventListener('change', saveRules); minR.addEventListener('change', saveRules);
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

  return h('div', {}, locCard, newCard, postsCard, reviewsCard);
}
