# 에이전트·기여자 안내

## 에이전트 워크플로 비용 절감 (Part A)

에이전트·인간 기여자 모두에게 동일한 기준을 두어 토큰·반복 비용을 줄인다. 실행 습관·톤은 [`.cursor/rules/kingsdillemma-agent-core.mdc`](.cursor/rules/kingsdillemma-agent-core.mdc), [`kingsdillemma-app-tsx.mdc`](.cursor/rules/kingsdillemma-app-tsx.mdc)에 요약한다.

1. **머지·완료 선언**: 작업을 끝냈다고 하기 전에 로컬에서 **`npm run verify`**가 성공해야 한다. (= 타입·린트·테스트 일괄 통과.)

2. **`App.tsx` 부분 읽기**: [`src/App.tsx`](src/App.tsx) (~3766줄)는 통째로 로드하지 않는다. `grep`/레포 검색으로 위치를 좁힌 뒤 **필요한 라인 구간만** 읽는다. 상세 절차: [`kingsdillemma-app-tsx.mdc`](.cursor/rules/kingsdillemma-app-tsx.mdc).

3. **신규 UI 경로**: 가능하면 **`src/components/`** 또는 **`src/features/`**에 **새 파일**로 두고, 루트 `App.tsx`에는 연결( import 등)만 한다.

4. **한국어 문자열**: UI 문구 추가·수정은 **`src/resources/ko/`**에 두고(기존 패턴) 코드에서 참조한다.

5. **코드 경계**: **`netlify/functions/`**는 과거 호스팅 호환용으로 레포에 보관만(배포는 Docker 기준). 앱과 맞닿는 타입·API 처리는 **`shared/`** 및 **`server/`**를 본다.

6. **백엔드/API 갱신**: `shared/`, `server/`, API 액션·요청/응답 타입 등 백엔드와 맞닿는 코드를 바꾼 뒤 로컬 UI를 확인할 때는 **반드시 `dev:api` 프로세스를 갱신**한다. 오래 떠 있는 Express 프로세스가 이전 코드를 계속 잡아 UI 검증을 왜곡할 수 있다.

7. **`check`의 범위**: **`npm run check`** = `tsc --noEmit` + **`npm run lint`** (`eslint .`). 타입·린트만이며 **테스트는 포함하지 않는다**.

8. **`verify`에 테스트 포함**: **`npm run verify`** = `npm run check && npm test`. 머지·PR 직전 최종 검증은 **`verify`**로 통일한다.

