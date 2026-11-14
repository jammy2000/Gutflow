"""build_doctor_density.py 결과 CSV를 하나의 엑셀 통합문서로 묶는다.

사용: python make_xlsx.py <결과 CSV 폴더> <출력 xlsx 경로>
"""

import json
import sys
from pathlib import Path

import pandas as pd
from openpyxl import load_workbook
from openpyxl.formatting.rule import ColorScaleRule
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

src, out = Path(sys.argv[1]), Path(sys.argv[2])
city = pd.read_csv(src / "city_summary.csv")
gu = pd.read_csv(src / "by_gu.csv")
dong = pd.read_csv(src / "by_dong.csv")
inst = pd.read_csv(src / "institutions.csv", dtype={"행정동코드": str})
qa = json.loads((src / "qa_log.json").read_text(encoding="utf-8"))

inst = inst.rename(columns={"의과의사수": "의과 의사수", "내과전문의": "내과전문의수", "x": "경도", "y": "위도"})
inst = inst[["시도", "시군구", "행정동", "행정동코드", "요양기관명", "종별코드명", "주소",
             "의과 의사수", "내과전문의수", "배정방식", "경도", "위도"]]
inst = inst.sort_values(["시도", "시군구", "행정동", "종별코드명", "요양기관명"])

notes = [
    ("항목", "내용"),
    ("의료기관 자료", "건강보험심사평가원 「전국 병의원 및 약국 현황」 2026.9.30 기준 (공공데이터포털 15051059)"),
    ("인구 자료", f"행정안전부 주민등록 인구 및 세대현황, {qa['인구 기준월']} 기준 (행정동, 총인구: 거주자+거주불명자+재외국민, 외국인 제외)"),
    ("행정동 경계", "vuski/admdongkor ver20261001 (인천 2026.7.1 구 개편, 부천 2024 구 부활 반영)"),
    ("", ""),
    ("의과 의사수", "의과 일반의+인턴+레지던트+전문의. 치과의사·한의사 제외. '전체기관'은 상급종합·종합·병원·요양병원·의원·보건소 등 모든 기관 합계"),
    ("의원 의사수", "종별이 '의원'인 기관(치과의원·한의원 제외)에 근무하는 의과 의사수"),
    ("의원수", "종별 '의원' 개수 (치과의원·한의원 제외, 진료과 무관)"),
    ("내과전문의", "심평원 진료과목정보의 진료과목코드 01(내과) '과목별 전문의수' 합계. 소화기·순환기 등 분과는 모두 내과로 집계됨"),
    ("내과전문의 있는 의원수", "내과 전문의가 1명 이상 근무하는 의원 수 (내과 의원 경쟁 규모의 근사치)"),
    ("/만명", "주민등록인구 1만 명당 값. 인구 1천명당 값은 10으로 나누면 됨"),
    ("", ""),
    ("구 배정", "심평원 시군구 표기 기준"),
    ("동 배정", f"기관 좌표를 행정동 경계에 넣어 배정 (심평원 시군구 안에서만 탐색). 경계 안 {qa['배정방식'].get('경계내', 0):,}곳, "
              f"경계 밖이라 같은 구의 가장 가까운 동으로 배정 {qa['배정방식'].get('최근접', 0)}곳, 좌표 없음 {qa['배정방식'].get('좌표없음', 0)}곳"),
    ("검증", "모든 동의 합계가 구 합계와 일치함" if qa["동 합계=구 합계 (의원수·의사수·내과)"] else "동 합계와 구 합계 불일치 있음 (qa_log 확인)"),
    ("", ""),
    ("해석 주의 1", "분모가 '주민등록 인구'라서 직장·상업 지역(서울 중구·종로구·강남구·서초구, 여의도 등)은 수치가 크게 나옴. 낮 시간 유동인구는 반영되지 않음"),
    ("해석 주의 2", "대학병원이 있는 구·동(종로·서대문·송파·제물포구 등)은 '전체기관' 의사수가 크게 부풀려짐. 1차 의료 경쟁도는 '의원' 기준 열을 볼 것"),
    ("해석 주의 3", "인구가 적은 동(1만 명 미만)은 의원 1~2곳 차이로 비율이 크게 흔들림"),
    ("해석 주의 4", "심평원 인력 신고 기준이라 실제 근무 형태(파트타임 등)와 다를 수 있음"),
]

rename_rate = {
    "의사/만명(전체기관)": "의과의사/만명(전체기관)",
}

with pd.ExcelWriter(out, engine="openpyxl") as xw:
    pd.DataFrame(notes[1:], columns=notes[0]).to_excel(xw, sheet_name="읽어보기", index=False)
    city.rename(columns=rename_rate).to_excel(xw, sheet_name="시별 요약", index=False)
    gu.rename(columns=rename_rate).to_excel(xw, sheet_name="구별", index=False)
    for region in ["서울", "인천", "부천"]:
        dong[dong["권역"] == region].rename(columns=rename_rate).to_excel(xw, sheet_name=f"동별_{region}", index=False)
    inst.to_excel(xw, sheet_name="기관목록", index=False)

wb = load_workbook(out)
head_fill = PatternFill("solid", fgColor="1F4E78")
head_font = Font(color="FFFFFF", bold=True)
for ws in wb.worksheets:
    for c in ws[1]:
        c.fill, c.font = head_fill, head_font
        c.alignment = Alignment(wrap_text=True, vertical="center", horizontal="center")
    ws.row_dimensions[1].height = 36
    ws.freeze_panes = "B2" if ws.title == "읽어보기" else ws.freeze_panes
    headers = [c.value for c in ws[1]]
    for idx, h in enumerate(headers, start=1):
        col = get_column_letter(idx)
        width = 12
        if h in ("주소",):
            width = 60
        elif h in ("요양기관명",):
            width = 30
        elif h in ("내용",):
            width = 120
        elif h in ("시군구", "행정동", "항목"):
            width = 16
        ws.column_dimensions[col].width = width
        fmt = None
        if h and ("/만명" in h):
            fmt = "0.0"
        elif h and ("당 인구" in h or h == "인구" or h.endswith("수") or "의사수" in h or "전문의(" in h):
            fmt = "#,##0"
        if h in ("경도", "위도"):
            fmt = "0.000000"
        if fmt:
            for cell in ws[col][1:]:
                cell.number_format = fmt
    if ws.title == "읽어보기":
        for row in ws.iter_rows(min_row=2):
            for cell in row:
                cell.alignment = Alignment(wrap_text=True, vertical="top")
        continue
    ws.auto_filter.ref = ws.dimensions
    key_col = 3 if ws.title in ("구별",) else (4 if ws.title.startswith("동별") else 2)
    ws.freeze_panes = ws.cell(row=2, column=key_col)
    # 주요 비율 열에 색 척도 (낮음=흰색, 높음=진한 파랑)
    if ws.title != "기관목록":
        n = ws.max_row
        for idx, h in enumerate(headers, start=1):
            if h in ("의원/만명", "내과전문의/만명(의원)", "의원 의사/만명"):
                col = get_column_letter(idx)
                ws.conditional_formatting.add(
                    f"{col}2:{col}{n}",
                    ColorScaleRule(start_type="percentile", start_value=5, start_color="FFFFFF",
                                   end_type="percentile", end_value=95, end_color="5B9BD5"))
wb.save(out)
print("saved", out)
