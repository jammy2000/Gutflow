"""지도 대시보드용 데이터 파일 생성.

사용: python export_map_data.py <results 폴더> <행정동 GeoJSON> <출력 폴더>

- city.json / gu.json / dong.json : {rows, meta} 형식. meta에 산출 코드(build_doctor_density.py,
  이 파일)와 입력 자료를 함께 넣어 숫자가 어떻게 나왔는지 확인할 수 있게 한다.
- shapes.json : 서울·인천·부천 행정동 경계(공유 경계 보존 단순화) + 구 경계(행정동 병합).
  d3 기준(외곽 링 시계 방향)으로 정렬.
"""

import json
import math
import sys
from pathlib import Path

import pandas as pd
import shapely
from shapely.geometry import mapping, shape
from shapely.geometry.polygon import orient

res, geo_path, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
out.mkdir(parents=True, exist_ok=True)
here = Path(__file__).resolve().parent

COLS = {
    "인구": "pop",
    "의원수": "clinics",
    "의원/만명": "clinics_per10k",
    "의원 1곳당 인구": "pop_per_clinic",
    "의원 의사수": "clinic_md",
    "의원 의사/만명": "clinic_md_per10k",
    "의과의사수(전체기관)": "md_all",
    "의사/만명(전체기관)": "md_all_per10k",
    "내과전문의(의원)": "im_clinic",
    "내과전문의/만명(의원)": "im_clinic_per10k",
    "내과전문의(전체기관)": "im_all",
    "내과전문의/만명(전체기관)": "im_all_per10k",
    "내과전문의 있는 의원수": "im_clinics",
}
ROUND = {"clinics_per10k": 1, "clinic_md_per10k": 1, "md_all_per10k": 1,
         "im_clinic_per10k": 2, "im_all_per10k": 2, "pop_per_clinic": 0}

meta = [
    {"label": "build_doctor_density.py", "value": (here / "build_doctor_density.py").read_text(encoding="utf-8"),
     "type": "code", "lang": "python"},
    {"label": "export_map_data.py", "value": Path(__file__).read_text(encoding="utf-8"),
     "type": "code", "lang": "python"},
    {"label": "의료기관 자료", "value": "건강보험심사평가원 「전국 병의원 및 약국 현황」 2026.9.30 기준 (공공데이터포털 15051059)"},
    {"label": "인구 자료", "value": "행정안전부 주민등록 인구 및 세대현황 2026.10 (행정동, 총인구)"},
    {"label": "행정동 경계", "value": "vuski/admdongkor ver20261001"},
]


def clean(v, col):
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return None
    if col in ROUND:
        r = round(float(v), ROUND[col])
        return int(r) if ROUND[col] == 0 else r
    if isinstance(v, float) and v.is_integer():
        return int(v)
    return v


def to_rows(df, keep):
    df = df.rename(columns=COLS)
    rows = []
    for rec in df[keep + list(COLS.values())].to_dict("records"):
        rows.append({k: clean(v, k) for k, v in rec.items()})
    return rows


city = pd.read_csv(res / "city_summary.csv").rename(columns={"권역": "region"})
gu = pd.read_csv(res / "by_gu.csv", dtype={"행정기관코드": str}).rename(
    columns={"권역": "region", "시군구": "gu", "행정기관코드": "code"})
dong = pd.read_csv(res / "by_dong.csv", dtype={"행정동코드": str}).rename(
    columns={"권역": "region", "시군구": "gu", "행정동": "dong", "행정동코드": "code"})
gu["gu"] = gu["gu"].str.replace("부천시 ", "부천 ", regex=False)
dong["gu"] = dong["gu"].str.replace("부천시 ", "부천 ", regex=False)
dong["gu_code"] = dong["code"].str[:5] + "00000"

for name, df, keep in [("city", city, ["region"]), ("gu", gu, ["code", "region", "gu"]),
                       ("dong", dong, ["code", "gu_code", "region", "gu", "dong"])]:
    payload = {"rows": to_rows(df, keep), "meta": meta}
    (out / f"{name}.json").write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

# ---- 경계 ----
codes = set(dong["code"])
gj = json.loads(geo_path.read_text(encoding="utf-8"))
feats = [f for f in gj["features"] if f["properties"]["adm_cd2"] in codes]
geoms = [shape(f["geometry"]) for f in feats]
simp = shapely.coverage_simplify(geoms, tolerance=0.00025, simplify_boundary=True)


def rounded(geom, nd=5):
    return shapely.set_precision(geom, 10 ** -nd, mode="pointwise")


def oriented(geom):
    if geom.geom_type == "Polygon":
        return orient(geom, sign=-1.0)
    return shapely.MultiPolygon([orient(p, sign=-1.0) for p in geom.geoms])


def feat(geom, props):
    g = mapping(oriented(rounded(geom)))
    return {"type": "Feature", "properties": props, "geometry": g}


dong_feats = [feat(g, {"code": f["properties"]["adm_cd2"]}) for f, g in zip(feats, simp)]
by_gu = {}
for f, g in zip(feats, simp):
    by_gu.setdefault(f["properties"]["adm_cd2"][:5] + "00000", []).append(g)
gu_feats = [feat(shapely.union_all(gs).buffer(0), {"code": c}) for c, gs in sorted(by_gu.items())]
shapes = {
    "dong": {"type": "FeatureCollection", "features": dong_feats},
    "gu": {"type": "FeatureCollection", "features": gu_feats},
    "meta": [{"label": "행정동 경계", "value": "vuski/admdongkor ver20261001, 공유 경계 보존 단순화(허용오차 약 25m)"}],
}
(out / "shapes.json").write_text(json.dumps(shapes, separators=(",", ":")), encoding="utf-8")
for p in sorted(out.iterdir()):
    print(p.name, p.stat().st_size)
