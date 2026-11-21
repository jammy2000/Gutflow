# -*- coding: utf-8 -*-
"""웰빙내과 수액실 — 기본 자료 (프로그램 · 등급 · 조제 · 보충제 · 확인 항목)

11-20 부원장님: 다니는 병원 「맞춤형 영양주사 구성표」처럼 당장 할 수 있는 10종.
  기본 = N/S 100 + 삐콤 + 마그네슘, 프리미엄 = 써프라민 100 + 삐콤 + 마그네슘,
  여기에 비타민C·글루타치온·진코발을 붙인다. 라이넥은 아직 조합하지 않는다.
  11-20 추가: 라노빈(B12)·푸르설타민(마늘주사). 라노빈은 비타민C·글루타치온·써프라민과 떨어뜨린다.
  11-21: 프리미엄은 써프라민 100을 단독 백으로 하나 더 주고, 약은 모두 N/S 100에.
         비치라이트가 있으면 비타민C는 따로. 같은 조합은 하나로 합쳐 6종.
11-17: 「지금 웰빙내과에 있는 수액 자원」(EMR 수액 목록)으로 짠다.
  써프라민 · N/S 100mL · 삐콤헥사 · 메리트씨 · 마시주 · 라노빈 · 진코발 · 비치라이트
  + 디펩티벤(장면역강화) · 라이넥(입고 예정). 히시파겐C는 허가 취하로 뺌.
가격·구성은 화면 「설정」에서 원장님이 바꿀 수 있고, 바꾼 값은 DB에 따로 저장된다.
이 파일은 '처음 값'만 가진다.

제품 성분·배합 주의는 식약처 의약품안전나라 허가정보로 확인(2026-11-17).
"""
import copy
import math

TIER_NAME = {"basic": "기본", "plus": "플러스", "premium": "프리미엄"}
TIERS = ["basic", "plus", "premium"]

SBP_NO_MG = 100          # 원내 규칙: 수축기 100 이하면 마그네슘 섞지 않기
PACKAGE_DISCOUNT = 10    # 코스(회차권) 기본 할인율 %, 설정에서 바꿈

