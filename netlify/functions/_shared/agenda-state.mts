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
export type DilemmaResourceDeltas = Partial<Record<PersonalResourceId, number>>;
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

export type DilemmaVoteSide = "" | "aye" | "nay";
export type DilemmaBallotSide = "" | "aye" | "nay" | "pass";

export type DilemmaOutcome = {
  preview: string;
  result: string;
  resourceDeltas: DilemmaResourceDeltas;
};

export type DilemmaVote = {
  side: DilemmaBallotSide;
  powerTokens: number;
  updatedAt: string;
  updatedByName: string;
};

export type DilemmaPhoto = {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  size: number;
  addedAt: string;
  addedBy: HouseId | null;
  addedByName: string;
};

export type DilemmaEditLock = {
  houseId: HouseId;
  houseName: string;
  token: string;
  acquiredAt: string;
  updatedAt: string;
  expiresAt: string;
};

export type RedactedDilemmaEditLock = Omit<DilemmaEditLock, "token">;

export type DilemmaRecord = {
  historyId: string;
  cardCode: string;
  title: string;
  timeCounterSlot: string;
  context: string;
  question: string;
  councilNotes: string;
  aye: DilemmaOutcome;
  nay: DilemmaOutcome;
  selectedOutcome: DilemmaVoteSide;
  voteNotes: string;
  resolutionNotes: string;
  votes: Partial<Record<HouseId, DilemmaVote>>;
  photos: DilemmaPhoto[];
  updatedAt: string;
  updatedBy: HouseId | null;
  updatedByName: string;
  editLock: DilemmaEditLock | null;
};

export type DilemmaHistoryEntry = Omit<DilemmaRecord, "editLock"> & {
  savedAt: string;
  savedBy: HouseId | null;
  savedByName: string;
};

export type RedactedDilemmaRecord = Omit<DilemmaRecord, "editLock"> & {
  editLock: RedactedDilemmaEditLock | null;
};

