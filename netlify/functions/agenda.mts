import { getDeployStore, getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/functions";
import {
  AgendaStateError,
  applyChoose,
  applyDiscard,
  createInitialState,
  normalizeState,
  parsePlayer,
  redactState,
  registerSession,
  type GameState,
  type PlayerNumber,
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

type AgendaStore = ReturnType<typeof getStore>;

export default async function agenda(req: Request, context: Context) {
  try {
    const store = getAgendaStore(context);
    const state = await loadState(store);

    if (req.method === "GET") {
      const player = getAuthenticatedPlayer(req, context, state);
      return json({ ok: true, authenticated: Boolean(player), state: redactState(state, player) });
    }

    if (req.method !== "POST") {
      return json({ ok: false, error: "Method not allowed." }, 405);
    }

    const body = await readBody(req);
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "login") {
      return handleLogin(req, store, state, body);
    }

    if (action === "logout") {
      return json(
        { ok: true },
        200,
        { "Set-Cookie": clearSessionCookie(req) },
      );
    }

    if (action === "reset") {
      return handleReset(req, store, body);
    }

    const player = getAuthenticatedPlayer(req, context, state);

    if (!player) {
      return json({ ok: false, error: "Login required." }, 401);
    }

    if (action === "discard") {
      const nextState = applyDiscard(state, player);
      await saveState(store, nextState);
      return json({ ok: true, state: redactState(nextState, player) });
    }

    if (action === "choose") {
      const agendaId = typeof body.agendaId === "string" ? body.agendaId : "";
      const nextState = applyChoose(state, player, agendaId);
      await saveState(store, nextState);
      return json({ ok: true, state: redactState(nextState, player) });
    }

    return json({ ok: false, error: "Unknown action." }, 400);
  } catch (error) {
    if (error instanceof AgendaStateError) {
      return json({ ok: false, error: error.message }, error.status);
    }

    console.error(error);
    return json({ ok: false, error: "Unexpected server error." }, 500);
  }
}

export const config: Config = {
  path: "/api/agenda",
};

async function handleLogin(
  req: Request,
  store: AgendaStore,
  state: GameState,
  body: Record<string, unknown>,
) {
  const player = parsePlayer(body.player);
  const token = crypto.randomUUID();
  const nextState = registerSession(state, player, token);
  await saveState(store, nextState);

  return json(
    { ok: true, authenticated: true, state: redactState(nextState, player) },
    200,
    { "Set-Cookie": createSessionCookie(req, player, token) },
  );
}

async function handleReset(req: Request, store: AgendaStore, body: Record<string, unknown>) {
  if (body.code !== getLoginCode()) {
    return json({ ok: false, error: "Invalid reset code." }, 401);
  }

  const nextState = createInitialState();
  await saveState(store, nextState);

  return json(
    { ok: true, authenticated: false, state: redactState(nextState, null) },
    200,
    { "Set-Cookie": clearSessionCookie(req) },
  );
}

async function loadState(store: AgendaStore): Promise<GameState> {
  const stored = await store.get(STORE_KEY, { type: "json" });
  const state = normalizeState(stored);

  if (!stored) {
    await saveState(store, state);
  }

  return state;
}

async function saveState(store: AgendaStore, state: GameState) {
  await store.setJSON(STORE_KEY, state);
}

function getAgendaStore(context: Context) {
  const deployContext =
    typeof Netlify !== "undefined" && Netlify.context?.deploy?.context
      ? Netlify.context.deploy.context
      : context.deploy?.context;

  return deployContext === "production"
    ? getStore(STORE_NAME, { consistency: "strong" })
    : getDeployStore(STORE_NAME, { consistency: "strong" });
}

function getLoginCode() {
  if (typeof Netlify !== "undefined") {
    return Netlify.env.get("LOGIN_CODE") || DEFAULT_LOGIN_CODE;
  }

  return DEFAULT_LOGIN_CODE;
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

  const [playerText, token] = decodeURIComponent(rawCookie).split(":");
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
