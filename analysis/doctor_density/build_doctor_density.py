"""서울·인천·부천 구별/행정동별 인구당 의사수, 의원수, 내과전문의수 산출.

입력
  --hira-dir : 건강보험심사평가원 「전국 병의원 및 약국 현황」 압축을 푼 폴더 (CSV, cp949)
  --pop-csv  : 행정안전부 주민등록 인구 및 세대현황(월간, 전체 읍면동) CSV (cp949)
  --geojson  : vuski/admdongkor 행정동 경계 GeoJSON (WGS84)
  --out-dir  : 결과 저장 폴더

행정동 배정은 기관 좌표(X=경도, Y=위도)를 행정동 경계에 넣어 결정한다.
구 단위 합계와 동 단위 합계가 일치하도록, 심평원이 표기한 시군구 안의 행정동에서만 찾고
그 안에 들어가지 않으면 같은 시군구의 가장 가까운 행정동으로 배정한다.
"""

import argparse
import json
import re
from pathlib import Path

import pandas as pd
from shapely.geometry import Point, shape
from shapely.strtree import STRtree

MD_COLS = ["의과일반의 인원수", "의과인턴 인원수", "의과레지던트 인원수", "의과전문의 인원수"]
IM_CODE = "01"  # 심평원 진료과목코드: 내과


REGION_ORDER = ["서울", "인천", "부천", "일산", "김포"]
GG_CITIES_WITH_GU = ["부천", "고양", "수원", "성남", "안양", "안산", "용인", "화성"]


def hira_sgg_to_key(sido: str, sggnm: str):
    """심평원 시군구코드명 -> (시도명, 시군구명) in 행안부 표기. 서울·인천·경기만."""
    if sido == "서울":
        return "서울특별시", sggnm
    if sido == "인천":
        return "인천광역시", re.sub(r"^인천", "", sggnm)
    if sido == "경기":
        for c in GG_CITIES_WITH_GU:
            if sggnm.startswith(c) and sggnm.endswith("구") and len(sggnm) > len(c) + 1:
                return "경기도", f"{c}시 {sggnm[len(c):]}"
        return "경기도", sggnm
    return None


def geo_sgg_name(sggnm: str) -> str:
    """경계 파일의 '고양시일산동구' -> '고양시 일산동구'."""
    return re.sub(r"^(\S+시)(\S+구)$", r"\1 \2", sggnm)


def region_of(sido: str, sgg: str):
    """분석 권역. 해당 없으면 None."""
    if sido == "서울특별시":
        return "서울"
    if sido == "인천광역시":
        return "인천"
    if sido == "경기도" and sgg:
        if sgg.startswith("부천시 "):
            return "부천"
        if sgg in ("고양시 일산동구", "고양시 일산서구"):
            return "일산"
        if sgg == "김포시":
            return "김포"
    return None


