# -*- coding: utf-8 -*-
"""웰빙내과 수액실 — 기본 자료 (프로그램 · 등급 · 조제 · 보충제 · 확인 항목)

원내 조제표(MC·PNT·색 프로그램)를 바탕으로 짠 초안이다.
가격·구성은 화면 「설정」에서 원장님이 바꿀 수 있고, 바꾼 값은 DB에 따로 저장된다.
이 파일은 '처음 값'만 가진다.

제품 성분은 식약처 의약품안전나라 허가정보로 확인(2026-11-17).
"""
import copy

TIER_NAME = {"basic": "기본", "plus": "플러스", "premium": "프리미엄"}
TIERS = ["basic", "plus", "premium"]

SBP_NO_MG = 100          # 원내 규칙: 수축기 100 이하면 메가네슘 섞지 않기
PACKAGE_DISCOUNT = 10    # 코스(회차권) 기본 할인율 %, 설정에서 바꿈

# ───────────────────────── 성분 ─────────────────────────
# flags: 오늘 확인 결과로 빼는 묶음 이름
# add_ml: 섞을 때 늘어나는 양(주입 속도 계산용, 큰 것만)
ING = {
    # 바탕액
    "NS110": {"name": "N/S 110mL", "unit": "", "ml": 110, "base": True, "generic": "생리식염수"},
    "NS250": {"name": "N/S 250mL", "unit": "", "ml": 250, "base": True, "generic": "생리식염수"},
    "NS500": {"name": "N/S 500mL", "unit": "", "ml": 500, "base": True, "generic": "생리식염수"},
    "HS500": {"name": "하트만 500mL", "unit": "", "ml": 500, "base": True, "generic": "하트만액(젖산링거)"},
    "DW250": {"name": "D/W 250mL", "unit": "", "ml": 250, "base": True, "dextrose": True,
              "swap_to": "NS250", "generic": "5% 포도당"},
    # 섞는 약
    "megagreen": {"name": "메가그린", "unit": "V", "generic": "비타민C 10g/20mL", "add_ml": 20,
                  "flags": ["vitc_high"],
                  "notice": "비타민C: 팔이 뻐근하면 속도 줄이기 · 10시간 동안 손끝 혈당이 높게 나올 수 있음"},
    "meganesium": {"name": "메가네슘", "unit": "cc", "generic": "황산마그네슘 10% (5cc=0.5g)",
                   "flags": ["mg"], "notice": "마그네슘: 몸이 화끈거릴 수 있음 → 천천히"},
    "vitao": {"name": "비타오", "unit": "A", "generic": "D-판테놀(B5) 500mg/2mL",
              "mix": "직접 정맥주사 금지, 꼭 희석"},
    "vita6": {"name": "비타식스", "unit": "A", "generic": "피리독신(B6) 50mg/1mL"},
    "vita12": {"name": "비타일이", "unit": "A", "generic": "히드록소코발라민(B12) 5mg/2mL"},
    "fursul": {"name": "푸르설타민", "unit": "A", "generic": "푸르설티아민(B1) 50mg/10mL", "add_ml": 10,
               "flags": ["b1"], "notice": "마늘주사: 입에서 마늘 냄새 · 혈관통 → 천천히"},
    "hisi": {"name": "히시파겐C", "unit": "A", "generic": "글리시리진·글리신·시스테인(감초) 20mL",
             "add_ml": 20, "flags": ["licorice"],
             "mix": "2026-08 허가 취하 → 재고 소진 뒤 글리파겐주·지씨웰빙글리메타주로 바꾸기"},
    "laennec": {"name": "라이넥", "unit": "A", "generic": "자하거가수분해물(태반) 2mL",
                "flags": ["placenta"], "notice": "태반주사: 맞은 뒤 1년 동안 헌혈 제한",
                "mix": "허가 용법은 피하·근육 — 원장님 지시대로"},
    "tathion600": {"name": "타치온 600mg", "unit": "V", "generic": "글루타치온 600mg",
                   "flags": ["gsh"], "mix": "녹인 뒤 바로 섞기"},
    "tathion1200": {"name": "타치온 1200mg", "unit": "V", "generic": "글루타치온 1200mg",
                    "flags": ["gsh"], "mix": "녹인 뒤 바로 섞기"},
    "thioctic": {"name": "치옥트산", "unit": "A", "generic": "알파리포산 25mg/5mL",
                 "flags": ["ala"], "mix": "빛 가리기(호일)",
                 "notice": "알파리포산: 당뇨약 드시면 저혈당 주의"},
    "zinc": {"name": "지씨징크", "unit": "A", "generic": "황산아연(아연)", "flags": ["zinc"]},
    "vibon": {"name": "비본", "unit": "A", "generic": "탄산수소나트륨 8.4% (산도 맞춤·혈관통 완화)",
              "flags": ["bicarb"]},
    "drlamin": {"name": "닥터라민", "unit": "병", "generic": "아미노산 수액", "flags": ["aa"]},
    "dipeptiven": {"name": "디펩티벤", "unit": "병", "generic": "알라닐-글루타민 20% 50mL", "add_ml": 50,
                   "flags": ["aa", "dipep"], "min_carrier_ratio": 5, "max_ml_per_kg": 2.5,
                   "mix": "바탕액을 디펩티벤의 5배 이상(50mL → 250mL 이상)",
                   "notice": "디펩티벤: 천천히(1시간 이상)"},
}

