"""
Master Validator — The Medical Brain
GutFlow | Monash University standards | FDA label order weighting

Role: Gatekeeper that independently validates every ingredient list
before it reaches the UI or the shopping engine.
All results feed into page.tsx via /api/validate (Next.js API Route).
"""

from enum import Enum
from typing import List, Tuple, Dict, Any


# ─── Grade System (matches page.tsx FODMAP_DATABASE) ──────────────────────────
# red    = High FODMAP  → block
# yellow = Moderate     → warn + portion check
# green  = Safe         → pass

class FODMAPGrade(str, Enum):
    RED    = "red"      # High FODMAP — avoid
    YELLOW = "yellow"   # Moderate — portion-dependent
    GREEN  = "green"    # Safe — pass

# Legacy alias kept for backwards compat (old Caution/Unsafe terminology)
FODMAPResult = FODMAPGrade


# ─── Synergy Multipliers (mirror of page.tsx SYNERGY_MULTIPLIER) ──────────────
# Same-category ingredients share an absorption pathway → cumulative danger
SYNERGY_MULTIPLIER: Dict[str, float] = {
    "polyol_sorbitol": 1.6,
    "polyol_mannitol": 1.6,
    "fructan":         1.5,
    "fructan_gos":     1.5,
    "fructose":        1.4,
    "lactose":         1.3,
}

BASE_THRESHOLD = 10  # yellow-load score above this = stacking danger


