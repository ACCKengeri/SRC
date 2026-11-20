from PIL import Image, ImageOps
import os

SRC = "../src/assets/images"
OUT = "img"
os.makedirs(OUT, exist_ok=True)

def save(im, name, q=78):
    im = im.convert("RGB")
    p = os.path.join(OUT, name)
    im.save(p, "JPEG", quality=q, optimize=True)
    print(f"{im.size[0]}x{im.size[1]}  {os.path.getsize(p)//1024}KB  {name}")

def crop_to(im, ratio_w, ratio_h):
    # center crop to target aspect
    w, h = im.size
    target = ratio_w / ratio_h
    cur = w / h
    if cur > target:
        nw = int(h * target); x = (w - nw)//2
        im = im.crop((x, 0, x+nw, h))
    else:
        nh = int(w / target); y = int((h - nh)*0.35)  # bias toward upper area
        im = im.crop((0, y, w, y+nh))
    return im

def do(src, name, box, size, q=78):
    im = Image.open(os.path.join(SRC, src))
    im = ImageOps.exif_transpose(im)
    im = crop_to(im, *box)
    im.thumbnail((size, size*4), Image.LANCZOS)
    save(im, name, q)

# hero — wide
im = ImageOps.exif_transpose(Image.open(os.path.join(SRC,"hero-chapel.png")))
im = crop_to(im, 16, 10); im.thumbnail((1600,1600), Image.LANCZOS); save(im,"hero-chapel.jpg", 80)

# domain banners 5:3
for src,name in [("domains/banners/animation.png","dom-animation.jpg"),
                 ("domains/banners/liturgy.png","dom-liturgy.jpg"),
                 ("domains/banners/outreach.jpg","dom-outreach.jpg"),
                 ("domains/banners/audio-visual.png","dom-audiovisual.jpg"),
                 ("domains/banners/logistics-hospitality.jpg","dom-logistics.jpg"),
                 ("domains/banners/media-communication.png","dom-media.jpg")]:
    do(src, name, (5,3), 900)

# liturgy gallery 4:5
for i,src in enumerate(["domains/gallery/liturgy/lit1.jpg","domains/gallery/liturgy/lit2.JPG",
                        "domains/gallery/liturgy/lit3.JPG","domains/gallery/liturgy/lit4.JPG"],1):
    do(src, f"lit{i}.jpg", (4,5), 560)

# media covers 4:5
for src,name in [("media/bereshith/01.jpg","media-bereshith.jpg"),
                 ("media/transcend/01.jpg","media-transcend.jpg"),
                 ("media/inaugural-mass/01.jpg","media-inaugural.jpg"),
                 ("media/assumption/01.jpg","media-assumption.jpg")]:
    do(src, name, (4,5), 600)

# team square
for src,name in [("team/frshijin.jpg","team-shijin.jpg"),("team/edwin.jpg","team-edwin.jpg"),
                 ("team/cherry.jpg","team-cherry.jpg"),("team/teresa.jpg","team-teresa.jpg"),
                 ("team/Alphy.jpg","team-alphy.jpg"),("team/Akhilesh.jpg","team-akhilesh.jpg"),
                 ("team/joel.jpg","team-joel.jpg"),("team/manjeera.jpg","team-manjeera.jpg"),
                 ("team/elvin.jpg","team-elvin.jpg"),("team/williams.jpg","team-williams.jpg")]:
    do(src, name, (1,1), 260, 80)

# instagram grid mock — reuse event/gallery photos, square
for src,name in [("domains/gallery/outreach/outr1.jpg","ig1.jpg"),
                 ("domains/gallery/outreach/outr3.jpg","ig2.jpg"),
                 ("media/inaugural-mass/02.jpg","ig3.jpg"),
                 ("domains/gallery/audio-visual/av3.JPG","ig4.jpg"),
                 ("domains/gallery/animation/anim4.jpg","ig5.jpg"),
                 ("media/assumption/03.jpg","ig6.jpg")]:
    do(src, name, (1,1), 300, 78)