FLAG_LABEL = {
    "mg": "마그네슘", "vitc_high": "고용량 비타민C", "b1": "푸르설티아민", "licorice": "감초(히시파겐)",
    "placenta": "태반(라이넥)", "gsh": "글루타치온", "ala": "알파리포산", "zinc": "아연",
    "bicarb": "비본", "aa": "아미노산", "dipep": "디펩티벤",
}

# ───────────────────────── 오늘 확인 항목 (빠른 단추) ─────────────────────────
CHECKS = [
    {"key": "preg", "label": "임신·수유 가능", "stop": "원장님 확인 전 진행하지 않음"},
    {"key": "allergy", "label": "주사·수액 뒤 두드러기·쇼크 경험", "stop": "원장님 확인 전 진행하지 않음"},
    {"key": "renal", "label": "콩팥 기능 저하·투석", "remove": ["mg", "vitc_high", "dipep", "aa"],
     "warn": "원장님 확인"},
    {"key": "g6pd", "label": "G6PD 결핍·콩팥돌·통풍", "remove": ["vitc_high"]},
    {"key": "heart", "label": "심부전·심한 부종", "warn": "총량 줄이기(바탕액 110mL)", "slow": True},
    {"key": "dm", "label": "당뇨", "swap_dw": True,
     "warn": "포도당 → 식염수 · 비타민C 뒤 손끝 혈당 높게 나옴 · 알파리포산은 저혈당 주의"},
    {"key": "mgx", "label": "방실차단·근무력증·디곡신", "remove": ["mg"]},
    {"key": "bph", "label": "혈압 조절 안 됨·저칼륨", "remove": ["licorice"]},
    {"key": "liver", "label": "심한 간질환(간경변 등)", "remove": ["dipep", "aa"], "warn": "원장님 확인"},
    {"key": "b1x", "label": "마늘주사 뒤 불편 경험", "remove": ["b1"]},
    {"key": "donate", "label": "1년 안 헌혈 계획", "remove": ["placenta"]},
    {"key": "first", "label": "처음 맞음·75세 이상", "slow": True},
]


def _bag(base, *add):
    return {"base": base, "add": [list(a) for a in add]}


