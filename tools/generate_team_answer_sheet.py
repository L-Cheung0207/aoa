from __future__ import annotations

import base64
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "output" / "team-answer-sheet"
OUT_DIR.mkdir(parents=True, exist_ok=True)

DPI = 300
W, H = 2480, 3508

BLUE = (0, 112, 192)
CYAN = (0, 160, 219)
RED = (231, 48, 45)
INK = (32, 37, 43)
MUTED = (105, 115, 126)
LIGHT = (226, 232, 238)
PANEL = (246, 249, 252)
WHITE = (255, 255, 255)

FONT_DIR = Path(r"C:\Windows\Fonts")
FONT_REG = str(FONT_DIR / "msyh.ttc")
FONT_BOLD = str(FONT_DIR / "msyhbd.ttc")


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REG, size)


def text_size(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont) -> tuple[int, int]:
    box = draw.textbbox((0, 0), text, font=fnt)
    return box[2] - box[0], box[3] - box[1]


def draw_centered_text(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    fnt: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
) -> None:
    x, y = xy
    tw, th = text_size(draw, text, fnt)
    draw.text((x - tw / 2, y - th / 2), text, font=fnt, fill=fill)


def rounded(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], radius: int, fill, outline=None, width=1) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def draw_logo(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0) -> None:
    # Clean redraw of the supplied CTM | TeleOne logo for print clarity.
    ctm_font = font(int(68 * scale), True)
    tele_font = font(int(50 * scale), True)
    small_font = font(int(26 * scale), True)

    draw.text((x, y + int(34 * scale)), "CTM", font=ctm_font, fill=BLUE)
    wave_x = x + int(168 * scale)
    wave_y = y + int(69 * scale)
    pts_blue = [
        (wave_x, wave_y + int(7 * scale)),
        (wave_x + int(13 * scale), wave_y + int(7 * scale)),
        (wave_x + int(24 * scale), wave_y - int(43 * scale)),
        (wave_x + int(35 * scale), wave_y + int(55 * scale)),
    ]
    pts_red = [
        (wave_x + int(35 * scale), wave_y + int(55 * scale)),
        (wave_x + int(48 * scale), wave_y + int(7 * scale)),
        (wave_x + int(65 * scale), wave_y + int(7 * scale)),
    ]
    draw.line(pts_blue, fill=BLUE, width=max(5, int(7 * scale)), joint="curve")
    draw.line(pts_red, fill=RED, width=max(5, int(7 * scale)), joint="curve")

    sep_x = x + int(310 * scale)
    draw.line((sep_x, y + int(24 * scale), sep_x, y + int(112 * scale)), fill=(218, 222, 226), width=max(2, int(3 * scale)))

    right_x = sep_x + int(58 * scale)
    draw.text((right_x + int(120 * scale), y + int(9 * scale)), "一讯牵", font=small_font, fill=CYAN)
    draw.line(
        (right_x + int(102 * scale), y + int(29 * scale), right_x + int(116 * scale), y + int(29 * scale)),
        fill=CYAN,
        width=max(2, int(3 * scale)),
    )
    draw.text((right_x, y + int(53 * scale)), "TeleOne", font=tele_font, fill=INK)


def draw_info_field(draw: ImageDraw.ImageDraw, x: int, y: int, w: int, label: str) -> None:
    draw.text((x, y), label, font=font(30, True), fill=MUTED)
    label_w, _ = text_size(draw, label, font(30, True))
    draw.line((x + label_w + 20, y + 42, x + w, y + 42), fill=(170, 180, 190), width=3)


def draw_answer_row(draw: ImageDraw.ImageDraw, x: int, y: int, q: int) -> None:
    num_font = font(30, True)
    opt_font = font(27, True)
    draw.text((x, y + 8), f"{q:02d}", font=num_font, fill=INK)
    for idx, opt in enumerate("ABCD"):
        cx = x + 96 + idx * 92
        cy = y + 27
        draw.ellipse((cx - 23, cy - 23, cx + 23, cy + 23), outline=(63, 78, 92), width=3, fill=WHITE)
        draw_centered_text(draw, (cx, cy - 1), opt, opt_font, BLUE if idx == 0 else INK)


