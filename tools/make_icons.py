from PIL import Image, ImageDraw
SRC = r"c:\Users\Wira Sukma Saputra\Downloads\game_mbg\assets"
logo = Image.open(f"{SRC}\\lvl6.png").convert("RGBA")
for size in (192, 512):
    im = Image.new("RGBA", (size, size), (215, 0, 15, 255))
    d = ImageDraw.Draw(im)
    pad = int(size * 0.14)  # safe zone for maskable
    d.rounded_rectangle((pad, pad, size - pad, size - pad), radius=int(size * 0.16), fill=(255, 255, 255, 255))
    inner = size - 2 * pad - int(size * 0.10)
    l = logo.copy(); l.thumbnail((inner, inner), Image.LANCZOS)
    im.alpha_composite(l, ((size - l.width) // 2, (size - l.height) // 2))
    im.save(f"{SRC}\\icon-{size}.png", optimize=True)
