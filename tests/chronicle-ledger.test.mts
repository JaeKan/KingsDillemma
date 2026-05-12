import assert from "node:assert/strict";
import {
  ageChronicleLedger,
  assignOpenAgendasFromChronicles,
  calculateLegacyResourceDeltas,
  CHRONICLE_ROW_CAPACITY,
  previewChroniclePlacement,
  type ChronicleLedger,
  type ChroniclePolarity,
  type ChronicleResourceId,
  type ChronicleStickerEntry,
} from "../shared/chronicle-ledger.mts";

function sticker(
  overrides: Partial<ChronicleStickerEntry> & {
    id: string;
    resourceId?: ChronicleResourceId;
    polarity?: ChroniclePolarity;
    signedByHouseId?: string;
    ageMarks?: number;
    slotIndex?: number;
  },
): ChronicleStickerEntry {
  const { id, ...rest } = overrides;
  return {
    id,
    stickerCode: `sticker-${id}`,
    resourceId: overrides.resourceId ?? "influence",
    polarity: overrides.polarity ?? "positive",
    signedByHouseId: overrides.signedByHouseId ?? "gamam",
    signedByName: `House ${overrides.signedByHouseId ?? "gamam"}`,
    ageMarks: overrides.ageMarks ?? 0,
    slotIndex: overrides.slotIndex ?? 0,
    sourceDilemmaHistoryId: `history-${id}`,
    sourceCardCode: `card-${id}`,
    placedAt: "2026-05-12T00:00:00.000Z",
    updatedAt: "2026-05-12T00:00:00.000Z",
    replacedAt: "",
    note: "",
    photos: [],
    ...rest,
  };
}

function ledger(entries: ChronicleStickerEntry[]): ChronicleLedger {
  return {
    influence: entries.filter((entry) => entry.resourceId === "influence"),
    wealth: entries.filter((entry) => entry.resourceId === "wealth"),
    morale: entries.filter((entry) => entry.resourceId === "morale"),
    welfare: entries.filter((entry) => entry.resourceId === "welfare"),
    knowledge: entries.filter((entry) => entry.resourceId === "knowledge"),
  };
}

assert.equal(CHRONICLE_ROW_CAPACITY, 5);

assert.deepEqual(
  previewChroniclePlacement(ledger([]), { resourceId: "influence", polarity: "positive" }),
  {
    resourceId: "influence",
    polarity: "positive",
    slotIndex: 0,
    reason: "empty_slot",
    replacedStickerId: "",
  },
);

assert.deepEqual(
  previewChroniclePlacement(
    ledger([
      sticker({ id: "slot-0", slotIndex: 0 }),
      sticker({ id: "slot-2", slotIndex: 2 }),
    ]),
    { resourceId: "influence", polarity: "negative" },
  ),
  {
    resourceId: "influence",
    polarity: "negative",
    slotIndex: 1,
    reason: "empty_slot",
    replacedStickerId: "",
  },
);

assert.deepEqual(
  previewChroniclePlacement(
    ledger([
      sticker({ id: "a", ageMarks: 2, slotIndex: 0 }),
      sticker({ id: "b", ageMarks: 6, slotIndex: 1 }),
      sticker({ id: "c", ageMarks: 4, slotIndex: 2 }),
      sticker({ id: "d", ageMarks: 5, slotIndex: 3 }),
      sticker({ id: "e", ageMarks: 3, slotIndex: 4 }),
    ]),
    { resourceId: "influence", polarity: "positive" },
  ),
  {
    resourceId: "influence",
    polarity: "positive",
    slotIndex: 1,
    reason: "replace_oldest",
    replacedStickerId: "b",
  },
);

assert.deepEqual(
  previewChroniclePlacement(
    ledger([
      sticker({ id: "a", ageMarks: 6, slotIndex: 0 }),
      sticker({ id: "b", ageMarks: 6, slotIndex: 1 }),
      sticker({ id: "c", ageMarks: 4, slotIndex: 2 }),
      sticker({ id: "d", ageMarks: 5, slotIndex: 3 }),
      sticker({ id: "e", ageMarks: 3, slotIndex: 4 }),
    ]),
    { resourceId: "influence", polarity: "positive" },
  ),
  {
    resourceId: "influence",
    polarity: "positive",
    slotIndex: 0,
    reason: "replace_oldest",
    replacedStickerId: "a",
  },
);

const aged = ageChronicleLedger(
  ledger([
    sticker({ id: "active", ageMarks: 2, slotIndex: 0 }),
    sticker({ id: "capped", ageMarks: 6, slotIndex: 1 }),
    sticker({ id: "replaced", ageMarks: 3, slotIndex: 2, replacedAt: "2026-05-12T01:00:00.000Z" }),
  ]),
);

assert.equal(aged.influence.find((entry) => entry.id === "active")?.ageMarks, 3);
assert.equal(aged.influence.find((entry) => entry.id === "capped")?.ageMarks, 6);
assert.equal(aged.influence.find((entry) => entry.id === "replaced")?.ageMarks, 3);

assert.deepEqual(
  calculateLegacyResourceDeltas(
    ledger([
      sticker({ id: "influence-positive", resourceId: "influence", polarity: "positive" }),
      sticker({ id: "influence-negative", resourceId: "influence", polarity: "negative" }),
      sticker({ id: "wealth-positive-1", resourceId: "wealth", polarity: "positive" }),
      sticker({ id: "wealth-positive-2", resourceId: "wealth", polarity: "positive" }),
      sticker({ id: "morale-negative", resourceId: "morale", polarity: "negative" }),
      sticker({
        id: "ignored-replaced-negative",
        resourceId: "wealth",
        polarity: "negative",
        replacedAt: "2026-05-12T01:00:00.000Z",
      }),
    ]),
  ),
  {
    wealth: 2,
    morale: -1,
  },
);

assert.deepEqual(
  assignOpenAgendasFromChronicles(
    ledger([
      sticker({ id: "old-left", resourceId: "knowledge", polarity: "positive", signedByHouseId: "gamam", ageMarks: 3, slotIndex: 0 }),
      sticker({ id: "recent-left", resourceId: "knowledge", polarity: "positive", signedByHouseId: "solad", ageMarks: 1, slotIndex: 1 }),
      sticker({ id: "recent-right", resourceId: "knowledge", polarity: "positive", signedByHouseId: "natar", ageMarks: 1, slotIndex: 3 }),
      sticker({
        id: "ignored-replaced",
        resourceId: "knowledge",
        polarity: "negative",
        signedByHouseId: "gamam",
        ageMarks: 0,
        slotIndex: 4,
        replacedAt: "2026-05-12T01:00:00.000Z",
      }),
      sticker({
        id: "ignored-non-participant",
        resourceId: "wealth",
        polarity: "negative",
        signedByHouseId: "olwyn",
        ageMarks: 0,
        slotIndex: 4,
      }),
      sticker({
        id: "participating-negative",
        resourceId: "wealth",
        polarity: "negative",
        signedByHouseId: "coden",
        ageMarks: 2,
        slotIndex: 2,
      }),
    ]),
    ["gamam", "solad", "natar", "coden"],
  ),
  {
    positive: {
      knowledge: "natar",
    },
    negative: {
      wealth: "coden",
    },
  },
);

console.log("chronicle-ledger tests passed");
