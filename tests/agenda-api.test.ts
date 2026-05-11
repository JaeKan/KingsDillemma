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

const storeFactory = (_rowKey: string) => store;

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

const anonymousGet = await handleAgendaRequest(new Request("http://localhost/api/agenda"), {}, storeFactory);
const anonymousPayload = (await anonymousGet.json()) as any;
assert.equal(anonymousGet.status, 200);
assert.equal(anonymousGet.headers.get("Cache-Control"), "public, max-age=0, must-revalidate");
assert.equal(anonymousPayload.authenticated, false);
assert.equal(anonymousPayload.realtimeEnabled, false);
assert.equal(anonymousPayload.state.phase, "house-select");

const badReset = await handleAgendaRequest(jsonRequest({ action: "reset", code: "wrong" }), {}, storeFactory);
assert.equal(badReset.status, 401);

const reset = await handleAgendaRequest(
  jsonRequest({ action: "reset", code: "12345" }),
  { deployContext: "development" },
  storeFactory,
);
assert.equal(reset.status, 200);
assert.equal((persisted as any)?.phase, "house-select");

const login = await handleAgendaRequest(
  jsonRequest({
    action: "login",
    houseId: "gamam",
    password: "seat-password",
    displayName: "House Pinchay",
  }),
  { deployContext: "development" },
  storeFactory,
);
const loginPayload = (await login.json()) as any;
const setCookie = login.headers.get("Set-Cookie") || "";
assert.equal(login.status, 200);
assert.equal(loginPayload.authenticated, true);
assert.match(setCookie, new RegExp(`^${COOKIE_NAME}=`));
assert.match(setCookie, /HttpOnly/);
assert.match(setCookie, /SameSite=Lax/);
assert.equal((persisted as any)?.sessions.gamam?.token.length, 36);

const authenticatedGet = await handleAgendaRequest(
  new Request("http://localhost/api/agenda", { headers: { Cookie: setCookie } }),
  { realtimeUpdatesEnabled: true },
  storeFactory,
);
const authenticatedPayload = (await authenticatedGet.json()) as any;
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
  storeFactory,
);
const saveProgressPayload = (await saveProgress.json()) as any;
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

const earlyDilemmaEdit = await handleAgendaRequest(jsonRequest({ action: "beginDilemmaEdit" }, setCookie), {}, storeFactory);
const earlyDilemmaEditPayload = (await earlyDilemmaEdit.json()) as any;
assert.equal(earlyDilemmaEdit.status, 409);
assert.match(earlyDilemmaEditPayload.error, /완료/);

const discardMode = await handleAgendaRequest(
  jsonRequest({ action: "setRandomDiscardEnabled", enabled: false }, setCookie),
  {},
  storeFactory,
);
const discardModePayload = (await discardMode.json()) as any;
assert.equal(discardMode.status, 200);
assert.equal(discardModePayload.state.randomDiscardEnabled, false);
assert.equal((persisted as any)?.randomDiscardEnabled, false);

