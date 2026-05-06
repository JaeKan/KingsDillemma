import { getDeployStore, getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/functions";
import {
  AgendaStateError,
  applyChoose,
  applyDiscard,
  clearSession,
  createInitialState,
  normalizeState,
  parsePlayer,
  redactState,
  registerSession,
  savePlayerInventory,
  setPlayerName,
  setSeatCredential,
  type GameState,
  type PlayerNumber,
  type SeatCredential,
} from "./_shared/agenda-state.mts";

declare const Netlify:
  | undefined
  | {
      env: { get: (name: string) => string | undefined };
      context?: { deploy?: { context?: string } };
    };

const COOKIE_NAME = "kd_agenda_session";
const STORE_NAME = "kings-dilemma-agenda";
const STORE_KEY = "active-game";
const DEFAULT_LOGIN_CODE = "12345";
const PASSWORD_MIN_LENGTH = 4;
const PASSWORD_MAX_LENGTH = 64;
const PASSWORD_ITERATIONS = 120_000;
const PASSWORD_SALT_BYTES = 16;
const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 24;
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const ANONYMOUS_GET_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, must-revalidate",
  "Netlify-CDN-Cache-Control": "public, durable, max-age=15, stale-while-revalidate=45",
  "Netlify-Vary": `cookie=${COOKIE_NAME}`,
};

type AgendaStore = ReturnType<typeof getStore>;

