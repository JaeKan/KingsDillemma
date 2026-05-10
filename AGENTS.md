# 에이전트·기여자 안내

## 에이전트 워크플로 비용 절감 (Part A)

에이전트·인간 기여자 모두에게 동일한 기준을 두어 토큰·반복 비용을 줄인다. 실행 습관·톤은 [`.cursor/rules/kingsdillemma-agent-core.mdc`](.cursor/rules/kingsdillemma-agent-core.mdc), [`kingsdillemma-app-tsx.mdc`](.cursor/rules/kingsdillemma-app-tsx.mdc)에 요약한다.

1. **머지·완료 선언**: 작업을 끝냈다고 하기 전에 로컬에서 **`npm run verify`**가 성공해야 한다. (= 타입·린트·테스트 일괄 통과.)

2. **`App.tsx` 부분 읽기**: [`src/App.tsx`](src/App.tsx) (~3766줄)는 통째로 로드하지 않는다. `grep`/레포 검색으로 위치를 좁힌 뒤 **필요한 라인 구간만** 읽는다. 상세 절차: [`kingsdillemma-app-tsx.mdc`](.cursor/rules/kingsdillemma-app-tsx.mdc).

3. **신규 UI 경로**: 가능하면 **`src/components/`** 또는 **`src/features/`**에 **새 파일**로 두고, 루트 `App.tsx`에는 연결( import 등)만 한다.

4. **한국어 문자열**: UI 문구 추가·수정은 **`src/resources/ko/`**에 두고(기존 패턴) 코드에서 참조한다.

5. **Netlify·공유 경계**: 서버리스는 **`netlify/functions/`**, 앱과 맞닿는 타입·API 클라이언트 등은 **`shared/`**를 본다.

6. **`check`의 범위**: **`npm run check`** = `tsc --noEmit` + **`npm run lint`** (`eslint .`). 타입·린트만이며 **테스트는 포함하지 않는다**.

7. **`verify`에 테스트 포함**: **`npm run verify`** = `npm run check && npm test`. 머지·PR 직전 최종 검증은 **`verify`**로 통일한다.

8. **스크립트 단일 출처**: 아래 [스크립트 요약](#스크립트-요약)은 빠른 참고용이며, **정확한 정의는 항상** [`package.json`](package.json) 의 `"scripts"`이다.

9. **Cursor 규칙**: 반복 지침은 **[`.cursor/rules/`](.cursor/rules/)**에 두고, 이 문서와 상호 참조해 **한 곳만 장문으로 풀지 않는다** (요점은 규칙 파일, 상세 표/경계는 여기서 링크).

## 머지 전 필수

**Part A 1·7번**: `npm run verify` 성공(타입·린트·테스트).

## 스크립트 요약

| 스크립트 | 내용 |
|----------|------|
| `check` | `tsc --noEmit` + `npm run lint` (`eslint .`) |
| `test` | `tsx`로 `tests/agenda-state.test.ts`, `tests/agenda-api.test.ts` 실행 |
| `verify` | `check` 후 `test` (`npm run check && npm test`) |
| `build` | Vite 프론트 빌드 (`vite build`) |

전체 정의: [package.json](package.json) 의 `"scripts"`.

## Netlify

- **함수**: `netlify/functions/` (Part A 5번과 동일 축).
- 배포·로컬은 `netlify dev` 등 기존 흐름 유지. 프로덕션 번들은 `npm run build`로 생성.

## 비용·효율 (참고)

- **대용량 진입점**: `src/App.tsx` — Part A 2번·[`kingsdillemma-app-tsx.mdc`](.cursor/rules/kingsdillemma-app-tsx.mdc).
- **UI 모듈 예**: [`src/components/DilemmaUI.tsx`](src/components/DilemmaUI.tsx) 등 — 루트에서만 붙이기(Part A 3번).
- **테스트**: [`tests/`](tests/) — `verify`에 포함(Part A 7번).
