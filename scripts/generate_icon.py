#!/usr/bin/env python3
"""
AutoCraft Studio (F2C) 아이콘 생성기
보라색 그라데이션 배경 + "F2C" 텍스트 + 필름 스트립 디테일
"""

import os
import math
from PIL import Image, ImageDraw, ImageFont

# 색상 정의 (AuthModal 테마에 맞춤)
GRADIENT_START = (138, 43, 226)   # Blue-Violet (#8A2BE2)
GRADIENT_MID   = (106, 27, 154)   # Deep Purple
GRADIENT_END   = (74, 20, 140)    # Darker Purple
TEXT_COLOR      = (255, 255, 255)  # White
ACCENT_COLOR   = (255, 193, 7)    # Amber/Gold accent (film strip)
FILM_STRIP_COLOR = (255, 255, 255, 40)  # Semi-transparent white

def create_rounded_mask(size, radius):
    """둥근 모서리 마스크 생성"""
    mask = Image.new('L', size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), (size[0]-1, size[1]-1)], radius=radius, fill=255)
    return mask

def create_gradient(size):
    """대각선 그라데이션 배경 생성"""
    img = Image.new('RGBA', size)
    w, h = size
    for y in range(h):
        for x in range(w):
            # 대각선 그라데이션 (좌상→우하)
            t = (x / w * 0.5 + y / h * 0.5)
            if t < 0.5:
                t2 = t * 2
                r = int(GRADIENT_START[0] + (GRADIENT_MID[0] - GRADIENT_START[0]) * t2)
                g = int(GRADIENT_START[1] + (GRADIENT_MID[1] - GRADIENT_START[1]) * t2)
                b = int(GRADIENT_START[2] + (GRADIENT_MID[2] - GRADIENT_START[2]) * t2)
            else:
                t2 = (t - 0.5) * 2
                r = int(GRADIENT_MID[0] + (GRADIENT_END[0] - GRADIENT_MID[0]) * t2)
                g = int(GRADIENT_MID[1] + (GRADIENT_END[1] - GRADIENT_MID[1]) * t2)
                b = int(GRADIENT_MID[2] + (GRADIENT_END[2] - GRADIENT_MID[2]) * t2)
            img.putpixel((x, y), (r, g, b, 255))
    return img

def create_gradient_fast(size):
    """빠른 그라데이션 (numpy 없이, 큰 사이즈는 작게 만들고 스케일업)"""
    # 작은 사이즈로 먼저 만들고 리사이즈
    small_size = min(size[0], 64)
    small = create_gradient((small_size, small_size))
    if small_size < size[0]:
        return small.resize(size, Image.LANCZOS)
    return small

def draw_film_strip_detail(draw, size, scale):
    """필름 스트립 디테일 (우측 상단 코너에 미니멀하게)"""
    w, h = size
    strip_w = int(12 * scale)
    hole_size = int(3 * scale)
    hole_gap = int(6 * scale)
    margin = int(8 * scale)

    # 우측 상단에 작은 필름 프레임
    x_start = w - margin - strip_w
    y_start = margin
    strip_h = int(40 * scale)

    # 필름 스트립 외곽선
    draw.rectangle(
        [(x_start, y_start), (x_start + strip_w, y_start + strip_h)],
        outline=(255, 255, 255, 60),
        width=max(1, int(scale))
    )

    # 필름 구멍
    for i in range(4):
        cy = y_start + int(5 * scale) + i * hole_gap
        if cy + hole_size > y_start + strip_h - int(3 * scale):
            break
        draw.rectangle(
            [(x_start + int(2 * scale), cy),
             (x_start + int(2 * scale) + hole_size, cy + hole_size)],
            fill=(255, 255, 255, 30)
        )
        draw.rectangle(
            [(x_start + strip_w - int(2 * scale) - hole_size, cy),
             (x_start + strip_w - int(2 * scale), cy + hole_size)],
            fill=(255, 255, 255, 30)
        )

def draw_flow_arrow(draw, size, scale):
    """Flow 화살표 디테일 (좌하단에 미니멀하게)"""
    w, h = size
    margin = int(12 * scale)
    arrow_len = int(20 * scale)
    line_w = max(1, int(1.5 * scale))

    x1 = margin
    y1 = h - margin
    x2 = x1 + arrow_len
    y2 = y1 - arrow_len

    # 화살표 라인
    draw.line([(x1, y1), (x2, y2)], fill=(255, 255, 255, 50), width=line_w)
    # 화살표 머리
    ah = int(5 * scale)
    draw.line([(x2, y2), (x2 - ah, y2)], fill=(255, 255, 255, 50), width=line_w)
    draw.line([(x2, y2), (x2, y2 + ah)], fill=(255, 255, 255, 50), width=line_w)

