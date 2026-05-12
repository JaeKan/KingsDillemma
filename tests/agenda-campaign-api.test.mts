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
  id: "campaign-photo-1",
  name: " Campaign photo ",
  mimeType: "image/webp",
  dataUrl: "data:image/webp;base64,QUJD",
  createdAt: "2026-05-12T00:00:00.000Z",
};

const invalidRecordPhoto = {
  id: "bad-photo",
  name: "not an image",
  mimeType: "application/json",
  dataUrl: "data:application/json;base64,QUJD",
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

const anonymousEnvelope = await post({
  action: "saveCampaignEnvelope",
  envelope: {
    code: "10",
    openedAt: "2026-05-12T00:00:00.000Z",
  },
});
assert.equal(anonymousEnvelope.response.status, 401);

const saveEnvelope = await post(
  {
    action: "saveCampaignEnvelope",
    envelope: {
      code: "10",
      openedAt: "2026-05-12T00:00:00.000Z",
      sourceDilemmaHistoryId: "history-1",
      note: "Opened by procedure.",
      hiddenText: "ignored spoiler",
      photos: [validRecordPhoto, invalidRecordPhoto],
    },
  },
  cookie,
);
assert.equal(saveEnvelope.response.status, 200);
assert.deepEqual(saveEnvelope.payload.state.campaignLedger.openedEnvelopes["10"], {
  code: "10",
  openedAt: "2026-05-12T00:00:00.000Z",
  sourceDilemmaHistoryId: "history-1",
  note: "Opened by procedure.",
  photos: [
    {
      id: "campaign-photo-1",
      name: "Campaign photo",
      mimeType: "image/webp",
      dataUrl: "data:image/webp;base64,QUJD",
      createdAt: "2026-05-12T00:00:00.000Z",
    },
  ],
});

const deleteEnvelope = await post({ action: "deleteCampaignEnvelope", code: "10" }, cookie);
assert.equal(deleteEnvelope.response.status, 200);
assert.equal(deleteEnvelope.payload.state.campaignLedger.openedEnvelopes["10"], undefined);

const saveStoryCard = await post(
  {
    action: "saveCampaignCard",
    cardKind: "story",
    card: {
      code: "S-12",
      status: "completed",
      sourceEnvelopeCode: "10",
      sourceDilemmaHistoryId: "history-1",
      note: "Card resolved.",
      bodyText: "ignored spoiler",
      photos: [validRecordPhoto, invalidRecordPhoto],
    },
  },
  cookie,
);
assert.equal(saveStoryCard.response.status, 200);
assert.equal(saveStoryCard.payload.state.campaignLedger.storyCards["S-12"].code, "S-12");
assert.equal(saveStoryCard.payload.state.campaignLedger.storyCards["S-12"].status, "completed");
assert.equal(saveStoryCard.payload.state.campaignLedger.storyCards["S-12"].sourceEnvelopeCode, "10");
assert.equal(saveStoryCard.payload.state.campaignLedger.storyCards["S-12"].bodyText, undefined);
assert.equal(typeof saveStoryCard.payload.state.campaignLedger.storyCards["S-12"].updatedAt, "string");
assert.equal(saveStoryCard.payload.state.campaignLedger.storyCards["S-12"].photos.length, 1);

const saveEventCard = await post(
  {
    action: "saveCampaignCard",
    cardKind: "event",
    card: {
      code: "E-07",
      status: "archived",
      sourceEnvelopeCode: "10",
      sourceDilemmaHistoryId: "history-2",
      note: "Event archived.",
      photos: [validRecordPhoto, invalidRecordPhoto],
    },
  },
  cookie,
);
assert.equal(saveEventCard.response.status, 200);
assert.equal(saveEventCard.payload.state.campaignLedger.eventCards["E-07"].status, "archived");
assert.equal(saveEventCard.payload.state.campaignLedger.eventCards["E-07"].photos.length, 1);

const deleteStoryCard = await post({ action: "deleteCampaignCard", cardKind: "story", code: "S-12" }, cookie);
assert.equal(deleteStoryCard.response.status, 200);
assert.equal(deleteStoryCard.payload.state.campaignLedger.storyCards["S-12"], undefined);
assert.equal(deleteStoryCard.payload.state.campaignLedger.eventCards["E-07"].code, "E-07");

for (const slotKey of ["1", "2", "3", "4", "5", "6"]) {
  const saveSticker = await post(
    {
      action: "saveMysterySticker",
      sticker: {
        dossierLetter: "a",
        storylineSymbol: "oak",
        slotKey,
        sourceDilemmaHistoryId: `history-${slotKey}`,
        note: `slot ${slotKey}`,
        spoilerTitle: "ignored spoiler",
        photos: slotKey === "6" ? [validRecordPhoto, invalidRecordPhoto] : [],
      },
    },
    cookie,
  );
  assert.equal(saveSticker.response.status, 200);
}

assert.ok(persisted);
const currentState: GameState = persisted;
const mysteryStickers = Object.values(currentState.campaignLedger.mysteryStickers);
assert.equal(mysteryStickers.length, 6);
assert.equal(mysteryStickers.filter((entry) => entry.dossierLetter === "A").length, 6);
assert.equal((currentState.campaignLedger.mysteryStickers["6"] as any).spoilerTitle, undefined);
assert.equal(currentState.campaignLedger.mysteryStickers["6"].photos?.length, 1);

const deleteMysterySticker = await post({ action: "deleteMysterySticker", slotKey: "6" }, cookie);
assert.equal(deleteMysterySticker.response.status, 200);
assert.equal(Object.keys(deleteMysterySticker.payload.state.campaignLedger.mysteryStickers).length, 5);
assert.equal(deleteMysterySticker.payload.state.campaignLedger.mysteryStickers["6"], undefined);

console.log("agenda-campaign-api tests passed");
