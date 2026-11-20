"""
One-off: the paper grain tile used by src/styles/paper.css.

A 256 px tileable texture of soft mottling plus short paper fibres, as
alpha over transparent, so the same tile works on every paper colour.
Run once (python scripts/make-paper-grain.py) and commit the output; it is
not part of npm run build.
"""
import math
import random
from PIL import Image, ImageDraw, ImageFilter

S = 256
random.seed(14)

# Mottling: blurred noise, made tileable by blurring a 3x3 repeat and cropping the middle.
noise = Image.effect_noise((S, S), 64).convert('L')
big = Image.new('L', (S * 3, S * 3))
for i in range(3):
    for j in range(3):
        big.paste(noise, (i * S, j * S))
mott = big.filter(ImageFilter.GaussianBlur(5)).crop((S, S, 2 * S, 2 * S))

# Fibres: short soft strokes, drawn at nine offsets so they wrap.
fib = Image.new('L', (S, S), 0)
d = ImageDraw.Draw(fib)
for _ in range(170):
    x, y = random.uniform(0, S), random.uniform(0, S)
    a = random.uniform(0, math.pi)
    L = random.uniform(5, 16)
    c = random.randint(70, 150)
    pts = []
    for k in range(6):
        t = k / 5
        bend = math.sin(t * math.pi) * random.uniform(-1.5, 1.5)
        pts.append((x + math.cos(a) * L * t - math.sin(a) * bend, y + math.sin(a) * L * t + math.cos(a) * bend))
    for ox in (-S, 0, S):
        for oy in (-S, 0, S):
            d.line([(px + ox, py + oy) for px, py in pts], fill=c, width=1)
fib = fib.filter(ImageFilter.GaussianBlur(0.45))

# Dark tile: mottling darkens (alpha from below-mid noise) and fibres darken.
out = Image.new('RGBA', (S, S))
px = out.load()
m, f = mott.load(), fib.load()
for yy in range(S):
    for xx in range(S):
        v = (m[xx, yy] - 128) / 128.0  # about -0.3..0.3 after blur
        a = max(0, -v) * 60 + f[xx, yy] * 0.13
        if v > 0.05:
            # lighter flecks: white with low alpha
            px[xx, yy] = (255, 255, 255, int(min(255, v * 70)))
        else:
            px[xx, yy] = (14, 52, 56, int(min(255, a)))
out.save('src/assets/paper/grain.webp', 'WEBP', quality=80, alpha_quality=70, method=6)
print('ok')
