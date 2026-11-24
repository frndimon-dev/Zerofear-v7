// Footage tab (owner, 24 Nov 2026): the owner's Google Photos class footage, searchable like Google Photos.
// Videos stay in Google Photos; this screen shows them straight from there. Each clip has what is said (Sarvam),
// who is in it (faces), what happens and a reel idea (Claude). Server: supabase/functions/footage (lib_* actions).
const SUPABASE_URL = 'https://wzesyetbiyxdgjyuhqoz.supabase.co';
const KIND = { tip: 'টিপস', first_day: 'প্রথম দিন', transformation: 'আগে-পরে', review: 'রিভিউ', interview: 'ইন্টারভিউ', practice: 'প্র্যাকটিস', fear: 'ভয়', fun: 'মজা', other: 'অন্যান্য' };
const TAGS = { height: 'হাইট', saree: 'শাড়ি', bike: 'বাইক', scooty: 'স্কুটি', brake: 'ব্রেক', u_turn: 'ইউ-টার্ন', balance: 'ব্যালান্স', clutch_gear: 'ক্লাচ-গিয়ার', main_road: 'বড় রাস্তা', traffic: 'ট্রাফিক', rain: 'বৃষ্টি', night: 'রাত', senior: 'বয়স্ক', fall: 'পড়ে যাওয়া', smile: 'হাসি', landmark: 'চেনা জায়গা' };
const css = `
.fb-top{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.fb-top input{flex:1;min-width:180px}
.fb-chips{display:flex;gap:6px;overflow-x:auto;padding:6px 0;scrollbar-width:none}.fb-chips button{white-space:nowrap;border:1px solid var(--line);background:#fff;border-radius:999px;padding:5px 12px;font:inherit;font-size:.85rem;cursor:pointer}
.fb-chips button.on{background:var(--accent);border-color:var(--accent);color:#fff}
.fb-day{margin:14px 2px 6px;font-weight:700;font-size:.95rem}
.fb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:4px}
.fb-t{position:relative;aspect-ratio:3/4;background:#ddd center/cover no-repeat;border-radius:6px;cursor:pointer;overflow:hidden;border:0;padding:0}
.fb-t span{position:absolute;font-size:11px;color:#fff;background:rgba(0,0,0,.55);border-radius:6px;padding:1px 5px}
.fb-t .d{right:4px;bottom:4px}.fb-t .s{left:4px;top:4px}.fb-t .s.hi{background:#0a7a3e}.fb-t .k{left:4px;bottom:4px}.fb-t .u{right:4px;top:4px;background:#b45309}
.fb-modal{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:50;display:flex;align-items:flex-end;justify-content:center}
.fb-sheet{background:#fff;width:min(720px,100%);max-height:92vh;overflow:auto;border-radius:16px 16px 0 0;padding:14px}
.fb-sheet video{width:100%;max-height:55vh;background:#000;border-radius:10px}
.fb-idea{background:#fff7e0;border-radius:10px;padding:10px;margin:10px 0;font-weight:600}
.fb-say{white-space:pre-wrap;font-size:.92rem;background:#f4f6f7;border-radius:10px;padding:10px;max-height:30vh;overflow:auto}
.fb-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}`;

