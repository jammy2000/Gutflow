# ============================================================
# ANTIGRAVITY AGENT TEAM — GutFlow App
# Drop this folder into your project root
# ============================================================

## FILE STRUCTURE
```
.antigravity/
├── rules.md              ← 전체 팀 공유 헌법 (이 파일)
├── agents/
│   ├── A_pm.md           ← Product/Spec Agent
│   ├── B_architect.md    ← Architect Agent
│   ├── C_budget.md       ← Budget Engine Agent
│   ├── D_integrations.md ← Integrations Agent
│   ├── E_ux.md           ← App UX Agent
│   └── F_qa.md           ← QA/Verification Agent
└── MISSION.md            ← 전체 미션 브리핑
```

---

# rules.md — SYSTEM CONSTITUTION (모든 에이전트 공유)

## 1. 프로젝트 정체성
- 앱명: GutFlow
- 목적: IBS 환자를 위한 Low-FODMAP 식단 자동화 + 장바구니 연동
- 타겟: 미국 유저 (Walmart, Kroger 연동)

## 2. MEDICAL CONSTRAINT (최상위 법전 — 위반 불가)
```json
{
  "Protocol": "Low-FODMAP Diet",
  "Legal_Disclaimer": "Analysis logic designed based on Monash University public guidelines.",
  "Strict_Exclude": [
    "Garlic", "Onion", "Wheat", "Honey", "Apples", "Milk", "Legumes",
    "High Fructose Corn Syrup", "Inulin", "Chicory Root",
    "Sorbitol", "Xylitol", "Mannitol", "Maltitol"
  ],
  "Safe_Alternatives": {
    "Garlic": "Garlic-infused oil",
    "Onion": "Spring onion (green part only)",
    "Wheat": "Rice, Quinoa, Gluten-free oats",
    "Milk": {
      "default": "Lactose-free milk",
      "vegan": "Rice milk (preferred) → Almond milk (serving ≤200ml/day)",
      "note": "Soy milk PROHIBITED — GOS content. All agents follow SSOT milk_alternatives."
    }
  },
  "Double_Check": "REQUIRED on every recipe generation",
  "SSOT_Priority": "All agents must follow /docs/SSOT.md over individual agent docs on conflicts"
}
```

## 3. 기술 스택 (변경 금지)
- Frontend: Next.js 14 App Router + Tailwind CSS
- Backend: FastAPI (Python)
- Database: Supabase (Auth + PostgreSQL)
- AI: claude-sonnet-4-6
- Deployment: Vercel (FE) + Railway (BE)
- Price API: BlueCart API → Walmart/Kroger Affiliate API (Phase 2)

## 4. 아키텍처 원칙
- Clean Architecture: 비즈니스 로직과 UI 철저 분리
- Expo(React Native) 이식 고려하여 설계
- API 키는 반드시 환경변수로만 관리
- 가격 데이터 캐싱: 15분 단위 (Supabase price_cache 테이블)
- 모든 에이전트 산출물은 /docs/ 폴더에 Markdown으로 저장

## 5. 에이전트 간 의존성 순서
```
A(PM) → B(Architect) → C(Budget) + D(Integrations) → E(UX) → F(QA)
```
B가 완료되기 전까지 C, D, E는 착수 금지.
C와 D는 병렬 실행 가능.

## 6. 필수 사용자 입력 (P0 — 없으면 "estimate mode" 경고)
```
zip_code              필수 (가격은 매장별로 다름)
retailer_preference   walmart | kroger | both
fulfillment_mode      delivery | pickup
duration_days         1 / 2 / 3 / 5 / 7
people                1 / 2 / 3 / 4
budget                사용자 입력 (세금 포함 총액 기준)
diet_preferences      low_fodmap(default) | vegan | halal
allergies             자유 입력 → 태그 변환
```
zip_code 없으면: 전국 평균가 사용 + UI에 "Prices estimated — add ZIP for accuracy" 표시.

## 7. 세금 정책 (Budget Engine + UI 공통)
```
- 세금은 추정치: subtotal x 0.085 (MVP 고정값)
- 실제 세금은 결제 시 변동 가능 (주/카운티/품목별 상이)
- Budget 판정 기준: subtotal 기준으로 판단
- tax_buffer: subtotal x 0.085 별도 표시
- UI 문구 (P0 고정):
    "Subtotal: $XX.XX"
    "Est. Tax (~8.5%): $X.XX"
    "Est. Total: $XX.XX"
    "Final amount confirmed at checkout"
```

## 8. 대체품 정책 (Substitution Policy — 전 에이전트 준수)
```
Type A — Brand Swap (자동 허용):
  - 동일 성분, 동일 FODMAP 등급
  - 예: Horizon Organic milk → Great Value lactose-free milk
  - 조건: FODMAP 재검증 필수 + adjustments_applied에 기록
  - UI: 변경 내역 표시 (사용자 승인 불필요)

Type B — OOS Substitute (승인 필수):
  - 다른 제품/성분으로 교체 가능성
  - 예: 연어 품절 → 닭가슴살 제안
  - 조건: 반드시 사용자 승인 후 적용
  - UI: "X is unavailable — Replace with Y?" 모달

자동 교체 절대 금지: Type B를 자동 적용하는 코드 작성 금지
```

## 9. 결제 현실 (Checkout Reality — UX/QA 공통 기준)
```
Phase 1 (MVP):
  - Cart deep-link: 장바구니를 "열어주는" 수준
  - 최종 결제는 Walmart/Kroger 외부 사이트에서 진행
  - UI 문구: "Checkout at Walmart →" (새 탭 오픈)
  - Affiliate tag 포함 필수

Phase 2 (파트너 승인 후):
  - Direct cart management API
  - 앱 내 결제 가능
  - ETA: Walmart 4-8주, Kroger 2-4주 승인 소요

UX/QA는 Phase 1 기준으로만 구현. Phase 2는 stub 처리.
```

## 10. 공통 출력 규칙
- 코드 생성 시 TypeScript strict mode
- 모든 FODMAP 판정에는 근거 명시 ("Monash University public guidelines 기반")
- 모든 가격 변경/대체 이력은 adjustments_applied 배열에 기록 (투명성)
- 품절/가격초과 시 반드시 fallback 로직 포함
- retailer=both 이면 총액 기준 최저가 retailer 자동 추천 + 사용자 토글 제공
