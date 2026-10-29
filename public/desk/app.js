// Social Desk web app: plain JavaScript, no build step. Reads and edits the
// database directly (row-level security keeps each business separate) and asks
// the "desk" Edge Function for anything that talks to Facebook / Instagram.
import { createClient } from './vendor/supabase.js'; // @supabase/supabase-js 2.117.0, bundled

const SUPABASE_URL = 'https://wzesyetbiyxdgjyuhqoz.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_WtpK81HvXHXHn-aroHl9MA_Nkt7UyKD';
const sb = createClient(SUPABASE_URL, PUBLISHABLE_KEY);

const KINDS = [['thanks', 'Thanks / praise'], ['price', 'Price questions'], ['location', 'Where are you?'], ['details', 'Details / interested']];
const LANGS = [['en', 'English'], ['bn', 'বাংলা'], ['hi', 'Hindi']];
const STATUS_LABEL = { new: 'waiting', replied: 'replied', hidden: 'hidden', held: 'needs you', ignored: 'no action', failed: 'failed' };

const state = { session: null, workspaces: [], ws: null, tab: localStorage.getItem('tab') || 'inbox', status: null, msg: null, filter: 'all' };

// ---------- tiny DOM helper ----------
function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.className = v;
    else if (k === 'value') el.value = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}
const field = (label, input, hint) => h('label', { class: 'field' }, h('span', {}, label), input, hint && h('small', {}, hint));
const fmt = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');
function toast(text, isError = false) { state.msg = { text, isError }; render(); }

async function api(action, body = {}) {
  const { data } = await sb.auth.getSession();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/desk/api`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session?.access_token ?? ''}`, apikey: PUBLISHABLE_KEY },
    body: JSON.stringify({ action, ...body }),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || `Error ${res.status}`);
  return out;
}
async function busy(btn, fn) {
  const label = btn.textContent; btn.disabled = true; btn.textContent = '…';
  try { await fn(); } catch (e) { toast(e.message || String(e), true); } finally { btn.disabled = false; btn.textContent = label; }
}

// ---------- start ----------
sb.auth.onAuthStateChange((_e, session) => { const was = !!state.session; state.session = session; if (!!session !== was) boot(); });
sb.auth.getSession().then(({ data }) => { state.session = data.session; boot(); });

async function boot() {
  if (!state.session) return render();
  const q = new URLSearchParams(location.search);
  if (q.get('connected')) state.msg = { text: `Connected: ${q.get('connected')}` };
  if (q.get('connect_error')) state.msg = { text: `Could not connect: ${q.get('connect_error')}`, isError: true };
  if (q.size) history.replaceState(null, '', location.pathname);
  const { data, error } = await sb.from('workspaces').select('*').order('created_at');
  if (error) { state.msg = { text: error.message, isError: true }; return render(); }
  state.workspaces = data;
  const saved = localStorage.getItem('ws');
  state.ws = data.find((w) => w.id === saved) ?? data[0] ?? null;
  state.status = await api('status').catch(() => null);
  render();
}

