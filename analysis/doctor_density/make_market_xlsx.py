"""시장조사 첨부 엑셀 만들기: python make_market_xlsx.py <metro_market 결과 폴더> <출력 폴더>"""
import sys
import numpy as np
import pandas as pd
from openpyxl import load_workbook
from pyproj import Transformer

S, D = sys.argv[1], sys.argv[2]
T = pd.read_csv(S + '/market_station_scored.csv'); G = pd.read_csv(S + '/market_sgg.csv'); im = pd.read_csv(S + '/im_clinics.csv')
G['2년증감'] = G['2년증감'].replace([np.inf, -np.inf], np.nan)
# (역, 권장 모델, 평수, 2~3층 임대료 천원/㎡·월, 임대료 기준 상권)
final = [('명학', 'B 내시경 3대암', 55, 14.3, '안양역'), ('마산', 'B→A 단계 확장', 60, 10.6, '경기 평균'), ('월계', 'A 검진센터', 80, 11.6, '상계역 환산'),
         ('송내', 'A 검진센터+야간', 85, 10.4, '부천역'), ('소새울', 'B 내시경 3대암', 55, 10.4, '부천역'), ('숭실대입구', 'B 내시경 3대암', 55, 17.9, '노량진 환산'),
         ('갈산', 'B+기업검진', 60, 10.2, '인천 평균'), ('운정', 'C 1인 초음파·위내시경', 40, 10.3, '파주시청'), ('신연수', 'C 만성질환·방문진료', 40, 11.5, '연수역'),
         ('금정', 'A 검진센터+야간', 85, 14.3, '안양역')]
tf = Transformer.from_crs("EPSG:4326", "EPSG:5179", always_xy=True)
im['X'], im['Y'] = tf.transform(im.x.values, im.y.values)
rows, comp = [], []
for i, (st, model, py, rate, src) in enumerate(final, 1):
    r = T[T.역 == st].iloc[0].to_dict()
    rows.append({'순위': i, '역': st, '권역': r['권역'], '시군구': r['시군구'], '노선': r['노선'], '권장 모델': model, '권장 평수': py,
                 '임대료 기준(천원/㎡·월, 2~3층)': rate, '임대료 상권': src, '예상 월세(원)': round(rate * py * 3.3058 * 1000, -4),
                 '1km 40세+': round(r['1km pop40']), '1km 60세+ 비율': round(r['1km 60세이상비율'], 3), '1km 2년 증감': r['1km 2년증감'],
                 '1km 의원 내과전문의': r['1km 의원 내과전문의'], '1km 의원 가정의학과': r['1km 의원 가정의학과'], '1km 평균대비': round(r['1km 평균대비'], 2),
                 '1.5km 평균대비': round(r['1.5km 평균대비'], 2), '1.5km 병원급 내과전문의': r['1.5km 병원급 내과전문의'], '일평균 승하차': r['일평균 승하차'],
                 '1km 직주비': round(r['1km 직주비'], 2), '500m 약국': r['500m 약국'], '위도': r['위도'], '경도': r['경도']})
    X, Y = tf.transform(r['경도'], r['위도'])
    im['거리(m)'] = np.hypot(im.X - X, im.Y - Y).round()
    n = im[im['거리(m)'] <= 1000].sort_values('거리(m)').copy(); n.insert(0, '후보 역', st); comp.append(n)
F = pd.DataFrame(rows); C = pd.concat(comp).drop(columns=['X', 'Y'])
notes = pd.DataFrame([
    ('의료기관', '건강보험심사평가원 전국 병의원 및 약국 현황 2026.9.30'),
    ('인구', '행정안전부 주민등록인구 2026.10 (행정동, 연령별), 증감은 2024.10 대비'),
    ('직장인구', '국민연금공단 가입 사업장 내역 2026.9 (사업장 소재 행정동, 본사 일괄 신고 과대 가능)'),
    ('역', '철도산업정보센터 도시철도역사정보 2026.6.30, 환승역 합침'),
    ('승하차', '서울 교통카드 2026.10 일평균(수도권 전 노선), 인천교통공사 2026.4~6 일평균'),
    ('임대료', '한국부동산원 상업용부동산 임대동향 중대형상가 층별 임대료 2026년 2분기'),
    ('개·폐업·면적', '서울시 의원 인허가 정보'),
    ('유형 분류', '검진센터형=유방촬영기+초음파, 다인형=내과 2명+ 또는 소화기 명칭, 초음파 기본형, 외래 기본형, 투석형=인공신장기. 인천 부평·서해·서울 광진 검진기관 목록(152곳)으로 검증'),
    ('평균대비', '반경 안 40세+ ÷ (의원 내과전문의 + 1) 을 분석 지역 평균 2,941명으로 나눈 값'),
    ('비용', '인테리어 평당 250~300만원, 장비는 업계 통상 견적 범위의 대략치')], columns=['항목', '내용'])
out = D + '/내과개원_시장조사_2026.xlsx'
with pd.ExcelWriter(out, engine='openpyxl') as xw:
    notes.to_excel(xw, sheet_name='읽어보기', index=False)
    F.to_excel(xw, sheet_name='후보지 10곳', index=False)
    C.to_excel(xw, sheet_name='후보지별 경쟁 내과', index=False)
    G.to_excel(xw, sheet_name='시군구 시장표', index=False)
    T.drop(columns=['c1', 'c15', 'dem', 'ride', 'hosp', 'g'], errors='ignore').to_excel(xw, sheet_name='역세권 시장표', index=False)
    im.drop(columns=['X', 'Y', '거리(m)']).to_excel(xw, sheet_name='내과 의원 유형', index=False)
wb = load_workbook(out)
for ws in wb.worksheets:
    ws.freeze_panes = 'B2'; ws.auto_filter.ref = ws.dimensions
    for col in ws.columns:
        ws.column_dimensions[col[0].column_letter].width = min(40, max(10, len(str(col[0].value)) + 4))
wb.save(out)
print('saved', out, len(F), len(C))
