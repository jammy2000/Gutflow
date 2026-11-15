"""역세권 후보 지도 그리기.

사용: python station_maps.py --hira-dir ... --age-csv ... --geojson ... --stations-csv station_candidates.csv
         --stations-xlsx 전체_도시철도역사정보.xlsx --names 마산,솔밭공원,... --out out.png [--cols 4]

각 칸: 동별 40세 이상 인구 밀도(명/km², 파랑), 반경 500m·1km 원(점선), 의원 내과(빨강, 크기=내과전문의 수),
가정의학과 의원(주황 삼각형), 내과전문의가 있는 병원급(보라 네모, 숫자=내과전문의 수), 주변 역(회색), 대상 역(검은 별).
"""

import argparse
import json
import sys
from pathlib import Path

import koreanize_matplotlib  # noqa: F401  (한글 글꼴)
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
import shapely  # noqa: E402
from matplotlib.collections import PatchCollection  # noqa: E402
from matplotlib.patches import Circle, Polygon as MplPolygon  # noqa: E402
from pyproj import Transformer  # noqa: E402
from shapely.geometry import shape  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_doctor_density import IM_CODE  # noqa: E402
from site_search import AGE40, AREA, FM_CODE, read_mois  # noqa: E402

HALF = 1700  # 지도 반폭(m)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--hira-dir", required=True, type=Path)
    ap.add_argument("--age-csv", required=True, type=Path)
    ap.add_argument("--geojson", required=True, type=Path)
    ap.add_argument("--stations-csv", required=True, type=Path)
    ap.add_argument("--stations-xlsx", required=True, type=Path)
    ap.add_argument("--names", required=True)
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--cols", type=int, default=4)
    ap.add_argument("--dpi", type=int, default=110)
    a = ap.parse_args()
    tf = Transformer.from_crs("EPSG:4326", "EPSG:5179", always_xy=True)

    h = pd.read_csv(next(a.hira_dir.glob("1.병원정보서비스*.csv")), encoding="cp949", dtype=str)
    h = h[h["시도코드명"].isin(["서울", "인천", "경기"])].copy()
    d = pd.read_csv(next(a.hira_dir.glob("5.*진료과목정보*.csv")), encoding="cp949", dtype=str)
    d["n"] = pd.to_numeric(d["과목별 전문의수"], errors="coerce").fillna(0)
    h["im"] = h["암호화요양기호"].map(d[d["진료과목코드"] == IM_CODE].groupby("암호화요양기호")["n"].sum()).fillna(0)
    h["fm"] = h["암호화요양기호"].map(d[d["진료과목코드"] == FM_CODE].groupby("암호화요양기호")["n"].sum()).fillna(0)
    h[["x", "y"]] = h[["좌표(X)", "좌표(Y)"]].apply(pd.to_numeric, errors="coerce")
    h = h.dropna(subset=["x", "y"])
    h["X"], h["Y"] = tf.transform(h["x"].values, h["y"].values)
    clinic = h["종별코드명"] == "의원"
    hosp = h["종별코드명"].isin(["병원", "종합병원", "상급종합"]) & (h["im"] > 0)

    age = read_mois(a.age_csv)
    cols = {c.split("_")[-1]: c for c in age.columns if "_계_" in c}
    age["pop40"] = age[[cols[k] for k in AGE40]].sum(axis=1)
    p40 = age.set_index("code")["pop40"]
    gj = json.loads(a.geojson.read_text(encoding="utf-8"))
    polys = []
    for f in gj["features"]:
        p = f["properties"]
        if p["sidonm"] in AREA:
            g = shapely.transform(shape(f["geometry"]), lambda xy: np.column_stack(tf.transform(xy[:, 0], xy[:, 1])))
            dens = p40.get(p["adm_cd2"], 0) / (g.area / 1e6)
            polys.append((g, dens, p["adm_nm"].split(" ")[-1]))

    st_all = pd.read_excel(a.stations_xlsx, dtype=str)
    st_all[["lat", "lon"]] = st_all[["역위도", "역경도"]].apply(pd.to_numeric, errors="coerce")
    st_all = st_all.dropna(subset=["lat", "lon"])
    st_all["X"], st_all["Y"] = tf.transform(st_all["lon"].values, st_all["lat"].values)
    st_all["nm"] = st_all["역사명"].str.replace(r"\(.*?\)", "", regex=True).str.strip()

    sc = pd.read_csv(a.stations_csv)
    names = [n.strip() for n in a.names.split(",") if n.strip()]
    n = len(names)
    ncol = min(a.cols, n)
    nrow = int(np.ceil(n / ncol))
    fig, axes = plt.subplots(nrow, ncol, figsize=(4.6 * ncol, 5.0 * nrow), squeeze=False)
    cmap = plt.get_cmap("Blues")
    vmax = 25000
    for ax, nm in zip(axes.flat, names):
        r = sc[sc["역"] == nm].iloc[0]
        cx, cy = tf.transform(r["경도"], r["위도"])
        box = shapely.box(cx - HALF, cy - HALF, cx + HALF, cy + HALF)
        patches, colors = [], []
        for g, dens, dn in polys:
            if not g.intersects(box):
                continue
            for part in getattr(g, "geoms", [g]):
                patches.append(MplPolygon(np.asarray(part.exterior.coords), closed=True))
                colors.append(cmap(min(dens, vmax) / vmax * 0.85 + 0.05))
        ax.add_collection(PatchCollection(patches, facecolors=colors, edgecolors="#ffffff", linewidths=0.8, zorder=1))
        for g, dens, dn in polys:
            if g.intersects(box):
                c = g.intersection(box).representative_point()
                ax.text(c.x, c.y, dn, fontsize=6.5, color="#334", alpha=0.75, ha="center", va="center", zorder=2)
        for R, ls in ((500, ":"), (1000, "--")):
            ax.add_patch(Circle((cx, cy), R, fill=False, ls=ls, lw=1.1, ec="#222", zorder=3))
        win = lambda df: df[(abs(df["X"] - cx) < HALF) & (abs(df["Y"] - cy) < HALF)]  # noqa: E731
        oc = win(h[clinic & (h["im"] == 0) & (h["fm"] == 0)])
        ax.scatter(oc["X"], oc["Y"], s=4, c="#9aa0a6", zorder=4, linewidths=0)
        fm = win(h[clinic & (h["fm"] > 0) & (h["im"] == 0)])
        ax.scatter(fm["X"], fm["Y"], s=30, marker="^", c="#f29900", edgecolors="white", linewidths=0.5, zorder=5)
        im = win(h[clinic & (h["im"] > 0)])
        ax.scatter(im["X"], im["Y"], s=25 + 30 * im["im"], c="#d93025", edgecolors="white", linewidths=0.6, zorder=6)
        for _, q in im[im["im"] >= 2].iterrows():
            ax.text(q["X"], q["Y"], str(int(q["im"])), fontsize=6, color="white", ha="center", va="center", zorder=7)
        hp = win(h[hosp])
        ax.scatter(hp["X"], hp["Y"], s=70, marker="s", c="#7b1fa2", edgecolors="white", linewidths=0.6, zorder=6)
        for _, q in hp.iterrows():
            ax.text(q["X"] + 60, q["Y"] + 60, f"{q['요양기관명'][:8]}({int(q['im'])})", fontsize=6.5, color="#4a148c", zorder=8)
        so = win(st_all[st_all["nm"].str.replace(r"(?<=..)역$", "", regex=True) != nm])
        so = so.drop_duplicates("nm")
        ax.scatter(so["X"], so["Y"], s=22, marker="D", c="#5f6368", zorder=6)
        for _, q in so.iterrows():
            ax.text(q["X"] + 50, q["Y"] - 110, q["nm"], fontsize=7, color="#3c4043", zorder=8)
        ax.scatter([cx], [cy], s=260, marker="*", c="black", edgecolors="white", linewidths=0.8, zorder=9)
        ax.set_xlim(cx - HALF, cx + HALF)
        ax.set_ylim(cy - HALF, cy + HALF)
        ax.set_aspect("equal")
        ax.set_xticks([])
        ax.set_yticks([])
        g = r["1km 2년 인구 증감률"]
        ax.set_title(
            f"{r['권역']} {nm}역 ({r['노선']})\n"
            f"1km 40세+ {r['1km 40세+'] / 1e4:.1f}만 · 의원 내과전문의 {int(r['1km 의원 내과전문의'])}명 · "
            f"평균의 {r['1km 평균 대비']:.1f}배\n"
            f"1.5km {r['1.5km 평균 대비']:.1f}배 · 가정의학과 {int(r['1km 가정의학과 전문의'])} · "
            f"병원급 내과 {int(r['1.5km 병원급 내과전문의'])} · 2년 {g * 100:+.0f}%",
            fontsize=8.5, loc="left")
    for ax in list(axes.flat)[n:]:
        ax.axis("off")
    fig.text(0.01, 0.003,
             "파랑: 동별 40세 이상 인구 밀도 · 빨강: 의원 내과(숫자=내과전문의 수) · 주황▲: 가정의학과 의원 · "
             "보라■: 병원급(내과전문의 수) · 회색◆: 다른 역 · 점선 원: 500m, 1km",
             fontsize=8)
    fig.tight_layout(rect=(0, 0.015, 1, 1))
    fig.savefig(a.out, dpi=a.dpi)
    print("saved", a.out)


if __name__ == "__main__":
    main()