def generate_icon(size, output_path):
    """지정된 크기의 아이콘 생성"""
    scale = size / 128  # 128px 기준 스케일

    # 1. 그라데이션 배경
    img = create_gradient_fast((size, size))
    draw = ImageDraw.Draw(img, 'RGBA')

    # 2. 둥근 모서리 적용 (macOS 스타일)
    corner_radius = int(size * 0.22)  # macOS 아이콘 표준 비율
    mask = create_rounded_mask((size, size), corner_radius)

    # 3. 미니멀 디테일
    if size >= 64:
        draw_film_strip_detail(draw, (size, size), scale)
        draw_flow_arrow(draw, (size, size), scale)

    # 4. "F2C" 텍스트
    # 폰트 로드 (볼드 우선)
    font_size = int(size * 0.32)
    font = None
    font_paths = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/HelveticaNeue.ttc",
    ]
    for fp in font_paths:
        try:
            font = ImageFont.truetype(fp, font_size)
            break
        except (IOError, OSError):
            continue

    if font is None:
        font = ImageFont.load_default()

    text = "F2C"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]

    # 텍스트 위치 (중앙, 살짝 위)
    tx = (size - tw) // 2
    ty = (size - th) // 2 - int(size * 0.02)

    # 텍스트 그림자
    if size >= 64:
        shadow_offset = max(1, int(scale * 1.5))
        draw.text((tx + shadow_offset, ty + shadow_offset), text,
                  fill=(0, 0, 0, 80), font=font)

    # 메인 텍스트
    draw.text((tx, ty), text, fill=TEXT_COLOR, font=font)

    # 5. 하단에 작은 "Studio" 텍스트 (큰 사이즈만)
    if size >= 128:
        sub_font_size = int(size * 0.09)
        sub_font = None
        for fp in font_paths:
            try:
                sub_font = ImageFont.truetype(fp, sub_font_size)
                break
            except (IOError, OSError):
                continue

        if sub_font:
            sub_text = "STUDIO"
            sub_bbox = draw.textbbox((0, 0), sub_text, font=sub_font)
            sub_tw = sub_bbox[2] - sub_bbox[0]
            sub_tx = (size - sub_tw) // 2
            sub_ty = ty + th + int(size * 0.04)

            # letter spacing 효과를 위한 개별 문자 그리기
            draw.text((sub_tx, sub_ty), sub_text,
                      fill=(255, 255, 255, 180), font=sub_font)

    # 6. 미묘한 광택 효과 (상단)
    if size >= 64:
        gloss = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        gloss_draw = ImageDraw.Draw(gloss)
        for y in range(size // 3):
            alpha = int(30 * (1 - y / (size // 3)))
            gloss_draw.line([(0, y), (size, y)], fill=(255, 255, 255, alpha))
        img = Image.alpha_composite(img, gloss)

    # 7. 둥근 모서리 적용
    output = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    output.paste(img, (0, 0), mask)

    # 8. 저장
    output.save(output_path, 'PNG')
    print(f"  ✅ {output_path} ({size}x{size})")

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    assets_dir = os.path.join(base_dir, 'assets')
    iconset_dir = os.path.join(assets_dir, 'icon.iconset')
    public_dir = os.path.join(base_dir, 'public', 'assets')

    print("🎨 AutoCraft Studio (F2C) 아이콘 생성 중...")
    print()

    # iconset 파일들 생성 (macOS용)
    iconset_sizes = {
        'icon_16x16.png': 16,
        'icon_16x16@2x.png': 32,
        'icon_32x32.png': 32,
        'icon_32x32@2x.png': 64,
        'icon_128x128.png': 128,
        'icon_128x128@2x.png': 256,
        'icon_256x256.png': 256,
        'icon_256x256@2x.png': 512,
        'icon_512x512.png': 512,
        'icon_512x512@2x.png': 1024,
    }

    print("📁 icon.iconset/")
    for filename, size in iconset_sizes.items():
        output_path = os.path.join(iconset_dir, filename)
        generate_icon(size, output_path)

    # 메인 아이콘 (512x512)
    print("\n📁 assets/")
    generate_icon(512, os.path.join(assets_dir, 'icon.png'))

    # public 아이콘 (128x128)
    print("\n📁 public/assets/")
    os.makedirs(public_dir, exist_ok=True)
    generate_icon(128, os.path.join(public_dir, 'icon128.png'))

    # icns 생성 (macOS iconutil 사용)
    print("\n🍎 icon.icns 생성 중...")
    icns_path = os.path.join(assets_dir, 'icon.icns')
    os.system(f'iconutil -c icns "{iconset_dir}" -o "{icns_path}"')
    if os.path.exists(icns_path):
        print(f"  ✅ {icns_path}")
    else:
        print(f"  ⚠️ icns 생성 실패 (iconutil)")

    print("\n✨ 완료!")

if __name__ == '__main__':
    main()
