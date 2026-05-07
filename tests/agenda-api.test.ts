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

const anonymousGet = await handleAgendaRequest(new Request("http://localhost/api/agenda"), {}, store);
const anonymousPayload = await anonymousGet.json();
assert.equal(anonymousGet.status, 200);
assert.equal(anonymousGet.headers.get("Cache-Control"), "public, max-age=0, must-revalidate");
assert.equal(anonymousPayload.authenticated, false);
assert.equal(anonymousPayload.realtimeEnabled, false);
assert.equal(anonymousPayload.state.phase, "house-select");

const badReset = await handleAgendaRequest(jsonRequest({ action: "reset", code: "wrong" }), {}, store);
assert.equal(badReset.status, 401);

const reset = await handleAgendaRequest(
  jsonRequest({ action: "reset", code: "12345" }),
  { deployContext: "development" },
  store,
);
assert.equal(reset.status, 200);
assert.equal(persisted?.phase, "house-select");

const login = await handleAgendaRequest(
  jsonRequest({
    action: "login",
    houseId: "gamam",
    password: "seat-password",
    displayName: "House Pinchay",
  }),
  { deployContext: "development" },
  store,
);
const loginPayload = await login.json();
const setCookie = login.headers.get("Set-Cookie") || "";
assert.equal(login.status, 200);
assert.equal(loginPayload.authenticated, true);
assert.match(setCookie, new RegExp(`^${COOKIE_NAME}=`));
assert.match(setCookie, /HttpOnly/);
assert.match(setCookie, /SameSite=Lax/);
assert.equal(persisted?.sessions.gamam?.token.length, 36);

const authenticatedGet = await handleAgendaRequest(
  new Request("http://localhost/api/agenda", { headers: { Cookie: setCookie } }),
  { realtimeUpdatesEnabled: true },
  store,
);
const authenticatedPayload = await authenticatedGet.json();
assert.equal(authenticatedGet.status, 200);
assert.equal(authenticatedGet.headers.get("Cache-Control"), "no-store");
assert.equal(authenticatedPayload.authenticated, true);
assert.equal(authenticatedPayload.realtimeEnabled, true);
assert.equal(authenticatedPayload.state.ownInventory.coins, 10);

const earlyDilemmaEdit = await handleAgendaRequest(jsonRequest({ action: "beginDilemmaEdit" }, setCookie), {}, store);
const earlyDilemmaEditPayload = await earlyDilemmaEdit.json();
assert.equal(earlyDilemmaEdit.status, 409);
assert.match(earlyDilemmaEditPayload.error, /완료/);

const discardMode = await handleAgendaRequest(
  jsonRequest({ action: "setRandomDiscardEnabled", enabled: false }, setCookie),
  {},
  store,
);
const discardModePayload = await discardMode.json();
assert.equal(discardMode.status, 200);
assert.equal(discardModePayload.state.randomDiscardEnabled, false);
assert.equal(persisted?.randomDiscardEnabled, false);

console.log("agenda-api tests passed");
