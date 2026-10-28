import { getCollection } from 'astro:content';

// The Markdown blog posts, so the admin panel can show and copy them.
export async function GET() {
  const files = await getCollection('blog');
  const rows = files.map((f) => {
    const [x, y] = (f.data.imagePosition ?? '50% 25%').split(' ').map(parseFloat);
    return {
      slug: f.id, title: f.data.title, description: f.data.description, category: f.data.category, body: f.body ?? '',
      cover: { src: f.data.image, alt: f.data.imageAlt, focus: { d: { x, y } } }, gallery: [], keywords: f.data.keywords,
      heading_font: null, date: f.data.date.toISOString().slice(0, 10), updated_at: null, draft: f.data.draft, builtIn: true,
    };
  });
  return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json' } });
}