def load_population(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, encoding="cp949", dtype=str)
    area, pop = df.columns[0], df.columns[1]
    m = df[area].str.extract(r"^(?P<name>.*?)\s*\((?P<code>\d{10})\)$")
    out = pd.DataFrame({
        "name": m["name"].str.strip(),
        "code": m["code"],
        "pop": pd.to_numeric(df[pop].str.replace(",", ""), errors="coerce"),
    })
    out["sgg5"] = out["code"].str[:5]
    out["level"] = "dong"
    out.loc[out["code"].str[5:] == "00000", "level"] = "sgg"
    out.loc[out["code"].str[2:] == "00000000", "level"] = "sido"
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--hira-dir", required=True, type=Path)
    ap.add_argument("--pop-csv", required=True, type=Path)
    ap.add_argument("--geojson", required=True, type=Path)
    ap.add_argument("--out-dir", required=True, type=Path)
    a = ap.parse_args()
    a.out_dir.mkdir(parents=True, exist_ok=True)

    # ---------------- 의료기관 ----------------
    hosp_csv = next(a.hira_dir.glob("1.병원정보서비스*.csv"))
    dept_csv = next(a.hira_dir.glob("5.*진료과목정보*.csv"))
    h = pd.read_csv(hosp_csv, encoding="cp949", dtype=str)
    keys = [hira_sgg_to_key(s, g) for s, g in zip(h["시도코드명"], h["시군구코드명"])]
    h["시도"] = [k[0] if k else None for k in keys]
    h["시군구"] = [k[1] if k else None for k in keys]
    h["권역"] = [region_of(s, g) for s, g in zip(h["시도"], h["시군구"])]
    h = h[h["권역"].notna()].copy()
    for c in MD_COLS + ["총의사수"]:
        h[c] = pd.to_numeric(h[c], errors="coerce").fillna(0).astype(int)
    h["의과의사수"] = h[MD_COLS].sum(axis=1)
    h["x"] = pd.to_numeric(h["좌표(X)"], errors="coerce")
    h["y"] = pd.to_numeric(h["좌표(Y)"], errors="coerce")
    h["is_clinic"] = h["종별코드명"] == "의원"

    d = pd.read_csv(dept_csv, encoding="cp949", dtype=str)
    d = d[d["진료과목코드"] == IM_CODE]
    d["n"] = pd.to_numeric(d["과목별 전문의수"], errors="coerce").fillna(0).astype(int)
    im = d.groupby("암호화요양기호")["n"].sum()
    h["내과전문의"] = h["암호화요양기호"].map(im).fillna(0).astype(int)

    # ---------------- 인구 ----------------
    pop = load_population(a.pop_csv)
    pop_month = re.search(r"(\d{4})년(\d{1,2})월", pd.read_csv(a.pop_csv, encoding="cp949", nrows=0).columns[1])
    pop_month = f"{pop_month.group(1)}.{int(pop_month.group(2)):02d}"

    # ---------------- 행정동 경계 ----------------
    gj = json.loads(a.geojson.read_text(encoding="utf-8"))
    polys, meta = [], []
    for f in gj["features"]:
        p = f["properties"]
        sggnm = geo_sgg_name(p["sggnm"])
        if region_of(p["sidonm"], sggnm):
            polys.append(shape(f["geometry"]))
            meta.append({"code": p["adm_cd2"], "sido": p["sidonm"], "sgg": sggnm,
                         "dong": p["adm_nm"].split(" ")[-1]})
    tree = STRtree(polys)
    by_sgg = {}
    for i, m in enumerate(meta):
        by_sgg.setdefault((m["sido"], m["sgg"]), []).append(i)

    dong_code, how = [], []
    for sido, sgg, x, y in zip(h["시도"], h["시군구"], h["x"], h["y"]):
        cands = by_sgg.get((sido, sgg), [])
        if pd.isna(x) or not cands:
            dong_code.append(None); how.append("좌표없음"); continue
        pt = Point(x, y)
        hit = [i for i in tree.query(pt, predicate="intersects") if i in set(cands)]
        if hit:
            dong_code.append(meta[hit[0]]["code"]); how.append("경계내")
        else:
            j = min(cands, key=lambda i: polys[i].distance(pt))
            dong_code.append(meta[j]["code"]); how.append("최근접")
    h["행정동코드"] = dong_code
    h["배정방식"] = how

    # ---------------- 집계 ----------------
    def agg(g):
        return pd.Series({
            "의과의사수(전체기관)": g["의과의사수"].sum(),
            "의원 의사수": g.loc[g["is_clinic"], "의과의사수"].sum(),
            "의원수": int(g["is_clinic"].sum()),
            "내과전문의(전체기관)": g["내과전문의"].sum(),
            "내과전문의(의원)": g.loc[g["is_clinic"], "내과전문의"].sum(),
            "내과전문의 있는 의원수": int((g["is_clinic"] & (g["내과전문의"] > 0)).sum()),
        })

    def add_rates(df):
        p = df["인구"]
        df["의사/만명(전체기관)"] = df["의과의사수(전체기관)"] / p * 1e4
        df["의원 의사/만명"] = df["의원 의사수"] / p * 1e4
        df["의원/만명"] = df["의원수"] / p * 1e4
        df["의원 1곳당 인구"] = p / df["의원수"].where(df["의원수"] > 0)
        df["내과전문의/만명(전체기관)"] = df["내과전문의(전체기관)"] / p * 1e4
        df["내과전문의/만명(의원)"] = df["내과전문의(의원)"] / p * 1e4
        df["내과전문의(의원) 1명당 인구"] = p / df["내과전문의(의원)"].where(df["내과전문의(의원)"] > 0)
        return df

    count_cols = ["의과의사수(전체기관)", "의원 의사수", "의원수", "내과전문의(전체기관)",
                  "내과전문의(의원)", "내과전문의 있는 의원수"]

    # 구 단위 (심평원 시군구 기준)
    sgg_pop = pop[pop["level"] == "sgg"].copy()
    sgg_pop["sido"] = sgg_pop["name"].str.split(" ").str[0]
    sgg_pop["sgg"] = sgg_pop["name"].str.split(" ", n=1).str[1]
    sgg_pop["권역"] = [region_of(s, g) for s, g in zip(sgg_pop["sido"], sgg_pop["sgg"])]
    sgg_pop = sgg_pop[(sgg_pop["pop"] > 0) & sgg_pop["권역"].notna()]
    g_sgg = h.groupby(["시도", "시군구"]).apply(agg, include_groups=False).reset_index()
    sgg = sgg_pop.rename(columns={"sido": "시도", "sgg": "시군구", "pop": "인구", "code": "행정기관코드"})
    sgg = sgg[["권역", "시도", "시군구", "행정기관코드", "인구"]].merge(g_sgg, on=["시도", "시군구"], how="left")
    sgg[count_cols] = sgg[count_cols].fillna(0).astype(int)
    sgg = add_rates(sgg)

    # 시 단위 요약
    city = sgg.groupby("권역")[["인구"] + count_cols].sum().reindex(REGION_ORDER).reset_index()
    city = add_rates(city)

    # 동 단위
    dong_pop = pop[(pop["level"] == "dong") & (pop["pop"] > 0)].copy()
    dong_pop = dong_pop[dong_pop["code"].isin({m["code"] for m in meta})]
    code2meta = {m["code"]: m for m in meta}
    g_dong = h[h["행정동코드"].notna()].groupby("행정동코드").apply(agg, include_groups=False)
    dong = pd.DataFrame({
        "행정동코드": dong_pop["code"].values,
        "인구": dong_pop["pop"].values,
    })
    dong["시도"] = dong["행정동코드"].map(lambda c: code2meta[c]["sido"])
    dong["시군구"] = dong["행정동코드"].map(lambda c: code2meta[c]["sgg"])
    dong["행정동"] = dong["행정동코드"].map(lambda c: code2meta[c]["dong"])
    dong = dong.merge(g_dong, left_on="행정동코드", right_index=True, how="left")
    dong[count_cols] = dong[count_cols].fillna(0).astype(int)
    dong["권역"] = [region_of(s, g) for s, g in zip(dong["시도"], dong["시군구"])]
    dong = add_rates(dong)

    # ---------------- 검증 로그 ----------------
    log = {
        "인구 기준월": pop_month,
        "대상 의료기관 수": int(len(h)),
        "배정방식": h["배정방식"].value_counts().to_dict(),
        "동 합계=구 합계 (의원수·의사수·내과)": bool(
            (dong.groupby(["시도", "시군구"])[count_cols].sum()
             .sub(sgg.set_index(["시도", "시군구"])[count_cols]).abs().sum().sum()) == 0),
        "경계에 있으나 인구표에 없는 행정동": sorted(set(m["code"] for m in meta) - set(dong_pop["code"])),
        "기관 배정됐으나 인구표에 없는 행정동": sorted(set(h["행정동코드"].dropna()) - set(dong_pop["code"])),
    }
    (a.out_dir / "qa_log.json").write_text(json.dumps(log, ensure_ascii=False, indent=2), encoding="utf-8")

    # ---------------- 저장 ----------------
    order_sgg = ["권역", "시도", "시군구", "행정기관코드", "인구"]
    order_dong = ["권역", "시도", "시군구", "행정동", "행정동코드", "인구"]
    rate_cols = ["의사/만명(전체기관)", "의원 의사/만명", "의원/만명", "의원 1곳당 인구",
                 "내과전문의/만명(전체기관)", "내과전문의/만명(의원)", "내과전문의(의원) 1명당 인구"]
    city = city[["권역", "인구"] + count_cols + rate_cols]
    rank = {r: i for i, r in enumerate(REGION_ORDER)}
    sgg = (sgg.assign(_r=sgg["권역"].map(rank)).sort_values(["_r", "시군구"])
           [order_sgg + count_cols + rate_cols])
    dong = (dong.assign(_r=dong["권역"].map(rank)).sort_values(["_r", "시군구", "행정동코드"])
            [order_dong + count_cols + rate_cols])
    city.to_csv(a.out_dir / "city_summary.csv", index=False, encoding="utf-8-sig")
    sgg.to_csv(a.out_dir / "by_gu.csv", index=False, encoding="utf-8-sig")
    dong.to_csv(a.out_dir / "by_dong.csv", index=False, encoding="utf-8-sig")

    inst = h[["시도", "시군구", "행정동코드", "배정방식", "요양기관명", "종별코드명", "주소",
              "의과의사수", "내과전문의", "x", "y"]].copy()
    inst["행정동"] = inst["행정동코드"].map(lambda c: code2meta[c]["dong"] if c in code2meta else None)
    inst = inst[inst["종별코드명"].isin(["의원", "병원", "종합병원", "상급종합", "요양병원", "정신병원",
                                       "보건소", "보건지소", "보건의료원", "보건진료소"])]
    inst.to_csv(a.out_dir / "institutions.csv", index=False, encoding="utf-8-sig")
    print(json.dumps(log, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
