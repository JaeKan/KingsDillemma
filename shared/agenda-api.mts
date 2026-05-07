import {
  AgendaStateError,
  PLAYER_COUNT,
  applyChoose,
  applyDiscard,
  beginDilemmaEdit,
  calculateFinalScores,
  cancelDilemmaEdit,
  clearSession,
  createInitialState,
  endSession,
  getClaimedHouseIds,
  normalizeState,
  parseHouseId,
  redactState,
  registerSession,
  saveDilemmaRecord,
  saveHouseProgress,
  savePlayerInventory,
  setRandomDiscardEnabled,
  setHouseCredential,
  setHouseName,
  startDraftIfReady,
  type GameState,
  type HouseId,
  type SeatCredential,
} from "../netlify/functions/_shared/agenda-state.mts";

export const COOKIE_NAME = "kd_agenda_session";
export const STORE_NAME = "kings-dilemma-agenda";
export const STORE_KEY = "active-game";

const DEFAULT_LOGIN_CODE = "12345";
const PASSWORD_MIN_LENGTH = 4;
const PASSWORD_MAX_LENGTH = 64;
const PASSWORD_ITERATIONS = 120_000;
const PASSWORD_SALT_BYTES = 16;
const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 32;
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const ANONYMOUS_GET_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, must-revalidate",
  "Netlify-CDN-Cache-Control": "public, durable, max-age=15, stale-while-revalidate=45",
  "Netlify-Vary": `cookie=${COOKIE_NAME}`,
};

export type AgendaStateStore = {
  get: () => Promise<unknown | null>;
  set: (state: GameState) => Promise<void>;
};

export type AgendaRequestContext = {
  cookies?: { get: (name: string) => string | undefined };
  deployContext?: string;
  loginCode?: string;
  realtimeUpdatesEnabled?: boolean;
};

export async function handleAgendaRequest(
  req: Request,
  context: AgendaRequestContext,
  store: AgendaStateStore,
) {
  try {
    if (req.method === "GET") {
      const state = await loadState(store);
      const houseId = getAuthenticatedHouse(req, context, state);
      return json(
        {
          ok: true,
          authenticated: Boolean(houseId),
          realtimeEnabled: Boolean(context.realtimeUpdatesEnabled),
          state: redactState(state, houseId),
        },
        200,
        houseId ? NO_STORE_HEADERS : ANONYMOUS_GET_CACHE_HEADERS,
      );
    }

    if (req.method !== "POST") {
      return json({ ok: false, error: "Method not allowed." }, 405, NO_STORE_HEADERS);
    }

    const body = await readBody(req);
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "reset") {
      return await handleReset(req, context, store, body);
    }

    if (!isKnownStateAction(action)) {
      return json({ ok: false, error: "Unknown action." }, 400, NO_STORE_HEADERS);
    }

    const state = await loadState(store);

    if (action === "login") {
      return await handleLogin(req, store, state, body);
    }

    if (action === "logout") {
      return await handleLogout(req, context, store, state);
    }

    const houseId = getAuthenticatedHouse(req, context, state);

    if (!houseId) {
      return json({ ok: false, error: "Login required." }, 401, NO_STORE_HEADERS);
    }

    if (action === "discard") {
      const agendaId = typeof body.agendaId === "string" ? body.agendaId : null;
      const nextState = applyDiscard(state, houseId, agendaId);
      await saveState(store, nextState);
      return json({ ok: true, state: redactState(nextState, houseId) }, 200, NO_STORE_HEADERS);
    }

    if (action === "choose") {
      const agendaId = typeof body.agendaId === "string" ? body.agendaId : "";
      const nextState = applyChoose(state, houseId, agendaId);
      await saveState(store, nextState);
      return json({ ok: true, state: redactState(nextState, houseId) }, 200, NO_STORE_HEADERS);
    }

    if (action === "saveInventory") {
      const nextState = savePlayerInventory(state, houseId, body.inventory);
      await saveState(store, nextState);
      return json({ ok: true, state: redactState(nextState, houseId) }, 200, NO_STORE_HEADERS);
    }

    if (action === "saveHouseProgress") {
      const nextState = saveHouseProgress(state, houseId, body.progress);
      await saveState(store, nextState);
      return json({ ok: true, state: redactState(nextState, houseId) }, 200, NO_STORE_HEADERS);
    }

    if (action === "beginDilemmaEdit") {
      const dilemmaEditToken = crypto.randomUUID();
      const nextState = beginDilemmaEdit(state, houseId, dilemmaEditToken);
      await saveState(store, nextState);
      return json(
        { ok: true, dilemmaEditToken, state: redactState(nextState, houseId) },
        200,
        NO_STORE_HEADERS,
      );
    }

    if (action === "cancelDilemmaEdit") {
      const nextState = cancelDilemmaEdit(state, houseId, body.dilemmaEditToken);
      await saveState(store, nextState);
      return json({ ok: true, state: redactState(nextState, houseId) }, 200, NO_STORE_HEADERS);
    }

    if (action === "saveDilemma") {
      const nextState = saveDilemmaRecord(state, houseId, body.dilemmaEditToken, body.dilemma);
      await saveState(store, nextState);
      return json({ ok: true, state: redactState(nextState, houseId) }, 200, NO_STORE_HEADERS);
    }

    if (action === "setRandomDiscardEnabled") {
      const nextState = setRandomDiscardEnabled(state, body.enabled);
      await saveState(store, nextState);
      return json({ ok: true, state: redactState(nextState, houseId) }, 200, NO_STORE_HEADERS);
    }

    if (action === "calculateFinalScores") {
      return json({ ok: true, scoring: calculateFinalScores(state, body.board) }, 200, NO_STORE_HEADERS);
    }

    if (action === "endSession") {
      const nextState = endSession(state);
      await saveState(store, nextState);
      return json(
        { ok: true, authenticated: false, state: redactState(nextState, null) },
        200,
        { ...NO_STORE_HEADERS, "Set-Cookie": clearSessionCookie(req) },
      );
    }

    return json({ ok: false, error: "Unknown action." }, 400, NO_STORE_HEADERS);
  } catch (error) {
    if (error instanceof AgendaStateError || isAgendaStateErrorLike(error)) {
      return json({ ok: false, error: error.message }, error.status, NO_STORE_HEADERS);
    }

    console.error(error);
    return json({ ok: false, error: "Unexpected server error." }, 500, NO_STORE_HEADERS);
  }
}