# ───────────────────────── 원내 수액 재고 ─────────────────────────
# flags : 오늘 확인 결과로 빼는 묶음 (바탕액에 붙으면 그 백 전체가 빠짐)
# groups: 「같이 섞으면 안 되는 조합」 규칙에 쓰는 묶음
# unit "mL" 이면 qty가 곧 늘어나는 양, 아니면 add_ml × qty
ING = {
    # 바탕액
    "NS100": {"name": "N/S 100mL", "unit": "", "ml": 100, "base": True,
              "generic": "생리식염수 100mL 백 (중외)"},
    "SUP100": {"name": "써프라민 100mL", "unit": "", "ml": 100, "base": True,
               "generic": "아미노산 7.5% (간장애용 BCAA 고함량, 아황산·시스테인 함유)",
               "flags": ["aa", "sulfite"], "groups": ["aa_base"],
               "mix": "100mL당 36분 이상 · 비타민 넣으면 바로 투여"},
    "SHOT": {"name": "따로 주사 (피하·근육)", "unit": "", "ml": 0, "base": True, "shot": True,
             "generic": "수액 백에 섞지 않고 같은 날 따로 주사"},
    # 섞는 약
    "meritc": {"name": "메리트씨", "unit": "mL", "generic": "아스코르브산 500mg/mL (20mL=10g)",
               "flags": ["vitc_high"], "groups": ["vitc", "bicarb_c"],
               "mix": "냉장 보관 · 차광 · 천천히",
               "notice": "비타민C: 팔이 뻐근하면 속도 줄이기 · 10시간 동안 손끝 혈당이 높게 나올 수 있음"},
    "masi": {"name": "마시주", "unit": "mL", "generic": "황산마그네슘 10% (10mL=1g)",
             "flags": ["mg"], "groups": ["mg"], "mix": "1g당 30분 이상",
             "notice": "마그네슘: 몸이 화끈거릴 수 있음 → 천천히"},
    "bcx": {"name": "삐콤헥사", "unit": "A", "add_ml": 2,
            "generic": "B1·B2·B6·B12·니코틴아미드·판테놀 2mL (아황산 함유)",
            "flags": ["sulfite"], "groups": ["bcx"], "mix": "차광 · 섞은 뒤 바로",
            "notice": "비타민B: 소변이 진한 노란색이 될 수 있음"},
    "lanovin": {"name": "라노빈", "unit": "A", "add_ml": 2, "generic": "히드록소코발라민(B12) 5mg/2mL",
                "groups": ["b12h"], "mix": "차광 · 비타민C·글루타치온·써프라민과 같은 백 금지"},
    "fursul": {"name": "푸르설타민", "unit": "A", "add_ml": 10, "generic": "푸르설티아민(B1) 50mg/10mL — 마늘주사",
               "flags": ["b1"], "groups": ["b1"], "mix": "천천히(혈관통)",
               "notice": "마늘주사: 입에서 마늘 냄새가 날 수 있음 · 팔이 아프면 속도 줄이기"},
    "jinko": {"name": "진코발", "unit": "A", "add_ml": 5, "generic": "은행엽엑스 17.5mg/5mL",
              "flags": ["ginkgo"], "groups": ["ginkgo"], "mix": "다른 약과 섞지 않고 단독 · 앞뒤로 식염수 흘리기"},
    "vichi": {"name": "비치라이트", "unit": "V", "generic": "글루타치온 600mg (가루, 녹여서)",
              "flags": ["gsh"], "groups": ["gsh", "bicarb"], "mix": "녹인 뒤 바로 섞기"},
    "dipeptiven": {"name": "디펩티벤", "unit": "mL", "generic": "알라닐-글루타민 20% (50·100mL 병)",
                   "flags": ["dipep"], "groups": ["dipep"], "carriers": ["SUP100"],
                   "min_carrier_ratio": 5, "max_ml_per_kg": 2.5,
                   "mix": "아미노산 수액(써프라민)에만 1:5 이상 · 다른 약 넣지 않기 · 섞은 뒤 바로",
                   "notice": "디펩티벤: 천천히"},
    "laennec": {"name": "라이넥", "unit": "A", "generic": "자하거가수분해물(태반) 2mL",
                "flags": ["placenta"], "groups": ["placenta"], "stock_note": "입고 예정",
                "mix": "피하·근육 주사 (허가 용법)",
                "notice": "태반주사: 맞은 날부터 1년 동안 헌혈 제한"},
}

FLAG_LABEL = {
    "mg": "마그네슘", "vitc_high": "고용량 비타민C", "gsh": "글루타치온", "ginkgo": "진코발",
    "placenta": "태반(라이넥)", "b1": "푸르설타민(마늘주사)", "aa": "아미노산(써프라민)", "dipep": "디펩티벤", "sulfite": "아황산 든 약",
}

