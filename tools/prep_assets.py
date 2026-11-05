import os
import numpy as np, cv2
from PIL import Image
from scipy import ndimage as ndi

SRC = r"c:\Users\Wira Sukma Saputra\Downloads\game_mbg"

def load(n, mode):
    return np.array(Image.open(f"{SRC}\\{n}").convert(mode))

def finalize_mask(rgb, fg, close_size=35, fill_holes=True, erode_px=3, blur_sigma=1.2):
    if close_size > 0:
        fg = cv2.morphologyEx(
            np.pad(fg, close_size).astype(np.uint8),
            cv2.MORPH_CLOSE,
            cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (close_size, close_size))
        )[close_size:-close_size, close_size:-close_size].astype(bool)
    if fill_holes:
        fg = ndi.binary_fill_holes(fg)
    lab, n = ndi.label(fg)
    if n > 1:
        sizes = ndi.sum(fg, lab, range(1, n + 1))
        fg = lab == (1 + int(np.argmax(sizes)))
    a = fg.astype(np.uint8) * 255
    if erode_px > 0:
        a = cv2.erode(a, np.ones((erode_px, erode_px), np.uint8))
    if blur_sigma > 0:
        a = cv2.GaussianBlur(a, (0, 0), blur_sigma)
    return np.dstack([rgb, a])

def cut_black_bg(rgb, bg_thr=27, fg_thr=60):
    """Black-background studio render -> RGBA. Flood fill for sure-background, grabCut for the edge band."""
    f = rgb.astype(np.int32).max(axis=2)
    cand = f <= bg_thr
    lab, _ = ndi.label(cand)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border))
    bg = cv2.morphologyEx(bg.astype(np.uint8), cv2.MORPH_OPEN, np.ones((9, 9), np.uint8)).astype(bool)
    fg_sure = cv2.erode((f > fg_thr).astype(np.uint8), np.ones((7, 7), np.uint8)).astype(bool)
    mask = np.full(f.shape, cv2.GC_PR_FGD, np.uint8)
    mask[bg] = cv2.GC_BGD
    mask[fg_sure & ~bg] = cv2.GC_FGD
    near_bg = cv2.dilate(bg.astype(np.uint8), np.ones((15, 15), np.uint8)).astype(bool)
    mask[(f <= bg_thr + 6) & near_bg & ~bg] = cv2.GC_PR_BGD
    bgd = np.zeros((1, 65)); fgd = np.zeros((1, 65))
    cv2.grabCut(cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR), mask, None, bgd, fgd, 4, cv2.GC_INIT_WITH_MASK)
    fg = ((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD))
    return finalize_mask(rgb, fg, close_size=35, fill_holes=True, erode_px=3, blur_sigma=1.2)

def cut_m2_lvl1(rgb):
    """image.png: 3D character in blue suit on grey stairs background."""
    h, w, _ = rgb.shape
    yy, xx = np.mgrid[0:h, 0:w]
    r, g, b = rgb[..., 0].astype(np.int32), rgb[..., 1].astype(np.int32), rgb[..., 2].astype(np.int32)
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    sat = mx - mn

    mask = np.full((h, w), cv2.GC_PR_BGD, np.uint8)
    in_box = (yy > 0.06 * h) & (xx > 0.16 * w) & (xx < 0.82 * w)
    mask[in_box] = cv2.GC_PR_FGD

    collar_box = (yy > 0.50 * h) & (xx > 0.38 * w) & (xx < 0.62 * w)
    head_box = (yy > 0.07 * h) & (yy < 0.48 * h) & (xx > 0.372 * w) & (xx < 0.656 * w)
    grey_bg = (sat <= 20) & (mn >= 95) & (~collar_box) & (~head_box)
    bg_sure = (
        (yy < 0.05 * h) |
        (xx < 0.15 * w) |
        (xx > 0.83 * w) |
        ((yy < 0.46 * h) & ((xx < 0.365 * w) | (xx > 0.660 * w))) |
        grey_bg
    )
    mask[bg_sure] = cv2.GC_BGD

    skin = (r - b > 24) & (r > 85) & (xx > 0.35 * w) & (xx < 0.66 * w) & (yy > 0.10 * h) & (yy < 0.62 * h)
    hair = (mx < 100) & head_box & (yy < 0.40 * h)
    grey_temple = (xx > 0.38 * w) & (xx < 0.652 * w) & (yy > 0.16 * h) & (yy < 0.34 * h) & (mx < 148)
    suit = (b - r > 14) & (yy > 0.50 * h) & (xx > 0.17 * w) & (xx < 0.81 * w)
    inner_torso = (yy > 0.56 * h) & (xx > 0.40 * w) & (xx < 0.61 * w)
    fg_sure = (skin | hair | grey_temple | suit | inner_torso) & (~bg_sure)
    mask[fg_sure] = cv2.GC_FGD

    bgd = np.zeros((1, 65)); fgd = np.zeros((1, 65))
    cv2.grabCut(cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR), mask, None, bgd, fgd, 5, cv2.GC_INIT_WITH_MASK)
    fg = (mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD)
    return finalize_mask(rgb, fg, close_size=15, fill_holes=True, erode_px=3, blur_sigma=1.2)

