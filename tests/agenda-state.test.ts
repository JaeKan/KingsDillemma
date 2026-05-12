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
  resetDilemmaRecord,
  resolveModeratorDecision,
  saveAlignmentOrder,
  saveAlignmentReward,
  saveDilemmaRecord,
  saveDilemmaRoles,
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
  effectEntries: [],
  effects: [],
  effectIcon: "",
  effectAmount: 0,
  effectText: "",
});
assert.deepEqual(createDefaultHouseProgress(now).houseAchievementDetails[0], {
  conditionText: "",
  requiredCount: 5,
  effectEntries: [],
  effects: [],
  effectIcon: "",
  effectAmount: 0,
  effectText: "",
});
assert.equal(createDefaultHouseProgress(now).alignmentAchievements.greedy, 0);
assert.deepEqual(createDefaultHouseProgress(now).alignmentRewards.greedy, { crownType: "", count: 0 });
assert.deepEqual(createDefaultHouseProgress(now).alignmentOrder, [
  "extremist",
  "rebel",
  "opulent",
  "opportunist",
  "moderate",
  "greedy",
]);

const anonymousInitial = redactState(initial, null);
assert.equal(initial.currentSessionResolvedDilemmaCount, 0);
assert.equal(normalizeState({ currentSessionResolvedDilemmaCount: -1 }, now).currentSessionResolvedDilemmaCount, 0);
assert.equal(normalizeState({ currentSessionResolvedDilemmaCount: 3.7 }, now).currentSessionResolvedDilemmaCount, 3);
assert.equal(normalizeState({ currentSessionResolvedDilemmaCount: 2000 }, now).currentSessionResolvedDilemmaCount, 999);
assert.equal(anonymousInitial.currentSessionResolvedDilemmaCount, 0);
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
selecting = registerSession(selecting, "gamam", "token-gamam", now);
selecting = setHouseName(selecting, "solad", "House Gambol", now);
selecting = setSeatCredential(selecting, "solad", credential, now);
selecting = registerSession(selecting, "solad", "token-solad", now);
selecting = setHouseName(selecting, "natar", "House Lethe", now);
selecting = setSeatCredential(selecting, "natar", credential, now);
selecting = registerSession(selecting, "natar", "token-natar", now);
selecting = setHouseName(selecting, "coden", "House Cyfoeth", now);
selecting = setSeatCredential(selecting, "coden", credential, now);
selecting = registerSession(selecting, "coden", "token-coden", now);

assert.equal(startDraftIfReady(selecting, now).phase, "house-select");
assert.equal(redactState(selecting, null).claimedHouseCount, 4);

selecting = setHouseName(selecting, "olwyn", "House Daucus", now);
selecting = setSeatCredential(selecting, "olwyn", credential, now);
selecting = registerSession(selecting, "olwyn", "token-olwyn", now);
const draftReady = startDraftIfReady(selecting, now);

assert.equal(draftReady.phase, "discard");
assert.deepEqual(draftReady.draftOrder, ["solad", "coden", "olwyn", "gamam", "natar"]);
assert.equal(draftReady.turn, "solad");
assert.equal(redactState(draftReady, "solad").canDiscard, true);
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
assert.deepEqual(migratedUnpickedDraft.draftOrder, ["solad", "coden", "olwyn", "gamam", "natar"]);
assert.equal(migratedUnpickedDraft.turn, "solad");
assert.equal(migratedUnpickedDraft.version, 10);

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
assert.deepEqual(prestigeDraftReady.draftOrder, ["gamam", "coden", "olwyn", "solad", "natar"]);

