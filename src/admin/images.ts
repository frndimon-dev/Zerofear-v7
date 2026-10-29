// Prepares a photo in the browser before upload: fixes rotation, removes
// camera data (location etc.), and saves a large and a small WebP copy.

export type Prepared = { big: Blob; small: Blob; w: number; h: number; origW: number; origH: number; url: string };

async function encode(canvas: HTMLCanvasElement): Promise<Blob> {
  const webp = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.82));
  if (webp && webp.type === 'image/webp') return webp;
  // Older iPhones can't make WebP; JPEG works everywhere.
  return (await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85)))!;
}

function draw(img: ImageBitmap, maxLong: number) {
  const scale = Math.min(1, maxLong / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  // Light touch-up, same as the photos already on the site.
  ctx.filter = 'brightness(1.03) contrast(1.06) saturate(1.06)';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function prepare(file: File): Promise<Prepared> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose a photo (JPG, PNG or WebP).');
  if (/heic|heif/i.test(file.type)) throw new Error('This is an iPhone HEIC photo. In iPhone Settings → Camera → Formats choose “Most Compatible”, or send it to yourself on WhatsApp and use that copy.');
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const bigCanvas = draw(bmp, 1920);
  const big = await encode(bigCanvas);
  const small = await encode(draw(bmp, 960));
  const out = { big, small, w: bigCanvas.width, h: bigCanvas.height, origW: bmp.width, origH: bmp.height, url: URL.createObjectURL(big) };
  bmp.close();
  return out;
}

// Social media photos: JPEG (Instagram accepts nothing else), at most 1440 px
// wide and 1920 px tall, camera data removed.
export async function prepareJpeg(file: File): Promise<{ blob: Blob; w: number; h: number; url: string }> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose a photo (JPG, PNG or WebP).');
  if (/heic|heif/i.test(file.type)) throw new Error('This is an iPhone HEIC photo. In iPhone Settings → Camera → Formats choose “Most Compatible”, or send it to yourself on WhatsApp and use that copy.');
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, 1440 / bmp.width, 1920 / bmp.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const blob = (await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.9)))!;
  return { blob, w: canvas.width, h: canvas.height, url: URL.createObjectURL(blob) };
}

export const slugify =(s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 60).replace(/-$/, '');

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load the photo.'));
    img.src = src;
  });
}
