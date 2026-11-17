# -*- coding: utf-8 -*-
"""웰빙내과 수액실 — 계산 규칙 모음 (화면·서버가 같이 씀)

여기 있는 함수는 DB를 건드리지 않는다. 그래서 시험하기 쉽고,
상담앱(consult-app)으로 옮길 때도 이 파일만 가져가면 된다.

- build_recipe(): 프로그램·등급 + 오늘 확인 결과 → 실제로 섞을 목록
- drip(): 총량·시간 → 분당 방울 수
- plan_dates(): 코스 시작일 → 회차 권장 날짜
- emr_text(): 회차 기록 → EMR 붙여넣기 글
"""
import datetime as _dt

import catalog as C


# ───────────────────────── 회차 일정 ─────────────────────────

def _d(s):
    if isinstance(s, _dt.date):
        return s
    return _dt.date.fromisoformat(str(s)[:10])


def plan_dates(start, total, per_week):
    """회차 권장 날짜. 주 2회는 3일·4일 간격을 번갈아(월·목 식) 둔다."""
    start = _d(start)
    if total <= 1 or per_week <= 0:
        return [start.isoformat()]
    if per_week >= 2:
        gaps = [3, 4]
    else:
        gaps = [7]
    out, cur = [start], start
    for i in range(total - 1):
        cur = cur + _dt.timedelta(days=gaps[i % len(gaps)])
        out.append(cur)
    return [x.isoformat() for x in out]


def next_due(done_dates, start, total, per_week):
    """다음 회차 권장일. 다 맞았으면 None."""
    done = sorted(_d(x) for x in done_dates)
    if len(done) >= total:
        return None
    if not done:
        return _d(start).isoformat()
    gap = 3 if per_week >= 2 else 7
    return (done[-1] + _dt.timedelta(days=gap)).isoformat()


# ───────────────────────── 오늘 확인 → 조제 목록 ─────────────────────────

def _vital_rules(v):
    """활력징후로 생기는 규칙. (빼는 표시들, 경고, 멈춤) 을 돌려준다."""
    remove, warns, stops = {}, [], []
    sbp = _num(v.get("sbp"))
    temp = _num(v.get("temp"))
    hr = _num(v.get("hr"))
    if sbp is not None and sbp <= C.SBP_NO_MG:
        remove["mg"] = "수축기 %d (≤%d) → 마그네슘 빼기" % (sbp, C.SBP_NO_MG)
    if sbp is not None and sbp < 90:
        stops.append("수축기혈압 %d — 누워서 다시 재고 원장님 확인" % sbp)
    if sbp is not None and sbp >= 180:
        stops.append("수축기혈압 %d — 원장님 확인 후 진행" % sbp)
    if temp is not None and temp >= 38.5:
        warns.append("체온 %.1f℃ — 원장님 진찰 후 진행" % temp)
    if hr is not None and (hr >= 120 or hr < 50):
        warns.append("맥박 %d — 원장님 확인" % hr)
    return remove, warns, stops


def _ml(it, qty):
    """섞을 때 늘어나는 양(mL)."""
    if it.get("unit") == "mL":
        return float(qty)
    return float(it.get("add_ml", 0)) * float(qty)


def _num(x):
    try:
        if x is None or x == "":
            return None
        return float(x)
    except (TypeError, ValueError):
        return None


def _groups(it):
    return set(it.get("groups") or [])


