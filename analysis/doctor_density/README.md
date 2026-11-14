# 서울·인천·부천 인구당 의사수·의원수·내과전문의수 (구별·행정동별)

- 결과 엑셀: `서울_인천_부천_의사밀도_2026.xlsx` (읽어보기 / 시별 요약 / 구별 / 동별_서울·인천·부천 / 기관목록)
- 결과 CSV: `results/` (`city_summary.csv`, `by_gu.csv`, `by_dong.csv`, `qa_log.json`)

## 자료
| 구분 | 출처 | 기준 |
|---|---|---|
| 의료기관·의사수·진료과목별 전문의수 | 건강보험심사평가원 「전국 병의원 및 약국 현황」 (data.go.kr 15051059) | 2026.9.30 |
| 인구 | 행정안전부 주민등록 인구 및 세대현황 (jumin.mois.go.kr, 전체 읍면동 CSV) | 2026.10 |
| 행정동 경계 | vuski/admdongkor `ver20261001` | 2026.10.1 |

## 재현
```bash
python build_doctor_density.py --hira-dir <심평원 압축 해제 폴더> --pop-csv <주민등록 CSV> \
  --geojson HangJeongDong_ver20261001.geojson --out-dir results
python make_xlsx.py results 서울_인천_부천_의사밀도_2026.xlsx
```
의존성: pandas, shapely(2.x), openpyxl.

## 정의 요약
- 의과 의사수 = 의과 일반의+인턴+레지던트+전문의 (치과·한의 제외)
- 의원수 = 종별 '의원' (치과의원·한의원 제외)
- 내과전문의 = 진료과목코드 01(내과)의 과목별 전문의수 합
- 동 배정 = 기관 좌표를 행정동 경계에 넣어 결정 (심평원 시군구 안에서만 탐색, 동 합계 = 구 합계 검증)
