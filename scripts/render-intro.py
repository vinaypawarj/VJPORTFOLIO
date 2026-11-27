"""Render the portfolio's silent 10-second motion reel (Pillow, NumPy, FFmpeg)."""
from pathlib import Path
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
ASSETS.mkdir(exist_ok=True)
W, H, FPS, DURATION = 1280, 720, 30, 10
RED, WHITE, MUTED = (255, 35, 71), (246, 244, 239), (153, 153, 157)
FONT_ROOT = Path("/usr/share/fonts/opentype/urw-base35")
REGULAR = str(FONT_ROOT / "NimbusSans-Regular.otf")
BOLD = str(FONT_ROOT / "NimbusSans-Bold.otf")
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
FONTS = {}


def font(size, bold=False, mono=False):
    key = (size, bold, mono)
    if key not in FONTS:
        FONTS[key] = ImageFont.truetype(MONO if mono else BOLD if bold else REGULAR, size)
    return FONTS[key]


yy, xx = np.mgrid[0:H, 0:W]
glow = np.exp(-(((xx - W * .78) / 540) ** 2 + ((yy - H * .53) / 470) ** 2))
background = np.zeros((H, W, 3), dtype=np.uint8)
for channel, amount in enumerate((13, 3, 5)):
    background[:, :, channel] = (8 + glow * amount).astype(np.uint8)
BASE = Image.fromarray(background, "RGB").convert("RGBA")
grid = ImageDraw.Draw(BASE)
for x in range(0, W, 80):
    grid.line((x, 0, x, H), fill=(17, 17, 21, 255))
for y in range(0, H, 80):
    grid.line((0, y, W, y), fill=(17, 17, 21, 255))

portrait = Image.open(ROOT / "Cinematic split-light studio portrait.png").convert("RGB")
portrait = ImageOps.fit(portrait, (458, 458), centering=(.5, .23))
mask = Image.new("L", portrait.size)
ImageDraw.Draw(mask).ellipse((0, 0, 457, 457), fill=255)
portrait = portrait.convert("RGBA")
portrait.putalpha(mask)


def text(draw, xy, value, size, fill=WHITE, bold=False, mono=False, anchor="lt"):
    draw.text(xy, value, font=font(size, bold, mono), fill=fill, anchor=anchor)


def label(draw, xy, value, fill=MUTED, size=12):
    x, y = xy
    for letter in value:
        draw.text((x, y), letter, font=font(size), fill=fill, anchor="lt")
        x += draw.textlength(letter, font=font(size)) + 2.2


def alpha(t, start, end):
    return max(0, min(1, (t - start) / .32, (end - t) / .28))


def chrome(frame, t):
    d = ImageDraw.Draw(frame)
    d.ellipse((55, 43, 61, 49), fill=RED)
    label(d, (74, 41), "VINAY PAWAR / PORTFOLIO", WHITE, 11)
    label(d, (1035, 41), "A FILM IN 10 SECONDS", size=9)
    d.line((56, 652, 1224, 652), fill=(47, 46, 49), width=1)
    d.line((56, 652, 56 + int(1168 * t / DURATION), 652), fill=RED, width=2)
    label(d, (56, 674), "RESEARCH. CODE. IMPACT.", size=10)
    label(d, (1177, 674), f"{min(10, int(t)):02d} / 10", size=10)


def scene_one(d, layer, t):
    cx, cy = 640, 325
    for radius in (183, 197, 225):
        d.ellipse((cx-radius, cy-radius, cx+radius, cy+radius), outline=(52, 38, 42), width=1)
    angle = -100 + t * 70
    d.arc((443, 128, 837, 522), angle, angle + 128, fill=RED, width=3)
    d.arc((415, 100, 865, 550), 150 - t * 45, 205 - t * 45, fill=(116, 144, 172), width=2)
    text(d, (640, 323), "VP", 160, bold=True, anchor="mm")
    label(d, (533, 563), "CURIOSITY MEETS PURPOSE", WHITE, 11)
    text(d, (640, 606), "A little about the person behind the ideas.", 19, MUTED, anchor="mm")


