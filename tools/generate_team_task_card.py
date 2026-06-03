from __future__ import annotations

import base64
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "output" / "team-task-card"
OUT_DIR.mkdir(parents=True, exist_ok=True)

DPI = 300
W, H = 1240, 1792

BLUE = (0, 112, 192)
SKY = (102, 181, 223)
DEEP_BLUE = (36, 126, 189)
GREEN = (48, 154, 75)
LIGHT_GREEN = (104, 190, 117)
PALE_GREEN = (219, 239, 213)
ORANGE = (241, 173, 43)
CREAM = (255, 248, 226)
RED = (231, 48, 45)
INK = (35, 40, 45)
MUTED = (100, 111, 122)
LINE = (206, 215, 222)
WHITE = (255, 255, 255)
CARD_BG = (254, 253, 247)

FONT_DIR = Path(r"C:\Windows\Fonts")
FONT_REG = str(FONT_DIR / "msyh.ttc")
FONT_BOLD = str(FONT_DIR / "msyhbd.ttc")


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REG, size)


def text_size(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont) -> tuple[int, int]:
    box = draw.textbbox((0, 0), text, font=fnt)
    return box[2] - box[0], box[3] - box[1]


def centered(
    draw: ImageDraw.ImageDraw,
    y: int,
    text: str,
    fnt: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    x: int = W // 2,
) -> None:
    tw, th = text_size(draw, text, fnt)
    draw.text((x - tw / 2, y - th / 2), text, font=fnt, fill=fill)


def rounded(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], radius: int, fill, outline=None, width=1) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def draw_logo(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0) -> None:
    ctm_font = font(int(45 * scale), True)
    tele_font = font(int(33 * scale), True)
    small_font = font(int(17 * scale), True)

    draw.text((x, y + int(19 * scale)), "CTM", font=ctm_font, fill=BLUE)
    wave_x = x + int(112 * scale)
    wave_y = y + int(48 * scale)
    blue_pts = [
        (wave_x, wave_y + int(4 * scale)),
        (wave_x + int(9 * scale), wave_y + int(4 * scale)),
        (wave_x + int(16 * scale), wave_y - int(29 * scale)),
        (wave_x + int(24 * scale), wave_y + int(38 * scale)),
    ]
    red_pts = [
        (wave_x + int(24 * scale), wave_y + int(38 * scale)),
        (wave_x + int(33 * scale), wave_y + int(4 * scale)),
        (wave_x + int(45 * scale), wave_y + int(4 * scale)),
    ]
    draw.line(blue_pts, fill=BLUE, width=max(3, int(5 * scale)), joint="curve")
    draw.line(red_pts, fill=RED, width=max(3, int(5 * scale)), joint="curve")

    sep_x = x + int(204 * scale)
    draw.line((sep_x, y + int(14 * scale), sep_x, y + int(78 * scale)), fill=(220, 224, 226), width=max(2, int(2 * scale)))

    right_x = sep_x + int(36 * scale)
    draw.text((right_x + int(72 * scale), y + int(1 * scale)), "一讯牵", font=small_font, fill=(0, 157, 220))
    draw.line(
        (right_x + int(58 * scale), y + int(15 * scale), right_x + int(69 * scale), y + int(15 * scale)),
        fill=(0, 157, 220),
        width=max(2, int(2 * scale)),
    )
    draw.text((right_x, y + int(34 * scale)), "TeleOne", font=tele_font, fill=INK)


def draw_banner(draw: ImageDraw.ImageDraw, y: int) -> None:
    x1, x2 = 180, W - 180
    h = 96
    poly = [(x1 + 60, y), (x2, y), (x2 - 60, y + h), (x1, y + h)]
    draw.polygon(poly, fill=ORANGE)
    draw.polygon([(x1 + 30, y + h), (x1, y + h), (x1 + 60, y)], fill=(232, 154, 22))
    centered(draw, y + 48, "团建「百宝箱」· 答题挑战", font(35, True), WHITE)


