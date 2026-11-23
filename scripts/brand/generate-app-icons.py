"""
Ikon & grafis aplikasi Android dari logo X NEXBILL (2026-11-23) — aplikasi Google Play (TWA, folder
android/) dan NEXBILL TV (folder android-tv/). Sumber: scripts/brand/mark-white-src.png (huruf X dari
logo resmi, putih transparan, resolusi tinggi) dan scripts/brand/wordmark-white-src.png.

Jalankan dari root repo:  python scripts/brand/generate-app-icons.py
Butuh: pip install pillow numpy

Setelah menjalankan: naikkan versionCode (sudah dilakukan untuk rilis ini), lalu build ulang
android/build.ps1 dan android-tv/build.ps1 dan unggah AAB/APK baru + aset toko.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "scripts" / "brand"
MARK = Image.open(SRC / "mark-white-src.png").convert("RGBA")
WORD = Image.open(SRC / "wordmark-white-src.png").convert("RGBA")

BG = (5, 8, 16)            # #050810 — warna tema/background twa-manifest & ikon web
BG2 = (12, 22, 46)         # ujung gradien
CYAN = (34, 211, 238)
LIGHT = (203, 213, 225)


def font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    for name in (["Poppins-Bold.ttf", "Poppins-SemiBold.ttf"] if bold else ["Poppins-Medium.ttf", "Poppins-Regular.ttf"]):
        for base in ["/usr/share/fonts/truetype/google-fonts", "C:/Windows/Fonts", str(Path.home() / "AppData/Local/Microsoft/Windows/Fonts")]:
            p = Path(base) / name
            if p.exists():
                return ImageFont.truetype(str(p), size)
    return ImageFont.truetype("arialbd.ttf" if bold else "arial.ttf", size)


def fit(img: Image.Image, max_w: float, max_h: float) -> Image.Image:
    r = min(max_w / img.width, max_h / img.height)
    return img.resize((max(1, round(img.width * r)), max(1, round(img.height * r))), Image.LANCZOS)


def gradient(w: int, h: int) -> Image.Image:
    x = np.linspace(0, 1, w)[None, :]
    y = np.linspace(0, 1, h)[:, None]
    t = np.clip(0.65 * x + 0.35 * y, 0, 1)[..., None]
    arr = (np.array(BG) * (1 - t) + np.array(BG2) * t).astype(np.uint8)
    return Image.fromarray(np.broadcast_to(arr, (h, w, 3)).copy()).convert("RGBA")


def glow(canvas: Image.Image, cx: float, cy: float, r: float, color=CYAN, alpha=70) -> None:
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*color, alpha))
    canvas.alpha_composite(layer.filter(ImageFilter.GaussianBlur(r * 0.6)))


def paste_center(canvas: Image.Image, img: Image.Image, cx: float, cy: float) -> None:
    canvas.alpha_composite(img, (round(cx - img.width / 2), round(cy - img.height / 2)))


def square_icon(size: int, mark_ratio: float, bg=True, round_ratio: float = 0.0) -> Image.Image:
    """Ikon persegi: latar gelap + glow cyan halus + X putih. mark_ratio = tinggi X / sisi."""
    s = size * 4  # supersampling
    c = gradient(s, s) if bg else Image.new("RGBA", (s, s), (0, 0, 0, 0))
    if bg:
        glow(c, s * 0.5, s * 0.52, s * 0.34, alpha=55)
    m = fit(MARK, s * mark_ratio, s * mark_ratio)
    paste_center(c, m, s / 2, s / 2)
    if round_ratio:
        mask = Image.new("L", (s, s), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, s - 1, s - 1], radius=round(s * round_ratio), fill=255)
        c.putalpha(mask)
    return c.resize((size, size), Image.LANCZOS)


def silhouette(size: int, ratio: float = 0.92) -> Image.Image:
    """Ikon notifikasi Android: putih di atas transparan (sistem mewarnai sendiri)."""
    s = size * 4
    c = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    paste_center(c, fit(MARK, s * ratio, s * ratio), s / 2, s / 2)
    return c.resize((size, size), Image.LANCZOS)


def save(img: Image.Image, path: Path, rgb: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    (img.convert("RGB") if rgb else img).save(path, optimize=True)
    print("✓", path.relative_to(ROOT))


def feature_graphic() -> Image.Image:
    w, h = 1024, 500
    c = gradient(w, h)
    glow(c, 210, 250, 230, alpha=60)
    glow(c, 880, 80, 160, color=(99, 102, 241), alpha=40)
    paste_center(c, fit(MARK, 250, 250), 210, 250)
    word = fit(WORD, 470, 120)
    c.alpha_composite(word, (420, 130))
    d = ImageDraw.Draw(c)
    d.text((424, 275), "Billing & Kasir Rental PS", font=font(38), fill=CYAN)
    d.text((424, 335), "Timer • Kasir F&B • Kontrol TV • Struk Bluetooth", font=font(22, bold=False), fill=LIGHT)
    return c


def tv_banner(w: int, h: int) -> Image.Image:
    """Banner Android TV (rasio 16:9): logo kata NEXBILL + label TV."""
    c = gradient(w, h)
    glow(c, w * 0.18, h * 0.5, h * 0.55, alpha=55)
    k = w / 320
    paste_center(c, fit(MARK, 86 * k, 86 * k), 62 * k, h / 2)
    word = fit(WORD, 150 * k, 40 * k)
    c.alpha_composite(word, (round(118 * k), round(h / 2 - word.height / 2 - 14 * k)))
    d = ImageDraw.Draw(c)
    d.text((118 * k, h / 2 + 12 * k), "TV", font=font(round(28 * k)), fill=CYAN)
    return c


def main() -> None:
    a = ROOT / "android" / "app" / "src" / "main" / "res"
    densities = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
    for d, k in densities.items():
        save(square_icon(round(48 * k), 0.62), a / f"mipmap-{d}" / "ic_launcher.png")
        # Adaptive icon: ic_maskable dipotong bentuk launcher → X di zona aman (≤ 66%).
        save(square_icon(round(82 * k), 0.46), a / f"mipmap-{d}" / "ic_maskable.png")
        save(silhouette(round(24 * k)), a / f"drawable-{d}" / "ic_notification_icon.png")
        for i in range(3):
            save(square_icon(round(48 * k), 0.6, round_ratio=0.22), a / f"drawable-{d}" / f"shortcut_{i}.png")
        # Splash TWA: gambar di tengah latar #050810 (backgroundColor twa-manifest).
        splash = Image.new("RGBA", (round(300 * k), round(300 * k)), (0, 0, 0, 0))
        paste_center(splash, fit(MARK, splash.width * 0.5, splash.height * 0.5), splash.width / 2, splash.height / 2)
        save(splash, a / f"drawable-{d}" / "splash.png")

    store = ROOT / "android" / "store"
    play_icon = square_icon(512, 0.62)
    save(play_icon, store / "play-icon-512.png", rgb=True)
    save(play_icon, ROOT / "android" / "store_icon.png")
    save(feature_graphic(), store / "feature-graphic-1024x500.png", rgb=True)

    t = ROOT / "android-tv" / "app" / "src" / "main" / "res"
    save(square_icon(48, 0.62), t / "mipmap-mdpi" / "ic_launcher.png")
    save(square_icon(144, 0.62), t / "mipmap-xxhdpi" / "ic_launcher.png")
    save(tv_banner(320, 180), t / "drawable" / "banner.png", rgb=True)
    tstore = ROOT / "android-tv" / "store"
    save(tv_banner(1280, 720), tstore / "tv-banner-1280x720.png", rgb=True)
    save(play_icon, tstore / "play-icon-512.png", rgb=True)


if __name__ == "__main__":
    main()
