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
const pngDataUrl = "data:image/png;base64,iVBORw0KGgo=";

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

const reset = await post({ action: "reset", code: "12345" });
assert.equal(reset.response.status, 200);
assert.equal(reset.payload.state.boardProcessingOwnerHouseId, null);
assert.equal(reset.payload.state.boardProcessingOwnerName, "");
assert.equal(reset.payload.state.isBoardProcessingOwner, false);
assert.deepEqual(reset.payload.state.boardProcessingItems, []);
assert.deepEqual(reset.payload.state.boardProcessingHistory.envelope, []);
assert.equal(reset.payload.state.dilemma, undefined);
assert.equal(reset.payload.state.dilemmaHistory, undefined);
assert.equal(reset.payload.state.dilemmaVoteOrder, undefined);
assert.equal(reset.payload.state.chronicleLedger, undefined);
assert.equal(reset.payload.state.campaignLedger, undefined);
assert.equal(reset.payload.state.nextGameSetupState, undefined);

const login = await post(
  {
    action: "login",
    houseId: "gamam",
    password: "seat-password",
    displayName: "House Pinchay",
  },
);
const cookie = login.response.headers.get("Set-Cookie") || "";
assert.equal(login.response.status, 200);
assert.match(cookie, new RegExp(`^${COOKIE_NAME}=`));

const anonymous = await post({
  action: "saveBoardProcessingItem",
  item: {
    type: "envelope",
    envelopeCode: "10",
    note: "Open the envelope.",
  },
});
assert.equal(anonymous.response.status, 401);

const removedActions = [
  "beginDilemmaEdit",
  "saveDilemmaVote",
  "applyDilemmaVotes",
  "addChronicleSticker",
  "saveCampaignEnvelope",
  "applyCampaignBackfill",
  "applyNextGameSetupAutomation",
  "setBoardProcessingOwner",
];

for (const action of removedActions) {
  const removed = await post({ action }, cookie);
  assert.equal(removed.response.status, 400, `${action} should be rejected`);
  assert.equal(removed.payload.error, "Unknown action.");
}

const nonAdminSave = await post(
  {
    action: "saveBoardProcessingItem",
    item: {
      type: "envelope",
      envelopeCode: "10",
      note: "Open the envelope.",
    },
  },
  cookie,
);
assert.equal(nonAdminSave.response.status, 403);
assert.equal(nonAdminSave.payload.error, "구성물 정리 기록은 관리자만 저장하거나 삭제할 수 있습니다.");

const adminMode = await post({ action: "setAdminMode", enabled: true }, cookie);
assert.equal(adminMode.response.status, 200);
assert.equal(adminMode.payload.admin, true);
assert.equal(adminMode.payload.state.isAdmin, true);

const otherLogin = await post(
  {
    action: "login",
    houseId: "solad",
    password: "seat-password",
    displayName: "House Solad",
  },
);
const otherCookie = otherLogin.response.headers.get("Set-Cookie") || "";
assert.equal(otherLogin.response.status, 200);
assert.equal(otherLogin.payload.state.isAdmin, false);

const otherHouseSave = await post(
  {
    action: "saveBoardProcessingItem",
    item: {
      type: "envelope",
      envelopeCode: "10",
      note: "Open the envelope.",
    },
  },
  otherCookie,
);
assert.equal(otherHouseSave.response.status, 403);
assert.equal(otherHouseSave.payload.error, "구성물 정리 기록은 관리자만 저장하거나 삭제할 수 있습니다.");

const save = await post(
  {
    action: "saveBoardProcessingItem",
    item: {
      type: "envelope",
      envelopeCode: " 10 ",
      note: " Open the envelope. ",
      hiddenText: "ignored",
      photos: [
        {
          id: "photo-1",
          name: " 보드 사진.png ",
          mimeType: "image/png",
          dataUrl: pngDataUrl,
          createdAt: "2026-05-31T12:00:00.000Z",
        },
        {
          id: "photo-1",
          name: "duplicate.png",
          mimeType: "image/png",
          dataUrl: pngDataUrl,
        },
        {
          id: "photo-2",
          name: "not-image.txt",
          mimeType: "text/plain",
          dataUrl: "data:text/plain;base64,abcd",
        },
        {
          id: "photo-3",
          name: "board.webp",
          mimeType: "image/webp",
          dataUrl: "data:image/webp;base64,abcd",
        },
        {
          id: "photo-4",
          name: "board.gif",
          mimeType: "image/gif",
          dataUrl: "data:image/gif;base64,abcd",
        },
        {
          id: "photo-5",
          name: "ignored-over-limit.jpg",
          mimeType: "image/jpeg",
          dataUrl: "data:image/jpeg;base64,abcd",
        },
      ],
    },
  },
  cookie,
);
assert.equal(save.response.status, 200);
assert.equal(save.payload.state.boardProcessingItems.length, 1);
assert.equal(save.payload.state.boardProcessingItems[0].type, "envelope");
assert.equal(save.payload.state.boardProcessingItems[0].envelopeCode, "10");
assert.equal(save.payload.state.boardProcessingItems[0].note, "Open the envelope.");
assert.equal(save.payload.state.boardProcessingItems[0].createdBy, "gamam");
assert.equal(save.payload.state.boardProcessingItems[0].hiddenText, undefined);
assert.equal(save.payload.state.boardProcessingItems[0].photos.length, 3);
assert.equal(save.payload.state.boardProcessingItems[0].photos[0].name, "보드 사진.png");
assert.equal(save.payload.state.boardProcessingItems[0].photos[0].dataUrl, pngDataUrl);
assert.deepEqual(
  save.payload.state.boardProcessingItems[0].photos.map((photo: any) => photo.id),
  ["photo-1", "photo-3", "photo-4"],
);
assert.deepEqual(save.payload.state.boardProcessingHistory.envelope, save.payload.state.boardProcessingItems);
assert.deepEqual(save.payload.state.boardProcessingHistory.chronicle, []);

const nonOwnerDelete = await post(
  {
    action: "deleteBoardProcessingItem",
    itemId: save.payload.state.boardProcessingItems[0].id,
  },
  otherCookie,
);
assert.equal(nonOwnerDelete.response.status, 403);
assert.equal(nonOwnerDelete.payload.error, "구성물 정리 기록은 관리자만 저장하거나 삭제할 수 있습니다.");

const deleteItem = await post(
  {
    action: "deleteBoardProcessingItem",
    itemId: save.payload.state.boardProcessingItems[0].id,
  },
  cookie,
);
assert.equal(deleteItem.response.status, 200);
assert.deepEqual(deleteItem.payload.state.boardProcessingItems, []);
assert.deepEqual(deleteItem.payload.state.boardProcessingHistory.envelope, []);

console.log("board-processing-api tests passed");
