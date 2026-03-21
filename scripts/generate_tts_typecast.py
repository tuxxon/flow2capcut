#!/usr/bin/env python3
"""
EP02 인물별 대사 TTS 생성 (Typecast API)
나레이션은 Vrew로 이미 생성됨 → 대사만 Typecast로 생성

사용법:
  python generate_tts_typecast.py                # 전체 생성
  python generate_tts_typecast.py --dry-run      # 미리보기만
  python generate_tts_typecast.py --only 머슴     # 특정 캐릭터만
"""
import json
import os
import subprocess
import sys
import time
import requests

# === 설정 ===
API_URL = "https://api.typecast.ai/v1/text-to-speech"
API_KEY = open(os.path.expanduser("~/.typecast/credentials")).read().split("=")[1].strip()
MODEL = "ssfm-v21"

BASEDIR = "/Users/tuxxon/premiere-workspace/무한야담/story/ep02"
DIALOG_JSON = os.path.join(BASEDIR, "dialogs.json")
OUTPUT_DIR = os.path.join(BASEDIR, "tts_dialogs")


def timecode_from_srt(srt_time):
    """SRT 타임코드 → 파일명용 HHMMSS (예: '00:01:09,180' → '010918')"""
    # "00:01:09,180" → h=0, m=1, s=9, ms=180
    clean = srt_time.replace(",", ".").strip()
    parts = clean.split(":")
    h = int(parts[0])
    m = int(parts[1])
    s_parts = parts[2].split(".")
    s = int(s_parts[0])
    # 6자리 HHMMSS
    return f"{h:02d}{m:02d}{s:02d}"

# === 캐릭터별 보이스 매핑 ===
VOICE_MAP = {
    "머슴":   {"voice_id": "tc_6800a387534948f191cc952b", "name": "Taewoo"},
    "과부":   {"voice_id": "tc_6731b3ac075b04a944644234", "name": "Hanyoung"},
    "두목":   {"voice_id": "tc_6059dad0b83880769a50502f", "name": "Changsu"},
    "청년1":  {"voice_id": "tc_677f2aa4a854ddffa0ebda89", "name": "Hangyeol"},
    "청년2":  {"voice_id": "tc_66d000ee0742c43c93a0ada1", "name": "Dohyun"},
    "청년3":  {"voice_id": "tc_66627b3a554eb156f28b97a4", "name": "Sunghoon"},
    "이장":   {"voice_id": "tc_63edf3df06ab09dfc77193fc", "name": "Jaeho"},
}

# === 감정 매핑 (emotion → Typecast emotion) ===
# Typecast 지원: normal, happy, sad, angry
EMOTION_MAP = {
    "혼란": "normal",
    "담담": "normal",
    "절박": "sad",
    "걱정": "sad",
    "불안 억누름": "sad",
    "짜증": "angry",
    "분노": "angry",
    "공포": "sad",
    "단호": "normal",
    "간절": "sad",
    "의아": "normal",
    "조롱": "happy",
    "비아냥": "happy",
    "비웃음": "happy",
    "경악": "angry",
    "냉혹": "angry",
    "자기희생": "sad",
    "결의": "normal",
    "무관심": "normal",
    "간청": "sad",
    "죄책감/절규": "sad",
    "맹세": "normal",
    "결연/자기희생": "sad",
    "처절한 의지": "sad",
    "깨달음": "normal",
    "흥분/깨달음": "happy",
    "희망": "happy",
    "차분/결의": "normal",
    "담담/일상": "normal",
    "안도/환희": "happy",
    "깨달음/흥분": "happy",
    "수군거림": "normal",
    "경계": "normal",
    "두려움/슬픔": "sad",
}


def generate_typecast(text, voice_id, emotion, output_wav):
    """Typecast API → WAV 파일 저장"""
    headers = {
        "x-api-key": API_KEY,
        "Content-Type": "application/json",
    }
    data = {
        "text": text,
        "voice_id": voice_id,
        "model": MODEL,
        "emotion": emotion,
    }

    resp = requests.post(API_URL, headers=headers, json=data, timeout=60)
    if resp.status_code == 200 and resp.headers.get("Content-Type", "").startswith("audio/"):
        with open(output_wav, "wb") as f:
            f.write(resp.content)
        return True
    else:
        print(f"  ERROR: {resp.status_code} - {resp.text[:200]}")
        return False