// ---------- screens ----------
async function render() {
  const root = document.getElementById('app');
  if (!state.session) { root.replaceChildren(login()); return; }
  if (!state.ws) { root.replaceChildren(h('p', { class: 'center' }, 'You are not a member of any business yet. Ask the desk owner to add your e-mail.')); return; }
  const { count } = await sb.from('comments').select('id', { count: 'exact', head: true }).eq('workspace_id', state.ws.id).in('status', ['held', 'failed']);
  const tabs = [['inbox', 'Needs you', count], ['activity', 'Activity'], ['business', 'Replies & rules'], ['accounts', 'Accounts'], ['test', 'Try a comment']];
  if (state.status?.isAdmin) tabs.push(['keys', 'Keys']);
  const main = h('main', {});
  root.replaceChildren(
    h('header', { class: 'top' },
      h('h1', {}, 'Social Desk'),
      state.workspaces.length > 1 && h('select', { onchange: (e) => { state.ws = state.workspaces.find((w) => w.id === e.target.value); localStorage.setItem('ws', state.ws.id); state.msg = null; render(); } },
        state.workspaces.map((w) => h('option', { value: w.id, selected: w.id === state.ws.id }, w.name))),
      h('button', { class: 'btn btn--small', onclick: () => sb.auth.signOut() }, 'Sign out')),
    h('nav', { class: 'tabs' }, tabs.map(([id, label, n]) => h('button', { class: `tab ${state.tab === id ? 'is-active' : ''}`, onclick: () => { state.tab = id; localStorage.setItem('tab', id); state.msg = null; render(); } }, label, n ? h('span', { class: 'count' }, n) : null))),
    main,
  );
  if (state.msg) main.append(h('p', { class: `toast ${state.msg.isError ? 'is-error' : ''}` }, state.msg.text));
  const screens = { inbox, activity, business, accounts, test, keys };
  main.append(await (screens[state.tab] ?? inbox)());
}

function login() {
  const email = h('input', { class: 'input', type: 'email', autocomplete: 'username', required: true });
  const pass = h('input', { class: 'input', type: 'password', autocomplete: 'current-password', required: true });
  const err = h('p', { class: 'error' });
  return h('form', { class: 'login', onsubmit: async (e) => {
    e.preventDefault(); err.textContent = '';
    const { error } = await sb.auth.signInWithPassword({ email: email.value.trim(), password: pass.value });
    if (error) err.textContent = /Invalid login/i.test(error.message) ? 'Wrong e-mail or password.' : error.message;
  } }, h('h1', {}, 'Social Desk'), field('E-mail', email), field('Password', pass), err, h('button', { class: 'btn btn--primary', style: 'width:100%' }, 'Sign in'));
}

function commentCard(c, accounts, { editable }) {
  const acc = accounts.find((a) => a.id === c.account_id);
  const replyBox = h('textarea', { class: 'input', rows: 2, placeholder: 'Your reply…' });
  replyBox.value = c.reply || '';
  const dm = h('input', { type: 'checkbox', checked: !c.dm_sent });
  return h('div', { class: 'card comment' },
    h('div', { class: 'comment__head' },
      h('b', {}, c.author || 'Someone'),
      h('span', { class: `badge badge--${c.status}` }, STATUS_LABEL[c.status] ?? c.status),
      c.kind && h('span', { class: 'pill' }, c.kind),
      h('span', { class: 'pill' }, `${acc ? (acc.provider === 'instagram' ? 'Instagram' : 'Facebook') : ''} · ${fmt(c.created_time)}`),
      c.post_link && h('a', { class: 'pill', href: c.post_link, target: '_blank', rel: 'noopener' }, 'open post ↗')),
    h('p', { class: 'comment__text' }, c.text || '(no text)'),
    c.error && h('p', { class: 'error' }, c.error),
    editable ? [
      replyBox,
      h('label', { class: 'check' }, dm, c.dm_sent ? 'Inbox message already sent' : 'Also send the inbox message'),
      h('div', { class: 'comment__actions' },
        h('button', { class: 'btn btn--primary btn--small', onclick: (e) => busy(e.target, async () => { await api('reply', { commentId: c.id, text: replyBox.value, sendDm: dm.checked }); toast('Reply sent.'); }) }, 'Send reply'),
        h('button', { class: 'btn btn--small btn--danger', onclick: (e) => busy(e.target, async () => { await api('hide', { commentId: c.id }); toast('Comment hidden.'); }) }, 'Hide'),
        h('button', { class: 'btn btn--small', onclick: (e) => busy(e.target, async () => { await api('ignore', { commentId: c.id }); toast('Marked as done.'); }) }, 'No reply needed')),
    ] : [
      c.reply && h('p', { class: 'comment__reply' }, `↳ ${c.reply}${c.dm_sent ? '  · 📩 inbox message sent' : ''}`),
      c.status === 'hidden' && h('div', { class: 'comment__actions' }, h('button', { class: 'btn btn--small', onclick: (e) => busy(e.target, async () => { await api('unhide', { commentId: c.id }); toast('Comment shown again.'); }) }, 'Show it again')),
    ]);
}

