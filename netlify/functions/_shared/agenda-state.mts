import {
  HOUSE_CATALOG,
  REQUIRED_HOUSE_COUNT,
  getHouseById,
  isHouseId,
  sortHouseIdsByNumber,
} from "../../../shared/houses.mjs";

export const PLAYER_COUNT = REQUIRED_HOUSE_COUNT;

export type HouseId = string;
export type PlayerNumber = HouseId;
export type Phase = "house-select" | "discard" | "choose" | "complete";
export type PersonalResourceId = (typeof PERSONAL_RESOURCE_TRACKS)[number]["id"];
export type OpenAgendaTokenPolarity = "positive" | "negative";

export type Agenda = {
  id: string;
  name: string;
  englishName: string;
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

export type HouseProgress = {
  openAgendaTokens: Record<OpenAgendaTokenPolarity, PersonalResourceId[]>;
  narrativeAchievement: boolean;
  houseAchievements: number[];
  alignmentAchievements: Record<string, number>;
  updatedAt: string;
};

export type GameState = {
  version: number;
  phase: Phase;
  turn: HouseId | null;
  draftOrder: HouseId[];
  pool: string[];
  discarded: string | null;
  choices: Record<string, string>;
  sessions: Record<string, { token: string; createdAt: string }>;
  credentials: Record<string, SeatCredential>;
  playerNames: Record<string, string>;
  inventories: Record<string, PlayerInventory>;
  progress: Record<string, HouseProgress>;
  createdAt: string;
  updatedAt: string;
};

export type SeatCredential = {
  salt: string;
  hash: string;
  iterations: number;
  createdAt: string;
};

export type RedactedHouse = {
  id: HouseId;
  houseId: HouseId;
  player: number;
  number: number;
  title: string;
  koreanTitle: string;
  motto: string;
  crest: string;
  goal: string;
  alignments: string[];
  profile: string;
  motif: string;
  name: string;
  hasCustomName: boolean;
  hasSession: boolean;
  hasPassword: boolean;
  hasChosen: boolean;
  isCurrentTurn: boolean;
  isSelf: boolean;
};

export type RedactedState = {
  version: number;
  phase: Phase;
  turn: HouseId | null;
  draftOrder: HouseId[];
  houses: RedactedHouse[];
  players: RedactedHouse[];
  selectedCount: number;
  claimedHouseCount: number;
  requiredHouseCount: number;
  remainingHiddenCount: number;
  discardedHiddenCount: number;
  currentPlayer: HouseId | null;
  currentHouseId: HouseId | null;
  isCurrentTurn: boolean;
  canDiscard: boolean;
  canChoose: boolean;
  ownChoice: Agenda | null;
  ownInventory: PlayerInventory | null;
  ownHouseProgress: HouseProgress | null;
  availableAgendas?: Agenda[];
};

export type FinalBoardPositions = Record<PersonalResourceId, number>;

export type FinalScoreRow = {
  houseId: HouseId;
  houseName: string;
  houseNumber: number;
  scores: {
    resourceGoal: number;
    moneyRanking: number;
    openAgenda: number;
    powerMajority: number;
    total: number;
  };
  ranks: {
    coins: number;
    power: number;
    total: number;
  };
};

export type FinalScoringResult = {
  board: FinalBoardPositions;
  rows: FinalScoreRow[];
  updatedAt: string;
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
    englishName: "Extremist",
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
    name: "재력가",
    englishName: "Opulent",
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
    englishName: "Moderate",
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
    englishName: "Rebel",
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
    englishName: "Opportunist",
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
    englishName: "Greedy",
    resourceGoal: "1-5번 줄 또는 13-17번 줄 안에 있는 자원 마커 수에 따라 승점을 얻습니다.",
    resourceScoring: [
      { label: "마커 0개", vp: 4 },
      { label: "마커 1개", vp: 7 },
      { label: "마커 2개", vp: 11 },
      { label: "마커 3개", vp: 7 },
      { label: "마커 4개", vp: 4 },
      { label: "마커 5개", vp: 0 },
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
const PERSONAL_COUNTER_LIMITS = {
  coins: 99,
  powerTokens: 99,
  prestige: 100,
  crave: 50,
} as const;
const RESOURCE_POSITION_MAX = 17;
const OPEN_AGENDA_TOKEN_LIMIT = 2;
const HOUSE_ACHIEVEMENT_COUNT = 3;
const HOUSE_ACHIEVEMENT_MARK_MAX = 3;
const HOUSE_ALIGNMENT_MARK_MAX = 4;
const RESOURCE_LABEL_BY_ID = Object.fromEntries(PERSONAL_RESOURCE_TRACKS.map((resource) => [resource.id, resource.label]));

export function parseHouseId(value: unknown): HouseId {
  if (!isHouseId(value)) {
    throw new AgendaStateError("가문을 선택하세요.");
  }

  return value;
}

export function parsePlayer(value: unknown): HouseId {
  return parseHouseId(value);
}

export function isPlayerNumber(value: unknown): value is HouseId {
  return isHouseId(value);
}

export function createInitialState(now = new Date().toISOString()): GameState {
  return {
    version: 2,
    phase: "house-select",
    turn: null,
    draftOrder: [],
    pool: AGENDAS.map((agenda) => agenda.id),
    discarded: null,
    choices: {},
    sessions: {},
    credentials: {},
    playerNames: {},
    inventories: {},
    progress: {},
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeState(value: unknown, now = new Date().toISOString()): GameState {
  if (!value || typeof value !== "object") {
    return createInitialState(now);
  }

  const candidate = value as Partial<GameState>;
  const credentials = sanitizeCredentials(candidate.credentials);
  const inventories = sanitizeInventories(candidate.inventories, now);
  const progress = sanitizeProgress(candidate.progress, now);
  const activeHouseIds = getActiveHouseIds(credentials);
  const draftReady = activeHouseIds.length >= REQUIRED_HOUSE_COUNT;
  const draftOrder = draftReady ? sanitizeDraftOrder(candidate.draftOrder, activeHouseIds, inventories) : [];
  const choices = draftReady ? sanitizeChoices(candidate.choices, draftOrder) : {};
  const discarded =
    draftReady && typeof candidate.discarded === "string" && AGENDA_BY_ID.has(candidate.discarded)
      ? candidate.discarded
      : null;
  const pool = draftReady ? sanitizePool(candidate.pool, discarded, choices) : AGENDAS.map((agenda) => agenda.id);
  const phase = derivePhase(draftReady, discarded, choices, draftOrder);
  const turn = deriveTurn(candidate.turn, phase, draftOrder, choices);

  return {
    version: Number.isInteger(candidate.version) ? Math.max(2, Number(candidate.version)) : 2,
    phase,
    turn,
    draftOrder,
    pool,
    discarded,
    choices,
    sessions: sanitizeSessions(candidate.sessions, credentials),
    credentials,
    playerNames: sanitizePlayerNames(candidate.playerNames),
    inventories,
    progress,
    createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : now,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
  };
}

export function getClaimedHouseIds(state: GameState): HouseId[] {
  return getActiveHouseIds(state.credentials);
}

export function getHouseLabel(state: GameState, houseId: HouseId) {
  const house = getHouseById(houseId);
  return state.playerNames[houseId] || house?.koreanTitle || house?.title || houseId;
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

export function getPlayerInventory(state: GameState, houseId: HouseId): PlayerInventory {
  return state.inventories[houseId] || createDefaultPlayerInventory(state.updatedAt);
}

export function createDefaultHouseProgress(now = new Date().toISOString()): HouseProgress {
  return {
    openAgendaTokens: {
      positive: [],
      negative: [],
    },
    narrativeAchievement: false,
    houseAchievements: Array.from({ length: HOUSE_ACHIEVEMENT_COUNT }, () => 0),
    alignmentAchievements: Object.fromEntries(AGENDAS.map((agenda) => [agenda.id, 0])),
    updatedAt: now,
  };
}

export function getHouseProgress(state: GameState, houseId: HouseId): HouseProgress {
  return state.progress[houseId] || createDefaultHouseProgress(state.updatedAt);
}

export function setHouseCredential(
  state: GameState,
  houseId: HouseId,
  credential: SeatCredential,
  now = new Date().toISOString(),
): GameState {
  return {
    ...state,
    credentials: {
      ...state.credentials,
      [houseId]: credential,
    },
    version: state.version + 1,
    updatedAt: now,
  };
}

export const setSeatCredential = setHouseCredential;

export function setHouseName(
  state: GameState,
  houseId: HouseId,
  name: string,
  now = new Date().toISOString(),
): GameState {
  return {
    ...state,
    playerNames: {
      ...state.playerNames,
      [houseId]: name,
    },
    version: state.version + 1,
    updatedAt: now,
  };
}

export const setPlayerName = setHouseName;

export function registerSession(
  state: GameState,
  houseId: HouseId,
  token: string,
  now = new Date().toISOString(),
): GameState {
  return {
    ...state,
    sessions: {
      ...state.sessions,
      [houseId]: { token, createdAt: now },
    },
    version: state.version + 1,
    updatedAt: now,
  };
}

export function clearSession(
  state: GameState,
  houseId: HouseId,
  now = new Date().toISOString(),
): GameState {
  if (!state.sessions[houseId]) {
    return state;
  }

  const sessions = { ...state.sessions };
  delete sessions[houseId];

  return {
    ...state,
    sessions,
    version: state.version + 1,
    updatedAt: now,
  };
}

export function startDraftIfReady(state: GameState, now = new Date().toISOString()): GameState {
  if (state.phase !== "house-select") {
    return state;
  }

  const draftOrder = sortHouseIdsForDraft(getClaimedHouseIds(state), state.inventories);

  if (draftOrder.length < REQUIRED_HOUSE_COUNT) {
    return state;
  }

  return {
    ...state,
    phase: "discard",
    turn: draftOrder[0],
    draftOrder,
    pool: AGENDAS.map((agenda) => agenda.id),
    discarded: null,
    choices: {},
    version: state.version + 1,
    updatedAt: now,
  };
}

export function endSession(state: GameState, now = new Date().toISOString()): GameState {
  if (state.phase !== "complete") {
    throw new AgendaStateError("모든 가문이 비밀 의제를 선택한 뒤 회기를 종료할 수 있습니다.", 409);
  }

  const draftOrder = sortHouseIdsForDraft(getClaimedHouseIds(state), state.inventories);

  if (draftOrder.length < REQUIRED_HOUSE_COUNT) {
    throw new AgendaStateError("참여 가문 5개가 유지되어야 다음 회기를 준비할 수 있습니다.", 409);
  }

  return {
    ...state,
    version: state.version + 1,
    phase: "discard",
    turn: draftOrder[0],
    draftOrder,
    pool: AGENDAS.map((agenda) => agenda.id),
    discarded: null,
    choices: {},
    sessions: {},
    inventories: resetSessionInventories(state.inventories, now),
    progress: resetSessionProgress(state.progress, now),
    updatedAt: now,
  };
}

export function savePlayerInventory(
  state: GameState,
  houseId: HouseId,
  inventory: unknown,
  now = new Date().toISOString(),
): GameState {
  return {
    ...state,
    inventories: {
      ...state.inventories,
      [houseId]: {
        ...sanitizePlayerInventory(inventory, now),
        updatedAt: now,
      },
    },
    version: state.version + 1,
    updatedAt: now,
  };
}

export function saveHouseProgress(
  state: GameState,
  houseId: HouseId,
  progress: unknown,
  now = new Date().toISOString(),
): GameState {
  return {
    ...state,
    progress: {
      ...state.progress,
      [houseId]: {
        ...sanitizeHouseProgress(progress, now),
        updatedAt: now,
      },
    },
    version: state.version + 1,
    updatedAt: now,
  };
}

export function calculateFinalScores(
  state: GameState,
  boardPositions: unknown,
  now = new Date().toISOString(),
): FinalScoringResult {
  if (state.phase !== "complete") {
    throw new AgendaStateError("모든 가문이 비밀 의제를 선택한 뒤 최종 점수를 계산할 수 있습니다.", 409);
  }

  const houseIds = state.draftOrder.length ? state.draftOrder : getClaimedHouseIds(state);

  if (houseIds.length < REQUIRED_HOUSE_COUNT) {
    throw new AgendaStateError("참여 가문 5개가 유지되어야 최종 점수를 계산할 수 있습니다.", 409);
  }

  const board = sanitizeFinalBoardPositions(boardPositions);
  const coinRanks = rankByDescendingValue(houseIds, (houseId) => getPlayerInventory(state, houseId).coins);
  const powerRanks = rankByDescendingValue(houseIds, (houseId) => getPlayerInventory(state, houseId).powerTokens);
  const rows = houseIds.map((houseId) => {
    const agenda = getAgenda(state.choices[houseId]);
    const coinRank = coinRanks.get(houseId) || 0;
    const powerRank = powerRanks.get(houseId) || 0;
    const resourceGoal = scoreSecretAgendaResourceGoal(agenda, board);
    const moneyRanking = agenda.coinRanking.find((score) => score.rank === coinRank)?.vp || 0;
    const openAgenda = scoreOpenAgendaTokens(getHouseProgress(state, houseId).openAgendaTokens, board);
    const powerMajority = powerRank === 1 ? 2 : powerRank === 2 ? 1 : 0;

    return {
      houseId,
      houseName: getHouseLabel(state, houseId),
      houseNumber: getHouseById(houseId)?.number || 0,
      scores: {
        resourceGoal,
        moneyRanking,
        openAgenda,
        powerMajority,
        total: resourceGoal + moneyRanking + openAgenda + powerMajority,
      },
      ranks: {
        coins: coinRank,
        power: powerRank,
        total: 0,
      },
    };
  });
  const totalRanks = rankByDescendingValue(rows, (row) => row.scores.total);

  return {
    board,
    rows: rows
      .map((row) => ({
        ...row,
        ranks: {
          ...row.ranks,
          total: totalRanks.get(row) || 0,
        },
      }))
      .sort((left, right) => left.ranks.total - right.ranks.total || left.houseNumber - right.houseNumber),
    updatedAt: now,
  };
}

export function applyDiscard(
  state: GameState,
  houseId: HouseId,
  now = new Date().toISOString(),
  rng: () => number = Math.random,
): GameState {
  if (state.phase === "house-select") {
    throw new AgendaStateError("모든 가문이 선택된 뒤에 아젠다 드래프트를 시작할 수 있습니다.");
  }

  if (state.phase !== "discard") {
    throw new AgendaStateError("The discard step is not active.");
  }

  if (state.turn !== houseId) {
    throw new AgendaStateError("It is not your turn.", 403);
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
  houseId: HouseId,
  agendaId: string,
  now = new Date().toISOString(),
): GameState {
  if (state.phase === "house-select") {
    throw new AgendaStateError("모든 가문이 선택된 뒤에 아젠다를 고를 수 있습니다.");
  }

  if (state.phase !== "choose") {
    throw new AgendaStateError("Agenda choice is not active.");
  }

  if (state.turn !== houseId) {
    throw new AgendaStateError("It is not your turn.", 403);
  }

  if (state.choices[houseId]) {
    throw new AgendaStateError("This house has already chosen an agenda.");
  }

  if (!state.pool.includes(agendaId)) {
    throw new AgendaStateError("That agenda is not available.");
  }

  const draftIndex = state.draftOrder.indexOf(houseId);

  if (draftIndex < 0) {
    throw new AgendaStateError("This house is not in the draft.", 403);
  }

  const nextPool = state.pool.filter((id) => id !== agendaId);
  const nextChoices = { ...state.choices, [houseId]: agendaId };
  const isComplete = draftIndex === state.draftOrder.length - 1;

  return {
    ...state,
    version: state.version + 1,
    phase: isComplete ? "complete" : "choose",
    turn: isComplete ? houseId : state.draftOrder[draftIndex + 1],
    pool: nextPool,
    choices: nextChoices,
    updatedAt: now,
  };
}

export function redactState(state: GameState, houseId: HouseId | null): RedactedState {
  const ownChoiceId = houseId ? state.choices[houseId] : null;
  const isCurrentTurn = houseId !== null && state.turn === houseId;
  const canDiscard = isCurrentTurn && state.phase === "discard";
  const canChoose = isCurrentTurn && state.phase === "choose" && !ownChoiceId;
  const houses = HOUSE_CATALOG.map((house) => {
    const id = house.id;
    const hasPassword = Boolean(state.credentials[id]);
    const isSelf = houseId === id;

    return {
      id,
      houseId: id,
      player: house.number,
      number: house.number,
      title: house.title,
      koreanTitle: house.koreanTitle,
      motto: house.motto,
      crest: house.crest,
      goal: house.goal,
      alignments: house.alignments,
      profile: house.profile,
      motif: house.motif,
      name: getHouseLabel(state, id),
      hasCustomName: Boolean(state.playerNames[id]),
      hasSession: houseId ? Boolean(state.sessions[id]) : false,
      hasPassword,
      hasChosen: houseId ? Boolean(state.choices[id]) : false,
      isCurrentTurn: houseId ? state.turn === id : false,
      isSelf,
    };
  });
  const redacted: RedactedState = {
    version: state.version,
    phase: state.phase,
    turn: state.turn,
    draftOrder: state.draftOrder,
    houses,
    players: houses,
    selectedCount: Object.keys(state.choices).length,
    claimedHouseCount: getClaimedHouseIds(state).length,
    requiredHouseCount: REQUIRED_HOUSE_COUNT,
    remainingHiddenCount: state.pool.length,
    discardedHiddenCount: state.discarded ? 1 : 0,
    currentPlayer: houseId,
    currentHouseId: houseId,
    isCurrentTurn,
    canDiscard,
    canChoose,
    ownChoice: ownChoiceId ? getAgenda(ownChoiceId) : null,
    ownInventory: houseId ? getPlayerInventory(state, houseId) : null,
    ownHouseProgress: houseId ? getHouseProgress(state, houseId) : null,
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

function getActiveHouseIds(credentials: Record<string, SeatCredential>): HouseId[] {
  return sortHouseIdsByNumber(Object.keys(credentials)).slice(0, REQUIRED_HOUSE_COUNT);
}

function sanitizeDraftOrder(
  value: unknown,
  activeHouseIds: HouseId[],
  inventories: Record<string, PlayerInventory>,
): HouseId[] {
  const activeHouseSet = new Set(activeHouseIds);

  if (Array.isArray(value) && value.length === activeHouseIds.length) {
    const seen = new Set<string>();
    const draftOrder = value.filter((id): id is HouseId => {
      if (typeof id !== "string" || !activeHouseSet.has(id) || seen.has(id)) {
        return false;
      }

      seen.add(id);
      return true;
    });

    if (draftOrder.length === activeHouseIds.length) {
      return draftOrder;
    }
  }

  return sortHouseIdsForDraft(activeHouseIds, inventories);
}

function sortHouseIdsForDraft(
  houseIds: HouseId[],
  inventories: Record<string, PlayerInventory>,
): HouseId[] {
  return [...houseIds].sort((left, right) => {
    const leftPrestige = inventories[left]?.prestige ?? 0;
    const rightPrestige = inventories[right]?.prestige ?? 0;

    return leftPrestige - rightPrestige || compareHouseIdsByNumber(left, right);
  });
}

function compareHouseIdsByNumber(left: HouseId, right: HouseId) {
  const leftNumber = getHouseById(left)?.number ?? Number.MAX_SAFE_INTEGER;
  const rightNumber = getHouseById(right)?.number ?? Number.MAX_SAFE_INTEGER;

  return leftNumber - rightNumber || left.localeCompare(right);
}

function resetSessionInventories(
  inventories: Record<string, PlayerInventory>,
  now: string,
): Record<string, PlayerInventory> {
  return Object.fromEntries(
    Object.entries(inventories).map(([houseId, inventory]) => {
      const sanitized = sanitizePlayerInventory(inventory, now);
      return [
        houseId,
        {
          ...sanitized,
          coins: 10,
          powerTokens: 8,
          updatedAt: now,
        },
      ];
    }),
  );
}

function resetSessionProgress(
  progress: Record<string, HouseProgress>,
  now: string,
): Record<string, HouseProgress> {
  return Object.fromEntries(
    Object.entries(progress).map(([houseId, houseProgress]) => {
      const sanitized = sanitizeHouseProgress(houseProgress, now);
      return [
        houseId,
        {
          ...sanitized,
          openAgendaTokens: {
            positive: [],
            negative: [],
          },
          updatedAt: now,
        },
      ];
    }),
  );
}

function derivePhase(
  draftReady: boolean,
  discarded: string | null,
  choices: Record<string, string>,
  draftOrder: HouseId[],
): Phase {
  if (!draftReady) {
    return "house-select";
  }

  if (Object.keys(choices).length >= draftOrder.length) {
    return "complete";
  }

  return discarded ? "choose" : "discard";
}

function deriveTurn(
  candidateTurn: unknown,
  phase: Phase,
  draftOrder: HouseId[],
  choices: Record<string, string>,
): HouseId | null {
  if (phase === "house-select" || draftOrder.length === 0) {
    return null;
  }

  if (phase === "discard") {
    return draftOrder[0];
  }

  if (phase === "complete") {
    return draftOrder[draftOrder.length - 1];
  }

  if (isHouseId(candidateTurn) && draftOrder.includes(candidateTurn) && !choices[candidateTurn]) {
    return candidateTurn;
  }

  return draftOrder.find((houseId) => !choices[houseId]) || draftOrder[draftOrder.length - 1];
}

function sanitizePool(
  value: unknown,
  discarded: string | null,
  choices: Record<string, string>,
): string[] {
  const unavailable = new Set(Object.values(choices));

  if (discarded) {
    unavailable.add(discarded);
  }

  const fallback = AGENDAS.map((agenda) => agenda.id).filter((id) => !unavailable.has(id));

  if (!Array.isArray(value)) {
    return fallback;
  }

  const seen = new Set<string>();
  const pool = value.filter((id): id is string => {
    if (typeof id !== "string" || !AGENDA_BY_ID.has(id) || unavailable.has(id) || seen.has(id)) {
      return false;
    }

    seen.add(id);
    return true;
  });

  return pool.length ? pool : fallback;
}

function sanitizeChoices(value: unknown, draftOrder: HouseId[]): Record<string, string> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const draftHouses = new Set(draftOrder);
  const usedAgendas = new Set<string>();
  const entries = Object.entries(value as Record<string, unknown>).filter(([houseId, agendaId]) => {
    if (!draftHouses.has(houseId) || typeof agendaId !== "string" || !AGENDA_BY_ID.has(agendaId)) {
      return false;
    }

    if (usedAgendas.has(agendaId)) {
      return false;
    }

    usedAgendas.add(agendaId);
    return true;
  });

  return Object.fromEntries(entries);
}

function sanitizeCredentials(value: unknown): Record<string, SeatCredential> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([houseId, credential]): credential is SeatCredential =>
      isHouseId(houseId) &&
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
    .filter(([houseId, name]) => isHouseId(houseId) && isUsablePlayerName(name))
    .map(([houseId, name]) => [houseId, (name as string).trim().replace(/\s+/g, " ")]);

  return Object.fromEntries(entries);
}

function isUsablePlayerName(value: unknown): value is string {
  return typeof value === "string" && value.trim().length >= 1 && value.trim().length <= 32;
}

function sanitizeInventories(value: unknown, now: string): Record<string, PlayerInventory> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([houseId]) => isHouseId(houseId))
    .map(([houseId, inventory]) => [houseId, sanitizePlayerInventory(inventory, now)]);

  return Object.fromEntries(entries);
}

function sanitizeProgress(value: unknown, now: string): Record<string, HouseProgress> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([houseId]) => isHouseId(houseId))
    .map(([houseId, progress]) => [houseId, sanitizeHouseProgress(progress, now)]);

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
    coins: sanitizeCounter(candidate.coins, PERSONAL_COUNTER_LIMITS.coins, defaults.coins),
    powerTokens: sanitizeCounter(candidate.powerTokens, PERSONAL_COUNTER_LIMITS.powerTokens, defaults.powerTokens),
    prestige: sanitizeCounter(candidate.prestige, PERSONAL_COUNTER_LIMITS.prestige, defaults.prestige),
    crave: sanitizeCounter(candidate.crave, PERSONAL_COUNTER_LIMITS.crave, defaults.crave),
    resources: Object.fromEntries(
      PERSONAL_RESOURCE_TRACKS.map(({ id }) => [
        id,
        sanitizeCounter(resources[id], RESOURCE_POSITION_MAX, defaults.resources[id]),
      ]),
    ) as Record<PersonalResourceId, number>,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
  };
}

function sanitizeFinalBoardPositions(value: unknown): FinalBoardPositions {
  const candidate = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return Object.fromEntries(
    PERSONAL_RESOURCE_TRACKS.map(({ id }) => [id, sanitizeBoardPosition(candidate[id], RESOURCE_LABEL_BY_ID[id])]),
  ) as FinalBoardPositions;
}

function sanitizeBoardPosition(value: unknown, label: string) {
  const number = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(number) || number < 1 || number > RESOURCE_POSITION_MAX) {
    throw new AgendaStateError(`${label} 최종 위치는 1부터 ${RESOURCE_POSITION_MAX} 사이로 입력하세요.`);
  }

  return Math.trunc(number);
}

function scoreSecretAgendaResourceGoal(agenda: Agenda, board: FinalBoardPositions) {
  const positions = Object.values(board);
  const metric =
    agenda.id === "extremist"
      ? Math.min(Math.max(...positions) - Math.min(...positions) + 1, getMaxResourceScoringMetric(agenda))
      : countResourcesForAgenda(agenda.id, board);

  return getResourceScoreForMetric(agenda, metric);
}

function countResourcesForAgenda(agendaId: string, board: FinalBoardPositions) {
  return Object.values(board).filter((position) => {
    if (agendaId === "opulent") {
      return position >= 9 && position <= 17;
    }

    if (agendaId === "moderate") {
      return position >= 5 && position <= 13;
    }

    if (agendaId === "opportunist") {
      return position >= 1 && position <= 9;
    }

    if (agendaId === "rebel" || agendaId === "greedy") {
      return (position >= 1 && position <= 5) || (position >= 13 && position <= 17);
    }

    return false;
  }).length;
}

function getResourceScoreForMetric(agenda: Agenda, metric: number) {
  return agenda.resourceScoring.find((item) => getFirstNumber(item.label) === metric)?.vp || 0;
}

function getMaxResourceScoringMetric(agenda: Agenda) {
  return Math.max(...agenda.resourceScoring.map((item) => getFirstNumber(item.label)).filter((value) => value >= 0));
}

function getFirstNumber(value: string) {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : -1;
}

function scoreOpenAgendaTokens(
  tokens: Record<OpenAgendaTokenPolarity, PersonalResourceId[]>,
  board: FinalBoardPositions,
) {
  const highRanks = rankResourcesByPosition(board, "desc");
  const lowRanks = rankResourcesByPosition(board, "asc");
  const positiveScore = (tokens.positive || []).reduce((total, resourceId) => {
    const rank = highRanks.get(resourceId);
    return total + (rank === 1 ? 3 : rank === 2 ? 1 : 0);
  }, 0);
  const negativeScore = (tokens.negative || []).reduce((total, resourceId) => {
    const rank = lowRanks.get(resourceId);
    return total + (rank === 1 ? -3 : rank === 2 ? -1 : 0);
  }, 0);

  return positiveScore + negativeScore;
}

function rankResourcesByPosition(board: FinalBoardPositions, direction: "asc" | "desc") {
  return rankByValue(
    PERSONAL_RESOURCE_TRACKS.map((resource) => resource.id),
    (resourceId) => board[resourceId],
    direction,
  );
}

function rankByDescendingValue<T>(items: T[], getValue: (item: T) => number) {
  return rankByValue(items, getValue, "desc");
}

function rankByValue<T>(items: T[], getValue: (item: T) => number, direction: "asc" | "desc") {
  const values = Array.from(new Set(items.map(getValue))).sort((left, right) =>
    direction === "asc" ? left - right : right - left,
  );
  const rankByRawValue = new Map(values.map((value, index) => [value, index + 1]));

  return new Map(items.map((item) => [item, rankByRawValue.get(getValue(item)) || 0]));
}

function sanitizeHouseProgress(value: unknown, now: string): HouseProgress {
  const defaults = createDefaultHouseProgress(now);
  const candidate = value && typeof value === "object" ? (value as Partial<HouseProgress>) : {};
  const openAgendaTokens =
    candidate.openAgendaTokens && typeof candidate.openAgendaTokens === "object"
      ? (candidate.openAgendaTokens as Partial<Record<OpenAgendaTokenPolarity, unknown>>)
      : {};
  const alignmentAchievements =
    candidate.alignmentAchievements && typeof candidate.alignmentAchievements === "object"
      ? (candidate.alignmentAchievements as Record<string, unknown>)
      : {};
  const houseAchievements = Array.isArray(candidate.houseAchievements) ? candidate.houseAchievements : [];

  return {
    openAgendaTokens: {
      positive: sanitizeOpenAgendaTokens(openAgendaTokens.positive),
      negative: sanitizeOpenAgendaTokens(openAgendaTokens.negative),
    },
    narrativeAchievement: candidate.narrativeAchievement === true,
    houseAchievements: Array.from({ length: HOUSE_ACHIEVEMENT_COUNT }, (_, index) =>
      sanitizeCounter(houseAchievements[index], HOUSE_ACHIEVEMENT_MARK_MAX, defaults.houseAchievements[index]),
    ),
    alignmentAchievements: Object.fromEntries(
      AGENDAS.map((agenda) => [
        agenda.id,
        sanitizeCounter(
          alignmentAchievements[agenda.id] ?? alignmentAchievements[agenda.englishName],
          HOUSE_ALIGNMENT_MARK_MAX,
          defaults.alignmentAchievements[agenda.id],
        ),
      ]),
    ),
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
  };
}

function sanitizeOpenAgendaTokens(value: unknown): PersonalResourceId[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<PersonalResourceId>();
  const tokens: PersonalResourceId[] = [];

  for (const resourceId of value) {
    if (!isPersonalResourceId(resourceId) || seen.has(resourceId)) {
      continue;
    }

    seen.add(resourceId);
    tokens.push(resourceId);

    if (tokens.length >= OPEN_AGENDA_TOKEN_LIMIT) {
      break;
    }
  }

  return tokens;
}

function isPersonalResourceId(value: unknown): value is PersonalResourceId {
  return typeof value === "string" && PERSONAL_RESOURCE_TRACKS.some((track) => track.id === value);
}

function sanitizeCounter(value: unknown, max: number, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(max, Math.trunc(value)));
}

function sanitizeSessions(
  value: unknown,
  credentials: Record<string, SeatCredential>,
): Record<string, { token: string; createdAt: string }> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([houseId, session]): session is { token: string; createdAt: string } =>
      isHouseId(houseId) &&
      Boolean(credentials[houseId]) &&
      Boolean(session) &&
      typeof session === "object" &&
      typeof (session as { token?: unknown }).token === "string" &&
      typeof (session as { createdAt?: unknown }).createdAt === "string",
  );

  return Object.fromEntries(entries);
}
