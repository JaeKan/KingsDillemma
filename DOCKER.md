# Docker로 실행하기

**현재 배포·자체 호스팅**은 **Docker Compose + Node(Express) + MySQL**(`docker-compose.yml`)을 기준으로 합니다.  
`netlify/functions` 소스는 레포에 **레거시 보관**만 합니다(Netlify CLI·배포 파이프라인 없음).

로컬 앱 개발 시에는 **Vite + 로컬 Express + 테스트 전용 MySQL**을 쓰고, **개발 환경을 프로덕션 DB에 연결하지 마세요.**

## 앱이 API 서버를 필요로 하는 이유

클라이언트는 같은 출처의 **`/api/agenda`**(및 SSE **`/api/agenda/events`**)를 호출합니다.  
**정적 파일(nginx `static` 프로필)만** 띄우면 UI는 보이지만 **의제 저장·세션·실시간 갱신은 동작하지 않습니다.**  
전체 스택은 Express(`Dockerfile.server` / `npm run dev`)가 이 API를 제공합니다.

| 방식 | 용도 |
|------|------|
| 프로필 **`static`** + 루트 **`Dockerfile`** (`nginx.conf`) | 최소 이미지, SPA 정적 호스팅(데모·프리뷰) |
| 기본 서비스 **`web`** + **`mysql`** + **`Dockerfile.server`** | Express + MySQL, 실제 게임 플로우(권장 프로덕션 형태) |
| 프로필 **`https`** + **Caddy** | 도메인 TLS 종료(자세한 내용은 아래) |

## 환경 변수(요약)

- **한 대의 Docker 호스트**에서 `docker compose up --build -d` 하면 **`web` + `mysql`(운영 DB) + `mysql-dev`(개발 DB)** 가 함께 기동됩니다. (`mysql-dev`는 호스트 **`127.0.0.1:3307` → 컨테이너 3306**, `MYSQL_DEV_PUBLISH`로 변경 가능.)
- **교차 사용 금지**: 운영 앱(`web`)은 **`MYSQL_*`** 만 사용합니다. **`mysql-dev`** 는 compose에서 **`MYSQL_DEV_DATABASE`**, **`MYSQL_DEV_USER`**, **`MYSQL_DEV_PASSWORD`**, **`MYSQL_DEV_ROOT_PASSWORD`** 로만 설정해, 루트 `.env`의 운영 `MYSQL_*` 와 섞이지 않게 합니다.
- **로컬 `npm run dev` / `dev:db:reset`**: 루트 **`.env`** 하나를 씁니다. Compose용 `MYSQL_*` / `MYSQL_DEV_*` 와 함께, 호스트에서 개발 DB 컨테이너로 붙으려면 **`MYSQL_USE_DEV_DB=1`**(개발 PC에서만)·`APP_ENV=development`·`NODE_ENV=development` 를 두면 `MYSQL_DATABASE`(운영)와 겹치지 않습니다. 자세한 키는 [`.env.example`](.env.example).
- **프로덕션(Docker)**: 호스트 루트 **`.env`**에서 `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` 는 **운영 `mysql` 전용**, **`MYSQL_DEV_*`** 는 **개발 컨테이너 전용**으로 추가합니다. **`web` 컨테이너**에는 런타임으로만 주입되며, 이미지 빌드 시 레포의 dotenv 파일을 읽지 않습니다([`.dockerignore`](.dockerignore)가 `.env*` 제외, 서버 코드에 dotenv 없음). 운영 서버 `.env`에는 **`MYSQL_USE_DEV_DB` 를 넣지 마세요.**

## 1) 권장: 전체 스택(API + MySQL)

```bash
docker compose up --build -d
```

또는 동일하게 **`npm run docker:up`**.

웹은 기본으로 호스트 `3000` → 컨테이너 `3000`(`APP_PORT`로 변경).  
**운영** MySQL은 컨테이너 `mysql`(기본으로 호스트에서 3306은 열지 않음·내부 네트워크만).  
**개발** MySQL은 **`mysql-dev`** 가 함께 뜨며, 호스트에서는 **`127.0.0.1:3307`** 등으로 접속합니다.  
운영 DB 계정은 루트 `.env`의 `MYSQL_*`, 개발 DB 초기 계정은 **`MYSQL_DEV_*`** 로 설정합니다.

로그:

```bash
docker compose logs -f web
```

서버 이미지만 빌드:

```bash
docker build -f Dockerfile.server -t kings-dilemma-server .
```

## 2) 정적 SPA만(nginx)

의제 API 없이 빌드 결과만 서빙할 때는 프로필 **`static`** 과 서비스 이름 **`static`** 을 지정합니다.  
(프로필만 켠 채 `docker compose --profile static up` 만 하면 프로필 없는 `web`·`mysql`까지 함께 올라가므로, **반드시 마지막에 `static` 서비스를 적습니다.**)

```bash
docker compose --profile static up --build static
```

기본 포트는 호스트 `8080` → 컨테이너 `80` (`STATIC_PORT`로 변경 가능).

또는 이미지 직접 실행:

```bash
docker build -t kings-dilemma .
docker run --rm -p 8080:80 kings-dilemma
```

## 3) 개발 전용 MySQL(`mysql-dev`) — **운영과 같은 compose**

**`docker compose up --build -d` 한 번으로** 운영 DB(`mysql`)와 개발 DB(`mysql-dev`)가 **같은 호스트**에서 함께 실행됩니다. 웹·운영 DB만 필요하면 `mysql-dev`는 떠 있어도 운영 트래픽은 `mysql`만 사용합니다.

