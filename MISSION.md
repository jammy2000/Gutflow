# MISSION.md — GutFlow Agent Team Briefing

## 미션
IBS 환자가 Low-FODMAP 식단을 예산 내에서 자동으로 계획하고,
Walmart/Kroger와 연동해 버튼 하나로 주문할 수 있게 한다.

## 에이전트 실행 순서

```
PHASE 1 (순차):
  Agent A (PM)        → /docs/PRD.md, SSOT.md, USER_FLOWS.md
  Agent B (Architect) → /docs/DOMAIN.md, DB.md, API.md

PHASE 2 (병렬):
  Agent C (Budget)    → /docs/BUDGET_RULES.md + /lib/budget_engine.py
  Agent D (Integrations) → /docs/INTEGRATIONS.md + /integrations/*.py

PHASE 3 (순차):
  Agent E (UX)        → Next.js 전체 화면 구현
  Agent F (QA)        → E2E + 유닛 테스트 전체
```

## 각 에이전트 착수 전 필독 파일

| Agent | 필독 파일 |
|-------|-----------|
| A | rules.md |
| B | rules.md, /docs/SSOT.md |
| C | rules.md, /docs/SSOT.md, /docs/DB.md |
| D | rules.md, /docs/SSOT.md, /docs/API.md |
| E | rules.md, /docs/SSOT.md, /docs/USER_FLOWS.md |
| F | rules.md + 모든 /docs/ 파일 |

## 절대 원칙 (모든 에이전트 공통)
1. Medical_Constraint 위반 = 즉시 중단 + 보고
2. 예산 초과 = 자동 재조정 (유저 승인 없이 Tier 1-3만)
3. 품절 = 대체품 제안 (자동 교체 금지)
4. 모든 산출물 = /docs/ 에 Markdown으로 저장
5. API 키 = 환경변수만 (하드코딩 금지)
