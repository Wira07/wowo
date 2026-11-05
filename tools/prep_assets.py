import numpy as np, cv2
from PIL import Image
from scipy import ndimage as ndi

SRC = r"c:\Users\Wira Sukma Saputra\Downloads\game_mbg"

def load(n, mode):
    return np.array(Image.open(f"{SRC}\\{n}").convert(mode))

def cut_black_bg(rgb, bg_thr=27, fg_thr=60):
    """Black-background studio render -> RGBA. Flood fill for sure-background, grabCut for the edge band."""
    f = rgb.astype(np.int32).max(axis=2)
    cand = f <= bg_thr
    lab, _ = ndi.label(cand)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border))
    # only trust background that is well-connected: opening removes thin leaks into dark clothing
    bg = cv2.morphologyEx(bg.astype(np.uint8), cv2.MORPH_OPEN, np.ones((9, 9), np.uint8)).astype(bool)
    fg_sure = cv2.erode((f > fg_thr).astype(np.uint8), np.ones((7, 7), np.uint8)).astype(bool)
    mask = np.full(f.shape, cv2.GC_PR_FGD, np.uint8)
    mask[bg] = cv2.GC_BGD
    mask[fg_sure & ~bg] = cv2.GC_FGD
    # pixels dark but not sure bg: probable foreground (dark clothing) unless near bg region
    near_bg = cv2.dilate(bg.astype(np.uint8), np.ones((15, 15), np.uint8)).astype(bool)
    mask[(f <= bg_thr + 6) & near_bg & ~bg] = cv2.GC_PR_BGD
    bgd = np.zeros((1, 65)); fgd = np.zeros((1, 65))
    cv2.grabCut(cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR), mask, None, bgd, fgd, 4, cv2.GC_INIT_WITH_MASK)
    fg = ((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD))
    # fill holes (dark clothing) and keep the biggest blob
    fg = cv2.morphologyEx(np.pad(fg, 40).astype(np.uint8), cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (45, 45)))[40:-40, 40:-40].astype(bool)
    fg = ndi.binary_fill_holes(fg)
    lab, n = ndi.label(fg)
    if n > 1:
        sizes = ndi.sum(fg, lab, range(1, n + 1))
        fg = lab == (1 + int(np.argmax(sizes)))
    a = fg.astype(np.uint8) * 255
    a = cv2.erode(a, np.ones((3, 3), np.uint8))
    a = cv2.GaussianBlur(a, (0, 0), 1.2)
    return np.dstack([rgb, a])

def native(rgba):
    a = rgba.copy()
    al = cv2.GaussianBlur(a[..., 3], (0, 0), 0.8)
    a[..., 3] = np.where(al < 12, 0, al)
    return a

def save(rgba, name, crop=None, maxside=512):
    im = Image.fromarray(rgba, "RGBA")
    if crop:
        w, h = im.size
        im = im.crop((int(crop[0] * w), int(crop[1] * h), int(crop[2] * w), int(crop[3] * h)))
    bb = im.getchannel("A").point(lambda v: 255 if v > 10 else 0).getbbox()
    im = im.crop(bb)
    s = maxside / max(im.size)
    if s < 1:
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    im.save(f"{SRC}\\assets\\{name}", optimize=True)
    print(name, im.size)

# Characters are cropped to head + torso so they read well inside a round collider.
save(cut_black_bg(load("Gemini_Generated_Image_x9iwetx9iwetx9iw.jpg", "RGB")), "lvl1.png", crop=(0, 0, 1, 0.62))
save(cut_black_bg(load("Gemini_Generated_Image_9kc0tl9kc0tl9kc0.jpg", "RGB")), "lvl2.png", crop=(0, 0, 1, 0.66))
save(native(load("Tandan Buah Kelapa Sawit Realistis.png", "RGBA")), "lvl3.png")
save(cut_black_bg(load("Gemini_Generated_Image_g2lmvrg2lmvrg2lm.jpg", "RGB")), "lvl4.png", crop=(0, 0, 1, 0.80))
save(native(load("a_high_resolution_top_down_shot_of_the_same_stainl.png", "RGBA")), "lvl5.png")
save(native(load("Logo Rumah Merah Putih dengan Bendera Indonesia.png", "RGBA")), "lvl6.png")