async function accountsOf(ws) {
  const { data } = await sb.from('accounts').select('*').eq('workspace_id', ws.id).order('provider');
  return data ?? [];
}

async function inbox() {
  const [accounts, { data, error }] = await Promise.all([accountsOf(state.ws),
    sb.from('comments').select('*').eq('workspace_id', state.ws.id).in('status', ['held', 'failed']).order('created_time', { ascending: false }).limit(100)]);
  if (error) return h('p', { class: 'error' }, error.message);
  if (!accounts.length) return h('div', { class: 'card' }, h('h2', {}, 'Start here'), h('p', {}, 'Connect your Facebook page and Instagram account in the Accounts tab. New comments are then answered every 2 minutes.'));
  if (!data.length) return h('div', { class: 'card' }, h('h2', {}, 'All done 🎉'), h('p', { class: 'muted' }, 'Comments the desk could not answer by itself appear here.'));
  return h('div', {}, h('p', { class: 'muted' }, 'These comments need your answer: the desk was not sure, or sending failed.'), data.map((c) => commentCard(c, accounts, { editable: true })));
}

async function activity() {
  const since = new Date(Date.now() - 7 * 86400e3).toISOString();
  const [accounts, all] = await Promise.all([accountsOf(state.ws),
    sb.from('comments').select('*').eq('workspace_id', state.ws.id).gte('created_at', since).order('created_at', { ascending: false }).limit(300)]);
  const rows = (all.data ?? []).filter((r) => r.decided_by !== 'before connecting');
  const n = (s) => rows.filter((r) => r.status === s).length;
  const shown = state.filter === 'all' ? rows : rows.filter((r) => r.status === state.filter);
  return h('div', {},
    h('div', { class: 'stats' }, [['replied', 'Replied'], ['hidden', 'Hidden'], ['held', 'Need you'], ['ignored', 'No action']].map(([s, l]) => h('div', { class: 'stat' }, h('b', {}, n(s)), l))),
    h('p', { class: 'muted' }, `Last 7 days · ${rows.filter((r) => r.dm_sent).length} inbox messages sent. Older comments are deleted after 30 days (they stay on Facebook / Instagram).`),
    h('div', { class: 'filters' }, ['all', 'replied', 'hidden', 'held', 'ignored', 'failed'].map((f) =>
      h('button', { class: `btn btn--small ${state.filter === f ? 'btn--primary' : ''}`, onclick: () => { state.filter = f; render(); } }, f === 'all' ? 'All' : STATUS_LABEL[f]))),
    shown.length ? shown.map((c) => commentCard(c, accounts, { editable: c.status === 'held' || c.status === 'failed' })) : h('p', { class: 'muted' }, 'Nothing here yet.'));
}

