import {
  HOUSE_CATALOG,
  REQUIRED_HOUSE_COUNT,
  getHouseById,
  isHouseId,
  sortHouseIdsByNumber,
} from "../../../shared/houses.mjs";

export const PLAYER_COUNT = REQUIRED_HOUSE_COUNT;
export const PLAYER_SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export type HouseId = string;
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

export type AchievementEffect = {
  icon: string;
  amount: number;
};

export type AchievementEffectEntry = {
  icon: string;
  amount: number;
  text: string;
};

export type AchievementDetail = {
  conditionText: string;
  requiredCount: number;
  effectEntries: AchievementEffectEntry[];
  effects: AchievementEffect[];
  effectIcon: string;
  effectAmount: number;
  effectText: string;
};

export type AlignmentReward = {
  crownType: "" | "prestige" | "crave";
  count: number;
};

export type HouseProgress = {
  openAgendaTokens: Record<OpenAgendaTokenPolarity, PersonalResourceId[]>;
  narrativeAchievement: boolean;
  narrativeAchievementCount: number;
  narrativeAchievementDetail: AchievementDetail;
  houseAchievements: number[];
  /** 도전 과제별 달성/미달성(토글), `houseAchievements` 표시 수와 별개로 저장 */
  houseAchievementComplete: boolean[];
  houseAchievementDetails: AchievementDetail[];
  alignmentAchievements: Record<string, number>;
  alignmentRewards: Record<string, AlignmentReward>;
  alignmentOrder: string[];
  updatedAt: string;
};

export type NeutralPowerPool = {
  powerTokens: number;
  updatedAt: string;
};

export type SessionEndCause = "king_death" | "abdication_top" | "abdication_bottom";
export type SessionEndReward = {
  prestige: number;
  crave: number;
};
export type RoundEndTrigger = "" | "none" | SessionEndCause;

export type BoardProcessingPolarity = "positive" | "negative";
export type CampaignCardStatus = "active" | "completed" | "archived";
export type RecordAttachment = {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  createdAt: string;
};

export type BoardProcessingItemType = "chronicle" | "envelope" | "story" | "event" | "mystery" | "note";
export type BoardProcessingItem = {
  id: string;
  type: BoardProcessingItemType;
  note: string;
  createdAt: string;
  updatedAt: string;
  createdBy: HouseId | null;
  createdByName: string;
  resourceId?: PersonalResourceId;
  polarity?: BoardProcessingPolarity;
  stickerCode?: string;
  envelopeCode?: string;
  cardCode?: string;
  status?: CampaignCardStatus;
  dossierLetter?: string;
  storylineSymbol?: string;
  slotKey?: string;
  signedByHouseId?: HouseId;
  signedByName?: string;
  signerBonusText?: string;
  text?: string;
  photos?: RecordAttachment[];
};
export type BoardProcessingHistory = Record<BoardProcessingItemType, BoardProcessingItem[]>;

export type GameState = {
  version: number;
  phase: Phase;
  turn: HouseId | null;
  draftOrder: HouseId[];
  pool: string[];
  discarded: string | null;
  randomDiscardEnabled: boolean;
  choices: Record<string, string>;
  sessions: Record<string, AgendaSession>;
  adminHouseId: HouseId | null;
  credentials: Record<string, SeatCredential>;
  playerNames: Record<string, string>;
  inventories: Record<string, PlayerInventory>;
  progress: Record<string, HouseProgress>;
  neutralPowerPool: NeutralPowerPool;
  sessionEndCause: RoundEndTrigger;
  sessionEndRewardsAppliedAt: string;
  sessionEndRewardsAppliedBy: HouseId | null;
  boardProcessingOwnerHouseId: HouseId | null;
  boardProcessingItems: BoardProcessingItem[];
  createdAt: string;
  updatedAt: string;
};