def mix_conflicts(bags, catalog):
    """한 백(같은 바탕액) 안에서 섞으면 안 되는 조합을 찾는다.

    bags: build_recipe의 bags (items에 removed 표시가 있는 것) 또는
          catalog 형식 [{base, add:[[key,qty],...]}]
    돌려주는 값: (conflicts, notes, rule_ids)
      conflicts — 같은 백 금지(level "bag") 어긴 것
      notes     — 같은 백 가능하지만 조건이 있는 것(level "care")
      rule_ids  — 오늘 수액 전체에 해당하는 규칙(옆 칸에서 강조)
    """
    ing = catalog["ingredients"]
    rules = catalog.get("incompat") or []
    conflicts, notes, used = [], [], set()
    all_groups = set()
    for bi, b in enumerate(bags):
        if "items" in b:
            keys = [r["key"] for r in b["items"] if not r.get("removed")]
        else:
            keys = [k for k, q in b["add"] if q]
        base = b["base"]
        order = b.get("order", bi + 1)
        gmap = {}
        for g in _groups(ing.get(base, {})):
            gmap.setdefault(g, []).append(ing[base]["name"])
        for k in keys:
            for g in _groups(ing.get(k, {})):
                gmap.setdefault(g, []).append(ing[k]["name"])
            car = ing.get(k, {}).get("carriers")
            if car and base not in car:
                conflicts.append({"bag": order, "a": ing[k]["name"], "b": ing[base]["name"],
                                  "title": "%s × %s" % (ing[k]["name"], ing[base]["name"]),
                                  "do": "바탕액은 " + ", ".join(ing[c]["name"] for c in car if c in ing) + "만",
                                  "rule": "carrier"})
        all_groups |= set(gmap)
        for r in rules:
            a, bb = r["a"], r["b"]
            if a not in gmap:
                continue
            if bb == "*":
                others = [k for k in keys if a not in _groups(ing[k])]
                hit = bool(others)
                names = (gmap[a][0], ", ".join(ing[k]["name"] for k in others))
            else:
                hit = bb in gmap
                names = (gmap[a][0], gmap[bb][0] if hit else "")
            if not hit:
                continue
            row = {"bag": order, "a": names[0], "b": names[1], "title": r["title"],
                   "do": r.get("do", ""), "rule": r["id"]}
            (conflicts if r.get("level") == "bag" else notes).append(row)
    for r in rules:
        if r["a"] in all_groups and (r["b"] == "*" or r["b"] in all_groups):
            used.add(r["id"])
    return conflicts, notes, sorted(used)


def check_catalog(catalog):
    """모든 프로그램·등급의 처음 조제가 금지 조합을 피했는지 (설정 화면·시험용)."""
    out = []
    for pk, p in catalog["programs"].items():
        for tk, t in p["tiers"].items():
            conf, _, _ = mix_conflicts(t["bags"], catalog)
            for c in conf:
                out.append(dict(c, program=pk, tier=tk))
    return out


def build_recipe(program_key, tier, vitals=None, checks=None, catalog=None, weight=None):
    """프로그램·등급·오늘 확인 결과로 섞을 목록을 만든다.

    돌려주는 값:
      bags: [{base, base_name, items:[{key,name,qty,unit,removed,reason}], order}]
      removed: 뺀 성분과 이유
      warns: 확인할 것(진행은 가능)
      stops: 원장님 확인 전에는 진행하지 않음
      notices: 환자에게 미리 말할 것(마늘 냄새, 열감 등)
      minutes, volume_ml
    """
    cat = catalog or C.default_catalog()
    vitals = vitals or {}
    checks = set(checks or [])
    prog = cat["programs"][program_key]
    t = prog["tiers"][tier]
    ing = cat["ingredients"]

    remove, warns, stops = _vital_rules(vitals)
    swap_dw = False
    slow = False
    for ck in C.CHECKS:
        if ck["key"] not in checks:
            continue
        for flag in ck.get("remove", []):
            remove.setdefault(flag, ck["label"] + " → " + C.FLAG_LABEL.get(flag, flag) + " 빼기")
        if ck.get("stop"):
            stops.append(ck["label"] + " — " + ck["stop"])
        if ck.get("warn"):
            warns.append(ck["label"] + " — " + ck["warn"])
        if ck.get("swap_dw"):
            swap_dw = True
        if ck.get("slow"):
            slow = True

    bags, removed, notices = [], [], []
    seen_notice = set()
    total_ml = 0
    for bi, bag in enumerate(t["bags"]):
        base = bag["base"]
        base_note = ""
        if swap_dw and ing[base].get("dextrose"):
            alt = ing[base].get("swap_to")
            if alt:
                base_note = "당뇨 → %s 대신 %s" % (ing[base]["name"], ing[alt]["name"])
                base = alt
        vol = ing[base].get("ml", 0)
        total_ml += vol
        items = []
        for key, qty in bag["add"]:
            it = ing[key]
            reason = None
            for flag in it.get("flags", []):
                if flag in remove:
                    reason = remove[flag]
                    break
            row = {"key": key, "name": it["name"], "qty": qty, "unit": it["unit"],
                   "removed": bool(reason), "reason": reason}
            items.append(row)
            if reason:
                removed.append({"name": it["name"], "reason": reason})
                continue
            total_ml += _ml(it, qty)
            n = it.get("notice")
            if n and n not in seen_notice:
                seen_notice.add(n)
                notices.append(n)
        # 디펩티벤 같은 진한 액은 바탕액 대비 비율을 지킨다
        for row in items:
            it = ing[row["key"]]
            ratio = it.get("min_carrier_ratio")
            if ratio and not row["removed"]:
                need = _ml(it, row["qty"]) * ratio
                if vol < need:
                    warns.append("%s %g%s 는 바탕액 %dmL 이상에 섞어야 함 (지금 %dmL)" % (
                        it["name"], row["qty"], it["unit"], need, vol))
        bags.append({"order": bi + 1, "base": base, "base_name": ing[base]["name"],
                     "base_note": base_note, "items": items, "ml": vol})

    # 몸무게 한도(디펩티벤 1일 2.5 mL/kg 이하 등)
    w = _num(weight if weight is not None else vitals.get("weight"))
    if w:
        for b in bags:
            for row in b["items"]:
                it = ing[row["key"]]
                lim = it.get("max_ml_per_kg")
                if lim and not row["removed"]:
                    ml = _ml(it, row["qty"])
                    if ml > lim * w:
                        warns.append("%s %dmL — 몸무게 %gkg 기준 하루 한도 %dmL 넘음" % (
                            it["name"], ml, w, lim * w))

    minutes = t.get("min", 30)
    if slow:
        minutes = int(round(minutes * 1.5))
        warns.append("천천히(시간 1.5배) 주입")
    # 약을 다 뺐으면 의미 없는 수액 → 알림
    active = sum(1 for b in bags for r in b["items"] if not r["removed"])
    if active == 0:
        warns.append("섞을 약이 모두 빠짐 — 원장님과 등급·구성 다시 정하기")

    conflicts, mix_notes, rule_ids = mix_conflicts(bags, cat)

    return {
        "conflicts": conflicts, "mix_notes": mix_notes, "rules_today": rule_ids,
        "program": program_key, "program_name": prog["name"], "tier": tier,
        "tier_name": C.TIER_NAME[tier], "price": t.get("price"),
        "bags": bags, "removed": removed, "warns": warns, "stops": stops,
        "notices": notices, "minutes": minutes, "volume_ml": int(total_ml),
    }