export default async function agenda(req: Request, context: Context) {
  try {
    const store = getAgendaStore(context);

    if (req.method === "GET") {
      const state = await loadState(store);
      const player = getAuthenticatedPlayer(req, context, state);
      return json(
        { ok: true, authenticated: Boolean(player), state: redactState(state, player) },
        200,
        player ? NO_STORE_HEADERS : ANONYMOUS_GET_CACHE_HEADERS,
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

    const player = getAuthenticatedPlayer(req, context, state);

    if (!player) {
      return json({ ok: false, error: "Login required." }, 401, NO_STORE_HEADERS);
    }

    if (action === "discard") {
      const nextState = applyDiscard(state, player);
      await saveState(store, nextState);
      return json({ ok: true, state: redactState(nextState, player) }, 200, NO_STORE_HEADERS);
    }

    if (action === "choose") {
      const agendaId = typeof body.agendaId === "string" ? body.agendaId : "";
      const nextState = applyChoose(state, player, agendaId);
      await saveState(store, nextState);
      return json({ ok: true, state: redactState(nextState, player) }, 200, NO_STORE_HEADERS);
    }

    if (action === "saveInventory") {
      const nextState = savePlayerInventory(state, player, body.inventory);
      await saveState(store, nextState);
      return json({ ok: true, state: redactState(nextState, player) }, 200, NO_STORE_HEADERS);
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
    action === "saveInventory"
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

export const config: Config = {
  path: "/api/agenda",
  method: ["GET", "POST"],
};

async function handleLogin(
  req: Request,
  store: AgendaStore,
  state: GameState,
  body: Record<string, unknown>,
) {
  const player = parsePlayer(body.player);
  const password = parsePassword(body.password);
  const credential = state.credentials[String(player)];
  const needsDisplayName = !state.playerNames[String(player)];
  let nextState = state;

  if (credential) {
    const verified = await verifyPassword(password, credential);

    if (!verified) {
      return json({ ok: false, error: "좌석 비밀번호가 맞지 않습니다." }, 401);
    }

    if (needsDisplayName) {
      nextState = setPlayerName(state, player, parseDisplayName(body.displayName));
    }
  } else {
    const displayName = parseDisplayName(body.displayName);
    nextState = setPlayerName(state, player, displayName);
    nextState = setSeatCredential(nextState, player, await createPasswordCredential(password));
  }

  const token = crypto.randomUUID();
  const nextSessionState = registerSession(nextState, player, token);
  await saveState(store, nextSessionState);

  return json(
    { ok: true, authenticated: true, state: redactState(nextSessionState, player) },
    200,
    { ...NO_STORE_HEADERS, "Set-Cookie": createSessionCookie(req, player, token) },
  );
}

function parseDisplayName(value: unknown) {
  if (typeof value !== "string") {
    throw new AgendaStateError("좌석 이름을 입력하세요.");
  }

  const trimmed = value.trim().replace(/\s+/g, " ");

  if (trimmed.length < NAME_MIN_LENGTH) {
    throw new AgendaStateError(`좌석 이름은 ${NAME_MIN_LENGTH}자 이상이어야 합니다.`);
  }

  if (trimmed.length > NAME_MAX_LENGTH) {
    throw new AgendaStateError(`좌석 이름은 ${NAME_MAX_LENGTH}자 이하여야 합니다.`);
  }

  if (isDefaultPlayerName(trimmed)) {
    throw new AgendaStateError("기본 이름 Player 1-5 대신 사용할 이름을 입력하세요.");
  }

  return trimmed;
}

function isDefaultPlayerName(name: string) {
  return /^player\s*[1-5]$/i.test(name);
}

function parsePassword(value: unknown) {
  if (typeof value !== "string") {
    throw new AgendaStateError("좌석 비밀번호를 입력하세요.");
  }

  if (value.length < PASSWORD_MIN_LENGTH) {
    throw new AgendaStateError(`좌석 비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`);
  }

  if (value.length > PASSWORD_MAX_LENGTH) {
    throw new AgendaStateError(`좌석 비밀번호는 ${PASSWORD_MAX_LENGTH}자 이하여야 합니다.`);
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

async function handleLogout(req: Request, context: Context, store: AgendaStore, state: GameState) {
  const player = getAuthenticatedPlayer(req, context, state);
  const nextState = player ? clearSession(state, player) : state;

  if (player) {
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
  context: Context,
  store: AgendaStore,
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

async function loadState(store: AgendaStore): Promise<GameState> {
  const stored = await store.get(STORE_KEY, { type: "json" });
  return normalizeState(stored);
}

async function saveState(store: AgendaStore, state: GameState) {
  await store.setJSON(STORE_KEY, state);
}

function getAgendaStore(context: Context) {
  const deployContext = getDeployContext(context);

  return deployContext === "production"
    ? getStore(STORE_NAME, { consistency: "strong" })
    : getDeployStore(STORE_NAME, { consistency: "strong" });
}

function getDeployContext(context: Context) {
  return typeof Netlify !== "undefined" && Netlify.context?.deploy?.context
    ? Netlify.context.deploy.context
    : context.deploy?.context;
}

function getLoginCode(context: Context) {
  const configuredCode = typeof Netlify !== "undefined" ? Netlify.env.get("LOGIN_CODE") : undefined;

  if (configuredCode) {
    return configuredCode;
  }

  return getDeployContext(context) === "production" ? "" : DEFAULT_LOGIN_CODE;
}

function getAuthenticatedPlayer(
  req: Request,
  context: Context,
  state: GameState,
): PlayerNumber | null {
  const rawCookie = context.cookies?.get(COOKIE_NAME) || parseCookie(req.headers.get("cookie"))[COOKIE_NAME];

  if (!rawCookie) {
    return null;
  }

  let playerText: string;
  let token: string | undefined;

  try {
    [playerText, token] = decodeURIComponent(rawCookie).split(":");
  } catch {
    return null;
  }

  const player = Number(playerText);

  if (!token) {
    return null;
  }

  try {
    const parsedPlayer = parsePlayer(player);
    return state.sessions[String(parsedPlayer)]?.token === token ? parsedPlayer : null;
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

function createSessionCookie(req: Request, player: PlayerNumber, token: string) {
  const secure = new URL(req.url).protocol === "https:" ? "; Secure" : "";
  const value = encodeURIComponent(`${player}:${token}`);
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