# ───────────────────────── 같이 섞으면 안 되는 조합 ─────────────────────────
# level "bag" : 같은 백 금지 → 다른 백으로 따로 연결
# level "care": 같은 백 가능, 조건 있음
# b == "*"   : a 는 다른 어떤 약과도 같은 백에 넣지 않음
INCOMPAT = [
    {"id": "vitc_b12", "a": "vitc", "b": "b12h", "level": "bag",
     "title": "메리트씨(비타민C) × 라노빈(B12)",
     "why": "비타민C가 B12(히드록소코발라민)를 분해한다.",
     "do": "다른 백으로 따로", "src": "Cyanokit 허가사항 · Hadinata Lie 2019"},
    {"id": "gsh_b12", "a": "gsh", "b": "b12h", "level": "bag",
     "title": "비치라이트(글루타치온) × 라노빈(B12)",
     "why": "글루타치온이 B12와 바로 결합해 다른 물질(글루타치오닐코발라민)이 된다.",
     "do": "다른 백으로 따로", "src": "Xia 2004 Inorg Chem"},
    {"id": "aa_b12", "a": "aa_base", "b": "b12h", "level": "bag",
     "title": "써프라민 × 라노빈(B12)",
     "why": "써프라민의 시스테인·아황산이 B12와 반응할 수 있다(글루타치온과 같은 원리, 추정).",
     "do": "라노빈은 N/S 백에", "src": "써프라민 첨가제 · 약제학적 추정"},
    {"id": "mg_bicarb", "a": "mg", "b": "bicarb", "level": "care",
     "title": "마시주 × 비치라이트",
     "why": "비치라이트의 탄산수소나트륨(산도 맞춤용)이 마시주 허가사항 문구(탄산수소염 든 약과 혼합 피함)에 글자로는 해당. "
            "원내에서는 N/S에 삐콤·비치라이트·마그네슘을 함께 섞어 씀(11-21 부원장님).",
     "do": "같은 백 가능 — 섞은 뒤 바로, 뿌옇거나 알갱이 보이면 버리기", "src": "마시주·비치라이트 허가사항"},
    {"id": "dipep_any", "a": "dipep", "b": "*", "level": "bag",
     "title": "디펩티벤 × 다른 모든 약",
     "why": "허가사항: 희석한 액에 다른 약을 넣지 않는다. 바탕액은 아미노산 수액만.",
     "do": "써프라민 100mL + 디펩티벤 20mL 까지만", "src": "디펩티벤 허가사항"},
    {"id": "ginkgo_any", "a": "ginkgo", "b": "*", "level": "bag",
     "title": "진코발 × 다른 모든 약",
     "why": "희석·배합 자료가 없는 식물 추출 주사(에탄올·소르비톨 함유).",
     "do": "N/S에 진코발만 · 앞뒤로 식염수 흘리기", "src": "진코발 허가사항(배합 정보 없음)"},
    {"id": "gsh_vitc", "a": "gsh", "b": "vitc", "level": "bag",
     "title": "비치라이트(글루타치온) × 메리트씨(비타민C)",
     "why": "원내 규칙(11-21 부원장님) — 같이 섞지 않는다.",
     "do": "메리트씨는 N/S 100에 따로", "src": "원내 규칙"},
    {"id": "gsh_aa", "a": "gsh", "b": "aa_base", "level": "bag",
     "title": "비치라이트 × 써프라민",
     "why": "섞은 자료가 없다.", "do": "비치라이트는 N/S 백에", "src": "자료 없음 → 분리"},
    {"id": "mg_vitc", "a": "mg", "b": "bicarb_c", "level": "care",
     "title": "마시주 × 메리트씨",
     "why": "메리트씨의 탄산수소나트륨(산도 맞춤용)은 마시주 허가사항 문구(탄산수소염 든 약과 혼합 피함)에 글자로는 해당. "
            "제조 때 비타민C와 반응해 대부분 없어져 침전 위험은 낮다(안정성 자료는 없음).",
     "do": "같은 백 가능 — 섞은 뒤 바로, 뿌옇거나 알갱이 보이면 버리기", "src": "마시주·메리트씨 허가사항"},
    {"id": "vitc_bcx", "a": "vitc", "b": "bcx", "level": "care",
     "title": "메리트씨 × 삐콤헥사",
     "why": "빛을 받으면 B2가 비타민C를 산화시키고, 비타민C가 B12를 분해한다.",
     "do": "같은 백 가능 — 섞은 뒤 바로, 차광 커버", "src": "Silvers 2001 · Zaniolo 2010"},
    {"id": "aa_b1", "a": "aa_base", "b": "b1", "level": "care",
     "title": "써프라민 × 푸르설타민",
     "why": "써프라민의 아황산이 B1(티아민 계열)을 분해한다.",
     "do": "같은 백 가능 — 미리 섞어 두지 말고 섞은 뒤 바로", "src": "Bowman 1983 JPEN"},
    {"id": "aa_bcx", "a": "aa_base", "b": "bcx", "level": "care",
     "title": "써프라민 × 삐콤헥사",
     "why": "아황산이 B1(티아민)을 분해한다.",
     "do": "같은 백 가능 — 미리 섞어 두지 말고 섞은 뒤 바로", "src": "Bowman 1983 JPEN"},
]

