import { readFile } from "node:fs/promises";
import { normalizeState } from "../netlify/functions/_shared/agenda-state.mts";
import { createMysqlAgendaStore } from "../server/mysql-agenda-store.mts";

const stateFile = process.argv[2];

if (!stateFile) {
  console.error("Usage: npm run mysql:import -- path/to/active-game.json");
  process.exit(1);
}

const raw = JSON.parse(await readFile(stateFile, "utf8"));
const state = normalizeState(raw);
const store = createMysqlAgendaStore();

try {
  await store.set(state);
  console.log(`Imported game state version ${state.version} into MySQL.`);
} finally {
  await store.close();
}
