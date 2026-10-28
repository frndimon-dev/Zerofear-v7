# Crop, lightly enhance (no AI), resize and save photos as WebP without metadata.
import sys
from PIL import Image, ImageOps, ImageEnhance, ImageFilter

U = '/root/.claude/uploads/dd3f792c-8bc1-59d3-afe1-22127f4c16fb/'
O = '/home/user/Zerofear-v7/public/images/'

def enhance(im):
    im = ImageEnhance.Brightness(im).enhance(1.03)
    im = ImageEnhance.Contrast(im).enhance(1.08)
    im = ImageEnhance.Color(im).enhance(1.08)
    return im

JOBS = [
    ('ccf736dd-image.jpg', (0, 250, 1449, 2061), (1000, 1250), 'hero-trainer-guiding.webp'),
    ('55616674-image.jpg', (0, 915, 1090, 1787), (1000, 800), 'doorstep-lane-training.webp'),
    ('6db3ca62-image.jpg', (0, 500, 1449, 1949), (800, 800), 'gallery-first-ride.webp'),
    ('d108d087-image.jpg', (0, 760, 1449, 2209), (800, 800), 'gallery-trainer-explaining.webp'),
    ('a18230ba-image.jpg', (0, 540, 1449, 1989), (800, 800), 'gallery-any-age.webp'),
    ('bcdcb0fe-image.jpg', (0, 650, 1449, 2099), (800, 800), 'gallery-bike-with-trainer.webp'),
    ('0bd28a7b-image.jpg', (0, 400, 1449, 1849), (800, 800), 'bike-solo-ride.webp'),
    ('85465c86-image.jpg', (0, 420, 1080, 1500), (800, 800), 'gallery-hands-on.webp'),
    ('4eef19e5-image.jpg', (100, 0, 1060, 960), (800, 800), 'gallery-briefing.webp'),
    ('3921bb9d-image.jpg', (60, 0, 1020, 960), (800, 800), 'gallery-group-lesson.webp'),
    ('0cac49a7-image.jpg', (170, 0, 1130, 960), (800, 800), 'gallery-family-support.webp'),
    ('1b563d3a-image.jpg', (0, 660, 780, 1440), (800, 800), 'gallery-proud-moment.webp'),
    ('55f87abe-image.jpg', (0, 140, 2576, 1857), (1200, 800), 'how-it-works-briefing.webp'),
    ('fb28562b-image.png', (0, 0, 1536, 864), (1200, 675), 'learners-group.webp'),
    ('29bf4eea-image.png', (0, 300, 1152, 1452), (800, 800), 'trainer-demo-scooter.webp', [(372, 662, 468, 768)]),
    ('2c0f3ee0-image.jpg', (0, 470, 1080, 1550), (800, 800), 'trainers-walk-alongside.webp'),
    ('7221d7fd-image.jpg', (0, 520, 1449, 1969), (800, 800), 'bike-first-ride.webp', [(662, 1238, 758, 1308)]),
    ('2b8839b7-image.jpg', (0, 300, 1449, 2111), (1000, 1250), 'bike-clutch-practice.webp', [(1005, 1365, 1260, 1485)]),
    ('5146d70e-image.jpg', (0, 450, 1449, 2261), (1000, 1250), 'bike-royal-enfield.webp', [(655, 1595, 915, 1735)]),
]

def run(do_enhance=True):
    for src, box, size, out, *rest in JOBS:
        im = ImageOps.exif_transpose(Image.open(U + src)).convert('RGB')
        for b in (rest[0] if rest else []):  # blur number plates
            im.paste(im.crop(b).filter(ImageFilter.GaussianBlur(14)), b[:2])
        im = im.crop(box)
        if do_enhance:
            im = enhance(im)
        im = im.resize(size, Image.LANCZOS)
        if do_enhance:
            im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=3))
        im.save(O + out, 'WEBP', quality=82, method=6)
        print(out)

if __name__ == '__main__':
    run('--raw' not in sys.argv)