export type GameState = {
  version: number;
  phase: Phase;
  turn: HouseId | null;
  draftOrder: HouseId[];
  pool: string[];
  discarded: string | null;
  randomDiscardEnabled: boolean;
  choices: Record<string, string>;
  sessions: Record<string, { token: string; createdAt: string }>;
  credentials: Record<string, SeatCredential>;
  playerNames: Record<string, string>;
  inventories: Record<string, PlayerInventory>;
  progress: Record<string, HouseProgress>;
  dilemma: DilemmaRecord;
  dilemmaLeader: HouseId | null;
  dilemmaModerator: HouseId | null;
  dilemmaVoteOrder: HouseId[];
  dilemmaHistory: DilemmaHistoryEntry[];
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
  currentPlayer: HouseId | null;
  currentHouseId: HouseId | null;
  isCurrentTurn: boolean;
  canDiscard: boolean;
  canChoose: boolean;
  dilemmaVoteTurn: HouseId | null;
  canVoteDilemma: boolean;
  dilemmaLeader: HouseId | null;
  dilemmaModerator: HouseId | null;
  dilemmaVoteOrder: HouseId[];
  ownChoice: Agenda | null;
  ownInventory: PlayerInventory | null;
  ownHouseProgress: HouseProgress | null;
  dilemma: RedactedDilemmaRecord;
  dilemmaHistory: DilemmaHistoryEntry[];
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

export const PERSONAL_RESOURCE_TRACKS = [
  { id: "influence", label: "영향력" },
  { id: "wealth", label: "부" },
  { id: "morale", label: "사기" },
  { id: "welfare", label: "복지" },
  { id: "knowledge", label: "지식" },
] as const;

const AGENDA_BY_ID = new Map(AGENDAS.map((agenda) => [agenda.id, agenda]));
const STATE_VERSION = 9;
const PERSONAL_COUNTER_LIMITS = {
  coins: 99,
  powerTokens: 99,
  prestige: 100,
  crave: 50,
} as const;
const RESOURCE_POSITION_MAX = 17;
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
const DILEMMA_EDIT_LOCK_TTL_MS = 15 * 60 * 1000;
const DILEMMA_CODE_LIMIT = 32;
const DILEMMA_TITLE_LIMIT = 80;
const DILEMMA_SLOT_LIMIT = 24;
const DILEMMA_HOUSE_NAME_LIMIT = 32;
const DILEMMA_LONG_TEXT_LIMIT = 4_000;
const DILEMMA_HISTORY_ID_LIMIT = 64;
const DILEMMA_HISTORY_LIMIT = 80;
const DILEMMA_PHOTO_LIMIT = 3;
const DILEMMA_PHOTO_NAME_LIMIT = 80;
const DILEMMA_PHOTO_DATA_URL_LIMIT = 1_200_000;
const DILEMMA_PHOTO_ORIGINAL_SIZE_LIMIT = 8_000_000;
const DILEMMA_RESOURCE_DELTA_LIMIT = 9;
const DILEMMA_VOTE_POWER_LIMIT = PERSONAL_COUNTER_LIMITS.powerTokens;
const DILEMMA_PHOTO_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
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

export function createDefaultDilemmaRecord(now = new Date().toISOString()): DilemmaRecord {
  return {
    historyId: "",
    cardCode: "",
    title: "",
    timeCounterSlot: "",
    context: "",
    question: "",
    councilNotes: "",
    aye: createDefaultDilemmaOutcome(),
    nay: createDefaultDilemmaOutcome(),
    selectedOutcome: "",
    voteNotes: "",
    resolutionNotes: "",
    votes: {},
    photos: [],
    updatedAt: now,
    updatedBy: null,
    updatedByName: "",
    editLock: null,
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
    credentials: {},
    playerNames: {},
    inventories: {},
    progress: {},
    dilemma: createDefaultDilemmaRecord(now),
    dilemmaLeader: null,
    dilemmaModerator: null,
    dilemmaVoteOrder: [],
    dilemmaHistory: [],
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
  const sessions = sanitizeSessions(candidate.sessions, credentials);
  const inventories = sanitizeInventories(candidate.inventories, now);
  const progress = sanitizeProgress(candidate.progress, now);
  const activeHouseIds = getActiveHouseIds(credentials);
  const loggedInHouseIds = getLoggedInHouseIdsFromMaps(credentials, sessions);
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
  const dilemma = phase === "complete" ? sanitizeDilemmaRecord(candidate.dilemma, now) : createDefaultDilemmaRecord(now);
  const dilemmaLeader =
    phase === "complete"
      ? sanitizeRoleHouseId(candidate.dilemmaLeader, activeHouseIds)
      : null;
  const dilemmaModerator =
    phase === "complete"
      ? sanitizeRoleHouseId(candidate.dilemmaModerator, activeHouseIds)
      : null;
  const dilemmaVoteOrder = pickStoredDilemmaVoteOrder(candidate.dilemmaVoteOrder, loggedInHouseIds);
  const dilemmaHistory = sanitizeDilemmaHistory(candidate.dilemmaHistory, now);

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
    credentials,
    playerNames: sanitizePlayerNames(candidate.playerNames),
    inventories,
    progress,
    dilemma,
    dilemmaLeader,
    dilemmaModerator,
    dilemmaVoteOrder,
    dilemmaHistory,
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
  return AGENDAS.map((agenda) => agenda.id);
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
  const shouldClearDilemmaLock = state.dilemma.editLock?.houseId === houseId;

  if (!state.sessions[houseId] && !shouldClearDilemmaLock) {
    return state;
  }

  const sessions = { ...state.sessions };
  delete sessions[houseId];

  return {
    ...state,
    sessions,
    dilemma: shouldClearDilemmaLock ? { ...state.dilemma, editLock: null } : state.dilemma,
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
    dilemma: createDefaultDilemmaRecord(now),
    dilemmaLeader: null,
    dilemmaModerator: null,
    dilemmaVoteOrder: [],
    updatedAt: now,
  };
}

export function saveDilemmaVoteOrder(
  state: GameState,
  _houseId: HouseId,
  order: unknown,
  now = new Date().toISOString(),
): GameState {
  if (isDilemmaVoteOrderLocked(state, now)) {
    throw new AgendaStateError("딜레마 투표가 진행 중일 때는 투표 순서를 변경할 수 없습니다.", 409);
  }

  const activeHouseIds = getLoggedInHouseIds(state);

  if (activeHouseIds.length === 0) {
    throw new AgendaStateError("로그인 중인 가문이 있을 때 투표 순서를 설정할 수 있습니다.", 409);
  }

  const nextOrder = sanitizeDilemmaVoteOrder(order, activeHouseIds);

  if (nextOrder.length !== activeHouseIds.length) {
    throw new AgendaStateError("로그인 중인 가문을 모두 포함한 투표 순서를 저장하세요.", 400);
  }

  return {
    ...state,
    dilemmaVoteOrder: nextOrder,
    version: state.version + 1,
    updatedAt: now,
  };
}

export function saveDilemmaRoles(
  state: GameState,
  _houseId: HouseId,
  roles: unknown,
  now = new Date().toISOString(),
): GameState {
  assertCanEditDilemma(state);

  const currentDilemma = sanitizeDilemmaRecord(state.dilemma, now);

  if (currentDilemma.editLock || !isDilemmaRecordBlank(currentDilemma)) {
    throw new AgendaStateError("리더와 중재자는 딜레마 작성 전에만 지정할 수 있습니다.", 409);
  }

  const activeHouseIds = getLoggedInHouseIds(state);

  if (activeHouseIds.length === 0) {
    throw new AgendaStateError("로그인 중인 가문이 있을 때 리더와 중재자를 지정할 수 있습니다.", 409);
  }

  const candidate = roles && typeof roles === "object" ? (roles as Record<string, unknown>) : {};
  const leader = sanitizeRoleHouseId(candidate.leaderHouseId, activeHouseIds);
  const moderator = sanitizeRoleHouseId(candidate.moderatorHouseId, activeHouseIds);

  if (!leader || !moderator) {
    throw new AgendaStateError("리더와 중재자를 모두 선택하세요.", 400);
  }

  return {
    ...state,
    dilemmaLeader: leader,
    dilemmaModerator: moderator,
    version: state.version + 1,
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

export function beginDilemmaEdit(
  state: GameState,
  houseId: HouseId,
  token: string,
  now = new Date().toISOString(),
): GameState {
  assertCanEditDilemma(state);
  assertDilemmaRolesAssigned(state);

  if (!token) {
    throw new AgendaStateError("딜레마 편집 토큰을 만들 수 없습니다.");
  }

  const currentDilemma = sanitizeDilemmaRecord(state.dilemma, now);
  const activeLock = currentDilemma.editLock;

  if (activeLock && activeLock.houseId !== houseId) {
    throw new AgendaStateError(`${activeLock.houseName} 가문이 딜레마를 수정 중입니다.`, 409);
  }

  return {
    ...state,
    dilemma: {
      ...currentDilemma,
      editLock: createDilemmaEditLock(state, houseId, token, now, activeLock?.acquiredAt),
    },
    version: state.version + 1,
    updatedAt: now,
  };
}

export function cancelDilemmaEdit(
  state: GameState,
  houseId: HouseId,
  token: unknown,
  now = new Date().toISOString(),
): GameState {
  assertCanEditDilemma(state);

  const currentDilemma = sanitizeDilemmaRecord(state.dilemma, now);

  if (!currentDilemma.editLock) {
    return state;
  }

  assertDilemmaLockOwner(currentDilemma, houseId, token);

  return {
    ...state,
    dilemma: {
      ...currentDilemma,
      editLock: null,
    },
    version: state.version + 1,
    updatedAt: now,
  };
}

export function saveDilemmaRecord(
  state: GameState,
  houseId: HouseId,
  token: unknown,
  draft: unknown,
  historyId: unknown,
  now = new Date().toISOString(),
): GameState {
  assertCanEditDilemma(state);

  const currentDilemma = sanitizeDilemmaRecord(state.dilemma, now);
  assertDilemmaLockOwner(currentDilemma, houseId, token);
  const sanitizedDraft = sanitizeDilemmaRecord(draft, now);
  const nextHistoryId =
    currentDilemma.historyId || sanitizeSingleLineText(historyId, DILEMMA_HISTORY_ID_LIMIT);
  const votesComplete = areDilemmaVotesComplete(state, sanitizedDraft, now);

  if (!nextHistoryId) {
    throw new AgendaStateError("딜레마 이력 식별값을 만들 수 없습니다.");
  }

  if (!votesComplete && sanitizedDraft.selectedOutcome) {
    throw new AgendaStateError("로그인 중인 모든 가문이 투표한 뒤 결과를 선택할 수 있습니다.", 409);
  }

  if (!votesComplete && sanitizedDraft.resolutionNotes.trim()) {
    throw new AgendaStateError("로그인 중인 모든 가문이 투표한 뒤 해결 후속을 입력할 수 있습니다.", 409);
  }

  const nextDilemma: DilemmaRecord = {
    ...sanitizedDraft,
    historyId: nextHistoryId,
    photos: stampDilemmaPhotos(sanitizedDraft.photos, state, houseId, now),
    updatedAt: now,
    updatedBy: houseId,
    updatedByName: getHouseLabel(state, houseId),
    editLock: null,
  };

  return {
    ...state,
    dilemma: nextDilemma,
    version: state.version + 1,
    updatedAt: now,
  };
}

export function publishDilemmaRecord(
  state: GameState,
  houseId: HouseId,
  historyId: unknown,
  now = new Date().toISOString(),
): GameState {
  assertCanEditDilemma(state);

  const currentDilemma = sanitizeDilemmaRecord(state.dilemma, now);

  if (currentDilemma.editLock) {
    throw new AgendaStateError(`${currentDilemma.editLock.houseName} 가문이 딜레마를 수정 중입니다.`, 409);
  }

  if (isDilemmaRecordBlank(currentDilemma)) {
    throw new AgendaStateError("게시할 딜레마 기록이 없습니다.", 409);
  }

  assertDilemmaPublishReady(state, currentDilemma, now);

  const nextHistoryId =
    currentDilemma.historyId || sanitizeSingleLineText(historyId, DILEMMA_HISTORY_ID_LIMIT);

  if (!nextHistoryId) {
    throw new AgendaStateError("딜레마 이력 식별값을 만들 수 없습니다.");
  }

  const nextDilemma: DilemmaRecord = {
    ...currentDilemma,
    historyId: nextHistoryId,
    photos: stampDilemmaPhotos(currentDilemma.photos, state, houseId, now),
    editLock: null,
  };

  return {
    ...state,
    dilemma: createDefaultDilemmaRecord(now),
    dilemmaLeader: null,
    dilemmaModerator: null,
    dilemmaHistory: upsertDilemmaHistory(state.dilemmaHistory, nextDilemma, houseId, getHouseLabel(state, houseId), now),
    version: state.version + 1,
    updatedAt: now,
  };
}

export function deleteDilemmaHistoryEntry(
  state: GameState,
  houseId: HouseId,
  historyId: unknown,
  now = new Date().toISOString(),
): GameState {
  const normalizedHistory = sanitizeDilemmaHistory(state.dilemmaHistory, now);
  const targetHistoryId = sanitizeSingleLineText(historyId, DILEMMA_HISTORY_ID_LIMIT);
  const targetEntry = normalizedHistory.find((entry) => entry.historyId === targetHistoryId);

  if (!targetEntry) {
    throw new AgendaStateError("삭제할 딜레마 이력을 찾을 수 없습니다.", 404);
  }

  if (targetEntry.savedBy !== houseId) {
    throw new AgendaStateError("딜레마 이력을 게시한 가문만 삭제할 수 있습니다.", 403);
  }

  return {
    ...state,
    dilemmaHistory: normalizedHistory.filter((entry) => entry.historyId !== targetHistoryId),
    version: state.version + 1,
    updatedAt: now,
  };
}

export function saveDilemmaVote(
  state: GameState,
  houseId: HouseId,
  vote: unknown,
  now = new Date().toISOString(),
): GameState {
  const currentDilemma = getDilemmaForVoting(state, houseId, now);
  const participants = getDilemmaVotingParticipants(state);

  if (currentDilemma.selectedOutcome) {
    throw new AgendaStateError("이미 결과가 선택된 딜레마 투표입니다.", 409);
  }

  const currentVoteTurn = getCurrentDilemmaVoteTurn(state, now);

  if (!currentVoteTurn) {
    throw new AgendaStateError("로그인 중인 모든 가문이 투표했습니다. 결과와 후속 처리를 기록하세요.", 409);
  }

  if (currentVoteTurn !== houseId) {
    throw new AgendaStateError(`${getHouseLabel(state, currentVoteTurn)} 가문의 투표 차례입니다.`, 403);
  }

  const sanitizedVote = sanitizeIncomingDilemmaVote(vote, getPlayerInventory(state, houseId).powerTokens);

  return {
    ...state,
    dilemma: {
      ...currentDilemma,
      votes: {
        ...Object.fromEntries(Object.entries(currentDilemma.votes).filter(([id]) => participants.includes(id))),
        [houseId]: {
          ...sanitizedVote,
          updatedAt: now,
          updatedByName: getHouseLabel(state, houseId),
        },
      },
      updatedAt: now,
      updatedBy: houseId,
      updatedByName: getHouseLabel(state, houseId),
    },
    version: state.version + 1,
    updatedAt: now,
  };
}

export function applyDilemmaVotes(
  state: GameState,
  houseId: HouseId,
  now = new Date().toISOString(),
): GameState {
  const currentDilemma = getDilemmaForVoting(state, houseId, now);
  const participants = getDilemmaVotingParticipants(state);

  if (currentDilemma.selectedOutcome) {
    throw new AgendaStateError("이미 결과가 선택된 딜레마 투표입니다.", 409);
  }

  if (participants.length === 0) {
    throw new AgendaStateError("로그인 중인 가문이 있어야 딜레마 투표를 적용할 수 있습니다.", 409);
  }

  const votes = sanitizeDilemmaVotes(currentDilemma.votes, now);
  const missingHouse = participants.find((participantId) => !votes[participantId]?.side);

  if (missingHouse) {
    throw new AgendaStateError("로그인 중인 모든 가문이 찬성/반대/기권을 선택해야 적용할 수 있습니다.", 409);
  }

  for (const participantId of participants) {
    const playerVote = votes[participantId];

    if (!playerVote) {
      throw new AgendaStateError("딜레마 투표 내역을 확인할 수 없습니다.", 409);
    }

    const availablePower = getPlayerInventory(state, participantId).powerTokens;

    if (playerVote.side !== "pass" && playerVote.powerTokens < 1) {
      throw new AgendaStateError(`${getHouseLabel(state, participantId)} 가문은 찬성/반대에 권력 토큰을 1개 이상 걸어야 합니다.`, 409);
    }

    if (playerVote.powerTokens > availablePower) {
      throw new AgendaStateError(`${getHouseLabel(state, participantId)} 가문의 권력 토큰이 부족합니다.`, 409);
    }
  }

  const ayePower = sumDilemmaVotePower(votes, participants, "aye");
  const nayPower = sumDilemmaVotePower(votes, participants, "nay");

  const passCount = participants.filter((participantId) => votes[participantId]?.side === "pass").length;
  const voteNotes = `투표 집계: 찬성 ${ayePower} / 반대 ${nayPower} / 기권 ${passCount}. 결과 선택, 재화, 권력 토큰 처리는 가문 장부와 딜레마 편집에서 수기로 반영하세요.`;

  return {
    ...state,
    dilemma: {
      ...currentDilemma,
      votes: Object.fromEntries(participants.map((participantId) => [participantId, votes[participantId]])),
      voteNotes,
      updatedAt: now,
      updatedBy: houseId,
      updatedByName: getHouseLabel(state, houseId),
    },
    version: state.version + 1,
    updatedAt: now,
  };
}

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
  const defaultDilemmaRoles = isComplete
    ? deriveDefaultDilemmaRoles(getClaimedHouseIds({ ...state, choices: nextChoices }), state.inventories)
    : { leader: state.dilemmaLeader, moderator: state.dilemmaModerator };

  return {
    ...state,
    version: state.version + 1,
    phase: isComplete ? "complete" : "choose",
    turn: isComplete ? houseId : state.draftOrder[draftIndex + 1],
    pool: nextPool,
    choices: nextChoices,
    dilemmaLeader: isComplete ? null : defaultDilemmaRoles.leader,
    dilemmaModerator: isComplete ? null : defaultDilemmaRoles.moderator,
    updatedAt: now,
  };
}

export function redactState(state: GameState, houseId: HouseId | null): RedactedState {
  const ownChoiceId = houseId ? state.choices[houseId] : null;
  const isCurrentTurn = houseId !== null && state.turn === houseId;
  const canDiscard = isCurrentTurn && state.phase === "discard";
  const canChoose = isCurrentTurn && state.phase === "choose" && !ownChoiceId;
  const dilemmaVoteTurn = getCurrentDilemmaVoteTurn(state);
  const canVoteDilemma = houseId !== null && dilemmaVoteTurn === houseId;
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
    randomDiscardEnabled: state.randomDiscardEnabled,
    currentPlayer: houseId,
    currentHouseId: houseId,
    isCurrentTurn,
    canDiscard,
    canChoose,
    dilemmaVoteTurn,
    canVoteDilemma,
    dilemmaLeader: state.dilemmaLeader,
    dilemmaModerator: state.dilemmaModerator,
    dilemmaVoteOrder: pickStoredDilemmaVoteOrder(state.dilemmaVoteOrder, getLoggedInHouseIds(state)),
    ownChoice: ownChoiceId ? getAgenda(ownChoiceId) : null,
    ownInventory: houseId ? getPlayerInventory(state, houseId) : null,
    ownHouseProgress: houseId ? getHouseProgress(state, houseId) : null,
    dilemma: redactDilemmaRecord(state.dilemma),
    dilemmaHistory: state.dilemmaHistory,
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

function deriveDefaultDilemmaRoles(
  houseIds: HouseId[],
  inventories: Record<string, PlayerInventory>,
): { leader: HouseId | null; moderator: HouseId | null } {
  const activeHouseIds = sortHouseIdsByNumber(houseIds).slice(0, REQUIRED_HOUSE_COUNT);

  if (activeHouseIds.length === 0) {
    return { leader: null, moderator: null };
  }

  const byPrestige = [...activeHouseIds].sort((left, right) => {
    const leftPrestige = inventories[left]?.prestige ?? 0;
    const rightPrestige = inventories[right]?.prestige ?? 0;

    return rightPrestige - leftPrestige || compareHouseIdsByNumberDescending(left, right);
  });

  return {
    leader: byPrestige[0],
    moderator: byPrestige[byPrestige.length - 1],
  };
}

function getLoggedInHouseIds(state: GameState): HouseId[] {
  return getLoggedInHouseIdsFromMaps(state.credentials, state.sessions);
}

function getLoggedInHouseIdsFromMaps(
  credentials: Record<string, SeatCredential>,
  sessions: Record<string, { token: string; createdAt: string }>,
): HouseId[] {
  return sortHouseIdsByNumber(
    Object.keys(sessions).filter((houseId): houseId is HouseId => isHouseId(houseId) && Boolean(credentials[houseId])),
  ).slice(0, REQUIRED_HOUSE_COUNT);
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

function compareHouseIdsByNumberDescending(left: HouseId, right: HouseId) {
  const leftNumber = getHouseById(left)?.number ?? Number.MIN_SAFE_INTEGER;
  const rightNumber = getHouseById(right)?.number ?? Number.MIN_SAFE_INTEGER;

  return rightNumber - leftNumber || left.localeCompare(right);
}

function createDefaultDilemmaOutcome(): DilemmaOutcome {
  return {
    preview: "",
    result: "",
    resourceDeltas: {},
  };
}

function createDilemmaEditLock(
  state: GameState,
  houseId: HouseId,
  token: string,
  now: string,
  acquiredAt = now,
): DilemmaEditLock {
  return {
    houseId,
    houseName: getHouseLabel(state, houseId),
    token,
    acquiredAt,
    updatedAt: now,
    expiresAt: addMilliseconds(now, DILEMMA_EDIT_LOCK_TTL_MS),
  };
}

function assertCanEditDilemma(state: GameState) {
  if (state.phase !== "complete") {
    throw new AgendaStateError("의제 배정이 완료된 뒤 딜레마를 수정할 수 있습니다.", 409);
  }
}

function assertDilemmaRolesAssigned(state: GameState) {
  const activeHouseIds = getLoggedInHouseIds(state);

  if (
    !sanitizeRoleHouseId(state.dilemmaLeader, activeHouseIds) ||
    !sanitizeRoleHouseId(state.dilemmaModerator, activeHouseIds)
  ) {
    throw new AgendaStateError("딜레마를 작성하기 전에 리더와 중재자를 지정하세요.", 409);
  }
}

function getDilemmaForVoting(state: GameState, houseId: HouseId, now: string) {
  assertCanEditDilemma(state);

  const participants = getDilemmaVotingParticipants(state);

  if (!participants.includes(houseId)) {
    throw new AgendaStateError("현재 로그인 중인 가문만 딜레마 투표를 할 수 있습니다.", 403);
  }

  const currentDilemma = sanitizeDilemmaRecord(state.dilemma, now);

  if (currentDilemma.editLock) {
    throw new AgendaStateError(`${currentDilemma.editLock.houseName} 가문이 딜레마를 수정 중입니다.`, 409);
  }

  if (isDilemmaRecordBlank(currentDilemma)) {
    throw new AgendaStateError("투표할 딜레마가 없습니다.", 409);
  }

  return currentDilemma;
}

function assertDilemmaPublishReady(state: GameState, dilemma: DilemmaRecord, now: string) {
  const readiness = getDilemmaVoteReadiness(state, dilemma, now);

  if (readiness.participants.length === 0) {
    throw new AgendaStateError("로그인 중인 가문이 있어야 딜레마를 게시할 수 있습니다.", 409);
  }

  if (readiness.missingHouse) {
    throw new AgendaStateError("로그인 중인 모든 가문이 투표한 뒤 게시할 수 있습니다.", 409);
  }

  if (!dilemma.selectedOutcome) {
    throw new AgendaStateError("딜레마 투표 결과를 직접 선택한 뒤 게시할 수 있습니다.", 409);
  }

  if (!dilemma.resolutionNotes.trim()) {
    throw new AgendaStateError("해결 후속을 입력한 뒤 게시할 수 있습니다.", 409);
  }
}

function areDilemmaVotesComplete(state: GameState, dilemma: DilemmaRecord, now: string) {
  const readiness = getDilemmaVoteReadiness(state, dilemma, now);
  return readiness.participants.length > 0 && !readiness.missingHouse;
}

function getDilemmaVoteReadiness(state: GameState, dilemma: DilemmaRecord, now: string) {
  const participants = getDilemmaVotingParticipants(state);
  const votes = sanitizeDilemmaVotes(dilemma.votes, now);

  return {
    participants,
    missingHouse: participants.find((participantId) => !votes[participantId]?.side) || null,
  };
}

function getDilemmaVotingParticipants(state: GameState) {
  const activeHouseIds = getLoggedInHouseIds(state);
  const manualOrder = pickStoredDilemmaVoteOrder(state.dilemmaVoteOrder, activeHouseIds);

  if (manualOrder.length === activeHouseIds.length) {
    return rotateHouseIdsToLeader(manualOrder, state.dilemmaLeader);
  }

  return sortHouseIdsForVoting(activeHouseIds, state.inventories, state.dilemmaLeader);
}

function getCurrentDilemmaVoteTurn(state: GameState, now = new Date().toISOString()): HouseId | null {
  if (state.phase !== "complete") {
    return null;
  }

  const currentDilemma = sanitizeDilemmaRecord(state.dilemma, now);

  if (currentDilemma.selectedOutcome || currentDilemma.editLock || isDilemmaRecordBlank(currentDilemma)) {
    return null;
  }

  const participants = getDilemmaVotingParticipants(state);
  const votes = sanitizeDilemmaVotes(currentDilemma.votes, now);

  return participants.find((participantId) => !votes[participantId]?.side) || null;
}

function sortHouseIdsForVoting(
  houseIds: HouseId[],
  inventories: Record<string, PlayerInventory>,
  leaderHouseId: HouseId | null = null,
): HouseId[] {
  const orderedBySeat = sortHouseIdsByNumber(houseIds).slice(0, REQUIRED_HOUSE_COUNT);

  if (orderedBySeat.length === 0) {
    return [];
  }

  const defaultLeader = deriveDefaultDilemmaRoles(orderedBySeat, inventories).leader || orderedBySeat[0];
  const leader = leaderHouseId && orderedBySeat.includes(leaderHouseId) ? leaderHouseId : defaultLeader;
  const leaderIndex = Math.max(orderedBySeat.indexOf(leader), 0);

  return [...orderedBySeat.slice(leaderIndex), ...orderedBySeat.slice(0, leaderIndex)];
}

function rotateHouseIdsToLeader(order: HouseId[], leaderHouseId: HouseId | null): HouseId[] {
  if (!leaderHouseId) {
    return order;
  }

  const leaderIndex = order.indexOf(leaderHouseId);

  if (leaderIndex <= 0) {
    return order;
  }

  return [...order.slice(leaderIndex), ...order.slice(0, leaderIndex)];
}

function isDilemmaVoteOrderLocked(state: GameState, now = new Date().toISOString()) {
  if (state.phase !== "complete") {
    return false;
  }

  const currentDilemma = sanitizeDilemmaRecord(state.dilemma, now);

  return !currentDilemma.selectedOutcome && !isDilemmaRecordBlank(currentDilemma);
}

function assertDilemmaLockOwner(dilemma: DilemmaRecord, houseId: HouseId, token: unknown) {
  if (!dilemma.editLock) {
    throw new AgendaStateError("딜레마 편집 권한이 만료되었습니다. 다시 편집을 시작하세요.", 409);
  }

  if (dilemma.editLock.houseId !== houseId || typeof token !== "string" || dilemma.editLock.token !== token) {
    throw new AgendaStateError(`${dilemma.editLock.houseName} 가문이 딜레마를 수정 중입니다.`, 409);
  }
}

function redactDilemmaRecord(record: DilemmaRecord): RedactedDilemmaRecord {
  const { editLock, ...rest } = record;

  return {
    ...rest,
    editLock: editLock
      ? {
          houseId: editLock.houseId,
          houseName: editLock.houseName,
          acquiredAt: editLock.acquiredAt,
          updatedAt: editLock.updatedAt,
          expiresAt: editLock.expiresAt,
        }
      : null,
  };
}

function upsertDilemmaHistory(
  history: DilemmaHistoryEntry[],
  dilemma: DilemmaRecord,
  houseId: HouseId,
  houseName: string,
  now: string,
): DilemmaHistoryEntry[] {
  const { editLock: _editLock, ...historyDraft } = dilemma;
  const entry: DilemmaHistoryEntry = {
    ...historyDraft,
    savedAt: now,
    savedBy: houseId,
    savedByName: houseName,
  };
  const existing = sanitizeDilemmaHistory(history, now).filter((item) => item.historyId !== entry.historyId);

  return [entry, ...existing].slice(0, DILEMMA_HISTORY_LIMIT);
}

function stampDilemmaPhotos(
  photos: DilemmaPhoto[],
  state: GameState,
  houseId: HouseId,
  now: string,
): DilemmaPhoto[] {
  const houseName = getHouseLabel(state, houseId);

  return photos.map((photo) => ({
    ...photo,
    addedAt: photo.addedAt || now,
    addedBy: photo.addedBy || houseId,
    addedByName: photo.addedByName || houseName,
  }));
}

function addMilliseconds(value: string, milliseconds: number) {
  const timestamp = Number.isFinite(Date.parse(value)) ? Date.parse(value) : Date.now();
  return new Date(timestamp + milliseconds).toISOString();
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

function sanitizeAgendaOrder(value: unknown, currentPool: string[]): string[] {
  if (!Array.isArray(value)) {
    throw new AgendaStateError("정렬할 의제 목록을 전달하세요.", 400);
  }

  const poolSet = new Set(currentPool);
  const seen = new Set<string>();
  const nextOrder = value.filter((id): id is string => {
    if (typeof id !== "string" || !poolSet.has(id) || seen.has(id)) {
      return false;
    }

    seen.add(id);
    return true;
  });

  if (nextOrder.length !== currentPool.length) {
    throw new AgendaStateError("현재 남은 의제를 모두 포함한 순서로 저장하세요.", 400);
  }

  return nextOrder;
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

function sanitizeDilemmaRecord(value: unknown, now: string): DilemmaRecord {
  if (!value || typeof value !== "object") {
    return createDefaultDilemmaRecord(now);
  }

  const candidate = value as Partial<DilemmaRecord>;

  return {
    historyId: sanitizeSingleLineText(candidate.historyId, DILEMMA_HISTORY_ID_LIMIT),
    cardCode: sanitizeSingleLineText(candidate.cardCode, DILEMMA_CODE_LIMIT),
    title: sanitizeSingleLineText(candidate.title, DILEMMA_TITLE_LIMIT),
    timeCounterSlot: sanitizeSingleLineText(candidate.timeCounterSlot, DILEMMA_SLOT_LIMIT),
    context: sanitizeMultilineText(candidate.context, DILEMMA_LONG_TEXT_LIMIT),
    question: sanitizeMultilineText(candidate.question, DILEMMA_LONG_TEXT_LIMIT),
    councilNotes: sanitizeMultilineText(candidate.councilNotes, DILEMMA_LONG_TEXT_LIMIT),
    aye: sanitizeDilemmaOutcome(candidate.aye),
    nay: sanitizeDilemmaOutcome(candidate.nay),
    selectedOutcome: sanitizeDilemmaVoteSide(candidate.selectedOutcome),
    voteNotes: sanitizeMultilineText(candidate.voteNotes, DILEMMA_LONG_TEXT_LIMIT),
    resolutionNotes: sanitizeMultilineText(candidate.resolutionNotes, DILEMMA_LONG_TEXT_LIMIT),
    votes: sanitizeDilemmaVotes(candidate.votes, now),
    photos: sanitizeDilemmaPhotos(candidate.photos, now),
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
    updatedBy: isHouseId(candidate.updatedBy) ? candidate.updatedBy : null,
    updatedByName: sanitizeSingleLineText(candidate.updatedByName, DILEMMA_HOUSE_NAME_LIMIT),
    editLock: sanitizeDilemmaEditLock(candidate.editLock, now),
  };
}

function sanitizeDilemmaHistory(value: unknown, now: string): DilemmaHistoryEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const entries: DilemmaHistoryEntry[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const candidate = item as Partial<DilemmaHistoryEntry>;
    const record = sanitizeDilemmaRecord(candidate, now);
    const historyId = sanitizeSingleLineText(candidate.historyId || record.historyId, DILEMMA_HISTORY_ID_LIMIT);

    if (!historyId || seen.has(historyId)) {
      continue;
    }

    seen.add(historyId);
    const { editLock: _editLock, ...entryRecord } = record;
    entries.push({
      ...entryRecord,
      historyId,
      savedAt: typeof candidate.savedAt === "string" ? candidate.savedAt : record.updatedAt,
      savedBy: isHouseId(candidate.savedBy) ? candidate.savedBy : record.updatedBy,
      savedByName: sanitizeSingleLineText(candidate.savedByName || record.updatedByName, DILEMMA_HOUSE_NAME_LIMIT),
    });

    if (entries.length >= DILEMMA_HISTORY_LIMIT) {
      break;
    }
  }

  return entries;
}

function sanitizeDilemmaOutcome(value: unknown): DilemmaOutcome {
  if (!value || typeof value !== "object") {
    return createDefaultDilemmaOutcome();
  }

  const candidate = value as Partial<DilemmaOutcome>;

  return {
    preview: sanitizeMultilineText(candidate.preview, DILEMMA_LONG_TEXT_LIMIT),
    result: sanitizeMultilineText(candidate.result, DILEMMA_LONG_TEXT_LIMIT),
    resourceDeltas: sanitizeDilemmaResourceDeltas(candidate.resourceDeltas),
  };
}

function sanitizeDilemmaVotes(value: unknown, now: string): Partial<Record<HouseId, DilemmaVote>> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([houseId]) => isHouseId(houseId))
    .map(([houseId, vote]) => {
      const candidate = vote && typeof vote === "object" ? (vote as Partial<DilemmaVote>) : {};
      const side = sanitizeDilemmaBallotSide(candidate.side);
      const powerTokens = side === "pass" ? 0 : sanitizeCounter(candidate.powerTokens, DILEMMA_VOTE_POWER_LIMIT, 0);

      return [
        houseId,
        {
          side,
          powerTokens,
          updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
          updatedByName: sanitizeSingleLineText(candidate.updatedByName, DILEMMA_HOUSE_NAME_LIMIT),
        },
      ];
    })
    .filter(([, vote]) => Boolean((vote as DilemmaVote).side));

  return Object.fromEntries(entries);
}

function sanitizeDilemmaVoteOrder(value: unknown, activeHouseIds: HouseId[]): HouseId[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const activeHouseSet = new Set(activeHouseIds);
  const seen = new Set<HouseId>();
  const order = value.filter((houseId): houseId is HouseId => {
    if (!isHouseId(houseId) || !activeHouseSet.has(houseId) || seen.has(houseId)) {
      return false;
    }

    seen.add(houseId);
    return true;
  });

  return order.length === activeHouseIds.length ? order : [];
}

function pickStoredDilemmaVoteOrder(value: unknown, activeHouseIds: HouseId[]): HouseId[] {
  if (!Array.isArray(value) || activeHouseIds.length === 0) {
    return [];
  }

  const activeHouseSet = new Set(activeHouseIds);
  const seen = new Set<HouseId>();
  const order = value.filter((houseId): houseId is HouseId => {
    if (!isHouseId(houseId) || !activeHouseSet.has(houseId) || seen.has(houseId)) {
      return false;
    }

    seen.add(houseId);
    return true;
  });

  return order.length === activeHouseIds.length ? order : [];
}

function sanitizeIncomingDilemmaVote(value: unknown, availablePowerTokens: number): Omit<DilemmaVote, "updatedAt" | "updatedByName"> {
  const candidate = value && typeof value === "object" ? (value as Partial<DilemmaVote>) : {};
  const side = sanitizeDilemmaBallotSide(candidate.side);

  if (!side) {
    throw new AgendaStateError("찬성, 반대, 기권 중 하나를 선택하세요.", 400);
  }

  if (side === "pass") {
    return { side, powerTokens: 0 };
  }

  const powerTokens = sanitizeCounter(candidate.powerTokens, DILEMMA_VOTE_POWER_LIMIT, -1);

  if (powerTokens < 0) {
    throw new AgendaStateError("권력 토큰 수를 입력하세요.", 400);
  }

  if (powerTokens > availablePowerTokens) {
    throw new AgendaStateError(`보유한 권력 토큰 ${availablePowerTokens}개까지만 걸 수 있습니다.`, 409);
  }

  if (powerTokens < 1) {
    throw new AgendaStateError("찬성/반대에는 권력 토큰을 1개 이상 걸어야 합니다.", 400);
  }

  return { side, powerTokens };
}

function sumDilemmaVotePower(votes: Partial<Record<HouseId, DilemmaVote>>, participants: HouseId[], side: DilemmaVoteSide) {
  return participants.reduce((total, houseId) => {
    const vote = votes[houseId];
    return total + (vote?.side === side ? vote.powerTokens : 0);
  }, 0);
}

function isDilemmaRecordBlank(dilemma: DilemmaRecord) {
  const textFieldsBlank = [
    dilemma.cardCode,
    dilemma.title,
    dilemma.timeCounterSlot,
    dilemma.context,
    dilemma.question,
    dilemma.councilNotes,
    dilemma.aye.preview,
    dilemma.aye.result,
    dilemma.nay.preview,
    dilemma.nay.result,
    dilemma.selectedOutcome,
    dilemma.voteNotes,
    dilemma.resolutionNotes,
  ].every((value) => !String(value).trim());

  return (
    textFieldsBlank &&
    !hasDilemmaResourceDeltas(dilemma.aye.resourceDeltas) &&
    !hasDilemmaResourceDeltas(dilemma.nay.resourceDeltas) &&
    dilemma.photos.length === 0
  );
}

function hasDilemmaResourceDeltas(value: DilemmaResourceDeltas) {
  return PERSONAL_RESOURCE_TRACKS.some(({ id }) => (value[id] || 0) !== 0);
}

function sanitizeDilemmaResourceDeltas(value: unknown): DilemmaResourceDeltas {
  if (!value || typeof value !== "object") {
    return {};
  }

  const candidate = value as Record<string, unknown>;
  const deltas: DilemmaResourceDeltas = {};

  for (const { id } of PERSONAL_RESOURCE_TRACKS) {
    const number = Number(candidate[id]);

    if (!Number.isFinite(number)) {
      continue;
    }

    const delta = Math.max(-DILEMMA_RESOURCE_DELTA_LIMIT, Math.min(DILEMMA_RESOURCE_DELTA_LIMIT, Math.trunc(number)));

    if (delta !== 0) {
      deltas[id] = delta;
    }
  }

  return deltas;
}

function sanitizeDilemmaPhotos(value: unknown, now: string): DilemmaPhoto[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const photos: DilemmaPhoto[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const candidate = item as Partial<DilemmaPhoto>;
    const id = sanitizeSingleLineText(candidate.id, DILEMMA_HISTORY_ID_LIMIT);
    const mimeType = typeof candidate.mimeType === "string" ? candidate.mimeType : "";
    const dataUrl = typeof candidate.dataUrl === "string" ? candidate.dataUrl : "";
    const size = normalizePhotoSize(candidate.size);

    if (
      !id ||
      seen.has(id) ||
      !DILEMMA_PHOTO_MIME_TYPES.has(mimeType) ||
      !isValidDilemmaPhotoDataUrl(dataUrl, mimeType) ||
      dataUrl.length > DILEMMA_PHOTO_DATA_URL_LIMIT ||
      size > DILEMMA_PHOTO_ORIGINAL_SIZE_LIMIT
    ) {
      continue;
    }

    seen.add(id);
    photos.push({
      id,
      name: sanitizeSingleLineText(candidate.name, DILEMMA_PHOTO_NAME_LIMIT) || "딜레마 사진",
      mimeType,
      dataUrl,
      size,
      addedAt: typeof candidate.addedAt === "string" ? candidate.addedAt : now,
      addedBy: isHouseId(candidate.addedBy) ? candidate.addedBy : null,
      addedByName: sanitizeSingleLineText(candidate.addedByName, DILEMMA_HOUSE_NAME_LIMIT),
    });

    if (photos.length >= DILEMMA_PHOTO_LIMIT) {
      break;
    }
  }

  return photos;
}

function sanitizeDilemmaEditLock(value: unknown, now: string): DilemmaEditLock | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<DilemmaEditLock>;

  if (
    !isHouseId(candidate.houseId) ||
    typeof candidate.houseName !== "string" ||
    typeof candidate.token !== "string" ||
    typeof candidate.acquiredAt !== "string" ||
    typeof candidate.updatedAt !== "string" ||
    typeof candidate.expiresAt !== "string"
  ) {
    return null;
  }

  const expiresAt = Date.parse(candidate.expiresAt);
  const currentTime = Date.parse(now);

  if (!Number.isFinite(expiresAt) || (Number.isFinite(currentTime) && expiresAt <= currentTime)) {
    return null;
  }

  return {
    houseId: candidate.houseId,
    houseName: sanitizeSingleLineText(candidate.houseName, DILEMMA_HOUSE_NAME_LIMIT),
    token: candidate.token,
    acquiredAt: candidate.acquiredAt,
    updatedAt: candidate.updatedAt,
    expiresAt: candidate.expiresAt,
  };
}

function sanitizeDilemmaVoteSide(value: unknown): DilemmaVoteSide {
  return value === "aye" || value === "nay" ? value : "";
}

function sanitizeDilemmaBallotSide(value: unknown): DilemmaBallotSide {
  return value === "aye" || value === "nay" || value === "pass" ? value : "";
}

function normalizePhotoSize(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.trunc(value));
}

function isValidDilemmaPhotoDataUrl(value: string, mimeType: string) {
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
  const narrativeAchievementDetail = sanitizeAchievementDetail(candidate.narrativeAchievementDetail, 1);
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

function sanitizeAlignmentOrder(value: unknown) {
  const defaultOrder = getDefaultAlignmentOrder();
  const allowed = new Set(defaultOrder);
  const candidate = Array.isArray(value) ? value : defaultOrder;
  const next: string[] = [];

  for (const item of candidate) {
    if (typeof item === "string" && allowed.has(item) && !next.includes(item)) {
      next.push(item);
    }
  }

  for (const agendaId of defaultOrder) {
    if (!next.includes(agendaId)) {
      next.push(agendaId);
    }
  }

  return next;
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