# ───────────────────────── 주입 속도 ─────────────────────────

def drip(volume_ml, minutes, gtt_per_ml=20):
    """총량(mL)과 시간(분) → mL/시, 분당 방울 수."""
    volume_ml = float(volume_ml or 0)
    minutes = float(minutes or 0)
    if volume_ml <= 0 or minutes <= 0:
        return {"ml_per_hr": 0, "gtt_per_min": 0}
    mlh = volume_ml / minutes * 60
    gtt = volume_ml * gtt_per_ml / minutes
    return {"ml_per_hr": int(round(mlh)), "gtt_per_min": int(round(gtt)),
            "sec_per_drop": round(60.0 / gtt, 1) if gtt else 0}


# ───────────────────────── 경구 보충제 ─────────────────────────

def oral_plan(program_key, catalog=None, subtype=None, focus=None):
    """코스 중(병행)·코스 뒤(유지) 경구 보충제 목록.

    장면역강화는 IBS 유형(C/D/M/U)·주된 불편(복통/팽만/스트레스)에 맞춰 바꾼다.
    """
    cat = catalog or C.default_catalog()
    prog = cat["programs"][program_key]
    sups = cat["supplements"]
    oral = prog.get("oral", {})
    def rows(lst):
        out = []
        for r in lst:
            s = sups.get(r["sup"], {})
            out.append({"sup": r["sup"], "name": s.get("name", r["sup"]),
                        "dose": r.get("dose") or s.get("dose", ""),
                        "weeks": r.get("weeks", 4), "why": r.get("why", ""),
                        "price": s.get("price"), "days_per_pack": s.get("days_per_pack", 30)})
        return out
    withc = list(oral.get("with", []))
    after = list(oral.get("after", []))
    if program_key == "gut" and subtype:
        st = prog.get("subtypes", {}).get(subtype, {})
        withc += st.get("with", [])
        after += st.get("after", [])
    if program_key == "gut" and focus:
        for f in focus:
            fx = prog.get("focus", {}).get(f, {})
            after += fx.get("after", [])
    # 같은 보충제가 두 번 나오면 앞의 것만
    def uniq(lst):
        seen, out = set(), []
        for r in lst:
            if r["sup"] in seen:
                continue
            seen.add(r["sup"])
            out.append(r)
        return out
    return {"with": rows(uniq(withc)), "after": rows(uniq(after))}


