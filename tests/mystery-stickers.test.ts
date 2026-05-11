import assert from "node:assert/strict";
import {
  getMysteryStickerSlotNumber,
  sanitizeMysteryStickerId,
} from "../shared/mystery-stickers.mts";

assert.equal(sanitizeMysteryStickerId("rulebook-42-1"), "rulebook-42-1");
assert.equal(sanitizeMysteryStickerId("  rulebook-42-6  "), "rulebook-42-6");
assert.equal(sanitizeMysteryStickerId(""), "");
assert.equal(sanitizeMysteryStickerId("not-an-id"), "");
assert.equal(sanitizeMysteryStickerId(null), "");
assert.equal(sanitizeMysteryStickerId(undefined), "");

assert.equal(sanitizeMysteryStickerId("placeholder-a"), "");
assert.equal(sanitizeMysteryStickerId("placeholder-f"), "");

assert.equal(getMysteryStickerSlotNumber("rulebook-42-1"), 1);
assert.equal(getMysteryStickerSlotNumber("rulebook-42-6"), 6);
assert.equal(getMysteryStickerSlotNumber("unknown"), null);

console.log("mystery-stickers: ok");
