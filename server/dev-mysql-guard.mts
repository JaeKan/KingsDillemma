/**
 * 개발 모드에서 운영과 동일한 DB 이름(예: kings_dilemma)으로의 실수 연결을 막습니다.
 * 비밀번호·호스트는 로그에 남기지 않습니다.
 */

function extractDatabaseFromMysqlUri(uri: string): string | null {
  try {
    const url = new URL(uri);
    const db = url.pathname.replace(/^\//, "").split(/[?#]/)[0];
    const trimmed = db.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

function isDevelopmentRuntime(): boolean {
  return process.env.NODE_ENV === "development" || process.env.APP_ENV === "development";
}

/**
 * 호스트에서 `npm run dev` 등 **development**일 때 `mysql-dev`(`MYSQL_DEV_*`)로 붙을지.
 * - 명시: `MYSQL_USE_DEV_DB=1|true|yes` → 켜짐, `0|false|no|off` → 꺼짐(레거시 `MYSQL_*`만).
 * - 생략 시: `APP_ENV`/`NODE_ENV`가 development 이고 `MYSQL_DEV_DATABASE`가 있으면 **자동으로 개발 DB**(플래그 없이도 운영 `MYSQL_*`와 섞이지 않음).
 * Docker `web` 컨테이너는 `NODE_ENV=production`이라 여기서 항상 false에 가깝고, `getMysqlConfig`는 일반 분기만 탐.
 */
export function usesComposeDevDbForLocalApp(): boolean {
  const v = process.env.MYSQL_USE_DEV_DB?.trim().toLowerCase();
  if (v === "0" || v === "false" || v === "no" || v === "off") {
    return false;
  }
  if (v === "1" || v === "true" || v === "yes") {
    return true;
  }
  return isDevelopmentRuntime() && Boolean(process.env.MYSQL_DEV_DATABASE?.trim());
}

function getEffectiveMysqlDatabaseName(): string {
  if (usesComposeDevDbForLocalApp()) {
    const fromDev = process.env.MYSQL_DEV_DATABASE?.trim();
    if (fromDev) {
      return fromDev;
    }
  }

  const uri = process.env.MYSQL_URL || process.env.DATABASE_URL;
  if (typeof uri === "string" && uri.trim().length > 0) {
    return extractDatabaseFromMysqlUri(uri.trim()) ?? "";
  }

  const explicit = process.env.MYSQL_DATABASE;
  if (typeof explicit === "string" && explicit.trim().length > 0) {
    return explicit.trim();
  }

  return "kings_dilemma";
}

function hasExplicitMysqlTargeting(): boolean {
  if (usesComposeDevDbForLocalApp() && process.env.MYSQL_DEV_DATABASE?.trim()) {
    return true;
  }

  const keys = ["MYSQL_URL", "DATABASE_URL", "MYSQL_HOST", "MYSQL_DATABASE"] as const;
  return keys.some((key) => {
    const value = process.env[key];
    return typeof value === "string" && value.trim().length > 0;
  });
}

function isAllowedDevDatabaseName(name: string): boolean {
  const lower = name.trim().toLowerCase();
  if (!lower) {
    return false;
  }

  if (lower.includes("_dev")) {
    return true;
  }

  return lower === "kings_dilemma_dev" || lower === "kingsdilemma_dev";
}

function getEffectiveMysqlHost(): string {
  if (usesComposeDevDbForLocalApp()) {
    return (process.env.MYSQL_DEV_HOST_BINDING?.trim() || "127.0.0.1").toLowerCase();
  }

  const uri = process.env.MYSQL_URL || process.env.DATABASE_URL;
  if (typeof uri === "string" && uri.trim().length > 0) {
    try {
      return new URL(uri.trim()).hostname.toLowerCase();
    } catch {
      return "";
    }
  }

  return (process.env.MYSQL_HOST || "127.0.0.1").trim().toLowerCase();
}

function isLocalMysqlHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

/**
 * TRUNCATE/DELETE 등 파괴적 작업 전에만 호출. 비밀번호·전체 URI는 로그에 남기지 않습니다.
 */
export function assertDevMysqlDestructiveOperationAllowed(options: { forceDevFlag: boolean }): void {
  if (process.env.CI) {
    console.error("[dev-db] CI 환경에서는 파괴적 DB 작업을 수행할 수 없습니다.");
    process.exit(1);
  }

  const devRuntime =
    process.env.NODE_ENV === "development" ||
    process.env.APP_ENV === "development" ||
    options.forceDevFlag;

  if (!devRuntime) {
    console.error(
      "[dev-db] 개발 DB 초기화는 NODE_ENV=development, APP_ENV=development 또는 --force-dev 가 있을 때만 허용됩니다.",
    );
    process.exit(1);
  }

  const host = getEffectiveMysqlHost();
  if (!host || !isLocalMysqlHost(host)) {
    console.error(
      "[dev-db] MySQL 호스트가 로컬(localhost / 127.0.0.1 / ::1)이 아니면 초기화할 수 없습니다. (호스트 이름만 검사)",
    );
    process.exit(1);
  }

  const dbName = getEffectiveMysqlDatabaseName();
  if (!isAllowedDevDatabaseName(dbName)) {
    console.error(
      "[dev-db] 데이터베이스 이름이 개발 전용 패턴이 아닙니다(예: 이름에 `_dev` 포함, 또는 kings_dilemma_dev). 운영 이름으로 보이는 DB는 거부됩니다.",
    );
    process.exit(1);
  }
}

/** MySQL 스토어 생성 전에 호출. 테스트·CI·명시적 MySQL 설정이 없으면 통과합니다. */
export function assertDevMysqlDatabaseSafe(): void {
  if (process.env.CI) {
    return;
  }

  if (!isDevelopmentRuntime()) {
    return;
  }

  if (!hasExplicitMysqlTargeting()) {
    return;
  }

  const dbName = getEffectiveMysqlDatabaseName();

  if (!isAllowedDevDatabaseName(dbName)) {
    console.error(
      "[개발 보호] 개발 환경(NODE_ENV 또는 APP_ENV가 development)에서는 MYSQL 데이터베이스 이름에 `_dev`가 포함되어야 합니다(예: kings_dilemma_dev). 운영 DB 이름(예: kings_dilemma)으로는 기동할 수 없습니다. " +
        "`.env`에서 `MYSQL_USE_DEV_DB=1` 와 `MYSQL_DEV_*` 를 쓰거나, `MYSQL_DATABASE`(또는 URI 경로)를 개발 전용 DB로 바꾸세요.",
    );
    process.exit(1);
  }
}