async function business() {
  const ws = state.ws;
  const s = { autoReply: true, autoHide: true, sendDm: true, useAi: true, ...ws.settings };
  const facts = h('textarea', { class: 'input', rows: 6 }); facts.value = ws.brand_facts;
  const dm = h('textarea', { class: 'input', rows: 8 }); dm.value = ws.dm_template;
  const blocked = h('textarea', { class: 'input', rows: 3 }); blocked.value = (ws.blocked_words ?? []).join(', ');
  const boxes = {};
  const toggles = Object.fromEntries(['autoReply', 'autoHide', 'sendDm', 'useAi'].map((k) => [k, h('input', { type: 'checkbox', checked: s[k] })]));
  const save = async (e) => busy(e.target, async () => {
    const replies = {};
    for (const [k] of KINDS) for (const [l] of LANGS) {
      const list = boxes[`${k}.${l}`].value.split('\n').map((x) => x.trim()).filter(Boolean);
      if (list.length) (replies[k] ??= {})[l] = list;
    }
    const patch = {
      brand_facts: facts.value.trim(), dm_template: dm.value.trim(), replies,
      blocked_words: blocked.value.split(/[,\n]/).map((x) => x.trim().toLowerCase()).filter(Boolean),
      settings: Object.fromEntries(Object.entries(toggles).map(([k, el]) => [k, el.checked])),
    };
    const { error } = await sb.from('workspaces').update(patch).eq('id', ws.id);
    if (error) throw error;
    Object.assign(ws, patch);
    toast('Saved. New comments use these settings.');
  });
  return h('div', {},
    h('div', { class: 'card' }, h('h2', {}, 'What the desk does by itself'),
      h('label', { class: 'check' }, toggles.autoReply, 'Reply to comments automatically'),
      h('label', { class: 'check' }, toggles.sendDm, 'Send the inbox message to people who ask (price, place, details)'),
      h('label', { class: 'check' }, toggles.autoHide, 'Hide abusive, negative and spam comments automatically'),
      h('label', { class: 'check' }, toggles.useAi, 'Use AI for comments the word lists don\'t understand (about 1 paisa each)'),
      h('p', { class: 'muted' }, 'Anything the desk is not sure about waits in "Needs you".')),
    h('div', { class: 'card' }, h('h2', {}, 'Inbox message'),
      field('Sent privately to people who ask about price, place or details', dm, 'Write {name} where their first name should go. Facebook and Instagram allow one message per comment, within 7 days.')),
    h('div', { class: 'card' }, h('h2', {}, 'Ready replies (no AI, free)'),
      h('p', { class: 'muted' }, 'One reply per line; the desk picks one at random so replies don\'t look copied. {name} = their first name. The language is chosen from the comment.'),
      KINDS.map(([k, label]) => h('div', {}, h('h3', {}, label), h('div', { class: 'grid3' }, LANGS.map(([l, ln]) => {
        const box = h('textarea', { class: 'input', rows: 3 }); box.value = (ws.replies?.[k]?.[l] ?? []).join('\n'); boxes[`${k}.${l}`] = box;
        return field(ln, box);
      }))))),
    h('div', { class: 'card' }, h('h2', {}, 'Business facts for the AI'),
      field('Only these facts are used in AI replies', facts, 'Courses, prices, address, timings, phone. The AI never invents offers.')),
    h('div', { class: 'card' }, h('h2', {}, 'Extra words to hide'),
      field('Comments containing these words are hidden (any language, comma separated)', blocked, 'Common abuse in Bengali, Hindi and English is already covered.')),
    h('button', { class: 'btn btn--primary', onclick: save }, 'Save'));
}

async function accounts() {
  const list = await accountsOf(state.ws);
  const connect = (e) => busy(e.target, async () => {
    const { url } = await api('connect', { workspaceId: state.ws.id, returnUrl: location.origin + location.pathname });
    location.href = url;
  });
  return h('div', {},
    h('div', { class: 'card' }, h('h2', {}, `Accounts of ${state.ws.name}`),
      list.length ? list.map((a) => h('div', { class: 'acct' },
        h('span', {}, a.provider === 'instagram' ? '◎' : 'f'), h('b', {}, a.name), h('span', { class: 'pill' }, a.last_checked ? `checked ${fmt(a.last_checked)}` : 'not checked yet'),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: a.enabled, onchange: async (e) => {
          const { error } = await sb.from('accounts').update({ enabled: e.target.checked }).eq('id', a.id); if (error) toast(error.message, true);
        } }), 'On'),
        h('button', { class: 'btn btn--small btn--danger', onclick: async () => {
          if (!confirm(`Disconnect ${a.name}?`)) return;
          const { error } = await sb.from('accounts').delete().eq('id', a.id); if (error) toast(error.message, true); else render();
        } }, 'Remove'))) : h('p', { class: 'muted' }, 'Nothing connected yet.'),
      h('p', {}, h('button', { class: 'btn btn--primary', disabled: !state.status?.meta, onclick: connect }, '+ Connect Facebook & Instagram')),
      !state.status?.meta && h('p', { class: 'muted' }, 'The desk owner must add the Meta app keys first (Keys tab).'),
      h('p', { class: 'muted' }, `Log in with the Facebook account that manages ${state.ws.name}'s page. Its Instagram account must be a Professional account linked to that page. Comments from before connecting are never answered.`)));
}

