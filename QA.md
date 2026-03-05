# QA.md — GutFlow QA 시나리오 및 합격 기준

이 문서는 QA Agent(Agent F)가 관리하는 전체 테스트 시나리오와 합격 기준을 정의합니다.  
**P0 테스트는 배포 전 반드시 100% 통과해야 합니다.**

---

## Category A — FODMAP Compliance (P0, 배포 차단)

| ID | 시나리오 | 기대 결과 | 현재 상태 |
|:---|:---|:---|:---|
| A1 | 생성된 식단에 `Strict_Exclude` 재료 없음 | 0건 포함 | ✅ Pass |
| A2 | Tier 1 브랜드 교체 후 FODMAP 안전성 유지 | 대체 재료 모두 Green | ✅ Pass |
| A3 | `Natural flavors` → `UNCERTAIN`으로 표시 | grade = "uncertain" | ✅ Pass (master_validator) |
| A4 | avocado + cherry + coconut milk → STACKING 경고 | stacking_warning = true | ✅ Pass |
| A5 | 비건 식단: 유제품/육류 없이 FODMAP 검증 | 모두 Green/Yellow | ✅ Pass |
| A6 | 할랄 식단: 돼지고기/알코올 없이 FODMAP 검증 | 모두 Green/Yellow | ✅ Pass |
| A7 | 알레르기 제외 설정 → FODMAP-safe 재료도 제외 | 해당 재료 0건 | ✅ Pass |

---

## Category B — Budget Compliance (P0, 배포 차단)

| ID | 시나리오 | 기대 결과 | 현재 상태 |
|:---|:---|:---|:---|
| B1 | 최종 장바구니 합계 ≤ 예산 + 5% 버퍼 | total ≤ budget × 1.05 | ✅ Pass |
| B2 | Tier 1 브랜드 교체 → 비용 절감 + FODMAP 안전 | savings > 0, grade ≠ red | ✅ Pass |
| B3 | Tier 2 재료 교체 후 식단 구조 유지 | servings 변경 없음 | ✅ Pass |
| B4 | Tier 3 레시피 교체: 점심 우선 교체 | 저녁 > 아침 > 점심 순으로 보존 | ✅ Pass |
| B5 | Tier 4 일수 단축: 자동 적용 금지, 사용자 승인 필요 | status = "needs_user_input" | ✅ Pass |
| B6 | 불가능한 예산 → 최소 필요 예산 안내 | status = "impossible", min_budget 표시 | ⚠️ Partial |
| B7 | 세금 8.5% 포함 계산 | est_total = subtotal × 1.085 | ✅ Pass |
| B8 | 가격 캐시 15분 초과 → 결제 전 재조회 | re-fetch triggered | 🔲 TODO |

---

## Category C — Integration / Cart (P0, 배포 차단)

| ID | 시나리오 | 기대 결과 | 현재 상태 |
|:---|:---|:---|:---|
| C1 | Walmart 장바구니 URL에 affiliate tag 포함 | URL contains `wmlspartner=` | 🔲 TODO |
| C2 | Kroger 장바구니 URL에 affiliate tag 포함 | URL contains kroger affiliate param | 🔲 TODO |
| C3 | 품절 → 대체 제안(자동 적용 금지) | status = "pending_approval" | ⚠️ Partial |
| C4 | 대체품 없음 → 사용자 알림 | flagged item 표시 | ✅ Pass |
| C5 | 결제 시 가격 20% 이상 상승 → 경고 | price_alert = true | 🔲 TODO |
| C6 | API 타임아웃 → 캐시 가격 사용 + 경고 표시 | fallback_mode = true | ⚠️ Partial |

---

## Category D — UX / Notifications (P1)

| ID | 시나리오 | 기대 결과 | 현재 상태 |
|:---|:---|:---|:---|
| D1 | ICS 캘린더 파일 모든 식사 일정 포함 | 유효한 .ics 파일 생성 | 🔲 TODO |
| D2 | 식사 30분 전 알림 예약 | notification scheduled | 🔲 TODO |
| D3 | 대형 텍스트 요리 모드 (≥18px) | font-size ≥ 18px | ✅ Pass |
| D4 | 오프라인 모드: 마지막 캐시 식단 표시 | cached plan 렌더링 | 🔲 TODO |
| D5 | 리테일러 전환 (Walmart↔Kroger) → 2초 내 가격 변경 | update < 2000ms | ✅ Pass |
| D6 | 비동기 처리 중 로딩 상태 표시 | loading indicator 표시 | ✅ Pass |

---

## 합격 기준 요약

- **P0 (A, B, C)**: 100% 통과 필수. 미통과 시 배포 차단.
- **P1 (D)**: 80% 통과 목표. 미통과 시 이슈 트래킹 후 다음 스프린트 처리.
- **테스트 자동화**: GitHub Actions에서 PR마다 A/B Category 자동 실행.

---

## 주요 제약 사항 (Constraints)

1. **FODMAP 규칙은 절대 협상 불가** — 어떤 최적화(예산, 가격)도 Medical_Constraint 위반 불가.
2. **품절 대체는 반드시 사용자 승인 후 적용** — `auto_applied: false` 필수.
3. **세금 표시**: UI에서 subtotal / est_tax / est_total 반드시 분리 표기.
4. **"Final amount confirmed at checkout" 문구** 결제 페이지에 항상 표시.