# ───────────────────────── 오늘 확인 항목 (빠른 단추) ─────────────────────────
CHECKS = [
    {"key": "preg", "label": "임신·수유 가능", "stop": "원장님 확인 전 진행하지 않음 (진코발·디펩티벤 금기)",
     "remove": ["ginkgo", "dipep"]},
    {"key": "allergy", "label": "주사·수액 뒤 두드러기·쇼크 경험", "stop": "원장님 확인 전 진행하지 않음"},
    {"key": "sulfite", "label": "아황산 과민·천식", "remove": ["sulfite"],
     "warn": "써프라민·삐콤헥사(아황산 함유) 뺌 — 원장님 확인"},
    {"key": "renal", "label": "콩팥 기능 저하·투석", "remove": ["mg", "vitc_high", "dipep", "aa"],
     "warn": "원장님 확인"},
    {"key": "g6pd", "label": "G6PD 결핍·콩팥돌·통풍", "remove": ["vitc_high"]},
    {"key": "liver", "label": "심한 간질환(간경변 등)", "remove": ["dipep"], "warn": "원장님 확인"},
    {"key": "anticoag", "label": "항응고·항혈소판제·수술 예정", "remove": ["ginkgo"]},
    {"key": "heart", "label": "심부전·심한 부종", "warn": "백 수 줄이기", "slow": True},
    {"key": "dm", "label": "당뇨", "warn": "비타민C 뒤 10시간 손끝 혈당이 높게 나옴 → 정맥혈·병원 기계로 확인"},
    {"key": "mgx", "label": "방실차단·근무력증·디곡신", "remove": ["mg"]},
    {"key": "b1x", "label": "마늘주사 뒤 불편·쇼크 경험", "remove": ["b1"]},
    {"key": "donate", "label": "1년 안 헌혈 계획", "remove": ["placenta"]},
    {"key": "first", "label": "처음 맞음·75세 이상", "slow": True},
]


def _bag(base, *add):
    return {"base": base, "add": [list(a) for a in add]}


def bag_minutes(bag):
    """백 하나 권장 시간(분). 써프라민 100mL 36분↑, 마그네슘 1g(10mL)당 30분↑."""
    if ING.get(bag["base"], {}).get("shot"):
        return 0
    m = 40 if bag["base"] == "SUP100" else 20
    for k, q in bag["add"]:
        if k == "masi":
            m = max(m, int(math.ceil(q * 3)))
        elif k == "meritc" and q >= 20:
            m = max(m, 30)
        elif k in ("jinko", "dipeptiven", "fursul"):
            m = max(m, 30)
    return m


# ── 11-20 부원장님 규칙 ──
#  기본    = N/S 100 + 삐콤 + 마그네슘
#  프리미엄 = 써프라민 100 + 삐콤 + 마그네슘
#  피로 계열 + 비타민C, 백옥·숙취·간 + 글루타치온, 혈류(어지러움) + 진코발
#  라이넥은 아직 조합하지 않음
MG = 5   # 마시주 5mL = 0.5g


# ── 11-21 부원장님 규칙 ──
#  기본    = N/S 100 한 백에 삐콤 + 마그네슘 (+ 비타민C / 글루타치온 / 마늘주사 / B12)
#  프리미엄 = 기본과 같은 N/S 백 + 써프라민 100 단독 한 백 더
#  N/S에 삐콤·C·Mg 같이 OK, 삐콤·비치라이트·Mg 같이 OK, 비치라이트 × C 는 금지 → C 따로 백
#  라노빈은 C·글루타치온 없는 백에만, 진코발은 단독 백, 라이넥은 아직 조합하지 않음
def MAIN(c=False, b1=False, gsh=0, b12=False):
    """N/S 100 + 삐콤헥사 + 마시주 (+ 메리트씨 / 푸르설타민 / 비치라이트 / 라노빈)"""
    assert not (c and gsh), "비치라이트와 메리트씨는 같은 백 금지 — C_BAG() 따로"
    assert not (b12 and (c or gsh)), "라노빈은 메리트씨·비치라이트와 같은 백 금지"
    add = [("bcx", 1), ("masi", MG)]
    if c:
        add.append(("meritc", 20))
    if gsh:
        add.append(("vichi", gsh))
    if b1:
        add.append(("fursul", 1))
    if b12:
        add.append(("lanovin", 1))
    return _bag("NS100", *add)


def C_BAG():          # 비타민C 따로 (글루타치온이 있을 때)
    return _bag("NS100", ("meritc", 20))


def SUP():            # 써프라민 100 단독 (프리미엄)
    return _bag("SUP100")


def GINKGO():         # 진코발 단독
    return _bag("NS100", ("jinko", 1))


def DIPEP(ml=20):     # 디펩티벤 단독 (써프라민 100mL에 20mL까지)
    return _bag("SUP100", ("dipeptiven", ml))


