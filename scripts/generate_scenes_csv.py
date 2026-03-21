#!/usr/bin/env python3
"""
EP02 scenes.csv 생성기 v2
SRT 파싱 → 씬 경계 정의 → 15초 초과 자동 분할 → CSV 출력
"""
import csv
import re
import os

BASEDIR = "/Users/tuxxon/premiere-workspace/무한야담/story/ep02"
SRT_PATH = os.path.join(BASEDIR, "media/영상.srt")
OUTPUT_PATH = os.path.join(BASEDIR, "빚값으로_팔려온_천재_소녀_scenes.csv")
MAX_DURATION = 15.0


def parse_srt(path):
    with open(path, "r", encoding="utf-8-sig") as f:
        content = f.read()
    blocks = re.split(r"\n\n+", content.strip())
    entries = []
    for block in blocks:
        lines = block.strip().split("\n")
        if len(lines) < 3:
            continue
        idx = int(lines[0])
        tc = lines[1]
        text = " ".join(lines[2:])
        start_str, end_str = tc.split(" --> ")
        entries.append({
            "index": idx,
            "start": start_str.strip(),
            "end": end_str.strip(),
            "start_sec": tc_to_sec(start_str.strip()),
            "end_sec": tc_to_sec(end_str.strip()),
            "text": text,
        })
    return entries


def tc_to_sec(tc):
    tc = tc.replace(",", ".")
    h, m, s = tc.split(":")
    return int(h) * 3600 + int(m) * 60 + float(s)