def draw_side_decor(draw: ImageDraw.ImageDraw) -> None:
    # Left green activity ribbon.
    draw.rectangle((86, 432, 164, 1264), fill=LIGHT_GREEN)
    for i in range(8):
        y = 805 + i * 42
        color = GREEN if i % 2 == 0 else (83, 174, 96)
        draw.polygon([(86, y), (125, y - 36), (164, y), (125, y + 36)], fill=color)
    draw.rectangle((86, 1176, 164, 1264), fill=(93, 166, 113))
    draw.line((112, 1196, 138, 1196), fill=WHITE, width=6)
    draw.line((112, 1218, 138, 1218), fill=WHITE, width=6)
    draw.rectangle((105, 1238, 145, 1250), fill=WHITE)

    # Blue water tower and simple icons in the lower left.
    draw.rounded_rectangle((118, 1286, 196, 1610), radius=38, fill=DEEP_BLUE)
    draw.rounded_rectangle((68, 1392, 146, 1610), radius=36, fill=(75, 145, 202))
    draw.line((157, 1308, 157, 1588), fill=WHITE, width=4)
    draw.line((88, 1414, 128, 1414), fill=WHITE, width=4)
    draw.ellipse((88, 1456, 124, 1492), outline=WHITE, width=5)
    draw.arc((148, 1344, 184, 1396), 270, 90, fill=WHITE, width=4)

    # Right decorative strip with tiles and small city/nature motifs.
    draw.rectangle((1078, 86, 1162, 412), fill=DEEP_BLUE)
    draw.polygon([(1078, 86), (1162, 86), (1162, 164)], fill=(231, 95, 72))
    draw.rectangle((1078, 202, 1162, 412), fill=(248, 211, 137))
    tile = 24
    for row in range(6):
        for col in range(4):
            if (row + col) % 2 == 0:
                draw.rectangle((1078 + col * tile, 202 + row * tile, 1078 + (col + 1) * tile, 202 + (row + 1) * tile), fill=(242, 190, 93))
    draw.rectangle((1078, 412, 1162, 548), fill=SKY)
    draw.rectangle((1078, 548, 1162, 654), fill=(247, 207, 134))
    draw.rectangle((1078, 654, 1162, 746), fill=SKY)

    for cy, fill in [(206, WHITE), (812, WHITE), (1116, DEEP_BLUE)]:
        draw.ellipse((1098, cy - 32, 1162, cy + 32), fill=fill, outline=LINE, width=2)
        draw.arc((1106, cy - 23, 1154, cy + 23), 40, 315, fill=GREEN, width=7)
        draw.line((1130, cy - 30, 1130, cy + 30), fill=BLUE, width=4)

    # Bottom right hills and buildings.
    draw.rectangle((978, 1318, 1162, 1658), fill=(247, 207, 134))
    draw.pieslice((928, 1274, 1176, 1522), 180, 360, fill=LIGHT_GREEN)
    draw.pieslice((958, 1294, 1190, 1526), 180, 360, fill=GREEN)
    draw.pieslice((994, 1320, 1212, 1538), 180, 360, fill=SKY)
    for i in range(6):
        draw.arc((958 + i * 17, 1310 + i * 8, 1156 - i * 13, 1532 - i * 5), 190, 345, fill=DEEP_BLUE, width=5)
    draw.rectangle((1032, 1520, 1084, 1658), fill=DEEP_BLUE)
    draw.rectangle((1100, 1490, 1162, 1658), fill=(50, 141, 199))
    draw.line((1131, 1450, 1131, 1585), fill=BLUE, width=5)
    for dy in [1466, 1485, 1504, 1523]:
        draw.line((1108, dy, 1154, dy), fill=BLUE, width=3)

    # Bottom band with waves and city arc.
    draw.rectangle((156, 1624, 960, 1706), fill=CARD_BG)
    draw.rounded_rectangle((120, 1620, 364, 1708), radius=44, fill=LIGHT_GREEN)
    draw.rectangle((285, 1620, 424, 1708), fill=(94, 176, 113))
    draw.rectangle((424, 1620, 520, 1708), fill=SKY)
    draw.rectangle((520, 1620, 604, 1708), fill=(238, 245, 240))
    draw.arc((650, 1584, 840, 1774), 180, 360, fill=DEEP_BLUE, width=7)
    for i in range(7):
        draw.line((660 + i * 22, 1682, 660 + i * 22, 1736), fill=DEEP_BLUE, width=3)
    for i in range(4):
        y = 1668 + i * 7
        draw.arc((778 + i * 8, y, 948 + i * 10, y + 54), 190, 350, fill=SKY, width=3)
    draw.ellipse((946, 1606, 1000, 1660), fill=(249, 206, 131))
    draw.ellipse((990, 1588, 1034, 1632), fill=(248, 221, 159))
    draw.polygon([(846, 1678), (898, 1638), (948, 1678)], fill=WHITE)
    draw.polygon([(900, 1678), (954, 1624), (1012, 1678)], fill=WHITE)


