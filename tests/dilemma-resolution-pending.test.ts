import assert from "node:assert/strict";
import type { RedactedHouse } from "../src/types/game.ts";
import {
  isDilemmaResolutionEntryPending,
  createDilemmaDraft,
  getOrderedDilemmaResourceEffects,
  normalizeDilemmaOutcome,
  normalizeResolutionChecklist,
} from "../src/utils/dilemma-helpers.ts";
import { normalizeAchievementEffectEntries } from "../src/utils/normalizers.ts";

const fiveVoteHouses = [
  { id: "gamam", hasSession: true },
  { id: "solad", hasSession: true },
  { id: "natar", hasSession: true },
  { id: "coden", hasSession: true },
  { id: "olwyn", hasSession: true },
] as RedactedHouse[];

function votesAllAye() {
  return {
    gamam: { side: "aye", powerTokens: 2 },
    solad: { side: "aye", powerTokens: 1 },
    natar: { side: "aye", powerTokens: 1 },
    coden: { side: "aye", powerTokens: 1 },
    olwyn: { side: "aye", powerTokens: 1 },
  };
}

assert.equal(isDilemmaResolutionEntryPending(createDilemmaDraft({}), fiveVoteHouses), false);

const baseCard = {
  cardCode: "I-1",
  title: "Test",
  context: "c",
  question: "q",
  aye: { preview: "a", result: "", resourceDeltas: {} },
  nay: { preview: "n", result: "", resourceDeltas: {} },
};

assert.equal(
  isDilemmaResolutionEntryPending(
    createDilemmaDraft({
      ...baseCard,
      votes: votesAllAye(),
    }),
    [...fiveVoteHouses],
  ),
  false,
);

assert.equal(
  isDilemmaResolutionEntryPending(
    createDilemmaDraft({
      ...baseCard,
      votes: votesAllAye(),
      voteNotes: "집계됨",
      selectedOutcome: "aye",
    }),
    [...fiveVoteHouses],
  ),
  true,
);

assert.equal(
  isDilemmaResolutionEntryPending(
    createDilemmaDraft({
      ...baseCard,
      votes: votesAllAye(),
      voteNotes: "집계됨",
      selectedOutcome: "aye",
      resolutionNotes: "후속 완료",
    }),
    [...fiveVoteHouses],
  ),
  false,
);

assert.equal(
  isDilemmaResolutionEntryPending(
    createDilemmaDraft({
      ...baseCard,
      votes: votesAllAye(),
      voteNotes: "동률 집계",
    }),
    [...fiveVoteHouses],
  ),
  true,
);

assert.deepEqual(normalizeResolutionChecklist({ a: true, memo: "x", bogus: 1 }), { a: true, memo: "x" });
assert.deepEqual(normalizeResolutionChecklist({ b: false }), {});
assert.equal(normalizeAchievementEffectEntries([{ icon: "instant", text: "coin " }])[0]?.text, "coin ");

assert.deepEqual(
  normalizeDilemmaOutcome({
    resourceDeltas: { influence: 1, wealth: -2 },
  }).effects,
  [
    { id: "resource-influence", type: "resource", resourceId: "influence", amount: 1 },
    { id: "resource-wealth", type: "resource", resourceId: "wealth", amount: -2 },
  ],
);
assert.deepEqual(
  normalizeDilemmaOutcome({
    resourceDeltas: { influence: 1, wealth: -2 },
  }).resourcePolarities,
  { influence: "positive", wealth: "negative" },
);
assert.deepEqual(
  normalizeDilemmaOutcome({
    resourcePolarities: { wealth: "positive", morale: "negative", knowledge: "bad" },
    resourceDeltas: { wealth: -2, welfare: 1 },
  }).resourcePolarities,
  { wealth: "positive", morale: "negative", welfare: "positive" },
);

const normalizedEffects = normalizeDilemmaOutcome({
  effects: [
    { id: "r1", type: "resource", resourceId: "wealth", amount: 3 },
    { id: "bad", type: "resource", resourceId: "unknown", amount: 4 },
    { id: "note", type: "note", text: "x".repeat(600) },
    { id: "spoiler", type: "story", status: "active", text: "hidden story text" },
  ],
});

assert.deepEqual(getOrderedDilemmaResourceEffects(normalizedEffects), [
  { resourceId: "wealth", amount: 3 },
]);
assert.deepEqual(normalizedEffects.resourceDeltas, { wealth: 3 });
assert.deepEqual(normalizedEffects.resourcePolarities, { wealth: "positive" });
assert.equal(normalizedEffects.effects.some((effect) => effect.type === "story"), false);
assert.equal(normalizedEffects.effects.find((effect) => effect.type === "note")?.text.length, 500);

const normalizedStorySigner = normalizeDilemmaOutcome({
  effects: [
    {
      id: "story-signer",
      type: "story",
      cardCode: "S.99.0.F",
      status: "active",
      signedByHouseId: "solad",
      signedByName: "House Solad",
      photos: [
        {
          id: "effect-photo-1",
          name: "card.jpg",
          mimeType: "image/jpeg",
          dataUrl: "data:image/jpeg;base64,abc",
          createdAt: "2026-05-13T00:00:00.000Z",
        },
      ],
    },
  ],
});

assert.deepEqual(normalizedStorySigner.effects[0], {
  id: "story-signer",
  type: "story",
  cardCode: "S.99.0.F",
  status: "active",
  signedByHouseId: "solad",
  signedByName: "House Solad",
  photos: [
    {
      id: "effect-photo-1",
      name: "card.jpg",
      mimeType: "image/jpeg",
      dataUrl: "data:image/jpeg;base64,abc",
      createdAt: "2026-05-13T00:00:00.000Z",
    },
  ],
});

const normalizedChronicleSigner = normalizeDilemmaOutcome({
  effects: [
    {
      id: "chronicle-signer",
      type: "chronicle",
      resourceId: "wealth",
      polarity: "positive",
      stickerCode: "43",
      signedByHouseId: "gamam",
      signedByName: "House Gamam",
    },
  ],
});

assert.deepEqual(normalizedChronicleSigner.effects[0], {
  id: "chronicle-signer",
  type: "chronicle",
  resourceId: "wealth",
  polarity: "positive",
  stickerCode: "43",
  signedByHouseId: "gamam",
  signedByName: "House Gamam",
});
