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

async function post(body: Record<string, unknown>, cookie?: string) {
  const response = await handleAgendaRequest(jsonRequest(body, cookie), { deployContext: "development" }, storeFactory);
  return {
    response,
    payload: (await response.json()) as any,
  };
}

const validRecordPhoto = {
  id: "record-photo-1",
  name: " Chronicle photo ",
  mimeType: "image/png",
  dataUrl: "data:image/png;base64,QUJD",
  createdAt: "2026-05-12T00:00:00.000Z",
};

const invalidRecordPhoto = {
  id: "bad-photo",
  name: "not an image",
  mimeType: "text/plain",
  dataUrl: "data:text/plain;base64,QUJD",
};

const reset = await post({ action: "reset", code: "12345" });
assert.equal(reset.response.status, 200);

const login = await post({
  action: "login",
  houseId: "gamam",
  password: "seat-password",
  displayName: "House Pinchay",
});
const cookie = login.response.headers.get("Set-Cookie") || "";
assert.equal(login.response.status, 200);
assert.match(cookie, new RegExp(`^${COOKIE_NAME}=`));

const signerLogin = await post({
  action: "login",
  houseId: "solad",
  password: "seat-password",
  displayName: "House Solad",
});
const signerCookie = signerLogin.response.headers.get("Set-Cookie") || "";
assert.equal(signerLogin.response.status, 200);
assert.match(signerCookie, new RegExp(`^${COOKIE_NAME}=`));

const anonymousAdd = await post({
  action: "addChronicleSticker",
  input: {
    id: "anonymous",
    stickerCode: "ANON",
    resourceId: "influence",
    polarity: "positive",
  },
});
assert.equal(anonymousAdd.response.status, 401);

const unclaimedSignerAdd = await post(
  {
    action: "addChronicleSticker",
    input: {
      id: "unclaimed-signer",
      stickerCode: "UNCLAIMED",
      resourceId: "influence",
      polarity: "positive",
      signedByHouseId: "tork",
    },
  },
  cookie,
);
assert.equal(unclaimedSignerAdd.response.status, 400);

const firstAdd = await post(
  {
    action: "addChronicleSticker",
    input: {
      id: "slot-0",
      stickerCode: "INF+1",
      resourceId: "influence",
      polarity: "positive",
      sourceDilemmaHistoryId: "history-1",
      sourceCardCode: "card-1",
      signedByHouseId: "solad",
      note: "first sticker",
      photos: [validRecordPhoto, invalidRecordPhoto],
    },
  },
  cookie,
);
assert.equal(firstAdd.response.status, 200);
assert.equal(firstAdd.payload.state.chronicleLedger.influence[0].id, "slot-0");
assert.equal(firstAdd.payload.state.chronicleLedger.influence[0].slotIndex, 0);
assert.equal(firstAdd.payload.state.chronicleLedger.influence[0].signedByHouseId, "solad");
assert.equal(firstAdd.payload.state.chronicleLedger.influence[0].signedByName, "House Solad");
assert.equal(firstAdd.payload.state.chronicleLedger.influence[0].photos.length, 1);
assert.equal(firstAdd.payload.state.chronicleLedger.influence[0].photos[0].id, "record-photo-1");
assert.equal(firstAdd.payload.state.chronicleLedger.influence[0].photos[0].name, "Chronicle photo");

const update = await post(
  {
    action: "updateChronicleSticker",
    stickerId: "slot-0",
    patch: {
      stickerCode: "INF+1-EDITED",
      ageMarks: 99,
      note: "updated note",
      unsupportedSpoilerText: "ignored",
      photos: [
        {
          id: "record-photo-2",
          name: "updated",
          mimeType: "image/jpeg",
          dataUrl: "data:image/jpeg;base64,QUJD",
        },
        invalidRecordPhoto,
      ],
    },
  },
  cookie,
);
assert.equal(update.response.status, 200);
assert.equal(update.payload.state.chronicleLedger.influence[0].stickerCode, "INF+1-EDITED");
assert.equal(update.payload.state.chronicleLedger.influence[0].ageMarks, 6);
assert.equal(update.payload.state.chronicleLedger.influence[0].unsupportedSpoilerText, undefined);
assert.equal(update.payload.state.chronicleLedger.influence[0].photos.length, 1);
assert.equal(update.payload.state.chronicleLedger.influence[0].photos[0].id, "record-photo-2");
assert.equal(typeof update.payload.state.chronicleLedger.influence[0].photos[0].createdAt, "string");

