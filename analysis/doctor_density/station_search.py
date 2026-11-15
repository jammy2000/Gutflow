"""역세권 내과 개원 후보 탐색.

사용:
  python station_search.py --hira-dir <심평원 폴더> --age-csv <연령별 CSV 2026.10> --pop-old-csv <2024.10 CSV>
      --geojson <행정동 경계> --dong-csv <by_dong.csv> --stations-xlsx <전체_도시철도역사정보.xlsx> --out-dir <결과>

방법
- 분석 지역(서울·인천·부천·일산·김포) 안의 도시철도·광역철도 역. 환승역은 같은 이름이고 500m 안이면 한 역으로 합친다.
- 역 반경 500m·1km·1.5km에서 40세 이상 인구(동 안 균일 분포 가정, 면적 비례)와 의원 내과전문의를 센다.
  한강 남북과 섬(영종·강화·옹진)은 다른 생활권으로 본다(site_search.bank).
- 핵심 지표: 반경 1km(걸어서 오는 거리) 40세 이상 인구 ÷ (경쟁 의원 내과전문의 + 새로 개원하는 나 1명).
- 후보 조건: 반경 1km 40세 이상 1만 명 이상, 역 500m 안 의원·약국 등 점포 5곳 이상(상가가 있는 역).
"""

import argparse
import json
import re
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import shapely
from pyproj import Transformer
from shapely.geometry import shape
from shapely.strtree import STRtree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_doctor_density import IM_CODE, geo_sgg_name, hira_sgg_to_key, region_of  # noqa: E402
from site_search import AGE40, AREA, FM_CODE, bank, read_mois  # noqa: E402