persisted = {
  ...(persisted as any),
  phase: "complete",
  draftOrder: ["gamam", "solad", "natar", "coden", "olwyn"],
  turn: "gamam",
  credentials: {
    ...(persisted as any)!.credentials,
    solad: (persisted as any)!.credentials.gamam,
    natar: (persisted as any)!.credentials.gamam,
    coden: (persisted as any)!.credentials.gamam,
    olwyn: (persisted as any)!.credentials.gamam,
  },
  playerNames: {
    ...(persisted as any)!.playerNames,
    solad: "House Gambol",
    natar: "House Lethe",
    coden: "House Cyfoeth",
    olwyn: "House Daucus",
  },
  inventories: {
    ...(persisted as any)!.inventories,
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
  storeFactory,
);
const saveVoteOrderPayload = (await saveVoteOrder.json()) as any;
assert.equal(saveVoteOrder.status, 200);
assert.deepEqual(saveVoteOrderPayload.state.dilemmaVoteOrder, ["gamam"]);

const saveDilemmaRoles = await handleAgendaRequest(
  jsonRequest({ action: "saveDilemmaRoles", roles: { leaderHouseId: "gamam", moderatorHouseId: "gamam" } }, setCookie),
  {},
  storeFactory,
);
const saveDilemmaRolesPayload = (await saveDilemmaRoles.json()) as any;
assert.equal(saveDilemmaRoles.status, 200);
assert.equal(saveDilemmaRolesPayload.state.dilemmaLeader, "gamam");
assert.equal(saveDilemmaRolesPayload.state.dilemmaModerator, "gamam");

const beginDilemmaEdit = await handleAgendaRequest(jsonRequest({ action: "beginDilemmaEdit" }, setCookie), {}, storeFactory);
const beginDilemmaEditPayload = (await beginDilemmaEdit.json()) as any;
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
  storeFactory,
);
const prematureDilemmaOutcomePayload = (await prematureDilemmaOutcome.json()) as any;
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
  storeFactory,
);
const saveDilemmaPayload = (await saveDilemma.json()) as any;
assert.equal(saveDilemma.status, 200);
assert.equal(saveDilemmaPayload.state.dilemma.title, "Harbor levy");
assert.equal(saveDilemmaPayload.state.dilemma.dilemmaAuthorHouseId, "gamam");
assert.equal(saveDilemmaPayload.state.dilemma.selectedOutcome, "");
assert.deepEqual(saveDilemmaPayload.state.dilemma.nay.resourceDeltas, { morale: -1, knowledge: 2 });
assert.equal(saveDilemmaPayload.state.dilemma.photos.length, 1);
assert.equal(saveDilemmaPayload.state.dilemmaHistory.length, 0);
assert.equal(persisted?.dilemmaHistory.length, 0);

const loginSoladForDilemma = await handleAgendaRequest(
  jsonRequest({
    action: "login",
    houseId: "solad",
    password: "seat-password",
    displayName: "House Gambol",
  }),
  { deployContext: "development" },
  storeFactory,
);
const setCookieSolad = loginSoladForDilemma.headers.get("Set-Cookie") || "";
assert.equal(loginSoladForDilemma.status, 200);
assert.match(setCookieSolad, new RegExp(`^${COOKIE_NAME}=`));

const resetByNonAuthor = await handleAgendaRequest(jsonRequest({ action: "resetDilemma" }, setCookieSolad), {}, storeFactory);
assert.equal(resetByNonAuthor.status, 403);

persisted = {
  ...(persisted as GameState)!,
  sessions: Object.fromEntries(
    Object.entries((persisted as GameState).sessions).filter(([id]) => id !== "solad"),
  ),
};

const blockedPublishDilemma = await handleAgendaRequest(jsonRequest({ action: "publishDilemma" }, setCookie), {}, storeFactory);
const blockedPublishDilemmaPayload = (await blockedPublishDilemma.json()) as any;
assert.equal(blockedPublishDilemma.status, 409);
assert.match(blockedPublishDilemmaPayload.error, /모든 가문.*투표/);

persisted = {
  ...(persisted as any)!,
  dilemma: {
    ...(persisted as any)!.dilemma,
    selectedOutcome: "nay",
    resolutionNotes: "Resolve harbor unrest and place the card.",
    resolutionPhotos: [
      {
        id: "reso-1",
        name: "after.jpg",
        mimeType: "image/jpeg",
        dataUrl: "data:image/jpeg;base64,aGVsbG8=",
        size: 800,
      },
    ],
    votes: {
      gamam: { side: "aye", powerTokens: 2, updatedAt: "2026-05-07T00:00:00.000Z", updatedByName: "House Pinchay" },
      solad: { side: "nay", powerTokens: 1, updatedAt: "2026-05-07T00:00:00.000Z", updatedByName: "House Gambol" },
      natar: { side: "pass", powerTokens: 0, updatedAt: "2026-05-07T00:00:00.000Z", updatedByName: "House Lethe" },
      coden: { side: "nay", powerTokens: 2, updatedAt: "2026-05-07T00:00:00.000Z", updatedByName: "House Cyfoeth" },
      olwyn: { side: "pass", powerTokens: 0, updatedAt: "2026-05-07T00:00:00.000Z", updatedByName: "House Daucus" },
    },
  },
};