for (const input of [
  { id: "slot-1", stickerCode: "INF-1", resourceId: "influence", polarity: "negative", ageMarks: 5 },
  { id: "slot-2", stickerCode: "INF+2", resourceId: "influence", polarity: "positive", ageMarks: 1 },
  { id: "slot-3", stickerCode: "INF-2", resourceId: "influence", polarity: "negative", ageMarks: 3 },
  { id: "slot-4", stickerCode: "INF+3", resourceId: "influence", polarity: "positive", ageMarks: 4 },
]) {
  const add = await post({ action: "addChronicleSticker", input }, cookie);
  assert.equal(add.response.status, 200);
}

const replacement = await post(
  {
    action: "addChronicleSticker",
    input: {
      id: "replacement",
      stickerCode: "INF+4",
      resourceId: "influence",
      polarity: "positive",
    },
  },
  cookie,
);
assert.equal(replacement.response.status, 200);
const afterReplacement = replacement.payload.state.chronicleLedger.influence;
assert.equal(afterReplacement.find((entry: any) => entry.id === "slot-0").replacedAt.length > 0, true);
assert.equal(afterReplacement.find((entry: any) => entry.id === "replacement").slotIndex, 0);

const deleteActive = await post({ action: "deleteChronicleSticker", stickerId: "slot-2" }, cookie);
assert.equal(deleteActive.response.status, 200);
assert.equal(deleteActive.payload.state.chronicleLedger.influence.some((entry: any) => entry.id === "slot-2"), false);

const addAfterDelete = await post(
  {
    action: "addChronicleSticker",
    input: {
      id: "after-delete",
      stickerCode: "INF-3",
      resourceId: "influence",
      polarity: "negative",
    },
  },
  cookie,
);
assert.equal(addAfterDelete.response.status, 200);
assert.equal(addAfterDelete.payload.state.chronicleLedger.influence.find((entry: any) => entry.id === "after-delete").slotIndex, 2);

const aged = await post({ action: "ageChroniclesForNextGame" }, cookie);
assert.equal(aged.response.status, 200);
const agedEntries = aged.payload.state.chronicleLedger.influence;
assert.equal(agedEntries.find((entry: any) => entry.id === "slot-0").ageMarks, 6);
assert.equal(agedEntries.find((entry: any) => entry.id === "replacement").ageMarks, 1);
assert.equal(agedEntries.find((entry: any) => entry.id === "after-delete").ageMarks, 1);