RADII = (500, 1000, 1500)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--hira-dir", required=True, type=Path)
    ap.add_argument("--age-csv", required=True, type=Path)
    ap.add_argument("--pop-old-csv", required=True, type=Path)
    ap.add_argument("--geojson", required=True, type=Path)
    ap.add_argument("--dong-csv", required=True, type=Path)
    ap.add_argument("--stations-xlsx", required=True, type=Path)
    ap.add_argument("--out-dir", required=True, type=Path)
    a = ap.parse_args()
    a.out_dir.mkdir(parents=True, exist_ok=True)
    tf = Transformer.from_crs("EPSG:4326", "EPSG:5179", always_xy=True)
    inv = Transformer.from_crs("EPSG:5179", "EPSG:4326", always_xy=True)

    # ---- 의료기관·약국 ----
    h = pd.read_csv(next(a.hira_dir.glob("1.병원정보서비스*.csv")), encoding="cp949", dtype=str)
    h = h[h["시도코드명"].isin(["서울", "인천", "경기"])].copy()
    d = pd.read_csv(next(a.hira_dir.glob("5.*진료과목정보*.csv")), encoding="cp949", dtype=str)
    d["n"] = pd.to_numeric(d["과목별 전문의수"], errors="coerce").fillna(0)
    h["im"] = h["암호화요양기호"].map(d[d["진료과목코드"] == IM_CODE].groupby("암호화요양기호")["n"].sum()).fillna(0).astype(int)
    h["fm"] = h["암호화요양기호"].map(d[d["진료과목코드"] == FM_CODE].groupby("암호화요양기호")["n"].sum()).fillna(0).astype(int)
    h["x"] = pd.to_numeric(h["좌표(X)"], errors="coerce")
    h["y"] = pd.to_numeric(h["좌표(Y)"], errors="coerce")
    h = h.dropna(subset=["x", "y"])
    h["X"], h["Y"] = tf.transform(h["x"].values, h["y"].values)
    keys = [hira_sgg_to_key(s, g) for s, g in zip(h["시도코드명"], h["시군구코드명"])]
    h["bank"] = [bank(*k) if k else "?" for k in keys]
    cl = h[h["종별코드명"] == "의원"]
    hs = h[h["종별코드명"].isin(["병원", "종합병원", "상급종합"])]
    ph = pd.read_csv(next(a.hira_dir.glob("2.약국정보서비스*.csv")), encoding="cp949", dtype=str)
    ph = ph[ph["시도코드명"].isin(["서울", "인천", "경기"])]
    shop = pd.concat([ph[["좌표(X)", "좌표(Y)"]],
                      h.loc[h["종별코드명"].isin(["의원", "치과의원", "한의원"]), ["좌표(X)", "좌표(Y)"]]])
    shop = shop.apply(pd.to_numeric, errors="coerce").dropna()
    sX, sY = map(np.asarray, tf.transform(shop["좌표(X)"].values, shop["좌표(Y)"].values))

    # ---- 인구 ----
    age = read_mois(a.age_csv)
    cols = {c.split("_")[-1]: c for c in age.columns if "_계_" in c}
    age["pop"] = age[cols["총인구수"]]
    age["pop40"] = age[[cols[k] for k in AGE40]].sum(axis=1)
    age["pop60"] = age[[cols[k] for k in AGE40[2:]]].sum(axis=1)
    am = age.set_index("code")
    dong = pd.read_csv(a.dong_csv, dtype={"행정동코드": str})
    site_path = a.dong_csv.parent / "site_candidates.csv"
    grow = pd.read_csv(site_path, dtype={"행정동코드": str}).set_index("행정동코드")[["2년 전 인구"]] if site_path.exists() else None

    # ---- 경계 ----
    gj = json.loads(a.geojson.read_text(encoding="utf-8"))
    geoms, gcode, gb, greg, gname = [], [], [], [], []
    for f in gj["features"]:
        p = f["properties"]
        if p["sidonm"] in AREA:
            sgg = geo_sgg_name(p["sggnm"])
            geoms.append(shapely.transform(shape(f["geometry"]), lambda xy: np.column_stack(tf.transform(xy[:, 0], xy[:, 1]))))
            gcode.append(p["adm_cd2"])
            gb.append(bank(p["sidonm"], sgg))
            greg.append(region_of(p["sidonm"], sgg))
            gname.append((sgg, p["adm_nm"].split(" ")[-1]))
    gb = np.array(gb)
    areas = np.array([g.area for g in geoms])
    tree = STRtree(geoms)
    gp = am.reindex(gcode)
    p40 = gp["pop40"].fillna(0).values
    p60 = gp["pop60"].fillna(0).values
    pnow = gp["pop"].fillna(0).values
    pold = (grow.reindex(gcode)["2년 전 인구"].values if grow is not None else np.full(len(gcode), np.nan))

    # ---- 역 ----
    st = pd.read_excel(a.stations_xlsx, dtype=str)
    st["lat"] = pd.to_numeric(st["역위도"], errors="coerce")
    st["lon"] = pd.to_numeric(st["역경도"], errors="coerce")
    st = st.dropna(subset=["lat", "lon"])
    st["X"], st["Y"] = tf.transform(st["lon"].values, st["lat"].values)
    st["name"] = (st["역사명"].str.replace(r"\(.*?\)", "", regex=True).str.strip()
                  .str.replace(r"(?<=..)역$", "", regex=True))
    hit = [tree.query(shapely.Point(x, y), predicate="intersects") for x, y in zip(st["X"], st["Y"])]
    st["gi"] = [int(i[0]) if len(i) else -1 for i in hit]
    st = st[st["gi"] >= 0]
    st["region"] = [greg[i] for i in st["gi"]]
    st = st[st["region"].notna()].copy()
    # 같은 이름 + 500m 안이면 한 역
    groups = []
    for nm, g in st.groupby("name"):
        used = np.zeros(len(g), bool)
        xs, ys = g["X"].values, g["Y"].values
        for i in range(len(g)):
            if used[i]:
                continue
            m = (~used) & (np.hypot(xs - xs[i], ys - ys[i]) <= 500)
            used |= m
            sub = g[m]
            groups.append({
                "역": nm, "노선": " · ".join(sorted(set(sub["노선명"].str.strip()))),
                "X": sub["X"].mean(), "Y": sub["Y"].mean(), "gi": int(sub["gi"].iloc[0]),
                "권역": sub["region"].iloc[0],
            })
    S = pd.DataFrame(groups)

    out = []
    for r in S.itertuples(index=False):
        c = shapely.Point(r.X, r.Y)
        b0 = gb[r.gi]
        same_c, same_h = cl["bank"].values == b0, hs["bank"].values == b0
        dc = np.hypot(cl["X"].values - r.X, cl["Y"].values - r.Y)
        dh = np.hypot(hs["X"].values - r.X, hs["Y"].values - r.Y)
        rec = {"권역": r.권역, "역": r.역, "노선": r.노선, "시군구": gname[r.gi][0], "행정동": gname[r.gi][1]}
        for R in RADII:
            buf = c.buffer(R, 64)
            idx = tree.query(buf, predicate="intersects")
            idx = idx[gb[idx] == b0]
            fr = np.array([geoms[i].intersection(buf).area for i in idx]) / areas[idx] if len(idx) else np.array([])
            k = f"{R / 1000:g}km"
            rec[f"{k} 40세+"] = float((p40[idx] * fr).sum())
            rec[f"{k} 60세+"] = float((p60[idx] * fr).sum())
            rec[f"{k} 의원 내과전문의"] = int(cl["im"].values[(dc <= R) & same_c].sum())
            rec[f"{k} 내과 1명당 40세+(개원 후)"] = rec[f"{k} 40세+"] / (rec[f"{k} 의원 내과전문의"] + 1)
            if R == 1000:
                ok = ~np.isnan(pold[idx]) & (pold[idx] > 0)
                rec["1km 2년 인구 증감률"] = ((pnow[idx][ok] * fr[ok]).sum() / (pold[idx][ok] * fr[ok]).sum() - 1) if ok.any() else np.nan
                rec["1km 가정의학과 전문의"] = int(cl["fm"].values[(dc <= R) & same_c].sum())
                rec["1km 의원 수"] = int(((dc <= R) & same_c).sum())
        rec["1.5km 병원급 내과전문의"] = int(hs["im"].values[(dh <= 1500) & same_h].sum())
        rec["500m 점포(의원·약국)"] = int((np.hypot(sX - r.X, sY - r.Y) <= 500).sum())
        rec["500m 내과 의원 수"] = int(((dc <= 500) & same_c & (cl["im"].values > 0)).sum())
        lon, lat = inv.transform(r.X, r.Y)
        rec["위도"], rec["경도"] = lat, lon
        out.append(rec)
    res = pd.DataFrame(out)

    tot40 = am.reindex(dong["행정동코드"])["pop40"].sum()
    bench = tot40 / dong["내과전문의(의원)"].sum()
    res["1km 평균 대비"] = res["1km 내과 1명당 40세+(개원 후)"] / bench
    res["1.5km 평균 대비"] = res["1.5km 내과 1명당 40세+(개원 후)"] / bench
    res["후보 조건"] = (res["1km 40세+"] >= 10000) & (res["500m 점포(의원·약국)"] >= 5)
    res["1.5km에서도 평균 이상"] = res["1.5km 평균 대비"] >= 1.0

    def memo(x):
        t = []
        g = x["1km 2년 인구 증감률"]
        if pd.notna(g) and g >= 0.10:
            t.append("인구 급증")
        elif pd.notna(g) and g >= 0.03:
            t.append("인구 증가")
        elif pd.notna(g) and g <= -0.05:
            t.append("인구 감소")
        if x["1.5km 병원급 내과전문의"] >= 20:
            t.append("가까운 병원 내과 많음")
        if x["1km 가정의학과 전문의"] >= 8:
            t.append("가정의학과 많음")
        if x["500m 내과 의원 수"] == 0:
            t.append("역 앞 내과 없음")
        if x["500m 점포(의원·약국)"] < 10:
            t.append("역 앞 상가 작음")
        return ", ".join(t)

    res["메모"] = res.apply(memo, axis=1)
    res = res.sort_values(["후보 조건", "1km 내과 1명당 40세+(개원 후)"], ascending=[False, False])
    res.insert(0, "순위", np.nan)
    m = res["후보 조건"]
    res.loc[m, "순위"] = np.arange(1, m.sum() + 1)
    res.to_csv(a.out_dir / "station_candidates.csv", index=False, encoding="utf-8-sig")
    log = {"역 수(환승 합침)": int(len(res)), "후보 조건 충족": int(m.sum()), "기준(40세+/의원 내과전문의)": round(bench, 1),
           "권역별 역 수": res["권역"].value_counts().to_dict()}
    (a.out_dir / "station_log.json").write_text(json.dumps(log, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(log, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
