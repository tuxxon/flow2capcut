#!/usr/bin/env python3
"""
Thumbnail Generator for Whisk2CapCut MS Store
template_*.png 배경 이미지에 EN/KO 문구를 합성하여 screenshot 이미지 생성

Usage:
    python3 generate_thumbnails.py
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

# === 설정 ===
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FONT_EN = "/System/Library/Fonts/Supplemental/Futura.ttc"
FONT_EN_INDEX = 4  # Condensed ExtraBold
FONT_KO = "/Users/tuxxon/Library/Fonts/Pretendard-ExtraBold.otf"
FONT_JA = "/System/Library/Fonts/ヒラギノ角ゴシック W8.ttc"
OUTPUT_SIZE = (1920, 1080)

# 색상 정의
WHITE = (255, 255, 255)
YELLOW = (255, 215, 0)       # #FFD700
CYAN = (0, 212, 170)         # #00D4AA

# 현재 생성 중인 언어
_current_lang = "en"


def load_template(filename):
    """template 이미지 로드 (1920x1080)"""
    img = Image.open(os.path.join(SCRIPT_DIR, filename)).convert("RGBA")
    if img.size != OUTPUT_SIZE:
        img = img.resize(OUTPUT_SIZE, Image.LANCZOS)
    return img


def load_font(size, lang=None):
    """언어에 맞는 폰트 로드: EN/DE=Futura Condensed EB, KO=Pretendard EB, JA=Hiragino W8"""
    lang = lang or _current_lang
    if lang == "ko":
        return ImageFont.truetype(FONT_KO, size)
    elif lang == "ja":
        return ImageFont.truetype(FONT_JA, size)
    else:
        return ImageFont.truetype(FONT_EN, size, index=FONT_EN_INDEX)


def render_text_block(lines, font, fill, line_spacing=1.2,
                      shadow_radius=8, shadow_color=(0, 0, 0, 200),
                      stroke_width=3, stroke_color=(0, 0, 0, 255),
                      text_align="left"):
    """텍스트 블록을 별도 RGBA 캔버스에 렌더링
    - 검정 테두리 (stroke) + 가우시안 블러 그림자로 시인성 극대화
    - text_align: 블록 내 각 줄의 정렬 ("left", "center")

    Returns: (image, text_bbox) — text_bbox는 (x_offset, y_offset, w, h)
    """
    # 1) 텍스트 크기 계산 (stroke 포함)
    line_metrics = []
    for line in lines:
        bbox = font.getbbox(line, stroke_width=stroke_width)
        lw = bbox[2] - bbox[0]
        lh = bbox[3] - bbox[1]
        top = bbox[1]
        line_metrics.append((lw, lh, top))

    max_w = max(m[0] for m in line_metrics)
    total_h = 0
    for i, (lw, lh, top) in enumerate(line_metrics):
        total_h += int(lh * line_spacing) if i < len(lines) - 1 else lh

    # 2) 캔버스 (여유 마진 확보)
    margin = max(shadow_radius * 3, stroke_width * 2 + 10)
    canvas_w = max_w + margin * 2
    canvas_h = total_h + margin * 2

    # 3) 그림자 레이어 — 가우시안 블러 (두꺼운 stroke로 더 풍성한 그림자)
    shadow_layer = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow_layer)
    sy = margin
    for i, line in enumerate(lines):
        lw, lh, top = line_metrics[i]
        lx = margin + (max_w - lw) // 2 if text_align == "center" else margin
        sdraw.text((lx, sy), line, font=font, fill=shadow_color,
                   stroke_width=stroke_width + 2, stroke_fill=shadow_color)
        sy += int(lh * line_spacing) if i < len(lines) - 1 else lh
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(shadow_radius))

    # 4) 텍스트 레이어 — 검정 테두리 + 본문 색상
    text_layer = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    tdraw = ImageDraw.Draw(text_layer)
    ty = margin
    for i, line in enumerate(lines):
        lw, lh, top = line_metrics[i]
        lx = margin + (max_w - lw) // 2 if text_align == "center" else margin
        tdraw.text((lx, ty), line, font=font, fill=fill + (255,),
                   stroke_width=stroke_width, stroke_fill=stroke_color)
        ty += int(lh * line_spacing) if i < len(lines) - 1 else lh

    # 5) 합성: 그림자 + 테두리 텍스트
    result = Image.alpha_composite(shadow_layer, text_layer)
    return result, (margin, margin, max_w, total_h)


def paste_text_block(overlay, text_img, text_bbox, x, y, align="left"):
    """렌더링된 텍스트 블록을 overlay에 붙이기

    x, y: 텍스트의 실제 pixel 시작 위치 (align 기준점)
    """
    margin, _, tw, th = text_bbox

    if align == "center":
        paste_x = x - tw // 2 - margin
    elif align == "right":
        paste_x = x - tw - margin
    else:
        paste_x = x - margin
    paste_y = y - margin

    overlay.paste(text_img, (paste_x, paste_y), text_img)


def get_text_block_size(lines, font, line_spacing=1.2):
    """텍스트 블록의 총 너비/높이 계산"""
    max_width = 0
    total_height = 0
    for i, line in enumerate(lines):
        bbox = font.getbbox(line)
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        max_width = max(max_width, w)
        if i < len(lines) - 1:
            total_height += int(h * line_spacing)
        else:
            total_height += h
    return max_width, total_height


# =====================================================
# Sample 1: Hero — "One Click / Automation"
# 검정 상자 안 중앙 배치
# =====================================================
def generate_sample_1(lang):
    img = load_template("template_1.png")
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))

    texts = {
        "en": ["One Click", "Automation"],
        "ko": ["원클릭 자동화"],
        "ja": ["ワンクリック", "自動化"],
        "de": ["Ein Klick", "Automatisierung"],
    }
    lines = texts[lang]
    font_sizes = {"en": 80, "ko": 90, "ja": 85, "de": 72}
    font_size = font_sizes[lang]
    font = load_font(font_size, lang)

    # 검정 상자: cx=960, cy=859
    cx, box_cy = 960, 859

    text_img, text_bbox = render_text_block(lines, font, YELLOW,
                                             shadow_radius=6, text_align="center")
    _, _, tw, th = text_bbox
    top_offset = font.getbbox("A")[1]
    paste_text_block(overlay, text_img, text_bbox,
                     cx, box_cy - th // 2 - top_offset, align="center")

    result = Image.alpha_composite(img, overlay)
    return result.convert("RGB")


# =====================================================
# Sample 2: Before/After
# 좌: "Manual / Hours of Work" (흰색)
# 우: "Automated / One Click" (cyan)
# =====================================================
def generate_sample_2(lang):
    img = load_template("template_2.png")
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))

    texts = {
        "en": {
            "left": ["Manual", "Hours of Work"],
            "right": ["Automated", "One Click"]
        },
        "ko": {
            "left": ["수작업", "수 시간 소요"],
            "right": ["자동화", "원클릭"]
        },
        "ja": {
            "left": ["手作業", "何時間もかかる"],
            "right": ["自動化", "ワンクリック"]
        },
        "de": {
            "left": ["Manuell", "Stunden Arbeit"],
            "right": ["Automatisiert", "Ein Klick"]
        },
    }

    font_sizes = {"en": 100, "ko": 92, "ja": 85, "de": 85}
    font_size = font_sizes[lang]
    font = load_font(font_size, lang)
    top_offset = font.getbbox("M")[1]

    # LEFT (흰색)
    text_img_l, bbox_l = render_text_block(texts[lang]["left"], font, WHITE,
                                            shadow_radius=8, text_align="center")
    paste_text_block(overlay, text_img_l, bbox_l,
                     449, 210 - top_offset, align="center")

    # RIGHT (cyan)
    text_img_r, bbox_r = render_text_block(texts[lang]["right"], font, CYAN,
                                            shadow_radius=8, text_align="center")
    paste_text_block(overlay, text_img_r, bbox_r,
                     1433, 210 - top_offset, align="center")

    result = Image.alpha_composite(img, overlay)
    return result.convert("RGB")


# =====================================================
# Sample 3: Tag Matching — 좌상단
# =====================================================
def generate_sample_3(lang):
    img = load_template("template_3.png")
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))

    texts = {
        "en": ["Visual Consistency", "by Tag Matching"],
        "ko": ["태그 매칭에 의한", "비주얼 일관성"],
        "ja": ["タグマッチングによる", "ビジュアル一貫性"],
        "de": ["Visuelle Konsistenz", "durch Tag-Matching"],
    }
    lines = texts[lang]
    font_sizes = {"en": 110, "ko": 120, "ja": 105, "de": 100}
    font_size = font_sizes[lang]
    font = load_font(font_size, lang)

    top_offset = font.getbbox("V")[1]
    text_img, text_bbox = render_text_block(lines, font, YELLOW,
                                             shadow_radius=10)
    paste_text_block(overlay, text_img, text_bbox,
                     102, 131 - top_offset, align="left")

    result = Image.alpha_composite(img, overlay)
    return result.convert("RGB")


# =====================================================
# Sample 4: How it Works — 3개 카드 위에 텍스트
# =====================================================
def generate_sample_4(lang):
    img = load_template("template_4.png")
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))

    texts = {
        "en": {
            "left": ["Prompt,", "Captions"],
            "center": ["AI Generate"],
            "right": ["Video", "Project"]
        },
        "ko": {
            "left": ["프롬프트,", "자막"],
            "center": ["AI 생성"],
            "right": ["영상", "프로젝트"]
        },
        "ja": {
            "left": ["プロンプト,", "字幕"],
            "center": ["AI生成"],
            "right": ["動画", "プロジェクト"]
        },
        "de": {
            "left": ["Prompt,", "Untertitel"],
            "center": ["KI-Generierung"],
            "right": ["Video-", "Projekt"]
        },
    }

    font_sizes = {"en": 72, "ko": 80, "ja": 72, "de": 65}
    font_size = font_sizes[lang]
    font = load_font(font_size, lang)
    top_offset = font.getbbox("P")[1]

    positions = [
        (359, 229 - top_offset, "left"),
        (971, 265 - top_offset, "center"),
        (1612, 226 - top_offset, "right"),
    ]

    for (cx, cy, key) in positions:
        text_img, text_bbox = render_text_block(texts[lang][key], font, YELLOW,
                                                 shadow_radius=6, text_align="center")
        paste_text_block(overlay, text_img, text_bbox, cx, cy, align="center")

    result = Image.alpha_composite(img, overlay)
    return result.convert("RGB")


# =====================================================
# Sample 5: Automation — 좌하단
# =====================================================
def generate_sample_5(lang):
    img = load_template("template_5.png")
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))

    texts = {
        "en": ["Work less,", "Create more"],
        "ko": ["덜 일하고,", "더 창조하자"],
        "ja": ["少ない作業で,", "もっと創造を"],
        "de": ["Weniger arbeiten,", "Mehr kreieren"],
    }
    lines = texts[lang]
    font_sizes = {"en": 155, "ko": 140, "ja": 130, "de": 120}
    font_size = font_sizes[lang]
    font = load_font(font_size, lang)

    top_offset = font.getbbox("W")[1]
    text_img, text_bbox = render_text_block(lines, font, YELLOW,
                                             shadow_radius=12)
    paste_text_block(overlay, text_img, text_bbox,
                     92, 656 - top_offset, align="left")

    result = Image.alpha_composite(img, overlay)
    return result.convert("RGB")


# =====================================================
# 메인 실행
# =====================================================
GENERATORS = {
    1: generate_sample_1,
    2: generate_sample_2,
    3: generate_sample_3,
    4: generate_sample_4,
    5: generate_sample_5,
}


def main():
    print("=== Whisk2CapCut MS Store Screenshot Generator ===\n")

    global _current_lang
    for sample_num, gen_func in GENERATORS.items():
        for lang in ["en", "ko", "ja", "de"]:
            _current_lang = lang
            lang_dir = os.path.join(SCRIPT_DIR, lang)
            os.makedirs(lang_dir, exist_ok=True)
            output_name = f"sample_{sample_num}.png"
            output_path = os.path.join(lang_dir, output_name)

            print(f"  Generating {lang}/{output_name}...", end=" ")
            try:
                result = gen_func(lang)
                result.save(output_path, "PNG", quality=95)
                print(f"OK ({result.size[0]}x{result.size[1]})")
            except Exception as e:
                import traceback
                print(f"ERROR: {e}")
                traceback.print_exc()

    print(f"\nDone! Generated 20 screenshots (5 samples x 4 languages)")


if __name__ == "__main__":
    main()