9. **스크립트 단일 출처**: 아래 [스크립트 요약](#스크립트 요약)은 빠른 참고용이며, **정확한 정의는 항상** [`package.json`](package.json) 의 `"scripts"`이다.

10. **Cursor 규칙**: 반복 지침은 **[`.cursor/rules/`](.cursor/rules/)**에 두고, 이 문서와 상호 참조해 **한 곳만 장문으로 풀지 않는다** (요점은 규칙 파일, 상세 표/경계는 여기서 링크).

## 머지 전 필수

**Part A 1·7번**: `npm run verify` 성공(타입·린트·테스트).

## 로컬 개발·환경

- **환경 파일**: 로컬 `npm run dev` / `dev:db:reset` 은 루트 **`.env`** 를 로드합니다. **한 파일**에 Compose용 `MYSQL_*` + `MYSQL_DEV_*` + 호스트 npm용 **`MYSQL_USE_DEV_DB=1`**(개발 PC에서만)을 두면 됩니다. 운영 전용 서버 `.env`에는 `MYSQL_USE_DEV_DB` 를 넣지 마세요. **앱 컨테이너 `web`은 `MYSQL_*`만**, **`mysql-dev`만 `MYSQL_DEV_*`** 를 씁니다.
- **기본 개발 서버**: `npm run dev` — [`scripts/run-with-env.mjs`](scripts/run-with-env.mjs)가 **`.env`만** 주입한 뒤 `dev:api`가 Express를 띄운다(이미 설정된 `process.env` 키는 덮어쓰지 않음). DB는 반드시 **테스트 전용**(`MYSQL_USE_DEV_DB=1` 이면 `MYSQL_DEV_*` 기준).
- **개발 DB 이름 가드**: `NODE_ENV` 또는 `APP_ENV`가 `development`이고 MySQL 대상이 명시되면(`MYSQL_USE_DEV_DB=1` 이면 `MYSQL_DEV_DATABASE` 포함), 서버가 풀을 만들기 전에 **연결 DB 이름에 `_dev` 등 개발 패턴**이 있어야 한다(`MYSQL_USE_DEV_DB=1` 이면 `MYSQL_DEV_*`만 검사). 그렇지 않으면 한국어 메시지와 함께 즉시 종료한다. **`process.env.CI`가 설정된 경우(테스트·CI)** 또는 위 해당 변수가 **전부 비어 있으면** 가드를 건너뛴다.
- **프로덕션 서버·이미지**: Express 진입점은 **dotenv를 읽지 않는다**. [`Dockerfile.server`](Dockerfile.server) 단계에 `.env*` 파일을 복사하지 않으며, [`.dockerignore`](.dockerignore)가 빌드 컨텍스트에서 `.env*`를 제외한다. 컨테이너 값은 Compose 등으로만 주입한다.
- **데이터**: 운영 DB와 동일한 덤프를 개발 DB에 넣지 않는다 (의도한 디버깅만 예외).
- **개발 DB 의제 상태만 초기화**: MySQL `agenda_game_state`의 기본 행(`active-game` 및 과거 `active-game--session-*` 레거시 행)만 지우고 빈 의회 상태로 다시 넣으려면 **루트 `.env`**가 로컬·개발 DB만 가리키는지 확인(`MYSQL_USE_DEV_DB=1` + `MYSQL_DEV_*` 권장)한 뒤 `npm run dev:db:reset`을 쓴다. 스크립트는 **`NODE_ENV`/`APP_ENV`가 development이거나 `--force-dev`**, 호스트가 **localhost 계열**, DB 이름이 **개발 전용 패턴**일 때만 동작한다. **프로덕션 Compose·운영 DB에는 절대 실행하지 않는다.** 한 PC에서 가문 5명 테스트는 `?session=1`…`5`로 **쿠키만** 나누며, 저장되는 의회 상태는 **동일한 `active-game` 행**을 본다.
- **`netlify/functions`**: 레거시 소스 보관. 프로덕션은 Docker·[`DOCKER.md`](DOCKER.md).
- **한 호스트·두 MySQL**: [`docker-compose.yml`](docker-compose.yml) 기본 `docker compose up` 에 **`mysql`(운영)** 과 **`mysql-dev`(개발·호스트 3307)** 가 같이 뜬다([`DOCKER.md`](DOCKER.md)).

## 스크립트 요약

| 스크립트 | 내용 |
|----------|------|
| `check` | `tsc --noEmit` + `npm run lint` (`eslint .`) |
| `test` | `tsx`로 `tests/` 아래 스펙 실행(예: `agenda-state`, `agenda-api`, `mystery-stickers` 등 — [`package.json`](package.json) 확인) |
| `verify` | `check` 후 `test` (`npm run check && npm test`) |
| `dev` | Vite(3291) + Express API; `.env` + 개발 DB(`MYSQL_USE_DEV_DB=1` 권장). |
| `dev:db` | `mysql-dev`만 기동/보장 (`docker compose up -d mysql-dev`). |
| `dev:db:down` | `mysql-dev`만 중지(운영 `web`/`mysql` 유지). |
| `dev:db:reset` | **개발 DB만**: `agenda_game_state`의 `active-game`(및 레거시 `active-game--session-*`) 삭제 후 단일 행으로 빈 의회 재삽입([`scripts/dev-db-reset.mts`](scripts/dev-db-reset.mts)). |
| `docker:up` / `docker:down` | Compose 전체 기동·종료 (`web`→운영 `mysql`, Dockerfile.server 프로덕션 빌드). |
| `build` | Vite 프론트 빌드 (`vite build`) |

전체 정의: [package.json](package.json) 의 `"scripts"`.

## Docker

- 정적 이미지·전체 스택(Express + 운영 MySQL + 개발 MySQL): [`DOCKER.md`](DOCKER.md).

## 비용·효율 (참고)

- **대용량 진입점**: `src/App.tsx` — Part A 2번·[`kingsdillemma-app-tsx.mdc`](.cursor/rules/kingsdillemma-app-tsx.mdc).
- **UI 모듈 예**: [`src/components/DilemmaUI.tsx`](src/components/DilemmaUI.tsx) 등 — 루트에서만 붙이기(Part A 3번).
- **테스트**: [`tests/`](tests/) — `verify`에 포함(Part A 7번).
