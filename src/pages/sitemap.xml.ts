import type { APIContext } from 'astro';
import { courses } from '../data/site';
import { getPosts } from '../lib/blog';

// Every public page, including blog posts added in the admin panel.
export async function GET(context: APIContext) {
  const base = context.site!;
  const posts = await getPosts();
  const pages = [
    '/', '/courses', ...courses.map((c) => `/courses/${c.slug}`), '/doorstep-training', '/women-riders',
    '/gallery', '/blog', '/about', '/faq', '/book',
  ].map((p) => ({ loc: new URL(p, base).href, lastmod: undefined as string | undefined }));
  const blog = posts.map((p) => ({ loc: new URL(`/blog/${p.id}`, base).href, lastmod: (p.data.updated ?? p.data.date).toISOString().slice(0, 10) }));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...pages, ...blog].map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
