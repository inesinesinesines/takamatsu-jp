"""
Generate icon-192.png, icon-512.png, icon-maskable-512.png for Takamatsu JP PWA.
Uses Pillow only (no cairo dependency). Renders the kanji 旅 on an orange background.

Run from repo root:
    python tools/make_icons.py
"""

import os
import sys
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

BG = (212, 99, 60, 255)       # #d4633c
FG = (253, 250, 246, 255)     # #fdfaf6
CHAR = "旅"

FONT_CANDIDATES = [
    r"C:\Windows\Fonts\YuGothB.ttc",
    r"C:\Windows\Fonts\YuGothM.ttc",
    r"C:\Windows\Fonts\msgothic.ttc",
    r"C:\Windows\Fonts\meiryob.ttc",
    r"C:\Windows\Fonts\meiryo.ttc",
    "/Library/Fonts/Hiragino Sans GB.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
]


def load_font(size):
    for p in FONT_CANDIDATES:
        if os.path.exists(p):
            try:
                # Some .ttc need an index; try 0 first then 1.
                for idx in (0, 1, 2):
                    try:
                        return ImageFont.truetype(p, size=size, index=idx)
                    except Exception:
                        continue
            except Exception:
                continue
    raise RuntimeError("No suitable Japanese-capable font found.")


def rounded_rect_mask(size, radius):
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle((0, 0, size, size), radius=radius, fill=255)
    return mask


def draw_icon(size, *, font_ratio=0.62, rounded=True):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bg_layer = Image.new("RGBA", (size, size), BG)

    if rounded:
        radius = int(size * 96 / 512)
        mask = rounded_rect_mask(size, radius)
        img.paste(bg_layer, (0, 0), mask)
    else:
        img.paste(bg_layer, (0, 0))

    # Render the character
    font_size = int(size * font_ratio)
    font = load_font(font_size)
    draw = ImageDraw.Draw(img)

    # Measure
    try:
        bbox = draw.textbbox((0, 0), CHAR, font=font)
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        ox = bbox[0]
        oy = bbox[1]
    except Exception:
        w, h = draw.textsize(CHAR, font=font)
        ox, oy = 0, 0

    x = (size - w) / 2 - ox
    y = (size - h) / 2 - oy
    draw.text((x, y), CHAR, font=font, fill=FG)

    return img


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    icon192 = draw_icon(192, font_ratio=0.62, rounded=True)
    icon192.save(os.path.join(OUT_DIR, "icon-192.png"))

    icon512 = draw_icon(512, font_ratio=0.62, rounded=True)
    icon512.save(os.path.join(OUT_DIR, "icon-512.png"))

    # Maskable: full-bleed background, character within central 80% safe zone
    maskable = draw_icon(512, font_ratio=0.42, rounded=False)
    maskable.save(os.path.join(OUT_DIR, "icon-maskable-512.png"))

    print("OK: generated icon-192.png, icon-512.png, icon-maskable-512.png")


if __name__ == "__main__":
    sys.exit(main() or 0)