개발 컨테이너만 다시 올리거나 재기동 후 보장할 때:

```bash
docker compose up -d mysql-dev
```

npm: **`npm run dev:db`** (위와 동일).

개발 MySQL만 **중지**(운영 `web`/`mysql` 유지):

```bash
docker compose stop mysql-dev
```

npm: **`npm run dev:db:down`** — **전체 스택을 `down` 하지 않습니다.**

호스트에서 npm 으로 붙을 때는 `.env`에 **`MYSQL_USE_DEV_DB=1`** 이면 별도로 `MYSQL_HOST`를 맞출 필요 없이 **`MYSQL_DEV_*`** 와 **`MYSQL_DEV_HOST_BINDING`(기본 127.0.0.1)**, **`MYSQL_DEV_PORT_BINDING`(기본 3307)** 를 씁니다.

**운영 DB와 동일한 덤프를 개발 DB에 복원하지 마세요.** (의도한 디버깅 등 예외는 스스로 판단.)

### 개발 DB 의제/왕국 상태 초기화(로컬만)

**프로덕션 Docker Compose로 띄운 MySQL(운영 `mysql`)에는 실행하지 마세요.** 호스트에서 **루트 `.env`**가 **개발 DB(`mysql-dev`)만** 가리키는지 확인한 뒤 실행합니다(`MYSQL_USE_DEV_DB=1` 권장).

- **명령**: `npm run dev:db:reset` ([`run-with-env`](scripts/run-with-env.mjs)가 **`.env`** 로드).
- **삭제 범위**: 테이블 `agenda_game_state`에서 id가 `active-game` 또는 `active-game--session-%`(레거시)인 행만 삭제한 뒤, **`active-game` 한 행**에 빈 의회 상태를 넣습니다. **운영 DB 이름·원격 호스트에서는 스크립트가 거부**됩니다.
- **`?session=1`…`5`**: 동일 의회 DB를 보되 탭마다 **로그인 쿠키만** 달라집니다. 콘솔에 출력할 URL 목록은 `SESSION_INDICES`(쉼표 구분, 기본 1–5)로 조정할 수 있습니다.
- **브라우저**: `http://127.0.0.1:3291/?session=1` … `?session=5` 로 탭을 나누면 **동일 의회 상태**를 보며, 슬롯마다 **로그인 쿠키 이름만 달라** 같은 브라우저에서 여러 가문으로 동시 로그인할 수 있습니다(쿼리 없음과 동일 DB 행).

## 4) 로컬 프론트 + 로컬 API (호스트에서 개발 — **테스트 DB**)

1. 서버(또는 본인 PC)에서 **`docker compose up -d`** 로 **`mysql-dev`** 까지 떠 있는지 확인(전체 스택 절차는 위 §1).
2. [`.env.example`](.env.example)을 참고해 루트 **`.env`** 작성(`MYSQL_USE_DEV_DB=1` 포함 권장).
3. 다음 실행:

```bash
npm install
npm run dev
```

- **Vite 개발 서버**: `http://127.0.0.1:3291` — `/api` 는 기본적으로 `http://127.0.0.1:3001`(호스트 Express, `npm run dev:api`)으로 프록시됩니다. Docker `web`은 호스트 `APP_PORT`(기본 3000)와 충돌하지 않게 분리(`DEV_SERVER_ORIGIN`으로 변경 가능).
- **Express API 단독**이 필요하면: `npm run dev:api` (역시 **`.env`** 적용).

## 5) HTTPS(Caddy) 오버레이

도메인을 **프로덕션용 `.env`**의 `DOMAIN`에 넣고 DNS를 호스트에 맞춘 뒤:

```bash
docker compose --profile https up --build -d
```

`web`·`mysql`·`caddy`가 함께 기동됩니다. `docker/Caddyfile`은 `web:3000`으로 리버스 프록시합니다.

## Vite `VITE_*` 빌드 인자

`VITE_*`를 거의 쓰지 않더라도, 빌드 시 주입하려면 **이미지 빌드 단계**에서 넘깁니다(Vite는 빌드 타임에만 인라인).

```bash
docker build -t kings-dilemma --build-arg VITE_API_BASE=https://example.com .
```

`Dockerfile` / `Dockerfile.server`의 `ARG VITE_API_BASE`에 맞춰 변수명을 추가·바꿀 수 있습니다.

## 관련 파일

- `docker-compose.yml` — 기본: `web` + `mysql`(운영) + `mysql-dev`(개발); 프로필 `static` / `https`만 선택
- `Dockerfile` — multi-stage: `npm ci` → `npm run build` → `nginx:alpine`
- `Dockerfile.server` — 빌드 후 Node에서 Express(`server/index.mts`) 실행
- `nginx.conf` — SPA 폴백 `try_files`, `/assets` 장기 캐시
- `docker/Caddyfile` — HTTPS 프로필용 리버스 프록시
- `.dockerignore` — `node_modules`, `dist`, `.git` 등 제외

## `package-lock.json`과 Docker

이미지 빌드는 Linux에서 `npm ci`를 씁니다. Windows에서만 lock을 갱신하면 optional 네이티브 바인딩 때문에 lock 항목이 빠져 `npm ci`가 실패할 수 있습니다. 그때는 `node:lts-alpine` 컨테이너 등 Linux 환경에서 프로젝트 루트에 대해 한 번 `npm install`로 lock을 맞추면 됩니다.