const loginSoladForPublish = await handleAgendaRequest(
  jsonRequest({
    action: "login",
    houseId: "solad",
    password: "seat-password",
    displayName: "House Gambol",
  }),
  { deployContext: "development" },
  storeFactory,
);
const setCookieSoladPublish = loginSoladForPublish.headers.get("Set-Cookie") || "";
assert.equal(loginSoladForPublish.status, 200);

const publishByNonAuthor = await handleAgendaRequest(jsonRequest({ action: "publishDilemma" }, setCookieSoladPublish), {}, storeFactory);
assert.equal(publishByNonAuthor.status, 403);

persisted = {
  ...(persisted as GameState)!,
  sessions: Object.fromEntries(
    Object.entries((persisted as GameState).sessions).filter(([id]) => id !== "solad"),
  ),
};

const publishDilemma = await handleAgendaRequest(jsonRequest({ action: "publishDilemma" }, setCookie), {}, storeFactory);
const publishDilemmaPayload = (await publishDilemma.json()) as any;
assert.equal(publishDilemma.status, 200);
assert.equal(publishDilemmaPayload.state.dilemmaHistory.length, 1);
assert.equal(publishDilemmaPayload.state.dilemmaHistory[0].title, "Harbor levy");
assert.equal(publishDilemmaPayload.state.dilemmaHistory[0].resolutionPhotos.length, 1);
assert.equal(publishDilemmaPayload.state.dilemma.title, "");
assert.equal(publishDilemmaPayload.state.dilemma.historyId, "");
assert.equal(persisted?.dilemma.title, "");
assert.equal(persisted?.dilemmaHistory.length, 1);

const republishDilemma = await handleAgendaRequest(jsonRequest({ action: "publishDilemma" }, setCookie), {}, storeFactory);
const republishDilemmaPayload = (await republishDilemma.json()) as any;
assert.equal(republishDilemma.status, 409);
assert.match(republishDilemmaPayload.error, /게시할 딜레마/);

const anonymousDeleteDilemmaHistory = await handleAgendaRequest(
  jsonRequest({ action: "deleteDilemmaHistory", historyId: publishDilemmaPayload.state.dilemmaHistory[0].historyId }),
  {},
  storeFactory,
);
assert.equal(anonymousDeleteDilemmaHistory.status, 401);
assert.equal(persisted?.dilemmaHistory.length, 1);

const deleteDilemmaHistory = await handleAgendaRequest(
  jsonRequest({ action: "deleteDilemmaHistory", historyId: publishDilemmaPayload.state.dilemmaHistory[0].historyId }, setCookie),
  {},
  storeFactory,
);
const deleteDilemmaHistoryPayload = (await deleteDilemmaHistory.json()) as any;
assert.equal(deleteDilemmaHistory.status, 200);
assert.equal(deleteDilemmaHistoryPayload.state.dilemmaHistory.length, 0);
assert.equal(persisted?.dilemmaHistory.length, 0);

/** 이전 단계 로그인(solad)으로 남은 세션을 걷어내면, 로그인은 gamam 하나뿐이어야 투표 단일 참가 시나리오가 성립합니다. */
persisted = {
  ...(persisted as GameState)!,
  sessions: Object.fromEntries(
    Object.entries((persisted as GameState).sessions).filter(([id]) => id === "gamam"),
  ),
};

const saveVotingDilemmaRoles = await handleAgendaRequest(
  jsonRequest({ action: "saveDilemmaRoles", roles: { leaderHouseId: "gamam", moderatorHouseId: "gamam" } }, setCookie),
  {},
  storeFactory,
);
assert.equal(saveVotingDilemmaRoles.status, 200);

const beginVotingDilemmaEdit = await handleAgendaRequest(jsonRequest({ action: "beginDilemmaEdit" }, setCookie), {}, storeFactory);
const beginVotingDilemmaEditPayload = (await beginVotingDilemmaEdit.json()) as any;
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
  storeFactory,
);
assert.equal(saveVotingDilemma.status, 200);

const lockedVoteOrder = await handleAgendaRequest(
  jsonRequest({ action: "saveDilemmaVoteOrder", voteOrder: ["solad", "gamam", "natar", "coden", "olwyn"] }, setCookie),
  {},
  storeFactory,
);
assert.equal(lockedVoteOrder.status, 409);

