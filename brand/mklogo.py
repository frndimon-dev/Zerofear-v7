# Build Zero Fear logo SVGs with text converted to outlines (Anton).
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import sys
FONT = TTFont(sys.argv[1]); OUT = sys.argv[2]
gs = FONT.getGlyphSet(); cmap = FONT.getBestCmap(); upm = FONT['head'].unitsPerEm
from fontTools.pens.boundsPen import BoundsPen
_bp = BoundsPen(gs); gs[cmap[ord('H')]].draw(_bp); asc = _bp.bounds[3]
INK, YEL, WHITE = '#0c0f16', '#ffd60a', '#ffffff'

def text(s, size, x, y, fill, track=0.02):
    """Return (svg path element, width). y is the baseline."""
    sc = size / upm; pen = SVGPathPen(gs); cx = 0
    for ch in s:
        g = cmap[ord(ch)]
        gs[g].draw(TransformPen(pen, (sc, 0, 0, -sc, x + cx, y)))
        cx += gs[g].width * sc + size * track
    w = cx - size * track
    return f'<path d="{pen.getCommands()}" fill="{fill}"/>', w

def width(s, size, track=0.02):
    sc = size / upm
    return sum(gs[cmap[ord(c)]].width * sc for c in s) + size * track * (len(s) - 1)

cap = lambda size: asc / upm * size

def mark(bg=INK, zero=WHITE, block=YEL, fear=INK, S=1080, circle=False):
    """Stacked ZERO / FEAR-in-block, centred, safe inside a circle crop."""
    size = S * 0.25; ch = cap(size); pad = size * 0.11
    gap = size * 0.12
    wz = width('ZERO', size); wf = width('FEAR', size)
    bw = wf + pad * 3; bh = ch + pad * 2
    total_h = ch + gap + bh
    top = (S - total_h) / 2
    zp, _ = text('ZERO', size, (S - wz) / 2, top + ch, zero)
    by = top + ch + gap
    fp, _ = text('FEAR', size, (S - wf) / 2, by + pad + ch, fear)
    shape = f'<circle cx="{S/2}" cy="{S/2}" r="{S/2}" fill="{bg}"/>' if circle else f'<rect width="{S}" height="{S}" fill="{bg}"/>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}" width="{S}" height="{S}">{shape}{zp}<rect x="{(S-bw)/2:.1f}" y="{by:.1f}" width="{bw:.1f}" height="{bh:.1f}" fill="{block}"/>{fp}</svg>'

def horizontal(zero=INK, block=YEL, fear=INK, bg=None, tagline=True, tagcol='#454b57'):
    size = 200; ch = cap(size); pad = size * 0.11; gap = size * 0.16
    wz = width('ZERO', size); wf = width('FEAR', size)
    bw = wf + pad * 3; bh = ch + pad * 2
    W = wz + gap + bw; H = bh
    zp, _ = text('ZERO', size, 0, pad + ch, zero)
    fx = wz + gap
    fp, _ = text('FEAR', size, fx + pad * 1.5, pad + ch, fear)
    body = f'{zp}<rect x="{fx:.1f}" y="0" width="{bw:.1f}" height="{bh:.1f}" fill="{block}"/>{fp}'
    if tagline:
        tsize = 46; t = 'SCOOTY & BIKE TRAINING'
        tw = width(t, tsize, 0.18)
        tp, _ = text(t, tsize, (W - tw) / 2, H + 30 + cap(tsize), tagcol, 0.18)
        body += tp; H = H + 30 + cap(tsize)
    m = 40; Wt, Ht = W + 2 * m, H + 2 * m
    bgr = f'<rect width="{Wt:.0f}" height="{Ht:.0f}" fill="{bg}"/>' if bg else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {Wt:.0f} {Ht:.0f}" width="{Wt:.0f}" height="{Ht:.0f}">{bgr}<g transform="translate({m},{m})">{body}</g></svg>'

files = {
  'zerofear-dp-dark.svg': mark(),
  'zerofear-dp-yellow.svg': mark(bg=YEL, zero=INK, block=INK, fear=YEL),
  'zerofear-icon.svg': mark(circle=True),
  'zerofear-logo.svg': horizontal(),
  'zerofear-logo-white.svg': horizontal(zero=WHITE, tagcol='#c8ccd6'),
  'zerofear-logo-on-dark.svg': horizontal(zero=WHITE, tagcol='#c8ccd6', bg=INK),
}
for n, s in files.items():
    open(f'{OUT}/{n}', 'w').write(s)
print('ok', list(files))
