"""서울·인천·경기 서부 내과 개원 시장조사: 시군구표, 역세권표, 내과 의원 유형표.

사용: python metro_market.py --data <scratchpad 루트> --out <결과 폴더>
  <루트>/hira, pop/age_2610.csv, pop/pop_2410.csv, geo/adm.geojson, stations/stations.xlsx,
  nps/nps.bin(국민연금 사업장), ride/card_202610.bin(서울 교통카드), ride/incheon_daily.bin

지표 정의
- 경쟁: 의원(종별 '의원')의 내과전문의 수(IM), 가정의학과 전문의 수(FM). 병원급은 별도.
- 수요: 40세 이상 주민등록인구. 반경 생활권은 동 안 균일 분포 가정으로 면적 비례.
- 직장인구: 국민연금 가입 사업장 가입자 수(사업장 소재 행정동). 본사 일괄 신고 사업장은 과대 집계될 수 있음.
- 역 이용객: 서울 교통카드 2026.10 일평균 승하차(수도권 전 노선), 인천 1·2·7호선은 인천교통공사 2026.4~6 일평균.
- 한강 남북과 섬은 다른 생활권(site_search.bank).
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
from build_doctor_density import geo_sgg_name, hira_sgg_to_key  # noqa: E402
from site_search import AGE40, bank, read_mois  # noqa: E402

GG_WEST_NW = ["고양시", "파주시", "김포시"]
GG_WEST_SW = ["부천시", "광명시", "시흥시", "과천시", "안양시", "군포시", "의왕시", "안산시"]


def market_region(sido, sgg):
    sgg = sgg or ""
    city = sgg.split(" ")[0]
    if sido == "서울특별시":
        return "서울"
    if sido == "인천광역시":
        return None if sgg in ("강화군", "옹진군") else "인천"
    if sido == "경기도":
        if city in GG_WEST_NW:
            return "경기 서북"
        if city in GG_WEST_SW:
            return "경기 서남"
    return None


def norm_station(s):
    s = re.sub(r"\(.*?\)", "", str(s)).strip()
    return re.sub(r"(?<=..)역$", "", s)


def hhmm(v):
    try:
        v = int(float(v))
        return v if 0 < v <= 2400 else np.nan
    except Exception:
        return np.nan


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    a = ap.parse_args()
    D, O = a.data, a.out
    O.mkdir(parents=True, exist_ok=True)
    tf = Transformer.from_crs("EPSG:4326", "EPSG:5179", always_xy=True)
    inv = Transformer.from_crs("EPSG:5179", "EPSG:4326", always_xy=True)

    # ---------------- 의료기관 ----------------
    hd = D / "hira"
    h = pd.read_csv(next(hd.glob("1.병원정보서비스*.csv")), encoding="cp949", dtype=str)
    h = h[h["시도코드명"].isin(["서울", "인천", "경기"])].copy()
    keys = [hira_sgg_to_key(s, g) for s, g in zip(h["시도코드명"], h["시군구코드명"])]
    h["시도"] = [k[0] if k else None for k in keys]
    h["시군구"] = [k[1] if k else None for k in keys]
    h["권역"] = [market_region(s, g) for s, g in zip(h["시도"], h["시군구"])]
    h["bank"] = [bank(s, g) for s, g in zip(h["시도"], h["시군구"])]
    md = ["의과일반의 인원수", "의과인턴 인원수", "의과레지던트 인원수", "의과전문의 인원수"]
    for c in md:
        h[c] = pd.to_numeric(h[c], errors="coerce").fillna(0)
    h["의과의사"] = h[md].sum(axis=1).astype(int)
    dept = pd.read_csv(next(hd.glob("5.*진료과목정보*.csv")), encoding="cp949", dtype=str)
    dept["n"] = pd.to_numeric(dept["과목별 전문의수"], errors="coerce").fillna(0)
    spec = dept.pivot_table(index="암호화요양기호", columns="진료과목코드", values="n", aggfunc="sum").fillna(0)
    h["im"] = h["암호화요양기호"].map(spec.get("01", pd.Series(dtype=float))).fillna(0).astype(int)
    h["fm"] = h["암호화요양기호"].map(spec.get("23", pd.Series(dtype=float))).fillna(0).astype(int)
    eq = pd.read_csv(next(hd.glob("7.*의료장비정보*.csv")), encoding="cp949", dtype=str)
    eqs = eq.groupby("암호화요양기호")["장비코드명"].apply(set)
    has = lambda name: h["암호화요양기호"].map(lambda k: name in eqs.get(k, set()))  # noqa: E731
    h["초음파"] = has("초음파영상진단기")
    h["골밀도"] = has("골밀도검사기")
    h["유방촬영"] = has("유방촬영장치")
    h["CT"] = has("CT")
    h["투석"] = has("혈액투석을위한인공신장기")
    det = pd.read_csv(next(hd.glob("4.*세부정보*.csv")), encoding="cp949", dtype=str).set_index("암호화요양기호")
    days = ["월요일", "화요일", "수요일", "목요일", "금요일"]
    ends = pd.DataFrame({d: det[f"진료종료시간_{d}"].map(hhmm) for d in days})
    h["평일 야간(20시 이후)"] = h["암호화요양기호"].map((ends >= 2000).any(axis=1)).fillna(False)
    h["토요일 진료"] = h["암호화요양기호"].map(det["진료종료시간_토요일"].map(hhmm) > 0).fillna(False)
    h["일요일 진료"] = h["암호화요양기호"].map(det["진료종료시간_일요일"].map(hhmm) > 0).fillna(False)
    sp = pd.read_csv(next(hd.glob("10.*특수진료*.csv")), encoding="cp949", dtype=str)
    spm = sp.groupby("암호화요양기호")["검색코드"].apply(set)
    h["만성질환관리"] = h["암호화요양기호"].map(lambda k: "SP" in spm.get(k, set()))
    h["방문진료"] = h["암호화요양기호"].map(lambda k: "ST" in spm.get(k, set()))
    h["개설일"] = pd.to_datetime(h["개설일자"], errors="coerce")
    h["업력(년)"] = ((pd.Timestamp("2026-09-30") - h["개설일"]).dt.days / 365.25).round(1)
    h["x"] = pd.to_numeric(h["좌표(X)"], errors="coerce")
    h["y"] = pd.to_numeric(h["좌표(Y)"], errors="coerce")
    h = h.dropna(subset=["x", "y"]).copy()
    h["X"], h["Y"] = tf.transform(h["x"].values, h["y"].values)
    clinic = h["종별코드명"] == "의원"
    hospital = h["종별코드명"].isin(["병원", "종합병원", "상급종합"])

    gi_name = h["요양기관명"].str.contains("소화기|속편한|내시경|위대장|장편한|위장|항문|대장", regex=True)
    gi_name |= h["요양기관명"].str.contains("검진|건강증진|건강검진", regex=True)

    def im_type(r):
        if r["투석"]:
            return "투석형"
        if r["유방촬영"] and r["초음파"]:
            return "검진센터형(5대암 가능)"
        if r["im"] >= 2 or (r["초음파"] and r["gi"]):
            return "내시경·소화기형(3대암)"
        if r["초음파"]:
            return "초음파 기본형"
        return "외래 기본형"

    im = h[clinic & (h["im"] > 0)].copy()
    im["gi"] = gi_name[im.index]
    im["유형"] = im.apply(im_type, axis=1)

    # ---------------- 인구·직장인구·경계 ----------------
    age = read_mois(D / "pop" / "age_2610.csv")
    cols = {c.split("_")[-1]: c for c in age.columns if "_계_" in c}
    age["pop"] = age[cols["총인구수"]]
    age["pop40"] = age[[cols[k] for k in AGE40]].sum(axis=1)
    age["pop60"] = age[[cols[k] for k in AGE40[2:]]].sum(axis=1)
    age["pop2064"] = age[[cols[k] for k in ["20~29세", "30~39세", "40~49세", "50~59세"]]].sum(axis=1)
    am = age.set_index("code")
    old = read_mois(D / "pop" / "pop_2410.csv")
    old["pop_old"] = old[old.columns[3]]
    oldm = old.set_index("code")["pop_old"]
    nps = pd.read_csv(D / "nps" / "nps.bin", encoding="cp949", dtype=str, usecols=[3, 8, 18])
    nps.columns = ["st", "hcode", "n"]
    nps["n"] = pd.to_numeric(nps["n"], errors="coerce").fillna(0)
    workers = nps[nps["st"] == "1"].groupby("hcode")["n"].sum()

    gj = json.loads((D / "geo" / "adm.geojson").read_text(encoding="utf-8"))
    geoms, gcode, gb, gsido, gsgg = [], [], [], [], []
    for f in gj["features"]:
        p = f["properties"]
        if p["sidonm"] in ("서울특별시", "인천광역시", "경기도"):
            sgg = geo_sgg_name(p["sggnm"])
            geoms.append(shapely.transform(shape(f["geometry"]), lambda xy: np.column_stack(tf.transform(xy[:, 0], xy[:, 1]))))
            gcode.append(p["adm_cd2"]); gb.append(bank(p["sidonm"], sgg)); gsido.append(p["sidonm"]); gsgg.append(sgg)
    gb = np.array(gb)
    areas = np.array([g.area for g in geoms])
    tree = STRtree(geoms)
    G = pd.DataFrame({"code": gcode, "sido": gsido, "sgg": gsgg})
    for c in ["pop", "pop40", "pop60", "pop2064"]:
        G[c] = am.reindex(gcode)[c].fillna(0).values
    G["pop_old"] = oldm.reindex(gcode).values
    G["workers"] = workers.reindex(gcode).fillna(0).values
    G["권역"] = [market_region(s, g) for s, g in zip(G["sido"], G["sgg"])]

    # ---------------- 시군구표 ----------------
    sgg_key = G.groupby(["sido", "sgg"]).agg(pop=("pop", "sum"), pop40=("pop40", "sum"), pop60=("pop60", "sum"),
                                              pop2064=("pop2064", "sum"), workers=("workers", "sum"),
                                              pop_old=("pop_old", lambda s: s.sum(min_count=1))).reset_index()
    sgg_key["권역"] = [market_region(s, g) for s, g in zip(sgg_key["sido"], sgg_key["sgg"])]
    sgg_key = sgg_key[sgg_key["권역"].notna()]
    hc = h[clinic].groupby(["시도", "시군구"]).agg(의원수=("im", "size"), 의원_내과전문의=("im", "sum"), 의원_가정의학과=("fm", "sum"),
                                                   내과전문의있는의원=("im", lambda s: int((s > 0).sum()))).reset_index()
    hh = h[hospital].groupby(["시도", "시군구"]).agg(병원급수=("im", "size"), 병원급_내과전문의=("im", "sum"),
                                                     종합병원이상=("종별코드명", lambda s: int(s.isin(["종합병원", "상급종합"]).sum()))).reset_index()
    it = im.groupby(["시도", "시군구"]).agg(내과의원_평균업력=("업력(년)", "mean"), 내과의원_야간비율=("평일 야간(20시 이후)", "mean"),
                                            내과의원_토요비율=("토요일 진료", "mean"), 내과의원_다인비율=("im", lambda s: (s >= 2).mean()),
                                            최근3년_개원_내과=("업력(년)", lambda s: int((s < 3).sum()))).reset_index()
    typ = im.pivot_table(index=["시도", "시군구"], columns="유형", values="im", aggfunc="size", fill_value=0).reset_index()
    sg = sgg_key.rename(columns={"sido": "시도", "sgg": "시군구"}).merge(hc, on=["시도", "시군구"], how="left") \
        .merge(hh, on=["시도", "시군구"], how="left").merge(it, on=["시도", "시군구"], how="left").merge(typ, on=["시도", "시군구"], how="left")
    sg = sg.fillna({c: 0 for c in sg.columns if sg[c].dtype != object})
    sg["40세이상비율"] = sg["pop40"] / sg["pop"]
    sg["60세이상비율"] = sg["pop60"] / sg["pop"]
    sg["2년증감"] = sg["pop"] / sg["pop_old"] - 1
    sg["직주비(직장인구/20~64세 주민)"] = sg["workers"] / sg["pop2064"]
    sg["내과전문의1명당40세이상"] = sg["pop40"] / sg["의원_내과전문의"].replace(0, np.nan)
    sg["내과+가정의학1명당40세이상"] = sg["pop40"] / (sg["의원_내과전문의"] + sg["의원_가정의학과"]).replace(0, np.nan)
    sg.to_csv(O / "market_sgg.csv", index=False, encoding="utf-8-sig")

    # ---------------- 역 이용객 ----------------
    card = pd.read_csv(D / "ride" / "card_202610.bin", encoding="utf-8-sig", index_col=False)
    card["key"] = card["역명"].map(norm_station)
    card["tot"] = card["승차총승객수"] + card["하차총승객수"]
    ndays = card["사용일자"].nunique()
    ride = card.groupby("key")["tot"].sum() / ndays
    ic = pd.read_csv(D / "ride" / "incheon_daily.bin", encoding="cp949")
    ic = ic[ic["통행일자"] >= "2026-04-01"]
    icr = ic.groupby("역명")["이용인원"].sum() / ic["통행일자"].nunique()
    icr.index = icr.index.map(norm_station)
    ride_ic = icr.groupby(level=0).sum()

    # ---------------- 역세권표 ----------------
    st = pd.read_excel(D / "stations" / "stations.xlsx", dtype=str)
    st["lat"] = pd.to_numeric(st["역위도"], errors="coerce")
    st["lon"] = pd.to_numeric(st["역경도"], errors="coerce")
    st = st.dropna(subset=["lat", "lon"])
    st["X"], st["Y"] = tf.transform(st["lon"].values, st["lat"].values)
    st["name"] = st["역사명"].map(norm_station)
    gi = [tree.query(shapely.Point(x, y), predicate="intersects") for x, y in zip(st["X"], st["Y"])]
    st["gi"] = [int(i[0]) if len(i) else -1 for i in gi]
    st = st[st["gi"] >= 0].copy()
    st["권역"] = [G["권역"].iat[i] for i in st["gi"]]
    st = st[st["권역"].notna()]
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
            groups.append({"역": nm, "노선": " · ".join(sorted(set(sub["노선명"].str.strip()))), "X": sub["X"].mean(),
                           "Y": sub["Y"].mean(), "gi": int(sub["gi"].iloc[0])})
    S = pd.DataFrame(groups)
    ph = pd.read_csv(next(hd.glob("2.약국정보서비스*.csv")), encoding="cp949", dtype=str)
    ph = ph[ph["시도코드명"].isin(["서울", "인천", "경기"])]
    pX, pY = map(np.asarray, tf.transform(pd.to_numeric(ph["좌표(X)"], errors="coerce").fillna(0).values,
                                          pd.to_numeric(ph["좌표(Y)"], errors="coerce").fillna(0).values))
    cl = h[clinic]
    hs = h[hospital]
    imc = im
    out = []
    for r in S.itertuples(index=False):
        c = shapely.Point(r.X, r.Y)
        b0 = gb[r.gi]
        dc = np.hypot(cl["X"].values - r.X, cl["Y"].values - r.Y)
        same = cl["bank"].values == b0
        dh = np.hypot(hs["X"].values - r.X, hs["Y"].values - r.Y)
        sameh = hs["bank"].values == b0
        di = np.hypot(imc["X"].values - r.X, imc["Y"].values - r.Y)
        samei = imc["bank"].values == b0
        rec = {"권역": G["권역"].iat[r.gi], "시군구": G["sgg"].iat[r.gi], "역": r.역, "노선": r.노선}
        for R in (500, 1000, 1500):
            buf = c.buffer(R, 64)
            idx = tree.query(buf, predicate="intersects")
            idx = idx[gb[idx] == b0]
            fr = np.array([geoms[i].intersection(buf).area for i in idx]) / areas[idx] if len(idx) else np.array([])
            k = f"{R / 1000:g}km"
            for col in ("pop", "pop40", "pop60", "pop2064", "workers"):
                rec[f"{k} {col}"] = float((G[col].values[idx] * fr).sum())
            po = G["pop_old"].values[idx]
            ok = ~np.isnan(po)
            rec[f"{k} 2년증감"] = ((G["pop"].values[idx][ok] * fr[ok]).sum() / (po[ok] * fr[ok]).sum() - 1) if ok.any() else np.nan
            rec[f"{k} 의원 내과전문의"] = int(cl["im"].values[(dc <= R) & same].sum())
            rec[f"{k} 의원 가정의학과"] = int(cl["fm"].values[(dc <= R) & same].sum())
            rec[f"{k} 의원수"] = int(((dc <= R) & same).sum())
            rec[f"{k} 내과의원수"] = int(((di <= R) & samei).sum())
        rec["1.5km 병원급 내과전문의"] = int(hs["im"].values[(dh <= 1500) & sameh].sum())
        rec["1.5km 종합병원이상"] = int(((dh <= 1500) & sameh & hs["종별코드명"].isin(["종합병원", "상급종합"]).values).sum())
        rec["500m 약국"] = int((np.hypot(pX - r.X, pY - r.Y) <= 500).sum())
        near = imc[(di <= 1000) & samei]
        for t in ["검진센터형(5대암 가능)", "내시경·소화기형(3대암)", "초음파 기본형", "외래 기본형", "투석형"]:
            rec[f"1km {t}"] = int((near["유형"] == t).sum())
        rec["1km 야간진료 내과"] = int(near["평일 야간(20시 이후)"].sum())
        rec["1km 최근3년 개원 내과"] = int((near["업력(년)"] < 3).sum())
        rec["일평균 승하차"] = float(ride.get(r.역, np.nan)) if not np.isnan(ride.get(r.역, np.nan)) else float(ride_ic.get(r.역, np.nan))
        lon, lat = inv.transform(r.X, r.Y)
        rec["위도"], rec["경도"] = lat, lon
        out.append(rec)
    T = pd.DataFrame(out)
    bench40 = sg["pop40"].sum() / sg["의원_내과전문의"].sum()
    T["1km 내과1명당40세이상(개원후)"] = T["1km pop40"] / (T["1km 의원 내과전문의"] + 1)
    T["1km 내과+가정1명당40세이상(개원후)"] = T["1km pop40"] / (T["1km 의원 내과전문의"] + T["1km 의원 가정의학과"] + 1)
    T["1.5km 내과1명당40세이상(개원후)"] = T["1.5km pop40"] / (T["1.5km 의원 내과전문의"] + 1)
    T["1km 평균대비"] = T["1km 내과1명당40세이상(개원후)"] / bench40
    T["1.5km 평균대비"] = T["1.5km 내과1명당40세이상(개원후)"] / bench40
    T["1km 직주비"] = T["1km workers"] / T["1km pop2064"].replace(0, np.nan)
    T["1km 60세이상비율"] = T["1km pop60"] / T["1km pop"].replace(0, np.nan)
    T.to_csv(O / "market_station.csv", index=False, encoding="utf-8-sig")
    imo = im[["권역", "시도", "시군구", "요양기관명", "주소", "유형", "im", "fm", "의과의사", "초음파", "골밀도", "유방촬영", "CT", "투석",
              "평일 야간(20시 이후)", "토요일 진료", "일요일 진료", "만성질환관리", "방문진료", "업력(년)", "x", "y"]]
    imo.to_csv(O / "im_clinics.csv", index=False, encoding="utf-8-sig")
    json.dump({"bench40": bench40, "stations": len(T), "ride_matched": int(T["일평균 승하차"].notna().sum()),
               "im_clinics": int(len(im)), "types": im["유형"].value_counts().to_dict()},
              open(O / "market_log.json", "w"), ensure_ascii=False, indent=1)
    print(open(O / "market_log.json").read())


if __name__ == "__main__":
    main()
