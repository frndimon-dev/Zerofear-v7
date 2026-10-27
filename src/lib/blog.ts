import { getCollection } from 'astro:content';
import { readFileSync } from 'node:fs';
import { marked } from 'marked';
import { fetchRows, overrides } from '../cms';
import { isFontKey, type FontKey } from '../cms/fonts';
import type { Photo } from '../cms/schema';

// Posts come from two places:
//  - Markdown files in src/content/blog (the first articles), and
//  - the admin panel (Supabase table `posts`). A saved post with the same
//    slug replaces the Markdown one; slugs in `hiddenPosts` are left out.

export const categories = ['Guide', 'Area', 'Safety', 'Women', 'Bike', 'RTO'] as const;
export type Category = (typeof categories)[number];

export type Post = {
  id: string;
  body: string; // Markdown
  data: {
    title: string;
    description: string;
    date: Date;
    updated?: Date;
    category: Category;
    image: string;
    imageAlt: string;
    cover?: Photo;
    keywords: string[];
    gallery: Photo[];
    headingFont?: FontKey;
  };
};

// Row shape in Supabase (also written by the admin panel).
export type PostRow = {
  slug: string; title: string; description: string; category: string; body: string;
  cover: Photo | null; gallery: Photo[] | null; keywords: string[] | null; heading_font: string | null;
  date: string; updated_at: string | null; draft: boolean;
};

const fromRow = (r: PostRow): Post => ({
  id: r.slug,
  body: r.body ?? '',
  data: {
    title: r.title,
    description: r.description,
    date: new Date(r.date),
    updated: r.updated_at ? new Date(r.updated_at) : undefined,
    category: (categories as readonly string[]).includes(r.category) ? (r.category as Category) : 'Guide',
    image: r.cover?.src ?? '/og.png',
    imageAlt: r.cover?.alt ?? r.title,
    cover: r.cover ?? undefined,
    keywords: r.keywords ?? [],
    gallery: r.gallery ?? [],
    headingFont: isFontKey(r.heading_font) ? r.heading_font : undefined,
  },
});

async function loadDbPosts(): Promise<PostRow[]> {
  if (process.env.CMS_FILE) return JSON.parse(readFileSync(process.env.CMS_FILE, 'utf8')).posts ?? [];
  return (await fetchRows<PostRow>('posts?select=*&draft=eq.false')) ?? [];
}

let cache: Promise<Post[]> | undefined;

// Published posts, newest first.
export function getPosts(): Promise<Post[]> {
  cache ??= (async () => {
    const hidden = new Set(overrides.hiddenPosts ?? []);
    const files = await getCollection('blog', ({ data }) => !data.draft);
    const db = (await loadDbPosts()).filter((r) => r.slug && r.title && !r.draft).map(fromRow);
    const dbIds = new Set(db.map((p) => p.id));
    const fromFiles: Post[] = files
      .filter((f) => !dbIds.has(f.id))
      .map((f) => {
        // Most cover photos show people, so keep the top of the photo (heads) in view.
        const [x, y] = (f.data.imagePosition ?? '50% 25%').split(' ').map(parseFloat);
        const cover: Photo = { src: f.data.image, alt: f.data.imageAlt, focus: { d: { x, y } } };
        return { id: f.id, body: f.body ?? '', data: { ...f.data, cover, gallery: [] } };
      });
    return [...db, ...fromFiles]
      .filter((p) => !hidden.has(p.id))
      .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  })();
  return cache;
}

// Raw HTML in post text is dropped; posts are Markdown only.
marked.use({ renderer: { html: () => '' } });

export const renderMarkdown = (md: string) => marked.parse(md, { gfm: true, async: false }) as string;

export const formatDate = (d: Date) =>
  d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const readingTime = (body = '') => Math.max(2, Math.round(body.split(/\s+/).length / 200));
