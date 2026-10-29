# Social scheduler (admin → Social)

Schedule posts and stories for Google Business Profile, Facebook and Instagram, and
answer Google reviews with AI. Everything is sent by the website server
(`src/lib/social/`); the admin panel only fills the queue.

| What | How it works |
|---|---|
| Posts / stories | Rows in `social_posts`. Every 5 minutes the server sends what is due (up to 3 tries, 15 minutes apart). A GitHub Action (`social-tick.yml`) wakes it every 15 minutes in case the server slept. |
| Google reviews | Checked every 30 minutes. Claude writes a reply in the reviewer's language. 4★–5★ (setting) are posted automatically; lower ratings wait in admin → Social. |
| AI captions | "Write with AI" in the composer, with platform rules (no phone numbers or links on Google). |
| Rules | `src/lib/social/policy.ts` — checked in the browser and again before sending. |
| Database | `supabase/social-setup.sql` (already applied). Access tokens are in `social_tokens`, readable only with the secret key. |

## One-time setup

### 1. Server secrets (hPanel → Websites → zerofear.in → Node.js → Environment variables)

| Name | Where to get it |
|---|---|
| `SUPABASE_SECRET_KEY` | supabase.com → project "Zerofear web" → Project Settings → API Keys → Secret keys → create / copy (`sb_secret_…`) |
| `SOCIAL_SECRET` | Any long random text (32+ characters). Signs the connect links. |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys → Create key. Add a small credit (a few dollars lasts months). |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Step 2 |
| `META_APP_ID`, `META_APP_SECRET` | Step 3 |

After adding them: **Save and redeploy**. Admin → Social shows a checklist of what is still missing.

### 2. Google (sign in with the Google account that owns the Business Profile)
1. console.cloud.google.com → create a project "Zero Fear".
2. Request Business Profile API access: search "Business Profile APIs prerequisites" → access request form
   (use the project number). Google answers by e-mail, usually within days to a few weeks.
3. After approval, APIs & Services → Library → enable **My Business Account Management API**,
   **My Business Business Information API** and **Google My Business API**.
4. OAuth consent screen: External, app name "Zero Fear", support e-mail, add your own e-mail as a test user,
   then **Publish app** (in "Testing" mode Google logs you out every 7 days). You'll see an
   "unverified app" warning when connecting — click Advanced → Continue; that's fine for your own account.
5. Credentials → Create OAuth client ID → Web application. Authorised redirect URI:
   `https://zerofear.in/api/social/oauth/google/callback`. Copy the client ID and secret into hPanel.

### 3. Facebook & Instagram (sign in with the Facebook account that manages the page)
1. The Instagram account must be a Professional account linked to the Facebook page
   (Instagram → Settings → Account type; Facebook page → Settings → Linked accounts).
2. developers.facebook.com → My Apps → Create app → "Other" → Business.
3. Add the product **Facebook Login for Business** (or Facebook Login). Valid OAuth redirect URI:
   `https://zerofear.in/api/social/oauth/meta/callback`.
4. App settings → Basic: App domain `zerofear.in`, copy **App ID** and **App secret** into hPanel.
5. The app can stay in Development mode: it works for you as the app's admin.

### 4. Connect
Admin → Social → **Connect Google Business Profile** and **Connect Facebook & Instagram**. Every
location / page / Instagram account you manage is added; switch off the ones you don't want.

## Notes
- Instagram accepts JPEG only; the composer converts photos. Posts must be between 4:5 and 1.91:1.
- Google has no stories; Google post text may not contain phone numbers or links (use the button).
- A post stuck in "posting" for 30 minutes is marked failed (no double posting); press Retry if it didn't appear.
- Meta Graph API version: `META_GRAPH_VERSION` (default `v23.0`).