def draw_top_decor(draw: ImageDraw.ImageDraw) -> None:
    draw.rounded_rectangle((570, 84, 820, 152), radius=34, fill=LIGHT_GREEN)
    for i in range(7):
        draw.arc((688 + i * 9, 92 + i * 2, 790 + i * 9, 160 - i * 2), 270, 90, fill=WHITE, width=2)
    draw.ellipse((854, 96, 924, 166), fill=WHITE, outline=LINE, width=2)
    draw.arc((870, 112, 908, 150), 40, 315, fill=GREEN, width=6)
    draw.rectangle((942, 102, 1004, 160), fill=(248, 211, 137))
    draw.polygon([(942, 102), (1004, 102), (942, 160)], fill=SKY)
    draw.rectangle((1018, 102, 1078, 160), fill=(238, 245, 240))
    draw.line((1030, 118, 1066, 118), fill=ORANGE, width=5)
    draw.line((1030, 138, 1056, 138), fill=ORANGE, width=5)


def build_image() -> Image.Image:
    img = Image.new("RGB", (W, H), (242, 242, 238))
    draw = ImageDraw.Draw(img)

    draw.rectangle((84, 84, W - 84, H - 84), fill=CARD_BG, outline=(128, 137, 145), width=3)
    draw_side_decor(draw)
    draw_top_decor(draw)

    draw_logo(draw, 170, 126, 0.88)

    centered(draw, 322, "协作同心 × 乐答有趣", font(38, True), GREEN)
    draw_banner(draw, 386)
    centered(draw, 596, "任务卡", font(52, True), ORANGE)
    centered(draw, 750, "团队答题挑战", font(58, True), GREEN)

    body_lines = [
        "请在 30 分钟内，与队友协作完成",
        "现场答题任务。每题限选一个答案，",
        "答对即可累计团队积分，最终以团队",
        "总分排名。",
    ]
    y = 890
    for line in body_lines:
        centered(draw, y, line, font(34, True), INK)
        y += 60

    rounded(draw, (230, 1190, 1010, 1356), 18, fill=CREAM, outline=(241, 216, 164), width=2)
    centered(draw, 1232, "问题", font(29, True), ORANGE)
    centered(draw, 1282, "哪一组能在限定时间内答对最多题目？", font(31, True), INK)
    centered(draw, 1326, "先分工，再作答；遇到争议题，由队长提交最终答案。", font(23, True), MUTED)

    return img


