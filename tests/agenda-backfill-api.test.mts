import assert from "node:assert/strict";
import {
  COOKIE_NAME,
  handleAgendaRequest,
  type AgendaStateStore,
} from "../shared/agenda-api.mts";
import type { GameState } from "../netlify/functions/_shared/agenda-state.mts";
import {
  assignOpenAgendasFromChronicles,
  calculateLegacyResourceDeltas,
} from "../shared/chronicle-ledger.mts";

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
  id: "backfill-photo-1",
  name: " Backfill photo ",
  mimeType: "image/gif",
  dataUrl: "data:image/gif;base64,QUJD",
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

const anonymousBackfill = await post({
  action: "applyCampaignBackfill",
  backfill: {
    chronicleEntries: [],
    envelopes: [],
    storyCards: [],
    eventCards: [],
    mysteryStickers: [],
  },
});
assert.equal(anonymousBackfill.response.status, 401);

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
assert.equal(signerLogin.response.status, 200);

const manualInventory = await post(
  {
    action: "saveInventory",
    inventory: {
      coins: 42,
      powerTokens: 3,
      prestige: 4,
      crave: 5,
      resources: {
        influence: 1,
        wealth: 2,
        morale: 3,
        welfare: 4,
        knowledge: 5,
      },
    },
  },
  cookie,
);
assert.equal(manualInventory.response.status, 200);

const seed = await post(
  {
    action: "addChronicleSticker",
    input: {
      id: "seed-sticker",
      stickerCode: "OLD",
      resourceId: "influence",
      polarity: "negative",
      signedByHouseId: "gamam",
      ageMarks: 6,
    },
  },
  cookie,
);
assert.equal(seed.response.status, 200);

const apply = await post(
  {
    action: "applyCampaignBackfill",
    backfill: {
      chronicleEntries: [
        {
          stickerCode: " INF+2 ",
          resourceId: "influence",
          polarity: "positive",
          signedByHouseId: "solad",
          signedByName: "  House Solad  ",
          ageMarks: 2,
          slotIndex: 3,
          sourceDilemmaHistoryId: "history-1",
          sourceCardCode: "card-1",
          note: " visible note ",
          hiddenText: "do not store",
          photos: [validRecordPhoto, invalidRecordPhoto],
        },
        {
          stickerCode: "INF-1",
          resourceId: "influence",
          polarity: "negative",
          signedByHouseId: "gamam",
          ageMarks: 99,
          sourceDilemmaHistoryId: "history-2",
          sourceCardCode: "card-2",
          note: "second",
        },
        {
          stickerCode: "DROP",
          resourceId: "wealth",
          polarity: "positive",
          signedByHouseId: "tork",
          ageMarks: 1,
        },
      ],
      envelopes: [
        {
          code: "10",
          openedAt: "2026-05-12T00:00:00.000Z",
          sourceDilemmaHistoryId: "history-1",
          note: "opened",
          spoilerText: "ignored",
          photos: [validRecordPhoto, invalidRecordPhoto],
        },
      ],
      storyCards: [
        {
          code: "S-12",
          status: "completed",
          sourceEnvelopeCode: "10",
          sourceDilemmaHistoryId: "history-1",
          note: "story",
          bodyText: "ignored",
          photos: [validRecordPhoto, invalidRecordPhoto],
        },
      ],
      eventCards: [
        {
          code: "E-07",
          status: "not-a-status",
          sourceEnvelopeCode: "10",
          sourceDilemmaHistoryId: "history-2",
          note: "event",
          photos: [validRecordPhoto, invalidRecordPhoto],
        },
      ],
      mysteryStickers: [
        {
          dossierLetter: "b",
          storylineSymbol: "oak",
          slotKey: "6",
          sourceDilemmaHistoryId: "history-6",
          attachedAt: "2026-05-12T00:10:00.000Z",
          note: "mystery",
          spoilerTitle: "ignored",
          photos: [validRecordPhoto, invalidRecordPhoto],
        },
      ],
      coins: 999,
      prestige: 999,
    },
  },
  cookie,
);

assert.equal(apply.response.status, 200);
assert.equal(apply.payload.state.chronicleLedger.influence.length, 2);
assert.equal(apply.payload.state.chronicleLedger.influence.some((entry: any) => entry.id === "seed-sticker"), false);
assert.equal(apply.payload.state.chronicleLedger.wealth.length, 0);
assert.equal(apply.payload.state.chronicleLedger.influence[0].slotIndex, 3);
assert.equal(apply.payload.state.chronicleLedger.influence[1].slotIndex, 0);
assert.equal(apply.payload.state.chronicleLedger.influence[0].replacedAt, "");
assert.equal(apply.payload.state.chronicleLedger.influence[1].ageMarks, 6);
assert.equal(apply.payload.state.chronicleLedger.influence[0].hiddenText, undefined);
assert.equal(apply.payload.state.chronicleLedger.influence[0].photos.length, 1);
assert.equal(apply.payload.state.chronicleLedger.influence[0].photos[0].name, "Backfill photo");
assert.equal(apply.payload.state.campaignLedger.openedEnvelopes["10"].spoilerText, undefined);
assert.equal(apply.payload.state.campaignLedger.openedEnvelopes["10"].photos.length, 1);
assert.equal(apply.payload.state.campaignLedger.storyCards["S-12"].bodyText, undefined);
assert.equal(apply.payload.state.campaignLedger.storyCards["S-12"].photos.length, 1);
assert.equal(apply.payload.state.campaignLedger.eventCards["E-07"].status, "active");
assert.equal(apply.payload.state.campaignLedger.eventCards["E-07"].photos.length, 1);
assert.equal(apply.payload.state.campaignLedger.mysteryStickers["6"].dossierLetter, "B");
assert.equal(apply.payload.state.campaignLedger.mysteryStickers["6"].photos.length, 1);
assert.equal((apply.payload.state as any).coins, undefined);

const appliedState = persisted as unknown as GameState;
assert.equal(appliedState.inventories.gamam.coins, 42);
assert.equal(appliedState.inventories.gamam.prestige, 4);

const deltas = calculateLegacyResourceDeltas(appliedState.chronicleLedger);
assert.equal(deltas.influence ?? 0, 0);

const assignments = assignOpenAgendasFromChronicles(appliedState.chronicleLedger, ["gamam", "solad"]);
assert.equal(assignments.positive.influence, "solad");
assert.equal(assignments.negative.influence, "gamam");

const replaceWithEmpty = await post(
  {
    action: "applyCampaignBackfill",
    backfill: {
      chronicleEntries: [],
      envelopes: [],
      storyCards: [],
      eventCards: [],
      mysteryStickers: [],
    },
  },
  cookie,
);
assert.equal(replaceWithEmpty.response.status, 200);
assert.equal(replaceWithEmpty.payload.state.chronicleLedger.influence.length, 0);
assert.equal(Object.keys(replaceWithEmpty.payload.state.campaignLedger.openedEnvelopes).length, 0);

console.log("agenda-backfill-api tests passed");
