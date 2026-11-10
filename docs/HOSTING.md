# Hosting (Hostinger Business, Node.js)

The site is an Astro server app (`@astrojs/node`, standalone). Hostinger builds it from GitHub.

## hPanel settings
Websites → Add website → **Node.js app** → connect GitHub → repository `frndimon-dev/Zerofear-v7`.

| Setting | Value |
|---|---|
| Branch | `main` (until the redesign is merged: `claude/website-review-modernize-3hox2w`) |
| Framework | Astro (or “Other”) |
| Node.js version | **24.x** (22.x also works) |
| Build command | `npm run build` |
| Start command | `npm run start` |
| Entry file (if asked) | `dist/server/entry.mjs` |
| Output directory (if asked) | `dist` |

No environment variables are needed (the Supabase URL and publishable key are public and live in `src/data/supabase.ts`).

## Domain
`zerofear.in` is registered at Hostinger. Point it at the Node.js app in hPanel (Domains → zerofear.in), and add
`www.zerofear.in` redirecting to `zerofear.in`. SSL is free in hPanel (Security → SSL).

## Keeping the database awake
Free Supabase projects pause after 7 days with no activity. `.github/workflows/keep-supabase-awake.yml`
reads one row every day. GitHub only runs scheduled workflows from the default branch (`main`).

## Old Vercel setup
The site used to run on Vercel (`zerofear-v7` project). Vercel’s free plan is for non-commercial sites only,
so it moved to Hostinger. The Vercel projects can be deleted once zerofear.in is live.

## Home-page videos and before/after photos
Hero videos, the before/after photos and the video reviews live in `public/_astro/m/` with a content hash in
each file name (map in `src/data/media.ts`). Astro's server sends everything under `/_astro/` with a one-year
`immutable` cache header, so Hostinger's CDN (hcdn) serves them from cache instead of the Node.js app. Files in
`public/images/` get no cache header and are fetched from the app every time.
To replace media: put the new files in a folder and run `python3 scripts/media-hash.py <folder>`.
Nothing here is stored in Supabase; the admin panel only stores the text (days, lines, quotes, names).
