// Footage tab (owner, 24 Nov 2026): the owner's Google Photos class footage, searchable like Google Photos.
// Videos stay in Google Photos; this screen shows them straight from there. Each clip has what is said (Sarvam),
// who is in it (faces), what happens and a reel idea (Claude). Server: supabase/functions/footage (lib_* actions).
const SUPABASE_URL = 'https://wzesyetbiyxdgjyuhqoz.supabase.co';
const KIND = { tip: 'টিপস ও ট্রিকস', first_day: 'প্রথম দিন', transformation: 'আগে-পরে', review: 'রিভিউ', interview: 'ইন্টারভিউ', practice: 'প্র্যাকটিস', fear: 'ভয়', fun: 'মজা', other: 'অন্যান্য' };
const TAGS = { height: 'হাইট', saree: 'শাড়ি', bike: 'বাইক', scooty: 'স্কুটি', brake: 'ব্রেক', u_turn: 'ইউ-টার্ন', balance: 'ব্যালান্স', clutch_gear: 'ক্লাচ-গিয়ার', main_road: 'বড় রাস্তা', traffic: 'ট্রাফিক', rain: 'বৃষ্টি', night: 'রাত', senior: 'বয়স্ক', fall: 'পড়ে যাওয়া', smile: 'হাসি', landmark: 'চেনা জায়গা' };
const en = (t) => String(t ?? '').replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d));
const BRANCHES = [['tollygunge', 'টালিগঞ্জ'], ['rabindra-sarovar', 'রবীন্দ্র সরোবর'], ['patuli', 'পাটুলি'], ['new-town', 'নিউ টাউন'], ['barasat', 'বারাসাত'], ['sodepur', 'সোদপুর'], ['howrah', 'হাওড়া']];
const ROLES = [['', '— কে? —'], ['owner', 'মালিক / কো-ওনার'], ['trainer', 'ট্রেনার'], ['learner', 'শিক্ষার্থী'], ['ex_trainer', 'পুরনো ট্রেনার (কখনও দেখাবে না)'], ['staff', 'স্টাফ'], ['other', 'অন্য']];
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
.fb-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.fb-ppl{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px;margin-top:10px}
.fb-p{border:1px solid var(--line);border-radius:12px;padding:10px;background:#fff;display:flex;flex-direction:column;gap:6px}
.fb-p img{width:72px;height:72px;border-radius:50%;object-fit:cover;background:#ddd}
.fb-views{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:4px 0 8px}.fb-views button{border:2px solid var(--line);background:#fff;border-radius:12px;padding:10px 6px;font:inherit;font-weight:800;font-size:.95rem;cursor:pointer;line-height:1.2}.fb-views button small{display:block;font-weight:500;font-size:.72rem;color:var(--muted,#667)}
.fb-views button.on{border-color:#e5254d;background:#fff1f3;color:#b0102f}
.fb-t .v{left:4px;top:4px;background:#e5254d;font-weight:800}.fb-t .v.mid{background:#d97706}.fb-t .v.low{background:#6b7280}
.fb-j{border:2px solid #f3c2cb;background:#fff8f9;border-radius:14px;padding:12px;margin:10px 0}
.fb-j .big{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.fb-j .pct{font-size:2rem;font-weight:900;color:#b0102f;line-height:1}
.fb-j .vd{border-radius:999px;padding:3px 10px;font-weight:800;font-size:.85rem;color:#fff}.fb-j .vd.make{background:#0a7a3e}.fb-j .vd.fix{background:#d97706}.fb-j .vd.skip{background:#6b7280}
.fb-j .hook{font-size:1.1rem;font-weight:800;margin:8px 0;background:#111;color:#ffd60a;border-radius:10px;padding:8px 10px}
.fb-j dl{display:grid;grid-template-columns:auto 1fr;gap:4px 10px;margin:8px 0;font-size:.9rem}.fb-j dt{font-weight:700}
.fb-bars{display:grid;grid-template-columns:1fr auto;gap:2px 8px;font-size:.78rem;margin-top:6px}.fb-bars i{display:inline-block;width:14px;height:8px;border-radius:2px;margin-right:2px;background:#e5e7eb}.fb-bars i.f{background:#e5254d}
.fb-p.named{border-color:#0a7a3e}.fb-p .fb-ph{display:flex;gap:10px;align-items:center}
.fb-p select,.fb-p input{font:inherit;padding:6px;border:1px solid var(--line);border-radius:8px;width:100%}`;

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
  f.view ??= 'make';
  const VIEWS = [['journey', '🦋 আগে → পরে', 'একই জনের দিন-দিন'], ['make', '🔥 বানানোর মতো', 'ভাইরাল সম্ভাবনা আগে'], ['tips', '💡 টিপস ও ট্রিকস', 'শেখানোর ক্লিপ'], ['all', '🎞️ সব ফুটেজ', 'দিন ধরে']];
  const views = h('div', { class: 'fb-views' });
  const repaintViews = () => views.replaceChildren(...VIEWS.map(([v, t, sub]) => h('button', { class: f.view === v ? 'on' : '', onclick: () => { f.view = v; save(); repaintViews(); load(true); } }, t, h('small', {}, sub))));
  repaintViews();
  const repaintChips = () => chips.replaceChildren(
    chipRow([['', 'সব'], ['best', '⭐ সেরা (7+)'], ['talk', '💬 কথা আছে'], ['unused', 'এখনও ব্যবহার হয়নি'], ['score', '↓ সেরা আগে']], 'mode'),
    chipRow([['', 'সব ধরন'], ...Object.entries(KIND)], 'kind'),
    chipRow([['', 'সব বিষয়'], ...Object.entries(TAGS)], 'tag'),
    chipRow([['', 'সব ব্রাঞ্চ'], ...BRANCHES], 'branch'),
    ...(f.person ? [h('div', { class: 'fb-chips' }, h('button', { class: 'on', onclick: () => { f.person = ''; save(); load(true); repaintChips(); } }, `একজন মানুষের ক্লিপ ✕`))] : []));
  repaintChips();
  const grid = h('div', {});
  const more = h('button', { class: 'btn', style: 'display:none;margin:14px auto' }, 'আরও দেখান');
  let page = 0, lastDay = '';
  search.addEventListener('keydown', (e) => { if (e.key === 'Enter') { f.q = search.value.trim(); save(); load(true); } });
  more.onclick = () => busy(more, () => load(false));

  const dayLabel = (d) => new Date(d + 'T12:00:00').toLocaleDateString('bn-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).replace(/[০-৯]/g, (x) => '০১২৩৪৫৬৭৮৯'.indexOf(x));
  const secs = (s) => { s = Math.round(s || 0); return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}s`; };

  async function loadJourneys() {
    grid.replaceChildren(h('p', { class: 'muted' }, 'খোঁজা হচ্ছে…')); more.style.display = 'none';
    let r; try { r = await call('lib_journeys'); } catch (e) { grid.replaceChildren(h('p', { class: 'toast is-error' }, e.message)); return; }
    if (!r.people.length) { grid.replaceChildren(h('p', { class: 'muted' }, 'এখনও তৈরি হচ্ছে — একই শিক্ষার্থীর প্রথম আর শেষ দিন মেলানো চলছে। একটু পরে দেখুন।')); return; }
    grid.replaceChildren(h('p', { class: 'muted' }, `${r.people.length} জন শিক্ষার্থী — যার বদল সবচেয়ে চোখে পড়ে সে আগে`),
      h('div', { class: 'fb-ppl' }, ...r.people.map((p) => { const j = p.journey;
        return h('button', { class: 'fb-p', style: 'text-align:left;cursor:pointer;font:inherit', onclick: () => openJourney(p) },
          h('div', { class: 'fb-ph' }, h('img', { src: p.cover_crop ? `data:image/jpeg;base64,${p.cover_crop}` : '', alt: '' }),
            h('div', {}, h('b', {}, en(j.title)), h('div', { class: 'muted', style: 'font-size:.8rem' }, `${en(j.days)} দিন ক্যামেরায় · ${dayLabel(j.first.day)} → ${dayLabel(j.last.day)}`))),
          h('div', {}, h('span', { class: 'chip', style: 'background:#e5254d;color:#fff' }, `🔥 ${j.viral_pct}%`), ' ', h('span', { class: 'chip' }, `বদল ${j.score}/10`)));
      })));
  }
  function openJourney(p) {
    const j = p.journey;
    const vid = (c, s) => h('div', {}, h('b', {}, c === j.first ? `প্রথম দিন · ${dayLabel(c.day)}` : `শেষ দিন · ${dayLabel(c.day)}`),
      h('video', { src: `${c.url}=m22#t=${Math.max(0, (s || 0) - 1)}`, controls: true, playsinline: true, preload: 'metadata', style: 'width:100%;max-height:45vh;background:#000;border-radius:10px' }),
      h('div', { class: 'muted', style: 'font-size:.8rem' }, `সেরা মুহূর্ত: ${secs(s)}`));
    const sheet = h('div', { class: 'fb-sheet' },
      h('div', { class: 'fb-row', style: 'justify-content:space-between;margin:0 0 8px' }, h('b', {}, en(j.title)), h('button', { class: 'btn btn--small', onclick: () => modal.remove() }, '✕')),
      h('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:8px' }, vid(j.first, j.before_s), vid(j.last, j.after_s)),
      h('div', { class: 'fb-j' },
        h('div', { class: 'big' }, h('span', { class: 'pct' }, `${j.viral_pct}%`), h('span', {}, 'ভাইরাল হওয়ার সম্ভাবনা', h('br'), h('small', { class: 'muted' }, `বদল কতটা চোখে পড়ে: ${j.score}/10 · ${en(j.days)} দিনের ফুটেজ`))),
        j.hook && h('div', { class: 'hook' }, '🎬 শুরুর লেখা: ', en(j.hook)),
        h('p', {}, en(j.story)),
        h('table', { style: 'width:100%;font-size:.88rem;border-collapse:collapse' }, h('tr', {}, h('th', { style: 'text-align:left' }, ''), h('th', { style: 'text-align:left' }, 'আগে'), h('th', { style: 'text-align:left' }, 'পরে')),
          ...(j.changes || []).map((c) => h('tr', { style: 'border-top:1px solid #eee' }, h('td', {}, h('b', {}, en(c.what))), h('td', {}, en(c.before)), h('td', {}, en(c.after))))),
        h('dl', {}, h('dt', {}, 'কীভাবে বানাবেন'), h('dd', { style: 'white-space:pre-wrap' }, en(j.plan)), h('dt', {}, 'কী কম আছে'), h('dd', {}, en(j.weak)))),
      h('div', { class: 'fb-row' }, h('button', { class: 'btn btn--small', onclick: () => { modal.remove(); f.person = String(p.id); f.view = 'all'; save(); repaintViews(); repaintChips(); load(true); } }, 'এর সব ক্লিপ দেখুন')));
    const modal = h('div', { class: 'fb-modal', onclick: (e) => { if (e.target === modal) modal.remove(); } }, sheet);
    document.body.append(modal);
  }

  async function load(reset) {
    if ((f.view || 'all') === 'journey') return loadJourneys();
    if (reset) { page = 0; lastDay = ''; grid.replaceChildren(h('p', { class: 'muted' }, 'খোঁজা হচ্ছে…')); }
    const view = f.view || 'all';
    const body = { q: f.q, person: f.person || undefined, branch: f.branch || undefined, kind: (view === 'tips' ? 'tip' : f.kind) || undefined, tag: f.tag || undefined, page, best: f.mode === 'best', talk: f.mode === 'talk', unused: f.mode === 'unused', sort: view === 'make' ? 'viral' : view === 'tips' || f.mode === 'score' ? 'score' : 'new' };
    let r;
    try { r = await call('lib_list', body); } catch (e) { grid.replaceChildren(h('p', { class: 'toast is-error' }, e.message)); return; }
    if (reset) grid.replaceChildren(h('p', { class: 'muted' }, view === 'make' ? `${r.total}টা ক্লিপ বিচার করা হয়েছে — সবচেয়ে ভাইরাল হওয়ার মতো আগে (বিচার চলছে, আরও আসবে)` : `${r.total}টা ক্লিপ`));
    let box = grid.lastElementChild?.classList?.contains('fb-grid') ? grid.lastElementChild : null;
    for (const c of r.clips) {
      if (body.sort === 'new' && c.day !== lastDay) { lastDay = c.day; grid.append(h('div', { class: 'fb-day' }, dayLabel(c.day))); box = null; }
      if (!box) { box = h('div', { class: 'fb-grid' }); grid.append(box); }
      box.append(h('button', { class: 'fb-t', style: `background-image:url('${c.url}=w300-h400-no')`, title: en(c.summary), onclick: () => open(c.id) },
        c.judge?.total != null ? h('span', { class: `v ${c.judge.viral_pct >= 30 ? '' : c.judge.viral_pct >= 12 ? 'mid' : 'low'}` }, `🔥 ${c.judge.viral_pct}%`)
          : c.score != null && h('span', { class: `s ${c.score >= 7 ? 'hi' : ''}` }, `${c.score}`),
        c.used_in && h('span', { class: 'u' }, 'ব্যবহৃত'),
        h('span', { class: 'k' }, (c.transcript ? '💬 ' : '') + (KIND[c.kind] || '')),
        h('span', { class: 'd' }, secs(c.dur_s))));
    }
    page += 1;
    more.style.display = page * r.size < r.total ? 'block' : 'none';
  }

  const HIT = { simi: 'Simi (9.48 লাখ)', pa_tullei: '"পা তুললেই পড়ে যাব?" (4.97 লাখ)', cycle: '"Cycle জানা লাগবে না" (11 লাখ)', height: '"4 ফুট 6 ইঞ্চি" (1.53 লাখ)', none: '—' };
  const LINES = ['প্রথম ফ্রেমে থামাবে', 'প্রথম 3 সেকেন্ড দর্শকের ভয়', 'আসল কথা 8 সেকেন্ডে', 'একটাই কথা', 'ফাঁকা সেকেন্ড নেই', 'আবেগ', 'আসল মানুষ', 'বন্ধুকে পাঠাবে', 'কমেন্ট করবে', 'দৈর্ঘ্য ও শেষ'];
  function judgeCard(j) {
    if (!j || j.total == null) return null;
    const vd = { make: 'বানান ✅', fix: 'ঠিক করে বানান', skip: 'বাদ দিন' }[j.verdict] || j.verdict;
    return h('div', { class: 'fb-j' },
      h('div', { class: 'big' }, h('span', { class: 'pct' }, `${j.viral_pct}%`), h('span', {}, 'ভাইরাল হওয়ার সম্ভাবনা', h('br'), h('small', { class: 'muted' }, `আন্দাজ: ${en(j.views)} ভিউ · স্কোর ${j.total}/20`)), h('span', { class: `vd ${j.verdict}` }, vd)),
      j.title && h('h3', { style: 'margin:8px 0 0' }, en(j.title)),
      j.hook && h('div', { class: 'hook' }, '🎬 শুরুর লেখা: ', en(j.hook)),
      h('dl', {}, h('dt', {}, 'কেন চলবে'), h('dd', {}, en(j.why)), h('dt', {}, 'কী কম আছে'), h('dd', {}, en(j.weak)), h('dt', {}, 'কাছাকাছি হিট'), h('dd', {}, HIT[j.closest_hit] || j.closest_hit), h('dt', {}, 'কীভাবে বানাবেন'), h('dd', { style: 'white-space:pre-wrap' }, en(j.plan))),
      h('details', {}, h('summary', {}, 'স্কোরকার্ড (10 লাইন)'), h('div', { class: 'fb-bars' }, ...LINES.flatMap((l, i) => [h('span', {}, l), h('span', {}, h('i', { class: j.lines[i] >= 1 ? 'f' : '' }), h('i', { class: j.lines[i] >= 2 ? 'f' : '' }))]))));
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
        h('b', {}, `${dayLabel(c.day)} · ${new Date(c.taken_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })} · ${secs(c.dur_s)}`),
        h('button', { class: 'btn btn--small', onclick: () => modal.remove() }, '✕')),
      (() => { const v = h('video', { src: `${c.url}=m22`, poster: `${c.url}=w720-no`, controls: true, playsinline: true, preload: 'metadata' });
        const alt = h('a', { class: 'btn btn--primary', style: 'display:none;width:100%;margin-top:8px', href: `${c.url}=m22`, target: '_blank', rel: 'noopener noreferrer' }, '▶ ভিডিও চালান (নতুন পাতায়)');
        v.addEventListener('error', () => { alt.style.display = 'flex'; }, true);
        return h('div', {}, v, alt, h('a', { class: 'muted', style: 'display:block;margin-top:4px;font-size:.8rem', href: `${c.url}=m22`, target: '_blank', rel: 'noopener noreferrer' }, 'ভিডিও না চললে এখানে চাপুন')); })(),
      h('p', {}, en(c.summary)),
      judgeCard(c.judge),
      !c.judge?.total && c.idea && h('div', { class: 'fb-idea' }, '💡 ', en(c.idea)),
      h('p', { class: 'muted' }, '📍 ব্রাঞ্চ: ', c.branch ? (Object.fromEntries(BRANCHES)[c.branch] || c.branch) + (c.branch_why === 'default' ? ' (সম্ভবত — কোনো ব্রাঞ্চের ট্রেনার দেখা যায়নি)' : c.branch_why && c.branch_why.startsWith('trainer') ? ` (${c.branch_why.replace('trainer', 'ট্রেনার').trim()})` : c.branch_why === 'same shoot' ? ' (একই শ্যুটের অন্য ক্লিপে সেখানকার ট্রেনার আছে)' : '') : 'এখনও চেনা হয়নি (👤 মানুষ চেনান-এ ট্রেনারের ব্রাঞ্চ দিলে বসবে)'),
      h('div', { class: 'chips' },
        c.kind && h('span', { class: 'chip' }, KIND[c.kind] || c.kind),
        (c.tags || []).filter((t) => TAGS[t]).map((t) => h('span', { class: 'chip' }, TAGS[t])),
        c.score != null && h('span', { class: 'chip' }, `স্কোর ${c.score}/10`),
        q.face_visible === false && h('span', { class: 'chip' }, 'মুখ দেখা যায় না'),
        q.shaky && h('span', { class: 'chip' }, 'কাঁপা'), q.dark && h('span', { class: 'chip' }, 'অন্ধকার'),
        q.place_hint && h('span', { class: 'chip' }, '📍 ' + q.place_hint)),
      h('h3', {}, 'কী বলা হয়েছে'),
      said ? h('div', { class: 'fb-say' }, en(said)) : h('p', { class: 'muted' }, noTalk),
      r.people.length ? h('p', { class: 'muted' }, `এই ক্লিপে ${r.people.length} জন (মুখ চেনা হয়েছে)। নাম দেওয়ার পাতা আসছে।`) : null,
      h('div', { class: 'fb-row' }, usedBtn,
        h('a', { class: 'btn btn--small', href: `${c.url}=dv`, target: '_blank', rel: 'noopener noreferrer' }, 'আসল ভিডিও খুলুন')));
  }

  const pplBox = h('div', {});
  const pplBtn = h('button', { class: 'btn', onclick: () => (pplBox.childElementCount ? pplBox.replaceChildren() : people()) }, '👤 মানুষ চেনান (ট্রেনার → ব্রাঞ্চ)');
  async function people() {
    pplBox.replaceChildren(h('p', { class: 'muted' }, 'লোড হচ্ছে…'));
    let r; try { r = await call('lib_people', { min: 6 }); } catch (e) { pplBox.replaceChildren(h('p', { class: 'toast is-error' }, e.message)); return; }
    const card = (p) => {
      const name = h('input', { value: p.name || '', placeholder: 'নাম (যেমন বিশ্বরূপ)' });
      const role = h('select', {}, ROLES.map(([v, l]) => h('option', { value: v, selected: (p.role || '') === v }, l)));
      const br = h('select', {}, [['', '— ব্রাঞ্চ —'], ['all', 'সব ব্রাঞ্চে যায়'], ...BRANCHES].map(([v, l]) => h('option', { value: v, selected: (p.branch || '') === v }, l)));
      const hide = h('input', { type: 'checkbox', checked: !!p.no_show, style: 'width:auto' });
      const msg = h('small', { class: 'muted' });
      const saveBtn = h('button', { class: 'btn btn--small btn--primary' }, 'সেভ');
      saveBtn.onclick = () => busy(saveBtn, async () => {
        const out = await call('lib_person_set', { id: p.id, name: name.value.trim(), role: role.value, branch: br.value, no_show: hide.checked || role.value === 'ex_trainer' });
        msg.textContent = out.marked ? `✓ সেভ হলো, ${out.marked}টা ক্লিপে ব্রাঞ্চ বসল` : '✓ সেভ হলো';
        el.classList.add('named');
      });
      const el = h('div', { class: `fb-p ${p.name || p.role ? 'named' : ''}` },
        h('div', { class: 'fb-ph' }, p.cover_crop ? h('img', { src: `data:image/jpeg;base64,${p.cover_crop}` }) : h('img', {}),
          h('div', {}, h('b', {}, p.name || `মানুষ #${p.id}`), h('div', { class: 'muted' }, `${p.n_faces} বার দেখা গেছে`), h('div', { class: 'muted' }, `${p.first_day} → ${p.last_day}`))),
        name, role, br, h('label', { class: 'muted', style: 'display:flex;gap:6px;align-items:center' }, hide, 'এর মুখ কোনো রিলে দেখাবেন না'),
        h('div', { class: 'fb-row', style: 'margin:0' }, saveBtn, h('button', { class: 'btn btn--small', onclick: () => { f.person = p.id; save(); repaintChips(); load(true); pplBox.replaceChildren(); } }, 'এর ক্লিপ দেখুন')), msg);
      return el;
    };
    pplBox.replaceChildren(
      h('p', { class: 'muted' }, 'যাদের সবচেয়ে বেশি দেখা গেছে। যে ট্রেনার একটাই ব্রাঞ্চে ক্লাস নেয়, তার নাম আর ব্রাঞ্চ দিন: তার সব ক্লিপে ব্রাঞ্চ নিজে বসে যাবে। মালিক/কো-ওনার (যেমন সায়ন) বা যে ট্রেনার সব ব্রাঞ্চে যায়, তাদের ব্রাঞ্চে "সব ব্রাঞ্চে যায়" দিন: তাদের মুখ দেখে ব্রাঞ্চ ঠিক হবে না। একই মানুষ দুবার এলে দুটোতেই একই নাম দিন।'),
      h('div', { class: 'fb-ppl' }, r.people.map(card)));
  }

  call('lib_stats').then((s) => {
    stats.textContent = `${s.done}টা ক্লিপ দেখা হয়েছে${s.new ? `, আর ${s.new}টা বাকি (পেছনে চলছে)` : ''}${s.sarvam_left != null ? ` · Sarvam-এ ₹${s.sarvam_left} বাকি` : ''}`;
  }).catch(() => { stats.textContent = ''; });
  out.append(
    h('div', { class: 'card' }, h('h2', { style: 'margin:0 0 6px' }, 'ফুটেজ লাইব্রেরি'), stats, views,
      h('div', { class: 'fb-top' }, search, h('button', { class: 'btn btn--primary', onclick: () => { f.q = search.value.trim(); save(); load(true); } }, 'খুঁজুন')),
      chips, h('div', { class: 'fb-row' }, pplBtn), pplBox),
    grid, more);
  load(true);
  return out;
}
