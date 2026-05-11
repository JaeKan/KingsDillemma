import assert from "node:assert/strict";
import type { RedactedHouse } from "../src/types/game.ts";
import {
  isDilemmaResolutionEntryPending,
  createDilemmaDraft,
  normalizeResolutionChecklist,
} from "../src/utils/dilemma-helpers.ts";

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
  aye: { preview: "a", result: "ar", resourceDeltas: {} },
  nay: { preview: "n", result: "nr", resourceDeltas: {} },
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