# ─── FODMAP Database ───────────────────────────────────────────────────────────
# Mirrors page.tsx FODMAP_DATABASE so backend and frontend stay in sync.
# grade: red | yellow | green
# load:  0–10 (relative FODMAP load per normal serving)
# category: FODMAP sub-type (used by synergy engine)
FODMAP_DATABASE: Dict[str, Dict[str, Any]] = {
    # ── Red (High FODMAP) ──
    "garlic":           {"grade": "red",    "load": 10, "category": "fructan",        "reason": "Fructans (high)",            "safe_alt": "Garlic-infused oil"},
    "onion":            {"grade": "red",    "load": 10, "category": "fructan",        "reason": "Fructans (high)",            "safe_alt": "Spring onion (green part)"},
    "wheat":            {"grade": "red",    "load": 9,  "category": "fructan_gos",   "reason": "Fructans + GOS",             "safe_alt": "Rice, Quinoa, GF oats"},
    "apple":            {"grade": "red",    "load": 9,  "category": "fructose",       "reason": "Excess Fructose",            "safe_alt": "Strawberry, Blueberry"},
    "pear":             {"grade": "red",    "load": 9,  "category": "fructose",       "reason": "Fructose + Sorbitol"},
    "mango":            {"grade": "red",    "load": 8,  "category": "fructose",       "reason": "Excess Fructose",            "safe_alt": "Pineapple, Kiwi"},
    "watermelon":       {"grade": "red",    "load": 9,  "category": "fructose",       "reason": "Fructose + Polyols"},
    "milk":             {"grade": "red",    "load": 8,  "category": "lactose",        "reason": "Lactose (high)",             "safe_alt": "Lactose-free milk / Almond milk"},
    "honey":            {"grade": "red",    "load": 9,  "category": "fructose",       "reason": "Excess Fructose",            "safe_alt": "Maple syrup (small)"},
    "chickpeas":        {"grade": "red",    "load": 8,  "category": "fructan_gos",   "reason": "GOS (high)"},
    "lentils":          {"grade": "red",    "load": 8,  "category": "fructan_gos",   "reason": "GOS (high)"},
    "cauliflower":      {"grade": "red",    "load": 8,  "category": "polyol_mannitol","reason": "Mannitol (high)",            "safe_alt": "Broccoli (small portion)"},
    "hfcs":             {"grade": "red",    "load": 10, "category": "fructose",       "reason": "Excess Fructose — critical"},
    "high fructose corn syrup": {"grade": "red", "load": 10, "category": "fructose", "reason": "Excess Fructose — critical"},
    "inulin":           {"grade": "red",    "load": 9,  "category": "fructan",        "reason": "Fructans — hidden additive"},
    "chicory root":     {"grade": "red",    "load": 9,  "category": "fructan",        "reason": "Fructans in 'fiber' additives"},
    "sorbitol":         {"grade": "red",    "load": 8,  "category": "polyol_sorbitol","reason": "Polyol — sugar substitute"},
    "xylitol":          {"grade": "red",    "load": 8,  "category": "polyol_sorbitol","reason": "Polyol — sugar substitute"},
    "mannitol":         {"grade": "red",    "load": 8,  "category": "polyol_mannitol","reason": "Polyol — in mushrooms"},
    "maltitol":         {"grade": "red",    "load": 7,  "category": "polyol_sorbitol","reason": "Polyol — sugar-free products"},
    # ── Yellow (Moderate / Portion-Dependent) ──
    "avocado":          {"grade": "yellow", "load": 4,  "category": "polyol_sorbitol","reason": "Sorbitol",           "portion_note": "Safe: 1/8 | Risky: >1/4"},
    "almonds":          {"grade": "yellow", "load": 3,  "category": "fructan_gos",   "reason": "GOS",                "portion_note": "Safe: ≤10 nuts"},
    "sweet potato":     {"grade": "yellow", "load": 3,  "category": "fructan",        "reason": "Fructans",           "portion_note": "Safe: 70g"},
    "broccoli":         {"grade": "yellow", "load": 4,  "category": "fructan_gos",   "reason": "GOS + Fructans",     "portion_note": "Safe: 75g"},
    "oats":             {"grade": "yellow", "load": 3,  "category": "fructan",        "reason": "Fructans",           "portion_note": "Safe: 1/4 cup dry"},
    "blueberry":        {"grade": "yellow", "load": 3,  "category": "fructose",       "reason": "Fructose",           "portion_note": "Safe: 28g"},
    "cherry":           {"grade": "yellow", "load": 5,  "category": "polyol_sorbitol","reason": "Sorbitol + Fructose","portion_note": "Safe: 3 cherries"},
    "pomegranate":      {"grade": "yellow", "load": 4,  "category": "fructose",       "reason": "Fructose",           "portion_note": "Safe: 45g"},
    "coconut milk":     {"grade": "yellow", "load": 3,  "category": "polyol_sorbitol","reason": "Sorbitol",           "portion_note": "Safe: 1/2 cup"},
    "cashews":          {"grade": "yellow", "load": 5,  "category": "fructan_gos",   "reason": "GOS + Fructans",     "portion_note": "Safe: 10 nuts"},
    "greek yogurt":     {"grade": "yellow", "load": 3,  "category": "lactose",        "reason": "Lactose (low)",      "portion_note": "Safe: 3/4 cup"},
    "mushroom":         {"grade": "yellow", "load": 5,  "category": "polyol_mannitol","reason": "Mannitol",           "portion_note": "Safe: 2 small"},
    # ── Green (Safe) ──
    "rice":             {"grade": "green",  "load": 0,  "category": None},
    "chicken":          {"grade": "green",  "load": 0,  "category": None},
    "salmon":           {"grade": "green",  "load": 0,  "category": None},
    "eggs":             {"grade": "green",  "load": 0,  "category": None},
    "spinach":          {"grade": "green",  "load": 0,  "category": None},
    "carrot":           {"grade": "green",  "load": 0,  "category": None},
    "tomato":           {"grade": "green",  "load": 0,  "category": None},
    "cucumber":         {"grade": "green",  "load": 0,  "category": None},
    "strawberry":       {"grade": "green",  "load": 0,  "category": None},
    "banana":           {"grade": "green",  "load": 0,  "category": None},
    "potato":           {"grade": "green",  "load": 0,  "category": None},
    "olive oil":        {"grade": "green",  "load": 0,  "category": None},
    "garlic-infused oil":{"grade": "green", "load": 0,  "category": None},
    "tofu":             {"grade": "green",  "load": 0,  "category": None},
    "lactose-free milk":{"grade": "green",  "load": 0,  "category": None},
    "almond milk":      {"grade": "green",  "load": 0,  "category": None},
    "quinoa":           {"grade": "green",  "load": 0,  "category": None},
    "spring onion":     {"grade": "green",  "load": 0,  "category": None},
    "maple syrup":      {"grade": "green",  "load": 0,  "category": None},
    "zucchini":         {"grade": "green",  "load": 0,  "category": None},
    "bell pepper":      {"grade": "green",  "load": 0,  "category": None},
    "kiwi":             {"grade": "green",  "load": 0,  "category": None},
    "pineapple":        {"grade": "green",  "load": 0,  "category": None},
}

