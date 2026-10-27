# Zero Fear website

Scooty & bike training in Kolkata. Built with [Astro](https://astro.build) and deployed on Vercel.

## Edit content

Almost everything on the site comes from **`src/data/site.ts`**:

- phone / WhatsApp numbers, address, opening hours (`site`)
- course names, classes and **prices** (`courses`; `price: null` shows "Ask for fee")
- doorstep fee tiers (`doorstep`)
- FAQ, reviews and the "How it works" steps

Fields set to `null` (address, hours, prices) are hidden until filled in.

## Pages

| URL | File |
|---|---|
| `/` | `src/pages/index.astro` |
| `/courses`, `/courses/<slug>` | `src/pages/courses/` (one template, content from `courses` in `site.ts`) |
| `/doorstep-training`, `/women-riders`, `/about`, `/faq`, `/book` | `src/pages/*.astro` |

Old `#hash` links from the previous site (e.g. `/#courses/bike-training`) redirect to the new pages.

## Photos

Put image files in `public/images/` and set the paths in `photos` inside `src/data/site.ts`,
for example `src: '/images/hero.jpg'`. Without a photo, a branded tile is shown.

Reviews and gallery photos are also loaded from Supabase (`learner_reviews`, `training_gallery`)
when those tables have active rows.

## Develop

Requires Node 24.

```sh
npm install
npm run dev     # http://localhost:4321
npm run build   # outputs to dist/
```

`legacy/index.html` is the previous single-file site, kept for reference while the
inner pages are rebuilt. It is not deployed.

## Blog

Add a new post by creating a Markdown file in `src/content/blog/`, for example
`scooty-training-in-behala.md`. The file name becomes the URL (`/blog/scooty-training-in-behala`).
Start the file with the same header block (title, description, date, category, image, imageAlt,
keywords) as the existing posts. The post appears on `/blog`, the home page, the footer, the
sitemap and the RSS feed automatically after the next deploy.