def build_image() -> Image.Image:
    img = Image.new("RGB", (W, H), WHITE)
    draw = ImageDraw.Draw(img)

    # Top accent and background panels.
    draw.rectangle((0, 0, W, 46), fill=BLUE)
    draw.rectangle((0, 46, W, 66), fill=RED)
    rounded(draw, (120, 132, W - 120, 500), 26, fill=PANEL, outline=LIGHT, width=3)
    draw_logo(draw, 188, 172, 1.15)

    title = "团建活动答题卡"
    subtitle = "TEAM BUILDING ANSWER SHEET"
    draw.text((188, 340), title, font=font(92, True), fill=INK)
    draw.text((190, 446), subtitle, font=font(28, True), fill=MUTED)
    draw.line((190, 492, W - 190, 492), fill=LIGHT, width=3)

    # Participant info.
    info_y = 586
    draw_info_field(draw, 150, info_y, 650, "姓名")
    draw_info_field(draw, 850, info_y, 650, "部门")
    draw_info_field(draw, 1550, info_y, 780, "队伍")
    draw_info_field(draw, 150, info_y + 104, 650, "日期")
    draw_info_field(draw, 850, info_y + 104, 650, "场次")
    draw_info_field(draw, 1550, info_y + 104, 780, "得分")

    # Notice band.
    rounded(draw, (150, 818, W - 150, 958), 18, fill=(238, 247, 252), outline=(204, 224, 236), width=2)
    draw.text((198, 850), "填写说明", font=font(36, True), fill=BLUE)
    draw.text((380, 854), "每题选择一个答案；如需修改，请将原答案划掉并在旁边重新标记。", font=font(31), fill=INK)
    draw.text((380, 902), "团队挑战题可在底部区域记录口号、加分项或裁判备注。", font=font(31), fill=MUTED)

    # Answer area.
    top = 1042
    left = 150
    right = W - 150
    bottom = 2558
    rounded(draw, (left, top, right, bottom), 24, fill=WHITE, outline=LIGHT, width=3)
    draw.rectangle((left, top, right, top + 86), fill=(247, 250, 253))
    draw.line((left, top + 86, right, top + 86), fill=LIGHT, width=3)
    draw.text((left + 46, top + 24), "选择题区域", font=font(38, True), fill=INK)
    draw.text((right - 560, top + 30), "共 20 题 / A B C D", font=font(28, True), fill=MUTED)

    col_w = (right - left - 92) // 2
    col1_x = left + 46
    col2_x = left + 46 + col_w + 46
    row_y = top + 128
    row_gap = 127
    for i in range(10):
        y = row_y + i * row_gap
        if i > 0:
            draw.line((left + 32, y - 28, right - 32, y - 28), fill=(239, 243, 247), width=2)
        draw_answer_row(draw, col1_x, y, i + 1)
        draw_answer_row(draw, col2_x, y, i + 11)
    draw.line((left + col_w + 46, top + 106, left + col_w + 46, bottom - 36), fill=(232, 237, 242), width=3)

    # Subjective / notes area.
    note_top = 2638
    rounded(draw, (150, note_top, W - 150, 3270), 24, fill=WHITE, outline=LIGHT, width=3)
    draw.rectangle((150, note_top, W - 150, note_top + 82), fill=(252, 248, 242))
    draw.line((150, note_top + 82, W - 150, note_top + 82), fill=(235, 225, 212), width=3)
    draw.text((196, note_top + 22), "团队挑战 / 备注", font=font(38, True), fill=INK)
    draw.text((W - 690, note_top + 28), "口号、加分项、裁判记录", font=font(28, True), fill=MUTED)
    for idx in range(6):
        y = note_top + 146 + idx * 78
        draw.line((210, y, W - 210, y), fill=(199, 207, 216), width=2)

    # Footer.
    draw.text((150, 3336), "CTM | 一讯牵 TeleOne", font=font(30, True), fill=BLUE)
    footer = "公司团建活动专用"
    fw, _ = text_size(draw, footer, font(28))
    draw.text((W - 150 - fw, 3338), footer, font=font(28), fill=MUTED)
    draw.line((150, 3314, W - 150, 3314), fill=LIGHT, width=2)

    return img


def build_html(png_path: Path) -> str:
    data = base64.b64encode(png_path.read_bytes()).decode("ascii")
    return f"""<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>团建活动答题卡</title>
  <style>
    @page {{ size: A4; margin: 0; }}
    html, body {{ margin: 0; background: #e9eef3; }}
    body {{ display: grid; place-items: center; min-height: 100vh; }}
    img {{ width: 210mm; height: 297mm; display: block; box-shadow: 0 12px 40px rgba(20, 36, 50, .22); }}
    @media print {{
      body {{ background: white; }}
      img {{ box-shadow: none; }}
    }}
  </style>
</head>
<body>
  <img alt="团建活动答题卡" src="data:image/png;base64,{data}">
</body>
</html>
"""


def main() -> None:
    img = build_image()
    png_path = OUT_DIR / "team-building-answer-sheet.png"
    pdf_path = OUT_DIR / "team-building-answer-sheet.pdf"
    html_path = OUT_DIR / "team-building-answer-sheet.html"

    img.save(png_path, dpi=(DPI, DPI), optimize=True)
    img.save(pdf_path, "PDF", resolution=DPI)
    html_path.write_text(build_html(png_path), encoding="utf-8")

    print(png_path)
    print(pdf_path)
    print(html_path)


if __name__ == "__main__":
    main()