# ─── Ingredient Aliases (Normalization) ───────────────────────────────────────
# Walmart/Kroger often use branded or variant names — map them to our canonical keys.
INGREDIENT_ALIASES: Dict[str, str] = {
    # garlic variants
    "garlic powder":       "garlic",
    "garlic extract":      "garlic",
    "dehydrated garlic":   "garlic",
    # onion variants
    "onion powder":        "onion",
    "onion extract":       "onion",
    "dehydrated onion":    "onion",
    "onions":              "onion",
    # wheat variants
    "wheat flour":         "wheat",
    "wheat starch":        "wheat",
    "wheat gluten":        "wheat",
    "enriched wheat flour":"wheat",
    # HFCS
    "high-fructose corn syrup": "hfcs",
    # inulin variants
    "chicory root fiber":  "inulin",
    "chicory fiber":       "inulin",
    # rye / barley (added relative to MISSION fructan list)
    "rye":                 "wheat",
    "rye flour":           "wheat",
    "barley":              "wheat",
    "barley malt":         "wheat",
    # milk variants
    "skim milk":           "milk",
    "whole milk":          "milk",
    "cream":               "milk",
    # sugar alcohols
    "isomalt":             "sorbitol",   # polyol family
    "erythritol":          "sorbitol",   # technically low, grouped conservatively
    # yogurt
    "yogurt":              "greek yogurt",
    "plain yogurt":        "greek yogurt",
    # nuts
    "cashew":              "cashews",
    "almond":              "almonds",
    "cherry":              "cherry",
    "cherries":            "cherry",
    # fruit
    "blueberries":         "blueberry",
    "strawberries":        "strawberry",
    "avocados":            "avocado",
    # mushrooms
    "mushrooms":           "mushroom",
    "button mushroom":     "mushroom",
}

# ─── Suspicious Patterns (mirrors page.tsx SUSPICIOUS_PATTERNS) ───────────────
# Hidden FODMAP additives often disguised in ingredient labels
import re
SUSPICIOUS_PATTERNS = [
    (re.compile(r"natural.?flavor",  re.I), "May contain hidden Fructans or Polyols"),
    (re.compile(r"modified.?starch", re.I), "Source grain unclear — may contain wheat"),
    (re.compile(r"chicory",          re.I), "Likely Inulin/Fructans — HIGH RISK"),
    (re.compile(r"fiber.?added",     re.I), "Added fiber often = Inulin — HIGH RISK"),
    (re.compile(r"sugar.?alcohol",   re.I), "Sugar alcohols = Polyols — HIGH RISK"),
    (re.compile(r"fructose",         re.I), "Fructose confirmed — HIGH RISK"),
    (re.compile(r"lactose",          re.I), "Lactose confirmed — HIGH RISK"),
    (re.compile(r"inulin",           re.I), "Inulin confirmed — HIGH RISK"),
    (re.compile(r"sorbitol|xylitol|mannitol|maltitol", re.I), "Polyol confirmed — HIGH RISK"),
]


# ─── Normalization ─────────────────────────────────────────────────────────────

def normalize(raw: str) -> str:
    """
    Normalize a raw ingredient string from Walmart/Kroger label text.
    1. Lowercase + strip
    2. Resolve via INGREDIENT_ALIASES
    """
    cleaned = raw.strip().lower()
    return INGREDIENT_ALIASES.get(cleaned, cleaned)


# ─── Synergy Engine (calcCategoryStacking) ────────────────────────────────────

