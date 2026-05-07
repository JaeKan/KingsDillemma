import assert from "node:assert/strict";
import {
  AGENDAS,
  applyChoose,
  applyDiscard,
  calculateFinalScores,
  clearSession,
  createDefaultHouseProgress,
  createDefaultPlayerInventory,
  createInitialState,
  endSession,
  normalizeState,
  registerSession,
  redactState,
  saveHouseProgress,
  savePlayerInventory,
  setHouseName,
  setSeatCredential,
  startDraftIfReady,
} from "../netlify/functions/_shared/agenda-state.mts";

const now = "2026-05-07T00:00:00.000Z";
const credential = {
  salt: "a1",
  hash: "secret-hash",
  iterations: 1,
  createdAt: now,
};

const initial = createInitialState(now);

assert.equal(initial.phase, "house-select");
assert.equal(initial.turn, null);
assert.deepEqual(initial.draftOrder, []);
assert.equal(initial.pool.length, 6);
assert.deepEqual(createDefaultPlayerInventory(now).resources, {
  influence: 0,
  wealth: 0,
  morale: 0,
  welfare: 0,
  knowledge: 0,
});
assert.deepEqual(createDefaultHouseProgress(now).openAgendaTokens, {
  positive: [],
  negative: [],
});
assert.deepEqual(createDefaultHouseProgress(now).houseAchievements, [0, 0, 0]);
assert.deepEqual(createDefaultHouseProgress(now).houseAchievementComplete, [false, false, false]);
assert.equal(createDefaultHouseProgress(now).alignmentAchievements.greedy, 0);

const anonymousInitial = redactState(initial, null);
assert.equal(anonymousInitial.houses.length, 12);
assert.equal(anonymousInitial.houses[0].goal, "지식과 정신 사이의 조화 찾기");
assert.match(anonymousInitial.houses[0].profile, /환대와 개방성/);
assert.equal(anonymousInitial.claimedHouseCount, 0);
assert.equal(anonymousInitial.requiredHouseCount, 5);
assert.equal(anonymousInitial.canDiscard, false);
assert.equal(anonymousInitial.canChoose, false);
assert.equal(anonymousInitial.availableAgendas, undefined);
assert.equal(anonymousInitial.ownHouseProgress, null);
assert.equal(redactState(initial, "gamam").ownInventory?.coins, 10);
assert.equal(redactState(initial, "gamam").ownHouseProgress?.narrativeAchievement, false);
assert.throws(() => applyDiscard(initial, "gamam", now, () => 0), /모든 가문/);
assert.throws(() => applyChoose(initial, "gamam", AGENDAS[0].id, now), /모든 가문/);

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
assert.equal(legacyState.phase, "house-select");
assert.deepEqual(legacyState.credentials, {});
assert.deepEqual(legacyState.playerNames, {});
assert.deepEqual(legacyState.inventories, {});

let selecting = initial;
selecting = setHouseName(selecting, "gamam", "House Pinchay", now);
selecting = setSeatCredential(selecting, "gamam", credential, now);
selecting = setHouseName(selecting, "solad", "House Gambol", now);
selecting = setSeatCredential(selecting, "solad", credential, now);
selecting = setHouseName(selecting, "natar", "House Lethe", now);
selecting = setSeatCredential(selecting, "natar", credential, now);
selecting = setHouseName(selecting, "coden", "House Cyfoeth", now);
selecting = setSeatCredential(selecting, "coden", credential, now);

assert.equal(startDraftIfReady(selecting, now).phase, "house-select");
assert.equal(redactState(selecting, null).claimedHouseCount, 4);

selecting = setHouseName(selecting, "olwyn", "House Daucus", now);
selecting = setSeatCredential(selecting, "olwyn", credential, now);
const draftReady = startDraftIfReady(selecting, now);

assert.equal(draftReady.phase, "discard");
assert.deepEqual(draftReady.draftOrder, ["solad", "coden", "olwyn", "gamam", "natar"]);
assert.equal(draftReady.turn, "solad");
assert.equal(redactState(draftReady, "solad").canDiscard, true);
assert.equal(redactState(draftReady, "gamam").canDiscard, false);
assert.equal(redactState(draftReady, "solad").availableAgendas, undefined);

let prestigeSelecting = savePlayerInventory(selecting, "solad", { ...createDefaultPlayerInventory(now), prestige: 3 }, now);
prestigeSelecting = savePlayerInventory(prestigeSelecting, "coden", { ...createDefaultPlayerInventory(now), prestige: 1 }, now);
prestigeSelecting = savePlayerInventory(prestigeSelecting, "olwyn", { ...createDefaultPlayerInventory(now), prestige: 1 }, now);
prestigeSelecting = savePlayerInventory(prestigeSelecting, "natar", { ...createDefaultPlayerInventory(now), prestige: 5 }, now);
const prestigeDraftReady = startDraftIfReady(prestigeSelecting, now);
assert.deepEqual(prestigeDraftReady.draftOrder, ["gamam", "coden", "olwyn", "solad", "natar"]);