def wav_to_mp3(wav_path, mp3_path):
    """WAV → MP3 변환"""
    cmd = ["ffmpeg", "-y", "-i", wav_path, "-codec:a", "libmp3lame", "-q:a", "2", mp3_path]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0:
        os.remove(wav_path)
        return True
    else:
        print(f"  ffmpeg ERROR: {result.stderr[:200]}")
        return False


def get_mp3_duration(mp3_path):
    result = subprocess.run(
        ["ffprobe", "-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", mp3_path],
        capture_output=True, text=True
    )
    return float(result.stdout.strip())


def main():
    dry_run = "--dry-run" in sys.argv
    only_char = None
    for i, arg in enumerate(sys.argv):
        if arg == "--only" and i + 1 < len(sys.argv):
            only_char = sys.argv[i + 1]

    # dialogs.json 로드
    with open(DIALOG_JSON, "r") as f:
        data = json.load(f)

    dialogs = data["dialogs"]

    # 나레이터 제외 (Vrew로 이미 생성)
    dialogs = [d for d in dialogs if d["character"] != "나레이터"]

    if only_char:
        dialogs = [d for d in dialogs if d["character"] == only_char]
        print(f"필터: {only_char}만 ({len(dialogs)}건)")

    print(f"\n=== EP02 대사 TTS (Typecast) ===")
    print(f"총 {len(dialogs)}개 대사\n")

    # 미리보기
    for d in dialogs:
        char = d["character"]
        line = d["line"]
        emotion = d.get("emotion", "normal")
        tc_emotion = EMOTION_MAP.get(emotion, "normal")
        voice = VOICE_MAP.get(char, {})
        voice_name = voice.get("name", "?")
        preview = line[:50] + ("..." if len(line) > 50 else "")
        print(f"  {d['order']:03d} [{char:5s}] ({tc_emotion:7s}) {voice_name:10s} | {preview}")

    if dry_run:
        print("\n[DRY RUN] 생성 건너뜀")
        return

    # 생성
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    success = 0
    fail = 0
    total_duration = 0.0

    for d in dialogs:
        char = d["character"]
        line = d["line"]
        order = d["order"]
        emotion = d.get("emotion", "normal")
        tc_emotion = EMOTION_MAP.get(emotion, "normal")
        voice = VOICE_MAP.get(char)

        if not voice:
            print(f"  {order:03d} SKIP - 보이스 없음: {char}")
            fail += 1
            continue

        tc = timecode_from_srt(d.get("start", "00:00:00,000"))
        mp3_path = os.path.join(OUTPUT_DIR, f"{order:03d}_{char}_{tc}.mp3")

        if os.path.exists(mp3_path):
            dur = get_mp3_duration(mp3_path)
            total_duration += dur
            print(f"  {order:03d} SKIP (이미 존재, {dur:.1f}s)")
            success += 1
            continue

        wav_path = mp3_path.replace(".mp3", ".wav")

        print(f"  {order:03d} 생성 중... [{char}] {line[:40]}...")
        ok = generate_typecast(line, voice["voice_id"], tc_emotion, wav_path)

        if ok:
            ok2 = wav_to_mp3(wav_path, mp3_path)
            if ok2:
                dur = get_mp3_duration(mp3_path)
                total_duration += dur
                size = os.path.getsize(mp3_path)
                print(f"  {order:03d} OK ({size:,} bytes, {dur:.1f}s)")
                success += 1
            else:
                fail += 1
        else:
            fail += 1

        time.sleep(0.3)  # rate limit

    print(f"\n=== 결과 ===")
    print(f"성공: {success}, 실패: {fail}")
    print(f"총 길이: {int(total_duration // 60)}분 {total_duration % 60:.1f}초")

    # 결과 JSON
    result_path = os.path.join(OUTPUT_DIR, "result.json")
    result_data = []

    for d in dialogs:
        tc = timecode_from_srt(d.get("start", "00:00:00,000"))
        mp3_path = os.path.join(OUTPUT_DIR, f"{d['order']:03d}_{d['character']}_{tc}.mp3")
        if os.path.exists(mp3_path):
            dur = get_mp3_duration(mp3_path)
            result_data.append({
                "order": d["order"],
                "character": d["character"],
                "line": d["line"],
                "emotion": d.get("emotion", "normal"),
                "file": os.path.basename(mp3_path),
                "duration": round(dur, 3),
            })

    with open(result_path, "w") as f:
        json.dump(result_data, f, ensure_ascii=False, indent=2)
    print(f"결과 저장: {result_path}")


if __name__ == "__main__":
    main()