def scene_two(d, layer, t):
    offset = int(15 * max(0, 1 - (t - 2.3) / .5))
    label(d, (84, 136 + offset), "THE WAY I THINK", size=11)
    for index, word in enumerate(("RESEARCH.", "CODE.", "IMPACT.")):
        text(d, (78, 196 + index * 113 + offset), word, 91, RED if index == 1 else WHITE, True)
    d.rounded_rectangle((733, 205, 1194, 485), radius=12, fill=(17, 18, 21), outline=(56, 55, 59))
    d.line((733, 251, 1194, 251), fill=(47, 47, 51))
    for index in range(3):
        d.ellipse((755+index*18, 223, 761+index*18, 229), fill=RED if index == 0 else (72, 72, 77))
    label(d, (1038, 222), "PURPOSE.JS", size=9)
    lines = ["// keep moving forward", "const purpose = 'create value';", "", "learn();", "build();", "repeat();"]
    characters = max(0, int((t-2.5) * 79))
    for index, line in enumerate(lines):
        value = line[:characters]
        characters = max(0, characters-len(line)-2)
        text(d, (758, 277 + index*29), value, 16, MUTED if index == 0 else (224, 218, 223), mono=True)
    label(d, (755, 528), "LEARN DEEPLY. BUILD THOUGHTFULLY.", size=10)


def scene_three(d, layer, t):
    layer.alpha_composite(portrait, (770, 127))
    d.ellipse((758, 115, 1240, 597), outline=(77, 53, 59), width=1)
    d.arc((749, 106, 1249, 606), -85+(t-5)*32, 30+(t-5)*32, fill=RED, width=3)
    label(d, (84, 179), "THE PERSON BEHIND THE IDEAS", size=10)
    text(d, (76, 234), "VINAY", 115, bold=True)
    text(d, (76, 350), "PAWAR.", 115, RED, bold=True)
    d.line((84, 501, 135, 501), fill=RED, width=2)
    label(d, (154, 494), "UPSC ASPIRANT / ASPIRING DEVELOPER", WHITE, 11)
    text(d, (84, 539), "Curious by nature. Building with purpose.", 20, MUTED)


def scene_four(d, layer, t):
    label(d, (523, 197), "ALWAYS LEARNING. ALWAYS BUILDING.", size=11)
    text(d, (640, 294), "IDEAS INTO", 92, WHITE, bold=True, anchor="mm")
    text(d, (640, 409), "MEANING.", 112, RED, bold=True, anchor="mm")
    d.line((583, 504, 697, 504), fill=RED, width=2)
    text(d, (640, 555), "Welcome to my portfolio.", 24, MUTED, anchor="mm")


def render(t):
    frame = BASE.copy()
    for start, end, scene in ((0, 2.6, scene_one), (2.3, 5.3, scene_two), (5, 8.3, scene_three), (8, 10.3, scene_four)):
        opacity = alpha(t, start, end)
        if opacity > 0:
            layer = Image.new("RGBA", (W, H))
            scene(ImageDraw.Draw(layer), layer, t)
            layer.putalpha(layer.getchannel("A").point(lambda v: int(v * opacity)))
            frame = Image.alpha_composite(frame, layer)
    chrome(frame, t)
    return frame.convert("RGB")


if __name__ == "__main__":
    render(6.9).save(ASSETS / "intro-poster.jpg", quality=88, optimize=True)
    command = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264", "-preset", "fast", "-crf", "25", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(ASSETS / "portfolio-intro.mp4")]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    for index in range(FPS * DURATION):
        process.stdin.write(render(index / FPS).tobytes())
    process.stdin.close()
    assert process.wait() == 0
    print(f"Rendered {DURATION}-second intro: {(ASSETS / 'portfolio-intro.mp4').stat().st_size:,} bytes")
