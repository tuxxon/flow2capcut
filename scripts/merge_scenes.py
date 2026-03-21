#!/usr/bin/env python3
"""파트별 scenes CSV를 오프셋 적용하여 하나의 scenes.csv로 병합"""
import csv
from pathlib import Path

BASE = Path("/Users/tuxxon/premiere-workspace/무한야담/story/ep10")
PARTS = [
    ('기', 'final_기.srt'),
    ('승', 'final_승.srt'),
    ('전', 'final_전.srt'),
    ('결', 'final_결.srt'),
]

def time_to_sec(ts):
    parts = ts.replace(',', '.').split(':')
    if len(parts) == 3:
        return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
    elif len(parts) == 2:
        return int(parts[0]) * 60 + float(parts[1])
    return float(parts[0])

def sec_to_time(s):
    h = int(s // 3600)
    m = int((s % 3600) // 60)
    sec = s % 60
    return f"{h:02d}:{m:02d}:{sec:06.3f}"

def get_srt_duration(srt_path):
    """SRT 파일의 마지막 엔트리 end time을 반환"""
    import re
    with open(srt_path, encoding='utf-8') as f:
        content = f.read()
    times = re.findall(r'(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})', content)
    if times:
        last_end = times[-1][1]
        return time_to_sec(last_end)
    return 0

def main():
    all_rows = []
    fieldnames = None
    offset = 0.0

    for part_name, srt_file in PARTS:
        csv_path = BASE / f"scenes_{part_name}.csv"
        srt_path = BASE / srt_file

        if not csv_path.exists():
            print(f"  {csv_path} 없음, 건너뜀")
            continue

        with open(csv_path, encoding='utf-8') as f:
            reader = csv.DictReader(f)
            if fieldnames is None:
                fieldnames = reader.fieldnames
            rows = list(reader)

        print(f"[{part_name}] {len(rows)}씬, 오프셋: {sec_to_time(offset)}")

        for row in rows:
            start = time_to_sec(row['start_time']) + offset
            end = time_to_sec(row['end_time']) + offset
            row['start_time'] = sec_to_time(start)
            row['end_time'] = sec_to_time(end)
            row['duration'] = str(int(round(end - start)))
            all_rows.append(row)

        # 다음 파트 오프셋 = 이 파트 SRT의 마지막 시간
        srt_duration = get_srt_duration(srt_path)
        offset += srt_duration
        print(f"  SRT 길이: {sec_to_time(srt_duration)}, 다음 오프셋: {sec_to_time(offset)}")

    # 저장
    output = BASE / "scenes.csv"
    with open(output, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_rows)

    print(f"\n병합 완료: {len(all_rows)}씬 → {output}")

if __name__ == '__main__':
    main()