def cut_m2_lvl2(rgb):
    """image copy 2.png: 3D character in white shirt (eyes closed) on sky + green leaves + pole bg."""
    h, w, _ = rgb.shape
    yy, xx = np.mgrid[0:h, 0:w]
    r, g, b = rgb[..., 0].astype(np.int32), rgb[..., 1].astype(np.int32), rgb[..., 2].astype(np.int32)
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)

    head_box = (yy > 0.05 * h) & (yy < 0.75 * h) & (xx > 0.26 * w) & (xx < 0.83 * w)
    skin = head_box & (r - b > 18) & (r > 60)
    hair = (yy > 0.05 * h) & (yy < 0.54 * h) & (xx > 0.27 * w) & (xx < 0.83 * w) & (mx < 110) & (r >= b - 6)

    left_edge = np.where(
        yy < 0.72 * h,
        0.39 * w - (yy - 0.64 * h) / (0.08 * h) * (0.07 * w),
        0.32 * w - (yy - 0.72 * h) / (0.28 * h) * (0.008 * w)
    )
    right_edge = np.where(
        yy < 0.60 * h,
        0.65 * w + (yy - 0.55 * h) / (0.05 * h) * (0.12 * w),
        np.where(
            yy < 0.66 * h,
            0.77 * w + (yy - 0.60 * h) / (0.06 * h) * (0.11 * w),
            np.where(
                yy < 0.68 * h,
                0.88 * w + (yy - 0.66 * h) / (0.02 * h) * (0.06 * w),
                0.94 * w + (yy - 0.68 * h) / (0.32 * h) * (0.05 * w)
            )
        )
    )
    in_shirt_poly = (yy > 0.55 * h) & (xx >= left_edge) & (xx <= right_edge)
    is_sky_color = ((xx < 0.43 * w) & (yy < 0.65 * h) & (g > r) & (mn > 210)) | ((xx > 0.73 * w) & (yy < 0.66 * h) & (g - r >= 9) & (mn > 195))
    is_leaf_color = (g - b > 14) & (g > r)
    shirt = in_shirt_poly & (~is_sky_color) & (~is_leaf_color)

    fg = skin | hair | shirt
    return finalize_mask(rgb, fg, close_size=15, fill_holes=True, erode_px=3, blur_sigma=1.2)

def cut_m2_lvl3(rgb):
    """image copy 3.png: 3D character with spiky hair & blue T-shirt on white studio background."""
    h, w, _ = rgb.shape
    yy, xx = np.mgrid[0:h, 0:w]
    r, g, b = rgb[..., 0].astype(np.int32), rgb[..., 1].astype(np.int32), rgb[..., 2].astype(np.int32)
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)

    white_bg = (mn > 195) & ((mx - mn) < 18)
    fg = ~white_bg
    core_box = (yy > 0.35 * h) & (xx > 0.25 * w) & (xx < 0.78 * w)
    fg_filled = ndi.binary_fill_holes(fg)
    fg = np.where(core_box, fg_filled, fg)
    return finalize_mask(rgb, fg, close_size=0, fill_holes=False, erode_px=2, blur_sigma=1.0)

