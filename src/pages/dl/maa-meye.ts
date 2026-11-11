// Temporary private download for the owner: the KSBTC mother-daughter YouTube video (314 MB).
// Supabase's free plan allows 50 MB per file, so the video is stored there as 7 byte-exact pieces;
// this route streams them back as the original MP4, with Range support so a stalled download resumes.
// Not linked anywhere on the site. Remove this file once the owner has the video.
import type { APIRoute } from 'astro';

const BASE = 'https://wzesyetbiyxdgjyuhqoz.supabase.co/storage/v1/object/public/deliveries/ksbtc-maa-meye-v8q3k/';
const P = 45000000;
const SIZES = [P, P, P, P, P, P, 44011988];
const SIZE = SIZES.reduce((a, b) => a + b, 0);
const NAME = 'KSBTC_Maa_Aar_Meye_YouTube.mp4';

function head(extra: Record<string, string>) {
  return {
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${NAME}"`,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex',
    ...extra,
  };
}

function range(req: Request) {
  const rg = req.headers.get('range');
  const m = rg ? /bytes=(\d*)-(\d*)/.exec(rg) : null;
  if (!m) return { start: 0, end: SIZE - 1, partial: false };
  if (m[1] === '' && m[2] !== '') return { start: Math.max(0, SIZE - Number(m[2])), end: SIZE - 1, partial: true };
  return { start: Number(m[1] || 0), end: m[2] !== '' ? Math.min(SIZE - 1, Number(m[2])) : SIZE - 1, partial: true };
}

export const HEAD: APIRoute = ({ request }) => {
  const { start, end, partial } = range(request);
  return new Response(null, { status: partial ? 206 : 200, headers: head({ 'Content-Length': String(end - start + 1), ...(partial ? { 'Content-Range': `bytes ${start}-${end}/${SIZE}` } : {}) }) });
};

export const GET: APIRoute = ({ request }) => {
  const { start, end, partial } = range(request);
  if (start > end || start >= SIZE) return new Response(null, { status: 416, headers: head({ 'Content-Range': `bytes */${SIZE}` }) });
  const body = new ReadableStream({
    async start(controller) {
      try {
        let off = 0;
        for (let i = 0; i < SIZES.length; i++) {
          const ps = off, pe = off + SIZES[i] - 1; off += SIZES[i];
          if (pe < start || ps > end) continue;
          const a = Math.max(start, ps) - ps, b = Math.min(end, pe) - ps;
          const r = await fetch(BASE + 'part_' + i, { headers: { Range: `bytes=${a}-${b}` } });
          if (!r.ok || !r.body) throw new Error(`part ${i}: ${r.status}`);
          const reader = r.body.getReader();
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        }
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
  });
  return new Response(body, {
    status: partial ? 206 : 200,
    headers: head({ 'Content-Length': String(end - start + 1), ...(partial ? { 'Content-Range': `bytes ${start}-${end}/${SIZE}` } : {}) }),
  });
};
