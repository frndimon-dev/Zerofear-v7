// Site content: the built-in defaults merged with what was saved in the admin
// panel (Supabase table `site_content`, row key "site"). Pages are rendered on
// the server (see astro.config.mjs), so a Save in the admin panel shows on the
// site within about 30 seconds.
// If the database can't be reached the defaults are used.
//
// refreshCms() runs before every page render (src/middleware.ts). Business
// details and course fields are written into the objects in data/site.ts, so
// every component that imports them shows the edited values.

import { readFileSync } from 'node:fs';
import { supabase } from '../data/supabase';
import { site, courses } from '../data/site';
import { fonts, isFontKey, baseFonts, type FontKey } from './fonts';
import {
  sections, defaultOrder, defaultHeroLayout, defaultTrainingGallery, limits, plain,
  type Overrides, type Photo, type HeroLayout, type TextField,
} from './schema';

export async function fetchRows<T>(path: string): Promise<T[] | null> {
  try {
    const res = await fetch(`${supabase.url}/rest/v1/${path}`, {
      headers: { apikey: supabase.publishableKey, Authorization: `Bearer ${supabase.publishableKey}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

// CMS_FILE=path/to.json lets a local build use saved content without the database.
async function loadOverrides(): Promise<Overrides | null> {
  const file = process.env.CMS_FILE;
  if (file) return JSON.parse(readFileSync(file, 'utf8')).site ?? {};
  const rows = await fetchRows<{ data: Overrides }>('site_content?key=eq.site&select=data');
  return rows ? rows[0]?.data ?? {} : null;
}

export let overrides: Overrides = {};

const fieldIndex = new Map<string, TextField>();
for (const s of sections) for (const [k, f] of Object.entries(s.texts)) fieldIndex.set(`${s.id}.${k}`, f);

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const markup = (s: string) => escape(s).replace(/\*([^*]+)\*/g, '<mark>$1</mark>').replace(/\*/g, '');

// Saved text is trimmed to the field's limits, so the layout always holds.
function clampText(value: string, f: TextField) {
  const lim = limits(f);
  let words = value.trim().split(/\s+/).slice(0, lim.words).join(' ');
  if (plain(words).length > lim.chars) words = f.value;
  return words;
}

export type TextOut = { html: string; plain: string; style?: string };

export function text(id: string): TextOut {
  const f = fieldIndex.get(id);
  if (!f) throw new Error(`Unknown text id: ${id}`);
  const o = overrides.texts?.[id];
  const value = o?.value ? clampText(o.value, f) : f.value;
  const out: TextOut = { html: markup(value), plain: plain(value) };
  const font = o?.font && isFontKey(o.font) && o.font !== f.font ? fonts[o.font] : null;
  const size = typeof o?.size === 'number' ? Math.min(1.3, Math.max(0.6, o.size)) : 1;
  if (font || size !== 1) {
    const scale = (font ? font.scale / (f.font ? fonts[f.font].scale : 1) : 1) * size;
    out.html = `<span style="${[
      font && `font-family:${font.css.replace(/"/g, "'")}`,
      font && `font-weight:${font.weight}`,
      font && !font.upper && 'text-transform:none;letter-spacing:-0.01em',
      scale !== 1 && `font-size:${scale.toFixed(3)}em`,
    ].filter(Boolean).join(';')}">${out.html}</span>`;
  }
  return out;
}

export function photo(id: string): Photo {
  const [sec, key] = id.split('.');
  const slot = sections.find((s) => s.id === sec)?.photos?.[key];
  if (!slot) throw new Error(`Unknown photo id: ${id}`);
  const o = overrides.photos?.[id];
  return o?.src ? o : slot.photo;
}

export function homeOrder(): string[] {
  const saved = (overrides.order ?? []).filter((id) => defaultOrder.includes(id));
  const order = [...saved, ...defaultOrder.filter((id) => !saved.includes(id))];
  const hidden = new Set(overrides.hidden ?? []);
  return order.filter((id) => !hidden.has(id));
}

export let heroLayout: HeroLayout = defaultHeroLayout;
export let trainingGallery: Photo[] = defaultTrainingGallery;
export let blogFont: FontKey = 'bricolage';
// Every font the pages need, for the Google Fonts link.
export let usedFonts: FontKey[] = [...baseFonts];

// Untouched copies of the editable objects, so a removed edit goes back to the default.
const pristineSite = structuredClone(site);
const pristineCourses = structuredClone(courses);

function apply(o: Overrides) {
  overrides = o;
  heroLayout = { ...defaultHeroLayout, ...o.hero };
  trainingGallery = o.gallery?.length ? o.gallery : defaultTrainingGallery;
  blogFont = isFontKey(o.blogFont) ? o.blogFont : 'bricolage';
  usedFonts = [...baseFonts, blogFont, ...Object.values(o.texts ?? {}).map((t) => t.font).filter(isFontKey)];

  Object.assign(site, structuredClone(pristineSite));
  const info = o.info ?? {};
  if (info.phoneDisplay && info.phoneTel) site.phone = { display: info.phoneDisplay, tel: info.phoneTel };
  if (info.whatsappDisplay && info.whatsappNumber) site.whatsapp = { display: info.whatsappDisplay, number: info.whatsappNumber };
  if (info.address) { site.address = info.address; site.mapQuery = info.address; }
  if (info.hours !== undefined) site.hours = info.hours || null;
  if (info.instagram !== undefined) site.social.instagram = info.instagram || null;
  if (info.facebook !== undefined) site.social.facebook = info.facebook || null;
  if (info.youtube !== undefined) site.social.youtube = info.youtube || null;
  if (info.googleReviewsUrl) site.googleReviewsUrl = info.googleReviewsUrl;
  if (info.stats?.length === site.stats.length) site.stats = info.stats.map((s, i) => ({ value: s.value || site.stats[i].value, label: s.label || site.stats[i].label }));

  courses.forEach((c, i) => {
    Object.assign(c, structuredClone(pristineCourses[i]));
    const e = o.courses?.[c.slug];
    if (!e) return;
    if (e.name) c.name = e.name;
    if (e.level) c.level = e.level;
    if (e.summary) c.summary = e.summary;
    if (e.classes) c.classes = e.classes;
    if (e.price !== undefined) c.price = e.price;
    if (e.photo?.src) c.photo = { src: e.photo.src, alt: e.photo.alt, cms: e.photo };
  });
}

// Loads the saved content at most every 30 seconds per server instance.
// If the database is unreachable, the last good content (or the defaults) stays.
let loadedAt = 0;
let loading: Promise<void> | null = null;
export let version = 0;
export function refreshCms(): Promise<void> {
  if (Date.now() - loadedAt < 30_000) return Promise.resolve();
  loading ??= loadOverrides()
    .then((o) => {
      if (o) apply(o);
      loadedAt = Date.now();
      version++;
    })
    .finally(() => { loading = null; });
  return loading;
}

// object-position for desktop (d) and phones (m) as CSS variables.
export const focusStyle = (p: Photo) => {
  const d = p.focus?.d ?? { x: 50, y: 50 };
  const m = p.focus?.m ?? d;
  return `--fd:${d.x}% ${d.y}%;--fm:${m.x}% ${m.y}%`;
};

// Any photo object used by the site, as a CMS photo.
export const asPhoto = (p: { src: string; alt: string; position?: string; cms?: Photo }): Photo => {
  if (p.cms) return p.cms;
  const [x, y] = (p.position ?? '50% 50%').split(' ').map((v) => parseFloat(v));
  return { src: p.src, alt: p.alt, focus: { d: { x, y } } };
};