def LANO():           # 라노빈(B12) 단독 백 (설정에서 쓸 때)
    return _bag("NS100", ("lanovin", 1))


def bags_for(c=False, b1=False, gsh=0, b12=False, ginkgo=False):
    """규칙대로 백 나누기: C와 글루타치온이 같이 있으면 C는 따로"""
    if c and gsh:
        out = [MAIN(b1=b1, gsh=gsh), C_BAG()]
    else:
        out = [MAIN(c=c, b1=b1, gsh=gsh, b12=b12)]
    if ginkgo:
        out.append(GINKGO())
    return out


def _t(price, point, bags, frm=""):
    return {"price": price, "point": point, "bags": bags, "from": frm,
            "min": sum(bag_minutes(b) for b in bags)}


def _two(pb, pp, point, prem_gsh=None, **kw):
    """기본 = N/S 백(들), 프리미엄 = 같은 N/S 백(들) + 써프라민 100 단독"""
    pkw = dict(kw)
    if prem_gsh is not None:
        pkw["gsh"] = prem_gsh
    return {
        "basic": _t(pb, point, bags_for(**kw), "N/S 100 + 삐콤 + 마그네슘"),
        "premium": _t(pp, point + " + 써프라민", bags_for(**pkw) + [SUP()], "기본 + 써프라민 100 단독"),
    }


ONE = {"total": 1, "per_week": 0, "label": "1회"}