const playerSession = registerSession(draftReady, "solad", "token-a", now);
const overwrittenSession = registerSession(playerSession, "solad", "token-b", now);
assert.equal(overwrittenSession.sessions.solad.token, "token-b");
assert.equal(redactState(overwrittenSession, null).houses.find((house) => house.id === "solad")?.hasSession, false);
assert.equal(redactState(overwrittenSession, "solad").houses.find((house) => house.id === "solad")?.hasSession, true);

const clearedSession = clearSession(overwrittenSession, "solad", now);
assert.equal(clearedSession.sessions.solad, undefined);
assert.equal(redactState(clearedSession, null).houses.find((house) => house.id === "solad")?.hasSession, false);

const normalizedInventoryState = normalizeState(
  {
    ...draftReady,
    inventories: {
      gamam: {
        coins: 12.7,
        powerTokens: 101,
        prestige: 101,
        crave: 51,
        resources: {
          influence: 13,
          wealth: 99,
          morale: "bad",
          welfare: 5.8,
          knowledge: 2,
        },
        updatedAt: now,
      },
      invalid: {
        coins: 99,
      },
    },
    progress: {
      gamam: {
        openAgendaTokens: {
          positive: ["influence", "influence", "bad", "wealth", "morale"],
          negative: ["knowledge", "welfare", "morale"],
        },
        narrativeAchievement: true,
        houseAchievements: [1.8, 7, "bad"],
        alignmentAchievements: {
          Extremist: 2,
          greedy: 8,
        },
        updatedAt: now,
      },
      invalid: {
        narrativeAchievement: true,
      },
    },
  },
  now,
);
assert.deepEqual(Object.keys(normalizedInventoryState.inventories), ["gamam"]);
assert.deepEqual(normalizedInventoryState.inventories.gamam, {
  coins: 12,
  powerTokens: 99,
  prestige: 100,
  crave: 50,
  resources: {
    influence: 13,
    wealth: 17,
    morale: 0,
    welfare: 5,
    knowledge: 2,
  },
  updatedAt: now,
});
assert.deepEqual(Object.keys(normalizedInventoryState.progress), ["gamam"]);
assert.deepEqual(normalizedInventoryState.progress.gamam.openAgendaTokens, {
  positive: ["influence", "wealth"],
  negative: ["knowledge", "welfare"],
});
assert.equal(normalizedInventoryState.progress.gamam.narrativeAchievement, true);
assert.deepEqual(normalizedInventoryState.progress.gamam.houseAchievements, [1, 5, 0]);
assert.deepEqual(normalizedInventoryState.progress.gamam.houseAchievementComplete, [false, false, false]);
assert.equal(normalizedInventoryState.progress.gamam.alignmentAchievements.extremist, 2);
assert.equal(normalizedInventoryState.progress.gamam.alignmentAchievements.greedy, 4);

