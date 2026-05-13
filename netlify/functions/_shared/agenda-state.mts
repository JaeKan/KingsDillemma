import {
  ageChronicleLedger,
  assignOpenAgendasFromChronicles,
  CHRONICLE_ROW_CAPACITY,
  calculateLegacyResourceDeltas,
  createDefaultCampaignLedger,
  createDefaultChronicleLedger,
  createDefaultNextGameSetupState,
  previewChroniclePlacement,
  type CampaignCardEntry,
  type CampaignCardStatus,
  type CampaignEnvelopeEntry,
  type CampaignLedger,
  type ChronicleLedger,
  type ChronicleOpenAgendaAssignments,
  type ChroniclePolarity,
  type ChronicleResourceId,
  type ChronicleStickerEntry,
  type MysteryStickerEntry,
  type NextGameSetupState,
  type RecordAttachment,
} from "../../../shared/chronicle-ledger.mts";
import {
  HOUSE_CATALOG,
  REQUIRED_HOUSE_COUNT,
  getHouseById,
  isHouseId,
  sortHouseIdsByNumber,
} from "../../../shared/houses.mjs";
import { sanitizeMysteryStickerId } from "../../../shared/mystery-stickers.mts";

export const PLAYER_COUNT = REQUIRED_HOUSE_COUNT;
export const PLAYER_SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export type HouseId = string;
export type PlayerNumber = HouseId;
export type Phase = "house-select" | "discard" | "choose" | "complete";
export type PersonalResourceId = (typeof PERSONAL_RESOURCE_TRACKS)[number]["id"];
export type DilemmaResultMarkerId = PersonalResourceId | "story";
export type DilemmaResourceDeltas = Partial<Record<PersonalResourceId, number>>;
export type DilemmaResourcePolarities = Partial<Record<DilemmaResultMarkerId, ChroniclePolarity>>;
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

type DilemmaOutcomeEffectBase = {
  id: string;
  photos?: RecordAttachment[];
};

export type DilemmaOutcomeEffect = DilemmaOutcomeEffectBase & (
  | { type: "resource"; resourceId: PersonalResourceId; amount: number }
  | { type: "chronicle"; resourceId: PersonalResourceId; polarity: ChroniclePolarity; stickerCode: string }
  | { type: "envelope"; envelopeCode: string }
  | {
      id: string;
      type: "story";
      cardCode: string;
      status: "active" | "completed" | "archived";
      signedByHouseId?: HouseId;
      signedByName?: string;
    }
  | { type: "event"; cardCode: string; status: "active" | "completed" | "archived" }
  | { type: "mystery"; dossierLetter: string; storylineSymbol: string; slotKey: string }
  | { type: "note"; text: string }
);

export type DilemmaOutcome = {
  preview: string;
  result: string;
  resourcePolarities: DilemmaResourcePolarities;
  resourceDeltas: DilemmaResourceDeltas;
  effects: DilemmaOutcomeEffect[];
};

export type DilemmaVote = {
  side: DilemmaBallotSide;
  powerTokens: number;
  updatedAt: string;
  updatedByName: string;
};

export type NeutralPowerPool = {
  powerTokens: number;
  updatedAt: string;
};

export type DilemmaVoteSettlementStatus = "none" | "proposed" | "applied";
export type DilemmaVoteSettlementDelta = {
  coins: number;
  powerTokens: number;
};
export type DilemmaVoteSettlementProposal = {
  participants: HouseId[];
  outcome: DilemmaVoteSide;
  tally: {
    ayePower: number;
    nayPower: number;
    passCount: number;
    moderatorPassCount: number;
  };
  neutralPowerBefore: number;
  neutralPowerDistributed: number;
  neutralPowerAfter: number;
  inventoryDeltas: Partial<Record<HouseId, DilemmaVoteSettlementDelta>>;
  leaderHouseId: HouseId | null;
  moderatorHouseId: HouseId | null;
  warnings: string[];
  createdAt: string;
};
export type DilemmaVoteSettlement = {
  status: DilemmaVoteSettlementStatus;
  proposal: DilemmaVoteSettlementProposal | null;
  appliedAt: string;
  appliedBy: HouseId | null;
};
export type SessionEndCause = "king_death" | "abdication_top" | "abdication_bottom";
export type SessionEndReward = {
  prestige: number;
  crave: number;
};
export type DilemmaEndTrigger = "" | "none" | SessionEndCause;

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

export type DilemmaResolutionChecklist = {
  a?: boolean;
  b?: boolean;
  c?: boolean;
  d?: boolean;
  e?: boolean;
  f?: boolean;
  memo?: string;
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
  /** 보드 카드 배치 위치(룰북 미스터리 스티커 1–6). 카탈로그 id, 빈 문자열 = 미선택 */
  mysteryStickerId: string;
  timeCounterSlot: string;
  context: string;
  question: string;
  councilNotes: string;
  aye: DilemmaOutcome;
  nay: DilemmaOutcome;
  selectedOutcome: DilemmaVoteSide;
  voteNotes: string;
  resolutionNotes: string;
  resolutionChecklist?: DilemmaResolutionChecklist;
  votes: Partial<Record<HouseId, DilemmaVote>>;
  voteSettlement: DilemmaVoteSettlement;
  photos: DilemmaPhoto[];
  /** 후속·결과 단계 첨부 사진 */
  resolutionPhotos: DilemmaPhoto[];
  updatedAt: string;
  updatedBy: HouseId | null;
  updatedByName: string;
  /** 딜레마 플로우 소유자 fallback. 새 플로우에서는 `dilemmaRolesAuthorHouseId`가 작성·게시·초기화 권한 기준이다. */
  dilemmaAuthorHouseId: HouseId | null;
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
  sessions: Record<string, AgendaSession>;
  adminHouseId: HouseId | null;
  credentials: Record<string, SeatCredential>;
  playerNames: Record<string, string>;
  inventories: Record<string, PlayerInventory>;
  progress: Record<string, HouseProgress>;
  neutralPowerPool: NeutralPowerPool;
  sessionEndCause: DilemmaEndTrigger;
  sessionEndRewardsAppliedAt: string;
  sessionEndRewardsAppliedBy: HouseId | null;
  dilemma: DilemmaRecord;
  dilemmaLeader: HouseId | null;
  dilemmaModerator: HouseId | null;
  dilemmaRolesAuthorHouseId: HouseId | null;
  dilemmaVoteOrder: HouseId[];
  dilemmaHistory: DilemmaHistoryEntry[];
  chronicleLedger: ChronicleLedger;
  campaignLedger: CampaignLedger;
  nextGameSetupState: NextGameSetupState;
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

/** `saveDilemma` 옵션 — 클라이언트 결과 입력 흐름에서 서버 검사 시 사용합니다. */
export type SaveDilemmaRecordOptions = {
  /** true면 결과 모달 저장으로 간주하여 작성자만 허용(페이로드 감사와 함께). */
  fromResolution?: boolean;
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
  sessionEndCause: DilemmaEndTrigger;
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
  dilemmaVoteTurn: HouseId | null;
  canVoteDilemma: boolean;
  /** true면 집계 기록(applyDilemmaVotes) 요청이 서버에서 허용됨 — 딜레마 작성자 또는 관리자이며 전원 투표 완료. */
  canApplyDilemmaVotes: boolean;
  /** 역할 지정 가능 — 빈 딜레마에서 플로우 소유자가 없거나 세션 가문이 소유자일 때만 true */
  canEditDilemmaRoles: boolean;
  /** 딜레마 결과 입력(후속 단계 모달 시작) 가능 — 플로우 소유자만 true */
  canEnterDilemmaResolution: boolean;
  /** 딜레마 이력 게시 — 플로우 소유자만 true */
  canPublishDilemmaResolution: boolean;
  /** 결과 초기화 — 플로우 소유자만 true */
  canResetDilemmaResult: boolean;
  /** 카드 본문 편집(작성/다이얼로그) — 역할 지정부터 맡은 플로우 소유자만 true */
  canEditDilemmaCard: boolean;
  dilemmaLeader: HouseId | null;
  dilemmaModerator: HouseId | null;
  dilemmaVoteOrder: HouseId[];
  ownChoice: Agenda | null;
  ownInventory: PlayerInventory | null;
  ownHouseProgress: HouseProgress | null;
  dilemma: RedactedDilemmaRecord;
  dilemmaHistory: DilemmaHistoryEntry[];
  chronicleLedger: ChronicleLedger;
  campaignLedger: CampaignLedger;
  nextGameSetupState: NextGameSetupState;
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

const FIXED_ALIGNMENT_ORDER = ["extremist", "rebel", "opulent", "opportunist", "moderate", "greedy"];

export const PERSONAL_RESOURCE_TRACKS = [
  { id: "influence", label: "영향력" },
  { id: "wealth", label: "부" },
  { id: "morale", label: "사기" },
  { id: "welfare", label: "복지" },
  { id: "knowledge", label: "지식" },
] as const;

const DILEMMA_RESULT_MARKERS: ReadonlyArray<{ id: DilemmaResultMarkerId }> = [
  ...PERSONAL_RESOURCE_TRACKS,
  { id: "story" },
];

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
const DILEMMA_CHECKLIST_MEMO_LIMIT = 200;
const DILEMMA_OUTCOME_NOTE_LIMIT = 500;
const CHRONICLE_LEDGER_ID_LIMIT = 64;
const CHRONICLE_LEDGER_CODE_LIMIT = 32;
const CHRONICLE_LEDGER_NOTE_LIMIT = 500;
const RECORD_PHOTO_LIMIT = DILEMMA_PHOTO_LIMIT;
const NEXT_GAME_SETUP_CHECKLIST_LIMIT = 80;
const NEXT_GAME_SETUP_CHECKLIST_KEY_LIMIT = 80;
const DILEMMA_PHOTO_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
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
    mysteryStickerId: "",
    timeCounterSlot: "",
    context: "",
    question: "",
    councilNotes: "",
    aye: createDefaultDilemmaOutcome(),
    nay: createDefaultDilemmaOutcome(),
    selectedOutcome: "",
    voteNotes: "",
    resolutionNotes: "",
    resolutionChecklist: {},
    votes: {},
    voteSettlement: createDefaultDilemmaVoteSettlement(),
    photos: [],
    resolutionPhotos: [],
    updatedAt: now,
    updatedBy: null,
    updatedByName: "",
    dilemmaAuthorHouseId: null,
    editLock: null,
  };
}

function createDefaultNeutralPowerPool(now = new Date().toISOString()): NeutralPowerPool {
  return {
    powerTokens: NEUTRAL_POWER_POOL_DEFAULT,
    updatedAt: now,
  };
}

