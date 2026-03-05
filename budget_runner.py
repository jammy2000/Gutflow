"""
budget_runner.py — Budget Engine CLI Bridge (Next.js → Python)

코드 리뷰 수정 사항:
1. `from dataclasses import asdict` 최상단으로 이동
2. fodmap_db를 master_validator.py의 FODMAP_DATABASE에서 로드
3. 입력 인자 검증 강화 (max size guard)
"""

import sys
import json
import os
from dataclasses import asdict

# engine-room 폴더 기준 경로 설정
_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _HERE)

from budget_engine import BudgetEngine

USDA_PATH = os.path.join(_HERE, "..", "data", "usda_avg_prices.json")
MAX_INPUT_BYTES = 50_000  # Shell injection 및 과대 입력 방어


def load_fodmap_db() -> dict:
    """
    master_validator.py의 FODMAP_DATABASE를 가져온다.
    실패 시 빈 dict 반환 (Engine은 작동하되 FODMAP 검증만 비활성화).
    """
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "master_validator",
            os.path.join(_HERE, "master_validator.py")
        )
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        db = getattr(mod, "FODMAP_DATABASE", {})
        return db
    except Exception as e:
        print(f"[budget_runner] Warning: FODMAP DB load failed ({e}), validation disabled.", file=sys.stderr)
        return {}


def main():
    if len(sys.argv) < 3:
        print(json.dumps({"status": "error", "message": "Usage: budget_runner.py <items_json> <budget>"}))
        sys.exit(1)

    raw_items = sys.argv[1]
    raw_budget = sys.argv[2]

    # ── 입력 크기 검증 ─────────────────────────────────────────────────────
    if len(raw_items.encode()) > MAX_INPUT_BYTES:
        print(json.dumps({"status": "error", "message": "Input too large"}))
        sys.exit(1)

    try:
        items = json.loads(raw_items)
        if not isinstance(items, list):
            raise ValueError("items must be a JSON array")
        budget = float(raw_budget)
    except (json.JSONDecodeError, ValueError) as e:
        print(json.dumps({"status": "error", "message": f"Invalid input: {e}"}))
        sys.exit(1)

    # ── FODMAP DB 로드 및 엔진 실행 ───────────────────────────────────────
    fodmap_db = load_fodmap_db()
    engine = BudgetEngine(fodmap_db, USDA_PATH)

    try:
        result = engine.reconcile(items, budget)
        print(json.dumps(asdict(result)))
    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
