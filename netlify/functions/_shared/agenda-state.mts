export const PLAYER_COUNT = 5;
export const INITIAL_PLAYER = 1;

export type PlayerNumber = 1 | 2 | 3 | 4 | 5;
export type Phase = "discard" | "choose" | "complete";
export type PersonalResourceId = (typeof PERSONAL_RESOURCE_TRACKS)[number]["id"];

export type Agenda = {
  id: string;
  name: string;
  resourceGoal: string;
  resourceScoring: Array<{ label: string; vp: number }>;
  coinRanking: Array<{ rank: number; vp: number }>;
  note?: string;
};

export type PlayerInventory = {
  coins: number;
  powerTokens: number;
  prestige: number;
  crave: number;
  resources: Record<PersonalResourceId, number>;
  updatedAt: string;
};

export type GameState = {
  version: number;
  phase: Phase;
  turn: PlayerNumber;
  pool: string[];
  discarded: string | null;
  choices: Record<string, string>;
  sessions: Record<string, { token: string; createdAt: string }>;
  credentials: Record<string, SeatCredential>;
  playerNames: Record<string, string>;
  inventories: Record<string, PlayerInventory>;
  createdAt: string;
  updatedAt: string;
};

export type SeatCredential = {
  salt: string;
  hash: string;
  iterations: number;
  createdAt: string;
};

export type RedactedState = {
  version: number;
  phase: Phase;
  turn: PlayerNumber;
  players: Array<{
    player: PlayerNumber;
    name: string;
    hasCustomName: boolean;
    hasSession: boolean;
    hasPassword: boolean;
    hasChosen: boolean;
    isCurrentTurn: boolean;
    isSelf: boolean;
  }>;
  selectedCount: number;
  remainingHiddenCount: number;
  discardedHiddenCount: number;
  currentPlayer: PlayerNumber | null;
  isCurrentTurn: boolean;
  canDiscard: boolean;
  canChoose: boolean;
  ownChoice: Agenda | null;
  ownInventory: PlayerInventory | null;
  availableAgendas?: Agenda[];
};

export class AgendaStateError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AgendaStateError";
    this.status = status;
  }
}

export const AGENDAS: Agenda[] = [
  {
    id: "extremist",
    name: "극단주의자",
    resourceGoal:
      "가장 높은 자원 마커와 가장 낮은 자원 마커 사이의 거리만큼 승점을 얻습니다. 양 끝 칸도 포함합니다.",
    resourceScoring: [
      { label: "거리 1", vp: 4 },
      { label: "거리 2", vp: 7 },
      { label: "거리 3", vp: 10 },
      { label: "거리 4", vp: 14 },
      { label: "거리 5", vp: 15 },
    ],
    coinRanking: [
      { rank: 1, vp: 4 },
      { rank: 2, vp: 2 },
      { rank: 3, vp: 1 },
    ],
  },
  {
    id: "opulent",
    name: "호화주의자",
    resourceGoal: "9-17번 줄 안에 있는 자원 마커 수에 따라 승점을 얻습니다.",
    resourceScoring: [
      { label: "마커 1개", vp: 4 },
      { label: "마커 2개", vp: 7 },
      { label: "마커 3개", vp: 10 },
      { label: "마커 4개", vp: 13 },
      { label: "마커 5개", vp: 14 },
    ],
    coinRanking: [
      { rank: 1, vp: 6 },
      { rank: 2, vp: 4 },
      { rank: 3, vp: 2 },
    ],
  },
  {
    id: "moderate",
    name: "중도주의자",
    resourceGoal: "5-13번 줄 안에 있는 자원 마커 수에 따라 승점을 얻습니다.",
    resourceScoring: [
      { label: "마커 1개", vp: 6 },
      { label: "마커 2개", vp: 13 },
      { label: "마커 3개", vp: 17 },
      { label: "마커 4개", vp: 19 },
      { label: "마커 5개", vp: 20 },
    ],
    coinRanking: [
      { rank: 1, vp: 5 },
      { rank: 2, vp: 3 },
      { rank: 3, vp: 1 },
    ],
  },
  {
    id: "rebel",
    name: "반역자",
    resourceGoal: "1-5번 줄 또는 13-17번 줄 안에 있는 자원 마커 수에 따라 승점을 얻습니다.",
    resourceScoring: [
      { label: "마커 1개", vp: 9 },
      { label: "마커 2개", vp: 13 },
      { label: "마커 3개", vp: 17 },
      { label: "마커 4개", vp: 19 },
      { label: "마커 5개", vp: 20 },
    ],
    coinRanking: [
      { rank: 1, vp: 3 },
      { rank: 2, vp: 2 },
      { rank: 3, vp: 1 },
    ],
    note: "왕이 퇴위했다면 갈망 1점을 얻습니다.",
  },
  {
    id: "opportunist",
    name: "기회주의자",
    resourceGoal: "1-9번 줄 안에 있는 자원 마커 수에 따라 승점을 얻습니다.",
    resourceScoring: [
      { label: "마커 1개", vp: 4 },
      { label: "마커 2개", vp: 7 },
      { label: "마커 3개", vp: 10 },
      { label: "마커 4개", vp: 14 },
      { label: "마커 5개", vp: 15 },
    ],
    coinRanking: [
      { rank: 1, vp: 6 },
      { rank: 2, vp: 4 },
      { rank: 3, vp: 2 },
    ],
  },
  {
    id: "greedy",
    name: "탐욕가",
    resourceGoal: "1-5번 줄 또는 13-17번 줄 안에 있는 자원 마커 수에 따라 승점을 얻습니다.",
    resourceScoring: [
      { label: "마커 0개", vp: 4 },
      { label: "마커 1개", vp: 7 },
      { label: "마커 2개", vp: 11 },
      { label: "마커 3개", vp: 7 },
      { label: "마커 4개", vp: 4 },
    ],
    coinRanking: [
      { rank: 1, vp: 8 },
      { rank: 2, vp: 6 },
      { rank: 3, vp: 4 },
    ],
  },
];