# === 씬 정의 (세분화 v2) ===
# (parent_scene, srt_start, srt_end, prompt, prompt_ko, characters, scene_tag, style_tag, shot_type)
SCENES = [
    # ── 훅 ──
    ("S001", 1, 2, "Water gushing up forcefully from a dry stone well, splashing high, surprised villagers in background, Joseon dynasty village", "우물에서 물 솟구침", "", "우물", "Korean webtoon, dramatic, surprising", "scene"),
    ("S002", 3, 5, "A young widow rushing toward a well in a Joseon courtyard, her face turning deathly pale, villagers murmuring behind her", "과부 달려옴, 얼굴 새하얗게", "과부", "마당", "Korean webtoon, tense, ominous", "scene"),
    ("S003", 6, 7, "Close-up of a young woman's trembling hands gripping a clothesline, her lips turning blue-purple, drained of color", "빨랫줄 잡은 손 떨림, 입술 파르스름", "과부", "마당", "Korean webtoon, eerie, foreboding", "reaction"),
    ("S004", 8, 10, "A young widow staring past a water fountain into distant darkness, her eyes unfocused and terrified, then screaming", "어둠 응시, 비명", "과부", "우물", "Korean webtoon, horror, scream", "reaction"),
    ("S005", 11, 12, "Narrator breaking the fourth wall, warm storytelling tone, asking why she screamed when water came, promising to explain from the beginning", "왜 비명? 처음부터 말씀드리겠습니다", "", "마당", "Korean webtoon, narrative, hook", "narration"),

    # ── EP01 회상 ──
    ("S006", 13, 16, "Montage recap: an amnesiac man sold as a servant, arriving at a mountain widow's house, first night bandit attack", "지난 이야기 - 머슴 팔려옴, 첫날밤 도적", "머슴", "마을_나무그늘", "Korean webtoon, recap, montage", "narration"),
    ("S007", 17, 20, "A man dying protecting a widow, then waking to a rooster's crow, dawn light in a barn, confusion on his face", "죽었는데 다시 아침, 꼬끼오", "머슴", "헛간", "Korean webtoon, death and rebirth, loop", "narration"),

    # ── 기: 2회차 아침 ──
    ("S008", 21, 25, "A young man lying on straw in a dim barn, desperately touching his chest where a blade pierced him, no wound found, disbelief", "헛간 깨어남, 가슴 더듬, 상처 없음", "머슴", "헛간", "Korean webtoon, confused, relieved", "scene"),
    ("S009", 26, 28, "Close-up of a young man whispering was it a dream, but the pain of death still vivid, cold blade memory", "꿈이었나, 죽는 고통 생생", "머슴", "헛간", "Korean webtoon, haunted, visceral", "reaction"),
    ("S010", 29, 31, "A young man's fingertips trembling, sharp pain memory lingering, then hearing a voice calling from outside the barn", "손끝 떨림, 밖에서 목소리", "머슴", "헛간", "Korean webtoon, trembling, transition", "reaction"),
    ("S011", 32, 36, "A young widow standing at barn entrance in morning light, same clothes as yesterday, same expression, same words, deja vu", "과부 등장 - 똑같은 옷 표정 말", "과부", "헛간", "Korean webtoon, deja vu, eerie", "dialogue"),
    ("S012", 37, 41, "A young man breathing deeply, inhale exhale inhale, reaching certainty that death resets to this morning", "숨 들이쉬고 - 죽으면 돌아온다 확신", "머슴", "마당", "Korean webtoon, realization, resolve", "reaction"),
    ("S013", 42, 45, "A young widow holding empty wooden water bucket, cracked dry lips, morning sun on courtyard", "과부 빈 물동이, 입술 갈라짐", "과부", "마당", "Korean webtoon, desperate, thirst", "scene"),
    ("S014", 46, 47, "Close-up of widow speaking with cracked voice about no water means no cooking no laundry, desperation in her eyes", "물 없으면 밥도 못짓고 빨래도 못해", "과부", "마당", "Korean webtoon, desperate plea", "dialogue"),
    ("S015", 48, 51, "A dried stone well seen from above, cracked earth around it, wooden bucket scraping empty bottom, desolate", "마른 우물, 두레박 바닥만 긁힘", "", "우물", "Korean webtoon, desolate, barren", "scene"),
    ("S016", 52, 55, "A young man deciding he must dig, searching the barn frantically, tossing straw aside, dust clouds rising", "팔 수밖에, 헛간 뒤지기, 볏짚 먼지", "머슴", "헛간", "Korean webtoon, urgent, searching", "scene"),
    ("S017", 56, 59, "A man checking rafters finding only cobwebs, then searching the yard behind jars and along walls, only weeds", "서까래 거미줄, 마당 장독대 뒤 잡초만", "머슴", "마당", "Korean webtoon, frantic, searching", "scene"),
    ("S018a", 60, 62, "Walking to the yard, checking behind jars, opening a rusty storage door with a creak", "마당 나가기, 창고 문 삐걱", "머슴", "마당", "Korean webtoon, searching", "scene"),
    ("S018b", 63, 65, "Finding only empty sacks and rotten rope inside, nothing useful anywhere, slamming fist in frustration", "빈 가마니 썩은 밧줄뿐, 아무것도 없음", "머슴", "헛간", "Korean webtoon, hopeless, empty", "scene"),
    ("S019", 66, 68, "A young man standing with empty hands, no shovel no pickaxe no hoe, clenching bare fists with determination", "삽도 곡괭이도 없음, 맨손이다", "머슴", "마당", "Korean webtoon, bare-handed resolve", "reaction"),
    ("S020", 69, 71, "Bare hands digging into hard dry earth of a well, dirt under fingernails, skin peeling from palms", "맨손 우물파기, 손톱 흙, 손바닥 벗겨짐", "머슴", "우물", "Korean webtoon, painful, raw", "scene"),
    ("S021", 72, 74, "Blood seeping from torn fingers hitting stones, but the man doesn't stop digging, gritting teeth", "피, 돌에 살 찢어짐, 멈추지 않음", "머슴", "우물", "Korean webtoon, endurance, blood", "scene"),
    ("S022", 75, 76, "Water erupting from the well at sunset, an exhausted man collapsed beside it, completely drained of strength", "해질무렵 물 터짐, 힘 빠짐", "머슴", "우물", "Korean webtoon, breakthrough, exhausted", "scene"),
    ("S023", 77, 80, "A widow running to the well but not smiling, pausing to stare at the water, eyes looking at something far beyond", "과부 달려옴 근데 안 웃음, 먼 곳 응시", "과부", "우물", "Korean webtoon, mysterious, unsettling", "scene"),
    ("S024", 81, 84, "A worried man asking Manim? A widow shaking her head saying nothing, it's nothing, forcing composure", "마님? - 아니야 아무것도 아니야", "머슴,과부", "우물", "Korean webtoon, suppressed fear", "dialogue"),
    ("S025", 85, 87, "A widow bringing water, seeing the man's bloody hands, freezing in shock at the gruesome sight", "과부 물 떠옴, 피투성이 손 보고 멈칫", "머슴,과부", "마당", "Korean webtoon, shock, concern", "scene"),
    ("S026", 88, 90, "A widow silently tearing her skirt hem and wrapping a man's bloody hands, no words spoken, just gentle care", "치맛자락 찢어 손 감싸줌, 말 없이", "머슴,과부", "마당", "Korean webtoon, tender, silent", "scene"),
    ("S027", 91, 94, "Night falls, a lone bandit enters the courtyard, a man grabs a rock and hurls it at the intruder's head", "밤, 도적 한명, 돌멩이 던짐", "머슴", "마당_밤", "Korean webtoon, night action", "scene"),
    ("S028", 95, 96, "A rock hitting with a thud, the bandit fleeing into darkness, but the relief is short-lived", "퍽! 도망, 하지만 안심은 일러", "", "마당_밤", "Korean webtoon, brief relief", "scene"),
    ("S029", 97, 100, "Five bandits storming into the courtyard with torches, the fleeing bandit brought his gang back", "다섯명 몰려옴, 도둑이 동료 데려옴", "두목", "마당_밤", "Korean webtoon, outnumbered, dread", "scene"),
    ("S030", 101, 103, "A bandit leader drawing his sword asking if this is the house again, sneering about a mere servant cracking his man's skull", "또 이 집이야? 머슴 새끼가 우리 식구 머리를 깼어?", "두목", "마당_밤", "Korean webtoon, threatening, menacing", "dialogue"),
    ("S031", 104, 105, "A gleaming blade slashing downward, moonlight on steel, fading to black", "칼 번쩍, 어둠", "두목", "마당_밤", "Korean webtoon, death, fade to black", "scene"),

    # ── 기: 3회차 ──
    ("S032", 106, 110, "Third morning, rooster crowing, a man waking in a barn without checking his chest, he already knows, purposeful eyes", "3번째 아침, 가슴 안 더듬, 알고 있음", "머슴", "헛간", "Korean webtoon, calm knowing", "scene"),
    ("S033", 111, 115, "A man walking along a crumbling stone wall at dawn, carefully examining gaps between stones, remembering something from last night", "담장 따라 걷기, 무너진 돌 사이, 달빛에 빛나던 것", "머슴", "마당", "Korean webtoon, searching, memory", "scene"),
    ("S034", 116, 120, "Fingertips touching cold rusty iron between stones, pulling out a buried shovel, a smile forming on the man's face", "녹슨 삽 발견, 입꼬리 올라감", "머슴", "마당", "Korean webtoon, discovery, hope", "scene"),
    ("S035", 121, 125, "A man digging a well energetically with a rusty shovel, dirt flying with each stroke, water erupting by midday", "삽 우물파기, 서걱서걱, 해 중천에 물 터짐", "머슴", "우물", "Korean webtoon, progress, fast", "scene"),
    ("S036", 126, 129, "A widow running to the well, villagers murmuring, then the widow suddenly beginning to tremble violently", "과부 달려옴, 웅성, 과부 떨기 시작", "과부", "마당", "Korean webtoon, foreboding", "scene"),
    ("S037", 130, 132, "Close-up of trembling hands on a clothesline, blood draining from a face, lips turning blue-purple", "빨랫줄 손 떨림, 핏기 빠짐, 입술 파르스름", "과부", "마당", "Korean webtoon, trembling, dread", "reaction"),
    ("S038", 133, 135, "A man asking why are you like this Manim, a widow answering she doesn't know, just scared, genuine terror in her eyes", "마님 왜 그러세요? 몰라 그냥 무서워", "머슴,과부", "마당", "Korean webtoon, fear, dialogue", "dialogue"),
    ("S039", 136, 139, "Flashback narration: the widow sometimes felt this way, an unknown dread approaching, same feeling the evening her husband died in war", "남편 전사하던 날 저녁에도 그랬다", "과부", "마당", "Korean webtoon, backstory, ominous", "narration"),
    ("S040", 140, 144, "A man leading a widow behind a chicken coop in shadows, smell of chicken droppings, whispering stay here don't make a sound", "닭장 뒤 숨김, 여기 계세요 절대 소리 내지 마시고", "머슴,과부", "닭장", "Korean webtoon, hiding, tense", "scene"),
    ("S041", 145, 148, "A man crouching behind a tree, holding breath, heartbeat pounding in ears, bandits entering the courtyard with torches", "나무 뒤 웅크림, 숨 죽임, 도적 마당 진입, 횃불", "머슴", "마당_밤", "Korean webtoon, stealth, tense", "scene"),
    ("S042a", 149, 152, "Bandits entering courtyard with torches, then suddenly a rooster crowing loudly in alarm", "도적 진입, 횃불, 꼬끼오!", "", "마당_밤", "Korean webtoon, tension, alarm", "scene"),
    ("S042b", 153, 155, "Chicken flapping wings wildly, feathers flying everywhere, bandits turning toward the chicken coop distracted", "닭 퍼드덕, 깃털 흩날림, 도적 고개 닭장쪽으로", "", "마당_밤", "Korean webtoon, chaos, diversion", "scene"),
    ("S043", 156, 159, "A man grabbing a widow's hand, sprinting toward the wall, then tripping and falling hard", "손잡고 뛰기, 담장 쪽, 발 걸림, 쿵!", "머슴,과부", "마당_밤", "Korean webtoon, escape attempt, fall", "scene"),
    ("S044", 160, 162, "A blade piercing through a man's back from behind, darkness flooding in, another death", "칼 등 관통, 어둠이 밀려옴", "머슴", "마당_밤", "Korean webtoon, death, darkness", "scene"),

    # ── 승: 4회차 ──
    ("S045", 163, 168, "Fourth morning, running immediately to the wall, finding the shovel, body remembering on its own", "4번째 아침, 뛰어서 삽, 몸이 기억", "머슴", "마당", "Korean webtoon, routine, muscle memory", "scene"),
    ("S046", 169, 172, "Digging the well with practiced efficiency, water breaking in half a day, using remaining time wisely", "삽 쥐고 우물, 반나절 물 터짐, 남은 시간", "머슴", "우물", "Korean webtoon, efficient, strategic", "scene"),
    ("S047", 173, 178, "Returning to the barn with new eyes, finding a rusty sickle half-buried under straw, holding it up as a weapon", "헛간 다른 눈으로, 녹슨 낫 발견, 싸우는데 쓸 수 있다", "머슴", "헛간", "Korean webtoon, discovery, weapon", "scene"),
    ("S048", 179, 182, "A servant running to the village, gathering young men under a large tree, six of them sitting lazily", "마을로 뛰어감, 청년들 모음, 나무 그늘 아래", "머슴,청년1,청년2,청년3", "마을_나무그늘", "Korean webtoon, gathering, urgent", "scene"),
    ("S049", 183, 186, "A desperate servant pleading that bandits come tonight five of them, a young man narrowing eyes chewing grass", "오늘 밤 도적 옵니다 다섯명, 청년 풀잎 씹으며 쳐다봄", "머슴,청년1", "마을_나무그늘", "Korean webtoon, pleading, skeptical", "dialogue"),
    ("S050", 187, 191, "The servant clasping hands and bowing, saying just believe me please, mockery and laughter erupting from the group", "그냥 압니다 믿어주세요, 두손 모아, 코웃음", "머슴,청년1", "마을_나무그늘", "Korean webtoon, begging, rejected", "dialogue"),
    ("S051", 192, 195, "Young men laughing cruelly, calling him crazy, bewitched by the widow, gone mad in one day, mocking voices", "미쳤나봐! 과부한테 홀렸나? 하루만에 머리 돌았네!", "청년1,청년2,청년3", "마을_나무그늘", "Korean webtoon, mocking, cruel", "dialogue"),
    ("S052", 196, 201, "Laughter fading through trees, nobody believes, the man clenching fists so hard fingernails dig into palms, alone", "아무도 안 믿어, 주먹 꽉, 손톱이 손바닥 파고듦", "머슴", "마을_나무그늘", "Korean webtoon, frustrated, isolated", "reaction"),
    ("S053", 202, 205, "Night falls, a man with a sickle standing before a widow, a bandit leader drawing his sword with contempt", "밤, 낫 들고 과부 앞 막아섬, 두목 칼 뽑기", "머슴,두목", "마당_밤", "Korean webtoon, standoff, brave", "scene"),
    ("S054", 206, 210, "Servant with sickle? Sword crashes down, blocked with a clang, but five is too many, blades from all sides", "머슴 새끼가 낫을? 쨍! 막았지만 다섯명은 너무 많다", "머슴,두목", "마당_밤", "Korean webtoon, combat, outmatched", "scene"),
    ("S055", 211, 215, "Swords coming from all directions, a man falling into darkness again", "사방에서 칼, 어둠이 밀려옴", "머슴", "마당_밤", "Korean webtoon, overwhelmed, death", "scene"),

    # ── 승: 5회차 ──
    ("S056", 216, 222, "Fifth morning: wall, shovel, well, sickle - body moving automatically, all prep done before midday, then swinging the sickle in the yard all day", "5번째, 담장삽우물낫, 마당에서 낫 연습", "머슴", "마당", "Korean webtoon, training montage", "scene"),
    ("S057a", 223, 226, "Swinging a sickle relentlessly in the courtyard, from midday past sunset, endless practice swings", "해 중천부터 해 질때까지 휘두름", "머슴", "마당", "Korean webtoon, training montage", "scene"),
    ("S057b", 227, 229, "Close-up of aching arms, throbbing shoulders, blisters forming on raw palms from endless sickle practice", "팔 저림, 어깨 욱신, 물집", "머슴", "마당", "Korean webtoon, pain, endurance", "reaction"),
    ("S058", 230, 232, "The widow begins trembling again, night falls, bandits arrive", "과부 떨기 시작, 밤, 도적 옴", "과부", "마당", "Korean webtoon, dread cycle", "scene"),
    ("S059", 233, 238, "A bandit leader's sword swings down, but the man's hand moves on its own, instinctively toward the blade's path, precise and sure", "두목 칼 내리침, 손이 저절로 움직임, 정확히 칼날 방향으로", "머슴,두목", "마당_밤", "Korean webtoon, supernatural instinct", "scene"),
    ("S060", 239, 245, "Fingers wrapping around sickle handle with practiced precision, metal meeting metal with a perfect ring, blocked for the first time ever", "낫자루 감싸쥠, 쨍! 막았습니다 처음으로!", "머슴,두목", "마당_밤", "Korean webtoon, breakthrough, triumph", "scene"),
    ("S061", 246, 248, "Close-up of the bandit leader's shocked widening eyes in torchlight, pupils trembling, what is this guy?", "두목 눈 커짐, 뭐야 이놈이?", "두목", "마당_밤", "Korean webtoon, shock, fear", "reaction"),
    ("S062a", 249, 252, "Second sword strike blocked, third too, hands moving with supernatural precision on their own", "2번 3번 막기, 손이 저절로", "머슴,두목", "마당_밤", "Korean webtoon, supernatural combat", "scene"),
    ("S062b", 253, 256, "Twisting body to slash a bandit's arm with the sickle, sword clattering to ground, first enemy defeated, hope igniting", "몸 틀어 팔 베기, 칼 떨어뜨림, 처음으로 한명!", "머슴", "마당_밤", "Korean webtoon, breakthrough, hope", "scene"),
    ("S063", 257, 260, "Internal monologue: I can do this, I can win - but three remaining bandits charge simultaneously", "된다 이길 수 있다, 하지만 나머지 셋 동시 공격", "머슴", "마당_밤", "Korean webtoon, hope crushed", "scene"),
    ("S064a", 261, 263, "Three remaining bandits charging simultaneously, blades piercing side and shoulder, collapsing", "셋 동시 공격, 옆구리+어깨 찔림", "머슴", "마당_밤", "Korean webtoon, overwhelmed", "scene"),
    ("S064b", 264, 266, "Falling, looking at his own palm in moonlight, seeing the lines clearly, then darkness", "달빛에 손금 보임, 어둠", "머슴", "마당_밤", "Korean webtoon, poignant, fade", "reaction"),

    # ── 승: 6회차 ──
    ("S065", 267, 272, "Sixth morning, even more practice, swinging two thousand times, from sunrise to sunset, widow trembles, night comes", "6번째, 더 연습, 이천번, 과부 떨림, 밤", "머슴", "마당", "Korean webtoon, montage, determination", "scene"),
    ("S066", 273, 278, "Blocking the leader's sword once, clang, twice, clang, but the third slash slips past, side torn open", "쨍! 한번 쨍! 두번, 세번째 빗겨감, 옆구리 찢어짐", "머슴,두목", "마당_밤", "Korean webtoon, almost, agonizing", "scene"),
    ("S067", 279, 282, "A widow screaming, grabbing her fallen servant's clothes with trembling hands, gripping tight, not letting go", "과부 비명, 옷자락 잡고 꽉, 놓지 않음", "과부,머슴", "마당_밤", "Korean webtoon, desperate hold", "reaction"),
    ("S068", 283, 286, "The widow's lips moving, mumbling something inaudible, the man cannot hear her words as darkness takes him", "입술 달싹, 뭔가 중얼, 듣지 못함, 어둠", "과부,머슴", "마당_밤", "Korean webtoon, mystery whisper, death", "scene"),

    # ── 전: 7회차 ──
    ("S069", 287, 291, "Seventh morning, time to use brains not brawn, digging a deep pit trap in the courtyard covered with grass", "7번째, 머리 쓰자, 구덩이 함정, 풀로 덮음", "머슴", "마당", "Korean webtoon, strategy, crafty", "scene"),
    ("S070a", 292, 295, "Night falls, bandits walk into the courtyard, first one stepping around the pit, second avoids it too", "밤, 도적 들어옴, 첫번째 피해감, 두번째도", "두목", "마당_밤", "Korean webtoon, failed plan", "scene"),
    ("S070b", 296, 299, "Third bandit also avoids, torchlight clearly showing the different grass color, trap completely useless", "세번째도 피함, 횃불에 풀 색 달라 다 보임", "두목", "마당_밤", "Korean webtoon, ironic failure", "scene"),
    ("S071", 300, 302, "The man backing up and falling into his own pit trap, the widow reaching down with trembling hand asking are you okay", "자기 구덩이에 빠짐, 과부 손 내밈, 괜찮아?", "머슴,과부", "마당_밤", "Korean webtoon, ironic, tender", "dialogue"),
    ("S072", 303, 305, "A widow pulling the man up from the pit, still holding his hand when a blade descends on them both", "끌어올림, 그 손 잡은 채 칼 내려옴", "머슴,과부", "마당_밤", "Korean webtoon, together in death", "scene"),

    # ── 전: 8-9회차 ──
    ("S073", 306, 310, "Montage: fleeing to mountains but it's bandit territory, attacking first but screams bring the rest swarming", "두번 더 죽음, 산 도망 실패, 선제공격 실패", "머슴", "산길", "Korean webtoon, montage, futile", "narration"),

    # ── 전: 10회차 ──
    ("S074", 311, 316, "Tenth morning, setting the barn on fire, dry straw burning fiercely, smoke billowing into the night sky", "10번째, 헛간에 불, 짚 활활, 연기 치솟음", "머슴", "헛간_불", "Korean webtoon, fire, desperate", "scene"),
    ("S075", 317, 320, "Bandits arrive but stop at the fire, waiting outside, their leader calling out come out and die", "도적 불 보고 멈춤, 밖에서 대기, 나오면 죽여", "두목", "마당_밤", "Korean webtoon, trapped, siege", "dialogue"),
    ("S076", 321, 326, "Smoke choking inside, widow coughing, telling servant to go out she's fine, pushing his back, self-sacrifice", "연기 목 졸림, 과부 기침, 밖으로 나가 나는 괜찮아", "머슴,과부", "헛간_불", "Korean webtoon, sacrifice, devotion", "dialogue"),
    ("S077a", 327, 330, "A man grabbing the widow's wrist, saying he can't leave her alone, determined eyes meeting hers", "과부 손목 잡음, 혼자 두고 못 갑니다", "머슴,과부", "헛간_불", "Korean webtoon, devotion, resolve", "dialogue"),
    ("S077b", 331, 333, "Both bursting out of the burning barn together, blades flashing in firelight, falling together, darkness", "함께 뛰쳐나감, 칼 번쩍, 어둠", "머슴,과부", "마당_밤", "Korean webtoon, together, death", "scene"),

    # ── 전: 11-12회차 ──
    ("S078a", 334, 337, "Eleventh attempt: wielding two sickles, one in each hand, arms not coordinating, tangling together", "11번째, 양손 낫, 두팔 따로 놀아 엉킴", "머슴", "마당_밤", "Korean webtoon, failed experiment", "scene"),
    ("S078b", 338, 340, "The tangled sickles leave an opening, a sword thrust coming through the gap, brute force doesn't work", "엉킨 틈에 칼 들어옴, 힘으로 안됨", "머슴", "마당_밤", "Korean webtoon, lesson learned", "scene"),
    ("S079a", 341, 344, "Twelfth: climbing onto the roof, looking down at bandits, throwing a stone hitting a shoulder, second stone missing", "12번째, 지붕, 돌 던지기, 어깨 맞힘, 두번째 빗나감", "머슴", "마당_밤", "Korean webtoon, height advantage", "scene"),
    ("S079b", 345, 348, "Driven to the roof edge, tiles sliding under feet, falling backward, back hitting the ground first, heights don't work either", "지붕 끝, 기와 미끄러짐, 추락, 등 먼저 착지", "머슴", "마당_밤", "Korean webtoon, fall, another lesson", "scene"),

    # ── 전: 13회차 ──
    ("S080", 349, 352, "Thirteenth: kneeling before the village chief's door, begging for help tonight, bandits are coming", "13번째, 이장 앞 무릎, 도적 옵니다 도와주십시오", "머슴,이장", "마을_나무그늘", "Korean webtoon, begging, desperate", "dialogue"),
    ("S081", 353, 355, "The chief peering through a door crack, calling him crazy, door slamming shut, nobody believes", "미친놈 소리, 문 닫힘, 아무도 안 믿어", "이장", "마을_나무그늘", "Korean webtoon, rejection, cold", "dialogue"),
    ("S082", 356, 359, "That night too a blade came, waking to a rooster, the man's hands trembling this time", "그날 밤도 칼, 닭 울음, 머슴 손 떨림", "머슴", "헛간", "Korean webtoon, breaking, tremor", "reaction"),

    # ── 전: 14회차 ──
    ("S083", 360, 362, "Fourteenth: carrying the widow on his back to a neighbor's house, asking for just one night's shelter", "14번째, 과부 업고 이웃집, 하룻밤만 재워주십시오", "머슴,과부", "이웃집", "Korean webtoon, carrying, hopeful", "scene"),
    ("S084a", 363, 365, "A neighbor's child smiling at the widow, the widow smiling back genuinely for the first time in ages", "아이 웃음, 과부도 웃음, 오랜만에", "과부", "이웃집", "Korean webtoon, warmth, innocent", "scene"),
    ("S084b", 366, 368, "Sharing a warm simple dinner, oil lamp glow, the child falling asleep peacefully on the widow's lap", "저녁밥 나눔, 따뜻한 밥, 아이 무릎에 잠듦", "과부", "이웃집", "Korean webtoon, doomed peace", "scene"),
    ("S085", 369, 374, "Night comes, bandits followed, neighbors all dead, the smiling child lying still with closed eyes", "밤, 도적 따라옴, 이웃집 죽음, 아이 죽어있음 웃던 얼굴", "머슴", "이웃집", "Korean webtoon, devastating, guilt", "scene"),
    ("S086", 375, 378, "The man weeping for the first time, punching dirt floor with bleeding fists, I killed these people", "내가 이 사람들을 죽인 거야, 처음 울음, 주먹으로 흙바닥", "머슴", "이웃집", "Korean webtoon, grief, raw emotion", "reaction"),
    ("S087", 379, 381, "This wasn't his fight anymore, it was a fight that killed others, darkness comes again", "자기 싸움 아님, 다른 사람까지 죽이는 싸움, 어둠", "머슴", "이웃집", "Korean webtoon, guilt, darkness", "reaction"),

    # ── 전: 15-17회차 ──
    ("S088", 382, 386, "Three more deaths montage: hiding in the well and drowning, climbing a tree hit by arrow, hiding in thorns tracked by blood", "세번 더 죽음, 우물 빠짐, 나무 화살, 가시덤불 피냄새", "머슴", "산길", "Korean webtoon, montage, hopeless", "narration"),
    ("S089", 387, 391, "Nowhere to hide, sixteenth night the widow steps backward from the man, her eyes changed, fear of him now", "어디 숨어도 소용없음, 16번째 밤 과부 한발 뒤로, 눈이 달라짐", "과부,머슴", "마당_밤", "Korean webtoon, alienation, heartbreak", "scene"),

    # ── 전: 18회차 ──
    ("S090", 392, 394, "Eighteenth morning, the man telling the widow he'll go to the government office for help", "18번째, 관아에 가서 도움을 청하겠습니다", "머슴,과부", "마당", "Korean webtoon, new plan, parting", "dialogue"),
    ("S091", 395, 397, "The widow grabbing his sleeve desperately, saying her husband left on a day like this too and never came back", "과부 소매 잡음, 남편 떠난 날에도 이랬어 돌아오지 않았지", "과부,머슴", "마당", "Korean webtoon, fear of loss, tears", "dialogue"),
    ("S092", 398, 402, "The man holding her hand promising to return definitely, the widow letting go and nodding, tears falling", "돌아오겠습니다 반드시, 손 놓고 끄덕임", "머슴,과부", "마당", "Korean webtoon, promise, bittersweet", "dialogue"),
    ("S093a", 403, 406, "Crossing mountains, fording streams, walking all night, legs about to burst from exhaustion", "산 넘고 물 건너 밤새 걸음, 종아리 터질것", "머슴", "산길", "Korean webtoon, journey, exhaustion", "narration"),
    ("S093b", 407, 409, "Moon setting, stars fading, dawn rising over distant mountains, still walking, couldn't reach the office, too far", "달 지고 별 지고 해 올라옴, 관아 못감 너무 멀어", "머슴", "산길", "Korean webtoon, endless path, failure", "narration"),
    ("S094", 410, 413, "Couldn't reach the office, too far, returning at dawn, finding the widow dead, hanged", "관아 못감 너무 멀어, 새벽 돌아옴, 과부 죽어있음, 목맴", "머슴", "방_안", "Korean webtoon, devastating, failure", "scene"),
    ("S095", 414, 417, "The man holding the widow's cold hand, something clutched in it, a small pouch, unable to let go until dawn", "차가운 손, 작은 주머니, 놓지 못함, 날 밝을 때까지", "머슴,과부", "방_안", "Korean webtoon, grief, pouch mystery", "scene"),

    # ── 전: 19회차 ──
    ("S096", 418, 422, "Nineteenth: taking the widow together toward the government office, bandits waiting at the road with swords drawn", "19번째, 함께 관아로, 도적 길목에서 대기, 칼", "머슴,과부,두목", "산길", "Korean webtoon, ambush, confrontation", "scene"),
    ("S097", 423, 426, "The widow stepping in front of the man, spreading her arms wide, voice trembling: leave this person, take me", "과부 앞에 섬, 팔 벌림, 이 사람은 놔둬 나를 데려가", "과부,머슴", "산길", "Korean webtoon, sacrifice, heroic", "dialogue"),
    ("S098", 427, 430, "Voice trembling but not retreating, the bandit laughing, blade descending", "목소리 떨리지만 물러서지 않음, 도적 웃음, 칼", "과부,두목", "산길", "Korean webtoon, brave, futile", "scene"),
    ("S099a", 431, 433, "The man falling behind the widow's silhouette, seeing her spread arms from behind as vision blurs", "과부 뒤에서 쓰러짐, 팔 벌린 뒷모습", "머슴,과부", "산길", "Korean webtoon, falling, poignant", "scene"),
    ("S099b", 434, 436, "Clenching fist white-knuckled while falling, bones standing out, eyes slowly closing, darkness", "주먹 하얗게 쥠, 뼈마디, 눈 감김", "머슴", "산길", "Korean webtoon, vow, fade", "reaction"),

    # ── 전: 20회차 ──
    ("S100", 437, 441, "Twentieth morning, kneeling before bandits, forehead pressing into dirt, begging for mercy, dirt smell filling nostrils", "20번째, 도적 앞 무릎, 이마 흙바닥, 살려달라", "머슴,두목", "마당_밤", "Korean webtoon, humiliation, despair", "scene"),
    ("S101", 442, 445, "The bandit laughing, the man feeling cold ground on his knees, a blade coming down", "도적 웃음, 무릎 차가움, 칼 내려옴", "머슴,두목", "마당_밤", "Korean webtoon, cruelty, death", "scene"),

    # ── 전: 21회차 ──
    ("S102", 446, 450, "Twenty-first morning, died twenty times, tried everything, failed everything, one more time, grabbing widow's hand", "21번째, 스무번 죽음, 다 안됨, 한번만 더, 과부 손잡음", "머슴,과부", "방_안", "Korean webtoon, last resort, desperate", "scene"),
    ("S103a", 451, 454, "Running to the room, slamming the door shut, locking it, pushing the heavy wardrobe against it as a barricade", "방으로 뛰어 문 잠금, 장롱 밀어 막음", "머슴,과부", "방_안", "Korean webtoon, barricade, urgent", "scene"),
    ("S103b", 455, 457, "Both trembling in pitch darkness, only each other's ragged breathing audible, waiting in terror", "둘 다 떨림, 어둠 속 숨소리만", "머슴,과부", "방_안", "Korean webtoon, terror, intimacy", "scene"),
    ("S104", 458, 462, "Footsteps outside, BANG BANG on the door, wardrobe shaking, BANG, door shattering inward", "밖에서 발소리, 쾅쾅, 장롱 흔들림, 문 부서짐", "", "방_안", "Korean webtoon, horror, breaking in", "scene"),
    ("S105", 463, 468, "Blade gleaming, a man dying while holding a woman, arms weakening but never releasing her", "칼 번쩍, 과부 감싸 안은 채 죽어감, 놓지 않음", "머슴,과부", "방_안", "Korean webtoon, final embrace", "scene"),

    # ── 결: 22회차 아침 ──
    ("S106", 469, 472, "Twenty-second morning, lying on barn floor staring at ceiling, not wanting to move, twenty-one deaths", "22번째, 헛간 바닥 누워, 움직이기 싫음, 21번 죽음", "머슴", "헛간", "Korean webtoon, defeated, rock bottom", "scene"),
    ("S107", 473, 480, "Listing everything tried: fought, hid, ran, burned, begged, trapped, pleaded, all failed", "싸우고 숨기고 도망치고 불지르고 빌고, 다 안됨", "머슴", "헛간", "Korean webtoon, litany of failure", "narration"),
    ("S108", 481, 485, "Ceiling beams visible, cobweb swaying gently in breeze, eyes closing, twenty-one nights flashing through memory", "서까래 거미줄 흔들림, 눈 감음, 21번의 밤 떠오름", "머슴", "헛간", "Korean webtoon, quiet despair, memory", "reaction"),
    ("S109", 486, 491, "Every time dug the well, every time water came, every time bandits came, every time, every time, every time", "매번 우물 팠다, 매번 물 터졌다, 매번 도적 왔다, 매번매번매번", "머슴", "헛간", "Korean webtoon, pattern recognition, building", "reaction"),

    # ── 결: 깨달음 ──
    ("S110", 492, 494, "Eyes snapping open, sitting bolt upright, WAIT, heart pounding, a sudden revelation", "눈 뜸! 잠깐! 벌떡 일어남", "머슴", "헛간", "Korean webtoon, eureka moment", "reaction"),
    ("S111", 495, 498, "Every time I dug and never once didn't dig, what if I don't dig the well, excitement and hope in voice", "매번 팠어 안판적 없어, 안 파면 어떻게 될까? 심장 뜀", "머슴", "헛간", "Korean webtoon, breakthrough, hope", "reaction"),

    # ── 결: 새로운 선택 ──
    ("S112", 499, 501, "The widow at the barn entrance with the same line, the man answering yes Manim with a calm new resolve", "과부 같은 말, 예 마님, 차분한 결의", "머슴,과부", "헛간", "Korean webtoon, new determination", "dialogue"),
    ("S113", 502, 507, "Walking into the courtyard, seeing the dry well, hands itching to grab the shovel, but holding back, resisting 21 loops of habit", "마당, 마른 우물, 손 근질, 삽 들고 싶지만 참음", "머슴", "마당", "Korean webtoon, restraint, new path", "scene"),
    ("S114", 508, 512, "Saying he'll fetch water from afar, the widow nodding, carrying a heavy water jug over mountain trails", "물 길러 다녀오겠습니다, 과부 끄덕, 물동이 지고 산 넘기", "머슴", "산길", "Korean webtoon, new routine, endurance", "scene"),
    ("S115", 513, 519, "Climbing endless slopes, legs trembling, sweat pouring, throat burning, stumbling on roots, barely standing", "오르막 끝 없음, 종아리 터질것, 땀 등 타고, 목 탐, 비틀거림", "머슴", "산길", "Korean webtoon, exhaustion, perseverance", "scene"),
    ("S116", 520, 524, "Arriving at a mountain spring, filling water containers to the brim, crushing weight on shoulders from the strap", "샘터 도착, 물 가득 채움, 천근만근, 어깨끈 파고듦", "머슴", "샘터", "Korean webtoon, labor, heavy burden", "scene"),
    ("S117", 525, 528, "Something glinting at the bottom of the spring underwater, reaching toward it but stopping, water is more urgent now", "바닥에 뭔가 반짝, 손 뻗다 말음, 지금은 물이 급함", "머슴", "샘터", "Korean webtoon, mystery glint, discipline", "scene"),
    ("S118", 529, 534, "Returning home, shoulders cracking, eating dinner, sun setting, night falling peacefully", "돌아옴, 어깨 뚝뚝, 저녁, 해 짐, 밤", "머슴", "마당", "Korean webtoon, peaceful evening, tension", "scene"),

    # ── 결: 적막의 밤 ──
    ("S119", 535, 539, "Gripping a sickle in darkness, waiting, one hour no footsteps, two hours silence, too quiet", "낫 쥐고 대기, 한시진 없음, 두시진 조용, 너무 조용해", "머슴", "적막의_밤", "Korean webtoon, suspense, waiting", "scene"),
    ("S120", 540, 545, "Thought he survived but something is wrong, wind has stopped, leaves frozen, shadows stuck to the ground", "살았나 싶지만 이상해, 바람 멈춤, 나뭇잎 안 흔들림, 그림자 안 움직임", "머슴", "적막의_밤", "Korean webtoon, supernatural stillness", "scene"),
    ("S121", 546, 549, "Insect sounds abruptly cutting off, not a single cricket, the world holding its breath, silence worse than bandits", "벌레소리 끊김, 세상이 숨 멈춤, 적막이 도적보다 기괴", "머슴", "적막의_밤", "Korean webtoon, eerie void, dread", "scene"),
    ("S122", 550, 553, "Unable to release the sickle, no action feels stranger than any action, twenty nights always had sound", "낫 못 놓음, 아무일 안일어나는게 이상, 스무밤엔 소리라도 있었다", "머슴", "적막의_밤", "Korean webtoon, internal tension", "reaction"),
    ("S123", 554, 557, "Three hours passed, moon crossing the zenith, stars twinkling, no bandits came", "세시진, 달 중천, 별 총총, 도적 안 옴", "", "적막의_밤", "Korean webtoon, beautiful night, relief", "scene"),
    ("S124", 558, 561, "A smile breaking on the man's face, whispering done it, it was the well, the well was the signal all along", "됐다! 우물이야, 우물이 신호였어!", "머슴", "적막의_밤", "Korean webtoon, triumph, eureka", "reaction"),

    # ── 결: 진실 회수 ──
    ("S125", 562, 566, "Died twenty-one times to figure it out: dig the well bandits come, don't dig they don't, the widow knew in her body", "21번 죽어서 알아냄, 우물 파면 도적, 과부는 몸으로 알고 있었다", "머슴,과부", "마당", "Korean webtoon, revelation, connecting dots", "narration"),
    ("S126a", 567, 569, "Flashback: the widow trembling the evening her husband died in war, same unexplained dread as when water erupted", "남편 전사 날 떨림, 물 솟구치자 같은 떨림", "과부", "마당", "Korean webtoon, flashback, parallel", "narration"),
    ("S126b", 570, 573, "The widow's eyes staring past the water into darkness, she didn't know why, just scared, but her body knew danger was coming", "왜인지 몰랐지만 무서웠다, 몸은 알고 있었다, 나쁜 일이 온다", "과부", "마당", "Korean webtoon, mystery solved, body knows", "narration"),
    ("S127", 574, 577, "Survived, first time making it through the night, reaching into his shirt remembering the pouch from the eighteenth night", "처음으로 밤 넘김, 18번째 밤 주머니 떠올림", "머슴", "마당", "Korean webtoon, survival, lingering memory", "scene"),
    ("S128", 578, 580, "Couldn't know what was in the pouch since loops reset everything, but the phantom weight remains in his fingertips", "주머니 속 뭔지 모름, 회귀하면 돌아가니까, 하지만 무게는 남아있음", "머슴", "마당", "Korean webtoon, bittersweet, mystery", "reaction"),

    # ── 결: 딜레마 ──
    ("S129", 581, 585, "But next morning no water, can't cook, can't wash, the widow standing with an empty water bucket again", "하지만 다음날 물 없음, 밥 못짓고 빨래 못하고, 과부 빈 물동이", "과부", "마당", "Korean webtoon, dilemma revealed", "scene"),
    ("S130", 586, 591, "Carrying water over mountains again, two-hour round trip, straps cutting into shoulders, legs shaking, unsustainable", "다시 물길러, 왕복 두시진, 어깨끈 파고듦, 다리 후들", "머슴", "산길", "Korean webtoon, unsustainable, dilemma", "scene"),
    ("S131", 592, 594, "Narration: dig the well and bandits come, don't dig and the widow survives but can't live without water", "우물 파면 도적, 안 파면 살지만 물 없이 살 수 없다", "", "마당", "Korean webtoon, impossible choice", "narration"),
    ("S132", 595, 598, "Walking past young men whispering under a tree about Mandeuk, another group whispering about bandit connections", "만득이가 그랬다며? 도적패랑 엮였대, 쉿 조용히", "청년1,청년2,청년3", "마을_나무그늘", "Korean webtoon, clue, whispers", "scene"),
    ("S133", 599, 604, "The man stopping in his tracks, overhearing whispers about someone connected to the bandits, eyes narrowing", "발걸음 멈춤, 도적패 엮인 자, 쉿 조용히 해", "머슴,청년1", "마을_나무그늘", "Korean webtoon, new lead, hope", "scene"),
    ("S134", 605, 610, "Internal realization: dig well bandits come, don't dig can't survive, but if he finds whoever is connected to the bandits there might be a way", "우물 파면 도적, 안 파면 못 삶, 하지만 그놈을 찾으면 방법이 있을지도", "머슴", "마을_나무그늘", "Korean webtoon, hope, cliffhanger", "reaction"),

    # ── 결: 엔딩 ──
    ("S135", 611, 615, "Narrator wrapping up: the servant died twenty-one times but never gave up, finally learning that the well summons bandits", "오늘 이야기는 여기까지, 21번 죽었지만 포기 안함, 우물이 신호", "", "마당", "Korean webtoon, summary, warm", "narration"),
    ("S136a", 616, 617, "But without the well there's no water, without water they can't survive, an impossible dilemma", "우물 안파면 물 없고, 물 없으면 못 삶", "", "마당", "Korean webtoon, dilemma, tension", "narration"),
    ("S136b", 618, 618, "Three burning questions posed: who is connected to bandits, why does the widow tremble, why do his hands move on their own, see you next time", "도적패 엮인 자 누구? 과부 왜 떨어? 손은 왜 저절로?", "머슴,과부", "마당", "Korean webtoon, hooks, mystery", "narration"),
    ("S137", 619, 621, "See you in the next video, please like and subscribe, have a wonderful day, warm ending screen", "다음 영상에서, 좋아요 구독, 행복한 하루", "", "마당", "Korean webtoon, ending, warm", "narration"),
]


