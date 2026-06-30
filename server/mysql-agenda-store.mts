import mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2";
import { STORE_KEY, type AgendaStateStore } from "../shared/agenda-api.mts";
import type { GameState } from "../netlify/functions/_shared/agenda-state.mts";
import { assertDevMysqlDatabaseSafe, usesComposeDevDbForLocalApp } from "./dev-mysql-guard.mts";

type MysqlAgendaPoolApi = {
  createStore: (rowKey: string) => AgendaStateStore;
  /** 기본 `active-game` 및 `active-game--session-*` 행만 삭제(개발 리셋 스크립트용). */
  deleteAgendaRowsForDefaultKeyTree: () => Promise<void>;
  close: () => Promise<void>;
};

type StateRow = RowDataPacket & {
  state_json: string | Buffer | Record<string, unknown> | null;
};

const ROW_KEY_SAFE = /^[a-zA-Z0-9_-]{1,64}$/;

export function createMysqlAgendaPool(): MysqlAgendaPoolApi {
  assertDevMysqlDatabaseSafe();

  const pool = mysql.createPool({
    ...getMysqlConfig(),
    waitForConnections: true,
    connectionLimit: parsePositiveInteger(process.env.MYSQL_CONNECTION_LIMIT, 4),
    maxIdle: parsePositiveInteger(process.env.MYSQL_MAX_IDLE_CONNECTIONS, 1),
    idleTimeout: parsePositiveInteger(process.env.MYSQL_IDLE_TIMEOUT_MS, 30_000),
    namedPlaceholders: false,
  });
  const ready = ensureSchema(pool);

  return {
    createStore(rowKey: string) {
      assertRowKey(rowKey);

      return {
        async get() {
          await ready;
          const [rows] = await pool.execute<StateRow[]>(
            "SELECT state_json FROM agenda_game_state WHERE id = ? LIMIT 1",
            [rowKey],
          );
          const value = rows[0]?.state_json;

          if (!value) {
            return null;
          }

          if (Buffer.isBuffer(value)) {
            return JSON.parse(value.toString("utf8")) as GameState;
          }

          if (typeof value === "string") {
            return JSON.parse(value) as GameState;
          }

          return value;
        },
        async set(state) {
          await ready;
          await pool.execute(
            `INSERT INTO agenda_game_state (id, state_json, version)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE
               state_json = VALUES(state_json),
               version = VALUES(version),
               updated_at = CURRENT_TIMESTAMP(3)`,
            [rowKey, JSON.stringify(state), Number(state.version) || 0],
          );
        },
      };
    },
    deleteAgendaRowsForDefaultKeyTree: async () => {
      await ready;
      await pool.execute(`DELETE FROM agenda_game_state WHERE id = ? OR id LIKE ?`, [
        STORE_KEY,
        `${STORE_KEY}--session-%`,
      ]);
    },
    close: () => pool.end(),
  };
}

type MysqlAgendaStore = AgendaStateStore & {
  close: () => Promise<void>;
};

/** 단일 기본 행(`active-game`)용 — import 스크립트·Netlify 단일 연결 등 */
export function createMysqlAgendaStore(): MysqlAgendaStore {
  const poolApi = createMysqlAgendaPool();
  const inner = poolApi.createStore(STORE_KEY);

  return {
    get: () => inner.get(),
    set: (state) => inner.set(state),
    close: () => poolApi.close(),
  };
}

function assertRowKey(rowKey: string) {
  if (!ROW_KEY_SAFE.test(rowKey)) {
    throw new Error("Invalid agenda state row key.");
  }
}

async function ensureSchema(pool: mysql.Pool) {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS agenda_game_state (
      id VARCHAR(64) NOT NULL,
      state_json JSON NOT NULL,
      version INT NOT NULL DEFAULT 0,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);
}

function getMysqlConfig() {
  if (usesComposeDevDbForLocalApp()) {
    const database = process.env.MYSQL_DEV_DATABASE?.trim();
    if (database) {
      return {
        host: process.env.MYSQL_DEV_HOST_BINDING?.trim() || "127.0.0.1",
        port: parsePositiveInteger(process.env.MYSQL_DEV_PORT_BINDING, 3307),
        user: process.env.MYSQL_DEV_USER?.trim() || "kingsdilemma_dev",
        password: process.env.MYSQL_DEV_PASSWORD ?? "",
        database,
        charset: "utf8mb4",
      };
    }
  }

  const uri = process.env.MYSQL_URL || process.env.DATABASE_URL;

  if (uri) {
    return { uri };
  }

  return {
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: parsePositiveInteger(process.env.MYSQL_PORT, 3306),
    user: process.env.MYSQL_USER || "kings_dilemma",
    password: process.env.MYSQL_PASSWORD || "kings_dilemma_password",
    database: process.env.MYSQL_DATABASE || "kings_dilemma",
    charset: "utf8mb4",
  };
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
