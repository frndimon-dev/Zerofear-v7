// Video and photo files for the home page, served from Hostinger.
// They live in public/_astro/m/ with a content hash in the name: Astro's server sends files under
// /_astro/ with a one-year "immutable" cache header, so Hostinger's CDN keeps them and the
// server is not hit for every visitor. Replace a file = new file name (scripts/media-hash.py).
export const media = {
  "fb1.mp4": "/_astro/m/fb1.fd4d1340.mp4",
  "fb1.webp": "/_astro/m/fb1.03c319ce.webp",
  "fb2.mp4": "/_astro/m/fb2.7c58efca.mp4",
  "fb2.webp": "/_astro/m/fb2.8af42ca6.webp",
  "fb3.mp4": "/_astro/m/fb3.36f9824a.mp4",
  "fb3.webp": "/_astro/m/fb3.31395cf4.webp",
  "fb4.mp4": "/_astro/m/fb4.5669fb40.mp4",
  "fb4.webp": "/_astro/m/fb4.9409f424.webp",
  "fbfull.mp4": "/_astro/m/fbfull.d57ac9bf.mp4",
  "fbfull.webp": "/_astro/m/fbfull.142b1257.webp",
  "hero-d.mp4": "/_astro/m/hero-d.98a4b648.mp4",
  "hero-m.mp4": "/_astro/m/hero-m.b9d2014d.mp4",
  "p1a.webp": "/_astro/m/p1a.2d90d4df.webp",
  "p1b.webp": "/_astro/m/p1b.c453515b.webp",
  "p2a.webp": "/_astro/m/p2a.38adb8b8.webp",
  "p2b.webp": "/_astro/m/p2b.7b1290dc.webp",
  "p3a.webp": "/_astro/m/p3a.f4ccd8a4.webp",
  "p3b.webp": "/_astro/m/p3b.4edef457.webp"
} as const;
