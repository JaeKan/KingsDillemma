import assert from "node:assert/strict";
import {
  AGENDAS,
  applyChoose,
  applyDiscard,
  clearSession,
  createDefaultPlayerInventory,
  createInitialState,
  normalizeState,
  registerSession,
  redactState,
  savePlayerInventory,
  setPlayerName,
  setSeatCredential,
} from "../netlify/functions/_shared/agenda-state.mts";

const now = "2026-05-07T00:00:00.000Z";
const initial = createInitialState(now);

assert.equal(initial.phase, "discard");
assert.equal(initial.pool.length, 6);
assert.deepEqual(createDefaultPlayerInventory(now).resources, {
  influence: 0,
  wealth: 0,
  morale: 0,
  welfare: 0,
  knowledge: 0,
});
assert.equal(redactState(initial, 2).availableAgendas, undefined);
assert.equal(redactState(initial, 1).canDiscard, true);
assert.equal(redactState(initial, null).ownInventory, null);
assert.equal(redactState(initial, 1).ownInventory?.coins, 10);
assert.equal(redactState(initial, 1).ownInventory?.powerTokens, 8);
assert.deepEqual(
  redactState(initial, null).players.map((seat) => [
    seat.player,
    seat.name,
    seat.hasCustomName,
    seat.isCurrentTurn,
    seat.hasSession,
    seat.hasPassword,
  ]),
  [
    [1, "Player 1", false, false, false, false],
    [2, "Player 2", false, false, false, false],
    [3, "Player 3", false, false, false, false],
    [4, "Player 4", false, false, false, false],
    [5, "Player 5", false, false, false, false],
  ],
);
assert.equal(redactState(initial, 1).players[0].isCurrentTurn, true);

const legacyState = normalizeState(
  {
    version: 1,
    phase: "discard",
    turn: 1,
    pool: AGENDAS.map((agenda) => agenda.id),
    discarded: null,
    choices: {},
    sessions: {},
    createdAt: now,
    updatedAt: now,
  },
  now,
);
assert.deepEqual(legacyState.credentials, {});
assert.deepEqual(legacyState.playerNames, {});
assert.deepEqual(legacyState.inventories, {});

const normalizedInventoryState = normalizeState(
  {
    ...initial,
    inventories: {
      "2": {
        coins: 12.7,
        powerTokens: 101,
        prestige: 4,
        crave: -2,
        resources: {
          influence: 13,
          wealth: 99,
          morale: "bad",
          welfare: 5.8,
          knowledge: 2,
        },
        updatedAt: now,
      },
      "9": {
        coins: 99,
      },
    },
  },
  now,
);
assert.deepEqual(Object.keys(normalizedInventoryState.inventories), ["2"]);
assert.deepEqual(normalizedInventoryState.inventories["2"], {
  coins: 12,
  powerTokens: 99,
  prestige: 4,
  crave: 0,
  resources: {
    influence: 13,
    wealth: 17,
    morale: 0,
    welfare: 5,
    knowledge: 2,
  },
  updatedAt: now,
});

const credential = {
  salt: "a1",
  hash: "secret-hash",
  iterations: 1,
  createdAt: now,
};
const namedState = setPlayerName(initial, 1, "라니스터", now);
assert.equal(namedState.playerNames["1"], "라니스터");
assert.equal(redactState(namedState, null).players[0].name, "라니스터");
assert.equal(redactState(namedState, null).players[0].hasCustomName, true);

const credentialState = setSeatCredential(namedState, 1, credential, now);
assert.equal(credentialState.credentials["1"].hash, "secret-hash");
assert.equal(redactState(credentialState, null).players[0].hasPassword, true);
assert.equal(JSON.stringify(redactState(credentialState, null)).includes("secret-hash"), false);
assert.equal(JSON.stringify(redactState(credentialState, null)).includes("a1"), false);

const playerOneSession = registerSession(initial, 1, "token-a", now);
const overwrittenSession = registerSession(playerOneSession, 1, "token-b", now);
assert.equal(overwrittenSession.sessions["1"].token, "token-b");
assert.equal(Object.keys(overwrittenSession.sessions).length, 1);
assert.equal(redactState(overwrittenSession, null).players[0].hasSession, false);
assert.equal(redactState(overwrittenSession, 1).players[0].hasSession, true);

const clearedSession = clearSession(overwrittenSession, 1, now);
assert.equal(clearedSession.sessions["1"], undefined);
assert.equal(redactState(clearedSession, null).players[0].hasSession, false);

const inventoryState = savePlayerInventory(
  initial,
  2,
  {
    coins: 14,
    powerTokens: 6,
    prestige: 2,
    crave: 1,
    resources: {
      influence: 11,
      wealth: 9,
      morale: 0,
      welfare: 3,
      knowledge: 17,
    },
  },
  now,
);
assert.equal(inventoryState.version, initial.version + 1);
assert.equal(inventoryState.inventories["2"].updatedAt, now);
assert.equal(redactState(inventoryState, null).ownInventory, null);
assert.equal(redactState(inventoryState, 1).ownInventory?.coins, 10);
assert.equal(redactState(inventoryState, 2).ownInventory?.coins, 14);
assert.equal(redactState(inventoryState, 2).ownInventory?.resources.knowledge, 17);

const discarded = applyDiscard(initial, 1, now, () => 0);
assert.equal(discarded.phase, "choose");
assert.equal(discarded.discarded, AGENDAS[0].id);
assert.equal(discarded.pool.length, 5);
assert.equal(redactState(discarded, 2).availableAgendas, undefined);
assert.equal(redactState(discarded, 1).availableAgendas?.length, 5);

let state = applyChoose(discarded, 1, discarded.pool[0], now);
assert.equal(state.turn, 2);
assert.equal(state.pool.length, 4);
assert.equal(redactState(state, 1).ownChoice?.id, discarded.pool[0]);
assert.equal(redactState(state, 1).availableAgendas, undefined);
assert.throws(() => applyChoose(state, 1, state.pool[0], now), /not your turn/i);

state = applyChoose(state, 2, state.pool[0], now);
state = applyChoose(state, 3, state.pool[0], now);
state = applyChoose(state, 4, state.pool[0], now);
state = applyChoose(state, 5, state.pool[0], now);

assert.equal(state.phase, "complete");
assert.equal(state.pool.length, 0);
assert.equal(Object.keys(state.choices).length, 5);
assert.equal(redactState(state, 5).ownChoice?.id, state.choices["5"]);
assert.equal(redactState(state, 3).availableAgendas, undefined);

console.log("agenda-state tests passed");