const completeState = persisted as unknown as GameState;
persisted = {
  ...completeState,
  phase: "complete",
  draftOrder: ["solad", "tork", "coden", "olwyn", "gamam"],
  turn: "gamam",
  credentials: {
    gamam: completeState.credentials.gamam,
    solad: completeState.credentials.solad,
    tork: completeState.credentials.gamam,
    coden: completeState.credentials.gamam,
    olwyn: completeState.credentials.gamam,
  },
  playerNames: {
    ...completeState.playerNames,
    tork: "House Tork",
    coden: "House Coden",
    olwyn: "House Olwyn",
  },
  discarded: "extremist",
  pool: [],
  choices: {
    solad: "opulent",
    tork: "greedy",
    coden: "opportunist",
    olwyn: "moderate",
    gamam: "rebel",
  },
  chronicleLedger: {
    influence: [
      {
        id: "active-positive",
        stickerCode: "INF+",
        resourceId: "influence",
        polarity: "positive",
        signedByHouseId: "gamam",
        signedByName: "House Pinchay",
        ageMarks: 2,
        slotIndex: 0,
        sourceDilemmaHistoryId: "history-active-positive",
        sourceCardCode: "card-active-positive",
        placedAt: "2026-05-12T00:00:00.000Z",
        updatedAt: "2026-05-12T00:00:00.000Z",
        replacedAt: "",
        note: "",
        photos: [],
      },
      {
        id: "replaced-negative",
        stickerCode: "INF-OLD",
        resourceId: "influence",
        polarity: "negative",
        signedByHouseId: "solad",
        signedByName: "House Solad",
        ageMarks: 4,
        slotIndex: 1,
        sourceDilemmaHistoryId: "history-replaced-negative",
        sourceCardCode: "card-replaced-negative",
        placedAt: "2026-05-12T00:00:00.000Z",
        updatedAt: "2026-05-12T00:00:00.000Z",
        replacedAt: "2026-05-12T01:00:00.000Z",
        note: "",
        photos: [],
      },
    ],
    wealth: [
      {
        id: "active-negative",
        stickerCode: "WEA-",
        resourceId: "wealth",
        polarity: "negative",
        signedByHouseId: "coden",
        signedByName: "House Coden",
        ageMarks: 1,
        slotIndex: 2,
        sourceDilemmaHistoryId: "history-active-negative",
        sourceCardCode: "card-active-negative",
        placedAt: "2026-05-12T00:00:00.000Z",
        updatedAt: "2026-05-12T00:00:00.000Z",
        replacedAt: "",
        note: "",
        photos: [],
      },
    ],
    morale: [
      {
        id: "ignored-nonparticipant",
        stickerCode: "MOR+",
        resourceId: "morale",
        polarity: "positive",
        signedByHouseId: "natar",
        signedByName: "House Natar",
        ageMarks: 0,
        slotIndex: 4,
        sourceDilemmaHistoryId: "history-ignored-nonparticipant",
        sourceCardCode: "card-ignored-nonparticipant",
        placedAt: "2026-05-12T00:00:00.000Z",
        updatedAt: "2026-05-12T00:00:00.000Z",
        replacedAt: "",
        note: "",
        photos: [],
      },
    ],
    welfare: [],
    knowledge: [
      {
        id: "tie-left",
        stickerCode: "KNO+L",
        resourceId: "knowledge",
        polarity: "positive",
        signedByHouseId: "solad",
        signedByName: "House Solad",
        ageMarks: 0,
        slotIndex: 1,
        sourceDilemmaHistoryId: "history-tie-left",
        sourceCardCode: "card-tie-left",
        placedAt: "2026-05-12T00:00:00.000Z",
        updatedAt: "2026-05-12T00:00:00.000Z",
        replacedAt: "",
        note: "",
        photos: [],
      },
      {
        id: "tie-right",
        stickerCode: "KNO+R",
        resourceId: "knowledge",
        polarity: "positive",
        signedByHouseId: "tork",
        signedByName: "House Tork",
        ageMarks: 0,
        slotIndex: 3,
        sourceDilemmaHistoryId: "history-tie-right",
        sourceCardCode: "card-tie-right",
        placedAt: "2026-05-12T00:00:00.000Z",
        updatedAt: "2026-05-12T00:00:00.000Z",
        replacedAt: "",
        note: "",
        photos: [],
      },
    ],
  },
};

const saveChecklist = await post(
  {
    action: "saveNextGameSetupChecklist",
    checklist: {
      chronicleAged: true,
      legacyDeltas: "yes",
      "": true,
      openAgendas: false,
    },
  },
  cookie,
);
assert.equal(saveChecklist.response.status, 200);
assert.deepEqual(saveChecklist.payload.state.nextGameSetupState.checklist, {
  chronicleAged: true,
  legacyDeltas: false,
  openAgendas: false,
});

const anonymousChecklist = await post({
  action: "saveNextGameSetupChecklist",
  checklist: { chronicleAged: true },
});
assert.equal(anonymousChecklist.response.status, 401);

