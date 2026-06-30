import { createInitialState } from "../netlify/functions/_shared/agenda-state.mts";
import { assertDevMysqlDestructiveOperationAllowed } from "../server/dev-mysql-guard.mts";
import { createMysqlAgendaPool } from "../server/mysql-agenda-store.mts";
import { AGENDA_PARALLEL_SESSION_MAX, STORE_KEY } from "../shared/agenda-api.mts";

const argv = process.argv.slice(2);
const forceDev = argv.includes("--force-dev");

function parseSessionIndicesFromEnv(): number[] {
  const raw = process.env.SESSION_INDICES?.trim();

  if (!raw) {
    return Array.from({ length: AGENDA_PARALLEL_SESSION_MAX }, (_, index) => index + 1);
  }

  const parsed = raw
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= AGENDA_PARALLEL_SESSION_MAX);

  const unique = [...new Set(parsed)].sort((a, b) => a - b);

  if (unique.length === 0) {
    console.error(
      `[dev-db] SESSION_INDICES에 유효한 번호가 없습니다(1–${AGENDA_PARALLEL_SESSION_MAX}, 쉼표 구분).`,
    );
    process.exit(1);
  }

  return unique;
}

assertDevMysqlDestructiveOperationAllowed({ forceDevFlag: forceDev });

const sessionIndices = parseSessionIndicesFromEnv();
const initialState = createInitialState();

function printMysqlConnectHelp(err: unknown) {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as NodeJS.ErrnoException).code)
      : "";
  if (code !== "ECONNREFUSED" && code !== "ETIMEDOUT") {
    return false;
  }

  const host = process.env.MYSQL_HOST || "127.0.0.1";
  const port = process.env.MYSQL_PORT || "3306";
  console.error(`[dev-db] MySQL 연결 실패 (${code}): ${host}:${port} 에서 응답이 없습니다.`);
  console.error("[dev-db] MySQL 컨테이너가 없거나 아직 기동 중일 수 있습니다. 다음 후 재시도:");
  console.error("    docker compose up -d   (또는 npm run dev:db — mysql-dev 만)");
  console.error("  (30초 정도 기다린 뒤 healthcheck 통과 확인. 종료: npm run dev:db:down)");
  console.error("[dev-db] 로컬 MySQL을 직접 쓰는 경우 루트 `.env`의 MYSQL_HOST / MYSQL_PORT 를 맞추거나 `MYSQL_USE_DEV_DB=1` 로 개발 컨테이너를 가리키세요.");
  return true;
}

let pool: ReturnType<typeof createMysqlAgendaPool> | undefined;

try {
  pool = createMysqlAgendaPool();
  await pool.deleteAgendaRowsForDefaultKeyTree();

  await pool.createStore(STORE_KEY).set(initialState);

  console.log(`[dev-db] agenda_game_state 초기화: 단일 행 ${STORE_KEY} (레거시 active-game--session-* 행은 삭제됨).`);

  const origin = (process.env.DEV_SESSION_PRINT_ORIGIN || "http://127.0.0.1:3291").replace(/\/$/, "");

  console.log("[dev-db] 브라우저(동일 의회 DB·탭별 로그인 쿠키만 분리, ?session=1…5):");
  console.log(`  ${origin}/`);
  for (const index of sessionIndices) {
    console.log(`  ${origin}/?session=${index}`);
  }
} catch (err) {
  if (printMysqlConnectHelp(err)) {
    process.exit(1);
  }
  throw err;
} finally {
  if (pool) {
    await pool.close();
  }
}
