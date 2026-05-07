import mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2";
import { STORE_KEY, type AgendaStateStore } from "../shared/agenda-api.mts";
import type { GameState } from "../netlify/functions/_shared/agenda-state.mts";

type MysqlAgendaStore = AgendaStateStore & {
  close: () => Promise<void>;
};

type StateRow = RowDataPacket & {
  state_json: string | Buffer | Record<string, unknown> | null;
};

export function createMysqlAgendaStore(): MysqlAgendaStore {
  const pool = mysql.createPool({
    ...getMysqlConfig(),
    waitForConnections: true,
    connectionLimit: parsePositiveInteger(process.env.MYSQL_CONNECTION_LIMIT, 10),
    namedPlaceholders: false,
  });
  const ready = ensureSchema(pool);

  return {
    async get() {
      await ready;
      const [rows] = await pool.execute<StateRow[]>(
        "SELECT state_json FROM agenda_game_state WHERE id = ? LIMIT 1",
        [STORE_KEY],
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
        [STORE_KEY, JSON.stringify(state), Number(state.version) || 0],
      );
    },
    close: () => pool.end(),
  };
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