const playerSession = registerSession(draftReady, "solad", "token-a", now);
const overwrittenSession = registerSession(playerSession, "solad", "token-b", now);
assert.equal(overwrittenSession.sessions.solad.token, "token-b");
assert.equal(redactState(overwrittenSession, null).houses.find((house) => house.id === "solad")?.hasSession, true);
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
          effects: [
            { icon: "instant" },
            { icon: "coins", amount: 101 },
            { icon: "crave", amount: 1 },
            { icon: "finale", amount: 101 },
          ],
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
assert.equal(normalizedInventoryState.progress.gamam.narrativeAchievementCount, 1);
assert.deepEqual(normalizedInventoryState.progress.gamam.narrativeAchievementDetail, {
  conditionText: "Complete the family story.",
  requiredCount: 1,
  effectEntries: [
    { icon: "instant", amount: 0, text: "Prestige +1" },
  ],
  effects: [
    { icon: "instant", amount: 0 },
  ],
  effectIcon: "instant",
  effectAmount: 0,
  effectText: "Prestige +1",
});
assert.deepEqual(normalizedInventoryState.progress.gamam.houseAchievements, [1, 1, 0]);
assert.deepEqual(normalizedInventoryState.progress.gamam.houseAchievementComplete, [false, false, false]);
assert.deepEqual(normalizedInventoryState.progress.gamam.houseAchievementDetails[0], {
  conditionText: "Spend 5 Power",
  requiredCount: 2,
  effectEntries: [{ icon: "", amount: 0, text: "Gain 1 Coin" }],
  effects: [],
  effectIcon: "",
  effectAmount: 0,
  effectText: "Gain 1 Coin",
});
assert.deepEqual(normalizedInventoryState.progress.gamam.houseAchievementDetails[1], {
  conditionText: "Too many rows",
  requiredCount: 1,
  effectEntries: [{ icon: "", amount: 0, text: "Clamp to one" }],
  effects: [],
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

const alignmentOrder = ["greedy", "opportunist", "rebel", "moderate", "opulent", "extremist"];
const reorderedAlignmentState = saveAlignmentOrder(progressState, "gamam", alignmentOrder, now);
assert.deepEqual(redactState(reorderedAlignmentState, "gamam").ownHouseProgress?.alignmentOrder, [
  "extremist",
  "rebel",
  "opulent",
  "opportunist",
  "moderate",
  "greedy",
]);
const sanitizedAlignmentOrderState = saveAlignmentOrder(progressState, "gamam", ["greedy", "unknown", "greedy"], now);
assert.deepEqual(redactState(sanitizedAlignmentOrderState, "gamam").ownHouseProgress?.alignmentOrder, [
  "extremist",
  "rebel",
  "opulent",
  "opportunist",
  "moderate",
  "greedy",
]);

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
assert.equal(redactState(manualDiscardState, "solad").availableAgendas?.length, 6);
assert.throws(() => applyDiscard(manualDiscardState, "solad", null, now, () => 0), /선택하세요/);
const manuallyDiscarded = applyDiscard(manualDiscardState, "solad", "greedy", now, () => 0);
assert.equal(manuallyDiscarded.discarded, "greedy");
assert.equal(manuallyDiscarded.pool.includes("greedy"), false);

const discarded = applyDiscard(progressState, "solad", null, now, () => 0);
assert.equal(discarded.phase, "choose");
assert.equal(discarded.discarded, AGENDAS[0].id);
assert.equal(discarded.pool.length, 5);
assert.equal(discarded.turn, "solad");
assert.equal(redactState(discarded, "gamam").availableAgendas, undefined);
assert.equal(redactState(discarded, "solad").availableAgendas?.length, 5);
assert.throws(() => setRandomDiscardEnabled(discarded, false, now), /시작되기 전/);
assert.throws(() => applyDiscard(draftReady, "gamam", null, now, () => 0), /not your turn/i);

let state = applyChoose(discarded, "solad", "opulent", now);
assert.equal(state.turn, "coden");
assert.equal(state.pool.length, 4);
assert.equal(redactState(state, "solad").ownChoice?.id, "opulent");
assert.equal(redactState(state, "solad").availableAgendas, undefined);
assert.throws(() => applyChoose(state, "solad", state.pool[0], now), /not your turn/i);

state = applyChoose(state, "coden", "moderate", now);
state = applyChoose(state, "olwyn", "rebel", now);
state = applyChoose(state, "gamam", "opportunist", now);
state = applyChoose(state, "natar", "greedy", now);

assert.equal(state.phase, "complete");
assert.equal(state.pool.length, 0);
assert.equal(Object.keys(state.choices).length, 5);
assert.equal(redactState(state, "natar").ownChoice?.id, state.choices.natar);
assert.equal(redactState(state, "olwyn").availableAgendas, undefined);
assert.throws(() => endSession(discarded, now), /비밀 의제/);
assert.throws(() => beginDilemmaEdit(discarded, "natar", "draft-token", now), /완료/);
state = registerSession(state, "gamam", "vote-session-gamam", now);
state = registerSession(state, "solad", "vote-session-solad", now);
state = registerSession(state, "natar", "vote-session-natar", now);
state = registerSession(state, "coden", "vote-session-coden", now);
state = registerSession(state, "olwyn", "vote-session-olwyn", now);
assert.equal(redactState(state, "gamam").dilemmaLeader, null);
assert.equal(redactState(state, "gamam").dilemmaModerator, null);
assert.throws(() => beginDilemmaEdit(state, "gamam", "draft-token", now), /리더와 중재자/);
state = saveDilemmaRoles(state, "gamam", { leaderHouseId: "gamam", moderatorHouseId: "solad" }, now);
assert.equal(redactState(state, "gamam").dilemmaLeader, "gamam");
assert.equal(redactState(state, "gamam").dilemmaModerator, "solad");
assert.equal(redactState(state, "gamam").canResetDilemmaResult, true);
assert.equal(redactState(state, "solad").canResetDilemmaResult, false);
assert.equal(redactState(state, "natar").canResetDilemmaResult, false);
assert.equal(redactState(state, "gamam").canEditDilemmaRoles, true);
assert.equal(redactState(state, "solad").canEditDilemmaRoles, false);
assert.throws(() => resetDilemmaRecord(state, "natar", now), /최초 수정/);
assert.throws(
  () => saveDilemmaRoles(state, "solad", { leaderHouseId: "solad", moderatorHouseId: "gamam" }, now),
  /최초 수정/,
);
assert.throws(() => beginDilemmaEdit(state, "solad", "non-owner-draft-token", now), /최초 수정/);

let editingDilemma = beginDilemmaEdit(state, "gamam", "edit-token", now);
assert.equal(editingDilemma.dilemma.editLock?.houseId, "gamam");
assert.equal(editingDilemma.dilemma.editLock?.token, "edit-token");
assert.equal(redactState(editingDilemma, "natar").dilemma.editLock?.houseName, "House Pinchay");
assert.equal("token" in (redactState(editingDilemma, "natar").dilemma.editLock || {}), false);
assert.throws(() => beginDilemmaEdit(editingDilemma, "solad", "other-token", now), /수정 중/);
assert.throws(() => resetDilemmaRecord(editingDilemma, "solad", now), /수정 중/);
assert.throws(
  () => saveDilemmaRecord(editingDilemma, "solad", "edit-token", { question: "Should the council pay?" }, "history-1", now),
  /수정 중/,
);
assert.throws(
  () =>
    saveDilemmaRecord(
      editingDilemma,
      "gamam",
      "edit-token",
      { title: "Harbor levy", selectedOutcome: "aye" },
      "history-1",
      now,
    ),
  /모든 가문.*투표/,
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
      resourcePolarities: { wealth: "negative", morale: "positive", knowledge: "bad" },
      resourceDeltas: { wealth: -2, morale: 1, unknown: 4 },
    },
    nay: {
      preview: "morale -",
      result: "Delay repairs and adjust morale.",
      resourceDeltas: { morale: -99, knowledge: "2", welfare: 0 },
    },
    selectedOutcome: "",
    voteNotes: "Aye won by 2 power.",
    resolutionNotes: "",
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
assert.equal(state.dilemma.selectedOutcome, "");
assert.deepEqual(state.dilemma.aye.resourcePolarities, { wealth: "negative", morale: "positive" });
assert.deepEqual(state.dilemma.nay.resourcePolarities, { morale: "negative", knowledge: "positive" });
assert.deepEqual(state.dilemma.aye.resourceDeltas, { wealth: -2, morale: 1 });
assert.deepEqual(state.dilemma.nay.resourceDeltas, { morale: -9, knowledge: 2 });
assert.equal(state.dilemma.photos.length, 1);
assert.equal(state.dilemma.photos[0].addedBy, "gamam");
assert.equal(state.dilemmaHistory.length, 0);
assert.equal(state.dilemma.dilemmaAuthorHouseId, "gamam");
assert.equal(redactState(state, "gamam").canResetDilemmaResult, true);
assert.equal(redactState(state, "solad").canResetDilemmaResult, false);
assert.throws(() => resetDilemmaRecord(state, "solad", now), /최초 수정/);
const resetDilemmaState = resetDilemmaRecord(state, "gamam", now);
assert.deepEqual(resetDilemmaState.dilemma, createDefaultDilemmaRecord(now));
assert.equal(resetDilemmaState.dilemmaLeader, null);
assert.equal(resetDilemmaState.dilemmaModerator, null);
assert.equal(resetDilemmaState.dilemmaRolesAuthorHouseId, null);
assert.equal(redactState(resetDilemmaState, "gamam").canEditDilemmaRoles, true);
assert.equal(resetDilemmaState.dilemmaHistory.length, 0);
assert.throws(() => resetDilemmaRecord(resetDilemmaState, "gamam", now), /현재 초기화할 내용/);
assert.throws(() => publishDilemmaRecord(state, "gamam", "history-1", now), /모든 가문.*투표/);
state = {
  ...state,
  dilemma: {
    ...state.dilemma,
    selectedOutcome: "aye",
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
assert.throws(() => publishDilemmaRecord(state, "solad", "history-1", now), /최초 수정/);
assert.throws(() => publishDilemmaRecord(state, "gamam", "history-1", now), /해결 후속/);
state = {
  ...state,
  dilemma: {
    ...state.dilemma,
    resolutionNotes: "Apply resource movement, check stability, then place card on time counter.",
    resolutionPhotos: [
      {
        id: "reso-photo-1",
        name: "board-after.jpg",
        mimeType: "image/jpeg",
        dataUrl: "data:image/jpeg;base64,aGVsbG8=",
        size: 900,
        addedAt: "",
        addedBy: null,
        addedByName: "",
      },
    ],
  },
};
state = publishDilemmaRecord(state, "gamam", "history-1", now);
assert.equal(state.dilemmaHistory.length, 1);
assert.equal(state.currentSessionResolvedDilemmaCount, 1);
assert.equal(state.dilemmaHistory[0].historyId, "history-1");
assert.deepEqual(state.dilemmaHistory[0].aye.resourcePolarities, { wealth: "negative", morale: "positive" });
assert.deepEqual(state.dilemmaHistory[0].aye.resourceDeltas, { wealth: -2, morale: 1 });
assert.equal(state.dilemmaHistory[0].photos.length, 1);
assert.equal(state.dilemmaHistory[0].resolutionPhotos.length, 1);
assert.equal(state.dilemmaHistory[0].resolutionPhotos[0].addedBy, "gamam");
assert.deepEqual(state.dilemma, createDefaultDilemmaRecord(now));
assert.equal(state.dilemmaLeader, null);
assert.equal(state.dilemmaModerator, null);
assert.equal(state.dilemmaRolesAuthorHouseId, null);
assert.throws(() => publishDilemmaRecord(state, "gamam", "history-1", now), /게시할 딜레마/);
assert.throws(() => deleteDilemmaHistoryEntry(state, "gamam", "missing-history", now), /찾을 수 없습니다/);
assert.throws(() => deleteDilemmaHistoryEntry(state, "solad", "history-1", now), /게시한 가문/);
assert.equal(deleteDilemmaHistoryEntry(state, "gamam", "history-1", now).dilemmaHistory.length, 0);
assert.equal(redactState(state, "solad").dilemma.question, "");
assert.equal(redactState(state, "solad").dilemmaHistory.length, 1);
assert.equal(redactState(state, "solad").dilemmaHistory[0].question, "Should the council fund the repairs?");

state = saveDilemmaRoles(state, "gamam", { leaderHouseId: "gamam", moderatorHouseId: "solad" }, now);
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
assert.equal(votingState.dilemma.dilemmaAuthorHouseId, "gamam");
const dilemmaGamamAuthoredSnapshot = votingState;
/** `dilemmaAuthorHouseId` 가 null 이어도 역할을 처음 지정한 가문만 계속 편집할 수 있다. */
{
  const legacyNullCoedit = {
    ...dilemmaGamamAuthoredSnapshot,
    dilemma: { ...dilemmaGamamAuthoredSnapshot.dilemma, dilemmaAuthorHouseId: null },
  };
  assert.equal(legacyNullCoedit.dilemma.updatedBy, "gamam");
  assert.throws(() => beginDilemmaEdit(legacyNullCoedit, "solad", "legacy-solad-edit", now), /최초 수정/);
  let ownerEditState = beginDilemmaEdit(legacyNullCoedit, "gamam", "legacy-owner-edit", now);
  ownerEditState = saveDilemmaRecord(
    ownerEditState,
    "gamam",
    "legacy-owner-edit",
    {
      title: "Bridge famine (legacy owner)",
      question: "Should the council ration the bridge grain?",
      aye: { preview: "Spend power", result: "Ration grain." },
      nay: { preview: "Hold stores", result: "Keep private stores." },
    },
    "history-vote",
    now,
  );
  assert.equal(ownerEditState.dilemma.dilemmaAuthorHouseId, "gamam");
  assert.equal(ownerEditState.dilemma.updatedBy, "gamam");
  assert.equal(redactState(ownerEditState, "gamam").canResetDilemmaResult, true);
  assert.equal(redactState(ownerEditState, "solad").canResetDilemmaResult, false);
}
assert.throws(() => beginDilemmaEdit(votingState, "solad", "solad-edit", now), /최초 수정/);
assert.throws(() => publishDilemmaRecord(votingState, "solad", "history-vote", now), /최초 수정/);
assert.throws(
  () => saveDilemmaVoteOrder(votingState, "gamam", ["gamam", "solad", "coden", "olwyn", "natar"], now),
  /진행 중/,
);
const customSeatingOrder = ["solad", "natar", "gamam", "coden", "olwyn"] as const;
let customVoteOrderState = {
  ...votingState,
  dilemma: createDefaultDilemmaRecord(now),
};
customVoteOrderState = saveDilemmaVoteOrder(
  customVoteOrderState,
  "gamam",
  [...customSeatingOrder],
  now,
);
assert.deepEqual(redactState(customVoteOrderState, "gamam").dilemmaVoteOrder, [
  "solad",
  "natar",
  "gamam",
  "coden",
  "olwyn",
]);
assert.equal(redactState(customVoteOrderState, "gamam").dilemmaLeader, "gamam");
assert.equal(redactState(customVoteOrderState, "gamam").dilemmaModerator, "solad");
assert.throws(
  () => saveDilemmaVoteOrder(customVoteOrderState, "gamam", ["gamam", "solad", "coden"], now),
  /로그인 중인 가문/,
);
assert.throws(
  () => saveDilemmaVoteOrder(customVoteOrderState, "gamam", ["gamam", "solad", "solad", "olwyn", "natar"], now),
  /로그인 중인 가문/,
);
votingState = savePlayerInventory(votingState, "natar", { ...createDefaultPlayerInventory(now), powerTokens: 3 }, now);
votingState = savePlayerInventory(votingState, "gamam", { ...createDefaultPlayerInventory(now), powerTokens: 8 }, now);
votingState = savePlayerInventory(votingState, "olwyn", { ...createDefaultPlayerInventory(now), powerTokens: 4 }, now);
votingState = savePlayerInventory(votingState, "coden", { ...createDefaultPlayerInventory(now), powerTokens: 6 }, now);
votingState = savePlayerInventory(votingState, "solad", { ...createDefaultPlayerInventory(now), powerTokens: 5 }, now);
assert.equal(
  redactState({ ...votingState, dilemmaVoteOrder: customVoteOrderState.dilemmaVoteOrder }, "gamam").dilemmaVoteTurn,
  null,
);
const customSeatingTurnState = saveDilemmaVote(
  { ...votingState, dilemmaVoteOrder: customVoteOrderState.dilemmaVoteOrder },
  "gamam",
  { side: "aye", powerTokens: 1 },
  now,
);
assert.equal(redactState(customSeatingTurnState, "coden").dilemmaVoteTurn, null);
assert.equal(redactState(votingState, "gamam").dilemmaVoteTurn, null);
assert.equal(redactState(votingState, "gamam").canVoteDilemma, true);
assert.equal(redactState(votingState, "natar").canVoteDilemma, true);
assert.equal(redactState(votingState, "solad").canVoteDilemma, true);
assert.equal(redactState(votingState, "gamam").dilemmaLeader, "gamam");
assert.equal(redactState(votingState, "gamam").dilemmaModerator, "solad");
assert.throws(() => saveDilemmaVote(votingState, "gamam", { side: "aye", powerTokens: 9 }, now), /8개/);
const votingStateBeforeAnyVote = votingState;
votingState = saveDilemmaVote(votingState, "gamam", { side: "aye", powerTokens: 2 }, now);
assert.equal(redactState(votingState, "gamam").canResetDilemmaResult, true);
assert.equal(redactState(votingState, "solad").canResetDilemmaResult, false);
votingState = saveDilemmaVote(votingState, "gamam", { side: "nay", powerTokens: 1 }, now);
assert.equal(votingState.dilemma.votes.gamam?.side, "nay");
assert.equal(redactState(votingState, "natar").dilemmaVoteTurn, null);
assert.equal(redactState(votingState, "natar").canVoteDilemma, true);
votingState = saveDilemmaVote(votingState, "gamam", { side: "aye", powerTokens: 2 }, now);
assert.equal(votingState.dilemma.votes.gamam?.side, "aye");
votingState = saveDilemmaVote(votingState, "solad", { side: "nay", powerTokens: 1 }, now);
votingState = saveDilemmaVote(votingState, "natar", { side: "aye", powerTokens: 3 }, now);
votingState = saveDilemmaVote(votingState, "coden", { side: "pass", powerTokens: 6 }, now);
assert.equal(votingState.dilemma.votes.coden?.powerTokens, 0);
assert.throws(() => applyDilemmaVotes(votingState, "gamam", now), /모든 가문/);
assert.equal(redactState(votingState, "gamam").canApplyDilemmaVotes, false);

let tieLine = saveDilemmaVote(votingStateBeforeAnyVote, "gamam", { side: "aye", powerTokens: 2 }, now);
tieLine = saveDilemmaVote(tieLine, "natar", { side: "aye", powerTokens: 2 }, now);
tieLine = saveDilemmaVote(tieLine, "solad", { side: "nay", powerTokens: 3 }, now);
tieLine = saveDilemmaVote(tieLine, "coden", { side: "nay", powerTokens: 1 }, now);
assert.throws(() => applyDilemmaVotes(tieLine, "gamam", now), /모든 가문/);
tieLine = saveDilemmaVote(tieLine, "olwyn", { side: "pass", powerTokens: 0 }, now);
assert.equal(redactState(tieLine, "gamam").canApplyDilemmaVotes, true);
assert.equal(redactState(tieLine, "solad").canApplyDilemmaVotes, true);
const tiedTallyState = applyDilemmaVotes(tieLine, "solad", now);
assert.equal(tiedTallyState.dilemma.selectedOutcome, "");
assert.match(tiedTallyState.dilemma.voteNotes, /찬성 4 \/ 반대 4 \/ 기권 1/);
assert.equal(
  tiedTallyState.dilemma.updatedBy,
  "gamam",
  "집계 기록 적용 후에도 `updatedBy`는 마지막 편집 저장 가문 유지.",
);
assert.throws(() => publishDilemmaRecord(tiedTallyState, "solad", "history-tie-publish", now), /최초 수정/);
assert.throws(() => resetDilemmaRecord(tiedTallyState, "solad", now), /최초 수정/);
assert.equal(
  redactState(tiedTallyState, "gamam").canResetDilemmaResult,
  true,
  "집계 후 voteNotes·미확정 selectedOutcome 상태에서 작성자에게 초기화 가능",
);
const tiedTallyLegacyAuthor = normalizeState(
  { ...tiedTallyState, dilemma: { ...tiedTallyState.dilemma, dilemmaAuthorHouseId: null } },
  now,
);
assert.equal(tiedTallyLegacyAuthor.dilemma.dilemmaAuthorHouseId, "gamam");
assert.equal(redactState(tiedTallyLegacyAuthor, "gamam").canResetDilemmaResult, true);

assert.throws(() => saveDilemmaVote(tiedTallyState, "gamam", { side: "aye", powerTokens: 1 }, now), /집계/);
assert.throws(() => resolveModeratorDecision(tieLine, "solad", "aye", now), /먼저 투표 집계/);
assert.throws(() => resolveModeratorDecision(tiedTallyState, "gamam", "aye", now), /중재자만/);
assert.throws(() => resolveModeratorDecision(tiedTallyState, "solad", "maybe", now), /중재 결정은/);
const moderatorResolvedState = resolveModeratorDecision(tiedTallyState, "solad", "nay", now);
assert.equal(moderatorResolvedState.dilemma.selectedOutcome, "nay");
assert.equal(
  moderatorResolvedState.dilemma.updatedBy,
  "gamam",
  "중재자 결정 후에도 `updatedBy`(마지막 편집 저장)는 유지된다(`dilemmaAuthorHouseId`와 별개).",
);
assert.equal(redactState(moderatorResolvedState, "gamam").canResetDilemmaResult, true);
assert.equal(redactState(moderatorResolvedState, "solad").canResetDilemmaResult, false);
const legacyAuthorBackfill = normalizeState(
  { ...moderatorResolvedState, dilemma: { ...moderatorResolvedState.dilemma, dilemmaAuthorHouseId: null } },
  now,
);
assert.equal(legacyAuthorBackfill.dilemma.dilemmaAuthorHouseId, "gamam");
assert.throws(() => resolveModeratorDecision(moderatorResolvedState, "solad", "aye", now), /이미 결과/);

let allPassLine = saveDilemmaVote(votingStateBeforeAnyVote, "gamam", { side: "pass", powerTokens: 0 }, now);
allPassLine = saveDilemmaVote(allPassLine, "natar", { side: "pass", powerTokens: 0 }, now);
allPassLine = saveDilemmaVote(allPassLine, "solad", { side: "pass", powerTokens: 0 }, now);
allPassLine = saveDilemmaVote(allPassLine, "coden", { side: "pass", powerTokens: 0 }, now);
allPassLine = saveDilemmaVote(allPassLine, "olwyn", { side: "pass", powerTokens: 0 }, now);
const allPassTally = applyDilemmaVotes(allPassLine, "gamam", now);
assert.equal(allPassTally.dilemma.selectedOutcome, "");
assert.match(allPassTally.dilemma.voteNotes, /찬성 0 \/ 반대 0 \/ 기권 5/);
assert.equal(resolveModeratorDecision(allPassTally, "solad", "aye", now).dilemma.selectedOutcome, "aye");

votingState = saveDilemmaVote(votingState, "olwyn", { side: "nay", powerTokens: 2 }, now);
const inventoriesBeforeDilemmaApply = votingState.inventories;
votingState = applyDilemmaVotes(votingState, "gamam", now);
assert.equal(votingState.dilemma.selectedOutcome, "aye");
assert.match(votingState.dilemma.voteNotes, /찬성 5 \/ 반대 3 \/ 기권 1/);
assert.match(votingState.dilemma.voteNotes, /§4 Vote Resolution/);
const majorityTallyMissingOutcomeHack = {
  ...votingState,
  dilemma: { ...votingState.dilemma, selectedOutcome: "" as const },
};
assert.throws(
  () => resolveModeratorDecision(majorityTallyMissingOutcomeHack as typeof votingState, "solad", "aye", now),
  /찬성과 반대 권력 합계가 같을 때만/,
);
assert.throws(() => publishDilemmaRecord(votingState, "gamam", "history-manual", now), /해결 후속/);
assert.deepEqual(votingState.inventories, inventoriesBeforeDilemmaApply);
assert.equal(redactState(votingState, "natar").dilemmaVoteTurn, null);
assert.equal(redactState(votingState, "natar").canVoteDilemma, false);
assert.throws(() => saveDilemmaVote(votingState, "natar", { side: "nay", powerTokens: 0 }, now), /이미 결과/);
assert.throws(
  () => beginDilemmaEdit(votingState, "solad", "sol-ban-resolu", now),
  /최초 수정/,
);

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
    ["solad", 18, 2],
    ["gamam", 14, 3],
    ["coden", 13, 4],
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
assert.equal(ended.currentSessionResolvedDilemmaCount, 0);
assert.deepEqual(ended.sessions, {});
assert.deepEqual(ended.dilemma, createDefaultDilemmaRecord(now));
assert.equal(ended.dilemmaHistory.length, 1);
assert.equal(ended.credentials.gamam, credential);
assert.equal(ended.playerNames.gamam, "House Pinchay");
assert.equal(ended.inventories.gamam.coins, 3);
assert.equal(ended.inventories.gamam.powerTokens, 9);
assert.equal(ended.inventories.solad.coins, 20);
assert.equal(ended.inventories.coden.coins, 15);
assert.equal(ended.inventories.gamam.prestige, 2);
assert.equal(ended.inventories.gamam.crave, 1);
assert.equal(ended.inventories.gamam.resources.knowledge, 17);
assert.deepEqual(ended.progress.gamam.openAgendaTokens, {
  positive: ["influence", "wealth"],
  negative: ["morale", "knowledge"],
});
assert.equal(ended.progress.gamam.narrativeAchievement, true);
assert.equal(ended.progress.gamam.narrativeAchievementCount, 1);
assert.equal(ended.progress.gamam.narrativeAchievementDetail.effectText, "Prestige +1, Crave +1");
assert.deepEqual(ended.progress.gamam.houseAchievements, [1, 2, 3]);
assert.deepEqual(ended.progress.gamam.houseAchievementComplete, [false, false, false]);
assert.equal(ended.progress.gamam.houseAchievementDetails[0].conditionText, "Open Agenda 2VP+");
assert.equal(ended.progress.gamam.alignmentAchievements.greedy, 4);
assert.equal(redactState(ended, "solad").canDiscard, true);
assert.equal(redactState(ended, "gamam").ownChoice, null);
assert.deepEqual(normalizeState(ended, now).draftOrder, ended.draftOrder);

console.log("agenda-state tests passed");
