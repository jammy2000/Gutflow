"""내과 개원 후보지 탐색: 행정동별 반경 생활권의 수요(40세 이상 인구) 대비 경쟁(의원 근무 내과전문의).

사용:
  python site_search.py --hira-dir <심평원 폴더> --age-csv <연령별 인구 CSV(2026.10)>
      --pop-old-csv <주민등록 인구 CSV(2024.10)> --geojson <행정동 경계> --dong-csv <by_dong.csv>
      --out-dir <결과 폴더> [--radius 1500] [--clinic-radius 1000]

방법
- 각 분석 대상 행정동의 '상권 중심'에서 반경 R(기본 1.5km) 원을 그린다. 상권 중심은 동 안의 약국·의원·
  치과의원·한의원 위치 중 나머지와의 거리 합이 가장 작은 실제 점포 위치다(산·공단 한가운데에 중심이
  찍히는 것을 피하려는 것). 점포가 3곳 미만이면 경계 무게중심(밖이면 내부 대표점)을 쓴다.
- 수요: 서울·인천·경기 모든 행정동의 40세 이상 인구를 '동 안에 고르게 산다'고 보고,
  원과 겹치는 면적 비율만큼 더한다(면적 가중).
- 경쟁: 원 안에 있는 의원(종별 '의원')의 내과전문의 수 합계. 병원급 내과전문의는 따로 참고용으로 센다.
- 지표: 생활권 40세 이상 인구 ÷ 생활권 의원 내과전문의 (내과전문의 1명이 맡는 40세 이상 인구).
- 시 경계 너머의 의원·인구도 포함하므로 경계 지역도 공정하게 계산된다.
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

AGE40 = ["40~49세", "50~59세", "60~69세", "70~79세", "80~89세", "90~99세", "100세 이상"]
AREA = ("서울특별시", "인천광역시", "경기도")
RADII = (1000, 1500, 2000)
FM_CODE = "23"  # 가정의학과 (만성질환 진료가 겹치는 경쟁자, 점수에는 넣지 않고 참고용)

SEOUL_NORTH = {"종로구", "중구", "용산구", "성동구", "광진구", "동대문구", "중랑구", "성북구", "강북구",
               "도봉구", "노원구", "은평구", "서대문구", "마포구"}
GG_NORTH = {"고양시", "파주시", "의정부시", "양주시", "동두천시", "연천군", "포천시", "가평군", "남양주시", "구리시"}


def bank(sido: str, sgg: str) -> str:
    """한강·바다로 갈린 생활권. 다른 쪽의 인구와 의원은 생활권에 넣지 않는다."""
    sgg = sgg or ""
    if sido == "서울특별시":
        return "N" if sgg in SEOUL_NORTH else "S"
    if sido == "인천광역시":
        return {"강화군": "강화", "옹진군": "옹진", "영종구": "영종"}.get(sgg, "S")
    if sido == "경기도":
        return "N" if sgg.split(" ")[0] in GG_NORTH else "S"
    return "?"


def read_mois(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, encoding="cp949", dtype=str)
    m = df[df.columns[0]].str.extract(r"^(?P<name>.*?)\s*\((?P<code>\d{10})\)$")
    df.insert(0, "code", m["code"])
    df.insert(1, "name", m["name"].str.strip())
    for c in df.columns[3:]:
        df[c] = pd.to_numeric(df[c].astype(str).str.replace(",", "").str.strip(), errors="coerce")
    return df


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--hira-dir", required=True, type=Path)
    ap.add_argument("--age-csv", required=True, type=Path)
    ap.add_argument("--pop-old-csv", required=True, type=Path)
    ap.add_argument("--geojson", required=True, type=Path)
    ap.add_argument("--dong-csv", required=True, type=Path)
    ap.add_argument("--out-dir", required=True, type=Path)
    ap.add_argument("--radius", type=float, default=1500)
    ap.add_argument("--clinic-radius", type=float, default=1000)
    a = ap.parse_args()
    a.out_dir.mkdir(parents=True, exist_ok=True)
    R, RC = a.radius, a.clinic_radius
    tf = Transformer.from_crs("EPSG:4326", "EPSG:5179", always_xy=True)

    # ---- 의료기관 (서울·인천·경기 전체) ----
    h = pd.read_csv(next(a.hira_dir.glob("1.병원정보서비스*.csv")), encoding="cp949", dtype=str)
    h = h[h["시도코드명"].isin(["서울", "인천", "경기"])].copy()
    d = pd.read_csv(next(a.hira_dir.glob("5.*진료과목정보*.csv")), encoding="cp949", dtype=str)
    d["n"] = pd.to_numeric(d["과목별 전문의수"], errors="coerce").fillna(0)
    im = d[d["진료과목코드"] == IM_CODE].groupby("암호화요양기호")["n"].sum()
    fm = d[d["진료과목코드"] == FM_CODE].groupby("암호화요양기호")["n"].sum()
    h["im"] = h["암호화요양기호"].map(im).fillna(0).astype(int)
    h["fm"] = h["암호화요양기호"].map(fm).fillna(0).astype(int)
    h["x"] = pd.to_numeric(h["좌표(X)"], errors="coerce")
    h["y"] = pd.to_numeric(h["좌표(Y)"], errors="coerce")
    h = h.dropna(subset=["x", "y"])
    h["X"], h["Y"] = tf.transform(h["x"].values, h["y"].values)
    keys = [hira_sgg_to_key(s, g) for s, g in zip(h["시도코드명"], h["시군구코드명"])]
    h["bank"] = [bank(*k) if k else "?" for k in keys]
    clinic = h["종별코드명"] == "의원"
    hosp = h["종별코드명"].isin(["병원", "종합병원", "상급종합"])
    cX, cY, cIM, cB, cFM = (h.loc[clinic, c].values for c in ("X", "Y", "im", "bank", "fm"))
    hX, hY, hIM, hB = (h.loc[hosp, c].values for c in ("X", "Y", "im", "bank"))

    # 상권 점: 약국 + 의원·치과의원·한의원 (생활권 중심을 잡는 데 쓴다)
    ph = pd.read_csv(next(a.hira_dir.glob("2.약국정보서비스*.csv")), encoding="cp949", dtype=str)
    ph = ph[ph["시도코드명"].isin(["서울", "인천", "경기"])]
    shop = pd.concat([
        ph[["좌표(X)", "좌표(Y)"]],
        h.loc[h["종별코드명"].isin(["의원", "치과의원", "한의원"]), ["좌표(X)", "좌표(Y)"]],
    ])
    shop = shop.apply(pd.to_numeric, errors="coerce").dropna()
    sX, sY = tf.transform(shop["좌표(X)"].values, shop["좌표(Y)"].values)
    sX, sY = np.asarray(sX), np.asarray(sY)
    shop_pts = shapely.points(sX, sY)

    # ---- 인구 ----
    age = read_mois(a.age_csv)
    month = re.search(r"(\d{4})년(\d{1,2})월", age.columns[3])
    cols = {c.split("_")[-1]: c for c in age.columns if "_계_" in c}
    age["pop"] = age[cols["총인구수"]]
    age["pop40"] = age[[cols[k] for k in AGE40]].sum(axis=1)
    age["pop60"] = age[[cols[k] for k in AGE40[2:]]].sum(axis=1)
    agemap = age.set_index("code")[["pop", "pop40", "pop60", "name"]]

    old = read_mois(a.pop_old_csv)
    old["pop_old"] = old[old.columns[3]]
    old = old[old["code"].str[5:] != "00000"]
    old_by_code = old.set_index("code")["pop_old"]
    old["sido"] = old["name"].str.split(" ").str[0]
    old["dongnm"] = old["name"].str.split(" ").str[-1]
    old["sggnm"] = old["name"].str.split(" ").str[1:-1].str.join(" ")
    old_by_full = old.drop_duplicates(["sido", "sggnm", "dongnm"], keep=False).set_index(["sido", "sggnm", "dongnm"])["pop_old"]
    old_by_sido = old.drop_duplicates(["sido", "dongnm"], keep=False).set_index(["sido", "dongnm"])["pop_old"]
    old_month = re.search(r"(\d{4})년(\d{1,2})월", old.columns[3])

    # ---- 행정동 경계 (서울·인천·경기) ----
    gj = json.loads(a.geojson.read_text(encoding="utf-8"))
    geoms, gcode, gbank = [], [], []
    for f in gj["features"]:
        p = f["properties"]
        if p["sidonm"] in AREA:
            g = shapely.transform(shape(f["geometry"]), lambda xy: np.column_stack(tf.transform(xy[:, 0], xy[:, 1])))
            geoms.append(g)
            gcode.append(p["adm_cd2"])
            gbank.append(bank(p["sidonm"], geo_sgg_name(p["sggnm"])))
    gbank = np.array(gbank)
    code2bank = dict(zip(gcode, gbank))
    gpop = agemap.reindex(gcode)
    missing = int(gpop["pop"].isna().sum())
    gpop = gpop.fillna(0)
    areas = np.array([g.area for g in geoms])
    tree = STRtree(geoms)
    code2geom = dict(zip(gcode, geoms))

    # ---- 분석 대상 동 ----
    dong = pd.read_csv(a.dong_csv, dtype={"행정동코드": str})
    out = []
    for r in dong.itertuples(index=False):
        code = r.행정동코드
        g = code2geom[code]
        inside = np.flatnonzero(shapely.contains(g, shop_pts))
        if len(inside) >= 3:
            # 상권 중심 = 동 안 약국·의원 위치 중 다른 점들까지 거리 합이 가장 작은 실제 점포 위치(medoid)
            px, py = sX[inside], sY[inside]
            dsum = np.hypot(px[:, None] - px[None, :], py[:, None] - py[None, :]).sum(axis=1)
            k = int(np.argmin(dsum))
            c = shapely.Point(px[k], py[k])
            center_how = f"상권 중심(점포 {len(inside)}곳)"
        else:
            c = g.centroid if g.contains(g.centroid) else g.representative_point()
            center_how = "동 경계 중심(점포 3곳 미만)"
        b0 = code2bank[code]
        same_c, same_h = cB == b0, hB == b0
        dc = np.hypot(cX - c.x, cY - c.y)
        dh = np.hypot(hX - c.x, hY - c.y)
        by_r = {}
        for rad in sorted(set(RADII) | {R}):
            buf = c.buffer(rad, 64)
            idx = tree.query(buf, predicate="intersects")
            idx = idx[gbank[idx] == b0]
            frac = np.array([geoms[i].intersection(buf).area for i in idx]) / areas[idx] if len(idx) else np.array([])
            by_r[rad] = (
                float((gpop["pop40"].values[idx] * frac).sum()),
                float((gpop["pop"].values[idx] * frac).sum()),
                int(cIM[(dc <= rad) & same_c].sum()),
            )
        pop40_c, pop_c, im_c = by_r[R]
        im_clinics_c = int(((dc <= R) & same_c & (cIM > 0)).sum())
        clinics_1k = int(((dc <= RC) & same_c).sum())
        im_hosp_c = int(hIM[(dh <= R) & same_h].sum())
        fm_c = int(cFM[(dc <= R) & same_c].sum())
        extra = {f"{rad // 1000 if rad % 1000 == 0 else rad / 1000}km 비율": (p40 / imc if imc else np.nan)
                 for rad, (p40, _, imc) in by_r.items() if rad != R}
        extra.update({f"{rad // 1000 if rad % 1000 == 0 else rad / 1000}km 내과전문의": imc
                      for rad, (_, _, imc) in by_r.items() if rad != R})
        sggnm = r.시군구
        po = old_by_code.get(code)
        how = "코드"
        if po is None or pd.isna(po):
            po = old_by_full.get((r.시도, sggnm, r.행정동))
            how = "이름"
        if po is None or pd.isna(po):
            po = old_by_sido.get((r.시도, r.행정동))
            how = "이름(시도)"
        if po is None or pd.isna(po):
            po, how = np.nan, "신설"
        a_ = agemap.loc[code]
        lon, lat = Transformer.from_crs("EPSG:5179", "EPSG:4326", always_xy=True).transform(c.x, c.y)
        out.append({
            "권역": r.권역, "시군구": sggnm, "행정동": r.행정동, "행정동코드": code,
            "인구": int(a_["pop"]), "40세 이상": int(a_["pop40"]), "60세 이상": int(a_["pop60"]),
            "40세 이상 비율": a_["pop40"] / a_["pop"],
            "2년 전 인구": po, "2년 인구 증감률": (a_["pop"] / po - 1) if po and not pd.isna(po) else np.nan,
            "증감 매칭": how,
            "동 안 의원": r.의원수, "동 안 의원 내과전문의": r._asdict().get("내과전문의(의원)", np.nan),
            "생활권 인구": pop_c, "생활권 40세 이상": pop40_c,
            "생활권 의원 내과전문의": im_c, "생활권 내과 의원 수": im_clinics_c,
            "생활권 병원급 내과전문의": im_hosp_c, "생활권 의원 가정의학과 전문의": fm_c,
            "1km 안 의원 수": clinics_1k,
            "중심 경도": lon, "중심 위도": lat, "생활권 중심": center_how, "생활권 구분": b0,
            **extra,
        })
    res = pd.DataFrame(out)
    res["동 안 의원 내과전문의"] = dong["내과전문의(의원)"].values
    res["내과전문의 1명당 생활권 40세+"] = res["생활권 40세 이상"] / res["생활권 의원 내과전문의"].where(res["생활권 의원 내과전문의"] > 0)

    # 기준: 분석 지역 전체의 40세 이상 인구 ÷ 의원 내과전문의
    bench = res["40세 이상"].sum() / dong["내과전문의(의원)"].sum()
    bench_region = (res.groupby("권역")["40세 이상"].sum() / dong.groupby("권역")["내과전문의(의원)"].sum()).to_dict()
    res["전체 평균 대비"] = res["내과전문의 1명당 생활권 40세+"] / bench
    res["평균 수준이면 내과전문의 수"] = res["생활권 40세 이상"] / bench
    res["부족 추정(명)"] = res["평균 수준이면 내과전문의 수"] - res["생활권 의원 내과전문의"]
    r1 = res["1km 비율"].where(res["1km 내과전문의"] > 0, np.inf)
    r2 = res["2km 비율"].where(res["2km 내과전문의"] > 0, np.inf)
    res["반경 바꿔도 유지"] = (r1 >= 1.3 * bench) & (r2 >= 1.3 * bench) & (res["전체 평균 대비"] >= 1.3)

    def tag(row):
        t = []
        if row["증감 매칭"] == "신설":
            t.append("신설 동")
        elif row["2년 인구 증감률"] >= 0.10:
            t.append("인구 급증")
        elif row["2년 인구 증감률"] >= 0.03:
            t.append("인구 증가")
        elif row["2년 인구 증감률"] <= -0.05:
            t.append("인구 감소")
        if row["1km 안 의원 수"] <= 5:
            t.append("의원 상권 약함")
        if row["생활권 병원급 내과전문의"] >= 20:
            t.append("가까운 병원 내과 많음")
        if row["2km 내과전문의"] > 0 and row["2km 비율"] < bench:
            t.append("2km 안에 내과 밀집")
        if row["생활권 중심"].startswith("동 경계"):
            t.append("상권 중심 불명확")
        if row["인구"] < 10000:
            t.append("동 인구 1만 미만")
        return ", ".join(t)

    res["메모"] = res.apply(tag, axis=1)
    eligible = (res["인구"] >= 10000) & (res["생활권 40세 이상"] >= 15000)
    res["후보 기준 충족"] = eligible
    res["후보 순위(전체)"] = np.nan
    ranked = res[eligible].sort_values("내과전문의 1명당 생활권 40세+", ascending=False)
    res.loc[ranked.index, "후보 순위(전체)"] = np.arange(1, len(ranked) + 1)
    res["후보 순위(권역)"] = res[eligible].groupby("권역")["내과전문의 1명당 생활권 40세+"].rank(ascending=False, method="first")
    res = res.sort_values(["후보 기준 충족", "후보 순위(전체)"], ascending=[False, True])
    res.to_csv(a.out_dir / "site_candidates.csv", index=False, encoding="utf-8-sig")

    log = {
        "반경(m)": R, "의원 상권 반경(m)": RC,
        "연령 인구 기준월": f"{month.group(1)}.{int(month.group(2)):02d}",
        "증감 비교 기준월": f"{old_month.group(1)}.{int(old_month.group(2)):02d}",
        "경계에 있으나 연령 인구표에 없는 동(수요 0 처리)": missing,
        "분석 지역 전체 기준(40세+ / 의원 내과전문의)": round(bench, 1),
        "권역별 기준": {k: round(v, 1) for k, v in bench_region.items()},
        "증감 매칭": res["증감 매칭"].value_counts().to_dict(),
        "후보 기준 충족 동 수": int(eligible.sum()),
    }
    (a.out_dir / "site_log.json").write_text(json.dumps(log, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(log, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
