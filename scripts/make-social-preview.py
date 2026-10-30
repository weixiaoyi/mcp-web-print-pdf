"""Generate assets/social-preview.png (1280x640) for the GitHub repo card.

Run: python scripts/make-social-preview.py
Requires: Pillow (+ numpy, optional). Fonts: Windows Segoe UI / Microsoft YaHei.
"""

from __future__ import annotations

import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1280, 640
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "social-preview.png")

FONT_DIR = r"C:\Windows\Fonts"
BOLD = os.path.join(FONT_DIR, "segoeuib.ttf")
SEMI = os.path.join(FONT_DIR, "seguisb.ttf")
REG = os.path.join(FONT_DIR, "segoeui.ttf")
CJK_BOLD = os.path.join(FONT_DIR, "msyhbd.ttc")
CJK = os.path.join(FONT_DIR, "msyh.ttc")


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    if os.path.exists(path):
        return ImageFont.truetype(path, size)
    return ImageFont.load_default(size)


def background() -> Image.Image:
    """Diagonal gradient + two soft glows."""
    y = np.linspace(0.0, 1.0, H)[:, None]
    x = np.linspace(0.0, 1.0, W)[None, :]
    t = np.clip(0.65 * y + 0.35 * x, 0, 1)

    top = np.array([9, 14, 33], dtype=np.float64)
    bottom = np.array([37, 47, 122], dtype=np.float64)
    arr = top[None, None, :] + (bottom - top)[None, None, :] * t[:, :, None]

    yy, xx = np.mgrid[0:H, 0:W]
    for cx, cy, rad, color, strength in (
        (170, 110, 420, (47, 109, 246), 0.55),
        (1050, 560, 520, (124, 58, 237), 0.45),
    ):
        d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / rad
        glow = np.clip(1 - d, 0, 1) ** 2 * strength
        arr += np.array(color, dtype=np.float64)[None, None, :] * glow[:, :, None]

    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")


def rounded_gradient(size: tuple[int, int], radius: int, c0: tuple[int, int, int], c1: tuple[int, int, int]) -> Image.Image:
    w, h = size
    t = np.linspace(0.0, 1.0, max(w, h))[:, None]
    g = np.zeros((h, w, 3), dtype=np.uint8)
    for ch in range(3):
        col = c0[ch] + (c1[ch] - c0[ch]) * t
        g[:, :, ch] = np.clip(col, 0, 255).astype(np.uint8)[:h]
    img = Image.fromarray(g, "RGB").convert("RGBA")
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w - 1, h - 1), radius=radius, fill=255)
    img.putalpha(mask)
    return img


def logo_tile(size: int) -> Image.Image:
    """Printer + sheet glyph on a rounded gradient tile (mirrors assets/logo.svg)."""
    tile = rounded_gradient((size, size), int(size * 0.23), (47, 109, 246), (124, 58, 237))
    s = size / 128.0
    layer = Image.new("RGBA", tile.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    def box(x, y, w, h, r, fill, alpha=255):
        d.rounded_rectangle(
            ((x) * s, (y) * s, (x + w) * s, (y + h) * s), radius=r * s, fill=tuple(fill) + (alpha,)
        )

    # sheet going in
    box(51, 16, 26, 30, 5, (255, 255, 255), 245)
    box(56, 23, 16, 3.2, 1.6, (47, 109, 246), 200)
    box(56, 30, 10, 3.2, 1.6, (47, 109, 246), 200)
    # printer body
    box(16, 44, 96, 44, 11, (255, 255, 255), 250)
    box(24, 52, 15, 4.5, 2.2, (124, 58, 237), 165)
    d.ellipse((91 * s, 51.5 * s, 99 * s, 59.5 * s), fill=(47, 109, 246, 175))
    # slot notches either side of the outgoing sheet
    box(30, 68, 14, 6, 3, (31, 42, 68), 75)
    box(84, 68, 14, 6, 3, (31, 42, 68), 75)
    # printed sheet coming out (cool white so it separates from the body)
    box(45, 74, 38, 38, 4, (238, 243, 255), 255)
    box(52, 82, 24, 3.2, 1.6, (47, 68, 120), 120)
    box(52, 89, 17, 3.2, 1.6, (47, 68, 120), 120)
    box(52, 96, 21, 3.2, 1.6, (47, 68, 120), 120)

    tile.alpha_composite(layer)
    return tile


def build() -> Image.Image:
    img = background().convert("RGBA")

    # subtle grid dots for texture
    dots = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dd = ImageDraw.Draw(dots)
    for gx in range(0, W, 32):
        for gy in range(0, H, 32):
            dd.point((gx, gy), fill=(255, 255, 255, 16))
    img.alpha_composite(dots)

    tile = logo_tile(200)
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((92, 214, 92 + 200, 214 + 200), radius=46, fill=(0, 0, 0, 120))
    img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(28)))
    img.alpha_composite(tile, (92, 210))

    d = ImageDraw.Draw(img)
    left = 360
    d.text((left, 196), "mcp-web-print-pdf", font=font(BOLD, 76), fill=(255, 255, 255))
    d.text((left, 300), "让 AI 直接打印到本机打印机", font=font(CJK_BOLD, 46), fill=(226, 234, 255))
    d.text(
        (left, 372),
        "HTML · 网页 · PDF · 图片 · 批量打印 · 热敏小票 · 面单标签",
        font=font(CJK, 27),
        fill=(154, 176, 214),
    )

    chips = ["MCP server", "Claude Desktop", "Cursor", "Cline", "VS Code", "dsh"]
    chip_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    cd = ImageDraw.Draw(chip_layer)
    x, y, pad, gap = left, 452, 20, 12
    for label in chips:
        f = font(CJK, 21)
        tw = cd.textlength(label, font=f)
        w = int(tw) + pad * 2
        cd.rounded_rectangle((x, y, x + w, y + 42), radius=21, fill=(255, 255, 255, 30), outline=(150, 180, 255, 90), width=1)
        cd.text((x + pad, y + 9), label, font=f, fill=(226, 234, 252, 255))
        x += w + gap
    img.alpha_composite(chip_layer)

    d.text((left, 540), "npx -y mcp-web-print-pdf", font=font(SEMI, 30), fill=(140, 214, 255))
    d.text((left, 592), "github.com/weixiaoyi/mcp-web-print-pdf   ·   webprintpdf.com", font=font(REG, 22), fill=(122, 140, 176))

    return img.convert("RGB")


def main() -> int:
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    img = build()
    img.save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT} ({os.path.getsize(OUT) / 1024:.0f} KB, {img.width}x{img.height})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
