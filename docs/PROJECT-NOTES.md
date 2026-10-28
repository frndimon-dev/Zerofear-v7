# Zero Fear – project notes

Everything decided so far, so nothing is lost between sessions.
(Last updated: 28 Oct 2026, site live on zerofear.in.)

## Brand facts (use exactly these everywhere)

| | |
|---|---|
| Name | **Zero Fear** — Scooty & Bike Training, Kolkata |
| Tagline | Fear Out. Freedom In. |
| Hero line | Ride without fear. / Can’t ride a cycle? You can still ride. |
| Phone / WhatsApp | **79801 10273** (+91 79801 10273) |
| Address (as on Google) | Near, 12, post, Samargarh, Paschim Putiary, Kolkata, West Bengal 700041 |
| Area | Near Netaji Metro · Tollygunge · Kudghat |
| Courses | Basic Scooty, Advanced Scooty, Bike Training, RTO Test Preparation — from **₹2,500** |
| Doorstep | Within 10 km of Netaji Metro / Kudghat: ≤2 km ₹4,500, ≤3 km ₹5,000, max ₹8,000 |
| Numbers | 4.9★ Google, 300+ reviews, 5000+ learners, trainers with 8+ years experience |
| Founded | Zero Fear launched 2026 (trainers’ experience since 2018) |
| Facebook | facebook.com/freelancetwowheelertraining.co.in (to be renamed) |
| Instagram | instagram.com/zerofearkolkata (renamed 28 Oct 2026) |
| YouTube | none yet (hidden on the site) |
| Planned username | @zerofearkolkata |

### Rules
- Zero Fear is a **separate brand**. Never mention or link “Kolkata Scooty Bike Training Centre 2.0”
  or “Seekho 2 Wheeler”. Don’t reuse Seekho’s website or logo idea (trainer in the middle with two riders).
- “8+ years experience” is about the **trainers**; Zero Fear itself is new (2026).
- Site language: English. Talk to the owner in Bengali.
- Owner posts 3–4 Google reviews a week → update the review count in the admin panel.

## Design
- Colours: ink black `#0c0f16`, yellow `#ffd60a`, warm grey `#f3f2ee`.
- Fonts: Anton (big headlines), Manrope (text), Fraunces (About headline), Bricolage Grotesque (blog headlines).
- Logo: wordmark **ZERO** + **FEAR** in a yellow block. Files in `brand/`
  (profile pictures `zerofear-dp-dark-1080.png`, `zerofear-dp-yellow-1080.png`; social bios in `brand/social-profiles.md`).
- Photos: real class photos, light touch-up, licence plates blurred, no camera data.

## Where things live
| What | Where |
|---|---|
| Website code | GitHub `frndimon-dev/Zerofear-v7`, branch `main` (Hostinger deploys this) |
| Hosting | **Hostinger Business** (Node.js app), domain **zerofear.in** (to Oct 2029). Settings in `docs/HOSTING.md`. Code changes need hPanel → Settings → **Save and redeploy**; admin-panel edits don't. Old Vercel projects can be deleted. |
| Live site | https://zerofear.in · admin https://zerofear.in/admin |
| Google Search Console | URL-prefix property `https://zerofear.in/`, verified by `public/google8a29fba7104d5b35.html` (keep it); sitemap.xml submitted, 21 pages |
| Admin panel | `/admin` on the site — guide in `docs/ADMIN.md` |
| Database, login, uploaded photos | Supabase project “Zerofear web” (`fhsslykxcwbpzqusouii`), setup in `supabase/admin-setup.sql` |
| Old single-page site | `legacy/index.html` (reference only) |
| Default texts, courses, prices | `src/data/site.ts`, `src/cms/schema.ts` |
| First 8 blog posts | `src/content/blog/*.md` |

Admin login e-mail: frndimon@gmail.com (the password is **not** stored here).

## Still to do
1. Google Business Profile: add https://zerofear.in as the website (confirm which profile belongs to Zero Fear).
2. Delete the old Vercel projects (they send failed-deploy emails on every push).
3. Correct Instagram link and opening hours from the owner (admin → Contact & numbers).
4. Rename Facebook / Instagram / WhatsApp to Zero Fear; set up info@zerofear.in (free with Hostinger).
5. Check whether Hostinger can auto-deploy on push; until then use Save and redeploy.
6. Cover photos for Facebook / WhatsApp / Instagram.
7. Ideas: enquiry inbox in admin, reviews manager, editable course-page details and inner pages, per-page Google titles.
8. Later (no effect on ranking): move Zero Fear's Search Console and admin login from frndimon@gmail.com
   (kept for another business) to the owner's Zero Fear Google account, which already runs the Google Business Profile.
9. More area blog posts (Behala, Jadavpur, Garia, …), backlinks with the exact name/address/phone.