# 자주 쓰는 비타민 묶음 (원내 MC 기본형)
def _vit(c=1, mg=5, b5=1, b6=0, b12=1):
    out = []
    if c:
        out.append(("megagreen", c))
    if mg:
        out.append(("meganesium", mg))
    if b5:
        out.append(("vitao", b5))
    if b6:
        out.append(("vita6", b6))
    if b12:
        out.append(("vita12", b12))
    return out


# ───────────────────────── 프로그램 ─────────────────────────
# course_options: 첫 번째가 기본값. total=회수, per_week=주당 회수
# price: 1회 값(원). 장염 3단계 가격은 원장님 확정(11-17 홍보영상), 나머지는 다른 의원 조사로 잡은 제안가.
PROGRAMS = {
    "gi": {
        "name": "장염", "short": "장염", "color": "#3B8C7A", "icon": "💧",
        "for": "설사·구토로 지치고 물을 못 마실 때",
        "course_options": [{"total": 1, "per_week": 0, "label": "1회"}],
        "price_fixed": True,
        "tiers": {
            "basic": {"price": 35000, "min": 60, "from": "원내 MC3",
                      "point": "수분·전해질 + 비타민",
                      "bags": [_bag("NS110", *_vit(b6=0)), _bag("DW250")]},
            "plus": {"price": 60000, "min": 90, "from": "MC3 + 디펩티벤",
                     "point": "+ 장 점막 회복(글루타민) · 구역 완화 B6",
                     "bags": [_bag("NS110", *_vit(b6=1)), _bag("NS250", ("dipeptiven", 1))]},
            "premium": {"price": 90000, "min": 120, "from": "MC3 + 디펩티벤 + NT2",
                        "point": "+ 아미노산·B1 영양 보충(못 먹은 날)",
                        "bags": [_bag("NS110", *_vit(c=0, b6=1)), _bag("NS250", ("dipeptiven", 1)),
                                 _bag("DW250", ("megagreen", 1), ("drlamin", 1), ("fursul", 1))]},
        },
        "meds": ["구토 멎는 주사", "장 경련 주사", "지사제", "정장제"],
        "oral": {
            "with": [{"sup": "ors", "weeks": 0.5, "why": "집에서 수분·전해질 이어가기"}],
            "after": [{"sup": "probiotic_d", "weeks": 2, "why": "장염 뒤 장내 균 회복"}],
        },
        "score": {"key": "gi", "label": "설사·복통 (0~10)", "max": 10},
        "followup_weeks": [],
        "aftercare": ["오늘은 미음·죽 등 부드러운 음식부터", "물·이온음료는 조금씩 자주",
                      "우유·기름진 음식·술은 2~3일 피하기",
                      "열이 나거나 피가 섞인 변, 하루 넘게 계속 토하면 바로 연락"],
    },
    "cold": {
        "name": "감기몸살", "short": "감기몸살", "color": "#4A7FB5", "icon": "🤒",
        "for": "몸살·근육통으로 처질 때",
        "course_options": [{"total": 1, "per_week": 0, "label": "1회"}],
        "tiers": {
            "basic": {"price": 40000, "min": 40, "from": "원내 MC1",
                      "point": "비타민C·B군·마그네슘",
                      "bags": [_bag("NS250", *_vit(b6=1))]},
            "plus": {"price": 60000, "min": 40, "from": "원내 MC4",
                     "point": "+ 감초(히시파겐)",
                     "bags": [_bag("NS250", *_vit(b6=1), ("hisi", 1))]},
            "premium": {"price": 90000, "min": 60, "from": "MC4 + BLUE",
                        "point": "+ 마늘(B1)·태반 — 몸살·근육통 집중",
                        "bags": [_bag("NS250", *_vit(b6=1), ("hisi", 1), ("fursul", 1),
                                      ("laennec", 1), ("vibon", 1))]},
        },
        "meds": ["해열·진통 주사", "감기약 처방"],
        "oral": {
            "after": [{"sup": "vitc", "weeks": 2, "why": "회복기 비타민C"},
                      {"sup": "zinc", "weeks": 2, "why": "회복기 아연"}],
        },
        "score": {"key": "cold", "label": "몸살·피로 (0~10)", "max": 10},
        "followup_weeks": [],
        "aftercare": ["오늘은 푹 쉬고 물을 충분히", "땀 흘리는 운동·사우나·술은 오늘 피하기",
                      "열이 3일 넘거나 숨이 차면 다시 진료"],
    },
    "fatigue": {
        "name": "만성피로", "short": "피로", "color": "#D9822B", "icon": "🔋",
        "for": "쉬어도 계속 피곤할 때 (빈혈·갑상선 등 원인 확인과 함께)",
        "course_options": [{"total": 4, "per_week": 2, "label": "2주 4회"},
                           {"total": 8, "per_week": 2, "label": "4주 8회"}],
        "tiers": {
            "basic": {"price": 50000, "min": 40, "from": "원내 MC2",
                      "point": "비타민C·B군·마그네슘",
                      "bags": [_bag("NS250", *_vit(b6=2))]},
            "plus": {"price": 70000, "min": 50, "from": "MC2 + 마늘(MC7)",
                     "point": "+ 마늘주사(B1) — 에너지 대사",
                     "bags": [_bag("NS250", *_vit(b6=2), ("fursul", 1), ("vibon", 1))]},
            "premium": {"price": 100000, "min": 70, "from": "MC2 + 마늘 + 태반 + 백옥",
                        "point": "+ 태반·글루타치온",
                        "bags": [_bag("NS250", *_vit(b6=2), ("fursul", 1), ("laennec", 2), ("vibon", 1)),
                                 _bag("NS110", ("tathion600", 1))]},
        },
        "meds": [],
        "oral": {
            "with": [{"sup": "bcomplex", "weeks": 2, "why": "수액 사이 날 B군 유지"},
                     {"sup": "mg_oral", "weeks": 2, "why": "근육 긴장·수면"}],
            "after": [{"sup": "bcomplex", "weeks": 8, "why": "피로 관리 유지"},
                      {"sup": "mg_oral", "weeks": 8, "why": "근육 긴장·수면"},
                      {"sup": "vitd", "weeks": 12, "why": "비타민D 낮을 때"}],
        },
        "score": {"key": "fatigue", "label": "피로 (0~10)", "max": 10},
        "followup_weeks": [0, 2, 4, 12],
        "aftercare": ["잠자는 시각을 일정하게", "카페인은 오후 2시 전까지",
                      "다음 회차는 3~4일 뒤", "가벼운 걷기 20분부터"],
    },
    "aging": {
        "name": "항노화", "short": "항노화", "color": "#195C3B", "icon": "🌿",
        "for": "활력·컨디션 관리, 정기 관리를 원할 때",
        "course_options": [{"total": 4, "per_week": 1, "label": "4주 4회 (주 1회)"},
                           {"total": 8, "per_week": 2, "label": "4주 8회 (주 2회)"}],
        "tiers": {
            "basic": {"price": 60000, "min": 40, "from": "원내 MC6",
                      "point": "비타민 + 태반",
                      "bags": [_bag("NS250", *_vit(b6=2), ("laennec", 2))]},
            "plus": {"price": 90000, "min": 60, "from": "MC6 + 백옥",
                     "point": "+ 글루타치온 600",
                     "bags": [_bag("NS250", *_vit(b6=2), ("laennec", 2)),
                              _bag("NS110", ("tathion600", 1))]},
            "premium": {"price": 130000, "min": 70, "from": "PINK + 신데렐라 + 백옥",
                        "point": "+ 알파리포산 · 글루타치온 1200",
                        "bags": [_bag("NS250", *_vit(b6=3), ("laennec", 2), ("thioctic", 1)),
                                 _bag("NS110", ("tathion1200", 1))]},
        },
        "meds": [],
        "oral": {
            "after": [{"sup": "vitd", "weeks": 12, "why": "기본 영양"},
                      {"sup": "omega3", "weeks": 12, "why": "혈관·염증 관리"},
                      {"sup": "coq10", "weeks": 12, "why": "에너지 대사"}],
        },
        "score": {"key": "vitality", "label": "활력 (0~10, 높을수록 좋음)", "max": 10, "higher_better": True},
        "followup_weeks": [0, 4, 12],
        "aftercare": ["근력 운동 주 2회", "단백질은 끼니마다 손바닥 하나",
                      "태반 성분을 맞은 날부터 1년 동안 헌혈 제한"],
    },
    "white": {
        "name": "피부미백(백옥)", "short": "백옥", "color": "#C2669B", "icon": "✨",
        "for": "칙칙한 피부·톤 관리",
        "course_options": [{"total": 10, "per_week": 2, "label": "5주 10회 (주 2회)"},
                           {"total": 8, "per_week": 2, "label": "4주 8회 (주 2회)"}],
        "tiers": {
            "basic": {"price": 40000, "min": 20, "from": "백옥 600",
                      "point": "글루타치온 600",
                      "bags": [_bag("NS110", ("tathion600", 1))]},
            "plus": {"price": 60000, "min": 40, "from": "비타민C + 백옥 1200",
                     "point": "비타민C → 글루타치온 1200 순서대로",
                     "bags": [_bag("NS250", ("megagreen", 1), ("vitao", 1), ("vibon", 1)),
                              _bag("NS110", ("tathion1200", 1))]},
            "premium": {"price": 90000, "min": 50, "from": "원내 PNT2 + 비타민C",
                        "point": "감초·태반·비타민C → 글루타치온 1200 (따로 연결)",
                        "bags": [_bag("NS110", ("hisi", 1), ("laennec", 4), ("megagreen", 1)),
                                 _bag("NS110", ("tathion1200", 1))]},
        },
        "meds": [],
        "oral": {
            "with": [{"sup": "vitc", "weeks": 5, "why": "수액 사이 비타민C"}],
            "after": [{"sup": "gsh_oral", "weeks": 8, "why": "톤 관리 유지"},
                      {"sup": "vitc", "weeks": 8, "why": "톤 관리 유지"},
                      {"sup": "collagen", "weeks": 8, "why": "피부 탄력"}],
        },
        "score": {"key": "skin", "label": "피부 톤 만족도 (0~10)", "max": 10, "higher_better": True},
        "followup_weeks": [0, 5, 12],
        "aftercare": ["자외선 차단제 매일(흐린 날도)", "충분한 수면·수분",
                      "유지기에는 2~4주에 1회"],
    },
    "stress": {
        "name": "스트레스", "short": "스트레스", "color": "#6B5FA8", "icon": "🧘",
        "for": "긴장·두근거림·잠 설침이 이어질 때",
        "course_options": [{"total": 4, "per_week": 2, "label": "2주 4회"},
                           {"total": 4, "per_week": 1, "label": "4주 4회 (주 1회)"},
                           {"total": 1, "per_week": 0, "label": "1회"}],
        "tiers": {
            "basic": {"price": 45000, "min": 40, "from": "원내 MC2",
                      "point": "마그네슘·B군·비타민C",
                      "bags": [_bag("NS250", *_vit(b6=2))]},
            "plus": {"price": 65000, "min": 50, "from": "MC2 + 마늘",
                     "point": "+ 마늘주사(B1)",
                     "bags": [_bag("NS250", *_vit(b6=2), ("fursul", 1), ("vibon", 1))]},
            "premium": {"price": 90000, "min": 60, "from": "원내 ORANGE",
                        "point": "B5·B6 3배 + 감초·태반",
                        "bags": [_bag("NS250", ("laennec", 1), ("vitao", 3), ("vita6", 3), ("hisi", 1),
                                      ("megagreen", 1), ("meganesium", 5), ("vibon", 1))]},
        },
        "meds": [],
        "oral": {
            "with": [{"sup": "mg_oral", "weeks": 2, "why": "긴장 완화"}],
            "after": [{"sup": "mg_oral", "weeks": 8, "why": "긴장 완화·수면"},
                      {"sup": "theanine", "weeks": 8, "why": "긴장 완화"},
                      {"sup": "bcomplex", "weeks": 8, "why": "B군 유지"}],
        },
        "score": {"key": "stress", "label": "스트레스 (0~10)", "max": 10},
        "followup_weeks": [0, 2, 8],
        "aftercare": ["잠들기 1시간 전 화면 끄기", "하루 10분 걷기·호흡",
                      "두근거림·불면이 계속되면 원장님께 말씀"],
    },
    "immune": {
        "name": "환절기 면역강화", "short": "면역", "color": "#2E8BA6", "icon": "🛡️",
        "for": "환절기마다 감기를 달고 살 때",
        "course_options": [{"total": 6, "per_week": 2, "label": "3주 6회"}],
        "tiers": {
            "basic": {"price": 50000, "min": 40, "from": "원내 MC4",
                      "point": "비타민C·B군 + 감초",
                      "bags": [_bag("NS250", *_vit(b6=1), ("hisi", 1))]},
            "plus": {"price": 70000, "min": 50, "from": "MC4 + 아연",
                     "point": "+ 아연",
                     "bags": [_bag("NS250", *_vit(b6=1), ("hisi", 1), ("zinc", 1), ("vibon", 1))]},
            "premium": {"price": 100000, "min": 60, "from": "원내 ORANGE + 아연",
                        "point": "B군 3배·감초·태반 + 아연",
                        "bags": [_bag("NS250", ("laennec", 1), ("vitao", 3), ("vita6", 3), ("hisi", 1),
                                      ("megagreen", 1), ("meganesium", 5), ("zinc", 1), ("vibon", 1))]},
        },
        "meds": [],
        "oral": {
            "with": [{"sup": "vitd", "weeks": 3, "why": "면역 기본"},
                     {"sup": "zinc", "weeks": 3, "why": "면역 기본"}],
            "after": [{"sup": "vitd", "weeks": 12, "why": "환절기 내내"},
                      {"sup": "zinc", "weeks": 8, "why": "환절기"},
                      {"sup": "probiotic", "weeks": 8, "why": "장 면역"},
                      {"sup": "vitc", "weeks": 8, "why": "환절기"}],
        },
        "score": {"key": "immune", "label": "컨디션 (0~10, 높을수록 좋음)", "max": 10, "higher_better": True},
        "followup_weeks": [0, 3, 12],
        "aftercare": ["손 씻기·실내 습도 40~60%", "수면 7시간",
                      "다음 회차는 3~4일 뒤 (3주 6회)"],
    },
    "gut": {
        "name": "장면역강화 (과민성장)", "short": "장면역", "color": "#7A9A3B", "icon": "🦠",
        "for": "과민성장증후군(IBS) — 수액으로 시작해 약·보충제로 이어가는 12주",
        "course_options": [{"total": 4, "per_week": 1, "label": "4주 4회 (주 1회)"},
                           {"total": 4, "per_week": 2, "label": "2주 4회"}],
        "tiers": {
            "basic": {"price": 50000, "min": 60, "from": "디펩티벤",
                      "point": "글루타민(디펩티벤) 50mL",
                      "bags": [_bag("NS250", ("dipeptiven", 1))]},
            "plus": {"price": 70000, "min": 80, "from": "디펩티벤 + MC 비타민",
                     "point": "+ 비타민C·B군",
                     "bags": [_bag("NS250", ("dipeptiven", 1)),
                              _bag("NS110", *_vit(mg=0, b6=1))]},
            "premium": {"price": 100000, "min": 120, "from": "디펩티벤 2병 + 비타민 + 감초",
                        "point": "글루타민 100mL + 비타민·감초",
                        "bags": [_bag("NS500", ("dipeptiven", 2)),
                                 _bag("NS110", *_vit(mg=0, b6=1), ("hisi", 1))]},
        },
        "meds": ["트리메부틴", "피나베리움", "라모세트론", "로페라마이드", "리나클로타이드",
                 "PEG(마크로골)", "산화마그네슘", "저용량 아미트립틸린", "리팍시민", "진경제"],
        "oral": {
            "with": [{"sup": "glutamine", "weeks": 12, "why": "수액 글루타민을 먹는 것으로 이어가기"}],
            "after": [],
        },
        # IBS 유형별 보충제 (로마 IV)
        "subtypes": {
            "D": {"label": "설사형(IBS-D)",
                  "with": [{"sup": "probiotic_d", "weeks": 12, "why": "설사형 — 보울라디 포함"}]},
            "C": {"label": "변비형(IBS-C)",
                  "with": [{"sup": "probiotic_c", "weeks": 12, "why": "변비형 — 비피더스 포함"},
                           {"sup": "psyllium", "weeks": 12, "why": "변비형 — 수용성 섬유"}]},
            "M": {"label": "혼합형(IBS-M)",
                  "with": [{"sup": "probiotic", "weeks": 12, "why": "혼합형"},
                           {"sup": "psyllium", "weeks": 12, "why": "변 굳기 맞추기(소량부터)"}]},
            "U": {"label": "분류 안 됨(IBS-U)",
                  "with": [{"sup": "probiotic", "weeks": 12, "why": "기본 유산균"}]},
        },
        "focus": {
            "pain": {"label": "복통", "after": [{"sup": "peppermint", "weeks": 8, "why": "복통"}]},
            "bloat": {"label": "팽만·가스", "after": [{"sup": "peppermint", "weeks": 8, "why": "팽만"}]},
            "stress": {"label": "스트레스", "after": [{"sup": "theanine", "weeks": 8, "why": "장-뇌 축"}]},
            "vitd": {"label": "비타민D 낮음", "after": [{"sup": "vitd", "weeks": 12, "why": "비타민D 보충"}]},
        },
        "score": {"key": "ibs_sss", "label": "IBS-SSS (0~500)", "max": 500},
        "followup_weeks": [0, 4, 8, 12],
        "aftercare": ["식사 일기: 불편했던 음식 적기", "저포드맵 식사 안내문 참고",
                      "보충제는 매일 같은 시각에", "4·8·12주에 증상 점수 다시 재기",
                      "피 섞인 변·체중 감소·밤에 깨는 설사는 바로 연락"],
    },
}

