import assert from "node:assert/strict";
import {
  AGENDAS,
  applyChoose,
  applyDiscard,
  createInitialState,
  redactState,
} from "../netlify/functions/_shared/agenda-state.mts";

const now = "2026-05-07T00:00:00.000Z";
const initial = createInitialState(now);

assert.equal(initial.phase, "discard");
assert.equal(initial.pool.length, 6);
assert.equal(redactState(initial, 2).availableAgendas, undefined);
assert.equal(redactState(initial, 1).canDiscard, true);

const discarded = applyDiscard(initial, 1, now, () => 0);
assert.equal(discarded.phase, "choose");
assert.equal(discarded.discarded, AGENDAS[0].id);
assert.equal(discarded.pool.length, 5);
assert.equal(redactState(discarded, 2).availableAgendas, undefined);
assert.equal(redactState(discarded, 1).availableAgendas?.length, 5);

let state = applyChoose(discarded, 1, discarded.pool[0], now);
assert.equal(state.turn, 2);
assert.equal(state.pool.length, 4);
assert.equal(redactState(state, 1).ownChoice?.id, discarded.pool[0]);
assert.equal(redactState(state, 1).availableAgendas, undefined);
assert.throws(() => applyChoose(state, 1, state.pool[0], now), /not your turn/i);

state = applyChoose(state, 2, state.pool[0], now);
state = applyChoose(state, 3, state.pool[0], now);
state = applyChoose(state, 4, state.pool[0], now);
state = applyChoose(state, 5, state.pool[0], now);

assert.equal(state.phase, "complete");
assert.equal(state.pool.length, 0);
assert.equal(Object.keys(state.choices).length, 5);
assert.equal(redactState(state, 5).ownChoice?.id, state.choices["5"]);
assert.equal(redactState(state, 3).availableAgendas, undefined);

console.log("agenda-state tests passed");