# ───────────────────────── 프로그램 (같은 조합은 하나로 합침) ─────────────────────────
PROGRAMS = {
    "immune": {
        "name": "면역증강 · 갱년기", "short": "면역·갱년기", "color": "#2E8BA6", "icon": "🛡️",
        "for": "환절기 면역 관리, 열감·피로·잠 설침 등 갱년기 불편 (라이넥은 입고 뒤 추가)",
        "course_options": [{"total": 6, "per_week": 2, "label": "3주 6회"},
                           {"total": 4, "per_week": 2, "label": "2주 4회"}, ONE],
        "tiers": _two(50000, 80000, "비타민B·마그네슘·비타민C", c=True),
        "meds": [],
        "oral": {
            "with": [{"sup": "vitd", "weeks": 3, "why": "면역·뼈 건강 기본"}],
            "after": [{"sup": "vitd", "weeks": 12, "why": "면역·뼈 건강"},
                      {"sup": "zinc", "weeks": 8, "why": "면역"},
                      {"sup": "mg_oral", "weeks": 8, "why": "수면·긴장"},
                      {"sup": "omega3", "weeks": 12, "why": "혈관 관리"}],
        },
        "score": {"key": "immune", "label": "컨디션 (0~10, 높을수록 좋음)", "max": 10, "higher_better": True},
        "followup_weeks": [0, 3, 12],
        "aftercare": ["손 씻기·실내 습도 40~60%", "수면 7시간", "근력 운동 주 2회",
                      "다음 회차는 3~4일 뒤"],
    },
    "fatigue": {
        "name": "피로회복 · 감기몸살", "short": "피로·감기", "color": "#C9792A", "icon": "🔋",
        "for": "쉬어도 피곤할 때(원인 확인과 함께), 몸살·근육통으로 처질 때",
        "course_options": [{"total": 4, "per_week": 2, "label": "2주 4회"},
                           {"total": 8, "per_week": 2, "label": "4주 8회"}, ONE],
        "tiers": _two(50000, 80000, "비타민B·마그네슘·비타민C + 마늘주사", c=True, b1=True),
        "meds": ["급여 감기 수액(EMR 1870)", "해열·진통 주사", "감기약 처방"],
        "oral": {
            "with": [{"sup": "bcomplex", "weeks": 2, "why": "수액 사이 날 B군 유지"},
                     {"sup": "mg_oral", "weeks": 2, "why": "근육 긴장·수면"}],
            "after": [{"sup": "bcomplex", "weeks": 8, "why": "피로 관리 유지"},
                      {"sup": "vitc", "weeks": 2, "why": "회복기 비타민C"},
                      {"sup": "vitd", "weeks": 12, "why": "비타민D 낮을 때"}],
        },
        "score": {"key": "fatigue", "label": "피로·몸살 (0~10)", "max": 10},
        "followup_weeks": [0, 2, 4, 12],
        "aftercare": ["잠자는 시각을 일정하게", "오늘은 땀 흘리는 운동·사우나·술 피하기",
                      "열이 3일 넘거나 숨이 차면 다시 진료", "다음 회차는 3~4일 뒤"],
    },
    "vitality": {
        "name": "활력 · 숙취회복", "short": "활력·숙취", "color": "#D9822B", "icon": "⚡",
        "for": "기운이 없고 처질 때, 과음 다음 날 속이 불편하고 처질 때",
        "course_options": [{"total": 4, "per_week": 2, "label": "2주 4회"}, ONE],
        "tiers": _two(60000, 90000, "비타민B·마그네슘·마늘주사·글루타치온 + 비타민C(따로)",
                      c=True, b1=True, gsh=1),
        "meds": ["위장약", "구토 멎는 주사"],
        "oral": {
            "with": [{"sup": "bcomplex", "weeks": 2, "why": "수액 사이 날 B군 유지"}],
            "after": [{"sup": "bcomplex", "weeks": 8, "why": "활력 유지"},
                      {"sup": "silymarin", "weeks": 4, "why": "간 관리"},
                      {"sup": "coq10", "weeks": 8, "why": "에너지 대사"}],
        },
        "score": {"key": "vitality", "label": "활력 (0~10, 높을수록 좋음)", "max": 10, "higher_better": True},
        "followup_weeks": [0, 2, 8],
        "aftercare": ["물·이온음료 충분히", "오늘은 술 금지", "단백질은 끼니마다 손바닥 하나",
                      "다음 회차는 3~4일 뒤"],
    },
    "white": {
        "name": "백옥 · 간기능개선", "short": "백옥·간", "color": "#C2669B", "icon": "✨",
        "for": "칙칙한 피부·톤 관리, 간 수치 관리(간 검사와 함께)",
        "course_options": [{"total": 10, "per_week": 2, "label": "5주 10회 (주 2회)"},
                           {"total": 4, "per_week": 2, "label": "2주 4회"}, ONE],
        "tiers": _two(50000, 90000, "비타민B·마그네슘 + 글루타치온", gsh=1, prem_gsh=2),
        "meds": ["간장약 처방"],
        "oral": {
            "with": [{"sup": "vitc", "weeks": 5, "why": "수액 사이 비타민C"}],
            "after": [{"sup": "gsh_oral", "weeks": 8, "why": "톤 관리 유지"},
                      {"sup": "silymarin", "weeks": 8, "why": "간 관리"},
                      {"sup": "collagen", "weeks": 8, "why": "피부 탄력"}],
        },
        "score": {"key": "skin", "label": "만족도·컨디션 (0~10, 높을수록 좋음)", "max": 10, "higher_better": True},
        "followup_weeks": [0, 4, 12],
        "aftercare": ["자외선 차단제 매일(흐린 날도)", "술 줄이기·체중 관리",
                      "유지기에는 2~4주에 1회", "간 검사 다시 보기 (원장님 안내)"],
    },
    "dizzy": {
        "name": "어지러움 (혈류개선)", "short": "어지러움", "color": "#5B7DB1", "icon": "🌀",
        "for": "어지럽고 손발이 차거나 머리가 맑지 않을 때 (원인 진료와 함께)",
        "course_options": [ONE, {"total": 4, "per_week": 2, "label": "2주 4회"}],
        "tiers": _two(50000, 80000, "비타민B·마그네슘·B12(라노빈) + 은행잎(진코발, 따로)",
                      b12=True, ginkgo=True),
        "meds": ["어지럼 약 처방", "혈압·빈혈 확인"],
        "oral": {
            "after": [{"sup": "omega3", "weeks": 12, "why": "혈액순환"},
                      {"sup": "bcomplex", "weeks": 8, "why": "B군 유지"}],
        },
        "score": {"key": "dizzy", "label": "어지러움 (0~10)", "max": 10},
        "followup_weeks": [0, 2, 8],
        "aftercare": ["갑자기 일어나지 말고 천천히", "물 충분히",
                      "말이 어눌하거나 한쪽 힘이 빠지면 바로 119"],
    },
    "gi": {
        "name": "장염", "short": "장염", "color": "#3B8C7A", "icon": "💧",
        "for": "설사·구토로 지치고 못 먹을 때",
        "course_options": [ONE],
        "tiers": {
            "basic": _t(35000, "비타민B·마그네슘", bags_for(), "N/S 100 + 삐콤 + 마그네슘"),
            "plus": _t(60000, "+ 비타민C", bags_for(c=True), "기본 + 메리트씨"),
            "premium": _t(90000, "+ 비타민C + 써프라민", bags_for(c=True) + [SUP()], "플러스 + 써프라민 100 단독"),
        },
        "meds": ["탈수 교정 수액(급여) 추가", "구토 멎는 주사", "장 경련 주사", "지사제", "정장제"],
        "oral": {
            "with": [{"sup": "ors", "weeks": 0.5, "why": "집에서 수분·전해질 이어가기"}],
            "after": [{"sup": "probiotic_d", "weeks": 2, "why": "장염 뒤 장내 균 회복"},
                      {"sup": "glutamine", "weeks": 2, "why": "장 점막 회복"}],
        },
        "score": {"key": "gi", "label": "설사·복통 (0~10)", "max": 10},
        "followup_weeks": [],
        "aftercare": ["오늘은 미음·죽 등 부드러운 음식부터", "물·이온음료는 조금씩 자주",
                      "우유·기름진 음식·술은 2~3일 피하기",
                      "열이 나거나 피가 섞인 변, 하루 넘게 계속 토하면 바로 연락"],
    },
    # ── 준비 중: 디펩티벤 입고 뒤 PROGRAM_ORDER에 넣으면 켜짐 ──
    "gut": {
        "name": "장면역강화 (과민성장)", "short": "장면역", "color": "#7A9A3B", "icon": "🦠",
        "ready": False,
        "for": "과민성장증후군(IBS) — 수액으로 시작해 약·보충제로 이어가는 12주 (디펩티벤 입고 뒤)",
        "course_options": [{"total": 4, "per_week": 1, "label": "4주 4회 (주 1회)"},
                           {"total": 4, "per_week": 2, "label": "2주 4회"}],
        "tiers": {
            "basic": _t(60000, "기본 백 + 글루타민(디펩티벤, 써프라민에 따로)", [MAIN(), DIPEP()]),
            "premium": _t(100000, "기본 백 + 글루타민 2백", [MAIN(), DIPEP(), DIPEP()]),
        },
        "meds": ["트리메부틴", "피나베리움", "라모세트론", "로페라마이드", "리나클로타이드",
                 "PEG(마크로골)", "산화마그네슘", "저용량 아미트립틸린", "리팍시민", "진경제"],
        "oral": {
            "with": [{"sup": "glutamine", "weeks": 12, "why": "수액 글루타민을 먹는 것으로 이어가기"}],
            "after": [],
        },
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

# 합친 처방: 면역증강+갱년기 / 피로회복+감기몸살 / 활력+숙취회복 / 백옥+간기능개선
PROGRAM_ORDER = ["immune", "fatigue", "vitality", "white", "dizzy", "gi"]
PROGRAMS_LATER = ["gut"]   # 재고 들어오면 PROGRAM_ORDER로 옮기기
# 옛 이름(이미 시작한 코스용) → 합친 프로그램
MERGED_FROM = {"meno": "immune", "cold": "fatigue", "hangover": "vitality", "liver": "white"}

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
    "silymarin": {"name": "밀크씨슬(실리마린)", "dose": "하루 1~2번"},
}


def default_catalog():
    """자료 묶음 하나(깊은 복사). 서버는 여기에 설정 변경분을 덮어씌운다."""
    sups = copy.deepcopy(SUPPLEMENTS)
    for s in sups.values():
        s.setdefault("price", None)
        s.setdefault("days_per_pack", 30)
    progs = copy.deepcopy(PROGRAMS)
    for old, new in MERGED_FROM.items():
        progs[old] = dict(copy.deepcopy(PROGRAMS[new]), ready=False)
    return {
        "programs": progs,
        "order": list(PROGRAM_ORDER),
        "later": list(PROGRAMS_LATER),
        "ingredients": copy.deepcopy(ING),
        "supplements": sups,
        "checks": copy.deepcopy(CHECKS),
        "incompat": copy.deepcopy(INCOMPAT),
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