PROGRAM_ORDER = ["gi", "cold", "fatigue", "aging", "white", "stress", "immune", "gut"]

# ───────────────────────── 원내 판매 보충제 ─────────────────────────
# price: 1통 값(원). None = 원장님 입력 전. days_per_pack: 1통 며칠분
SUPPLEMENTS = {
    "ors": {"name": "경구 전해질(ORS)", "dose": "1포를 물 200mL에, 설사 후마다", "days_per_pack": 3},
    "probiotic": {"name": "유산균 복합(락토·비피더스 100억↑)", "dose": "하루 1번"},
    "probiotic_d": {"name": "유산균(사카로마이세스 보울라디 포함)", "dose": "하루 1~2번"},
    "probiotic_c": {"name": "유산균(비피더스 락티스 포함)", "dose": "하루 1번"},
    "glutamine": {"name": "L-글루타민 분말", "dose": "5g 하루 3번 (15g/일)"},
    "psyllium": {"name": "차전자피(수용성 섬유)", "dose": "3.5g부터 하루 1~2번, 물 넉넉히"},
    "peppermint": {"name": "페퍼민트 오일(장용 캡슐)", "dose": "1캡슐 하루 2~3번, 식전"},
    "theanine": {"name": "L-테아닌", "dose": "200mg 하루 1~2번"},
    "vitd": {"name": "비타민D", "dose": "2000IU 하루 1번"},
    "vitc": {"name": "비타민C", "dose": "1000mg 하루 1번"},
    "zinc": {"name": "아연", "dose": "15~25mg 하루 1번, 식후"},
    "bcomplex": {"name": "고함량 비타민B(활성 B1 포함)", "dose": "하루 1번, 아침"},
    "mg_oral": {"name": "마그네슘(글리시네이트·구연산)", "dose": "200~350mg 저녁"},
    "omega3": {"name": "오메가3", "dose": "1000mg 하루 1번"},
    "coq10": {"name": "코엔자임Q10", "dose": "100mg 하루 1번"},
    "gsh_oral": {"name": "글루타치온(설하·필름)", "dose": "하루 1번"},
    "collagen": {"name": "저분자 콜라겐", "dose": "하루 1포"},
}


