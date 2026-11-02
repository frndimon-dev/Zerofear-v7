// Stories tab: settings, which Instagram accounts get stories, the photo library (Google Photos albums
// and uploads) and the plan to approve. The server side is supabase/functions/_shared/stories.ts.
const TYPE_LABEL = { offer: 'অফার', tip: 'টিপস', poll: 'পোল', transform: 'আগে-পরে', problem: 'প্রবলেম → সমাধান', clip: 'ভিডিও' };
const PLAN_LABEL = { draft: 'waiting for OK', approved: 'approved', skipped: 'skipped', ready: 'made, will post', posting: 'posting…', posted: 'posted', failed: 'failed' };

export async function stories({ h, sb, api, busy, toast, field, fmt, state, render }) {
  const ws = state.ws;
  const [{ data: s0 }, { data: accounts }, { data: albums }, { data: media }, { data: plan }, used] = await Promise.all([
    sb.from('story_settings').select('*').eq('workspace_id', ws.id).maybeSingle(),
    sb.from('accounts').select('*').eq('workspace_id', ws.id).order('provider'),
    sb.from('albums').select('*').eq('workspace_id', ws.id).order('created_at'),
    sb.from('media').select('id, kind, path, thumb_path, branch, scope, status, hint, labels, use_count, error, created_at').eq('workspace_id', ws.id).order('created_at', { ascending: false }),
    sb.from('story_plan').select('*').eq('workspace_id', ws.id).gte('slot_at', new Date(Date.now() - 2 * 86400000).toISOString()).order('slot_at'),
    sb.rpc('storage_used').then((r) => r.data ?? 0),
  ]);
  const s = s0 ?? { workspace_id: ws.id, enabled: false, per_day_main: 3, per_day_branch: 1, times_main: ['09:00', '14:00', '19:00'], times_branch: ['12:00', '17:00'],
    mix: { offer: 5, tip: 5, poll: 3, transform: 3, problem: 3 }, branches: [], brand_name: ws.name, phones: [], colors: { color: '#0b6e75', accent: '#ffd166' }, tips: [], plan_days: 14 };
  const ig = (accounts ?? []).filter((a) => a.provider === 'instagram');
  const lib = media ?? [];
  const sign = async (bucket, paths) => {
    const list = paths.filter(Boolean); if (!list.length) return {};
    const { data } = await sb.storage.from(bucket).createSignedUrls(list, 3600);
    return Object.fromEntries((data ?? []).map((d) => [d.path, d.signedUrl]));
  };
  const thumbs = await sign('library', lib.map((m) => (m.kind === 'video' ? m.thumb_path : m.path)));
  const out = h('div', {});

  // ---------- settings ----------
  const list = (v) => v.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
  const inp = (v, attrs = {}) => h('input', { class: 'input', value: v ?? '', ...attrs });
  const f = {
    enabled: h('input', { type: 'checkbox', checked: s.enabled }), brand: inp(s.brand_name), phones: inp(s.phones.join(', ')), branches: inp(s.branches.join(', ')),
    pdm: inp(s.per_day_main, { type: 'number', min: 0, max: 10 }), pdb: inp(s.per_day_branch, { type: 'number', min: 0, max: 10 }),
    tm: inp(s.times_main.join(', ')), tb: inp(s.times_branch.join(', ')), days: inp(s.plan_days, { type: 'number', min: 1, max: 31 }),
    tips: h('textarea', { class: 'input', rows: 6 }, s.tips.join('\n')),
    mix: Object.fromEntries(Object.keys(TYPE_LABEL).filter((t) => t !== 'clip').map((t) => [t, inp(s.mix[t] ?? 0, { type: 'number', min: 0, max: 21, style: 'width:70px' })])),
  };
  const save = (e) => busy(e.target, async () => {
    const row = { workspace_id: ws.id, enabled: f.enabled.checked, brand_name: f.brand.value.trim(), phones: list(f.phones.value), branches: list(f.branches.value),
      per_day_main: +f.pdm.value, per_day_branch: +f.pdb.value, times_main: list(f.tm.value), times_branch: list(f.tb.value), plan_days: +f.days.value,
      tips: f.tips.value.split('\n').map((x) => x.trim()).filter(Boolean), mix: Object.fromEntries(Object.entries(f.mix).map(([k, el]) => [k, +el.value])), updated_at: new Date().toISOString() };
    if ([...row.times_main, ...row.times_branch].some((t) => !/^\d{1,2}:\d{2}$/.test(t))) throw new Error('Times look like 09:00, 14:30.');
    const { error } = await sb.from('story_settings').upsert(row); if (error) throw error;
    toast('Saved.');
  });
  out.append(h('details', { class: 'card', open: !s0 || !s.enabled },
    h('summary', {}, h('strong', {}, `Story settings ${s.enabled ? '· ON' : '· OFF'}`)),
    h('label', { class: 'check' }, f.enabled, ' Make and post stories for this business'),
    field('Name on the stories', f.brand), field('Phone numbers', f.phones, 'Comma between numbers.'),
    field('Branches', f.branches, 'Comma between names, e.g. Barasat, Tollygunge, New Town. Used for branch accounts and album labels.'),
    h('div', { class: 'row2' }, field('Main account: stories a day', f.pdm), field('Times', f.tm)),
    h('div', { class: 'row2' }, field('Each branch: stories a day', f.pdb), field('Times', f.tb)),
    field('Plan this many days ahead', f.days),
    field('Weekly mix (stories of each kind in 7 days)', h('div', { class: 'mix' }, Object.entries(f.mix).map(([t, el]) => h('label', {}, TYPE_LABEL[t], el)))),
    field('Approved tips (one per line)', f.tips, 'The AI only picks from these for tip stories. No tips = no tip stories.'),
    h('button', { class: 'btn btn--primary', onclick: save }, 'Save settings')));

  // ---------- accounts ----------
  out.append(h('div', { class: 'card' }, h('h2', {}, 'Accounts that get stories'),
    ig.length ? ig.map((a) => {
      const on = h('input', { type: 'checkbox', checked: a.stories });
      const br = h('select', { class: 'input', style: 'width:auto' }, h('option', { value: '' }, 'Main account'), s.branches.map((b) => h('option', { value: b, selected: a.branch === b }, b)));
      const upd = async () => { const { error } = await sb.from('accounts').update({ stories: on.checked, branch: br.value }).eq('id', a.id); if (error) toast(error.message, true); };
      on.addEventListener('change', upd); br.addEventListener('change', upd);
      return h('div', { class: 'acct' }, h('label', { class: 'check' }, on, ` ${a.name}`), br);
    }) : h('p', { class: 'muted' }, 'No Instagram account yet. Connect it in the Accounts tab.'),
    h('p', { class: 'muted' }, 'Each story also goes to the Facebook page the Instagram account is linked to.')));

  // ---------- library ----------
  const ready = lib.filter((m) => m.status === 'ready');
  const byBranch = {}; for (const m of ready) { const k = m.branch || 'general'; byBranch[k] = (byBranch[k] ?? 0) + 1; }
  const waiting = lib.filter((m) => m.status === 'new' || m.status === 'tag').length;
  const bad = lib.filter((m) => m.status === 'unusable' || m.status === 'error').length;
  const low = ig.filter((a) => a.stories && a.branch).filter((a) => (byBranch[a.branch] ?? 0) < 3 * s.per_day_branch);
  const url = inp('', { placeholder: 'Google Photos shared album link (photos.app.goo.gl/…)' });
  const abr = h('select', { class: 'input' }, h('option', { value: '' }, 'Branch: decide from photos'), s.branches.map((b) => h('option', { value: b }, b)));
  const hint = h('select', { class: 'input' }, h('option', { value: '' }, 'Kind: AI decides'), ['offer', 'tip', 'transform'].map((t) => h('option', { value: t }, TYPE_LABEL[t])));
  const addAlbum = (e) => busy(e.target, async () => {
    const u = url.value.trim(); if (!/^https:\/\/(photos\.app\.goo\.gl|photos\.google\.com)\//.test(u)) throw new Error('Paste a Google Photos shared album link.');
    const { error } = await sb.from('albums').insert({ workspace_id: ws.id, url: u, branch: abr.value, hint: hint.value }); if (error) throw error;
    toast('Album added. Photos arrive within a few minutes; videos within 2 hours.');
  });
  const files = h('input', { type: 'file', accept: 'image/*', multiple: true, style: 'display:none' });
  files.addEventListener('change', async () => {
    let n = 0;
    for (const file of files.files) {
      try {
        const blob = await shrink(file);
        const id = crypto.randomUUID(); const path = `${ws.id}/${id}.jpg`;
        const up = await sb.storage.from('library').upload(path, blob, { contentType: 'image/jpeg' }); if (up.error) throw up.error;
        const { error } = await sb.from('media').insert({ id, workspace_id: ws.id, source_key: `upload:${file.name}:${file.size}`, kind: 'photo', path, status: 'tag', branch: abr.value, hint: hint.value });
        if (error) throw error; n++;
      } catch (e) { toast(`${file.name}: ${e.message}`, true); }
    }
    toast(`${n} photo(s) added.`);
  });
  const mb = (b) => `${Math.round(b / 1048576)} MB`;
  const pct = Math.min(100, Math.round((used / 1073741824) * 100));
  out.append(h('div', { class: 'card' }, h('h2', {}, 'Library ', h('small', { class: 'muted' }, `${ready.length} ready · ${waiting} being read · ${bad} not usable`)),
    h('div', { class: 'row2' }, url, h('button', { class: 'btn btn--primary', onclick: addAlbum }, 'Add album')),
    h('div', { class: 'row2' }, abr, hint),
    h('p', {}, h('button', { class: 'btn', onclick: () => files.click() }, 'Upload photos from this device'), files,
      h('small', { class: 'muted' }, ' Photos are made small before uploading. Videos: put them in a Google Photos album.')),
    h('div', { class: 'chips' }, Object.entries(byBranch).map(([b, n]) => h('span', { class: 'chip' }, `${b === 'general' ? 'any branch' : b} ${n}`))),
    h('div', { class: 'meter' }, h('i', { style: `width:${pct}%;background:${pct > 85 ? 'var(--bad)' : pct > 70 ? 'var(--warn)' : 'var(--ok)'}` })),
    h('small', { class: 'muted' }, `Space: ${mb(used)} of 1 GB used`),
    pct > 70 && h('p', { class: 'toast is-error' }, `Storage is ${pct}% full.`),
    low.map((a) => h('p', { class: 'toast is-error' }, `${a.branch}: only ${byBranch[a.branch] ?? 0} own photos left. General photos will be used; add new ones.`)),
    (albums ?? []).map((a) => h('div', { class: 'acct' }, h('small', {}, `${a.branch || 'any branch'} · ${a.hint ? TYPE_LABEL[a.hint] : 'AI decides'} · ${a.last_checked ? `checked ${fmt(a.last_checked)}` : 'waiting'}${a.last_error ? ` · ⚠ ${a.last_error}` : ''}`),
      h('button', { class: 'btn btn--small', onclick: async () => { if (!confirm('Stop reading this album? Photos already in the library stay.')) return; await sb.from('albums').delete().eq('id', a.id); render(); } }, 'Remove'))),
    h('div', { class: 'grid' }, lib.slice(0, 48).map((m) => h('figure', { class: `thumb ${m.status}` },
      h('img', { src: thumbs[m.kind === 'video' ? m.thumb_path : m.path] ?? '', alt: '', loading: 'lazy', title: m.labels?.description ?? m.error ?? '' }),
      h('figcaption', {}, m.status === 'ready' ? `${m.branch || 'any'} · used ${m.use_count}` : m.status === 'unusable' ? `✗ ${m.error ?? ''}` : m.status)))),
  ));

  // ---------- plan ----------
  const accName = Object.fromEntries((accounts ?? []).map((a) => [a.id, a.branch ? `${a.branch}` : a.name]));
  const planMedia = await sign('library', (plan ?? []).map((p) => { const m = lib.find((x) => x.id === p.media_id); return m ? (m.kind === 'video' ? m.thumb_path : m.path) : null; }));
  const outs = await sign('stories', (plan ?? []).filter((p) => p.out_path).map((p) => p.out_path));
  const drafts = (plan ?? []).filter((p) => p.status === 'draft');
  const approveAll = (e) => busy(e.target, async () => {
    const { error } = await sb.from('story_plan').update({ status: 'approved' }).eq('workspace_id', ws.id).eq('status', 'draft').gt('slot_at', new Date().toISOString());
    if (error) throw error; toast(`${drafts.length} stories approved.`);
  });
  const makePlan = (e) => busy(e.target, async () => { const r = await api('plan', { workspaceId: ws.id }); toast(r.made ? `${r.made} new stories planned. Press again for more.` : 'Nothing new to plan (check settings, accounts and the library).'); });
  const days = {}; for (const p of plan ?? []) { const d = new Date(p.slot_at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }); (days[d] ??= []).push(p); }
  const card = (p) => {
    const m = lib.find((x) => x.id === p.media_id);
    const img = m ? planMedia[m.kind === 'video' ? m.thumb_path : m.path] : '';
    const c = p.content ?? {};
    const toggle = async () => { const next = p.status === 'skipped' ? 'draft' : 'skipped'; await sb.from('story_plan').update({ status: next, skip_reason: next === 'skipped' ? 'owner' : null }).eq('id', p.id); render(); };
    const edit = async () => { const t = prompt('Words on the story', c.title ?? ''); if (t === null) return; await sb.from('story_plan').update({ content: { ...c, title: t }, status: p.status === 'approved' ? 'approved' : 'draft', out_path: null }).eq('id', p.id); render(); };
    return h('div', { class: `st ${p.status}` },
      img ? h('img', { src: img, alt: '' }) : h('div', { class: 'noimg' }),
      h('b', {}, `${new Date(p.slot_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })} · ${TYPE_LABEL[p.type] ?? p.type}`),
      h('small', {}, accName[p.account_id] ?? ''), h('p', {}, c.title || c.problem || ''),
      h('small', { class: 'muted' }, PLAN_LABEL[p.status], p.error ? ` · ${p.error}` : ''),
      outs[p.out_path] && h('a', { href: outs[p.out_path], target: '_blank' }, '▶ watch'),
      ['draft', 'skipped', 'approved'].includes(p.status) && h('div', {}, h('button', { class: 'btn btn--small', onclick: toggle }, p.status === 'skipped' ? 'Bring back' : 'Skip'), h('button', { class: 'btn btn--small', onclick: edit }, 'Edit words')));
  };
  out.append(h('div', { class: 'card' }, h('h2', {}, 'Plan'),
    h('p', {}, h('button', { class: 'btn', onclick: makePlan }, 'Plan more now'), ' ',
      drafts.length ? h('button', { class: 'btn btn--primary', onclick: approveAll }, `✓ All ${drafts.length} look fine`) : null),
    h('p', { class: 'muted' }, 'New stories are planned every 10 minutes for the next days. Only approved stories are made and posted; one not approved by its time is skipped.'),
    Object.keys(days).length ? Object.entries(days).map(([d, ps]) => h('div', { class: 'day' }, h('h3', {}, d), h('div', { class: 'strip' }, ps.map(card))))
      : h('p', { class: 'muted' }, 'Nothing planned yet. Turn stories on, choose accounts, and add photos.')));
  return out;
}

// A phone photo (5–15 MB) becomes a story-sized JPEG of a few hundred KB before it is uploaded.
async function shrink(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1440 / Math.min(bmp.width, bmp.height), 2560 / Math.max(bmp.width, bmp.height));
  const c = Object.assign(document.createElement('canvas'), { width: Math.round(bmp.width * k), height: Math.round(bmp.height * k) });
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.82));
}