def draw_blue_side_decor(draw: ImageDraw.ImageDraw) -> None:
    navy = (20, 86, 151)
    blue = (0, 112, 192)
    cyan = (83, 188, 226)
    pale = (226, 244, 252)
    ice = (245, 251, 255)

    draw.rectangle((86, 388, 158, 1268), fill=(72, 155, 213))
    for i in range(10):
        y = 452 + i * 76
        color = (34, 124, 193) if i % 2 == 0 else (102, 187, 222)
        draw.polygon([(86, y), (122, y - 38), (158, y), (122, y + 38)], fill=color)
    draw.rectangle((86, 1138, 158, 1268), fill=navy)
    for y in [1168, 1206, 1244]:
        draw.line((106, y, 138, y), fill=WHITE, width=5)

    draw.rounded_rectangle((108, 1290, 190, 1612), radius=40, fill=blue)
    draw.rounded_rectangle((64, 1392, 144, 1612), radius=36, fill=(88, 173, 221))
    draw.line((150, 1320, 150, 1576), fill=WHITE, width=4)
    draw.ellipse((86, 1460, 126, 1500), outline=WHITE, width=5)
    draw.line((88, 1422, 124, 1422), fill=WHITE, width=4)

    draw.rectangle((1076, 86, 1162, 430), fill=navy)
    draw.polygon([(1076, 86), (1162, 86), (1162, 164)], fill=(57, 185, 221))
    draw.rectangle((1076, 214, 1162, 430), fill=(198, 232, 248))
    for row in range(6):
        for col in range(4):
            if (row + col) % 2 == 0:
                draw.rectangle((1076 + col * 24, 214 + row * 24, 1100 + col * 24, 238 + row * 24), fill=(139, 205, 235))
    draw.rectangle((1076, 430, 1162, 558), fill=(90, 181, 225))
    draw.rectangle((1076, 558, 1162, 672), fill=(223, 242, 251))
    draw.rectangle((1076, 672, 1162, 764), fill=(72, 155, 213))

    for cy, fill in [(204, ice), (820, ice), (1120, blue)]:
        draw.ellipse((1098, cy - 32, 1162, cy + 32), fill=fill, outline=(186, 213, 228), width=2)
        draw.arc((1108, cy - 23, 1154, cy + 23), 30, 330, fill=cyan, width=7)
        draw.line((1130, cy - 30, 1130, cy + 30), fill=navy, width=4)

    draw.rectangle((976, 1320, 1162, 1658), fill=(205, 232, 246))
    draw.pieslice((928, 1272, 1178, 1522), 180, 360, fill=(98, 188, 224))
    draw.pieslice((958, 1294, 1190, 1528), 180, 360, fill=blue)
    draw.pieslice((994, 1320, 1214, 1538), 180, 360, fill=(155, 217, 240))
    for i in range(6):
        draw.arc((956 + i * 18, 1310 + i * 8, 1156 - i * 13, 1532 - i * 5), 190, 345, fill=navy, width=5)
    draw.rectangle((1032, 1520, 1084, 1658), fill=blue)
    draw.rectangle((1100, 1490, 1162, 1658), fill=(42, 132, 198))
    draw.line((1131, 1450, 1131, 1585), fill=navy, width=5)
    for dy in [1466, 1485, 1504, 1523]:
        draw.line((1108, dy, 1154, dy), fill=navy, width=3)

    draw.rounded_rectangle((120, 1620, 380, 1708), radius=44, fill=(82, 177, 222))
    draw.rectangle((285, 1620, 424, 1708), fill=(38, 134, 200))
    draw.rectangle((424, 1620, 520, 1708), fill=(166, 222, 242))
    draw.rectangle((520, 1620, 604, 1708), fill=(235, 247, 252))
    draw.arc((650, 1584, 840, 1774), 180, 360, fill=navy, width=7)
    for i in range(7):
        draw.line((660 + i * 22, 1682, 660 + i * 22, 1736), fill=navy, width=3)
    for i in range(4):
        y = 1668 + i * 7
        draw.arc((778 + i * 8, y, 948 + i * 10, y + 54), 190, 350, fill=cyan, width=3)


def draw_blue_top_decor(draw: ImageDraw.ImageDraw) -> None:
    draw.rounded_rectangle((568, 84, 824, 152), radius=34, fill=(80, 174, 220))
    for i in range(8):
        draw.arc((690 + i * 9, 92 + i * 2, 790 + i * 9, 160 - i * 2), 270, 90, fill=WHITE, width=2)
    draw.ellipse((854, 96, 924, 166), fill=WHITE, outline=(186, 213, 228), width=2)
    draw.arc((870, 112, 908, 150), 35, 325, fill=(0, 112, 192), width=6)
    draw.rectangle((942, 102, 1004, 160), fill=(203, 235, 249))
    draw.polygon([(942, 102), (1004, 102), (942, 160)], fill=(72, 155, 213))
    draw.rectangle((1018, 102, 1078, 160), fill=(238, 248, 252))
    draw.line((1030, 118, 1066, 118), fill=(65, 176, 221), width=5)
    draw.line((1030, 138, 1056, 138), fill=(65, 176, 221), width=5)