export type AgendaSession = {
  token: string;
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
  randomDiscardEnabled: boolean;
  neutralPowerPool: NeutralPowerPool;
  sessionEndCause: RoundEndTrigger;
  sessionEndRewardsAppliedAt: string;
  sessionEndRewardsAppliedBy: HouseId | null;
  currentPlayer: HouseId | null;
  currentHouseId: HouseId | null;
  adminHouseId: HouseId | null;
  adminHouseName: string;
  isAdmin: boolean;
  isCurrentTurn: boolean;
  canDiscard: boolean;
  canChoose: boolean;
  ownChoice: Agenda | null;
  ownInventory: PlayerInventory | null;
  ownHouseProgress: HouseProgress | null;
  boardProcessingOwnerHouseId: HouseId | null;
  boardProcessingOwnerName: string;
  isBoardProcessingOwner: boolean;
  boardProcessingItems: BoardProcessingItem[];
  boardProcessingHistory: BoardProcessingHistory;
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
    id: "moderate",
    name: "중도주의자",
    englishName: "Moderate",
    resourceGoal: "5-13번 줄 안에 있는 자원 마커 수에 따라 승점을 얻습니다.",
    resourceScoring: [
      { label: "마커 1개", vp: 6 },
      { label: "마커 2개", vp: 7 },
      { label: "마커 3개", vp: 10 },
      { label: "마커 4개", vp: 13 },
      { label: "마커 5개", vp: 14 },
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

const FIXED_ALIGNMENT_ORDER = ["extremist", "rebel", "opulent", "opportunist", "moderate", "greedy"];

export const PERSONAL_RESOURCE_TRACKS = [
  { id: "influence", label: "영향력" },
  { id: "wealth", label: "부" },
  { id: "morale", label: "사기" },
  { id: "welfare", label: "복지" },
  { id: "knowledge", label: "지식" },
] as const;

const BOARD_PROCESSING_TYPES: BoardProcessingItemType[] = ["chronicle", "envelope", "story", "event", "mystery", "note"];

const AGENDA_BY_ID = new Map(AGENDAS.map((agenda) => [agenda.id, agenda]));
const STATE_VERSION = 10;
const PERSONAL_COUNTER_LIMITS = {
  coins: 99,
  powerTokens: 99,
  prestige: 100,
  crave: 50,
} as const;
const RESOURCE_POSITION_MAX = 17;
const NEUTRAL_POWER_POOL_LIMIT = 999;
const NEUTRAL_POWER_POOL_DEFAULT = 3;
const OPEN_AGENDA_TOKEN_LIMIT = 2;
const HOUSE_ACHIEVEMENT_COUNT = 3;
const HOUSE_ACHIEVEMENT_MARK_MAX = 5;
const HOUSE_ALIGNMENT_MARK_MAX = 4;
const HOUSE_ALIGNMENT_REWARD_COUNT_MAX = 3;
const ACHIEVEMENT_DETAIL_TEXT_LIMIT = 300;
const ACHIEVEMENT_EFFECT_ENTRY_LIMIT = 8;
const ACHIEVEMENT_EFFECT_AMOUNT_MAX = 99;
const ACHIEVEMENT_EFFECT_ICONS = new Set([
  "",
  "instant",
  "start",
  "condition",
]);
const ACHIEVEMENT_EFFECT_AMOUNT_ICONS = new Set<string>();
const BOARD_PROCESSING_ID_LIMIT = 64;
const BOARD_PROCESSING_CODE_LIMIT = 32;
const BOARD_PROCESSING_SLOT_LIMIT = 24;
const BOARD_PROCESSING_HOUSE_NAME_LIMIT = 32;
const BOARD_PROCESSING_NOTE_LIMIT = 500;
const RECORD_ATTACHMENT_LIMIT = 3;
const RECORD_ATTACHMENT_NAME_LIMIT = 80;
const RECORD_ATTACHMENT_DATA_URL_LIMIT = 1_200_000;
const RECORD_ATTACHMENT_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const RESOURCE_LABEL_BY_ID = Object.fromEntries(PERSONAL_RESOURCE_TRACKS.map((resource) => [resource.id, resource.label]));
const SESSION_END_REWARDS: Record<
  SessionEndCause,
  { ranks: Record<number, SessionEndReward>; last: SessionEndReward }
> = {
  king_death: {
    ranks: {
      1: { prestige: 2, crave: 0 },
      2: { prestige: 2, crave: 0 },
      3: { prestige: 1, crave: 1 },
      4: { prestige: 1, crave: 1 },
    },
    last: { prestige: 0, crave: 2 },
  },
  abdication_top: {
    ranks: {
      1: { prestige: 3, crave: 0 },
      2: { prestige: 2, crave: 0 },
      3: { prestige: 1, crave: 0 },
      4: { prestige: 1, crave: 0 },
    },
    last: { prestige: 0, crave: 2 },
  },
  abdication_bottom: {
    ranks: {
      1: { prestige: 0, crave: 2 },
      2: { prestige: 0, crave: 1 },
      3: { prestige: 0, crave: 1 },
      4: { prestige: 0, crave: 1 },
    },
    last: { prestige: 2, crave: 0 },
  },
};

export function parseHouseId(value: unknown): HouseId {
  if (!isHouseId(value)) {
    throw new AgendaStateError("가문을 선택하세요.");
  }

  return value;
}

function createDefaultNeutralPowerPool(now = new Date().toISOString()): NeutralPowerPool {
  return {
    powerTokens: NEUTRAL_POWER_POOL_DEFAULT,
    updatedAt: now,
  };
}

export function createInitialState(now = new Date().toISOString()): GameState {
  return {
    version: STATE_VERSION,
    phase: "house-select",
    turn: null,
    draftOrder: [],
    pool: AGENDAS.map((agenda) => agenda.id),
    discarded: null,
    randomDiscardEnabled: true,
    choices: {},
    sessions: {},
    adminHouseId: null,
    credentials: {},
    playerNames: {},
    inventories: {},
    progress: {},
    neutralPowerPool: createDefaultNeutralPowerPool(now),
    sessionEndCause: "",
    sessionEndRewardsAppliedAt: "",
    sessionEndRewardsAppliedBy: null,
    boardProcessingOwnerHouseId: null,
    boardProcessingItems: [],
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
  const sessions = sanitizeSessions(candidate.sessions, credentials, now);
  const inventories = sanitizeInventories(candidate.inventories, now);
  const progress = sanitizeProgress(candidate.progress, now);
  const loggedInHouseIds = getLoggedInHouseIdsFromMaps(credentials, sessions);
  const adminHouseId =
    isHouseId(candidate.adminHouseId) && loggedInHouseIds.includes(candidate.adminHouseId)
      ? candidate.adminHouseId
      : null;
  const activeHouseIds = candidate.phase === "house-select" ? loggedInHouseIds : getActiveHouseIds(credentials);
  const draftReady = activeHouseIds.length >= REQUIRED_HOUSE_COUNT;
  const candidateVersion = Number.isInteger(candidate.version) ? Number(candidate.version) : 0;
  const migrateUnpickedDraftOrder = shouldMigrateUnpickedDraftOrder(candidateVersion, candidate.choices);
  const draftOrder = draftReady
    ? sanitizeDraftOrder(candidate.draftOrder, activeHouseIds, inventories, migrateUnpickedDraftOrder)
    : [];
  const choices = draftReady ? sanitizeChoices(candidate.choices, draftOrder) : {};
  const discarded =
    draftReady && typeof candidate.discarded === "string" && AGENDA_BY_ID.has(candidate.discarded)
      ? candidate.discarded
      : null;
  const randomDiscardEnabled =
    typeof candidate.randomDiscardEnabled === "boolean" ? candidate.randomDiscardEnabled : true;
  const pool = draftReady ? sanitizePool(candidate.pool, discarded, choices) : AGENDAS.map((agenda) => agenda.id);
  const phase = derivePhase(draftReady, discarded, choices, draftOrder);
  const turn = deriveTurn(migrateUnpickedDraftOrder ? null : candidate.turn, phase, draftOrder, choices);
  const boardProcessingOwnerHouseId = sanitizeRoleHouseId(candidate.boardProcessingOwnerHouseId, activeHouseIds);
  const boardProcessingItems = sanitizeBoardProcessingItems(candidate.boardProcessingItems, now);
  const neutralPowerPool = sanitizeNeutralPowerPool(candidate.neutralPowerPool, now);

  return {
    version: Math.max(STATE_VERSION, candidateVersion),
    phase,
    turn,
    draftOrder,
    pool,
    discarded,
    randomDiscardEnabled,
    choices,
    sessions,
    adminHouseId,
    credentials,
    playerNames: sanitizePlayerNames(candidate.playerNames),
    inventories,
    progress,
    neutralPowerPool,
    sessionEndCause: sanitizeRoundEndTrigger(candidate.sessionEndCause),
    sessionEndRewardsAppliedAt: typeof candidate.sessionEndRewardsAppliedAt === "string" ? candidate.sessionEndRewardsAppliedAt : "",
    sessionEndRewardsAppliedBy: isHouseId(candidate.sessionEndRewardsAppliedBy) ? candidate.sessionEndRewardsAppliedBy : null,
    boardProcessingOwnerHouseId,
    boardProcessingItems,
    createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : now,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
  };
}

export function getClaimedHouseIds(state: GameState): HouseId[] {
  if (state.phase === "house-select") {
    return getActiveSessionHouseIds(state);
  }

  return getActiveHouseIds(state.credentials);
}

export function getHouseLabel(state: GameState, houseId: HouseId) {
  const house = getHouseById(houseId);
  return state.playerNames[houseId] || house?.koreanTitle || house?.title || houseId;
}

export function getAdminHouseId(state: GameState): HouseId | null {
  return state.adminHouseId && getLoggedInHouseIds(state).includes(state.adminHouseId)
    ? state.adminHouseId
    : null;
}

export function isAdminHouse(state: GameState, houseId: HouseId | null | undefined): boolean {
  return Boolean(houseId && getAdminHouseId(state) === houseId);
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
    narrativeAchievementCount: 0,
    narrativeAchievementDetail: createDefaultAchievementDetail(1),
    houseAchievements: Array.from({ length: HOUSE_ACHIEVEMENT_COUNT }, () => 0),
    houseAchievementComplete: Array.from({ length: HOUSE_ACHIEVEMENT_COUNT }, () => false),
    houseAchievementDetails: Array.from({ length: HOUSE_ACHIEVEMENT_COUNT }, () =>
      createDefaultAchievementDetail(HOUSE_ACHIEVEMENT_MARK_MAX),
    ),
    alignmentAchievements: Object.fromEntries(AGENDAS.map((agenda) => [agenda.id, 0])),
    alignmentRewards: Object.fromEntries(AGENDAS.map((agenda) => [agenda.id, createDefaultAlignmentReward()])),
    alignmentOrder: getDefaultAlignmentOrder(),
    updatedAt: now,
  };
}

function getDefaultAlignmentOrder() {
  return [...FIXED_ALIGNMENT_ORDER];
}

function createDefaultAlignmentReward(): AlignmentReward {
  return {
    crownType: "",
    count: 0,
  };
}

function createDefaultAchievementDetail(requiredCount: number): AchievementDetail {
  return {
    conditionText: "",
    requiredCount,
    effectEntries: [],
    effects: [],
    effectIcon: "",
    effectAmount: 0,
    effectText: "",
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
      [houseId]: { token, createdAt: now, updatedAt: now },
    },
    version: state.version + 1,
    updatedAt: now,
  };
}

export function touchSession(
  state: GameState,
  houseId: HouseId,
  now = new Date().toISOString(),
): GameState {
  const session = state.sessions[houseId];

  if (!session) {
    return state;
  }

  return {
    ...state,
    sessions: {
      ...state.sessions,
      [houseId]: { ...session, updatedAt: now },
    },
  };
}

export function clearSession(
  state: GameState,
  houseId: HouseId,
  now = new Date().toISOString(),
): GameState {
  const shouldClearAdmin = state.adminHouseId === houseId;

  if (!state.sessions[houseId] && !shouldClearAdmin) {
    return state;
  }

  const sessions = { ...state.sessions };
  delete sessions[houseId];

  return {
    ...state,
    sessions,
    adminHouseId: shouldClearAdmin ? null : state.adminHouseId,
    version: state.version + 1,
    updatedAt: now,
  };
}

export function setAdminMode(
  state: GameState,
  houseId: HouseId,
  enabled: unknown,
  now = new Date().toISOString(),
): GameState {
  const activeHouseIds = getActiveSessionHouseIds(state);

  if (!activeHouseIds.includes(houseId)) {
    throw new AgendaStateError("현재 존재하는 가문 세션만 관리자 모드를 사용할 수 있습니다.", 403);
  }

  const currentAdminHouseId = getAdminHouseId(state);

  if (enabled === true) {
    if (currentAdminHouseId && currentAdminHouseId !== houseId) {
      throw new AgendaStateError("이미 다른 가문이 관리자 모드를 사용 중입니다.", 409);
    }

    if (state.adminHouseId === houseId) {
      return state;
    }

    return {
      ...state,
      adminHouseId: houseId,
      version: state.version + 1,
      updatedAt: now,
    };
  }

  if (!currentAdminHouseId || currentAdminHouseId !== houseId) {
    return state;
  }

  return {
    ...state,
    adminHouseId: null,
    version: state.version + 1,
    updatedAt: now,
  };
}

function transitionFromHouseSelectToDiscard(state: GameState, draftOrder: HouseId[], now: string): GameState {
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

export function startDraftIfReady(state: GameState, now = new Date().toISOString()): GameState {
  if (state.phase !== "house-select") {
    return state;
  }

  const draftOrder = sortHouseIdsForDraft(getClaimedHouseIds(state), state.inventories);

  if (draftOrder.length < REQUIRED_HOUSE_COUNT) {
    return state;
  }

  return transitionFromHouseSelectToDiscard(state, draftOrder, now);
}

export function startDraftPhase(state: GameState, now = new Date().toISOString()): GameState {
  if (state.phase !== "house-select") {
    throw new AgendaStateError("비밀 의제 배정(폐기) 단계는 이미 시작되었습니다.", 409);
  }

  const draftOrder = sortHouseIdsForDraft(getClaimedHouseIds(state), state.inventories);

  if (draftOrder.length < REQUIRED_HOUSE_COUNT) {
    throw new AgendaStateError(
      `참여 가문 ${REQUIRED_HOUSE_COUNT}곳이 모두 배정되어야 의제 폐기를 시작할 수 있습니다.`,
      409,
    );
  }

  return transitionFromHouseSelectToDiscard(state, draftOrder, now);
}

export function endSession(state: GameState, now = new Date().toISOString()): GameState {
  if (state.phase !== "complete") {
    throw new AgendaStateError("모든 가문이 비밀 의제를 선택한 뒤 라운드를 종료할 수 있습니다.", 409);
  }

  const draftOrder = sortHouseIdsForDraft(getClaimedHouseIds(state), state.inventories);

  if (draftOrder.length < REQUIRED_HOUSE_COUNT) {
    throw new AgendaStateError("참여 가문 5개가 유지되어야 다음 라운드를 준비할 수 있습니다.", 409);
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
    adminHouseId: null,
    neutralPowerPool: createDefaultNeutralPowerPool(now),
    sessionEndCause: "",
    sessionEndRewardsAppliedAt: "",
    sessionEndRewardsAppliedBy: null,
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
  const currentProgress = getHouseProgress(state, houseId);
  const progressCandidate = progress && typeof progress === "object" ? (progress as Record<string, unknown>) : {};
  const hasAlignmentRewards = Boolean(
    progressCandidate.alignmentRewards && typeof progressCandidate.alignmentRewards === "object",
  );
  const progressWithRewards =
    hasAlignmentRewards
      ? progressCandidate
      : {
          ...progressCandidate,
          alignmentRewards: currentProgress.alignmentRewards,
        };
  const progressWithServerManagedFields = {
    ...progressWithRewards,
    alignmentOrder: currentProgress.alignmentOrder,
  };

  return {
    ...state,
    progress: {
      ...state.progress,
      [houseId]: {
        ...sanitizeHouseProgress(progressWithServerManagedFields, now),
        updatedAt: now,
      },
    },
    version: state.version + 1,
    updatedAt: now,
  };
}

export function saveAlignmentOrder(
  state: GameState,
  houseId: HouseId,
  order: unknown,
  now = new Date().toISOString(),
): GameState {
  const currentProgress = getHouseProgress(state, houseId);
  const nextProgress = sanitizeHouseProgress(
    {
      ...currentProgress,
      alignmentOrder: order,
      updatedAt: now,
    },
    now,
  );

  return {
    ...state,
    progress: {
      ...state.progress,
      [houseId]: nextProgress,
    },
    version: state.version + 1,
    updatedAt: now,
  };
}

export function saveAlignmentReward(
  state: GameState,
  houseId: HouseId,
  agendaId: unknown,
  reward: unknown,
  now = new Date().toISOString(),
): GameState {
  const agenda = typeof agendaId === "string" ? AGENDA_BY_ID.get(agendaId) : null;

  if (!agenda) {
    throw new AgendaStateError("성향을 선택하세요.", 400);
  }

  const currentProgress = getHouseProgress(state, houseId);
  const nextProgress = sanitizeHouseProgress(
    {
      ...currentProgress,
      alignmentRewards: {
        ...currentProgress.alignmentRewards,
        [agenda.id]: reward,
      },
      updatedAt: now,
    },
    now,
  );

  return {
    ...state,
    progress: {
      ...state.progress,
      [houseId]: nextProgress,
    },
    version: state.version + 1,
    updatedAt: now,
  };
}

export function saveBoardProcessingItem(
  state: GameState,
  houseId: HouseId,
  input: unknown,
  itemId = crypto.randomUUID(),
  now = new Date().toISOString(),
): GameState {
  assertCanMutateBoardProcessing(state, houseId);

  const existingItems = sanitizeBoardProcessingItems(state.boardProcessingItems, now);
  const candidate = input && typeof input === "object" ? (input as Partial<BoardProcessingItem>) : {};
  const requestedId = sanitizeSingleLineText(candidate.id, BOARD_PROCESSING_ID_LIMIT);
  const id = requestedId || sanitizeSingleLineText(itemId, BOARD_PROCESSING_ID_LIMIT) || crypto.randomUUID();
  const existing = existingItems.find((item) => item.id === id);
  const item = sanitizeBoardProcessingItem(
    {
      ...candidate,
      id,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      createdBy: existing?.createdBy || houseId,
      createdByName: existing?.createdByName || getHouseLabel(state, houseId),
    },
    now,
  );

  if (!item) {
    throw new AgendaStateError("구성물 정리 유형을 선택하세요.", 400);
  }

  const nextItems = existing
    ? existingItems.map((current) => (current.id === id ? item : current))
    : [...existingItems, item];

  return {
    ...state,
    boardProcessingItems: nextItems,
    version: state.version + 1,
    updatedAt: now,
  };
}

export function deleteBoardProcessingItem(
  state: GameState,
  houseId: HouseId,
  itemId: unknown,
  now = new Date().toISOString(),
): GameState {
  assertCanMutateBoardProcessing(state, houseId);

  const id = sanitizeSingleLineText(itemId, BOARD_PROCESSING_ID_LIMIT);
  const existingItems = sanitizeBoardProcessingItems(state.boardProcessingItems, now);

  if (!id || !existingItems.some((item) => item.id === id)) {
    throw new AgendaStateError("삭제할 구성물 정리 기록을 찾을 수 없습니다.", 404);
  }

  return {
    ...state,
    boardProcessingItems: existingItems.filter((item) => item.id !== id),
    version: state.version + 1,
    updatedAt: now,
  };
}

/** 찬성/반대 권력 합이 동점일 때 중재자만 결과(찬성/반대)를 확정합니다. 집계 기록(apply) 이후에만 호출됩니다. */
export function setRandomDiscardEnabled(
  state: GameState,
  enabled: unknown,
  now = new Date().toISOString(),
): GameState {
  if (typeof enabled !== "boolean") {
    throw new AgendaStateError("무작위 폐기 설정값이 올바르지 않습니다.");
  }

  if (!canChangeRandomDiscardSetting(state)) {
    throw new AgendaStateError("비밀 의제 폐기 설정은 폐기 절차가 시작되기 전까지만 바꿀 수 있습니다.", 409);
  }

  if (state.randomDiscardEnabled === enabled) {
    return state;
  }

  return {
    ...state,
    randomDiscardEnabled: enabled,
    version: state.version + 1,
    updatedAt: now,
  };
}

function canChangeRandomDiscardSetting(state: GameState) {
  return state.phase === "house-select" || (state.phase === "discard" && !state.discarded && Object.keys(state.choices).length === 0);
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

export function applySessionEndRewards(
  state: GameState,
  houseId: HouseId,
  boardPositions: unknown,
  causeValue: unknown,
  now = new Date().toISOString(),
): GameState {
  if (state.sessionEndRewardsAppliedAt) {
    throw new AgendaStateError("이번 라운드의 명망·갈망 및 성향 보상은 이미 적용되었습니다.", 409);
  }

  const cause = sanitizeSessionEndCause(causeValue);
  const scoring = calculateFinalScores(state, boardPositions, now);
  const lastRank = Math.max(...scoring.rows.map((row) => row.ranks.total));
  const nextInventories = { ...state.inventories };
  const nextProgress = { ...state.progress };

  for (const row of scoring.rows) {
    const reward = getSessionEndReward(cause, row.ranks.total, row.ranks.total === lastRank);
    const inventory = getPlayerInventory(state, row.houseId);
    nextInventories[row.houseId] = {
      ...inventory,
      prestige: clampCounterValue(inventory.prestige + reward.prestige, PERSONAL_COUNTER_LIMITS.prestige),
      crave: clampCounterValue(inventory.crave + reward.crave, PERSONAL_COUNTER_LIMITS.crave),
      updatedAt: now,
    };

    const agendaId = state.choices[row.houseId];
    if (agendaId && AGENDA_BY_ID.has(agendaId)) {
      const progress = getHouseProgress(state, row.houseId);
      const currentMarks = progress.alignmentAchievements[agendaId] || 0;
      nextProgress[row.houseId] = {
        ...progress,
        alignmentAchievements: {
          ...progress.alignmentAchievements,
          [agendaId]:
            currentMarks >= HOUSE_ALIGNMENT_MARK_MAX
              ? currentMarks
              : clampCounterValue(currentMarks + 1, HOUSE_ALIGNMENT_MARK_MAX),
        },
        updatedAt: now,
      };
    }
  }

  return {
    ...state,
    inventories: nextInventories,
    progress: nextProgress,
    sessionEndCause: cause,
    sessionEndRewardsAppliedAt: now,
    sessionEndRewardsAppliedBy: houseId,
    version: state.version + 1,
    updatedAt: now,
  };
}

export function applyDiscard(
  state: GameState,
  houseId: HouseId,
  agendaId: string | null = null,
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
  const discardIndex = getDiscardIndex(state, agendaId, rng);
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

function getDiscardIndex(state: GameState, agendaId: string | null, rng: () => number) {
  if (state.randomDiscardEnabled) {
    return Math.min(Math.floor(rng() * state.pool.length), state.pool.length - 1);
  }

  if (!agendaId) {
    throw new AgendaStateError("폐기할 비밀 의제를 선택하세요.");
  }

  const discardIndex = state.pool.indexOf(agendaId);

  if (discardIndex < 0) {
    throw new AgendaStateError("선택한 비밀 의제를 폐기할 수 없습니다.");
  }

  return discardIndex;
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
  const adminHouseId = getAdminHouseId(state);
  const isAdmin = Boolean(houseId && adminHouseId === houseId);
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
      hasSession: Boolean(state.sessions[id]),
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
    claimedHouseCount: getActiveSessionHouseIds(state).length,
    requiredHouseCount: REQUIRED_HOUSE_COUNT,
    remainingHiddenCount: state.pool.length,
    discardedHiddenCount: state.discarded ? 1 : 0,
    randomDiscardEnabled: state.randomDiscardEnabled,
    neutralPowerPool: state.neutralPowerPool,
    sessionEndCause: state.sessionEndCause,
    sessionEndRewardsAppliedAt: state.sessionEndRewardsAppliedAt,
    sessionEndRewardsAppliedBy: state.sessionEndRewardsAppliedBy,
    currentPlayer: houseId,
    currentHouseId: houseId,
    adminHouseId,
    adminHouseName: adminHouseId ? getHouseLabel(state, adminHouseId) : "",
    isAdmin,
    isCurrentTurn,
    canDiscard,
    canChoose,
    ownChoice: ownChoiceId ? getAgenda(ownChoiceId) : null,
    ownInventory: houseId ? getPlayerInventory(state, houseId) : null,
    ownHouseProgress: houseId ? getHouseProgress(state, houseId) : null,
    boardProcessingOwnerHouseId: state.boardProcessingOwnerHouseId,
    boardProcessingOwnerName: state.boardProcessingOwnerHouseId
      ? getHouseLabel(state, state.boardProcessingOwnerHouseId)
      : "",
    isBoardProcessingOwner: Boolean(houseId && state.boardProcessingOwnerHouseId === houseId),
    boardProcessingItems: state.boardProcessingItems,
    boardProcessingHistory: groupBoardProcessingItemsByType(state.boardProcessingItems),
  };

  if (canChoose || (canDiscard && !state.randomDiscardEnabled)) {
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

function sanitizeRoleHouseId(value: unknown, activeHouseIds: HouseId[]): HouseId | null {
  return isHouseId(value) && activeHouseIds.includes(value) ? value : null;
}

function getLoggedInHouseIds(state: GameState): HouseId[] {
  return getLoggedInHouseIdsFromMaps(state.credentials, state.sessions);
}

export function getActiveSessionHouseIds(state: GameState): HouseId[] {
  return getLoggedInHouseIds(state);
}

function getLoggedInHouseIdsFromMaps(
  credentials: Record<string, SeatCredential>,
  sessions: Record<string, AgendaSession>,
): HouseId[] {
  const seatOrder = new Map(sortHouseIdsByNumber(Object.keys(sessions)).map((houseId, index) => [houseId, index]));

  return Object.keys(sessions)
    .filter((houseId): houseId is HouseId => isHouseId(houseId) && Boolean(credentials[houseId]))
    .sort((left, right) => {
      const leftTime = Date.parse(sessions[left]?.createdAt || "");
      const rightTime = Date.parse(sessions[right]?.createdAt || "");
      const leftOrder = Number.isFinite(leftTime) ? leftTime : 0;
      const rightOrder = Number.isFinite(rightTime) ? rightTime : 0;

      return leftOrder - rightOrder || (seatOrder.get(left) ?? 0) - (seatOrder.get(right) ?? 0);
    })
    .slice(0, REQUIRED_HOUSE_COUNT);
}

function sanitizeDraftOrder(
  value: unknown,
  activeHouseIds: HouseId[],
  inventories: Record<string, PlayerInventory>,
  recomputeStoredOrder = false,
): HouseId[] {
  const activeHouseSet = new Set(activeHouseIds);

  if (!recomputeStoredOrder && Array.isArray(value) && value.length === activeHouseIds.length) {
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

function shouldMigrateUnpickedDraftOrder(version: number, choices: unknown) {
  return version < STATE_VERSION && (!choices || typeof choices !== "object" || Object.keys(choices).length === 0);
}

function sortHouseIdsForDraft(
  houseIds: HouseId[],
  inventories: Record<string, PlayerInventory>,
): HouseId[] {
  return [...houseIds].sort((left, right) => {
    const leftPrestige = inventories[left]?.prestige ?? 0;
    const rightPrestige = inventories[right]?.prestige ?? 0;

    return leftPrestige - rightPrestige || compareHouseIdsByNumberAscending(left, right);
  });
}

function compareHouseIdsByNumberAscending(left: HouseId, right: HouseId) {
  const leftNumber = getHouseById(left)?.number ?? Number.MAX_SAFE_INTEGER;
  const rightNumber = getHouseById(right)?.number ?? Number.MAX_SAFE_INTEGER;

  return leftNumber - rightNumber || left.localeCompare(right);
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
  const entries = Object.entries(value as Record<string, unknown>).filter(
    (entry): entry is [string, string] => {
      const houseId = entry[0];
      const agendaId = entry[1];
      if (!draftHouses.has(houseId) || typeof agendaId !== "string" || !AGENDA_BY_ID.has(agendaId)) {
        return false;
      }

      if (usedAgendas.has(agendaId)) {
        return false;
      }

      usedAgendas.add(agendaId);
      return true;
    },
  );

  return Object.fromEntries(entries);
}

function sanitizeCredentials(value: unknown): Record<string, SeatCredential> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>).filter(
    (entry): entry is [string, SeatCredential] => {
      const houseId = entry[0];
      const credential = entry[1];
      return (
        isHouseId(houseId) &&
        Boolean(credential) &&
        typeof credential === "object" &&
        typeof (credential as SeatCredential).salt === "string" &&
        typeof (credential as SeatCredential).hash === "string" &&
        Number.isInteger((credential as SeatCredential).iterations) &&
        (credential as SeatCredential).iterations > 0 &&
        typeof (credential as SeatCredential).createdAt === "string"
      );
    },
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

function sanitizeNeutralPowerPool(value: unknown, now: string): NeutralPowerPool {
  const candidate = value && typeof value === "object" ? (value as Partial<NeutralPowerPool>) : {};

  return {
    powerTokens: sanitizeCounter(candidate.powerTokens, NEUTRAL_POWER_POOL_LIMIT, NEUTRAL_POWER_POOL_DEFAULT),
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
  };
}

function sanitizeRoundEndTrigger(value: unknown): RoundEndTrigger {
  return value === "none" || value === "king_death" || value === "abdication_top" || value === "abdication_bottom"
    ? value
    : "";
}

function sanitizeBoardProcessingItems(value: unknown, now: string): BoardProcessingItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const items: BoardProcessingItem[] = [];

  for (const entry of value) {
    const item = sanitizeBoardProcessingItem(entry, now);

    if (!item || seen.has(item.id)) {
      continue;
    }

    seen.add(item.id);
    items.push(item);
  }

  return items;
}

function sanitizeBoardProcessingItem(value: unknown, now: string): BoardProcessingItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<BoardProcessingItem>;
  const type = sanitizeBoardProcessingType(candidate.type);
  const id = sanitizeSingleLineText(candidate.id, BOARD_PROCESSING_ID_LIMIT);

  if (!type || !id) {
    return null;
  }

  const base: BoardProcessingItem = {
    id,
    type,
    note: sanitizeMultilineText(candidate.note, BOARD_PROCESSING_NOTE_LIMIT),
    createdAt: typeof candidate.createdAt === "string" && candidate.createdAt ? candidate.createdAt : now,
    updatedAt: typeof candidate.updatedAt === "string" && candidate.updatedAt ? candidate.updatedAt : now,
    createdBy: isHouseId(candidate.createdBy) ? candidate.createdBy : null,
    createdByName: sanitizeSingleLineText(candidate.createdByName, BOARD_PROCESSING_HOUSE_NAME_LIMIT),
    photos: sanitizeRecordAttachments(candidate.photos, now),
  };

  if (type === "chronicle") {
    base.resourceId = isPersonalResourceId(candidate.resourceId) ? candidate.resourceId : PERSONAL_RESOURCE_TRACKS[0].id;
    base.polarity = sanitizeBoardProcessingPolarity(candidate.polarity) || "positive";
    base.stickerCode = sanitizeSingleLineText(candidate.stickerCode, BOARD_PROCESSING_CODE_LIMIT);
    if (isHouseId(candidate.signedByHouseId)) {
      base.signedByHouseId = candidate.signedByHouseId;
      base.signedByName = sanitizeSingleLineText(candidate.signedByName, BOARD_PROCESSING_HOUSE_NAME_LIMIT);
    }
  } else if (type === "envelope") {
    base.envelopeCode = sanitizeSingleLineText(candidate.envelopeCode, BOARD_PROCESSING_CODE_LIMIT);
  } else if (type === "story" || type === "event") {
    base.cardCode = sanitizeSingleLineText(candidate.cardCode, BOARD_PROCESSING_CODE_LIMIT);
    base.status = sanitizeCampaignCardStatus(candidate.status);
    if (type === "story") {
      if (isHouseId(candidate.signedByHouseId)) {
        base.signedByHouseId = candidate.signedByHouseId;
        base.signedByName = sanitizeSingleLineText(candidate.signedByName, BOARD_PROCESSING_HOUSE_NAME_LIMIT);
      }
      base.signerBonusText = sanitizeMultilineText(candidate.signerBonusText, BOARD_PROCESSING_NOTE_LIMIT);
    }
  } else if (type === "mystery") {
    base.dossierLetter = sanitizeDossierLetter(candidate.dossierLetter);
    base.storylineSymbol = sanitizeSingleLineText(candidate.storylineSymbol, BOARD_PROCESSING_CODE_LIMIT);
    base.slotKey = sanitizeSingleLineText(candidate.slotKey, BOARD_PROCESSING_SLOT_LIMIT);
  } else if (type === "note") {
    base.text = sanitizeMultilineText(candidate.text, BOARD_PROCESSING_NOTE_LIMIT);
  }

  return base;
}

export function groupBoardProcessingItemsByType(items: BoardProcessingItem[]): BoardProcessingHistory {
  const grouped = Object.fromEntries(BOARD_PROCESSING_TYPES.map((type) => [type, []])) as unknown as BoardProcessingHistory;

  for (const item of items) {
    grouped[item.type].push(item);
  }

  return grouped;
}

function sanitizeBoardProcessingPolarity(value: unknown): BoardProcessingPolarity | "" {
  return value === "positive" || value === "negative" ? value : "";
}

function sanitizeBoardProcessingType(value: unknown): BoardProcessingItemType | "" {
  return BOARD_PROCESSING_TYPES.includes(value as BoardProcessingItemType)
    ? (value as BoardProcessingItemType)
    : "";
}

function assertCanMutateBoardProcessing(state: GameState, houseId: HouseId) {
  if (!getClaimedHouseIds(state).includes(houseId)) {
    throw new AgendaStateError("참여 가문만 구성물 정리 기록을 수정할 수 있습니다.", 403);
  }

  if (!isAdminHouse(state, houseId)) {
    throw new AgendaStateError("구성물 정리 기록은 관리자만 저장하거나 삭제할 수 있습니다.", 403);
  }
}

function sanitizeCampaignCardStatus(value: unknown): CampaignCardStatus {
  return value === "completed" || value === "archived" ? value : "active";
}

function sanitizeDossierLetter(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const normalized = value.trim().toUpperCase();
  return /^[A-L]$/.test(normalized) ? normalized : "";
}

function sanitizeRecordAttachments(value: unknown, now: string): RecordAttachment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const photos: RecordAttachment[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const candidate = item as Partial<RecordAttachment>;
    const id = sanitizeSingleLineText(candidate.id, BOARD_PROCESSING_ID_LIMIT);
    const mimeType = typeof candidate.mimeType === "string" ? candidate.mimeType : "";
    const dataUrl = typeof candidate.dataUrl === "string" ? candidate.dataUrl : "";

    if (
      !id ||
      seen.has(id) ||
      !RECORD_ATTACHMENT_MIME_TYPES.has(mimeType) ||
      !isValidRecordAttachmentDataUrl(dataUrl, mimeType) ||
      dataUrl.length > RECORD_ATTACHMENT_DATA_URL_LIMIT
    ) {
      continue;
    }

    seen.add(id);
    photos.push({
      id,
      name: sanitizeSingleLineText(candidate.name, RECORD_ATTACHMENT_NAME_LIMIT) || "기록 사진",
      mimeType,
      dataUrl,
      createdAt: typeof candidate.createdAt === "string" && candidate.createdAt ? candidate.createdAt : now,
    });

    if (photos.length >= RECORD_ATTACHMENT_LIMIT) {
      break;
    }
  }

  return photos;
}

function sanitizeSessionEndCause(value: unknown): SessionEndCause {
  if (value === "king_death" || value === "abdication_top" || value === "abdication_bottom") {
    return value;
  }

  throw new AgendaStateError("왕의 서거/안정도 상단 퇴위/안정도 하단 퇴위 중 종료 사유를 선택하세요.", 400);
}

function getSessionEndReward(cause: SessionEndCause, rank: number, isLast: boolean): SessionEndReward {
  const rewards = SESSION_END_REWARDS[cause];

  if (isLast) {
    return rewards.last;
  }

  return rewards.ranks[rank] || { prestige: 0, crave: 0 };
}

function clampCounterValue(value: unknown, max: number) {
  const number = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, Math.min(max, Math.trunc(number)));
}

function isValidRecordAttachmentDataUrl(value: string, mimeType: string) {
  const escapedMimeType = mimeType.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^data:${escapedMimeType};base64,[A-Za-z0-9+/=]+$`).test(value);
}

function sanitizeSingleLineText(value: unknown, limit: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ").slice(0, limit);
}

function sanitizeMultilineText(value: unknown, limit: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\r\n?/g, "\n").trim().slice(0, limit);
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
  const alignmentRewards =
    candidate.alignmentRewards && typeof candidate.alignmentRewards === "object"
      ? (candidate.alignmentRewards as Record<string, unknown>)
      : {};
  const houseAchievements = Array.isArray(candidate.houseAchievements) ? candidate.houseAchievements : [];
  const houseAchievementComplete = Array.isArray(candidate.houseAchievementComplete)
    ? candidate.houseAchievementComplete
    : [];
  const narrativeAchievementDetail = sanitizeNarrativeAchievementDetail(candidate.narrativeAchievementDetail);
  const narrativeAchievementCount = sanitizeCounter(
    candidate.narrativeAchievementCount,
    narrativeAchievementDetail.requiredCount,
    candidate.narrativeAchievement === true
      ? narrativeAchievementDetail.requiredCount
      : defaults.narrativeAchievementCount,
  );
  const houseAchievementDetails = Array.isArray(candidate.houseAchievementDetails)
    ? candidate.houseAchievementDetails.map((item) =>
        sanitizeAchievementDetail(item, HOUSE_ACHIEVEMENT_MARK_MAX),
      )
    : [];
  const normalizedHouseAchievementDetails = Array.from({ length: HOUSE_ACHIEVEMENT_COUNT }, (_, index) =>
    houseAchievementDetails[index] || defaults.houseAchievementDetails[index],
  );

  return {
    openAgendaTokens: {
      positive: sanitizeOpenAgendaTokens(openAgendaTokens.positive),
      negative: sanitizeOpenAgendaTokens(openAgendaTokens.negative),
    },
    narrativeAchievement:
      narrativeAchievementCount >= narrativeAchievementDetail.requiredCount ||
      (narrativeAchievementDetail.requiredCount <= 1 && candidate.narrativeAchievement === true),
    narrativeAchievementCount,
    narrativeAchievementDetail,
    houseAchievements: Array.from({ length: HOUSE_ACHIEVEMENT_COUNT }, (_, index) =>
      sanitizeCounter(
        houseAchievements[index],
        normalizedHouseAchievementDetails[index].requiredCount,
        defaults.houseAchievements[index],
      ),
    ),
    houseAchievementComplete: Array.from({ length: HOUSE_ACHIEVEMENT_COUNT }, (_, index) =>
      houseAchievementComplete[index] === true,
    ),
    houseAchievementDetails: normalizedHouseAchievementDetails,
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
    alignmentRewards: Object.fromEntries(
      AGENDAS.map((agenda) => [
        agenda.id,
        sanitizeAlignmentReward(
          alignmentRewards[agenda.id] ?? alignmentRewards[agenda.englishName],
          defaults.alignmentRewards[agenda.id],
        ),
      ]),
    ),
    alignmentOrder: sanitizeAlignmentOrder(candidate.alignmentOrder),
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
  };
}

function sanitizeAlignmentOrder(_value: unknown) {
  return getDefaultAlignmentOrder();
}

function sanitizeAlignmentReward(value: unknown, fallback: AlignmentReward): AlignmentReward {
  const candidate = value && typeof value === "object" ? (value as Partial<AlignmentReward>) : {};
  const crownType = candidate.crownType === "prestige" || candidate.crownType === "crave" ? candidate.crownType : "";
  const count = sanitizeCounter(candidate.count, HOUSE_ALIGNMENT_REWARD_COUNT_MAX, fallback.count);

  return {
    crownType: count > 0 ? crownType : "",
    count: crownType ? count : 0,
  };
}

function sanitizeAchievementDetail(value: unknown, fallbackRequiredCount: number): AchievementDetail {
  const candidate = value && typeof value === "object" ? (value as Partial<AchievementDetail>) : {};
  const hasEffectEntries = Array.isArray(candidate.effectEntries);
  const legacyEffectText = sanitizeMultilineText(candidate.effectText, ACHIEVEMENT_DETAIL_TEXT_LIMIT);
  const effectEntries = sanitizeAchievementEffectEntries(
    candidate.effectEntries,
    candidate.effects,
    legacyEffectText,
    candidate.effectIcon,
    candidate.effectAmount,
  );
  const effects = sanitizeAchievementEffectsFromEntries(effectEntries);
  const primaryEffect = effects[0] || { icon: "", amount: 0 };

  return {
    conditionText: sanitizeMultilineText(candidate.conditionText, ACHIEVEMENT_DETAIL_TEXT_LIMIT),
    requiredCount: sanitizeAchievementRequiredCount(candidate.requiredCount, fallbackRequiredCount),
    effectEntries,
    effects,
    effectIcon: primaryEffect.icon,
    effectAmount: primaryEffect.amount,
    effectText: hasEffectEntries ? formatAchievementEffectEntriesText(effectEntries) : legacyEffectText,
  };
}

function sanitizeNarrativeAchievementDetail(value: unknown): AchievementDetail {
  return {
    ...sanitizeAchievementDetail(value, 1),
    requiredCount: 1,
  };
}

function sanitizeAchievementEffectEntries(
  value: unknown,
  legacyEffects: unknown,
  legacyText: unknown,
  legacyIcon: unknown,
  legacyAmount: unknown,
): AchievementEffectEntry[] {
  if (Array.isArray(value)) {
    const entries: AchievementEffectEntry[] = [];

    for (const item of value) {
      if (entries.length >= ACHIEVEMENT_EFFECT_ENTRY_LIMIT) {
        break;
      }

      const candidate =
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : typeof item === "string"
            ? { text: item }
            : {};
      const icon = sanitizeAchievementEffectIcon(candidate.icon ?? candidate.effectIcon);
      const amount = sanitizeAchievementEffectAmount(candidate.amount ?? candidate.effectAmount, icon);
      const text = sanitizeMultilineText(
        candidate.text ?? candidate.memoText ?? candidate.effectText,
        ACHIEVEMENT_DETAIL_TEXT_LIMIT,
      );

      if (!icon && !text) {
        continue;
      }

      entries.push({ icon, amount, text });
    }

    return entries;
  }

  const text = sanitizeMultilineText(legacyText, ACHIEVEMENT_DETAIL_TEXT_LIMIT);
  const effects = sanitizeAchievementEffects(legacyEffects, legacyIcon, legacyAmount);

  if (effects.length) {
    return effects.slice(0, ACHIEVEMENT_EFFECT_ENTRY_LIMIT).map((effect, index) => ({
      icon: effect.icon,
      amount: effect.amount,
      text: index === 0 ? text : "",
    }));
  }

  return text ? [{ icon: "", amount: 0, text }] : [];
}

function sanitizeAchievementEffectsFromEntries(entries: AchievementEffectEntry[]): AchievementEffect[] {
  const seen = new Set<string>();
  const effects: AchievementEffect[] = [];

  for (const entry of entries) {
    const icon = sanitizeAchievementEffectIcon(entry.icon);

    if (!icon || seen.has(icon)) {
      continue;
    }

    seen.add(icon);
    effects.push({
      icon,
      amount: sanitizeAchievementEffectAmount(entry.amount, icon),
    });
  }

  return effects;
}

function formatAchievementEffectEntriesText(entries: AchievementEffectEntry[]) {
  return entries.map((entry) => entry.text).filter(Boolean).join(" · ").slice(0, ACHIEVEMENT_DETAIL_TEXT_LIMIT);
}

function sanitizeAchievementEffects(value: unknown, legacyIcon: unknown, legacyAmount: unknown): AchievementEffect[] {
  const candidates =
    Array.isArray(value) && value.length > 0
      ? value
      : typeof legacyIcon === "string" && legacyIcon
        ? [{ icon: legacyIcon, amount: legacyAmount }]
        : [];
  const seen = new Set<string>();
  const effects: AchievementEffect[] = [];

  for (const item of candidates) {
    const candidate =
      typeof item === "string"
        ? { icon: item }
        : item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : {};
    const icon = sanitizeAchievementEffectIcon(candidate.icon ?? candidate.effectIcon);

    if (!icon || seen.has(icon)) {
      continue;
    }

    seen.add(icon);
    effects.push({
      icon,
      amount: sanitizeAchievementEffectAmount(candidate.amount ?? candidate.effectAmount, icon),
    });
  }

  return effects;
}

function sanitizeAchievementEffectIcon(value: unknown) {
  return typeof value === "string" && ACHIEVEMENT_EFFECT_ICONS.has(value) ? value : "";
}

function sanitizeAchievementEffectAmount(value: unknown, effectIcon: string) {
  if (!ACHIEVEMENT_EFFECT_AMOUNT_ICONS.has(effectIcon)) {
    return 0;
  }

  return sanitizeCounter(value, ACHIEVEMENT_EFFECT_AMOUNT_MAX, 0);
}

function sanitizeAchievementRequiredCount(value: unknown, fallback: number) {
  const number = typeof value === "number" ? value : Number(value);
  const fallbackValue = Math.max(1, Math.min(HOUSE_ACHIEVEMENT_MARK_MAX, Math.trunc(fallback)));

  if (!Number.isFinite(number)) {
    return fallbackValue;
  }

  return Math.max(1, Math.min(HOUSE_ACHIEVEMENT_MARK_MAX, Math.trunc(number)));
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
  now = new Date().toISOString(),
): Record<string, AgendaSession> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const nowMs = Date.parse(now);
  const entries = Object.entries(value as Record<string, unknown>)
    .map(([houseId, session]): [string, AgendaSession] | null => {
      if (
        !isHouseId(houseId) ||
        !credentials[houseId] ||
        !session ||
        typeof session !== "object" ||
        typeof (session as { token?: unknown }).token !== "string" ||
        typeof (session as { createdAt?: unknown }).createdAt !== "string"
      ) {
        return null;
      }

      const createdAt = (session as { createdAt: string }).createdAt;
      const updatedAt =
        typeof (session as { updatedAt?: unknown }).updatedAt === "string"
          ? (session as { updatedAt: string }).updatedAt
          : createdAt;
      const updatedAtMs = Date.parse(updatedAt);

      if (
        Number.isFinite(nowMs) &&
        Number.isFinite(updatedAtMs) &&
        nowMs - updatedAtMs > PLAYER_SESSION_TIMEOUT_MS
      ) {
        return null;
      }

      return [houseId, { token: (session as { token: string }).token, createdAt, updatedAt }];
    })
    .filter((entry): entry is [string, AgendaSession] => Boolean(entry));

  return Object.fromEntries(entries);
}
