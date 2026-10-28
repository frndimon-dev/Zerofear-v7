import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Blog posts: one Markdown file per post in src/content/blog.
// The file name becomes the URL: scooty-training-tollygunge.md → /blog/scooty-training-tollygunge
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(170),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    category: z.enum(['Guide', 'Area', 'Safety', 'Women', 'Bike', 'RTO']),
    image: z.string(),
    imageAlt: z.string(),
    imagePosition: z.string().optional(), // e.g. '50% 20%'
    keywords: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