def main():
    srt = parse_srt(SRT_PATH)
    srt_map = {e["index"]: e for e in srt}

    rows = []
    for parent, s_start, s_end, prompt, prompt_ko, characters, scene_tag, style_tag, shot_type in SCENES:
        start_entry = srt_map.get(s_start)
        end_entry = srt_map.get(s_end)
        if not start_entry or not end_entry:
            print(f"WARNING: SRT {s_start}-{s_end} not found")
            continue

        start_sec = start_entry["start_sec"]
        end_sec = end_entry["end_sec"]
        duration = round(end_sec - start_sec, 3)

        subtitles = []
        for idx in range(s_start, s_end + 1):
            if idx in srt_map:
                subtitles.append(srt_map[idx]["text"])
        subtitle = " ".join(subtitles)
        if len(subtitle) > 100:
            subtitle = subtitle[:97] + "..."

        rows.append({
            "prompt": prompt,
            "prompt_ko": prompt_ko,
            "subtitle": subtitle,
            "characters": characters,
            "scene_tag": scene_tag,
            "style_tag": style_tag,
            "shot_type": shot_type,
            "duration": duration,
            "start_time": round(start_sec, 3),
            "end_time": round(end_sec, 3),
            "parent_scene": parent,
        })

    # 검증
    gaps = []
    over15 = []
    for i, r in enumerate(rows):
        if r["duration"] > MAX_DURATION:
            over15.append((i + 1, r["parent_scene"], round(r["duration"], 1)))
        if i > 0:
            gap = r["start_time"] - rows[i - 1]["end_time"]
            if abs(gap) > 0.5:
                gaps.append((i, i + 1, round(gap, 2)))

    # CSV 출력
    fieldnames = ["prompt", "prompt_ko", "subtitle", "characters", "scene_tag",
                   "style_tag", "shot_type", "duration", "start_time", "end_time", "parent_scene"]
    with open(OUTPUT_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, quoting=csv.QUOTE_ALL)
        writer.writeheader()
        writer.writerows(rows)

    print(f"=== scenes.csv 생성 완료 ===")
    print(f"총 {len(rows)}개 씬")
    print(f"시작: {rows[0]['start_time']}초")
    print(f"끝: {rows[-1]['end_time']}초")
    total_dur = sum(r["duration"] for r in rows)
    print(f"씬 합산: {total_dur:.1f}초 ({total_dur/60:.1f}분)")

    if gaps:
        print(f"\n⚠️ 갭 {len(gaps)}개:")
        for a, b, g in gaps:
            print(f"  씬{a}→{b}: {g}초")
    else:
        print("\n✅ 갭 없음")

    if over15:
        print(f"\n⚠️ 15초 초과 {len(over15)}개:")
        for idx, pid, dur in over15:
            print(f"  씬{idx} ({pid}): {dur}초")
    else:
        print("\n✅ 15초 초과 없음")

    audio_dur = 1448.0
    diff = abs(rows[-1]["end_time"] - audio_dur)
    print(f"{'✅' if diff < 5 else '❌'} 커버리지 (차이 {diff:.1f}초)")


if __name__ == "__main__":
    main()