function createDefaultDilemmaVoteSettlement(): DilemmaVoteSettlement {
  return {
    status: "none",
    proposal: null,
    appliedAt: "",
    appliedBy: null,
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
    dilemma: createDefaultDilemmaRecord(now),
    dilemmaLeader: null,
    dilemmaModerator: null,
    dilemmaRolesAuthorHouseId: null,
    dilemmaVoteOrder: [],
    dilemmaHistory: [],
    chronicleLedger: createDefaultChronicleLedger(),
    campaignLedger: createDefaultCampaignLedger(),
    nextGameSetupState: createDefaultNextGameSetupState(),
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
  const dilemma =
    phase === "complete" ? migrateDilemmaAuthorHouseId(sanitizeDilemmaRecord(candidate.dilemma, now)) : createDefaultDilemmaRecord(now);
  const dilemmaRolesAuthorHouseId = isHouseId(candidate.dilemmaRolesAuthorHouseId)
    ? candidate.dilemmaRolesAuthorHouseId
    : null;
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
  const neutralPowerPool = sanitizeNeutralPowerPool(candidate.neutralPowerPool, now);
  const chronicleLedger = sanitizeChronicleLedger(candidate.chronicleLedger, now);
  const campaignLedger = sanitizeCampaignLedger(candidate.campaignLedger, now);
  const nextGameSetupState = sanitizeNextGameSetupState(candidate.nextGameSetupState);

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
    sessionEndCause: sanitizeDilemmaEndTrigger(candidate.sessionEndCause),
    sessionEndRewardsAppliedAt: typeof candidate.sessionEndRewardsAppliedAt === "string" ? candidate.sessionEndRewardsAppliedAt : "",
    sessionEndRewardsAppliedBy: isHouseId(candidate.sessionEndRewardsAppliedBy) ? candidate.sessionEndRewardsAppliedBy : null,
    dilemma,
    dilemmaRolesAuthorHouseId,
    dilemmaLeader,
    dilemmaModerator,
    dilemmaVoteOrder,
    dilemmaHistory,
    chronicleLedger,
    campaignLedger,
    nextGameSetupState,
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
  const shouldClearAdmin = state.adminHouseId === houseId;

  if (!state.sessions[houseId] && !shouldClearDilemmaLock && !shouldClearAdmin) {
    return state;
  }

  const sessions = { ...state.sessions };
  delete sessions[houseId];

  return {
    ...state,
    sessions,
    adminHouseId: shouldClearAdmin ? null : state.adminHouseId,
    dilemma: shouldClearDilemmaLock ? { ...state.dilemma, editLock: null } : state.dilemma,
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
    adminHouseId: null,
    neutralPowerPool: createDefaultNeutralPowerPool(now),
    sessionEndCause: "",
    sessionEndRewardsAppliedAt: "",
    sessionEndRewardsAppliedBy: null,
    dilemma: createDefaultDilemmaRecord(now),
    dilemmaLeader: null,
    dilemmaModerator: null,
    dilemmaRolesAuthorHouseId: null,
    dilemmaVoteOrder: [],
    updatedAt: now,
  };
}

export function saveDilemmaVoteOrder(
  state: GameState,
  houseId: HouseId,
  order: unknown,
  now = new Date().toISOString(),
): GameState {
  if (isDilemmaVoteOrderLocked(state, now) && !isAdminHouse(state, houseId)) {
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
  houseId: HouseId,
  roles: unknown,
  now = new Date().toISOString(),
): GameState {
  assertCanEditDilemma(state);

  const currentDilemma = sanitizeDilemmaRecord(state.dilemma, now);
  const flowOwner = getDilemmaFlowOwnerHouseId(state, currentDilemma);
  const admin = isAdminHouse(state, houseId);

  if (!admin && (currentDilemma.editLock || !isDilemmaRecordBlank(currentDilemma))) {
    throw new AgendaStateError("리더와 중재자는 딜레마 작성 전에만 지정할 수 있습니다.", 409);
  }

  if (!admin && flowOwner && flowOwner !== houseId) {
    throw new AgendaStateError("최초 수정한 가문만 역할을 다시 지정할 수 있습니다.", 403);
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
    dilemmaRolesAuthorHouseId: flowOwner || houseId,
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
  const admin = isAdminHouse(state, houseId);
  assertCanEditDilemma(state);
  if (!admin) {
    assertDilemmaRolesAssigned(state);
  }

  if (!token) {
    throw new AgendaStateError("딜레마 편집 토큰을 만들 수 없습니다.");
  }

  const currentDilemma = sanitizeDilemmaRecord(state.dilemma, now);
  const activeLock = currentDilemma.editLock;

  if (!admin && activeLock && activeLock.houseId !== houseId) {
    throw new AgendaStateError(`${activeLock.houseName} 가문이 딜레마를 수정 중입니다.`, 409);
  }

  if (!admin) {
    assertDilemmaFlowOwnerHouseMatches(
      state,
      currentDilemma,
      houseId,
      "최초 수정한 가문만 딜레마를 작성하거나 편집할 수 있습니다.",
    );
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
  const admin = isAdminHouse(state, houseId);
  assertCanEditDilemma(state);

  const currentDilemma = sanitizeDilemmaRecord(state.dilemma, now);

  if (!currentDilemma.editLock) {
    return state;
  }

  if (!admin) {
    assertDilemmaLockOwner(currentDilemma, houseId, token);
  }

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

function migrateDilemmaAuthorHouseId(dilemma: DilemmaRecord): DilemmaRecord {
  if (dilemma.dilemmaAuthorHouseId || isDilemmaRecordBlank(dilemma) || !isHouseId(dilemma.updatedBy)) {
    return dilemma;
  }

  return { ...dilemma, dilemmaAuthorHouseId: dilemma.updatedBy };
}

function resolveDilemmaAuthorHouseIdForSave(
  state: GameState,
  currentDilemma: DilemmaRecord,
  sanitizedDraft: DilemmaRecord,
  savingHouseId: HouseId,
): HouseId | null {
  const flowOwner = getDilemmaFlowOwnerHouseId(state, currentDilemma);

  if (flowOwner) {
    return flowOwner;
  }

  if (currentDilemma.dilemmaAuthorHouseId) {
    return currentDilemma.dilemmaAuthorHouseId;
  }

  /**
   * `dilemmaAuthorHouseId` 미도입·null 레거시: 비어 있지 않은 레코드를 **처음 채운** 가문은
   * `updatedBy`(당시 저장 주체)에 남습니다. 다른 가문이 이후 수정·저장해도 `updatedBy`만 덮일 뿐
   * `migrateDilemmaAuthorHouseId` 가 마지막 저장자를 작성자로 오인하지 않도록, 여기서 고정합니다.
   */
  if (!isDilemmaRecordBlank(currentDilemma) && isHouseId(currentDilemma.updatedBy)) {
    return currentDilemma.updatedBy;
  }

  if (!isDilemmaRecordBlank(sanitizedDraft)) {
    if (isDilemmaRecordBlank(currentDilemma)) {
      return flowOwner || savingHouseId;
    }
  }

  return null;
}

function serializeResolutionPhotosForAuthorityCheck(photos: DilemmaPhoto[]): string {
  return JSON.stringify(
    photos.map((p) => ({
      id: p.id,
      mimeType: p.mimeType,
      dataUrl: p.dataUrl,
      name: p.name,
      size: p.size,
    })),
  );
}

/** 투표·결과·후속·타임 칸 등 — 작성자(saveDilemma 작성자 고정 필드)만 바꿀 수 있는 필드 변화 여부 */
function dilemmaAuthorOnlySliceChanged(before: DilemmaRecord, after: DilemmaRecord): boolean {
  if (before.selectedOutcome !== after.selectedOutcome) {
    return true;
  }

  if (before.voteNotes.trim() !== after.voteNotes.trim()) {
    return true;
  }

  if (before.resolutionNotes.trim() !== after.resolutionNotes.trim()) {
    return true;
  }

  if (before.timeCounterSlot.trim() !== after.timeCounterSlot.trim()) {
    return true;
  }

  if (serializeResolutionPhotosForAuthorityCheck(before.resolutionPhotos) !== serializeResolutionPhotosForAuthorityCheck(after.resolutionPhotos)) {
    return true;
  }

  if (JSON.stringify(before.resolutionChecklist ?? {}) !== JSON.stringify(after.resolutionChecklist ?? {})) {
    return true;
  }

  return false;
}

/** 권한 판정: `dilemmaAuthorHouseId` 우선. null이면 normalize·저장 누락 레거시용으로 `migrateDilemmaAuthorHouseId`와 동일하게 본문이 있는 레코드의 `updatedBy`를 사용합니다. */
function getEffectiveDilemmaAuthorHouseId(dilemma: DilemmaRecord): HouseId | null {
  if (dilemma.dilemmaAuthorHouseId && isHouseId(dilemma.dilemmaAuthorHouseId)) {
    return dilemma.dilemmaAuthorHouseId;
  }

  if (!isDilemmaRecordBlank(dilemma) && isHouseId(dilemma.updatedBy)) {
    return dilemma.updatedBy;
  }

  return null;
}

function getDilemmaFlowOwnerHouseId(state: GameState, dilemma: DilemmaRecord): HouseId | null {
  if (isHouseId(state.dilemmaRolesAuthorHouseId)) {
    return state.dilemmaRolesAuthorHouseId;
  }

  return getEffectiveDilemmaAuthorHouseId(dilemma);
}

function assertDilemmaFlowOwnerHouseMatches(
  state: GameState,
  dilemma: DilemmaRecord,
  houseId: HouseId,
  forbiddenMessage: string,
) {
  const ownerId = getDilemmaFlowOwnerHouseId(state, dilemma);

  if (!ownerId) {
    throw new AgendaStateError("딜레마 역할을 다시 지정하세요.", 409);
  }

  if (ownerId !== houseId) {
    throw new AgendaStateError(forbiddenMessage, 403);
  }
}

function assertDilemmaCardEditableCouncilHouse(state: GameState, dilemma: DilemmaRecord, houseId: HouseId) {
  assertDilemmaFlowOwnerHouseMatches(state, dilemma, houseId, "최초 수정한 가문만 딜레마를 작성하거나 편집할 수 있습니다.");
}

function preserveOutcomeBackFields(current: DilemmaOutcome, draft: DilemmaOutcome): DilemmaOutcome {
  return {
    ...draft,
    result: current.result,
    resourceDeltas: current.resourceDeltas,
    effects: current.effects,
  };
}

function preserveDilemmaResolutionFields(current: DilemmaRecord, draft: DilemmaRecord): DilemmaRecord {
  return {
    ...draft,
    aye: preserveOutcomeBackFields(current.aye, draft.aye),
    nay: preserveOutcomeBackFields(current.nay, draft.nay),
    selectedOutcome: current.selectedOutcome,
    voteNotes: current.voteNotes,
    timeCounterSlot: current.timeCounterSlot,
    resolutionNotes: current.resolutionNotes,
    resolutionChecklist: current.resolutionChecklist,
    votes: current.votes,
    voteSettlement: current.voteSettlement,
    resolutionPhotos: current.resolutionPhotos,
  };
}

export function saveDilemmaRecord(
  state: GameState,
  houseId: HouseId,
  token: unknown,
  draft: unknown,
  historyId: unknown,
  now = new Date().toISOString(),
  opts?: SaveDilemmaRecordOptions,
): GameState {
  const admin = isAdminHouse(state, houseId);
  assertCanEditDilemma(state);

  const currentDilemma = sanitizeDilemmaRecord(state.dilemma, now);
  if (!admin) {
    assertDilemmaLockOwner(currentDilemma, houseId, token);
  }

  if (!admin) {
    assertDilemmaCardEditableCouncilHouse(state, currentDilemma, houseId);
  }

  const incomingDraft = sanitizeDilemmaRecord(draft, now);
  const sanitizedDraft = opts?.fromResolution === true
    ? incomingDraft
    : preserveDilemmaResolutionFields(currentDilemma, incomingDraft);
  const nextHistoryId =
    currentDilemma.historyId || sanitizeSingleLineText(historyId, DILEMMA_HISTORY_ID_LIMIT);
  const votesComplete = areDilemmaVotesComplete(state, sanitizedDraft, now);

  const resolvedAuthorHouseId = resolveDilemmaAuthorHouseIdForSave(state, currentDilemma, sanitizedDraft, houseId);
  const authorOnlyDirty =
    opts?.fromResolution === true || dilemmaAuthorOnlySliceChanged(currentDilemma, sanitizedDraft);

  if (!admin && authorOnlyDirty) {
    assertDilemmaFlowOwnerHouseMatches(state, currentDilemma, houseId, "최초 수정한 가문만 결과·해결 정보를 저장할 수 있습니다.");
  }

  if (!nextHistoryId) {
    throw new AgendaStateError("딜레마 식별값을 만들 수 없습니다.");
  }

  if (!votesComplete && sanitizedDraft.selectedOutcome) {
    throw new AgendaStateError("로그인 중인 모든 가문이 투표한 뒤 결과를 선택할 수 있습니다.", 409);
  }

  if (!votesComplete && sanitizedDraft.resolutionNotes.trim()) {
    throw new AgendaStateError("로그인 중인 모든 가문이 투표한 뒤 해결 후속을 입력할 수 있습니다.", 409);
  }

  if (!votesComplete && resolutionChecklistHasContent(sanitizedDraft.resolutionChecklist)) {
    throw new AgendaStateError("로그인 중인 모든 가문이 투표한 뒤 딜레마 해결 절차 체크를 저장할 수 있습니다.", 409);
  }

  if (!votesComplete && sanitizedDraft.resolutionPhotos.length) {
    throw new AgendaStateError("로그인 중인 모든 가문이 투표한 뒤 후속·결과 사진을 첨부할 수 있습니다.", 409);
  }

  const nextDilemma: DilemmaRecord = {
    ...sanitizedDraft,
    historyId: nextHistoryId,
    photos: stampDilemmaPhotos(sanitizedDraft.photos, state, houseId, now),
    resolutionPhotos: stampDilemmaPhotos(sanitizedDraft.resolutionPhotos, state, houseId, now),
    voteSettlement: currentDilemma.voteSettlement,
    updatedAt: now,
    updatedBy: houseId,
    updatedByName: getHouseLabel(state, houseId),
    dilemmaAuthorHouseId: resolvedAuthorHouseId,
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
  const admin = isAdminHouse(state, houseId);
  assertCanEditDilemma(state);

  const currentDilemma = sanitizeDilemmaRecord(state.dilemma, now);

  if (!admin && currentDilemma.editLock) {
    throw new AgendaStateError(`${currentDilemma.editLock.houseName} 가문이 딜레마를 수정 중입니다.`, 409);
  }

  if (isDilemmaRecordBlank(currentDilemma)) {
    throw new AgendaStateError("게시할 딜레마가 없습니다.", 409);
  }

  if (!admin) {
    assertDilemmaFlowOwnerHouseMatches(state, currentDilemma, houseId, "최초 수정한 가문만 게시할 수 있습니다.");
  }

  assertDilemmaPublishReady(state, currentDilemma, now);

  const nextHistoryId =
    currentDilemma.historyId || sanitizeSingleLineText(historyId, DILEMMA_HISTORY_ID_LIMIT);

  if (!nextHistoryId) {
    throw new AgendaStateError("딜레마 식별값을 만들 수 없습니다.");
  }

  const nextDilemma: DilemmaRecord = {
    ...currentDilemma,
    historyId: nextHistoryId,
    photos: stampDilemmaPhotos(currentDilemma.photos, state, houseId, now),
    resolutionPhotos: stampDilemmaPhotos(currentDilemma.resolutionPhotos, state, houseId, now),
    editLock: null,
  };

  return {
    ...state,
    dilemma: createDefaultDilemmaRecord(now),
    dilemmaLeader: null,
    dilemmaModerator: null,
    dilemmaRolesAuthorHouseId: null,
    dilemmaHistory: upsertDilemmaHistory(state.dilemmaHistory, nextDilemma, houseId, getHouseLabel(state, houseId), now),
    version: state.version + 1,
    updatedAt: now,
  };
}

export function resetDilemmaRecord(
  state: GameState,
  houseId: HouseId,
  now = new Date().toISOString(),
): GameState {
  const admin = isAdminHouse(state, houseId);
  const currentDilemma = sanitizeDilemmaRecord(state.dilemma, now);

  if (!admin && currentDilemma.editLock && currentDilemma.editLock.houseId !== houseId) {
    throw new AgendaStateError(`${currentDilemma.editLock.houseName} 가문이 딜레마를 수정 중입니다.`, 409);
  }

  assertCanResetDilemma(state, currentDilemma, houseId, admin);

  return {
    ...state,
    dilemma: createDefaultDilemmaRecord(now),
    dilemmaLeader: null,
    dilemmaModerator: null,
    dilemmaRolesAuthorHouseId: null,
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

  if (!isAdminHouse(state, houseId) && targetEntry.savedBy !== houseId) {
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

  if (currentDilemma.voteNotes?.trim()) {
    throw new AgendaStateError("투표 집계가 이미 확정되었습니다.", 409);
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
      voteSettlement: createDefaultDilemmaVoteSettlement(),
    },
    version: state.version + 1,
    updatedAt: now,
  };
}

export function addChronicleSticker(
  state: GameState,
  houseId: HouseId,
  input: unknown,
  now = new Date().toISOString(),
): GameState {
  assertCanMutateChronicleLedger(state, houseId);

  const candidate = input && typeof input === "object" ? (input as Partial<ChronicleStickerEntry>) : {};
  const stickerCode = sanitizeSingleLineText(candidate.stickerCode, CHRONICLE_LEDGER_CODE_LIMIT);
  const resourceId = sanitizeChronicleResourceId(candidate.resourceId, "");
  const polarity = sanitizeChroniclePolarity(candidate.polarity);

  if (!stickerCode) {
    throw new AgendaStateError("크로니클 스티커 코드를 입력하세요.", 400);
  }

  if (!resourceId || !polarity) {
    throw new AgendaStateError("크로니클 자원과 방향을 선택하세요.", 400);
  }

  const normalizedLedger = sanitizeChronicleLedger(state.chronicleLedger, now);
  const placement = previewChroniclePlacement(normalizedLedger, { resourceId, polarity });
  const claimedHouseIds = getClaimedHouseIds(state);
  const signedByHouseId = candidate.signedByHouseId === undefined || candidate.signedByHouseId === ""
    ? houseId
    : isHouseId(candidate.signedByHouseId)
      ? candidate.signedByHouseId
      : "";

  if (!signedByHouseId || !claimedHouseIds.includes(signedByHouseId)) {
    throw new AgendaStateError("참여 가문만 크로니클 스티커에 서명할 수 있습니다.", 400);
  }

  const inputId = sanitizeSingleLineText(candidate.id, CHRONICLE_LEDGER_ID_LIMIT);
  const usedIds = new Set(Object.values(normalizedLedger).flat().map((entry) => entry.id));
  const id = inputId && !usedIds.has(inputId) ? inputId : crypto.randomUUID();
  const entry: ChronicleStickerEntry = {
    id,
    stickerCode,
    resourceId,
    polarity,
    signedByHouseId,
    signedByName: getHouseLabel(state, signedByHouseId),
    ageMarks: sanitizeCounter(candidate.ageMarks, 6, 0),
    slotIndex: placement.slotIndex,
    sourceDilemmaHistoryId: sanitizeSingleLineText(candidate.sourceDilemmaHistoryId, DILEMMA_HISTORY_ID_LIMIT),
    sourceCardCode: sanitizeSingleLineText(candidate.sourceCardCode, CHRONICLE_LEDGER_CODE_LIMIT),
    placedAt: now,
    updatedAt: now,
    replacedAt: "",
    note: sanitizeMultilineText(candidate.note, CHRONICLE_LEDGER_NOTE_LIMIT),
    photos: sanitizeRecordAttachments(candidate.photos, now),
  };
  const nextLedger: ChronicleLedger = {
    ...normalizedLedger,
    [resourceId]: normalizedLedger[resourceId].map((existing) =>
      placement.replacedStickerId && existing.id === placement.replacedStickerId
        ? { ...existing, replacedAt: now, updatedAt: now }
        : existing,
    ),
  };
  nextLedger[resourceId] = [...nextLedger[resourceId], entry];

  return {
    ...state,
    chronicleLedger: nextLedger,
    version: state.version + 1,
    updatedAt: now,
  };
}

export function updateChronicleSticker(
  state: GameState,
  houseId: HouseId,
  stickerId: unknown,
  patch: unknown,
  now = new Date().toISOString(),
): GameState {
  assertCanMutateChronicleLedger(state, houseId);

  const targetStickerId = sanitizeSingleLineText(stickerId, CHRONICLE_LEDGER_ID_LIMIT);
  const candidate = patch && typeof patch === "object" ? (patch as Partial<ChronicleStickerEntry>) : {};
  const normalizedLedger = sanitizeChronicleLedger(state.chronicleLedger, now);
  let found = false;
  const nextLedger = mapChronicleLedgerEntries(normalizedLedger, (entry) => {
    if (entry.id !== targetStickerId) {
      return entry;
    }

    found = true;
    const nextPolarity = candidate.polarity === undefined
      ? entry.polarity
      : sanitizeChroniclePolarity(candidate.polarity) || entry.polarity;

    return {
      ...entry,
      stickerCode: candidate.stickerCode === undefined
        ? entry.stickerCode
        : sanitizeSingleLineText(candidate.stickerCode, CHRONICLE_LEDGER_CODE_LIMIT) || entry.stickerCode,
      polarity: nextPolarity,
      ageMarks: candidate.ageMarks === undefined ? entry.ageMarks : sanitizeCounter(candidate.ageMarks, 6, entry.ageMarks),
      sourceDilemmaHistoryId: candidate.sourceDilemmaHistoryId === undefined
        ? entry.sourceDilemmaHistoryId
        : sanitizeSingleLineText(candidate.sourceDilemmaHistoryId, DILEMMA_HISTORY_ID_LIMIT),
      sourceCardCode: candidate.sourceCardCode === undefined
        ? entry.sourceCardCode
        : sanitizeSingleLineText(candidate.sourceCardCode, CHRONICLE_LEDGER_CODE_LIMIT),
      note: candidate.note === undefined ? entry.note : sanitizeMultilineText(candidate.note, CHRONICLE_LEDGER_NOTE_LIMIT),
      photos: candidate.photos === undefined ? entry.photos : sanitizeRecordAttachments(candidate.photos, now),
      updatedAt: now,
    };
  });

  if (!found) {
    throw new AgendaStateError("수정할 크로니클 스티커를 찾을 수 없습니다.", 404);
  }

  return {
    ...state,
    chronicleLedger: nextLedger,
    version: state.version + 1,
    updatedAt: now,
  };
}

export function deleteChronicleSticker(
  state: GameState,
  houseId: HouseId,
  stickerId: unknown,
  now = new Date().toISOString(),
): GameState {
  assertCanMutateChronicleLedger(state, houseId);

  const targetStickerId = sanitizeSingleLineText(stickerId, CHRONICLE_LEDGER_ID_LIMIT);
  const normalizedLedger = sanitizeChronicleLedger(state.chronicleLedger, now);
  let found = false;
  const nextLedger = mapChronicleLedgerEntries(normalizedLedger, (entry) => {
    if (entry.id !== targetStickerId) {
      return entry;
    }

    found = true;
    return null;
  });

  if (!found) {
    throw new AgendaStateError("삭제할 크로니클 스티커를 찾을 수 없습니다.", 404);
  }

  return {
    ...state,
    chronicleLedger: nextLedger,
    version: state.version + 1,
    updatedAt: now,
  };
}

export function saveCampaignEnvelope(
  state: GameState,
  houseId: HouseId,
  input: unknown,
  now = new Date().toISOString(),
): GameState {
  assertCanMutateChronicleLedger(state, houseId);

  const candidate = input && typeof input === "object" ? (input as Partial<CampaignEnvelopeEntry>) : {};
  const code = sanitizeSingleLineText(candidate.code, CHRONICLE_LEDGER_CODE_LIMIT);

  if (!code) {
    throw new AgendaStateError("봉투 코드를 입력하세요.", 400);
  }

  const normalizedLedger = sanitizeCampaignLedger(state.campaignLedger, now);
  const entry: CampaignEnvelopeEntry = {
    code,
    openedAt: typeof candidate.openedAt === "string" && candidate.openedAt ? candidate.openedAt : now,
    sourceDilemmaHistoryId: sanitizeSingleLineText(candidate.sourceDilemmaHistoryId, DILEMMA_HISTORY_ID_LIMIT),
    note: sanitizeMultilineText(candidate.note, CHRONICLE_LEDGER_NOTE_LIMIT),
    photos: sanitizeRecordAttachments(candidate.photos, now),
  };

  return {
    ...state,
    campaignLedger: {
      ...normalizedLedger,
      openedEnvelopes: {
        ...normalizedLedger.openedEnvelopes,
        [code]: entry,
      },
    },
    version: state.version + 1,
    updatedAt: now,
  };
}

export function deleteCampaignEnvelope(
  state: GameState,
  houseId: HouseId,
  code: unknown,
  now = new Date().toISOString(),
): GameState {
  assertCanMutateChronicleLedger(state, houseId);

  const targetCode = sanitizeSingleLineText(code, CHRONICLE_LEDGER_CODE_LIMIT);
  const normalizedLedger = sanitizeCampaignLedger(state.campaignLedger, now);

  if (!targetCode || !normalizedLedger.openedEnvelopes[targetCode]) {
    throw new AgendaStateError("삭제할 봉투 기록을 찾을 수 없습니다.", 404);
  }

  const { [targetCode]: _removed, ...openedEnvelopes } = normalizedLedger.openedEnvelopes;

  return {
    ...state,
    campaignLedger: {
      ...normalizedLedger,
      openedEnvelopes,
    },
    version: state.version + 1,
    updatedAt: now,
  };
}

export function saveCampaignCard(
  state: GameState,
  houseId: HouseId,
  cardKind: unknown,
  input: unknown,
  now = new Date().toISOString(),
): GameState {
  assertCanMutateChronicleLedger(state, houseId);

  const targetKey = getCampaignCardLedgerKey(cardKind);
  const candidate = input && typeof input === "object" ? (input as Partial<CampaignCardEntry>) : {};
  const code = sanitizeSingleLineText(candidate.code, CHRONICLE_LEDGER_CODE_LIMIT);

  if (!code) {
    throw new AgendaStateError("카드 코드를 입력하세요.", 400);
  }

  const normalizedLedger = sanitizeCampaignLedger(state.campaignLedger, now);
  const entry: CampaignCardEntry = {
    code,
    status: sanitizeCampaignCardStatus(candidate.status),
    sourceEnvelopeCode: sanitizeSingleLineText(candidate.sourceEnvelopeCode, CHRONICLE_LEDGER_CODE_LIMIT),
    sourceDilemmaHistoryId: sanitizeSingleLineText(candidate.sourceDilemmaHistoryId, DILEMMA_HISTORY_ID_LIMIT),
    note: sanitizeMultilineText(candidate.note, CHRONICLE_LEDGER_NOTE_LIMIT),
    updatedAt: now,
    photos: sanitizeRecordAttachments(candidate.photos, now),
  };

  return {
    ...state,
    campaignLedger: {
      ...normalizedLedger,
      [targetKey]: {
        ...normalizedLedger[targetKey],
        [code]: entry,
      },
    },
    version: state.version + 1,
    updatedAt: now,
  };
}

export function deleteCampaignCard(
  state: GameState,
  houseId: HouseId,
  cardKind: unknown,
  code: unknown,
  now = new Date().toISOString(),
): GameState {
  assertCanMutateChronicleLedger(state, houseId);

  const targetKey = getCampaignCardLedgerKey(cardKind);
  const targetCode = sanitizeSingleLineText(code, CHRONICLE_LEDGER_CODE_LIMIT);
  const normalizedLedger = sanitizeCampaignLedger(state.campaignLedger, now);

  if (!targetCode || !normalizedLedger[targetKey][targetCode]) {
    throw new AgendaStateError("삭제할 카드 기록을 찾을 수 없습니다.", 404);
  }

  const { [targetCode]: _removed, ...cards } = normalizedLedger[targetKey];

  return {
    ...state,
    campaignLedger: {
      ...normalizedLedger,
      [targetKey]: cards,
    },
    version: state.version + 1,
    updatedAt: now,
  };
}

export function saveMysterySticker(
  state: GameState,
  houseId: HouseId,
  input: unknown,
  now = new Date().toISOString(),
): GameState {
  assertCanMutateChronicleLedger(state, houseId);

  const candidate = input && typeof input === "object" ? (input as Partial<MysteryStickerEntry>) : {};
  const dossierLetter = sanitizeDossierLetter(candidate.dossierLetter);
  const storylineSymbol = sanitizeSingleLineText(candidate.storylineSymbol, CHRONICLE_LEDGER_CODE_LIMIT);
  const slotKey = sanitizeSingleLineText(candidate.slotKey, DILEMMA_SLOT_LIMIT);

  if (!dossierLetter || !storylineSymbol || !slotKey) {
    throw new AgendaStateError("미스터리 스티커의 서류철, 기호, 칸을 입력하세요.", 400);
  }

  const normalizedLedger = sanitizeCampaignLedger(state.campaignLedger, now);
  const entry: MysteryStickerEntry = {
    dossierLetter,
    storylineSymbol,
    slotKey,
    sourceDilemmaHistoryId: sanitizeSingleLineText(candidate.sourceDilemmaHistoryId, DILEMMA_HISTORY_ID_LIMIT),
    attachedAt: typeof candidate.attachedAt === "string" && candidate.attachedAt ? candidate.attachedAt : now,
    note: sanitizeMultilineText(candidate.note, CHRONICLE_LEDGER_NOTE_LIMIT),
    photos: sanitizeRecordAttachments(candidate.photos, now),
  };

  return {
    ...state,
    campaignLedger: {
      ...normalizedLedger,
      mysteryStickers: {
        ...normalizedLedger.mysteryStickers,
        [slotKey]: entry,
      },
    },
    version: state.version + 1,
    updatedAt: now,
  };
}

export function deleteMysterySticker(
  state: GameState,
  houseId: HouseId,
  slotKey: unknown,
  now = new Date().toISOString(),
): GameState {
  assertCanMutateChronicleLedger(state, houseId);

  const targetSlotKey = sanitizeSingleLineText(slotKey, DILEMMA_SLOT_LIMIT);
  const normalizedLedger = sanitizeCampaignLedger(state.campaignLedger, now);

  if (!targetSlotKey || !normalizedLedger.mysteryStickers[targetSlotKey]) {
    throw new AgendaStateError("삭제할 미스터리 스티커 기록을 찾을 수 없습니다.", 404);
  }

  const { [targetSlotKey]: _removed, ...mysteryStickers } = normalizedLedger.mysteryStickers;

  return {
    ...state,
    campaignLedger: {
      ...normalizedLedger,
      mysteryStickers,
    },
    version: state.version + 1,
    updatedAt: now,
  };
}

export function applyCampaignBackfill(
  state: GameState,
  houseId: HouseId,
  input: unknown,
  now = new Date().toISOString(),
): GameState {
  assertCanMutateChronicleLedger(state, houseId);

  const candidate = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const claimedHouseIds = getClaimedHouseIds(state);
  const chronicleLedger = sanitizeCampaignBackfillChronicleLedger(candidate.chronicleEntries, state, claimedHouseIds, now);
  const campaignLedger = sanitizeCampaignLedger({
    openedEnvelopes: arrayToRecord(candidate.envelopes, "code"),
    storyCards: arrayToRecord(candidate.storyCards, "code"),
    eventCards: arrayToRecord(candidate.eventCards, "code"),
    mysteryStickers: arrayToRecord(candidate.mysteryStickers, "slotKey"),
  }, now);

  return {
    ...state,
    chronicleLedger,
    campaignLedger,
    version: state.version + 1,
    updatedAt: now,
  };
}

export function ageChroniclesForNextGame(
  state: GameState,
  houseId: HouseId,
  now = new Date().toISOString(),
): GameState {
  assertCanMutateChronicleLedger(state, houseId);

  return {
    ...state,
    chronicleLedger: ageChronicleLedger(sanitizeChronicleLedger(state.chronicleLedger, now)),
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

  if (!participants.includes(houseId)) {
    throw new AgendaStateError("로그인 중인 딜레마 참여 가문만 투표 집계를 기록할 수 있습니다.", 403);
  }

  // 집계 기록(`voteNotes` 확정)은 딜레마 작성자만 진행합니다. `updatedBy`는 마지막 편집 저장 가문 추적용이며 여기서 덮어쓰지 않습니다.
  const flowOwner = getDilemmaFlowOwnerHouseId(state, currentDilemma);
  if (!isAdminHouse(state, houseId) && flowOwner !== houseId) {
    throw new AgendaStateError("딜레마를 작성한 가문만 투표 집계를 기록할 수 있습니다.", 403);
  }

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

  assertDilemmaVotesCanBeSettled(state, votes, participants);

  const ayePower = sumDilemmaVotePower(votes, participants, "aye");
  const nayPower = sumDilemmaVotePower(votes, participants, "nay");
  const passCount = participants.filter((participantId) => isDilemmaPassSide(votes[participantId]?.side)).length;

  // 영문 룰북 v35 : AYE vs NAY 권력 합 비교로 승패. 동률·전원 기권은 중재자 결정.
  let selectedOutcome: DilemmaVoteSide | "" = "";

  if (ayePower > nayPower) {
    selectedOutcome = "aye";
  } else if (nayPower > ayePower) {
    selectedOutcome = "nay";
  }

  const tallyLine = `투표 집계: 찬성 ${ayePower} / 반대 ${nayPower} / 기권 ${passCount}.`;
  const nextDilemmaBase: DilemmaRecord = {
    ...currentDilemma,
    votes: Object.fromEntries(participants.map((participantId) => [participantId, votes[participantId]])),
    voteNotes:
      selectedOutcome !== ""
        ? `${tallyLine} 권력 다수는 「${selectedOutcome === "aye" ? "찬성" : "반대"}」입니다.`
        : `${tallyLine} 찬성과 반대 권력이 같거나 전원 기권이면 중재자가 승리 쪽을 정합니다(§4).`,
    ...(selectedOutcome ? { selectedOutcome } : {}),
    updatedAt: now,
  };

  const nextDilemma: DilemmaRecord = selectedOutcome
    ? {
        ...nextDilemmaBase,
        voteSettlement: buildDilemmaVoteSettlement(state, nextDilemmaBase, participants, selectedOutcome, now),
      }
    : {
        ...nextDilemmaBase,
        voteSettlement: createDefaultDilemmaVoteSettlement(),
      };

  return {
    ...state,
    dilemma: nextDilemma,
    version: state.version + 1,
    updatedAt: now,
  };
}

/** 찬성/반대 권력 합이 동점일 때 중재자만 결과(찬성/반대)를 확정합니다. 집계 기록(apply) 이후에만 호출됩니다. */
export function resolveModeratorDecision(
  state: GameState,
  houseId: HouseId,
  decision: unknown,
  now = new Date().toISOString(),
): GameState {
  const currentDilemma = getDilemmaForVoting(state, houseId, now);
  const participants = getDilemmaVotingParticipants(state);

  if (currentDilemma.selectedOutcome) {
    throw new AgendaStateError("이미 결과가 선택된 딜레마 투표입니다.", 409);
  }

  if (!currentDilemma.voteNotes?.trim()) {
    throw new AgendaStateError("먼저 투표 집계를 기록한 뒤 중재자 결정을 진행하세요.", 409);
  }

  const moderator = sanitizeRoleHouseId(state.dilemmaModerator, participants);
  if (!isAdminHouse(state, houseId) && (!moderator || moderator !== houseId)) {
    throw new AgendaStateError("중재자만 동점을 결정할 수 있습니다.", 403);
  }

  const votes = sanitizeDilemmaVotes(currentDilemma.votes, now);
  const missingHouse = participants.find((participantId) => !votes[participantId]?.side);

  if (missingHouse) {
    throw new AgendaStateError("로그인 중인 모든 가문이 찬성/반대/기권을 선택해야 합니다.", 409);
  }

  assertDilemmaVotesCanBeSettled(state, votes, participants);

  const ayePower = sumDilemmaVotePower(votes, participants, "aye");
  const nayPower = sumDilemmaVotePower(votes, participants, "nay");

  if (ayePower !== nayPower) {
    throw new AgendaStateError("찬성과 반대 권력 합계가 같을 때만 중재자 결정이 필요합니다.", 409);
  }

  const side: DilemmaVoteSide = decision === "aye" || decision === "nay" ? decision : "";

  if (!side) {
    throw new AgendaStateError("중재 결정은 찬성(aye) 또는 반대(nay)여야 합니다.", 400);
  }

  const nextDilemma: DilemmaRecord = {
    ...currentDilemma,
    votes: Object.fromEntries(participants.map((participantId) => [participantId, votes[participantId]])),
    selectedOutcome: side,
    updatedAt: now,
  };

  return {
    ...state,
    dilemma: {
      ...nextDilemma,
      voteSettlement: buildDilemmaVoteSettlement(state, nextDilemma, participants, side, now),
    },
    version: state.version + 1,
    updatedAt: now,
  };
}

export function applyDilemmaVoteSettlement(
  state: GameState,
  houseId: HouseId,
  now = new Date().toISOString(),
): GameState {
  const currentDilemma = getDilemmaForVoting(state, houseId, now);
  const participants = getDilemmaVotingParticipants(state);

  if (!participants.includes(houseId)) {
    throw new AgendaStateError("로그인 중인 딜레마 참여 가문만 투표 정산을 적용할 수 있습니다.", 403);
  }

  if (!currentDilemma.selectedOutcome) {
    throw new AgendaStateError("찬성/반대 결과가 확정된 뒤 투표 정산을 적용할 수 있습니다.", 409);
  }

  const settlement =
    currentDilemma.voteSettlement?.proposal && currentDilemma.voteSettlement.status !== "none"
      ? currentDilemma.voteSettlement
      : buildDilemmaVoteSettlement(state, currentDilemma, participants, currentDilemma.selectedOutcome, now);

  if (settlement.status === "applied") {
    throw new AgendaStateError("이미 투표 정산을 적용했습니다.", 409);
  }

  if (!settlement.proposal) {
    throw new AgendaStateError("적용할 투표 정산 내역을 만들 수 없습니다.", 409);
  }

  const nextInventories = { ...state.inventories };
  for (const [targetHouseId, delta] of Object.entries(settlement.proposal.inventoryDeltas)) {
    if (!isHouseId(targetHouseId) || !delta) {
      continue;
    }

    nextInventories[targetHouseId] = applyInventoryDelta(getPlayerInventory(state, targetHouseId), delta, now);
  }

  return {
    ...state,
    inventories: nextInventories,
    neutralPowerPool: {
      powerTokens: clampCounterValue(settlement.proposal.neutralPowerAfter, NEUTRAL_POWER_POOL_LIMIT),
      updatedAt: now,
    },
    dilemmaLeader: settlement.proposal.leaderHouseId || state.dilemmaLeader,
    dilemmaModerator: settlement.proposal.moderatorHouseId || state.dilemmaModerator,
    dilemma: {
      ...currentDilemma,
      voteSettlement: {
        ...settlement,
        status: "applied",
        appliedAt: now,
        appliedBy: houseId,
      },
      updatedAt: now,
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

export function applySessionEndRewards(
  state: GameState,
  houseId: HouseId,
  boardPositions: unknown,
  causeValue: unknown,
  now = new Date().toISOString(),
): GameState {
  if (state.sessionEndRewardsAppliedAt) {
    throw new AgendaStateError("이번 회기의 명망·갈망 및 성향 보상은 이미 적용되었습니다.", 409);
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

export function applyOpenAgendaAssignments(
  state: GameState,
  houseId: HouseId,
  assignments: unknown,
  now = new Date().toISOString(),
): GameState {
  if (state.phase !== "complete") {
    throw new AgendaStateError("비밀 의제 배정이 끝난 뒤 공개 의제를 배정할 수 있습니다.", 409);
  }

  const activeHouseIds = getClaimedHouseIds(state);
  if (!activeHouseIds.includes(houseId)) {
    throw new AgendaStateError("참여 가문만 공개 의제 배정을 적용할 수 있습니다.", 403);
  }

  const nextProgress = applyOpenAgendaAssignmentsToProgress(state, activeHouseIds, assignments, now);

  return {
    ...state,
    progress: nextProgress,
    version: state.version + 1,
    updatedAt: now,
  };
}

function applyOpenAgendaAssignmentsToProgress(
  state: GameState,
  activeHouseIds: HouseId[],
  assignments: unknown,
  now: string,
): Record<string, HouseProgress> {
  const nextTokensByHouse: Record<string, Record<OpenAgendaTokenPolarity, PersonalResourceId[]>> = Object.fromEntries(
    activeHouseIds.map((activeHouseId) => [
      activeHouseId,
      {
        positive: [],
        negative: [],
      },
    ]),
  );
  const candidate = assignments && typeof assignments === "object" ? (assignments as Record<string, unknown>) : {};

  for (const polarity of ["positive", "negative"] as const) {
    const polarityAssignments = candidate[polarity] && typeof candidate[polarity] === "object"
      ? (candidate[polarity] as Record<string, unknown>)
      : {};

    for (const { id: resourceId } of PERSONAL_RESOURCE_TRACKS) {
      const targetHouseId = polarityAssignments[resourceId];

      if (!isHouseId(targetHouseId) || !activeHouseIds.includes(targetHouseId)) {
        continue;
      }

      const targetTokens = nextTokensByHouse[targetHouseId][polarity];
      if (targetTokens.length < OPEN_AGENDA_TOKEN_LIMIT && !targetTokens.includes(resourceId)) {
        targetTokens.push(resourceId);
      }
    }
  }

  const nextProgress = { ...state.progress };
  for (const activeHouseId of activeHouseIds) {
    const progress = getHouseProgress(state, activeHouseId);
    nextProgress[activeHouseId] = {
      ...progress,
      openAgendaTokens: nextTokensByHouse[activeHouseId],
      updatedAt: now,
    };
  }

  return nextProgress;
}

export function saveNextGameSetupChecklist(
  state: GameState,
  houseId: HouseId,
  checklist: unknown,
  now = new Date().toISOString(),
): GameState {
  const activeHouseIds = getClaimedHouseIds(state);
  if (!activeHouseIds.includes(houseId)) {
    throw new AgendaStateError("참여 가문만 다음 게임 준비 체크리스트를 저장할 수 있습니다.", 403);
  }

  return {
    ...state,
    nextGameSetupState: {
      ...state.nextGameSetupState,
      checklist: sanitizeNextGameSetupChecklist(checklist),
    },
    version: state.version + 1,
    updatedAt: now,
  };
}

export function applyNextGameSetupAutomation(
  state: GameState,
  houseId: HouseId,
  force: unknown = false,
  now = new Date().toISOString(),
): GameState {
  if (state.phase !== "complete") {
    throw new AgendaStateError("모든 가문이 비밀 의제를 선택한 뒤 다음 게임 준비 자동화를 적용할 수 있습니다.", 409);
  }

  const activeHouseIds = getClaimedHouseIds(state);
  if (!activeHouseIds.includes(houseId)) {
    throw new AgendaStateError("참여 가문만 다음 게임 준비 자동화를 적용할 수 있습니다.", 403);
  }

  if (state.nextGameSetupState.lastAppliedAt && force !== true) {
    throw new AgendaStateError("다음 게임 준비 자동화가 이미 적용되었습니다.", 400);
  }

  const agedLedger = ageChronicleLedger(state.chronicleLedger);
  const lastLegacyResourceDeltas = calculateLegacyResourceDeltas(agedLedger);
  const lastOpenAgendaAssignments = assignOpenAgendasFromChronicles(agedLedger, activeHouseIds);
  const nextProgress = applyOpenAgendaAssignmentsToProgress(state, activeHouseIds, lastOpenAgendaAssignments, now);

  return {
    ...state,
    chronicleLedger: agedLedger,
    progress: nextProgress,
    nextGameSetupState: {
      ...state.nextGameSetupState,
      lastAppliedAt: now,
      lastAppliedBy: houseId,
      lastLegacyResourceDeltas,
      lastOpenAgendaAssignments,
    },
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
    dilemmaRolesAuthorHouseId: isComplete ? null : state.dilemmaRolesAuthorHouseId,
    dilemmaLeader: isComplete ? null : defaultDilemmaRoles.leader,
    dilemmaModerator: isComplete ? null : defaultDilemmaRoles.moderator,
    updatedAt: now,
  };
}

export function redactState(state: GameState, houseId: HouseId | null): RedactedState {
  const now = new Date().toISOString();
  const adminHouseId = getAdminHouseId(state);
  const isAdmin = Boolean(houseId && adminHouseId === houseId);
  const ownChoiceId = houseId ? state.choices[houseId] : null;
  const isCurrentTurn = houseId !== null && state.turn === houseId;
  const canDiscard = isCurrentTurn && state.phase === "discard";
  const canChoose = isCurrentTurn && state.phase === "choose" && !ownChoiceId;
  const dilemmaVoteTurn = getCurrentDilemmaVoteTurn(state, now);
  const dilemmaForVote = sanitizeDilemmaRecord(state.dilemma, now);
  const tallyLocked = Boolean(dilemmaForVote.voteNotes?.trim());
  const participantsForTally = getDilemmaVotingParticipants(state);
  const flowOwner = getDilemmaFlowOwnerHouseId(state, dilemmaForVote);
  const isDilemmaFlowOwner = houseId !== null && Boolean(flowOwner) && flowOwner === houseId;
  const canVoteDilemma =
    houseId !== null &&
    state.phase === "complete" &&
    !isDilemmaRecordBlank(dilemmaForVote) &&
    !dilemmaForVote.editLock &&
    !dilemmaForVote.selectedOutcome &&
    !tallyLocked &&
    participantsForTally.includes(houseId);
  const canApplyDilemmaVotes =
    houseId !== null &&
    state.phase === "complete" &&
    !isDilemmaRecordBlank(dilemmaForVote) &&
    !dilemmaForVote.editLock &&
    !dilemmaForVote.selectedOutcome &&
    !tallyLocked &&
    participantsForTally.includes(houseId) &&
    (isAdmin || isDilemmaFlowOwner) &&
    areDilemmaVotesComplete(state, dilemmaForVote, now);
  const dilemmaNonBlank = !isDilemmaRecordBlank(dilemmaForVote);
  const dilemmaLockedByOther =
    Boolean(dilemmaForVote.editLock) &&
    houseId !== null &&
    dilemmaForVote.editLock!.houseId !== houseId;
  const rolesReadyForDilemma = Boolean(state.dilemmaLeader && state.dilemmaModerator);
  const dilemmaResolutionEntryAvailable =
    dilemmaNonBlank &&
    rolesReadyForDilemma &&
    (Boolean(dilemmaForVote.voteNotes?.trim()) ||
      Boolean(dilemmaForVote.selectedOutcome) ||
      hasDilemmaResolutionPublishContent(dilemmaForVote));
  const canEditDilemmaRoles =
    (isAdmin && state.phase === "complete") ||
    (houseId !== null &&
      state.phase === "complete" &&
      !dilemmaLockedByOther &&
      !dilemmaNonBlank &&
      (!flowOwner || flowOwner === houseId));
  const canEnterDilemmaResolution =
    (isAdmin && state.phase === "complete" && rolesReadyForDilemma && dilemmaNonBlank) ||
    (houseId !== null &&
      state.phase === "complete" &&
      rolesReadyForDilemma &&
      isDilemmaFlowOwner &&
      dilemmaResolutionEntryAvailable &&
      !dilemmaLockedByOther);
  const canPublishDilemmaResolution =
    (isAdmin &&
      state.phase === "complete" &&
      dilemmaNonBlank &&
      isDilemmaPublishRequirementsMet(state, dilemmaForVote, now)) ||
    (houseId !== null &&
      state.phase === "complete" &&
      !dilemmaForVote.editLock &&
      dilemmaNonBlank &&
      isDilemmaFlowOwner &&
      isDilemmaPublishRequirementsMet(state, dilemmaForVote, now));
  const canResetDilemmaResult =
    (isAdmin && Boolean(flowOwner)) ||
    (houseId !== null &&
      !dilemmaLockedByOther &&
      isDilemmaFlowOwner);
  const canEditDilemmaCard =
    (isAdmin && state.phase === "complete" && rolesReadyForDilemma) ||
    (houseId !== null &&
      state.phase === "complete" &&
      rolesReadyForDilemma &&
      !dilemmaLockedByOther &&
      isDilemmaFlowOwner);
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
    dilemmaVoteTurn,
    canVoteDilemma,
    canApplyDilemmaVotes,
    canEditDilemmaRoles,
    canEnterDilemmaResolution,
    canPublishDilemmaResolution,
    canResetDilemmaResult,
    canEditDilemmaCard,
    dilemmaLeader: state.dilemmaLeader,
    dilemmaModerator: state.dilemmaModerator,
    dilemmaVoteOrder: pickStoredDilemmaVoteOrder(state.dilemmaVoteOrder, getLoggedInHouseIds(state)),
    ownChoice: ownChoiceId ? getAgenda(ownChoiceId) : null,
    ownInventory: houseId ? getPlayerInventory(state, houseId) : null,
    ownHouseProgress: houseId ? getHouseProgress(state, houseId) : null,
    dilemma: redactDilemmaRecord(state.dilemma),
    dilemmaHistory: state.dilemmaHistory,
    chronicleLedger: state.chronicleLedger,
    campaignLedger: state.campaignLedger,
    nextGameSetupState: state.nextGameSetupState,
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
    resourcePolarities: {},
    effects: [],
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
    throw new AgendaStateError("딜레마 투표 결과(찬성/반대)가 확정된 뒤 게시할 수 있습니다. 동률이면 중재자 결정을 먼저 하세요.", 409);
  }

  if (!hasDilemmaResolutionPublishContent(dilemma)) {
    throw new AgendaStateError("결과 입력 내용을 저장한 뒤 게시할 수 있습니다.", 409);
  }
}

function getSelectedDilemmaOutcomeResultText(dilemma: DilemmaRecord): string {
  if (dilemma.selectedOutcome === "aye") {
    return dilemma.aye.result || "";
  }

  if (dilemma.selectedOutcome === "nay") {
    return dilemma.nay.result || "";
  }

  return "";
}

function hasSelectedDilemmaOutcomeResult(dilemma: DilemmaRecord): boolean {
  return Boolean(dilemma.selectedOutcome && getSelectedDilemmaOutcomeResultText(dilemma).trim());
}

function hasDilemmaResolutionPublishContent(dilemma: DilemmaRecord): boolean {
  const selectedOutcome =
    dilemma.selectedOutcome === "aye" ? dilemma.aye : dilemma.selectedOutcome === "nay" ? dilemma.nay : null;

  return Boolean(
    hasSelectedDilemmaOutcomeResult(dilemma) ||
    (selectedOutcome && hasDilemmaResourceDeltas(selectedOutcome.resourceDeltas)) ||
    (selectedOutcome && selectedOutcome.effects.length > 0) ||
    dilemma.timeCounterSlot.trim() ||
    dilemma.resolutionNotes.trim() ||
    resolutionChecklistHasContent(dilemma.resolutionChecklist) ||
    dilemma.resolutionPhotos.length
  );
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

function isDilemmaPublishRequirementsMet(state: GameState, dilemma: DilemmaRecord, now: string): boolean {
  const readiness = getDilemmaVoteReadiness(state, dilemma, now);
  return (
    readiness.participants.length > 0 &&
    !readiness.missingHouse &&
    Boolean(dilemma.selectedOutcome) &&
    hasDilemmaResolutionPublishContent(dilemma)
  );
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

  if (
    currentDilemma.selectedOutcome ||
    currentDilemma.editLock ||
    isDilemmaRecordBlank(currentDilemma) ||
    currentDilemma.voteNotes?.trim()
  ) {
    return null;
  }

  // 협상·동시 투표: 서버는 제출 순서를 강제하지 않는다(UI에서 시계방향 권장 차례만 표시 가능).
  return null;
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

function sanitizeResolutionChecklist(value: unknown): DilemmaResolutionChecklist {
  if (!value || typeof value !== "object") {
    return {};
  }

  const candidate = value as Record<string, unknown>;
  const next: DilemmaResolutionChecklist = {};

  for (const key of ["a", "b", "c", "d", "e", "f"] as const) {
    if (candidate[key] === true) {
      next[key] = true;
    }
  }

  if (typeof candidate.memo === "string") {
    const memo = sanitizeSingleLineText(candidate.memo, DILEMMA_CHECKLIST_MEMO_LIMIT).trim();

    if (memo) {
      next.memo = memo;
    }
  }

  return next;
}

function resolutionChecklistHasContent(checklist: unknown): boolean {
  const normalized = sanitizeResolutionChecklist(checklist);

  return Boolean(
    normalized.a ||
      normalized.b ||
      normalized.c ||
      normalized.d ||
      normalized.e ||
      normalized.f ||
      normalized.memo?.trim(),
  );
}

function sanitizeDilemmaRecord(value: unknown, now: string): DilemmaRecord {
  if (!value || typeof value !== "object") {
    return createDefaultDilemmaRecord(now);
  }

  const candidate = value as Partial<DilemmaRecord>;
  const aye = sanitizeDilemmaOutcome(candidate.aye, now);
  const nay = sanitizeDilemmaOutcome(candidate.nay, now);
  const selectedOutcome = sanitizeDilemmaVoteSide(candidate.selectedOutcome);

  return {
    historyId: sanitizeSingleLineText(candidate.historyId, DILEMMA_HISTORY_ID_LIMIT),
    cardCode: sanitizeSingleLineText(candidate.cardCode, DILEMMA_CODE_LIMIT),
    title: sanitizeSingleLineText(candidate.title, DILEMMA_TITLE_LIMIT),
    mysteryStickerId: sanitizeMysteryStickerId(candidate.mysteryStickerId),
    timeCounterSlot: sanitizeSingleLineText(candidate.timeCounterSlot, DILEMMA_SLOT_LIMIT),
    context: sanitizeMultilineText(candidate.context, DILEMMA_LONG_TEXT_LIMIT),
    question: sanitizeMultilineText(candidate.question, DILEMMA_LONG_TEXT_LIMIT),
    councilNotes: sanitizeMultilineText(candidate.councilNotes, DILEMMA_LONG_TEXT_LIMIT),
    aye,
    nay,
    selectedOutcome,
    voteNotes: sanitizeMultilineText(candidate.voteNotes, DILEMMA_LONG_TEXT_LIMIT),
    resolutionNotes: sanitizeMultilineText(candidate.resolutionNotes, DILEMMA_LONG_TEXT_LIMIT),
    resolutionChecklist: sanitizeResolutionChecklist(candidate.resolutionChecklist),
    votes: sanitizeDilemmaVotes(candidate.votes, now),
    voteSettlement: sanitizeDilemmaVoteSettlement(candidate.voteSettlement, now),
    photos: sanitizeDilemmaPhotos(candidate.photos, now),
    resolutionPhotos: sanitizeDilemmaPhotos(candidate.resolutionPhotos, now),
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
    updatedBy: isHouseId(candidate.updatedBy) ? candidate.updatedBy : null,
    updatedByName: sanitizeSingleLineText(candidate.updatedByName, DILEMMA_HOUSE_NAME_LIMIT),
    dilemmaAuthorHouseId: isHouseId(candidate.dilemmaAuthorHouseId) ? candidate.dilemmaAuthorHouseId : null,
    editLock: sanitizeDilemmaEditLock(candidate.editLock, now),
  };
}

function sanitizeNeutralPowerPool(value: unknown, now: string): NeutralPowerPool {
  const candidate = value && typeof value === "object" ? (value as Partial<NeutralPowerPool>) : {};

  return {
    powerTokens: sanitizeCounter(candidate.powerTokens, NEUTRAL_POWER_POOL_LIMIT, NEUTRAL_POWER_POOL_DEFAULT),
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
  };
}

function sanitizeDilemmaVoteSettlement(value: unknown, now: string): DilemmaVoteSettlement {
  if (!value || typeof value !== "object") {
    return createDefaultDilemmaVoteSettlement();
  }

  const candidate = value as Partial<DilemmaVoteSettlement>;
  const proposal = sanitizeDilemmaVoteSettlementProposal(candidate.proposal, now);
  const status =
    candidate.status === "applied" && proposal
      ? "applied"
      : candidate.status === "proposed" && proposal
        ? "proposed"
        : "none";

  return {
    status,
    proposal: status === "none" ? null : proposal,
    appliedAt: typeof candidate.appliedAt === "string" ? candidate.appliedAt : "",
    appliedBy: isHouseId(candidate.appliedBy) ? candidate.appliedBy : null,
  };
}

function sanitizeDilemmaEndTrigger(value: unknown): DilemmaEndTrigger {
  return value === "none" || value === "king_death" || value === "abdication_top" || value === "abdication_bottom"
    ? value
    : "";
}

function sanitizeDilemmaVoteSettlementProposal(value: unknown, now: string): DilemmaVoteSettlementProposal | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<DilemmaVoteSettlementProposal>;
  const participants = Array.isArray(candidate.participants)
    ? candidate.participants.filter((houseId): houseId is HouseId => isHouseId(houseId))
    : [];
  const outcome = sanitizeDilemmaVoteSide(candidate.outcome);

  if (!outcome || participants.length === 0) {
    return null;
  }

  const tally = candidate.tally && typeof candidate.tally === "object" ? candidate.tally : {};
  const deltas =
    candidate.inventoryDeltas && typeof candidate.inventoryDeltas === "object"
      ? (candidate.inventoryDeltas as Record<string, unknown>)
      : {};

  return {
    participants,
    outcome,
    tally: {
      ayePower: sanitizeCounter((tally as any).ayePower, DILEMMA_VOTE_POWER_LIMIT * REQUIRED_HOUSE_COUNT, 0),
      nayPower: sanitizeCounter((tally as any).nayPower, DILEMMA_VOTE_POWER_LIMIT * REQUIRED_HOUSE_COUNT, 0),
      passCount: sanitizeCounter((tally as any).passCount, REQUIRED_HOUSE_COUNT, 0),
      moderatorPassCount: sanitizeCounter((tally as any).moderatorPassCount, 1, 0),
    },
    neutralPowerBefore: sanitizeCounter(candidate.neutralPowerBefore, NEUTRAL_POWER_POOL_LIMIT, 0),
    neutralPowerDistributed: sanitizeCounter(candidate.neutralPowerDistributed, NEUTRAL_POWER_POOL_LIMIT, 0),
    neutralPowerAfter: sanitizeCounter(candidate.neutralPowerAfter, NEUTRAL_POWER_POOL_LIMIT, 0),
    inventoryDeltas: Object.fromEntries(
      Object.entries(deltas)
        .filter(([houseId]) => isHouseId(houseId))
        .map(([houseId, delta]) => [houseId, sanitizeDilemmaVoteSettlementDelta(delta)]),
    ),
    leaderHouseId: isHouseId(candidate.leaderHouseId) ? candidate.leaderHouseId : null,
    moderatorHouseId: isHouseId(candidate.moderatorHouseId) ? candidate.moderatorHouseId : null,
    warnings: Array.isArray(candidate.warnings)
      ? candidate.warnings.map((warning) => sanitizeSingleLineText(warning, DILEMMA_LONG_TEXT_LIMIT)).filter(Boolean)
      : [],
    createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : now,
  };
}

function sanitizeDilemmaVoteSettlementDelta(value: unknown): DilemmaVoteSettlementDelta {
  const candidate = value && typeof value === "object" ? (value as Partial<DilemmaVoteSettlementDelta>) : {};

  return {
    coins: clampSignedCounterValue(candidate.coins, PERSONAL_COUNTER_LIMITS.coins),
    powerTokens: clampSignedCounterValue(candidate.powerTokens, DILEMMA_VOTE_POWER_LIMIT),
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

function sanitizeDilemmaOutcome(value: unknown, now: string): DilemmaOutcome {
  if (!value || typeof value !== "object") {
    return createDefaultDilemmaOutcome();
  }

  const candidate = value as Partial<DilemmaOutcome>;
  const resourceDeltas = sanitizeDilemmaResourceDeltas(candidate.resourceDeltas);
  const effects = sanitizeDilemmaOutcomeEffects(candidate.effects, now);
  const normalizedEffects = effects.length ? effects : deriveDilemmaResourceEffects(resourceDeltas);
  const normalizedResourceDeltas = hasDilemmaResourceDeltas(resourceDeltas)
    ? resourceDeltas
    : summarizeDilemmaResourceEffects(normalizedEffects);
  const resourcePolarities = sanitizeDilemmaResourcePolarities(candidate.resourcePolarities, normalizedResourceDeltas);

  return {
    preview: sanitizeMultilineText(candidate.preview, DILEMMA_LONG_TEXT_LIMIT),
    result: sanitizeMultilineText(candidate.result, DILEMMA_LONG_TEXT_LIMIT),
    resourcePolarities,
    resourceDeltas: normalizedResourceDeltas,
    effects: normalizedEffects,
  };
}

function sanitizeChronicleLedger(value: unknown, now: string): ChronicleLedger {
  const candidate = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const ledger = createDefaultChronicleLedger();

  for (const resourceId of PERSONAL_RESOURCE_TRACKS.map((resource) => resource.id) as ChronicleResourceId[]) {
    const entries = Array.isArray(candidate[resourceId]) ? candidate[resourceId] : [];
    const seenIds = new Set<string>();

    ledger[resourceId] = entries
      .map((entry) => sanitizeChronicleStickerEntry(entry, resourceId, now))
      .filter((entry): entry is ChronicleStickerEntry => {
        if (!entry || seenIds.has(entry.id)) {
          return false;
        }

        seenIds.add(entry.id);
        return true;
      });
  }

  return ledger;
}

function sanitizeChronicleStickerEntry(
  value: unknown,
  fallbackResourceId: ChronicleResourceId,
  now: string,
): ChronicleStickerEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<ChronicleStickerEntry>;
  const id = sanitizeSingleLineText(candidate.id, CHRONICLE_LEDGER_ID_LIMIT);
  const stickerCode = sanitizeSingleLineText(candidate.stickerCode, CHRONICLE_LEDGER_CODE_LIMIT);
  const resourceId = sanitizeChronicleResourceId(candidate.resourceId, fallbackResourceId);
  const polarity = sanitizeChroniclePolarity(candidate.polarity);

  if (!id || !stickerCode || !polarity || resourceId !== fallbackResourceId) {
    return null;
  }

  return {
    id,
    stickerCode,
    resourceId,
    polarity,
    signedByHouseId: isHouseId(candidate.signedByHouseId) ? candidate.signedByHouseId : "",
    signedByName: sanitizeSingleLineText(candidate.signedByName, DILEMMA_HOUSE_NAME_LIMIT),
    ageMarks: sanitizeCounter(candidate.ageMarks, 6, 0),
    slotIndex: sanitizeCounter(candidate.slotIndex, CHRONICLE_ROW_CAPACITY - 1, 0),
    sourceDilemmaHistoryId: sanitizeSingleLineText(candidate.sourceDilemmaHistoryId, DILEMMA_HISTORY_ID_LIMIT),
    sourceCardCode: sanitizeSingleLineText(candidate.sourceCardCode, CHRONICLE_LEDGER_CODE_LIMIT),
    placedAt: typeof candidate.placedAt === "string" ? candidate.placedAt : now,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
    replacedAt: typeof candidate.replacedAt === "string" ? candidate.replacedAt : "",
    note: sanitizeMultilineText(candidate.note, CHRONICLE_LEDGER_NOTE_LIMIT),
    photos: sanitizeRecordAttachments(candidate.photos, now),
  };
}

function sanitizeCampaignLedger(value: unknown, now: string): CampaignLedger {
  const candidate = value && typeof value === "object" ? (value as Partial<CampaignLedger>) : {};

  return {
    openedEnvelopes: sanitizeCampaignEnvelopeEntries(candidate.openedEnvelopes, now),
    storyCards: sanitizeCampaignCardEntries(candidate.storyCards, now),
    eventCards: sanitizeCampaignCardEntries(candidate.eventCards, now),
    mysteryStickers: sanitizeMysteryStickerEntries(candidate.mysteryStickers, now),
  };
}

function sanitizeCampaignBackfillChronicleLedger(
  value: unknown,
  state: GameState,
  claimedHouseIds: readonly HouseId[],
  now: string,
): ChronicleLedger {
  const ledger = createDefaultChronicleLedger();

  if (!Array.isArray(value)) {
    return ledger;
  }

  const usedIds = new Set<string>();
  const usedSlots: Record<ChronicleResourceId, Set<number>> = {
    influence: new Set<number>(),
    wealth: new Set<number>(),
    morale: new Set<number>(),
    welfare: new Set<number>(),
    knowledge: new Set<number>(),
  };

  for (const rawEntry of value) {
    const entry = sanitizeCampaignBackfillChronicleEntry(rawEntry, state, claimedHouseIds, now, usedIds, usedSlots);

    if (entry) {
      ledger[entry.resourceId].push(entry);
    }
  }

  return ledger;
}

function sanitizeCampaignBackfillChronicleEntry(
  value: unknown,
  state: GameState,
  claimedHouseIds: readonly HouseId[],
  now: string,
  usedIds: Set<string>,
  usedSlots: Record<ChronicleResourceId, Set<number>>,
): ChronicleStickerEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<ChronicleStickerEntry>;
  const stickerCode = sanitizeSingleLineText(candidate.stickerCode, CHRONICLE_LEDGER_CODE_LIMIT);
  const resourceId = sanitizeChronicleResourceId(candidate.resourceId, "");
  const polarity = sanitizeChroniclePolarity(candidate.polarity);
  const signedByHouseId = isHouseId(candidate.signedByHouseId) && claimedHouseIds.includes(candidate.signedByHouseId)
    ? candidate.signedByHouseId
    : "";

  if (!stickerCode || !resourceId || !polarity || !signedByHouseId) {
    return null;
  }

  const slotIndex = reserveCampaignBackfillSlot(candidate.slotIndex, usedSlots[resourceId]);

  if (slotIndex === null) {
    return null;
  }

  const explicitId = sanitizeSingleLineText(candidate.id, CHRONICLE_LEDGER_ID_LIMIT);
  const fallbackId = sanitizeSingleLineText(
    `backfill-${resourceId}-${slotIndex}-${stickerCode}`,
    CHRONICLE_LEDGER_ID_LIMIT,
  );
  let id = explicitId || fallbackId || crypto.randomUUID();
  let suffix = 2;

  while (usedIds.has(id)) {
    id = sanitizeSingleLineText(`${fallbackId}-${suffix}`, CHRONICLE_LEDGER_ID_LIMIT) || crypto.randomUUID();
    suffix += 1;
  }

  usedIds.add(id);

  return {
    id,
    stickerCode,
    resourceId,
    polarity,
    signedByHouseId,
    signedByName: sanitizeSingleLineText(candidate.signedByName, DILEMMA_HOUSE_NAME_LIMIT) || getHouseLabel(state, signedByHouseId),
    ageMarks: sanitizeCounter(candidate.ageMarks, 6, 0),
    slotIndex,
    sourceDilemmaHistoryId: sanitizeSingleLineText(candidate.sourceDilemmaHistoryId, DILEMMA_HISTORY_ID_LIMIT),
    sourceCardCode: sanitizeSingleLineText(candidate.sourceCardCode, CHRONICLE_LEDGER_CODE_LIMIT),
    placedAt: now,
    updatedAt: now,
    replacedAt: "",
    note: sanitizeMultilineText(candidate.note, CHRONICLE_LEDGER_NOTE_LIMIT),
    photos: sanitizeRecordAttachments(candidate.photos, now),
  };
}

function reserveCampaignBackfillSlot(value: unknown, usedSlots: Set<number>): number | null {
  if (
    typeof value === "number"
    && Number.isFinite(value)
    && Number.isInteger(value)
    && value >= 0
    && value < CHRONICLE_ROW_CAPACITY
    && !usedSlots.has(value)
  ) {
    usedSlots.add(value);
    return value;
  }

  for (let slotIndex = 0; slotIndex < CHRONICLE_ROW_CAPACITY; slotIndex += 1) {
    if (!usedSlots.has(slotIndex)) {
      usedSlots.add(slotIndex);
      return slotIndex;
    }
  }

  return null;
}

function arrayToRecord(value: unknown, key: "code" | "slotKey"): Record<string, unknown> {
  if (!Array.isArray(value)) {
    return {};
  }

  const entries = value
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    .map((entry) => [sanitizeSingleLineText(entry[key], key === "slotKey" ? DILEMMA_SLOT_LIMIT : CHRONICLE_LEDGER_CODE_LIMIT), entry] as const)
    .filter(([entryKey]) => Boolean(entryKey));

  return Object.fromEntries(entries);
}

function sanitizeCampaignEnvelopeEntries(value: unknown, now: string): Record<string, CampaignEnvelopeEntry> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .map(([, entry]) => sanitizeCampaignEnvelopeEntry(entry, now))
    .filter((entry): entry is CampaignEnvelopeEntry => Boolean(entry))
    .map((entry) => [entry.code, entry] as const);

  return Object.fromEntries(entries);
}

function sanitizeCampaignEnvelopeEntry(value: unknown, now: string): CampaignEnvelopeEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<CampaignEnvelopeEntry>;
  const code = sanitizeSingleLineText(candidate.code, CHRONICLE_LEDGER_CODE_LIMIT);

  if (!code) {
    return null;
  }

  return {
    code,
    openedAt: typeof candidate.openedAt === "string" ? candidate.openedAt : "",
    sourceDilemmaHistoryId: sanitizeSingleLineText(candidate.sourceDilemmaHistoryId, DILEMMA_HISTORY_ID_LIMIT),
    note: sanitizeMultilineText(candidate.note, CHRONICLE_LEDGER_NOTE_LIMIT),
    photos: sanitizeRecordAttachments(candidate.photos, now),
  };
}

function sanitizeCampaignCardEntries(value: unknown, now: string): Record<string, CampaignCardEntry> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .map(([, entry]) => sanitizeCampaignCardEntry(entry, now))
    .filter((entry): entry is CampaignCardEntry => Boolean(entry))
    .map((entry) => [entry.code, entry] as const);

  return Object.fromEntries(entries);
}

function sanitizeCampaignCardEntry(value: unknown, now: string): CampaignCardEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<CampaignCardEntry>;
  const code = sanitizeSingleLineText(candidate.code, CHRONICLE_LEDGER_CODE_LIMIT);

  if (!code) {
    return null;
  }

  return {
    code,
    status: sanitizeCampaignCardStatus(candidate.status),
    sourceEnvelopeCode: sanitizeSingleLineText(candidate.sourceEnvelopeCode, CHRONICLE_LEDGER_CODE_LIMIT),
    sourceDilemmaHistoryId: sanitizeSingleLineText(candidate.sourceDilemmaHistoryId, DILEMMA_HISTORY_ID_LIMIT),
    note: sanitizeMultilineText(candidate.note, CHRONICLE_LEDGER_NOTE_LIMIT),
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : now,
    photos: sanitizeRecordAttachments(candidate.photos, now),
  };
}

function sanitizeMysteryStickerEntries(value: unknown, now: string): Record<string, MysteryStickerEntry> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .map(([, entry]) => sanitizeMysteryStickerEntry(entry, now))
    .filter((entry): entry is MysteryStickerEntry => Boolean(entry))
    .map((entry) => [entry.slotKey, entry] as const);

  return Object.fromEntries(entries);
}

function sanitizeMysteryStickerEntry(value: unknown, now: string): MysteryStickerEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<MysteryStickerEntry>;
  const dossierLetter = sanitizeDossierLetter(candidate.dossierLetter);
  const storylineSymbol = sanitizeSingleLineText(candidate.storylineSymbol, CHRONICLE_LEDGER_CODE_LIMIT);
  const slotKey = sanitizeSingleLineText(candidate.slotKey, DILEMMA_SLOT_LIMIT);

  if (!dossierLetter || !storylineSymbol || !slotKey) {
    return null;
  }

  return {
    dossierLetter,
    storylineSymbol,
    slotKey,
    sourceDilemmaHistoryId: sanitizeSingleLineText(candidate.sourceDilemmaHistoryId, DILEMMA_HISTORY_ID_LIMIT),
    attachedAt: typeof candidate.attachedAt === "string" ? candidate.attachedAt : "",
    note: sanitizeMultilineText(candidate.note, CHRONICLE_LEDGER_NOTE_LIMIT),
    photos: sanitizeRecordAttachments(candidate.photos, now),
  };
}

function sanitizeNextGameSetupState(value: unknown): NextGameSetupState {
  if (!value || typeof value !== "object") {
    return createDefaultNextGameSetupState();
  }

  const candidate = value as Partial<NextGameSetupState>;

  return {
    checklist: sanitizeNextGameSetupChecklist(candidate.checklist),
    lastAppliedAt: typeof candidate.lastAppliedAt === "string" ? candidate.lastAppliedAt : "",
    lastAppliedBy: isHouseId(candidate.lastAppliedBy) ? candidate.lastAppliedBy : null,
    lastLegacyResourceDeltas: sanitizeLegacyResourceDeltas(candidate.lastLegacyResourceDeltas),
    lastOpenAgendaAssignments: sanitizeChronicleOpenAgendaAssignments(candidate.lastOpenAgendaAssignments),
  };
}

function sanitizeNextGameSetupChecklist(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, checked]) => [sanitizeSingleLineText(key, NEXT_GAME_SETUP_CHECKLIST_KEY_LIMIT), checked === true] as const)
      .filter(([key]) => Boolean(key))
      .slice(0, NEXT_GAME_SETUP_CHECKLIST_LIMIT),
  );
}

function sanitizeLegacyResourceDeltas(value: unknown): Partial<Record<ChronicleResourceId, number>> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const candidate = value as Record<string, unknown>;
  const entries = (PERSONAL_RESOURCE_TRACKS.map((resource) => resource.id) as ChronicleResourceId[])
    .map((resourceId) => [resourceId, clampSignedCounterValue(candidate[resourceId], CHRONICLE_ROW_CAPACITY)] as const)
    .filter(([, delta]) => delta !== 0);

  return Object.fromEntries(entries) as Partial<Record<ChronicleResourceId, number>>;
}

function sanitizeChronicleOpenAgendaAssignments(value: unknown): ChronicleOpenAgendaAssignments {
  const candidate = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    positive: sanitizeChronicleOpenAgendaAssignment(candidate.positive),
    negative: sanitizeChronicleOpenAgendaAssignment(candidate.negative),
  };
}

function sanitizeChronicleOpenAgendaAssignment(value: unknown): Partial<Record<ChronicleResourceId, string>> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const candidate = value as Record<string, unknown>;
  const entries = (PERSONAL_RESOURCE_TRACKS.map((resource) => resource.id) as ChronicleResourceId[])
    .map((resourceId) => [resourceId, candidate[resourceId]] as const)
    .filter((entry): entry is readonly [ChronicleResourceId, HouseId] => isHouseId(entry[1]));

  return Object.fromEntries(entries);
}

