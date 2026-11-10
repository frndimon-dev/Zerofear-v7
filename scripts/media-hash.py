"""Copy home-page media into public/_astro/m/ with a content hash in the name and rewrite src/data/media.ts.
Usage: python3 scripts/media-hash.py <folder with hero-d.mp4, p1a.webp, fb1.mp4, ...>
Files under /_astro/ get a one-year immutable cache header from Astro's server, so the CDN caches them;
the hash in the name means a changed file always gets a new URL."""
import hashlib, json, os, shutil, sys
src = sys.argv[1]
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dest = os.path.join(root, 'public/_astro/m')
os.makedirs(dest, exist_ok=True)
for old in os.listdir(dest):
    os.remove(os.path.join(dest, old))
out = {}
for f in sorted(os.listdir(src)):
    b, e = os.path.splitext(f)
    h = hashlib.md5(open(os.path.join(src, f), 'rb').read()).hexdigest()[:8]
    shutil.copy(os.path.join(src, f), os.path.join(dest, f'{b}.{h}{e}'))
    out[f] = f'/_astro/m/{b}.{h}{e}'
head = open(os.path.join(root, 'src/data/media.ts')).read().split('export const media')[0]
open(os.path.join(root, 'src/data/media.ts'), 'w').write(head + 'export const media = ' + json.dumps(out, indent=2) + ' as const;\n')