export async function footage({ h, sb, busy, toast }) {
  if (!document.getElementById('fb-css')) document.head.append(h('style', { id: 'fb-css' }, css));
  const call = async (action, body = {}) => {
    const { data } = await sb.auth.getSession();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/footage`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session?.access_token ?? ''}` },
      body: JSON.stringify({ action, ...body }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.error || `Error ${res.status}`);
    return out;
  };
  const f = (() => { try { return JSON.parse(localStorage.getItem('fb_filter') || '{}'); } catch { return {}; } })();
  const save = () => { try { localStorage.setItem('fb_filter', JSON.stringify(f)); } catch {} };
  const out = h('div', {});
  const stats = h('p', { class: 'muted' }, 'লোড হচ্ছে…');
  const search = h('input', { class: 'input', type: 'search', placeholder: 'খুঁজুন: হাইট, সাইকেল জানি না, ব্রেক, শাড়ি, বারাসাত…', value: f.q || '' });
  const chipRow = (items, key) => h('div', { class: 'fb-chips' }, items.map(([v, label]) => h('button', {
    class: (f[key] ?? '') === v ? 'on' : '', onclick: () => { f[key] = (f[key] ?? '') === v && v !== '' ? '' : v; save(); load(true); repaintChips(); },
  }, label)));
  const chips = h('div', {});
  const repaintChips = () => chips.replaceChildren(
    chipRow([['', 'সব'], ['best', '⭐ সেরা (7+)'], ['talk', '💬 কথা আছে'], ['unused', 'এখনও ব্যবহার হয়নি'], ['score', '↓ সেরা আগে']], 'mode'),
    chipRow([['', 'সব ধরন'], ...Object.entries(KIND)], 'kind'),
    chipRow([['', 'সব বিষয়'], ...Object.entries(TAGS)], 'tag'));
  repaintChips();
  const grid = h('div', {});
  const more = h('button', { class: 'btn', style: 'display:none;margin:14px auto' }, 'আরও দেখান');
  let page = 0, lastDay = '';
  search.addEventListener('keydown', (e) => { if (e.key === 'Enter') { f.q = search.value.trim(); save(); load(true); } });
  more.onclick = () => busy(more, () => load(false));

  const dayLabel = (d) => new Date(d + 'T12:00:00').toLocaleDateString('bn-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).replace(/[০-৯]/g, (x) => '০১২৩৪৫৬৭৮৯'.indexOf(x));
  const secs = (s) => { s = Math.round(s || 0); return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}s`; };

  async function load(reset) {
    if (reset) { page = 0; lastDay = ''; grid.replaceChildren(h('p', { class: 'muted' }, 'খোঁজা হচ্ছে…')); }
    const body = { q: f.q, kind: f.kind || undefined, tag: f.tag || undefined, page, best: f.mode === 'best', talk: f.mode === 'talk', unused: f.mode === 'unused', sort: f.mode === 'score' ? 'score' : 'new' };
    let r;
    try { r = await call('lib_list', body); } catch (e) { grid.replaceChildren(h('p', { class: 'toast is-error' }, e.message)); return; }
    if (reset) grid.replaceChildren(h('p', { class: 'muted' }, `${r.total}টা ক্লিপ`));
    let box = grid.lastElementChild?.classList?.contains('fb-grid') ? grid.lastElementChild : null;
    for (const c of r.clips) {
      if (body.sort === 'new' && c.day !== lastDay) { lastDay = c.day; grid.append(h('div', { class: 'fb-day' }, dayLabel(c.day))); box = null; }
      if (!box) { box = h('div', { class: 'fb-grid' }); grid.append(box); }
      box.append(h('button', { class: 'fb-t', style: `background-image:url('${c.url}=w300-h400-no')`, title: c.summary || '', onclick: () => open(c.id) },
        c.score != null && h('span', { class: `s ${c.score >= 7 ? 'hi' : ''}` }, `${c.score}`),
        c.used_in && h('span', { class: 'u' }, 'ব্যবহৃত'),
        h('span', { class: 'k' }, (c.transcript ? '💬 ' : '') + (KIND[c.kind] || '')),
        h('span', { class: 'd' }, secs(c.dur_s))));
    }
    page += 1;
    more.style.display = page * r.size < r.total ? 'block' : 'none';
  }

  async function open(id) {
    const sheet = h('div', { class: 'fb-sheet' }, h('p', { class: 'muted' }, 'লোড হচ্ছে…'));
    const modal = h('div', { class: 'fb-modal', onclick: (e) => { if (e.target === modal) modal.remove(); } }, sheet);
    document.body.append(modal);
    let r;
    try { r = await call('lib_clip', { id }); } catch (e) { sheet.replaceChildren(h('p', { class: 'toast is-error' }, e.message)); return; }
    const c = r.clip, q = c.quality || {};
    const said = (c.speech || []).map((s) => `${secs(s.s)}  ${s.text}`).join('\n');
    const noTalk = { short: 'ছোট ক্লিপ, কথা পড়া হয়নি', 'little talk': 'কথা প্রায় নেই', 'no face': 'কোনো মুখ নেই', retake: 'রিটেক: আরেকটা টেকের কথা পড়া হয়েছে' }[q.no_stt] || 'কোনো কথা নেই';
    const usedBtn = h('button', { class: 'btn btn--small' }, c.used_in ? '✓ ব্যবহৃত (বাতিল)' : 'রিলে/স্টোরিতে ব্যবহার হয়েছে');
    usedBtn.onclick = () => busy(usedBtn, async () => { await call('lib_mark', { id, used_in: c.used_in ? '' : 'used' }); modal.remove(); load(true); });
    sheet.replaceChildren(
      h('div', { class: 'fb-row', style: 'justify-content:space-between;margin:0 0 8px' },
        h('b', {}, `${dayLabel(c.day)} · ${new Date(c.taken_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })} · ${secs(c.dur_s)}`),
        h('button', { class: 'btn btn--small', onclick: () => modal.remove() }, '✕')),
      h('video', { src: `${c.url}=m22`, poster: `${c.url}=w720-no`, controls: true, playsinline: true, preload: 'metadata' }),
      h('p', {}, c.summary || ''),
      c.idea && h('div', { class: 'fb-idea' }, '💡 ', c.idea),
      h('div', { class: 'chips' },
        c.kind && h('span', { class: 'chip' }, KIND[c.kind] || c.kind),
        (c.tags || []).map((t) => h('span', { class: 'chip' }, TAGS[t] || t)),
        c.score != null && h('span', { class: 'chip' }, `স্কোর ${c.score}/10`),
        q.face_visible === false && h('span', { class: 'chip' }, 'মুখ দেখা যায় না'),
        q.shaky && h('span', { class: 'chip' }, 'কাঁপা'), q.dark && h('span', { class: 'chip' }, 'অন্ধকার'),
        q.place_hint && h('span', { class: 'chip' }, '📍 ' + q.place_hint)),
      h('h3', {}, 'কী বলা হয়েছে'),
      said ? h('div', { class: 'fb-say' }, said) : h('p', { class: 'muted' }, noTalk),
      r.people.length ? h('p', { class: 'muted' }, `এই ক্লিপে ${r.people.length} জন (মুখ চেনা হয়েছে)। নাম দেওয়ার পাতা আসছে।`) : null,
      h('div', { class: 'fb-row' }, usedBtn,
        h('a', { class: 'btn btn--small', href: `${c.url}=dv`, target: '_blank', rel: 'noopener' }, 'আসল ভিডিও খুলুন')));
  }

  call('lib_stats').then((s) => {
    stats.textContent = `${s.done}টা ক্লিপ দেখা হয়েছে${s.new ? `, আর ${s.new}টা বাকি (পেছনে চলছে)` : ''}${s.sarvam_left != null ? ` · Sarvam-এ ₹${s.sarvam_left} বাকি` : ''}`;
  }).catch(() => { stats.textContent = ''; });
  out.append(
    h('div', { class: 'card' }, h('h2', { style: 'margin:0 0 6px' }, 'ফুটেজ লাইব্রেরি'), stats,
      h('div', { class: 'fb-top' }, search, h('button', { class: 'btn btn--primary', onclick: () => { f.q = search.value.trim(); save(); load(true); } }, 'খুঁজুন')),
      chips),
    grid, more);
  load(true);
  return out;
}