const inventoryState = savePlayerInventory(
  draftReady,
  "gamam",
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
assert.equal(inventoryState.version, draftReady.version + 1);
assert.equal(redactState(inventoryState, null).ownInventory, null);
assert.equal(redactState(inventoryState, "solad").ownInventory?.coins, 10);
assert.equal(redactState(inventoryState, "gamam").ownInventory?.coins, 14);
assert.equal(redactState(inventoryState, "gamam").ownInventory?.resources.knowledge, 17);

const progressState = saveHouseProgress(
  inventoryState,
  "gamam",
  {
    openAgendaTokens: {
      positive: ["influence", "wealth"],
      negative: ["morale"],
    },
    narrativeAchievement: true,
    houseAchievements: [1, 2, 3],
    alignmentAchievements: {
      greedy: 4,
      rebel: 1,
    },
  },
  now,
);
assert.equal(progressState.version, inventoryState.version + 1);
assert.equal(redactState(progressState, null).ownHouseProgress, null);
assert.equal(redactState(progressState, "solad").ownHouseProgress?.narrativeAchievement, false);
assert.deepEqual(redactState(progressState, "gamam").ownHouseProgress?.openAgendaTokens.positive, [
  "influence",
  "wealth",
]);
assert.equal(redactState(progressState, "gamam").ownHouseProgress?.alignmentAchievements.greedy, 4);

const discarded = applyDiscard(progressState, "solad", now, () => 0);
assert.equal(discarded.phase, "choose");
assert.equal(discarded.discarded, AGENDAS[0].id);
assert.equal(discarded.pool.length, 5);
assert.equal(discarded.turn, "solad");
assert.equal(redactState(discarded, "gamam").availableAgendas, undefined);
assert.equal(redactState(discarded, "solad").availableAgendas?.length, 5);
assert.throws(() => applyDiscard(draftReady, "gamam", now, () => 0), /not your turn/i);

let state = applyChoose(discarded, "solad", discarded.pool[0], now);
assert.equal(state.turn, "coden");
assert.equal(state.pool.length, 4);
assert.equal(redactState(state, "solad").ownChoice?.id, discarded.pool[0]);
assert.equal(redactState(state, "solad").availableAgendas, undefined);
assert.throws(() => applyChoose(state, "solad", state.pool[0], now), /not your turn/i);

state = applyChoose(state, "coden", state.pool[0], now);
state = applyChoose(state, "olwyn", state.pool[0], now);
state = applyChoose(state, "gamam", state.pool[0], now);
state = applyChoose(state, "natar", state.pool[0], now);

assert.equal(state.phase, "complete");
assert.equal(state.pool.length, 0);
assert.equal(Object.keys(state.choices).length, 5);
assert.equal(redactState(state, "natar").ownChoice?.id, state.choices.natar);
assert.equal(redactState(state, "olwyn").availableAgendas, undefined);
assert.throws(() => endSession(discarded, now), /비밀 의제/);
assert.throws(
  () =>
    calculateFinalScores(discarded, {
      influence: 17,
      wealth: 13,
      morale: 5,
      welfare: 1,
      knowledge: 13,
    }),
  /비밀 의제/,
);

state = saveHouseProgress(
  state,
  "gamam",
  {
    openAgendaTokens: {
      positive: ["influence", "wealth"],
      negative: ["morale", "knowledge"],
    },
    narrativeAchievement: true,
    houseAchievements: [1, 2, 3],
    alignmentAchievements: {
      greedy: 4,
      rebel: 1,
    },
  },
  now,
);
state = savePlayerInventory(state, "solad", { ...createDefaultPlayerInventory(now), coins: 20, powerTokens: 9 }, now);
state = savePlayerInventory(state, "coden", { ...createDefaultPlayerInventory(now), coins: 15, powerTokens: 4 }, now);
state = savePlayerInventory(state, "olwyn", { ...createDefaultPlayerInventory(now), coins: 15, powerTokens: 8 }, now);
state = savePlayerInventory(
  state,
  "gamam",
  {
    coins: 3,
    powerTokens: 9,
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
state = savePlayerInventory(state, "natar", { ...createDefaultPlayerInventory(now), coins: 0, powerTokens: 1 }, now);

const finalScoring = calculateFinalScores(
  state,
  {
    influence: 17,
    wealth: 13,
    morale: 5,
    welfare: 1,
    knowledge: 13,
  },
  now,
);
assert.deepEqual(
  finalScoring.rows.map((row) => [row.houseId, row.scores.total, row.ranks.total]),
  [
    ["olwyn", 23, 1],
    ["coden", 20, 2],
    ["solad", 18, 3],
    ["gamam", 14, 4],
    ["natar", 0, 5],
  ],
);
assert.deepEqual(finalScoring.rows.find((row) => row.houseId === "gamam")?.scores, {
  resourceGoal: 7,
  moneyRanking: 2,
  openAgenda: 3,
  powerMajority: 2,
  total: 14,
});
assert.equal(finalScoring.rows.find((row) => row.houseId === "solad")?.ranks.coins, 1);
assert.equal(finalScoring.rows.find((row) => row.houseId === "olwyn")?.ranks.coins, 2);
assert.equal(finalScoring.rows.find((row) => row.houseId === "gamam")?.ranks.power, 1);
assert.throws(
  () =>
    calculateFinalScores(state, {
      influence: 18,
      wealth: 13,
      morale: 5,
      welfare: 1,
      knowledge: 13,
    }),
  /영향력/,
);

const activeSessions = registerSession(registerSession(state, "solad", "token-a", now), "gamam", "token-b", now);
const ended = endSession(activeSessions, now);
assert.equal(ended.phase, "discard");
assert.deepEqual(ended.draftOrder, ["solad", "coden", "olwyn", "natar", "gamam"]);
assert.equal(ended.turn, "solad");
assert.deepEqual(ended.choices, {});
assert.equal(ended.discarded, null);
assert.equal(ended.pool.length, AGENDAS.length);
assert.deepEqual(ended.sessions, {});
assert.equal(ended.credentials.gamam, credential);
assert.equal(ended.playerNames.gamam, "House Pinchay");
assert.equal(ended.inventories.gamam.coins, 10);
assert.equal(ended.inventories.gamam.powerTokens, 8);
assert.equal(ended.inventories.gamam.prestige, 2);
assert.equal(ended.inventories.gamam.crave, 1);
assert.equal(ended.inventories.gamam.resources.knowledge, 17);
assert.deepEqual(ended.progress.gamam.openAgendaTokens, { positive: [], negative: [] });
assert.equal(ended.progress.gamam.narrativeAchievement, true);
assert.deepEqual(ended.progress.gamam.houseAchievements, [1, 2, 3]);
assert.deepEqual(ended.progress.gamam.houseAchievementComplete, [false, false, false]);
assert.equal(ended.progress.gamam.alignmentAchievements.greedy, 4);
assert.equal(redactState(ended, "solad").canDiscard, true);
assert.equal(redactState(ended, "gamam").ownChoice, null);
assert.deepEqual(normalizeState(ended, now).draftOrder, ended.draftOrder);

console.log("agenda-state tests passed");