function isKnownStateAction(action: string) {
  return (
    action === "login" ||
    action === "logout" ||
    action === "discard" ||
    action === "choose" ||
    action === "saveInventory" ||
    action === "saveHouseProgress" ||
    action === "beginDilemmaEdit" ||
    action === "cancelDilemmaEdit" ||
    action === "saveDilemma" ||
    action === "setRandomDiscardEnabled" ||
    action === "calculateFinalScores" ||
    action === "endSession"
  );
}

function isAgendaStateErrorLike(error: unknown): error is AgendaStateError {
  return (
    Boolean(error) &&
    typeof error === "object" &&
    typeof (error as AgendaStateError).message === "string" &&
    typeof (error as AgendaStateError).status === "number"
  );
}

async function handleLogin(
  req: Request,
  store: AgendaStateStore,
  state: GameState,
  body: Record<string, unknown>,
) {
  const houseId = parseHouseId(body.houseId ?? body.player);
  const password = parsePassword(body.password);
  const credential = state.credentials[houseId];
  const needsDisplayName = !state.playerNames[houseId];
  let nextState = state;

  if (!credential && state.phase !== "house-select") {
    return json({ ok: false, error: "이미 드래프트가 시작되어 새 가문을 선택할 수 없습니다." }, 409);
  }

  if (!credential && getClaimedHouseIds(state).length >= PLAYER_COUNT) {
    return json({ ok: false, error: "이번 의회의 5개 가문이 이미 모두 선택되었습니다." }, 409);
  }

  if (credential) {
    const verified = await verifyPassword(password, credential);

    if (!verified) {
      return json({ ok: false, error: "좌석 비밀번호가 맞지 않습니다." }, 401);
    }

    if (needsDisplayName) {
      nextState = setHouseName(state, houseId, parseDisplayName(body.displayName));
    }
  } else {
    const displayName = parseDisplayName(body.displayName);
    nextState = setHouseName(state, houseId, displayName);
    nextState = setHouseCredential(nextState, houseId, await createPasswordCredential(password));
  }

  const token = crypto.randomUUID();
  const nextSessionState = startDraftIfReady(registerSession(nextState, houseId, token));
  await saveState(store, nextSessionState);

  return json(
    { ok: true, authenticated: true, state: redactState(nextSessionState, houseId) },
    200,
    { ...NO_STORE_HEADERS, "Set-Cookie": createSessionCookie(req, houseId, token) },
  );
}

function parseDisplayName(value: unknown) {
  if (typeof value !== "string") {
    throw new AgendaStateError("가문 서명명을 입력하세요.");
  }

  const trimmed = value.trim().replace(/\s+/g, " ");

  if (trimmed.length < NAME_MIN_LENGTH) {
    throw new AgendaStateError(`가문 서명명은 ${NAME_MIN_LENGTH}자 이상이어야 합니다.`);
  }

  if (trimmed.length > NAME_MAX_LENGTH) {
    throw new AgendaStateError(`가문 서명명은 ${NAME_MAX_LENGTH}자 이하여야 합니다.`);
  }

  if (isDefaultPlayerName(trimmed)) {
    throw new AgendaStateError("기본 이름 Player 1-5 대신 사용할 가문 서명명을 입력하세요.");
  }

  return trimmed;
}

