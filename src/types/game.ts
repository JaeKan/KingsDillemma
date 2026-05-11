export type HouseId = string;
export type Phase = "house-select" | "discard" | "choose" | "complete";

export type PersonalResourceId = "influence" | "wealth" | "morale" | "welfare" | "knowledge";
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
  houseAchievementComplete: boolean[];
  houseAchievementDetails: AchievementDetail[];
  alignmentAchievements: Record<string, number>;
  alignmentRewards: Record<string, AlignmentReward>;
  alignmentOrder: string[];
  updatedAt: string;
};

export type DilemmaVoteSide = "" | "aye" | "nay";
export type DilemmaBallotSide = "" | "aye" | "nay" | "pass" | "pass_moderator";

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

/** 룰북 5장 딜레마 해결 절차 기록(A–D, F). E는 timeCounterSlot와 함께 안내 */
export type DilemmaResolutionChecklist = {
  a?: boolean;
  b?: boolean;
  c?: boolean;
  d?: boolean;
  f?: boolean;
  /** 연대기 스티커·봉투 등 짧은 메모 */
  memo?: string;
};

export type DilemmaEditLock = {
  houseId: HouseId;
  houseName: string;
  token?: string;
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
  photos: DilemmaPhoto[];
  /** 후속·결과 단계 첨부 사진(카드 작성 `photos`와 별도) */
  resolutionPhotos: DilemmaPhoto[];
  updatedAt: string;
  updatedBy: HouseId | null;
  updatedByName: string;
  /** 최초로 빈 딜레마에 내용을 확정한 가문(saveDilemma). 이후 편집해도 바뀌지 않음. 게시·결과 초기화 권한 기준. */
  dilemmaAuthorHouseId: HouseId | null;
  editLock: DilemmaEditLock | null;
};

export type DilemmaEditDraft = Omit<
  DilemmaRecord,
  "updatedAt" | "updatedBy" | "updatedByName" | "dilemmaAuthorHouseId" | "editLock"
>;

export type DilemmaHistoryEntry = Omit<DilemmaRecord, "editLock"> & {
  savedAt: string;
  savedBy: HouseId | null;
  savedByName: string;
};

export type RedactedDilemmaRecord = Omit<DilemmaRecord, "editLock"> & {
  editLock: RedactedDilemmaEditLock | null;
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
  /** 집계 기록(apply) 가능 — 로그인 중 투표 참여 가문 중 누구나(전원 투표 완료 시); 작성자 판별에는 사용하지 않음 */
  canApplyDilemmaVotes: boolean;
  /** 결과 입력 흐름(모달 창) — `dilemmaAuthorHouseId` 고정 작성자만 */
  canEnterDilemmaResolution: boolean;
  /** 딜레마 이력 게시 — `dilemmaAuthorHouseId` 고정 작성자만 true */
  canPublishDilemmaResolution: boolean;
  /** 결과 초기화 — `dilemmaAuthorHouseId` 고정 작성자만 */
  canResetDilemmaResult: boolean;
  canEditDilemmaCard: boolean;
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

export type GameStateResponse = {
  ok: boolean;
  authenticated: boolean;
  realtimeEnabled: boolean;
  state: RedactedState;
};