def calc_category_stacking(yellow_items: List[Dict]) -> Dict:
    """
    Same algorithm as page.tsx calcCategoryStacking.
    Groups yellow-grade items by FODMAP category, applies synergy multiplier
    when multiple items share the same absorption pathway.

    Args:
        yellow_items: List of dicts with keys: name, load, category, ...

    Returns:
        {
          "total_load": float,
          "breakdown": [
            {
              "cat": str,
              "items": [...],
              "raw_load": float,
              "multiplier": float,
              "final_load": float,
              "has_synergy": bool,
            },
            ...
          ]
        }
    """
    groups: Dict[str, List[Dict]] = {}
    for item in yellow_items:
        cat = item.get("category") or "unknown"
        groups.setdefault(cat, []).append(item)

    total_load = 0.0
    breakdown = []
    for cat, items in groups.items():
        raw_load = sum(i["load"] for i in items)
        multiplier = SYNERGY_MULTIPLIER.get(cat, 1.2) if len(items) > 1 else 1.0
        final_load = round(float(raw_load) * multiplier, 1)
        breakdown.append({
            "cat":        cat,
            "items":      items,
            "raw_load":   raw_load,
            "multiplier": multiplier,
            "final_load": final_load,
            "has_synergy": len(items) > 1,
        })
        total_load += final_load

    return {
        "total_load": round(float(total_load), 1),
        "breakdown":  breakdown,
    }


# ─── FDA Position Weighting ──────────────────────────────────────────────────

def _get_risk_weight(position: int, total: int) -> float:
    """
    FDA label order: ingredients listed by descending weight.
    First ingredient = highest quantity = highest risk weight (1.0).
    Last ingredient  = lowest quantity (approaches 0).
    """
    if total <= 0:
        return 0.0
    return round(float(1.0 - (position / total)), 3)


# ─── Main Validator ──────────────────────────────────────────────────────────

def analyze(raw_ingredients: List[str]) -> Dict:
    """
    Full FODMAP analysis pipeline — the Gatekeeper function.

    Accepts a raw ingredient list (FDA order, as printed on the label).
    Returns a structured result dict that mirrors the shape used by page.tsx.

    Args:
        raw_ingredients: e.g. ["Wheat Flour", "Sugar", "Garlic Powder"]

    Returns:
        {
          "status":     "safe" | "warning" | "stacking" | "danger"
          "score":      int (0–100)
          "grade":      "red" | "yellow" | "green"  (worst grade found)
          "reds":       [...]
          "yellows":    [...]
          "greens":     [...]
          "flagged":    [{"name": ..., "warning": ...}]   ← suspicious patterns
          "unknowns":   [...]
          "red_load":   float
          "yellow_load": float
          "category_breakdown": [...]
          "portion_items": [...]
          "safe_alts":  [...]
          "fda_weights": {ingredient: weight}            ← position weighting
          "message":    str
        }
    """
    if not raw_ingredients:
        return {"status": "safe", "score": 100, "grade": "green",
                "message": "No ingredients to analyze.", "reds": [], "yellows": [],
                "greens": [], "flagged": [], "unknowns": [],
                "red_load": 0, "yellow_load": 0, "category_breakdown": [],
                "portion_items": [], "safe_alts": [], "fda_weights": {}}

    total = len(raw_ingredients)
    matched: List[Dict] = []
    flagged: List[Dict] = []
    unknowns: List[str] = []
    fda_weights: Dict[str, float] = {}

    for i, raw in enumerate(raw_ingredients):
        key = normalize(raw)
        weight = _get_risk_weight(i, total)
        fda_weights[raw] = weight

        if key in FODMAP_DATABASE:
            entry = dict(FODMAP_DATABASE[key])
            entry["name"] = key
            entry["raw_name"] = raw
            entry["fda_position"] = i + 1
            entry["fda_weight"] = weight
            matched.append(entry)
        else:
            # Check suspicious patterns
            sus = next((w for p, w in SUSPICIOUS_PATTERNS if p.search(raw)), None)
            if sus:
                flagged.append({"name": raw, "warning": sus})
            else:
                unknowns.append(raw)

    reds    = [m for m in matched if m["grade"] == "red"]
    yellows = [m for m in matched if m["grade"] == "yellow"]
    greens  = [m for m in matched if m["grade"] == "green"]

    red_load  = sum(r["load"] for r in reds)
    stacking  = calc_category_stacking(yellows)
    yellow_load = stacking["total_load"]

    has_red     = len(reds) > 0
    has_flagged = len(flagged) > 0
    is_stacking = not has_red and yellow_load >= BASE_THRESHOLD
    is_warning  = not has_red and (BASE_THRESHOLD * 0.6) <= yellow_load < BASE_THRESHOLD

    if has_red or has_flagged:
        status = "danger"
    elif is_stacking:
        status = "stacking"
    elif is_warning:
        status = "warning"
    else:
        status = "safe"

    # Score (0–100), mirrors page.tsx scoring
    score = 100
    score -= red_load * 8
    score -= yellow_load * 4
    score -= len(flagged) * 20
    if is_stacking:
        score -= 15
    score = max(0, min(100, int(score)))

    # Worst grade
    grade = "red" if reds else ("yellow" if yellows else "green")

    messages = {
        "danger":   f"HIGH RISK: {', '.join(r['name'] for r in reds or flagged)}",
        "stacking": f"Stacking danger — yellow load {yellow_load}/{BASE_THRESHOLD}pt",
        "warning":  f"Approaching threshold — {yellow_load}/{BASE_THRESHOLD}pt",
        "safe":     "No significant FODMAP load detected.",
    }

    return {
        "status":             status,
        "score":              score,
        "grade":              grade,
        "reds":               reds,
        "yellows":            yellows,
        "greens":             greens,
        "flagged":            flagged,
        "unknowns":           unknowns,
        "red_load":           red_load,
        "yellow_load":        yellow_load,
        "category_breakdown": stacking["breakdown"],
        "portion_items":      [y for y in yellows if y.get("portion_note")],
        "safe_alts":          [r for r in reds if r.get("safe_alt")],
        "fda_weights":        fda_weights,
        "message":            messages[status],
    }