def default_catalog():
    """자료 묶음 하나(깊은 복사). 서버는 여기에 설정 변경분을 덮어씌운다."""
    sups = copy.deepcopy(SUPPLEMENTS)
    for s in sups.values():
        s.setdefault("price", None)
        s.setdefault("days_per_pack", 30)
    return {
        "programs": copy.deepcopy(PROGRAMS),
        "order": list(PROGRAM_ORDER),
        "ingredients": copy.deepcopy(ING),
        "supplements": sups,
        "checks": copy.deepcopy(CHECKS),
        "tier_name": dict(TIER_NAME),
        "tiers": list(TIERS),
        "flag_label": dict(FLAG_LABEL),
        "sbp_no_mg": SBP_NO_MG,
        "package_discount": PACKAGE_DISCOUNT,
    }


def apply_overrides(cat, ov):
    """설정에서 바꾼 값 덮어쓰기.
    ov = {"programs": {"gi": {"tiers": {"basic": {"price":..,"bags":..,"min":..}}}},
          "supplements": {"vitd": {"price":..}}, "package_discount": 15}
    """
    ov = ov or {}
    # 새로 들인 약 (설정 → 원내 약 추가)
    for ik, iv in (ov.get("ingredients") or {}).items():
        if ik in cat["ingredients"]:
            cat["ingredients"][ik].update({f: iv[f] for f in ("name", "generic") if iv.get(f)})
        else:
            row = {"name": iv.get("name") or ik, "unit": iv.get("unit") or "A", "generic": iv.get("generic") or "",
                   "groups": list(iv.get("groups") or []), "custom": True}
            if iv.get("base"):
                row.update(base=True, ml=int(iv.get("ml") or 0))
            elif iv.get("add_ml"):
                row["add_ml"] = iv["add_ml"]
            cat["ingredients"][ik] = row
    for pk, pv in (ov.get("programs") or {}).items():
        if pk not in cat["programs"]:
            continue
        for tk, tv in (pv.get("tiers") or {}).items():
            t = cat["programs"][pk]["tiers"].get(tk)
            if t is None:
                continue
            for f in ("price", "min", "bags", "point"):
                if f in tv:
                    t[f] = tv[f]
    for sk, sv in (ov.get("supplements") or {}).items():
        if sk in cat["supplements"]:
            for f in ("price", "dose", "name", "days_per_pack"):
                if f in sv:
                    cat["supplements"][sk][f] = sv[f]
    if "package_discount" in ov:
        cat["package_discount"] = ov["package_discount"]
    return cat


def package_price(price, total, discount):
    """회차권 값: 1회 값 × 회수 × (1-할인), 천 원 단위 반올림."""
    if not price or total <= 1:
        return price
    return int(round(price * total * (100 - discount) / 100.0 / 1000.0)) * 1000