def refill_due(last_date, days):
    return (_d(last_date) + _dt.timedelta(days=int(days))).isoformat()


# ───────────────────────── 증상 점수 ─────────────────────────

def ibs_sss(pain, pain_days, bloat, bowel_unsat, life):
    """IBS-SSS (0~500). pain_days는 '최근 10일 중 아픈 날 수'."""
    vals = [_num(pain) or 0, (_num(pain_days) or 0) * 10, _num(bloat) or 0,
            _num(bowel_unsat) or 0, _num(life) or 0]
    vals = [max(0, min(100, v)) for v in vals]
    total = int(round(sum(vals)))
    if total < 75:
        grade = "정상 범위"
    elif total < 175:
        grade = "가벼움"
    elif total < 300:
        grade = "중간"
    else:
        grade = "심함"
    return {"total": total, "grade": grade}


def ibs_subtype(hard_pct, loose_pct):
    """로마 IV: 굳은 변(브리스톨 1·2)·묽은 변(6·7)이 나온 날의 비율(%)로 유형."""
    h, l = _num(hard_pct) or 0, _num(loose_pct) or 0
    if h > 25 and l > 25:
        return "M"
    if h > 25 and l < 25:
        return "C"
    if l > 25 and h < 25:
        return "D"
    return "U"


# ───────────────────────── EMR 글 ─────────────────────────

EMR_WIDTH = 45  # 한 줄 45바이트 (한글 2바이트) — 상담앱과 같은 규칙


def _w(s):
    return sum(2 if ord(ch) > 127 else 1 for ch in s)


def _wrap(line, width=EMR_WIDTH):
    """낱말(띄어쓰기) 단위로 접는다. 한 낱말이 너무 길 때만 글자 단위로 자른다."""
    out, cur = [], ""
    for word in line.split(" "):
        cand = (cur + " " + word) if cur else word
        if _w(cand) <= width:
            cur = cand
            continue
        if cur:
            out.append(cur)
        cur = "  " + word
        while _w(cur) > width:
            cut = ""
            for ch in cur:
                if _w(cut + ch) > width:
                    break
                cut += ch
            out.append(cut)
            cur = "  " + cur[len(cut):]
    if cur.strip():
        out.append(cur)
    return out


def minutes_between(a, b):
    try:
        h1, m1 = [int(x) for x in str(a).split(":")[:2]]
        h2, m2 = [int(x) for x in str(b).split(":")[:2]]
    except (ValueError, AttributeError):
        return None
    d = (h2 * 60 + m2) - (h1 * 60 + m1)
    return d if d > 0 else None


def emr_text(course, session, recipe):
    """회차 기록 → EMR에 붙여 넣을 글."""
    lines = []
    lines.append("[수액] %s %s %s/%s회" % (
        recipe["program_name"], recipe["tier_name"], session.get("n", "?"), course.get("total", "?")))
    v = session.get("vitals") or {}
    vt = []
    if v.get("sbp"):
        vt.append("BP %s/%s" % (v.get("sbp"), v.get("dbp") or "-"))
    if v.get("hr"):
        vt.append("HR %s" % v["hr"])
    if v.get("temp"):
        vt.append("BT %s" % v["temp"])
    if vt:
        lines.append(" ".join(vt))
    for b in recipe["bags"]:
        names = [("%s %g%s" % (r["name"], r["qty"], r["unit"])) for r in b["items"] if not r["removed"]]
        head = ("%d) " % b["order"]) if len(recipe["bags"]) > 1 else ""
        lines.append(head + b["base_name"] + (" + " + " + ".join(names) if names else ""))
    for r in recipe["removed"]:
        lines.append("제외: %s (%s)" % (r["name"], r["reason"].split(" → ")[0]))
    t = []
    if session.get("start_time"):
        t.append("%s~%s" % (session["start_time"], session.get("end_time") or ""))
    real = minutes_between(session.get("start_time"), session.get("end_time"))
    t.append("%d분" % (real or session.get("minutes") or recipe["minutes"]))
    lines.append("주입 " + " ".join(t))
    rx = session.get("reactions") or []
    lines.append("반응: " + (", ".join(rx) if rx else "특이사항 없음"))
    if session.get("note"):
        lines.append(session["note"])
    if session.get("next_due"):
        lines.append("다음 회차 권장 %s" % session["next_due"])
    out = []
    for ln in lines:
        out.extend(_wrap(ln))
    return "\n".join(out)