function isDefaultPlayerName(name: string) {
  return /^player\s*[1-5]$/i.test(name);
}

function parsePassword(value: unknown) {
  if (typeof value !== "string") {
    throw new AgendaStateError("가문 비밀번호를 입력하세요.");
  }

  if (value.length < PASSWORD_MIN_LENGTH) {
    throw new AgendaStateError(`가문 비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`);
  }

  if (value.length > PASSWORD_MAX_LENGTH) {
    throw new AgendaStateError(`가문 비밀번호는 ${PASSWORD_MAX_LENGTH}자 이하여야 합니다.`);
  }

  return value;
}

async function createPasswordCredential(password: string): Promise<SeatCredential> {
  const salt = new Uint8Array(PASSWORD_SALT_BYTES);
  crypto.getRandomValues(salt);
  const saltHex = bytesToHex(salt);

  return {
    salt: saltHex,
    hash: await derivePasswordHash(password, saltHex, PASSWORD_ITERATIONS),
    iterations: PASSWORD_ITERATIONS,
    createdAt: new Date().toISOString(),
  };
}

async function verifyPassword(password: string, credential: SeatCredential) {
  const hash = await derivePasswordHash(password, credential.salt, credential.iterations);
  return timingSafeEqual(hash, credential.hash);
}

async function derivePasswordHash(password: string, saltHex: string, iterations: number) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: hexToBytes(saltHex),
      iterations,
    },
    keyMaterial,
    256,
  );

  return bytesToHex(new Uint8Array(bits));
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let difference = 0;

  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return difference === 0;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

async function handleLogout(
  req: Request,
  context: AgendaRequestContext,
  store: AgendaStateStore,
  state: GameState,
) {
  const houseId = getAuthenticatedHouse(req, context, state);
  const nextState = houseId ? clearSession(state, houseId) : state;

  if (houseId) {
    await saveState(store, nextState);
  }

  return json(
    { ok: true, authenticated: false, state: redactState(nextState, null) },
    200,
    { ...NO_STORE_HEADERS, "Set-Cookie": clearSessionCookie(req) },
  );
}

async function handleReset(
  req: Request,
  context: AgendaRequestContext,
  store: AgendaStateStore,
  body: Record<string, unknown>,
) {
  const loginCode = getLoginCode(context);

  if (!loginCode || body.code !== loginCode) {
    return json({ ok: false, error: "Invalid reset code." }, 401, NO_STORE_HEADERS);
  }

  const nextState = createInitialState();
  await saveState(store, nextState);

  return json(
    { ok: true, authenticated: false, state: redactState(nextState, null) },
    200,
    { ...NO_STORE_HEADERS, "Set-Cookie": clearSessionCookie(req) },
  );
}

async function loadState(store: AgendaStateStore): Promise<GameState> {
  const stored = await store.get();
  return normalizeState(stored);
}

async function saveState(store: AgendaStateStore, state: GameState) {
  await store.set(state);
}

function getLoginCode(context: AgendaRequestContext) {
  if (context.loginCode) {
    return context.loginCode;
  }

  return context.deployContext === "production" ? "" : DEFAULT_LOGIN_CODE;
}

export function getAuthenticatedHouse(
  req: Request,
  context: AgendaRequestContext,
  state: GameState,
): HouseId | null {
  const rawCookie = context.cookies?.get(COOKIE_NAME) || parseCookie(req.headers.get("cookie"))[COOKIE_NAME];

  if (!rawCookie) {
    return null;
  }

  let houseId: string;
  let token: string | undefined;

  try {
    [houseId, token] = decodeURIComponent(rawCookie).split(":");
  } catch {
    return null;
  }

  if (!token) {
    return null;
  }

  try {
    const parsedHouseId = parseHouseId(houseId);
    return state.sessions[parsedHouseId]?.token === token ? parsedHouseId : null;
  } catch {
    return null;
  }
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

function createSessionCookie(req: Request, houseId: HouseId, token: string) {
  const secure = new URL(req.url).protocol === "https:" ? "; Secure" : "";
  const value = encodeURIComponent(`${houseId}:${token}`);
  return `${COOKIE_NAME}=${value}; HttpOnly; Path=/; SameSite=Lax; Max-Age=28800${secure}`;
}

function clearSessionCookie(req: Request) {
  const secure = new URL(req.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`;
}

function parseCookie(cookieHeader: string | null) {
  if (!cookieHeader) {
    return {} as Record<string, string>;
  }

  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((part) => part.trim().split("="))
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key, value]),
  );
}