export const PERSONAL_RESOURCE_TRACKS = [
  { id: "influence", label: "영향력" },
  { id: "wealth", label: "부" },
  { id: "morale", label: "사기" },
  { id: "welfare", label: "복지" },
  { id: "knowledge", label: "지식" },
] as const;

const AGENDA_BY_ID = new Map(AGENDAS.map((agenda) => [agenda.id, agenda]));
const PERSONAL_COUNTER_MAX = 99;
const RESOURCE_POSITION_MAX = 17;

export function isPlayerNumber(value: unknown): value is PlayerNumber {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= PLAYER_COUNT;
}

export function parsePlayer(value: unknown): PlayerNumber {
  const parsed = typeof value === "string" ? Number(value) : value;

  if (!isPlayerNumber(parsed)) {
    throw new AgendaStateError("Player must be a number from 1 to 5.");
  }

  return parsed;
}

export function createInitialState(now = new Date().toISOString()): GameState {
  return {
    version: 1,
    phase: "discard",
    turn: INITIAL_PLAYER,
    pool: AGENDAS.map((agenda) => agenda.id),
    discarded: null,
    choices: {},
    sessions: {},
    credentials: {},
    playerNames: {},
    inventories: {},
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeState(value: unknown, now = new Date().toISOString()): GameState {
  if (!value || typeof value !== "object") {
    return createInitialState(now);
  }

  const candidate = value as Partial<GameState>;
  const turn = isPlayerNumber(candidate.turn) ? candidate.turn : INITIAL_PLAYER;
  const phase: Phase =
    candidate.phase === "choose" || candidate.phase === "complete" || candidate.phase === "discard"
      ? candidate.phase
      : "discard";
  const pool = Array.isArray(candidate.pool)
    ? candidate.pool.filter((id): id is string => typeof id === "string" && AGENDA_BY_ID.has(id))
    : AGENDAS.map((agenda) => agenda.id);

  return {
    version: Number.isInteger(candidate.version) ? Number(candidate.version) : 1,
    phase,
    turn,
    pool,
    discarded:
      typeof candidate.discarded === "string" && AGENDA_BY_ID.has(candidate.discarded)
        ? candidate.discarded
        : null,
    choices: sanitizeChoices(candidate.choices),
    sessions: sanitizeSessions(candidate.sessions),
    credentials: sanitizeCredentials(candidate.credentials),
    playerNames: sanitizePlayerNames(candidate.playerNames),
    inventories: sanitizeInventories(candidate.inventories, now),
    createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : now,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
  };
}

export function getPlayerLabel(state: GameState, player: PlayerNumber) {
  return state.playerNames[String(player)] || `Player ${player}`;
}

export function createDefaultPlayerInventory(now = new Date().toISOString()): PlayerInventory {
  return {
    coins: 10,
    powerTokens: 8,
    prestige: 0,
    crave: 0,
    resources: Object.fromEntries(
      PERSONAL_RESOURCE_TRACKS.map(({ id }) => [id, 0]),
    ) as Record<PersonalResourceId, number>,
    updatedAt: now,
  };
}

export function getPlayerInventory(state: GameState, player: PlayerNumber): PlayerInventory {
  return state.inventories[String(player)] || createDefaultPlayerInventory(state.updatedAt);
}

export function setSeatCredential(
  state: GameState,
  player: PlayerNumber,
  credential: SeatCredential,
  now = new Date().toISOString(),
): GameState {
  return {
    ...state,
    credentials: {
      ...state.credentials,
      [String(player)]: credential,
    },
    version: state.version + 1,
    updatedAt: now,
  };
}

export function setPlayerName(
  state: GameState,
  player: PlayerNumber,
  name: string,
  now = new Date().toISOString(),
): GameState {
  return {
    ...state,
    playerNames: {
      ...state.playerNames,
      [String(player)]: name,
    },
    version: state.version + 1,
    updatedAt: now,
  };
}

export function registerSession(
  state: GameState,
  player: PlayerNumber,
  token: string,
  now = new Date().toISOString(),
): GameState {
  return {
    ...state,
    sessions: {
      ...state.sessions,
      [String(player)]: { token, createdAt: now },
    },
    version: state.version + 1,
    updatedAt: now,
  };
}

export function clearSession(
  state: GameState,
  player: PlayerNumber,
  now = new Date().toISOString(),
): GameState {
  if (!state.sessions[String(player)]) {
    return state;
  }

  const sessions = { ...state.sessions };
  delete sessions[String(player)];

  return {
    ...state,
    sessions,
    version: state.version + 1,
    updatedAt: now,
  };
}

export function savePlayerInventory(
  state: GameState,
  player: PlayerNumber,
  inventory: unknown,
  now = new Date().toISOString(),
): GameState {
  return {
    ...state,
    inventories: {
      ...state.inventories,
      [String(player)]: {
        ...sanitizePlayerInventory(inventory, now),
        updatedAt: now,
      },
    },
    version: state.version + 1,
    updatedAt: now,
  };
}

export function applyDiscard(
  state: GameState,
  player: PlayerNumber,
  now = new Date().toISOString(),
  rng: () => number = Math.random,
): GameState {
  if (state.phase !== "discard") {
    throw new AgendaStateError("The discard step is not active.");
  }

  if (player !== 1) {
    throw new AgendaStateError("Only player 1 can discard the random agenda.", 403);
  }

  if (state.discarded) {
    throw new AgendaStateError("An agenda has already been discarded.");
  }

  if (state.pool.length !== AGENDAS.length) {
    throw new AgendaStateError("The agenda pool is not ready for discard.");
  }

  const nextPool = [...state.pool];
  const discardIndex = Math.min(Math.floor(rng() * nextPool.length), nextPool.length - 1);
  const [discarded] = nextPool.splice(discardIndex, 1);

  return {
    ...state,
    version: state.version + 1,
    phase: "choose",
    pool: nextPool,
    discarded,
    updatedAt: now,
  };
}

export function applyChoose(
  state: GameState,
  player: PlayerNumber,
  agendaId: string,
  now = new Date().toISOString(),
): GameState {
  if (state.phase !== "choose") {
    throw new AgendaStateError("Agenda choice is not active.");
  }

  if (state.turn !== player) {
    throw new AgendaStateError("It is not your turn.", 403);
  }

  if (state.choices[String(player)]) {
    throw new AgendaStateError("This player has already chosen an agenda.");
  }

  if (!state.pool.includes(agendaId)) {
    throw new AgendaStateError("That agenda is not available.");
  }

  const nextPool = state.pool.filter((id) => id !== agendaId);
  const nextChoices = { ...state.choices, [String(player)]: agendaId };
  const isComplete = player === PLAYER_COUNT;

  return {
    ...state,
    version: state.version + 1,
    phase: isComplete ? "complete" : "choose",
    turn: isComplete ? player : ((player + 1) as PlayerNumber),
    pool: nextPool,
    choices: nextChoices,
    updatedAt: now,
  };
}

export function redactState(state: GameState, player: PlayerNumber | null): RedactedState {
  const ownChoiceId = player ? state.choices[String(player)] : null;
  const isCurrentTurn = player !== null && state.turn === player;
  const canDiscard = isCurrentTurn && state.phase === "discard" && player === 1;
  const canChoose = isCurrentTurn && state.phase === "choose" && !ownChoiceId;
  const redacted: RedactedState = {
    version: state.version,
    phase: state.phase,
    turn: state.turn,
    players: Array.from({ length: PLAYER_COUNT }, (_, index) => {
      const seat = (index + 1) as PlayerNumber;
      const isSelf = player === seat;

      return {
        player: seat,
        name: getPlayerLabel(state, seat),
        hasCustomName: Boolean(state.playerNames[String(seat)]),
        hasSession: player ? Boolean(state.sessions[String(seat)]) : false,
        hasPassword: Boolean(state.credentials[String(seat)]),
        hasChosen: player ? Boolean(state.choices[String(seat)]) : false,
        isCurrentTurn: player ? state.turn === seat : false,
        isSelf,
      };
    }),
    selectedCount: Object.keys(state.choices).length,
    remainingHiddenCount: state.pool.length,
    discardedHiddenCount: state.discarded ? 1 : 0,
    currentPlayer: player,
    isCurrentTurn,
    canDiscard,
    canChoose,
    ownChoice: ownChoiceId ? getAgenda(ownChoiceId) : null,
    ownInventory: player ? getPlayerInventory(state, player) : null,
  };

  if (canChoose) {
    redacted.availableAgendas = state.pool.map(getAgenda);
  }

  return redacted;
}

export function getAgenda(id: string): Agenda {
  const agenda = AGENDA_BY_ID.get(id);

  if (!agenda) {
    throw new AgendaStateError("Unknown agenda.");
  }

  return agenda;
}

function sanitizeChoices(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>).filter(([player, agendaId]) => {
    return /^[1-5]$/.test(player) && typeof agendaId === "string" && AGENDA_BY_ID.has(agendaId);
  });

  return Object.fromEntries(entries);
}

function sanitizeCredentials(value: unknown): Record<string, SeatCredential> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([player, credential]): credential is SeatCredential =>
      /^[1-5]$/.test(player) &&
      Boolean(credential) &&
      typeof credential === "object" &&
      typeof (credential as SeatCredential).salt === "string" &&
      typeof (credential as SeatCredential).hash === "string" &&
      Number.isInteger((credential as SeatCredential).iterations) &&
      (credential as SeatCredential).iterations > 0 &&
      typeof (credential as SeatCredential).createdAt === "string",
  );

  return Object.fromEntries(entries);
}

