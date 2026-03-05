---
description: Run one iteration of the GutFlow Stitch build loop
---

// turbo-all

## Stitch Loop — 한 번의 반복 실행

1. `next-prompt.md`에서 현재 바톤(page 이름 + 프롬프트)을 읽는다
2. `stitch.json`에서 Stitch 프로젝트 ID를 읽는다
3. `mcp_StitchMCP_generate_screen_from_text`로 페이지를 생성한다
4. `mcp_StitchMCP_get_screen`으로 생성된 화면의 `htmlCode.downloadUrl`을 가져온다
5. HTML 파일을 다운로드하여 `queue/{page}.html`에 저장한다:
```
curl -L "<downloadUrl>" -o queue/{page}.html
```
6. Next.js 라우트로 통합한다 — `src/app/{page}/page.tsx` 생성
7. `SITE.md` Sitemap 섹션에 해당 페이지를 `[x]`로 체크한다
8. `next-prompt.md`에 다음 바톤(다음 페이지)을 작성한다
