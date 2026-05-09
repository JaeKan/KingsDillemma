import assert from "node:assert/strict";
import {
  COOKIE_NAME,
  handleAgendaRequest,
  type AgendaStateStore,
} from "../shared/agenda-api.mts";
import type { GameState } from "../netlify/functions/_shared/agenda-state.mts";

let persisted: GameState | null = null;
const store: AgendaStateStore = {
  get: async () => persisted,
  set: async (state) => {
    persisted = state;
  },
};

function jsonRequest(body: Record<string, unknown>, cookie?: string) {
  return new Request("http://localhost/api/agenda", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

function apiInventory(prestige = 0) {
  return {
    coins: 10,
    powerTokens: 8,
    prestige,
    crave: 0,
    resources: {
      influence: 0,
      wealth: 0,
      morale: 0,
      welfare: 0,
      knowledge: 0,
    },
    updatedAt: "2026-05-07T00:00:00.000Z",
  };
}

const anonymousGet = await handleAgendaRequest(new Request("http://localhost/api/agenda"), {}, store);
const anonymousPayload = await anonymousGet.json();
assert.equal(anonymousGet.status, 200);
assert.equal(anonymousGet.headers.get("Cache-Control"), "public, max-age=0, must-revalidate");
assert.equal(anonymousPayload.authenticated, false);
assert.equal(anonymousPayload.realtimeEnabled, false);
assert.equal(anonymousPayload.state.phase, "house-select");

const badReset = await handleAgendaRequest(jsonRequest({ action: "reset", code: "wrong" }), {}, store);
assert.equal(badReset.status, 401);

const reset = await handleAgendaRequest(
  jsonRequest({ action: "reset", code: "12345" }),
  { deployContext: "development" },
  store,
);
assert.equal(reset.status, 200);
assert.equal(persisted?.phase, "house-select");

const login = await handleAgendaRequest(
  jsonRequest({
    action: "login",
    houseId: "gamam",
    password: "seat-password",
    displayName: "House Pinchay",
  }),
  { deployContext: "development" },
  store,
);
const loginPayload = await login.json();
const setCookie = login.headers.get("Set-Cookie") || "";
assert.equal(login.status, 200);
assert.equal(loginPayload.authenticated, true);
assert.match(setCookie, new RegExp(`^${COOKIE_NAME}=`));
assert.match(setCookie, /HttpOnly/);
assert.match(setCookie, /SameSite=Lax/);
assert.equal(persisted?.sessions.gamam?.token.length, 36);

const authenticatedGet = await handleAgendaRequest(
  new Request("http://localhost/api/agenda", { headers: { Cookie: setCookie } }),
  { realtimeUpdatesEnabled: true },
  store,
);
const authenticatedPayload = await authenticatedGet.json();
assert.equal(authenticatedGet.status, 200);
assert.equal(authenticatedGet.headers.get("Cache-Control"), "no-store");
assert.equal(authenticatedPayload.authenticated, true);
assert.equal(authenticatedPayload.realtimeEnabled, true);
assert.equal(authenticatedPayload.state.ownInventory.coins, 10);

const saveProgress = await handleAgendaRequest(
  jsonRequest(
    {
      action: "saveHouseProgress",
      progress: {
        narrativeAchievementCount: 2,
        narrativeAchievementDetail: {
          conditionText: "Story event",
          requiredCount: 2,
          effectEntries: [
            { icon: "instant", text: "@재화 +2" },
            { icon: "start", text: "@명망 +1" },
            { icon: "bad", text: "ignored" },
            { icon: "", text: "" },
          ],
        },
        houseAchievements: [4, 2, 1],
        houseAchievementDetails: [
          {
            conditionText: "Coin threshold",
            requiredCount: 3,
            effectEntries: [
              { icon: "start", text: "@재화 +1" },
              { icon: "condition", text: "@권력 +2" },
            ],
          },
        ],
      },
    },
    setCookie,
  ),
  {},
  store,
);
const saveProgressPayload = await saveProgress.json();
assert.equal(saveProgress.status, 200);
assert.equal(saveProgressPayload.state.ownHouseProgress.narrativeAchievementDetail.effectText, "@재화 +2 · @명망 +1 · ignored");
assert.deepEqual(saveProgressPayload.state.ownHouseProgress.narrativeAchievementDetail.effectEntries, [
  { icon: "instant", amount: 0, text: "@재화 +2" },
  { icon: "start", amount: 0, text: "@명망 +1" },
  { icon: "", amount: 0, text: "ignored" },
]);
assert.deepEqual(saveProgressPayload.state.ownHouseProgress.narrativeAchievementDetail.effects, [
  { icon: "instant", amount: 0 },
  { icon: "start", amount: 0 },
]);
assert.equal(saveProgressPayload.state.ownHouseProgress.narrativeAchievementDetail.effectIcon, "instant");
assert.equal(saveProgressPayload.state.ownHouseProgress.narrativeAchievementDetail.effectAmount, 0);
assert.equal(saveProgressPayload.state.ownHouseProgress.narrativeAchievementDetail.requiredCount, 1);
assert.equal(saveProgressPayload.state.ownHouseProgress.narrativeAchievementCount, 1);
assert.equal(saveProgressPayload.state.ownHouseProgress.narrativeAchievement, true);
assert.equal(saveProgressPayload.state.ownHouseProgress.houseAchievements[0], 3);
assert.equal(saveProgressPayload.state.ownHouseProgress.houseAchievementDetails[0].requiredCount, 3);
assert.deepEqual(saveProgressPayload.state.ownHouseProgress.houseAchievementDetails[0].effectEntries, [
  { icon: "start", amount: 0, text: "@재화 +1" },
  { icon: "condition", amount: 0, text: "@권력 +2" },
]);
assert.deepEqual(saveProgressPayload.state.ownHouseProgress.houseAchievementDetails[0].effects, [
  { icon: "start", amount: 0 },
  { icon: "condition", amount: 0 },
]);
assert.equal(saveProgressPayload.state.ownHouseProgress.houseAchievementDetails[0].effectIcon, "start");
assert.equal(saveProgressPayload.state.ownHouseProgress.houseAchievementDetails[0].effectAmount, 0);

const earlyDilemmaEdit = await handleAgendaRequest(jsonRequest({ action: "beginDilemmaEdit" }, setCookie), {}, store);
const earlyDilemmaEditPayload = await earlyDilemmaEdit.json();
assert.equal(earlyDilemmaEdit.status, 409);
assert.match(earlyDilemmaEditPayload.error, /완료/);

const discardMode = await handleAgendaRequest(
  jsonRequest({ action: "setRandomDiscardEnabled", enabled: false }, setCookie),
  {},
  store,
);
const discardModePayload = await discardMode.json();
assert.equal(discardMode.status, 200);
assert.equal(discardModePayload.state.randomDiscardEnabled, false);
assert.equal(persisted?.randomDiscardEnabled, false);

persisted = {
  ...persisted!,
  phase: "complete",
  draftOrder: ["gamam", "solad", "natar", "coden", "olwyn"],
  turn: "gamam",
  credentials: {
    ...persisted!.credentials,
    solad: persisted!.credentials.gamam,
    natar: persisted!.credentials.gamam,
    coden: persisted!.credentials.gamam,
    olwyn: persisted!.credentials.gamam,
  },
  playerNames: {
    ...persisted!.playerNames,
    solad: "House Gambol",
    natar: "House Lethe",
    coden: "House Cyfoeth",
    olwyn: "House Daucus",
  },
  inventories: {
    ...persisted!.inventories,
    gamam: apiInventory(5),
    solad: apiInventory(),
    natar: apiInventory(),
    coden: apiInventory(),
    olwyn: apiInventory(),
  },
  discarded: "extremist",
  pool: [],
  choices: {
    gamam: "opulent",
    solad: "greedy",
    natar: "opportunist",
    coden: "moderate",
    olwyn: "rebel",
  },
};

const saveVoteOrder = await handleAgendaRequest(
  jsonRequest({ action: "saveDilemmaVoteOrder", voteOrder: ["gamam"] }, setCookie),
  {},
  store,
);
const saveVoteOrderPayload = await saveVoteOrder.json();
assert.equal(saveVoteOrder.status, 200);
assert.deepEqual(saveVoteOrderPayload.state.dilemmaVoteOrder, ["gamam"]);

const saveDilemmaRoles = await handleAgendaRequest(
  jsonRequest({ action: "saveDilemmaRoles", roles: { leaderHouseId: "gamam", moderatorHouseId: "gamam" } }, setCookie),
  {},
  store,
);
const saveDilemmaRolesPayload = await saveDilemmaRoles.json();
assert.equal(saveDilemmaRoles.status, 200);
assert.equal(saveDilemmaRolesPayload.state.dilemmaLeader, "gamam");
assert.equal(saveDilemmaRolesPayload.state.dilemmaModerator, "gamam");

const beginDilemmaEdit = await handleAgendaRequest(jsonRequest({ action: "beginDilemmaEdit" }, setCookie), {}, store);
const beginDilemmaEditPayload = await beginDilemmaEdit.json();
assert.equal(beginDilemmaEdit.status, 200);
assert.equal(beginDilemmaEditPayload.dilemmaEditToken.length, 36);
assert.equal(beginDilemmaEditPayload.state.dilemma.editLock.token, undefined);

const prematureDilemmaOutcome = await handleAgendaRequest(
  jsonRequest(
    {
      action: "saveDilemma",
      dilemmaEditToken: beginDilemmaEditPayload.dilemmaEditToken,
      dilemma: {
        title: "Harbor levy",
        selectedOutcome: "nay",
      },
    },
    setCookie,
  ),
  {},
  store,
);
const prematureDilemmaOutcomePayload = await prematureDilemmaOutcome.json();
assert.equal(prematureDilemmaOutcome.status, 409);
assert.match(prematureDilemmaOutcomePayload.error, /모든 가문.*투표/);

const saveDilemma = await handleAgendaRequest(
  jsonRequest(
    {
      action: "saveDilemma",
      dilemmaEditToken: beginDilemmaEditPayload.dilemmaEditToken,
      dilemma: {
        title: "Harbor levy",
        question: "Should the council fund the harbor?",
        aye: {
          resourceDeltas: { wealth: 1 },
        },
        nay: {
          resourceDeltas: { morale: -1, knowledge: 2 },
        },
        photos: [
          {
            id: "photo-1",
            name: "result.jpg",
            mimeType: "image/jpeg",
            dataUrl: "data:image/jpeg;base64,aGVsbG8=",
            size: 1200,
          },
        ],
      },
    },
    setCookie,
  ),
  {},
  store,
);
const saveDilemmaPayload = await saveDilemma.json();
assert.equal(saveDilemma.status, 200);
assert.equal(saveDilemmaPayload.state.dilemma.title, "Harbor levy");
assert.equal(saveDilemmaPayload.state.dilemma.selectedOutcome, "");
assert.deepEqual(saveDilemmaPayload.state.dilemma.nay.resourceDeltas, { morale: -1, knowledge: 2 });
assert.equal(saveDilemmaPayload.state.dilemma.photos.length, 1);
assert.equal(saveDilemmaPayload.state.dilemmaHistory.length, 0);
assert.equal(persisted?.dilemmaHistory.length, 0);

const blockedPublishDilemma = await handleAgendaRequest(jsonRequest({ action: "publishDilemma" }, setCookie), {}, store);
const blockedPublishDilemmaPayload = await blockedPublishDilemma.json();
assert.equal(blockedPublishDilemma.status, 409);
assert.match(blockedPublishDilemmaPayload.error, /모든 가문.*투표/);

persisted = {
  ...persisted!,
  dilemma: {
    ...persisted!.dilemma,
    selectedOutcome: "nay",
    resolutionNotes: "Resolve harbor unrest and place the card.",
    votes: {
      gamam: { side: "aye", powerTokens: 2, updatedAt: "2026-05-07T00:00:00.000Z", updatedByName: "House Pinchay" },
      solad: { side: "nay", powerTokens: 1, updatedAt: "2026-05-07T00:00:00.000Z", updatedByName: "House Gambol" },
      natar: { side: "pass", powerTokens: 0, updatedAt: "2026-05-07T00:00:00.000Z", updatedByName: "House Lethe" },
      coden: { side: "nay", powerTokens: 2, updatedAt: "2026-05-07T00:00:00.000Z", updatedByName: "House Cyfoeth" },
      olwyn: { side: "pass", powerTokens: 0, updatedAt: "2026-05-07T00:00:00.000Z", updatedByName: "House Daucus" },
    },
  },
};

const publishDilemma = await handleAgendaRequest(jsonRequest({ action: "publishDilemma" }, setCookie), {}, store);
const publishDilemmaPayload = await publishDilemma.json();
assert.equal(publishDilemma.status, 200);
assert.equal(publishDilemmaPayload.state.dilemmaHistory.length, 1);
assert.equal(publishDilemmaPayload.state.dilemmaHistory[0].title, "Harbor levy");
assert.equal(publishDilemmaPayload.state.dilemma.title, "");
assert.equal(publishDilemmaPayload.state.dilemma.historyId, "");
assert.equal(persisted?.dilemma.title, "");
assert.equal(persisted?.dilemmaHistory.length, 1);

const republishDilemma = await handleAgendaRequest(jsonRequest({ action: "publishDilemma" }, setCookie), {}, store);
const republishDilemmaPayload = await republishDilemma.json();
assert.equal(republishDilemma.status, 409);
assert.match(republishDilemmaPayload.error, /게시할 딜레마/);

const anonymousDeleteDilemmaHistory = await handleAgendaRequest(
  jsonRequest({ action: "deleteDilemmaHistory", historyId: publishDilemmaPayload.state.dilemmaHistory[0].historyId }),
  {},
  store,
);
assert.equal(anonymousDeleteDilemmaHistory.status, 401);
assert.equal(persisted?.dilemmaHistory.length, 1);

const deleteDilemmaHistory = await handleAgendaRequest(
  jsonRequest({ action: "deleteDilemmaHistory", historyId: publishDilemmaPayload.state.dilemmaHistory[0].historyId }, setCookie),
  {},
  store,
);
const deleteDilemmaHistoryPayload = await deleteDilemmaHistory.json();
assert.equal(deleteDilemmaHistory.status, 200);
assert.equal(deleteDilemmaHistoryPayload.state.dilemmaHistory.length, 0);
assert.equal(persisted?.dilemmaHistory.length, 0);

const saveVotingDilemmaRoles = await handleAgendaRequest(
  jsonRequest({ action: "saveDilemmaRoles", roles: { leaderHouseId: "gamam", moderatorHouseId: "gamam" } }, setCookie),
  {},
  store,
);
assert.equal(saveVotingDilemmaRoles.status, 200);

const beginVotingDilemmaEdit = await handleAgendaRequest(jsonRequest({ action: "beginDilemmaEdit" }, setCookie), {}, store);
const beginVotingDilemmaEditPayload = await beginVotingDilemmaEdit.json();
assert.equal(beginVotingDilemmaEdit.status, 200);

const saveVotingDilemma = await handleAgendaRequest(
  jsonRequest(
    {
      action: "saveDilemma",
      dilemmaEditToken: beginVotingDilemmaEditPayload.dilemmaEditToken,
      dilemma: {
        title: "Council vote",
        question: "Should the council vote now?",
        aye: { result: "Proceed." },
        nay: { result: "Delay." },
      },
    },
    setCookie,
  ),
  {},
  store,
);
assert.equal(saveVotingDilemma.status, 200);

const lockedVoteOrder = await handleAgendaRequest(
  jsonRequest({ action: "saveDilemmaVoteOrder", voteOrder: ["solad", "gamam", "natar", "coden", "olwyn"] }, setCookie),
  {},
  store,
);
assert.equal(lockedVoteOrder.status, 409);

const saveDilemmaVote = await handleAgendaRequest(
  jsonRequest({ action: "saveDilemmaVote", vote: { side: "aye", powerTokens: 2 } }, setCookie),
  {},
  store,
);
const saveDilemmaVotePayload = await saveDilemmaVote.json();
assert.equal(saveDilemmaVote.status, 200);
assert.equal(saveDilemmaVotePayload.state.dilemma.votes.gamam.side, "aye");
assert.equal(saveDilemmaVotePayload.state.dilemma.votes.gamam.powerTokens, 2);
assert.equal(saveDilemmaVotePayload.state.dilemmaVoteTurn, null);
assert.equal(saveDilemmaVotePayload.state.canVoteDilemma, false);
const inventoryBeforeApply = structuredClone(persisted?.inventories);

const earlyApplyDilemmaVotes = await handleAgendaRequest(jsonRequest({ action: "applyDilemmaVotes" }, setCookie), {}, store);
const earlyApplyDilemmaVotesPayload = await earlyApplyDilemmaVotes.json();
assert.equal(earlyApplyDilemmaVotes.status, 200);
assert.equal(earlyApplyDilemmaVotesPayload.state.dilemma.selectedOutcome, "");
assert.match(earlyApplyDilemmaVotesPayload.state.dilemma.voteNotes, /수기로 반영/);
assert.equal(earlyApplyDilemmaVotesPayload.state.canVoteDilemma, false);
assert.deepEqual(persisted?.inventories, inventoryBeforeApply);

const resetDilemma = await handleAgendaRequest(jsonRequest({ action: "resetDilemma" }, setCookie), {}, store);
const resetDilemmaPayload = await resetDilemma.json();
assert.equal(resetDilemma.status, 200);
assert.equal(resetDilemmaPayload.state.dilemma.title, "");
assert.equal(resetDilemmaPayload.state.dilemmaLeader, null);
assert.equal(resetDilemmaPayload.state.dilemmaModerator, null);

console.log("agenda-api tests passed");