def draw_blue_banner(draw: ImageDraw.ImageDraw, y: int) -> None:
    x1, x2 = 180, W - 180
    h = 96
    poly = [(x1 + 60, y), (x2, y), (x2 - 60, y + h), (x1, y + h)]
    draw.polygon(poly, fill=(0, 112, 192))
    draw.polygon([(x1 + 30, y + h), (x1, y + h), (x1 + 60, y)], fill=(20, 86, 151))
    centered(draw, y + 48, "团建「百宝箱」· 答题挑战", font(35, True), WHITE)


def build_blue_image() -> Image.Image:
    navy = (20, 86, 151)
    blue = (0, 112, 192)
    cyan = (50, 169, 218)
    soft_panel = (232, 247, 253)

    img = Image.new("RGB", (W, H), (236, 243, 248))
    draw = ImageDraw.Draw(img)

    draw.rectangle((84, 84, W - 84, H - 84), fill=(251, 254, 255), outline=(80, 119, 146), width=3)
    draw_blue_side_decor(draw)
    draw_blue_top_decor(draw)

    draw_logo(draw, 170, 126, 0.88)

    centered(draw, 322, "协作同心 × 乐答有趣", font(38, True), blue)
    draw_blue_banner(draw, 386)
    centered(draw, 596, "任务卡", font(52, True), cyan)
    centered(draw, 750, "团队答题挑战", font(58, True), navy)

    body_lines = [
        "请在 30 分钟内，与队友协作完成",
        "现场答题任务。每题限选一个答案，",
        "答对即可累计团队积分，最终以团队",
        "总分排名。",
    ]
    y = 890
    for line in body_lines:
        centered(draw, y, line, font(34, True), INK)
        y += 60

    rounded(draw, (230, 1190, 1010, 1356), 18, fill=soft_panel, outline=(164, 218, 241), width=2)
    centered(draw, 1232, "问题", font(29, True), cyan)
    centered(draw, 1282, "哪一组能在限定时间内答对最多题目？", font(31, True), INK)
    centered(draw, 1326, "先分工，再作答；遇到争议题，由队长提交最终答案。", font(23, True), MUTED)

    return img


def build_html(png_path: Path) -> str:
    data = base64.b64encode(png_path.read_bytes()).decode("ascii")
    return f"""<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>团建任务卡</title>
  <style>
    @page {{ size: 105mm 152mm; margin: 0; }}
    html, body {{ margin: 0; background: #e8ecef; }}
    body {{ display: grid; place-items: center; min-height: 100vh; }}
    img {{ width: 105mm; height: 152mm; display: block; box-shadow: 0 14px 44px rgba(26, 39, 54, .2); }}
    @media print {{
      body {{ background: white; }}
      img {{ box-shadow: none; }}
    }}
  </style>
</head>
<body>
  <img alt="团建任务卡" src="data:image/png;base64,{data}">
</body>
</html>
"""


def main() -> None:
    img = build_image()
    blue_img = build_blue_image()
    png_path = OUT_DIR / "team-building-task-card.png"
    pdf_path = OUT_DIR / "team-building-task-card.pdf"
    html_path = OUT_DIR / "team-building-task-card.html"
    blue_png_path = OUT_DIR / "team-building-task-card-blue.png"
    blue_pdf_path = OUT_DIR / "team-building-task-card-blue.pdf"
    blue_html_path = OUT_DIR / "team-building-task-card-blue.html"

    img.save(png_path, dpi=(DPI, DPI), optimize=True)
    img.save(pdf_path, "PDF", resolution=DPI)
    html_path.write_text(build_html(png_path), encoding="utf-8")
    blue_img.save(blue_png_path, dpi=(DPI, DPI), optimize=True)
    blue_img.save(blue_pdf_path, "PDF", resolution=DPI)
    blue_html_path.write_text(build_html(blue_png_path), encoding="utf-8")

    print(png_path)
    print(pdf_path)
    print(html_path)
    print(blue_png_path)
    print(blue_pdf_path)
    print(blue_html_path)


if __name__ == "__main__":
    main()
