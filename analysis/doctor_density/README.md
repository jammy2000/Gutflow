# 서울·인천·부천·일산·김포 인구당 의사수·의원수·내과전문의수와 내과 개원 후보지

- 결과 엑셀: `서울·인천·부천·일산·김포_의사밀도_개원후보지_2026.xlsx` (읽어보기 / 시별 요약 / 구별 / 개원 후보지 / 후보지 방법 / 동별_권역 / 기관목록)
- 결과 CSV: `results/` (`city_summary.csv`, `by_gu.csv`, `by_dong.csv`, `site_candidates.csv`, `qa_log.json`, `site_log.json`)
- 지도 페이지 원본: `dashboard/index.html` (데이터: `export_map_data.py`)
- 일산 = 고양시 일산동구·일산서구, 김포 = 김포시

## 자료
| 구분 | 출처 | 기준 |
|---|---|---|
| 의료기관·의사수·진료과목별 전문의수 | 건강보험심사평가원 「전국 병의원 및 약국 현황」 (data.go.kr 15051059) | 2026.9.30 |
| 인구 | 행정안전부 주민등록 인구 및 세대현황 (jumin.mois.go.kr, 전체 읍면동 CSV) | 2026.10, 2024.10 |
| 연령별 인구 | 행정안전부 연령별 인구현황 (10세 단위, 전체 읍면동 CSV) | 2026.10 |
| 행정동 경계 | vuski/admdongkor `ver20261001` | 2026.10.1 |

## 재현
```bash
python build_doctor_density.py --hira-dir <심평원 압축 해제 폴더> --pop-csv <주민등록 CSV> \
  --geojson HangJeongDong_ver20261001.geojson --out-dir results
python site_search.py --hira-dir <심평원 폴더> --age-csv <연령별 CSV> --pop-old-csv <2024.10 CSV> \
  --geojson HangJeongDong_ver20261001.geojson --dong-csv results/by_dong.csv --out-dir results
python make_xlsx.py results 서울·인천·부천·일산·김포_의사밀도_개원후보지_2026.xlsx
python export_map_data.py results HangJeongDong_ver20261001.geojson <지도 데이터 폴더>
```
의존성: pandas, shapely(2.1+), pyproj, openpyxl.

## 정의 요약
- 의과 의사수 = 의과 일반의+인턴+레지던트+전문의 (치과·한의 제외)
- 의원수 = 종별 '의원' (치과의원·한의원 제외)
- 내과전문의 = 진료과목코드 01(내과)의 과목별 전문의수 합
- 동 배정 = 기관 좌표를 행정동 경계에 넣어 결정 (심평원 시군구 안에서만 탐색, 동 합계 = 구 합계 검증)

## 개원 후보지 방법 (site_search.py)
- 생활권 중심: 동 안 약국·의원·치과의원·한의원 위치 중 나머지와의 거리 합이 가장 작은 실제 점포 위치 (점포 3곳 미만이면 동 경계 중심)
- 수요: 반경 1.5km 원 안의 40세 이상 인구 (동 안 균일 분포 가정, 면적 비례), 서울·인천·경기 전체 동 포함
- 경쟁: 반경 안 의원 근무 내과전문의 수 (가정의학과·병원급 내과는 참고 열)
- 한강 남북, 영종·강화·옹진 섬은 서로 다른 생활권
- 지표: 내과전문의 1명당 생활권 40세 이상 인구, 분석 지역 평균 대비 배수
- 반경 1km·2km에서도 평균의 1.3배 이상이면 '반경 바꿔도 유지'

## 역세권 후보 (station_search.py, station_maps.py)
- 역 위치: 철도산업정보센터 「전체_도시철도역사정보」 2026.6.30 (data.kric.go.kr). 환승역·표기 차이(…역)는 합침
- 역 반경 500m·1km·1.5km의 40세 이상 인구와 의원 내과전문의, 1km 가정의학과, 1.5km 병원급 내과, 500m 점포 수
- 지표: 1km 40세 이상 ÷ (경쟁 의원 내과전문의 + 개원하는 나 1명), 분석 지역 평균 대비
- 결과: `results/station_candidates.csv`, 지도: `역세권_추천5_지도.png`