async function test() {
  const box = h('textarea', { class: 'input', rows: 3, placeholder: 'e.g. koto taka lagbe?' });
  const out = h('div', {});
  return h('div', { class: 'card' }, h('h2', {}, 'Try a comment'),
    h('p', { class: 'muted' }, 'See what the desk would do. Nothing is posted.'), box,
    h('p', {}, h('button', { class: 'btn btn--primary', onclick: (e) => busy(e.target, async () => {
      const r = await api('test', { workspaceId: state.ws.id, text: box.value });
      const what = { thanks: 'Thank-you reply', price: 'Price reply + inbox message', location: 'Location reply + inbox message', details: 'Details reply + inbox message',
        negative: 'Hide the comment', spam: 'Hide the comment (spam)', tag: 'Nothing (just tagging friends)', unknown: 'Ask the AI' };
      out.replaceChildren(
        h('p', {}, h('b', {}, 'Word lists: '), `${what[r.rules.kind]} · language ${r.rules.lang}${r.rules.blocked ? ` · matched "${r.rules.blocked}"` : ''}`),
        r.ai ? h('p', {}, h('b', {}, 'AI: '), `${r.ai.kind}${r.ai.confident ? '' : ' (not sure → waits for you)'} — ${r.ai.reply || '(no reply)'}${r.ai.send_dm ? ' · + inbox message' : ''}`)
          : r.rules.kind === 'unknown' ? h('p', { class: 'muted' }, 'AI is off or has no key: this comment would wait for you.') : null);
    }) }, 'Check')), out);
}

async function keys() {
  const appId = h('input', { class: 'input', autocomplete: 'off' });
  const appSecret = h('input', { class: 'input', type: 'password', autocomplete: 'off' });
  const ai = h('input', { class: 'input', type: 'password', autocomplete: 'off' });
  const st = state.status ?? {};
  return h('div', { class: 'card' }, h('h2', {}, 'Keys (desk owner only)'),
    h('p', { class: 'muted' }, 'Stored on the server; nobody can read them back here. Leave a box empty to keep the current value.'),
    field(`Meta App ID ${st.meta ? '✓ set' : ''}`, appId),
    field(`Meta App Secret ${st.meta ? '✓ set' : ''}`, appSecret),
    field(`Anthropic API key ${st.ai ? '✓ set' : ''}`, ai, 'From console.anthropic.com → API Keys. Used only for comments the word lists don\'t understand.'),
    h('p', { class: 'muted' }, `Facebook "Valid OAuth Redirect URI": ${st.redirect ?? ''}`),
    h('button', { class: 'btn btn--primary', onclick: (e) => busy(e.target, async () => {
      await api('secrets', { meta_app_id: appId.value, meta_app_secret: appSecret.value, anthropic_api_key: ai.value });
      state.status = await api('status'); toast('Keys saved.');
    }) }, 'Save keys'),
    h('h3', {}, 'Run now'),
    h('p', { class: 'muted' }, 'The desk checks every 2 minutes by itself. Use this to check immediately.'),
    h('button', { class: 'btn', onclick: (e) => busy(e.target, async () => { const r = await api('run'); toast(`Checked: ${JSON.stringify(r)}`); }) }, 'Check comments now'));
}
