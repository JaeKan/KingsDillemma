import assert from "node:assert/strict";
import {
  AGENDAS,
  applyChoose,
  applyDiscard,
  applyDilemmaVotes,
  beginDilemmaEdit,
  calculateFinalScores,
  cancelDilemmaEdit,
  clearSession,
  createDefaultDilemmaRecord,
  createDefaultHouseProgress,
  createDefaultPlayerInventory,
  createInitialState,
  deleteDilemmaHistoryEntry,
  endSession,
  normalizeState,
  publishDilemmaRecord,
  registerSession,
  redactState,
  saveAlignmentReward,
  saveDilemmaRecord,
  saveDilemmaVote,
  saveDilemmaVoteOrder,
  saveHouseProgress,
  savePlayerInventory,
  setRandomDiscardEnabled,
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
assert.equal(initial.randomDiscardEnabled, true);
assert.equal(initial.pool.length, 6);
assert.deepEqual(initial.dilemma, createDefaultDilemmaRecord(now));
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
assert.equal(createDefaultHouseProgress(now).narrativeAchievementCount, 0);
assert.deepEqual(createDefaultHouseProgress(now).narrativeAchievementDetail, {
  conditionText: "",
  requiredCount: 1,
  effectIcon: "",
  effectAmount: 0,
  effectText: "",
});
assert.deepEqual(createDefaultHouseProgress(now).houseAchievementDetails[0], {
  conditionText: "",
  requiredCount: 5,
  effectIcon: "",
  effectAmount: 0,
  effectText: "",
});
assert.equal(createDefaultHouseProgress(now).alignmentAchievements.greedy, 0);
assert.deepEqual(createDefaultHouseProgress(now).alignmentRewards.greedy, { crownType: "", count: 0 });

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
assert.throws(() => applyDiscard(initial, "gamam", null, now, () => 0), /모든 가문/);
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
assert.deepEqual(draftReady.draftOrder, ["natar", "gamam", "olwyn", "coden", "solad"]);
assert.equal(draftReady.turn, "natar");
assert.equal(redactState(draftReady, "natar").canDiscard, true);
assert.equal(redactState(draftReady, "gamam").canDiscard, false);
assert.equal(redactState(draftReady, "solad").availableAgendas, undefined);

const migratedUnpickedDraft = normalizeState(
  {
    ...draftReady,
    version: 2,
    draftOrder: ["solad", "coden", "olwyn", "gamam", "natar"],
    turn: "solad",
    choices: {},
  },
  now,
);
assert.deepEqual(migratedUnpickedDraft.draftOrder, ["natar", "gamam", "olwyn", "coden", "solad"]);
assert.equal(migratedUnpickedDraft.turn, "natar");
assert.equal(migratedUnpickedDraft.version, 6);

const pickedLegacyDraft = normalizeState(
  {
    ...draftReady,
    version: 2,
    phase: "choose",
    draftOrder: ["solad", "coden", "olwyn", "gamam", "natar"],
    turn: "coden",
    discarded: "extremist",
    choices: { solad: "opulent" },
  },
  now,
);
assert.deepEqual(pickedLegacyDraft.draftOrder, ["solad", "coden", "olwyn", "gamam", "natar"]);
assert.equal(pickedLegacyDraft.turn, "coden");

let prestigeSelecting = savePlayerInventory(selecting, "solad", { ...createDefaultPlayerInventory(now), prestige: 3 }, now);
prestigeSelecting = savePlayerInventory(prestigeSelecting, "coden", { ...createDefaultPlayerInventory(now), prestige: 1 }, now);
prestigeSelecting = savePlayerInventory(prestigeSelecting, "olwyn", { ...createDefaultPlayerInventory(now), prestige: 1 }, now);
prestigeSelecting = savePlayerInventory(prestigeSelecting, "natar", { ...createDefaultPlayerInventory(now), prestige: 5 }, now);
const prestigeDraftReady = startDraftIfReady(prestigeSelecting, now);
assert.deepEqual(prestigeDraftReady.draftOrder, ["gamam", "olwyn", "coden", "solad", "natar"]);

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
        narrativeAchievementCount: 8,
        narrativeAchievementDetail: {
          conditionText: "  Complete the family story.  ",
          requiredCount: 9,
          effectIcon: "prestige",
          effectAmount: 101,
          effectText: "Prestige +1",
        },
        houseAchievements: [1.8, 7, "bad"],
        houseAchievementDetails: [
          {
            conditionText: "Spend 5 Power",
            requiredCount: 2,
            effectIcon: "power",
            effectAmount: 2.7,
            effectText: "Gain 1 Coin",
          },
          {
            conditionText: "Too many rows",
            requiredCount: 0,
            effectIcon: "bad",
            effectAmount: 5,
            effectText: "Clamp to one",
          },
        ],
        alignmentAchievements: {
          Extremist: 2,
          greedy: 8,
        },
        alignmentRewards: {
          Greedy: {
            crownType: "prestige",
            count: 3,
          },
          rebel: {
            crownType: "crave",
            count: 99,
          },
          opulent: {
            crownType: "invalid",
            count: 2,
          },
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
assert.equal(normalizedInventoryState.progress.gamam.narrativeAchievementCount, 5);
assert.deepEqual(normalizedInventoryState.progress.gamam.narrativeAchievementDetail, {
  conditionText: "Complete the family story.",
  requiredCount: 5,
  effectIcon: "prestige",
  effectAmount: 99,
  effectText: "Prestige +1",
});
assert.deepEqual(normalizedInventoryState.progress.gamam.houseAchievements, [1, 1, 0]);
assert.deepEqual(normalizedInventoryState.progress.gamam.houseAchievementComplete, [false, false, false]);
assert.deepEqual(normalizedInventoryState.progress.gamam.houseAchievementDetails[0], {
  conditionText: "Spend 5 Power",
  requiredCount: 2,
  effectIcon: "power",
  effectAmount: 2,
  effectText: "Gain 1 Coin",
});
assert.deepEqual(normalizedInventoryState.progress.gamam.houseAchievementDetails[1], {
  conditionText: "Too many rows",
  requiredCount: 1,
  effectIcon: "",
  effectAmount: 0,
  effectText: "Clamp to one",
});
assert.equal(normalizedInventoryState.progress.gamam.alignmentAchievements.extremist, 2);
assert.equal(normalizedInventoryState.progress.gamam.alignmentAchievements.greedy, 4);
assert.deepEqual(normalizedInventoryState.progress.gamam.alignmentRewards.greedy, {
  crownType: "prestige",
  count: 3,
});
assert.deepEqual(normalizedInventoryState.progress.gamam.alignmentRewards.rebel, {
  crownType: "crave",
  count: 3,
});
assert.deepEqual(normalizedInventoryState.progress.gamam.alignmentRewards.opulent, {
  crownType: "",
  count: 0,
});

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
    narrativeAchievementCount: 1,
    narrativeAchievementDetail: {
      conditionText: "Unlocked by a story event",
      requiredCount: 1,
      effectText: "Prestige +1",
    },
    houseAchievements: [1, 2, 3],
    houseAchievementDetails: [
      {
        conditionText: "End with 18 coins",
        requiredCount: 3,
        effectText: "Start with +1 coin",
      },
      {
        conditionText: "Open agenda score",
        requiredCount: 4,
        effectText: "Prestige +1",
      },
      {
        conditionText: "Lowest resource",
        requiredCount: 5,
        effectText: "Crave +1",
      },
    ],
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
assert.equal(redactState(progressState, "gamam").ownHouseProgress?.narrativeAchievementCount, 1);
assert.equal(
  redactState(progressState, "gamam").ownHouseProgress?.narrativeAchievementDetail.conditionText,
  "Unlocked by a story event",
);
assert.deepEqual(redactState(progressState, "gamam").ownHouseProgress?.openAgendaTokens.positive, [
  "influence",
  "wealth",
]);
assert.equal(redactState(progressState, "gamam").ownHouseProgress?.houseAchievementDetails[0].requiredCount, 3);
assert.equal(redactState(progressState, "gamam").ownHouseProgress?.alignmentAchievements.greedy, 4);

const rewardState = saveAlignmentReward(progressState, "gamam", "greedy", { crownType: "crave", count: 2 }, now);
assert.equal(rewardState.version, progressState.version + 1);
assert.deepEqual(redactState(rewardState, "gamam").ownHouseProgress?.alignmentRewards.greedy, {
  crownType: "crave",
  count: 2,
});
assert.throws(
  () => saveAlignmentReward(progressState, "gamam", "unknown", { crownType: "crave", count: 2 }, now),
  /성향을 선택하세요/,
);

const preservedRewardState = saveHouseProgress(
  rewardState,
  "gamam",
  {
    ...rewardState.progress.gamam,
    alignmentAchievements: {
      greedy: 3,
    },
    alignmentRewards: undefined,
  },
  now,
);
assert.deepEqual(preservedRewardState.progress.gamam.alignmentRewards.greedy, {
  crownType: "crave",
  count: 2,
});

assert.equal(redactState(progressState, "natar").availableAgendas, undefined);
const manualDiscardState = setRandomDiscardEnabled(progressState, false, now);
assert.equal(manualDiscardState.randomDiscardEnabled, false);
assert.equal(redactState(manualDiscardState, "natar").availableAgendas?.length, 6);
assert.throws(() => applyDiscard(manualDiscardState, "natar", null, now, () => 0), /선택하세요/);
const manuallyDiscarded = applyDiscard(manualDiscardState, "natar", "greedy", now, () => 0);
assert.equal(manuallyDiscarded.discarded, "greedy");
assert.equal(manuallyDiscarded.pool.includes("greedy"), false);

const discarded = applyDiscard(progressState, "natar", null, now, () => 0);
assert.equal(discarded.phase, "choose");
assert.equal(discarded.discarded, AGENDAS[0].id);
assert.equal(discarded.pool.length, 5);
assert.equal(discarded.turn, "natar");
assert.equal(redactState(discarded, "gamam").availableAgendas, undefined);
assert.equal(redactState(discarded, "natar").availableAgendas?.length, 5);
assert.throws(() => setRandomDiscardEnabled(discarded, false, now), /시작되기 전/);
assert.throws(() => applyDiscard(draftReady, "gamam", null, now, () => 0), /not your turn/i);

let state = applyChoose(discarded, "natar", "greedy", now);
assert.equal(state.turn, "gamam");
assert.equal(state.pool.length, 4);
assert.equal(redactState(state, "natar").ownChoice?.id, "greedy");
assert.equal(redactState(state, "natar").availableAgendas, undefined);
assert.throws(() => applyChoose(state, "natar", state.pool[0], now), /not your turn/i);

state = applyChoose(state, "gamam", "opportunist", now);
state = applyChoose(state, "olwyn", "rebel", now);
state = applyChoose(state, "coden", "moderate", now);
state = applyChoose(state, "solad", "opulent", now);

assert.equal(state.phase, "complete");
assert.equal(state.pool.length, 0);
assert.equal(Object.keys(state.choices).length, 5);
assert.equal(redactState(state, "natar").ownChoice?.id, state.choices.natar);
assert.equal(redactState(state, "olwyn").availableAgendas, undefined);
assert.throws(() => endSession(discarded, now), /비밀 의제/);
assert.throws(() => beginDilemmaEdit(discarded, "natar", "draft-token", now), /완료/);

let editingDilemma = beginDilemmaEdit(state, "gamam", "edit-token", now);
assert.equal(editingDilemma.dilemma.editLock?.houseId, "gamam");
assert.equal(editingDilemma.dilemma.editLock?.token, "edit-token");
assert.equal(redactState(editingDilemma, "natar").dilemma.editLock?.houseName, "House Pinchay");
assert.equal("token" in (redactState(editingDilemma, "natar").dilemma.editLock || {}), false);
assert.throws(() => beginDilemmaEdit(editingDilemma, "solad", "other-token", now), /수정 중/);
assert.throws(
  () => saveDilemmaRecord(editingDilemma, "solad", "edit-token", { question: "Should the council pay?" }, "history-1", now),
  /수정 중/,
);

state = saveDilemmaRecord(
  editingDilemma,
  "gamam",
  "edit-token",
  {
    cardCode: "I-12",
    title: "Harbor levy",
    timeCounterSlot: "3",
    context: "The harbor needs repairs.",
    question: "Should the council fund the repairs?",
    councilNotes: "Trade houses promised support.",
    aye: {
      preview: "wealth -",
      result: "Pay coins and adjust wealth.",
      resourceDeltas: { wealth: -2, morale: 1, unknown: 4 },
    },
    nay: {
      preview: "morale -",
      result: "Delay repairs and adjust morale.",
      resourceDeltas: { morale: -99, knowledge: "2", welfare: 0 },
    },
    selectedOutcome: "aye",
    voteNotes: "Aye won by 2 power.",
    resolutionNotes: "Apply resource movement, check stability, then place card on time counter.",
    photos: [
      {
        id: "photo-1",
        name: "result.jpg",
        mimeType: "image/jpeg",
        dataUrl: "data:image/jpeg;base64,aGVsbG8=",
        size: 1200,
      },
      {
        id: "bad-photo",
        name: "bad.svg",
        mimeType: "image/svg+xml",
        dataUrl: "data:image/svg+xml;base64,aGVsbG8=",
        size: 1200,
      },
    ],
  },
  "history-1",
  now,
);
assert.equal(state.dilemma.editLock, null);
assert.equal(state.dilemma.historyId, "history-1");
assert.equal(state.dilemma.updatedBy, "gamam");
assert.equal(state.dilemma.updatedByName, "House Pinchay");
assert.equal(state.dilemma.selectedOutcome, "aye");
assert.deepEqual(state.dilemma.aye.resourceDeltas, { wealth: -2, morale: 1 });
assert.deepEqual(state.dilemma.nay.resourceDeltas, { morale: -9, knowledge: 2 });
assert.equal(state.dilemma.photos.length, 1);
assert.equal(state.dilemma.photos[0].addedBy, "gamam");
assert.equal(state.dilemmaHistory.length, 0);
assert.throws(() => publishDilemmaRecord(state, "gamam", "history-1", now), /모두 투표/);
state = {
  ...state,
  dilemma: {
    ...state.dilemma,
    resolutionNotes: "",
    votes: {
      gamam: { side: "aye", powerTokens: 2, updatedAt: now, updatedByName: "House Pinchay" },
      solad: { side: "nay", powerTokens: 1, updatedAt: now, updatedByName: "House Gambol" },
      natar: { side: "pass", powerTokens: 0, updatedAt: now, updatedByName: "House Lethe" },
      coden: { side: "aye", powerTokens: 1, updatedAt: now, updatedByName: "House Cyfoeth" },
      olwyn: { side: "nay", powerTokens: 1, updatedAt: now, updatedByName: "House Daucus" },
    },
  },
};
assert.throws(() => publishDilemmaRecord(state, "gamam", "history-1", now), /해결 후속/);
state = {
  ...state,
  dilemma: {
    ...state.dilemma,
    resolutionNotes: "Apply resource movement, check stability, then place card on time counter.",
  },
};
state = publishDilemmaRecord(state, "gamam", "history-1", now);
assert.equal(state.dilemmaHistory.length, 1);
assert.equal(state.dilemmaHistory[0].historyId, "history-1");
assert.deepEqual(state.dilemmaHistory[0].aye.resourceDeltas, { wealth: -2, morale: 1 });
assert.equal(state.dilemmaHistory[0].photos.length, 1);
assert.deepEqual(state.dilemma, createDefaultDilemmaRecord(now));
assert.throws(() => publishDilemmaRecord(state, "gamam", "history-1", now), /게시할 딜레마/);
assert.throws(() => deleteDilemmaHistoryEntry(state, "gamam", "missing-history", now), /찾을 수 없습니다/);
assert.throws(() => deleteDilemmaHistoryEntry(state, "solad", "history-1", now), /게시한 가문/);
assert.equal(deleteDilemmaHistoryEntry(state, "gamam", "history-1", now).dilemmaHistory.length, 0);
assert.equal(redactState(state, "solad").dilemma.question, "");
assert.equal(redactState(state, "solad").dilemmaHistory.length, 1);
assert.equal(redactState(state, "solad").dilemmaHistory[0].question, "Should the council fund the repairs?");

let votingState = beginDilemmaEdit(state, "gamam", "vote-edit-token", now);
votingState = saveDilemmaRecord(
  votingState,
  "gamam",
  "vote-edit-token",
  {
    title: "Bridge famine",
    question: "Should the council ration the bridge grain?",
    aye: { preview: "Spend power", result: "Ration grain." },
    nay: { preview: "Hold stores", result: "Keep private stores." },
  },
  "history-vote",
  now,
);
assert.throws(
  () => saveDilemmaVoteOrder(votingState, "gamam", ["gamam", "solad", "coden", "olwyn", "natar"], now),
  /진행 중/,
);
let customVoteOrderState = {
  ...votingState,
  dilemma: createDefaultDilemmaRecord(now),
};
customVoteOrderState = saveDilemmaVoteOrder(
  customVoteOrderState,
  "gamam",
  ["gamam", "solad", "coden", "olwyn", "natar"],
  now,
);
assert.deepEqual(redactState(customVoteOrderState, "gamam").dilemmaVoteOrder, [
  "gamam",
  "solad",
  "coden",
  "olwyn",
  "natar",
]);
assert.throws(
  () => saveDilemmaVoteOrder(customVoteOrderState, "gamam", ["gamam", "solad", "coden"], now),
  /다섯 가문/,
);
assert.throws(
  () => saveDilemmaVoteOrder(customVoteOrderState, "gamam", ["gamam", "solad", "solad", "olwyn", "natar"], now),
  /다섯 가문/,
);
votingState = savePlayerInventory(votingState, "natar", { ...createDefaultPlayerInventory(now), powerTokens: 3 }, now);
votingState = savePlayerInventory(votingState, "gamam", { ...createDefaultPlayerInventory(now), powerTokens: 8 }, now);
votingState = savePlayerInventory(votingState, "olwyn", { ...createDefaultPlayerInventory(now), powerTokens: 4 }, now);
votingState = savePlayerInventory(votingState, "coden", { ...createDefaultPlayerInventory(now), powerTokens: 6 }, now);
votingState = savePlayerInventory(votingState, "solad", { ...createDefaultPlayerInventory(now), powerTokens: 5 }, now);
assert.equal(
  redactState({ ...votingState, dilemmaVoteOrder: customVoteOrderState.dilemmaVoteOrder }, "gamam").dilemmaVoteTurn,
  "gamam",
);
assert.equal(redactState(votingState, "natar").dilemmaVoteTurn, "natar");
assert.equal(redactState(votingState, "natar").canVoteDilemma, true);
assert.equal(redactState(votingState, "gamam").canVoteDilemma, false);
assert.throws(() => saveDilemmaVote(votingState, "natar", { side: "aye", powerTokens: 4 }, now), /3개/);
votingState = saveDilemmaVote(votingState, "natar", { side: "aye", powerTokens: 3 }, now);
assert.equal(redactState(votingState, "solad").dilemmaVoteTurn, "solad");
assert.equal(redactState(votingState, "solad").canVoteDilemma, true);
assert.throws(() => saveDilemmaVote(votingState, "gamam", { side: "aye", powerTokens: 2 }, now), /투표 차례/);
votingState = saveDilemmaVote(votingState, "solad", { side: "nay", powerTokens: 1 }, now);
votingState = saveDilemmaVote(votingState, "coden", { side: "pass", powerTokens: 6 }, now);
votingState = saveDilemmaVote(votingState, "olwyn", { side: "nay", powerTokens: 2 }, now);
assert.equal(votingState.dilemma.votes.coden?.powerTokens, 0);
assert.throws(() => applyDilemmaVotes(votingState, "gamam", now), /모두/);
const tieVotingState = saveDilemmaVote(votingState, "gamam", { side: "pass", powerTokens: 0 }, now);
assert.throws(() => applyDilemmaVotes(tieVotingState, "gamam", now), /같습니다/);
votingState = saveDilemmaVote(votingState, "gamam", { side: "aye", powerTokens: 2 }, now);
votingState = applyDilemmaVotes(votingState, "gamam", now);
assert.equal(votingState.dilemma.selectedOutcome, "aye");
assert.match(votingState.dilemma.voteNotes, /찬성 5 \/ 반대 3 \/ 기권 1/);
assert.equal(votingState.inventories.natar.powerTokens, 0);
assert.equal(votingState.inventories.gamam.powerTokens, 6);
assert.equal(votingState.inventories.olwyn.powerTokens, 4);
assert.equal(redactState(votingState, "natar").dilemmaVoteTurn, null);
assert.equal(redactState(votingState, "natar").canVoteDilemma, false);
assert.throws(() => saveDilemmaVote(votingState, "natar", { side: "nay", powerTokens: 0 }, now), /이미 적용/);

editingDilemma = beginDilemmaEdit(state, "gamam", "edit-token-2", now);
const canceledDilemma = cancelDilemmaEdit(editingDilemma, "gamam", "edit-token-2", now);
assert.equal(canceledDilemma.dilemma.editLock, null);
editingDilemma = beginDilemmaEdit(state, "gamam", "edit-token-3", now);
const logoutClearedDilemma = clearSession(editingDilemma, "gamam", now);
assert.equal(logoutClearedDilemma.dilemma.editLock, null);
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
    narrativeAchievementCount: 1,
    narrativeAchievementDetail: {
      conditionText: "Embrace Immortality",
      requiredCount: 1,
      effectText: "Prestige +1, Crave +1",
    },
    houseAchievements: [1, 2, 3],
    houseAchievementDetails: [
      {
        conditionText: "Open Agenda 2VP+",
        requiredCount: 5,
        effectText: "Power +2",
      },
      {
        conditionText: "Stability upper half",
        requiredCount: 5,
        effectText: "Coins +3",
      },
      {
        conditionText: "Coins 18+",
        requiredCount: 5,
        effectText: "Coins +3",
      },
    ],
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
assert.deepEqual(ended.draftOrder, ["natar", "olwyn", "coden", "solad", "gamam"]);
assert.equal(ended.turn, "natar");
assert.deepEqual(ended.choices, {});
assert.equal(ended.discarded, null);
assert.equal(ended.pool.length, AGENDAS.length);
assert.deepEqual(ended.sessions, {});
assert.deepEqual(ended.dilemma, createDefaultDilemmaRecord(now));
assert.equal(ended.dilemmaHistory.length, 1);
assert.equal(ended.credentials.gamam, credential);
assert.equal(ended.playerNames.gamam, "House Pinchay");
assert.equal(ended.inventories.gamam.coins, 10);
assert.equal(ended.inventories.gamam.powerTokens, 8);
assert.equal(ended.inventories.gamam.prestige, 2);
assert.equal(ended.inventories.gamam.crave, 1);
assert.equal(ended.inventories.gamam.resources.knowledge, 17);
assert.deepEqual(ended.progress.gamam.openAgendaTokens, { positive: [], negative: [] });
assert.equal(ended.progress.gamam.narrativeAchievement, true);
assert.equal(ended.progress.gamam.narrativeAchievementCount, 1);
assert.equal(ended.progress.gamam.narrativeAchievementDetail.effectText, "Prestige +1, Crave +1");
assert.deepEqual(ended.progress.gamam.houseAchievements, [1, 2, 3]);
assert.deepEqual(ended.progress.gamam.houseAchievementComplete, [false, false, false]);
assert.equal(ended.progress.gamam.houseAchievementDetails[0].conditionText, "Open Agenda 2VP+");
assert.equal(ended.progress.gamam.alignmentAchievements.greedy, 4);
assert.equal(redactState(ended, "natar").canDiscard, true);
assert.equal(redactState(ended, "gamam").ownChoice, null);
assert.deepEqual(normalizeState(ended, now).draftOrder, ended.draftOrder);

console.log("agenda-state tests passed");
