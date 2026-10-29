# Zero Fear banners: logo + text on solid ink, real class photos in slanted
# panels with yellow dividers. Photos are placed with face detection so every
# face (with head room) stays inside the part of the panel each device shows.
import sys
sys.path.insert(0, '/tmp/claude-0/pylib')
import cv2, numpy as np
from PIL import Image, ImageDraw, ImageFont

REPO = '/home/user/Zerofear-v7'
FONT = '/tmp/claude-0/-home-user-Zerofear-v7/dd3f792c-8bc1-59d3-afe1-22127f4c16fb/scratchpad/logo/anton.ttf'
INK, YEL, WHITE = (12, 15, 22), (255, 214, 10), (255, 255, 255)

def faces(im):
    a = np.array(im)[:, :, ::-1].copy()
    d = cv2.FaceDetectorYN.create('/tmp/claude-0/yunet.onnx', '', (a.shape[1], a.shape[0]), 0.6)
    _, f = d.detect(a)
    return [] if f is None else [tuple(float(v) for v in r[:4]) for r in f]

def place(name, w, h, keep, zoom=1.0):
    """Scale + crop photo to w×h so all faces (+head room) fall inside keep=(x0,y0,x1,y1)."""
    im = Image.open(f'{REPO}/public/images/{name}.webp').convert('RGB')
    fs = faces(im)
    # face box grown to cover the whole head and a little shoulder
    fx0 = min(x - 0.35 * fw for x, y, fw, fh in fs); fx1 = max(x + 1.35 * fw for x, y, fw, fh in fs)
    fy0 = min(y - 0.45 * fh for x, y, fw, fh in fs); fy1 = max(y + 1.5 * fh for x, y, fw, fh in fs)
    cover = max(w / im.width, h / im.height)
    s = cover * zoom
    for _ in range(200):
        W, H = im.width * s, im.height * s
        lox = max(0, fx1 * s - keep[2]); hix = min(W - w, fx0 * s - keep[0])
        loy = max(0, fy1 * s - keep[3]); hiy = min(H - h, fy0 * s - keep[1])
        if lox <= hix and loy <= hiy: break
        s *= 1.02
    else:
        raise SystemExit(f"{name}: faces do not fit panel {w}x{h} keep {keep} faces {fx0:.0f},{fy0:.0f},{fx1:.0f},{fy1:.0f} cover {cover:.3f}")
    ox = (lox + hix) / 2
    oy = loy + (hiy - loy) * 0.35  # faces sit a bit high, more of the scooty/bike shows
    big = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    print(f'{name}: scale {s:.3f}, faces ok')
    return big.crop((round(ox), round(oy), round(ox) + w, round(oy) + h))

def logo(d, cx, cy, size):
    f = ImageFont.truetype(FONT, size); pad = size * 0.11
    z = d.textbbox((0, 0), 'ZERO', font=f); fr = d.textbbox((0, 0), 'FEAR', font=f)
    ch = z[3] - z[1]; gap = size * 0.10; bh = ch + pad * 2; bw = (fr[2] - fr[0]) + pad * 3
    top = cy - (ch + gap + bh) / 2
    d.text((cx - (z[2] - z[0]) / 2 - z[0], top - z[1]), 'ZERO', font=f, fill=WHITE)
    by = top + ch + gap; d.rectangle([cx - bw / 2, by, cx + bw / 2, by + bh], fill=YEL)
    d.text((cx - (fr[2] - fr[0]) / 2 - fr[0], by + pad - fr[1]), 'FEAR', font=f, fill=INK)
    return bw

def poly_mask(w, h, pts, ss=4):
    m = Image.new('L', (w * ss, h * ss), 0)
    ImageDraw.Draw(m).polygon([(x * ss, y * ss) for x, y in pts], fill=255)
    return m.resize((w, h), Image.LANCZOS)