# Convenience alias
def is_low_fodmap(raw_ingredients: List[str]) -> bool:
    """Returns True only when status == 'safe'."""
    return analyze(raw_ingredients)["status"] == "safe"


# ─── CLI  ─────────────────────────────────────────────────────────────────────
# Two modes:
#   python master_validator.py                   → pretty human-readable test output
#   python master_validator.py --json ing1 ing2  → single JSON line (for python-bridge.ts)
if __name__ == "__main__":
    import sys, json as _json

    args = sys.argv[1:]

    # ── JSON mode (called by python-bridge.ts) ──────────────────────────────
    if args and args[0] == "--json":
        ingredients = args[1:]
        result = analyze(ingredients)
        # Convert non-serializable values (regex, etc.) — all should already be basic types
        print(_json.dumps(result, ensure_ascii=False))
        sys.exit(0)

    # ── Pretty test mode ────────────────────────────────────────────────────
    test_cases = [
        ["Water", "Tomato Paste", "Salt", "Spices"],
        ["Wheat Flour", "Sugar", "Butter", "Garlic Powder", "Onion"],
        ["Avocado", "Cherry", "Coconut Milk"],              # stacking test
        ["Corn", "Water", "Salt", "Natural Flavors"],        # suspicious pattern
    ]
    for ingredients in test_cases:
        r = analyze(ingredients)
        print(f"\n{'─'*55}")
        print(f"Input   : {ingredients}")
        print(f"Status  : {r['status'].upper()}  |  Score: {r['score']}/100")
        print(f"Message : {r['message']}")
        if r["reds"]:
            print(f"Reds    : {[x['name'] for x in r['reds']]}")
        if r["flagged"]:
            print(f"Flagged : {[(x['name'], x['warning']) for x in r['flagged']]}")
        if r["category_breakdown"]:
            for b in r["category_breakdown"]:
                tag = f" ×{b['multiplier']} SYNERGY" if b["has_synergy"] else ""
                print(f"  [{b['cat']}] {b['raw_load']}pt{tag} → {b['final_load']}pt")