def cut_m2_lvl4(rgb):
    """image_puan_3d.jpg: 3D character in red jacket on light cyan/white studio background."""
    h, w, _ = rgb.shape
    r, g, b = rgb[..., 0].astype(np.int32), rgb[..., 1].astype(np.int32), rgb[..., 2].astype(np.int32)
    mn = np.minimum(np.minimum(r, g), b)

    # Light cyan/white background connected to borders
    bg_cand = (mn > 205) & (b >= r - 8)
    lab, _ = ndi.label(bg_cand)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border))
    fg = ~bg
    return finalize_mask(rgb, fg, close_size=9, fill_holes=True, erode_px=2, blur_sigma=1.0)

def cut_m2_lvl5(rgb):
    """image_puan_kebaya.jpg: Woman in red kebaya on dark grey backdrop + top-left red curtain."""
    h, w, _ = rgb.shape
    yy, xx = np.mgrid[0:h, 0:w]
    r, g, b = rgb[..., 0].astype(np.int32), rgb[..., 1].astype(np.int32), rgb[..., 2].astype(np.int32)
    mx = np.maximum(np.maximum(r, g), b)

    # Head + hair region (0.055h..0.44h, 0.275w..0.79w)
    head_box = (yy > 0.055 * h) & (yy < 0.44 * h) & (xx > 0.275 * w) & (xx < 0.79 * w)
    skin = (r - b > 24) & (g > 75) & (xx > 0.275 * w) & (xx < 0.79 * w) & (yy > 0.10 * h) & (yy < 0.65 * h)
    hair = head_box & (mx < 78)
    earrings = (yy > 0.26 * h) & (yy < 0.34 * h) & (xx > 0.34 * w) & (xx < 0.76 * w) & (mx > 150)

    # Kebaya torso region (excluding top-left red curtain above left shoulder seam)
    left_shoulder_y = 0.402 * h + np.maximum(0, 0.34 * w - xx) / (0.20 * w) * (0.068 * h)
    right_shoulder_y = 0.395 * h + np.maximum(0, xx - 0.67 * w) / (0.26 * w) * (0.070 * h)
    in_kebaya_geom = (yy >= left_shoulder_y) & (yy >= right_shoulder_y) & (yy > 0.39 * h) & (xx > 0.04 * w) & (xx < 0.96 * w)
    kebaya = in_kebaya_geom & ((r - b > 35) | ((yy > 0.45 * h) & (xx > 0.20 * w) & (xx < 0.80 * w)))

    fg = skin | hair | earrings | kebaya
    return finalize_mask(rgb, fg, close_size=19, fill_holes=True, erode_px=3, blur_sigma=1.2)

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

if __name__ == "__main__":
    if not os.path.exists(f"{SRC}\\assets\\lvl1.png"):
        save(cut_black_bg(load("Gemini_Generated_Image_x9iwetx9iwetx9iw.jpg", "RGB")), "lvl1.png", crop=(0, 0, 1, 0.62))
        save(cut_black_bg(load("Gemini_Generated_Image_9kc0tl9kc0tl9kc0.jpg", "RGB")), "lvl2.png", crop=(0, 0, 1, 0.66))
        save(native(load("Tandan Buah Kelapa Sawit Realistis.png", "RGBA")), "lvl3.png")
        save(cut_black_bg(load("Gemini_Generated_Image_g2lmvrg2lmvrg2lm.jpg", "RGB")), "lvl4.png", crop=(0, 0, 1, 0.80))
        save(native(load("a_high_resolution_top_down_shot_of_the_same_stainl.png", "RGBA")), "lvl5.png")
        save(native(load("Logo Rumah Merah Putih dengan Bendera Indonesia.png", "RGBA")), "lvl6.png")

    save(cut_m2_lvl1(load("image.png", "RGB")), "m2_lvl1.png", crop=(0, 0, 1, 0.95))
    save(cut_m2_lvl2(load("image copy 2.png", "RGB")), "m2_lvl2.png", crop=(0, 0, 1, 0.82))
    save(cut_m2_lvl3(load("image copy 3.png", "RGB")), "m2_lvl3.png", crop=(0, 0, 1, 0.96))
    save(cut_m2_lvl4(load("image_puan_3d.jpg", "RGB")), "m2_lvl4.png", crop=(0, 0, 1, 0.95))
    save(cut_m2_lvl5(load("image_puan_kebaya.jpg", "RGB")), "m2_lvl5.png", crop=(0, 0, 1, 0.68))