def banner(W, H, safe, band, photos, scale, out, right_end=None):
    """safe = (x0,y0,x1,y1) seen on every device; band = (y0,y1) the photo strip."""
    img = Image.new('RGB', (W, H), INK)
    d = ImageDraw.Draw(img)
    size = int(150 * scale)
    f = ImageFont.truetype(FONT, size); fr = d.textbbox((0, 0), 'FEAR', font=f)
    bw = (fr[2] - fr[0]) + size * 0.33
    t1 = ImageFont.truetype(FONT, int(80 * scale)); t2 = ImageFont.truetype(FONT, int(44 * scale))
    lines = [('SCOOTY & BIKE TRAINING', t1, WHITE, -122), ("CAN'T RIDE A CYCLE? YOU CAN STILL RIDE.", t2, YEL, -20),
             ('KOLKATA · 1-TO-1 · DOORSTEP · 79801 10273', t2, WHITE, 46)]
    lx = safe[0] + int(20 * scale); gap = int(55 * scale); tx = lx + bw + gap
    text_end = tx + max(d.textlength(t, font=fo) for t, fo, _, _ in lines)
    cy = (safe[1] + safe[3]) / 2

    by0, by1 = band; bh = by1 - by0
    slant = int(min(bh, 450) * 0.18)          # horizontal lean of the panel edges
    bar = max(6, int(10 * scale))   # yellow divider width
    x_start = int(text_end + 40 * scale)
    n = len(photos)
    edges = [x_start + (safe[2] - slant - x_start) * i / n for i in range(n + 1)]  # bottom x of each divider
    edges[-1] = right_end if right_end else W + slant
    for i, (name, zoom) in enumerate(photos):
        bl, br = edges[i], edges[i + 1]          # bottom-left / bottom-right x
        tl, tr = bl + slant, br + slant          # top edge is shifted right
        px0 = int(bl); px1 = int(min(W, tr)); pw = px1 - px0
        # what must stay visible: inside the slants and inside the safe area
        k0 = slant + bar + 12
        k1 = min(br, safe[2]) - px0 - 12
        ky0 = max(safe[1], by0) - by0 + 8; ky1 = min(safe[3], by1) - by0 - 8
        ph = place(name, pw, bh, (k0, ky0, k1, ky1), zoom)
        m = poly_mask(pw, bh, [(tl - px0, 0), (tr - px0, 0), (br - px0, bh), (bl - px0, bh)])
        img.paste(ph, (px0, by0), m)
    d = ImageDraw.Draw(img)
    if right_end:  # close the last panel with a divider too
        d.polygon([(right_end + slant, by0), (right_end + slant + bar, by0), (right_end + bar, by1), (right_end, by1)], fill=YEL)
    for i in range(n):  # yellow dividers on the left edge of each panel
        bl = edges[i]
        d.polygon([(bl + slant, by0), (bl + slant + bar, by0), (bl + bar, by1), (bl, by1)], fill=YEL)
    logo(d, lx + bw / 2, cy, size)
    d.rectangle([tx - gap / 2 - 3 * scale, cy - 118 * scale, tx - gap / 2 + 3 * scale, cy + 118 * scale], fill=YEL)
    for t, fo, c, dy in lines:
        d.text((tx, cy + dy * scale), t, font=fo, fill=c)
    img.save(out, quality=92)
    return img

photos = [('hero-trainer-guiding', 1.0), ('bike-royal-enfield', 1.0)]
# YouTube 2560×1440: every device shows the centre 1546×423
yt = banner(2560, 1440, (507, 508, 2053, 931), (508, 931), photos, 0.66, 'zerofear-youtube-banner-2560x1440.jpg', right_end=2053 - 76)
yt.crop((507, 508, 2053, 931)).save('check-yt-phone.jpg')
yt.crop((0, 508, 2560, 931)).save('check-yt-desktop.jpg')
# Facebook 1640×856: desktop shows y 116–740, phones show x 59–1581
fb = banner(1640, 856, (59, 116, 1581, 740), (0, 856), [('hero-trainer-guiding', 1.0), ('bike-solo-ride', 1.0)], 0.62, 'zerofear-facebook-cover-1640x856.jpg')
fb.crop((0, 116, 1640, 740)).save('check-fb-desktop.jpg')
fb.crop((59, 0, 1581, 856)).save('check-fb-phone.jpg')
