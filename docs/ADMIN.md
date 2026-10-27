# Zero Fear admin panel

Open **/admin** on the website (e.g. `https://zerofear-v7.vercel.app/admin`). It is hidden from Google.

## One-time setup (about 10 minutes)

1. **Database.** Supabase → your project → *SQL Editor* → *New query*. Paste everything from
   [`supabase/admin-setup.sql`](../supabase/admin-setup.sql), check the e-mail on the line marked
   `YOUR E-MAIL`, and press *Run*.
2. **Your login.** Supabase → *Authentication* → *Users* → *Add user* → *Create new user*:
   the same e-mail and a strong password, tick *Auto confirm*.
   Then *Authentication* → *Sign In / Providers* → turn **off** “Allow new users to sign up”.
3. **Publishing.** Vercel → project *zerofear-v7* → *Settings* → *Git* → *Deploy Hooks* →
   name `admin`, branch = the branch the live site is built from → *Create Hook*. Copy the link.
   In the admin panel open *Publishing* and paste it.

## Everyday use

- **Save** stores your changes. **Publish** rebuilds the website (live in 1–2 minutes).
- Every Save keeps the previous version (*Publishing* → *Earlier versions*).

| Tab | What you can change |
|---|---|
| Home page | Every section’s name, headline, text and photo; headline font and size; section order; hide/show sections; where the hero headline sits on the photo |
| Photos | “Training in action” photos (first 7 on the home page, all on /gallery) |
| Courses & prices | Name, level, short description, classes, starting price, photo |
| Contact & numbers | Phone, WhatsApp, address, hours, social links, rating/review/learner numbers |
| Blog | New posts, edit/hide posts, sections, cover + up to 12 photos, fonts |

### Text limits
Each text box allows at most as many words as the original text (and a few more letters), so
the design never breaks. Put `*stars*` around words to make them yellow.

### Photos
Photos are resized and cleaned (location data removed) in your browser before upload.
The photo editor finds people and faces and checks every screen size:

- **Green box** = a person who must stay in the photo (tap to ignore someone in the background).
- **Red circle** = head. A warning appears if any screen size cuts a head or body.
- **Mark important area** = draw a box that must always stay visible.
- Drag inside a preview to move the photo; **Auto-fit all** finds the best position.

Hero headline: the preview under *Headline on the photo* warns when the headline covers a face.

## For developers

- Content model and defaults: `src/cms/schema.ts`; build-time merge: `src/cms/index.ts`.
- Saved content: Supabase `site_content` (key `site`), blog posts: `posts`, photos: storage bucket `site-media`.
- If the database can’t be reached, the site builds from the defaults in code.
- Local build with sample content: `CMS_FILE=path/to/content.json npm run build`
  (`{ "site": {…overrides}, "posts": [ …rows ] }`).