function sanitizePlayerNames(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([player, name]) => /^[1-5]$/.test(player) && isUsablePlayerName(name))
    .map(([player, name]) => [player, (name as string).trim().replace(/\s+/g, " ")]);

  return Object.fromEntries(entries);
}

function isUsablePlayerName(value: unknown): value is string {
  return typeof value === "string" && value.trim().length >= 1 && value.trim().length <= 24;
}

function sanitizeInventories(value: unknown, now: string): Record<string, PlayerInventory> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([player]) => /^[1-5]$/.test(player))
    .map(([player, inventory]) => [player, sanitizePlayerInventory(inventory, now)]);

  return Object.fromEntries(entries);
}

function sanitizePlayerInventory(value: unknown, now: string): PlayerInventory {
  const defaults = createDefaultPlayerInventory(now);
  const candidate = value && typeof value === "object" ? (value as Partial<PlayerInventory>) : {};
  const resources =
    candidate.resources && typeof candidate.resources === "object"
      ? (candidate.resources as Record<string, unknown>)
      : {};

  return {
    coins: sanitizeCounter(candidate.coins, PERSONAL_COUNTER_MAX, defaults.coins),
    powerTokens: sanitizeCounter(candidate.powerTokens, PERSONAL_COUNTER_MAX, defaults.powerTokens),
    prestige: sanitizeCounter(candidate.prestige, PERSONAL_COUNTER_MAX, defaults.prestige),
    crave: sanitizeCounter(candidate.crave, PERSONAL_COUNTER_MAX, defaults.crave),
    resources: Object.fromEntries(
      PERSONAL_RESOURCE_TRACKS.map(({ id }) => [
        id,
        sanitizeCounter(resources[id], RESOURCE_POSITION_MAX, defaults.resources[id]),
      ]),
    ) as Record<PersonalResourceId, number>,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
  };
}

function sanitizeCounter(value: unknown, max: number, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(max, Math.trunc(value)));
}

function sanitizeSessions(value: unknown): Record<string, { token: string; createdAt: string }> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([player, session]): session is { token: string; createdAt: string } =>
      /^[1-5]$/.test(player) &&
      Boolean(session) &&
      typeof session === "object" &&
      typeof (session as { token?: unknown }).token === "string" &&
      typeof (session as { createdAt?: unknown }).createdAt === "string",
  );

  return Object.fromEntries(entries);
}