function sanitizeChronicleResourceId(
  value: unknown,
  fallback: ChronicleResourceId | "",
): ChronicleResourceId | "" {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return isPersonalResourceId(value) ? value : "";
}

function sanitizeChroniclePolarity(value: unknown): ChroniclePolarity | "" {
  return value === "positive" || value === "negative" ? value : "";
}

function assertCanMutateChronicleLedger(state: GameState, houseId: HouseId) {
  if (!getClaimedHouseIds(state).includes(houseId)) {
    throw new AgendaStateError("참여 가문만 크로니클 원장을 수정할 수 있습니다.", 403);
  }
}

function getCampaignCardLedgerKey(cardKind: unknown): "storyCards" | "eventCards" {
  if (cardKind === "story") {
    return "storyCards";
  }

  if (cardKind === "event") {
    return "eventCards";
  }

  throw new AgendaStateError("카드 종류를 선택하세요.", 400);
}

function mapChronicleLedgerEntries(
  ledger: ChronicleLedger,
  mapEntry: (entry: ChronicleStickerEntry) => ChronicleStickerEntry | null,
): ChronicleLedger {
  return {
    influence: ledger.influence.map(mapEntry).filter((entry): entry is ChronicleStickerEntry => Boolean(entry)),
    wealth: ledger.wealth.map(mapEntry).filter((entry): entry is ChronicleStickerEntry => Boolean(entry)),
    morale: ledger.morale.map(mapEntry).filter((entry): entry is ChronicleStickerEntry => Boolean(entry)),
    welfare: ledger.welfare.map(mapEntry).filter((entry): entry is ChronicleStickerEntry => Boolean(entry)),
    knowledge: ledger.knowledge.map(mapEntry).filter((entry): entry is ChronicleStickerEntry => Boolean(entry)),
  };
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

function sanitizeDilemmaVotes(value: unknown, now: string): Partial<Record<HouseId, DilemmaVote>> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([houseId]) => isHouseId(houseId))
    .map(([houseId, vote]) => {
      const candidate = vote && typeof vote === "object" ? (vote as Partial<DilemmaVote>) : {};
      const side = sanitizeDilemmaBallotSide(candidate.side);
      const powerTokens = isDilemmaPassSide(side) ? 0 : sanitizeCounter(candidate.powerTokens, DILEMMA_VOTE_POWER_LIMIT, 0);

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

  if (isDilemmaPassSide(side)) {
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

function isDilemmaPassSide(side: unknown) {
  return side === "pass" || side === "pass_moderator";
}

function isDilemmaPowerVoteSide(side: unknown): side is "aye" | "nay" {
  return side === "aye" || side === "nay";
}

function assertDilemmaVotesCanBeSettled(
  state: GameState,
  votes: Partial<Record<HouseId, DilemmaVote>>,
  participants: HouseId[],
) {
  for (const participantId of participants) {
    const playerVote = votes[participantId];

    if (!playerVote) {
      throw new AgendaStateError("딜레마 투표 내역을 확인할 수 없습니다.", 409);
    }

    const availablePower = getPlayerInventory(state, participantId).powerTokens;

    if (isDilemmaPowerVoteSide(playerVote.side) && playerVote.powerTokens < 1) {
      throw new AgendaStateError(`${getHouseLabel(state, participantId)} 가문은 찬성/반대에 권력 토큰을 1개 이상 걸어야 합니다.`, 409);
    }

    if (playerVote.powerTokens > availablePower) {
      throw new AgendaStateError(`${getHouseLabel(state, participantId)} 가문의 권력 토큰이 부족합니다.`, 409);
    }
  }
}

function buildDilemmaVoteSettlement(
  state: GameState,
  dilemma: DilemmaRecord,
  participants: HouseId[],
  outcome: DilemmaVoteSide,
  now: string,
): DilemmaVoteSettlement {
  if (!outcome) {
    throw new AgendaStateError("정산할 딜레마 결과가 없습니다.", 409);
  }

  const votes = sanitizeDilemmaVotes(dilemma.votes, now);
  assertDilemmaVotesCanBeSettled(state, votes, participants);

  const ayePower = sumDilemmaVotePower(votes, participants, "aye");
  const nayPower = sumDilemmaVotePower(votes, participants, "nay");
  const passIds = participants.filter((participantId) => isDilemmaPassSide(votes[participantId]?.side));
  const neutralPowerBefore = clampCounterValue(state.neutralPowerPool?.powerTokens ?? NEUTRAL_POWER_POOL_DEFAULT, NEUTRAL_POWER_POOL_LIMIT);
  const inventoryDeltas: Partial<Record<HouseId, DilemmaVoteSettlementDelta>> = {};
  const warnings: string[] = [];

  const moderatorHouseId = sanitizeRoleHouseId(state.dilemmaModerator, participants);
  const leaderHouseId = determineDilemmaSettlementLeader(state, votes, participants, outcome, moderatorHouseId, warnings);

  return {
    status: "proposed",
    proposal: {
      participants,
      outcome,
      tally: {
        ayePower,
        nayPower,
        passCount: passIds.length,
        moderatorPassCount: 0,
      },
      neutralPowerBefore,
      neutralPowerDistributed: 0,
      neutralPowerAfter: neutralPowerBefore,
      inventoryDeltas,
      leaderHouseId,
      moderatorHouseId,
      warnings,
      createdAt: now,
    },
    appliedAt: "",
    appliedBy: null,
  };
}

function determineDilemmaSettlementLeader(
  state: GameState,
  votes: Partial<Record<HouseId, DilemmaVote>>,
  participants: HouseId[],
  outcome: DilemmaVoteSide,
  moderatorHouseId: HouseId | null,
  warnings: string[],
) {
  const allPassed = participants.length > 0 && participants.every((participantId) => isDilemmaPassSide(votes[participantId]?.side));

  if (allPassed) {
    if (moderatorHouseId) {
      return moderatorHouseId;
    }

    warnings.push("전원 기권이지만 중재자가 지정되어 있지 않아 리더 이동은 수기로 확인해야 합니다.");
    return null;
  }

  const currentLeader = sanitizeRoleHouseId(state.dilemmaLeader, participants);
  if (currentLeader && votes[currentLeader]?.side === outcome) {
    return currentLeader;
  }

  const winningVoters = participants.filter((participantId) => votes[participantId]?.side === outcome);
  if (winningVoters.length === 0) {
    warnings.push("승리 진영 투표자가 없어 룰북의 리더 이동을 자동 확정할 수 없습니다.");
    return null;
  }

  const maxPower = Math.max(...winningVoters.map((participantId) => votes[participantId]?.powerTokens || 0));
  const tiedWinners = winningVoters.filter((participantId) => (votes[participantId]?.powerTokens || 0) === maxPower);

  if (tiedWinners.length === 1) {
    return tiedWinners[0];
  }

  warnings.push("승리 진영 내 권력 토큰 수가 동률입니다. 중재자가 리더를 수기로 지정해야 합니다.");
  return null;
}

function addInventoryDelta(
  state: GameState,
  deltas: Partial<Record<HouseId, DilemmaVoteSettlementDelta>>,
  houseId: HouseId,
  delta: DilemmaVoteSettlementDelta,
  warnings: string[],
) {
  const currentDelta = deltas[houseId] || { coins: 0, powerTokens: 0 };
  const inventory = getPlayerInventory(state, houseId);
  const nextCoins = inventory.coins + currentDelta.coins + delta.coins;
  const nextPowerTokens = inventory.powerTokens + currentDelta.powerTokens + delta.powerTokens;

  if (nextCoins > PERSONAL_COUNTER_LIMITS.coins) {
    warnings.push(`${getHouseLabel(state, houseId)} 가문의 코인이 표시 상한을 넘습니다. 초과분은 수기로 확인하세요.`);
  }

  if (nextPowerTokens > PERSONAL_COUNTER_LIMITS.powerTokens || nextPowerTokens < 0) {
    warnings.push(`${getHouseLabel(state, houseId)} 가문의 권력 토큰이 표시 범위를 벗어납니다. 물리 토큰을 확인하세요.`);
  }

  deltas[houseId] = {
    coins: currentDelta.coins + delta.coins,
    powerTokens: currentDelta.powerTokens + delta.powerTokens,
  };
}

function applyInventoryDelta(
  inventory: PlayerInventory,
  delta: DilemmaVoteSettlementDelta,
  now: string,
): PlayerInventory {
  return {
    ...inventory,
    coins: clampCounterValue(inventory.coins + delta.coins, PERSONAL_COUNTER_LIMITS.coins),
    powerTokens: clampCounterValue(inventory.powerTokens + delta.powerTokens, PERSONAL_COUNTER_LIMITS.powerTokens),
    updatedAt: now,
  };
}

function isDilemmaRecordBlank(dilemma: DilemmaRecord) {
  const textFieldsBlank = [
    dilemma.cardCode,
    dilemma.title,
    dilemma.timeCounterSlot,
    dilemma.mysteryStickerId,
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
    !resolutionChecklistHasContent(dilemma.resolutionChecklist) &&
    !hasDilemmaResourcePolarities(dilemma.aye.resourcePolarities) &&
    !hasDilemmaResourcePolarities(dilemma.nay.resourcePolarities) &&
    !hasDilemmaResourceDeltas(dilemma.aye.resourceDeltas) &&
    !hasDilemmaResourceDeltas(dilemma.nay.resourceDeltas) &&
    dilemma.photos.length === 0 &&
    dilemma.resolutionPhotos.length === 0
  );
}

function assertCanResetDilemma(state: GameState, dilemma: DilemmaRecord, houseId: HouseId, admin = false) {
  const owner = getDilemmaFlowOwnerHouseId(state, dilemma);

  if (!owner) {
    throw new AgendaStateError("현재 초기화할 내용이 없습니다.", 409);
  }

  if (!admin && owner !== houseId) {
    throw new AgendaStateError("최초 수정한 가문만 초기화할 수 있습니다.", 403);
  }
}

function hasDilemmaResourceDeltas(value: DilemmaResourceDeltas) {
  return PERSONAL_RESOURCE_TRACKS.some(({ id }) => (value[id] || 0) !== 0);
}

function hasDilemmaResourcePolarities(value: DilemmaResourcePolarities) {
  return DILEMMA_RESULT_MARKERS.some(({ id }) => value[id] === "positive" || value[id] === "negative");
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

function sanitizeDilemmaResourcePolarities(
  value: unknown,
  fallbackDeltas: unknown = {},
): DilemmaResourcePolarities {
  const candidate = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const deltas = sanitizeDilemmaResourceDeltas(fallbackDeltas);
  const polarities: DilemmaResourcePolarities = {};

  for (const { id } of DILEMMA_RESULT_MARKERS) {
    const raw = candidate[id];
    if (raw === "positive" || raw === "negative") {
      polarities[id] = raw;
      continue;
    }

    const delta = id === "story" ? 0 : deltas[id] || 0;
    if (delta > 0) {
      polarities[id] = "positive";
    } else if (delta < 0) {
      polarities[id] = "negative";
    }
  }

  return polarities;
}

function deriveDilemmaResourceEffects(value: unknown): DilemmaOutcomeEffect[] {
  const deltas = sanitizeDilemmaResourceDeltas(value);

  return PERSONAL_RESOURCE_TRACKS
    .map(({ id }) => {
      const amount = deltas[id] || 0;

      if (amount === 0) {
        return null;
      }

      return {
        id: `resource-${id}`,
        type: "resource",
        resourceId: id,
        amount,
      } satisfies DilemmaOutcomeEffect;
    })
    .filter((effect): effect is Extract<DilemmaOutcomeEffect, { type: "resource" }> => Boolean(effect));
}

function summarizeDilemmaResourceEffects(effects: DilemmaOutcomeEffect[]): DilemmaResourceDeltas {
  const totals: Record<string, number> = {};

  for (const effect of effects) {
    if (effect.type !== "resource") {
      continue;
    }

    totals[effect.resourceId] = clampSignedCounterValue(
      (totals[effect.resourceId] || 0) + effect.amount,
      DILEMMA_RESOURCE_DELTA_LIMIT,
    );
  }

  return sanitizeDilemmaResourceDeltas(totals);
}

function sanitizeDilemmaOutcomeEffects(value: unknown, now: string): DilemmaOutcomeEffect[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => sanitizeDilemmaOutcomeEffect(item, index, now))
    .filter((effect): effect is DilemmaOutcomeEffect => Boolean(effect));
}

function sanitizeDilemmaOutcomeEffect(value: unknown, index: number, now: string): DilemmaOutcomeEffect | null {
  const candidate = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const id = sanitizeSingleLineText(candidate.id, DILEMMA_HISTORY_ID_LIMIT) || `effect-${index + 1}`;
  const photos = sanitizeRecordAttachments(candidate.photos, now);

  if (candidate.type === "resource") {
    const resourceId = isPersonalResourceId(candidate.resourceId) ? candidate.resourceId : "";
    const amount = clampSignedCounterValue(candidate.amount, DILEMMA_RESOURCE_DELTA_LIMIT);

    return resourceId && amount !== 0
      ? withDilemmaOutcomeEffectPhotos({ id, type: "resource", resourceId, amount }, photos)
      : null;
  }

  if (candidate.type === "chronicle") {
    const resourceId = isPersonalResourceId(candidate.resourceId) ? candidate.resourceId : "";
    const polarity = sanitizeChroniclePolarity(candidate.polarity);
    const stickerCode = sanitizeSingleLineText(candidate.stickerCode, DILEMMA_CODE_LIMIT);

    return resourceId && polarity && stickerCode
      ? withDilemmaOutcomeEffectPhotos({ id, type: "chronicle", resourceId, polarity, stickerCode }, photos)
      : null;
  }

  if (candidate.type === "envelope") {
    const envelopeCode = sanitizeSingleLineText(candidate.envelopeCode, DILEMMA_CODE_LIMIT);
    return envelopeCode ? withDilemmaOutcomeEffectPhotos({ id, type: "envelope", envelopeCode }, photos) : null;
  }

  if (candidate.type === "story" || candidate.type === "event") {
    const cardCode = sanitizeSingleLineText(candidate.cardCode, DILEMMA_CODE_LIMIT);
    const status = sanitizeDilemmaOutcomeCardStatus(candidate.status);

    if (!cardCode || !status) {
      return null;
    }

    if (candidate.type === "story") {
      const signedByHouseId = isHouseId(candidate.signedByHouseId) ? candidate.signedByHouseId : "";
      const signedByName = sanitizeSingleLineText(candidate.signedByName, DILEMMA_HOUSE_NAME_LIMIT);

      return withDilemmaOutcomeEffectPhotos({
        id,
        type: "story",
        cardCode,
        status,
        ...(signedByHouseId ? { signedByHouseId } : {}),
        ...(signedByName ? { signedByName } : {}),
      }, photos);
    }

    return withDilemmaOutcomeEffectPhotos({ id, type: "event", cardCode, status }, photos);
  }

  if (candidate.type === "mystery") {
    const dossierLetter = sanitizeSingleLineText(candidate.dossierLetter, DILEMMA_CODE_LIMIT);
    const storylineSymbol = sanitizeSingleLineText(candidate.storylineSymbol, DILEMMA_CODE_LIMIT);
    const slotKey = sanitizeSingleLineText(candidate.slotKey, DILEMMA_SLOT_LIMIT);

    return dossierLetter && storylineSymbol && slotKey
      ? withDilemmaOutcomeEffectPhotos({ id, type: "mystery", dossierLetter, storylineSymbol, slotKey }, photos)
      : null;
  }

  if (candidate.type === "note") {
    const text = sanitizeMultilineText(candidate.text, DILEMMA_OUTCOME_NOTE_LIMIT);
    return text ? withDilemmaOutcomeEffectPhotos({ id, type: "note", text }, photos) : null;
  }

  return null;
}

function withDilemmaOutcomeEffectPhotos<T extends DilemmaOutcomeEffect>(effect: T, photos: RecordAttachment[]): T {
  return photos.length ? { ...effect, photos } : effect;
}

function sanitizeDilemmaOutcomeCardStatus(value: unknown): CampaignCardStatus | "" {
  return value === "active" || value === "completed" || value === "archived" ? value : "";
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
    const id = sanitizeSingleLineText(candidate.id, CHRONICLE_LEDGER_ID_LIMIT);
    const mimeType = typeof candidate.mimeType === "string" ? candidate.mimeType : "";
    const dataUrl = typeof candidate.dataUrl === "string" ? candidate.dataUrl : "";

    if (
      !id ||
      seen.has(id) ||
      !DILEMMA_PHOTO_MIME_TYPES.has(mimeType) ||
      !isValidDilemmaPhotoDataUrl(dataUrl, mimeType) ||
      dataUrl.length > DILEMMA_PHOTO_DATA_URL_LIMIT
    ) {
      continue;
    }

    seen.add(id);
    photos.push({
      id,
      name: sanitizeSingleLineText(candidate.name, DILEMMA_PHOTO_NAME_LIMIT) || "기록 사진",
      mimeType,
      dataUrl,
      createdAt: typeof candidate.createdAt === "string" && candidate.createdAt ? candidate.createdAt : now,
    });

    if (photos.length >= RECORD_PHOTO_LIMIT) {
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
  if (value === "pass_moderator") {
    return "pass";
  }

  return value === "aye" || value === "nay" || value === "pass" ? value : "";
}

function sanitizeSessionEndCause(value: unknown): SessionEndCause {
  if (value === "king_death" || value === "abdication_top" || value === "abdication_bottom") {
    return value;
  }

  throw new AgendaStateError("왕의 죽음/안정도 상단 퇴위/안정도 하단 퇴위 중 종료 사유를 선택하세요.", 400);
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

function clampSignedCounterValue(value: unknown, maxAbs: number) {
  const number = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(-maxAbs, Math.min(maxAbs, Math.trunc(number)));
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