const loginSoladForPair = await handleAgendaRequest(
  jsonRequest({
    action: "login",
    houseId: "solad",
    password: "seat-password",
    displayName: "House Gambol",
  }),
  { deployContext: "development" },
  storeFactory,
);
const cookieSoladPair = loginSoladForPair.headers.get("Set-Cookie") || "";
assert.equal(loginSoladForPair.status, 200);

const saveDilemmaVote = await handleAgendaRequest(
  jsonRequest({ action: "saveDilemmaVote", vote: { side: "aye", powerTokens: 2 } }, setCookie),
  {},
  storeFactory,
);
const saveDilemmaVotePayload = (await saveDilemmaVote.json()) as any;
assert.equal(saveDilemmaVote.status, 200);
assert.equal(saveDilemmaVotePayload.state.dilemma.votes.gamam.side, "aye");
assert.equal(saveDilemmaVotePayload.state.dilemma.votes.gamam.powerTokens, 2);
assert.equal(saveDilemmaVotePayload.state.dilemmaVoteTurn, null);
assert.equal(saveDilemmaVotePayload.state.canVoteDilemma, true);
assert.equal(saveDilemmaVotePayload.state.canApplyDilemmaVotes, false);

const saveSoladVotePair = await handleAgendaRequest(
  jsonRequest({ action: "saveDilemmaVote", vote: { side: "pass", powerTokens: 0 } }, cookieSoladPair),
  {},
  storeFactory,
);
const saveSoladVotePairPayload = (await saveSoladVotePair.json()) as any;
assert.equal(saveSoladVotePair.status, 200);
assert.equal(saveSoladVotePairPayload.state.canApplyDilemmaVotes, true);

const tallyAuthorUpdatedByBeforeApply = (persisted as GameState).dilemma.updatedBy;

const peekGamamDualVote = await handleAgendaRequest(
  new Request("http://localhost/api/agenda", { headers: { Cookie: setCookie } }),
  {},
  storeFactory,
);
const peekGamamDualVotePayload = (await peekGamamDualVote.json()) as any;
assert.equal(peekGamamDualVote.status, 200);
assert.equal(peekGamamDualVotePayload.state.canResetDilemmaResult, true);
assert.equal(saveSoladVotePairPayload.state.canResetDilemmaResult, false);

const inventoryBeforeApply = structuredClone(persisted?.inventories);

const earlyApplyDilemmaVotes = await handleAgendaRequest(
  jsonRequest({ action: "applyDilemmaVotes" }, cookieSoladPair),
  {},
  storeFactory,
);
const earlyApplyDilemmaVotesPayload = (await earlyApplyDilemmaVotes.json()) as any;
assert.equal(earlyApplyDilemmaVotes.status, 200);
assert.equal((persisted as GameState).dilemma.updatedBy, tallyAuthorUpdatedByBeforeApply);
assert.equal(earlyApplyDilemmaVotesPayload.state.dilemma.selectedOutcome, "aye");
assert.match(earlyApplyDilemmaVotesPayload.state.dilemma.voteNotes, /§4 Vote Resolution/);
assert.equal(earlyApplyDilemmaVotesPayload.state.canVoteDilemma, false);
assert.equal(earlyApplyDilemmaVotesPayload.state.canApplyDilemmaVotes, false);
assert.deepEqual(persisted?.inventories, inventoryBeforeApply);

const tallyResetNonAuthor = await handleAgendaRequest(
  jsonRequest({ action: "resetDilemma" }, cookieSoladPair),
  {},
  storeFactory,
);
assert.equal(tallyResetNonAuthor.status, 403);

const tallyPublishNonAuthor = await handleAgendaRequest(
  jsonRequest({ action: "publishDilemma" }, cookieSoladPair),
  {},
  storeFactory,
);
assert.equal(tallyPublishNonAuthor.status, 403);

const resetDilemma = await handleAgendaRequest(jsonRequest({ action: "resetDilemma" }, setCookie), {}, storeFactory);
const resetDilemmaPayload = (await resetDilemma.json()) as any;
assert.equal(resetDilemma.status, 200);
assert.equal(resetDilemmaPayload.state.dilemma.title, "");
assert.equal(resetDilemmaPayload.state.dilemmaLeader, null);
assert.equal(resetDilemmaPayload.state.dilemmaModerator, null);

console.log("agenda-api tests passed");
