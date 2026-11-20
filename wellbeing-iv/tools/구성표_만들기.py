# -*- coding: utf-8 -*-
"""프로그램 자료 → 「맞춤 영양수액 구성표」 docx 다시 만들기

  cd wellbeing-iv
  python tools/구성표_만들기.py          (node 와 npm docx 패키지 필요)
"""
import json, os, subprocess, sys, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, ROOT)
import catalog as C  # noqa: E402
import engine as E   # noqa: E402

cat = C.default_catalog()
for k in cat["order"]:
    p = cat["programs"][k]
    for t, T in p["tiers"].items():
        r = E.build_recipe(k, t, {"sbp": 120}, [], cat)
        T["volume_ml"] = r["volume_ml"]
        T["bag_min"] = [b["minutes"] for b in r["bags"]]
    p["oral_plan"] = E.oral_plan(k, cat)
with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as f:
    json.dump(cat, f, ensure_ascii=False)
out = os.path.join(ROOT, "웰빙내과_맞춤영양수액_10종_구성표.docx")
subprocess.check_call(["node", os.path.join(HERE, "make_docx.js"), f.name, out])
os.unlink(f.name)