const applySetup = await post({ action: "applyNextGameSetupAutomation", force: true }, cookie);
assert.equal(applySetup.response.status, 200);
assert.equal(applySetup.payload.state.chronicleLedger.influence.find((entry: any) => entry.id === "active-positive").ageMarks, 3);
assert.equal(applySetup.payload.state.chronicleLedger.influence.find((entry: any) => entry.id === "replaced-negative").ageMarks, 4);
assert.equal(applySetup.payload.state.chronicleLedger.knowledge.find((entry: any) => entry.id === "tie-right").ageMarks, 1);
assert.deepEqual(applySetup.payload.state.nextGameSetupState.lastLegacyResourceDeltas, {
  influence: 1,
  wealth: -1,
  morale: 1,
  knowledge: 2,
});
assert.deepEqual(applySetup.payload.state.nextGameSetupState.lastOpenAgendaAssignments, {
  positive: {
    influence: "gamam",
    knowledge: "tork",
  },
  negative: {
    wealth: "coden",
  },
});
assert.equal(applySetup.payload.state.nextGameSetupState.lastAppliedBy, "gamam");
assert.equal(typeof applySetup.payload.state.nextGameSetupState.lastAppliedAt, "string");
assert.equal(applySetup.payload.state.nextGameSetupState.lastAppliedAt.length > 0, true);
assert.deepEqual(applySetup.payload.state.ownHouseProgress.openAgendaTokens, {
  positive: ["influence"],
  negative: [],
});
assert.deepEqual((persisted as GameState).progress.tork.openAgendaTokens, {
  positive: ["knowledge"],
  negative: [],
});
assert.deepEqual((persisted as GameState).progress.coden.openAgendaTokens, {
  positive: [],
  negative: ["wealth"],
});
const firstAppliedAt = applySetup.payload.state.nextGameSetupState.lastAppliedAt;

const reapplyWithoutForce = await post({ action: "applyNextGameSetupAutomation" }, cookie);
assert.equal(reapplyWithoutForce.response.status, 400);
assert.equal(
  (persisted as GameState).chronicleLedger.influence.find((entry: any) => entry.id === "active-positive")?.ageMarks,
  3,
);
assert.equal(
  (persisted as GameState).chronicleLedger.influence.find((entry: any) => entry.id === "replaced-negative")?.ageMarks,
  4,
);
assert.equal(
  (persisted as GameState).chronicleLedger.knowledge.find((entry: any) => entry.id === "tie-right")?.ageMarks,
  1,
);
assert.equal((persisted as GameState).nextGameSetupState.lastAppliedAt, firstAppliedAt);

const reapplyWithForce = await post({ action: "applyNextGameSetupAutomation", force: true }, cookie);
assert.equal(reapplyWithForce.response.status, 200);
assert.equal(
  reapplyWithForce.payload.state.chronicleLedger.influence.find((entry: any) => entry.id === "active-positive").ageMarks,
  4,
);
assert.equal(
  reapplyWithForce.payload.state.chronicleLedger.influence.find((entry: any) => entry.id === "replaced-negative").ageMarks,
  4,
);
assert.equal(
  reapplyWithForce.payload.state.chronicleLedger.knowledge.find((entry: any) => entry.id === "tie-right").ageMarks,
  2,
);

const nonParticipantToken = "non-participant-token";
const nonParticipantSessionTime = new Date().toISOString();
persisted = {
  ...(persisted as GameState),
  credentials: {
    ...(persisted as GameState).credentials,
    natar: (persisted as GameState).credentials.gamam,
  },
  sessions: {
    ...(persisted as GameState).sessions,
    natar: {
      token: nonParticipantToken,
      createdAt: nonParticipantSessionTime,
      updatedAt: nonParticipantSessionTime,
    },
  },
};
const nonParticipantCookie = `${COOKIE_NAME}=${encodeURIComponent(`natar:${nonParticipantToken}`)}`;

const nonParticipantApply = await post({ action: "applyNextGameSetupAutomation" }, nonParticipantCookie);
assert.equal(nonParticipantApply.response.status, 403);

console.log("agenda-chronicle-api tests passed");
