export type HouseId = string;
type Phase = "house-select" | "discard" | "choose" | "complete";

export type PersonalResourceId = "influence" | "wealth" | "morale" | "welfare" | "knowledge";
export type DilemmaResultMarkerId = PersonalResourceId | "story";
export type DilemmaResourceDeltas = Partial<Record<PersonalResourceId, number>>;
export type OpenAgendaTokenPolarity = "positive" | "negative";
export type ChronicleResourceId = PersonalResourceId;
export type ChroniclePolarity = "positive" | "negative";
export type DilemmaResourcePolarities = Partial<Record<DilemmaResultMarkerId, ChroniclePolarity>>;

export type RecordAttachment = {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  createdAt: string;
};

export type ChronicleStickerEntry = {
  id: string;
  stickerCode: string;
  resourceId: ChronicleResourceId;
  polarity: ChroniclePolarity;
  signedByHouseId: string;
  signedByName: string;
  ageMarks: number;
  slotIndex: number;
  sourceDilemmaHistoryId: string;
  sourceCardCode: string;
  placedAt: string;
  updatedAt: string;
  replacedAt: string;
  note: string;
  photos?: RecordAttachment[];
};

export type ChronicleLedger = Record<ChronicleResourceId, ChronicleStickerEntry[]>;

export type CampaignEnvelopeEntry = {
  code: string;
  openedAt: string;
  sourceDilemmaHistoryId: string;
  note: string;
  photos?: RecordAttachment[];
};

export type CampaignCardStatus = "active" | "completed" | "archived";

export type CampaignCardEntry = {
  code: string;
  status: CampaignCardStatus;
  sourceEnvelopeCode: string;
  sourceDilemmaHistoryId: string;
  note: string;
  updatedAt: string;
  photos?: RecordAttachment[];
};

export type MysteryStickerEntry = {
  dossierLetter: string;
  storylineSymbol: string;
  slotKey: string;
  sourceDilemmaHistoryId: string;
  attachedAt: string;
  note: string;
  photos?: RecordAttachment[];
};

export type CampaignLedger = {
  openedEnvelopes: Record<string, CampaignEnvelopeEntry>;
  storyCards: Record<string, CampaignCardEntry>;
  eventCards: Record<string, CampaignCardEntry>;
  mysteryStickers: Record<string, MysteryStickerEntry>;
};

export type ChronicleOpenAgendaAssignments = Record<
  ChroniclePolarity,
  Partial<Record<ChronicleResourceId, string>>
>;

export type NextGameSetupState = {
  checklist: Record<string, boolean>;
  lastAppliedAt: string;
  lastAppliedBy: string | null;
  lastLegacyResourceDeltas: Partial<Record<ChronicleResourceId, number>>;
  lastOpenAgendaAssignments: ChronicleOpenAgendaAssignments;
};

type Agenda = {
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

type DilemmaVoteSide = "" | "aye" | "nay";
export type DilemmaBallotSide = "" | "aye" | "nay" | "pass";

type DilemmaOutcomeEffectBase = {
  id: string;
  photos?: RecordAttachment[];
};

export type DilemmaOutcomeEffect = DilemmaOutcomeEffectBase & (
  | { type: "resource"; resourceId: PersonalResourceId; amount: number }
  | {
      type: "chronicle";
      resourceId: PersonalResourceId;
      polarity: ChroniclePolarity;
      stickerCode: string;
      signedByHouseId?: HouseId;
      signedByName?: string;
    }
  | { type: "envelope"; envelopeCode: string }
  | {
      id: string;
      type: "story";
      cardCode: string;
      status: "active" | "completed" | "archived";
      signedByHouseId?: HouseId;
      signedByName?: string;
      signerBonusText?: string;
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

/** 룰북 5장 딜레마 해결 절차 기록(A–D, F). E는 timeCounterSlot와 함께 안내 */
export type DilemmaResolutionChecklist = {
  a?: boolean;
  b?: boolean;
  c?: boolean;
  d?: boolean;
  e?: boolean;
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
  voteSettlement: DilemmaVoteSettlement;
  photos: DilemmaPhoto[];
  /** 후속·결과 단계 첨부 사진(카드 작성 `photos`와 별도) */
  resolutionPhotos: DilemmaPhoto[];
  updatedAt: string;
  updatedBy: HouseId | null;
  updatedByName: string;
  /** 딜레마 플로우 소유자 fallback. 새 플로우에서는 역할을 처음 지정한 가문이 작성·게시·초기화 권한 기준. */
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
  sessionEndCause: DilemmaEndTrigger;
  sessionEndRewardsAppliedAt: string;
  sessionEndRewardsAppliedBy: HouseId | null;
  currentPlayer: HouseId | null;
  currentHouseId: HouseId | null;
  isCurrentTurn: boolean;
  canDiscard: boolean;
  canChoose: boolean;
  dilemmaVoteTurn: HouseId | null;
  canVoteDilemma: boolean;
  /** 집계 기록(apply) 가능 — 딜레마 작성자 또는 관리자이며 전원 투표 완료 시 */
  canApplyDilemmaVotes: boolean;
  /** 역할 지정 가능 — 빈 딜레마에서 플로우 소유자가 없거나 세션 가문이 소유자일 때만 true */
  canEditDilemmaRoles: boolean;
  /** 결과 입력 흐름(모달 창) — 딜레마 플로우 소유자만 */
  canEnterDilemmaResolution: boolean;
  /** 딜레마 이력 게시 — 딜레마 플로우 소유자만 true */
  canPublishDilemmaResolution: boolean;
  /** 결과 초기화 — 딜레마 플로우 소유자만 */
  canResetDilemmaResult: boolean;
  /** 카드 본문 작성/편집 — 역할을 처음 지정한 딜레마 플로우 소유자만 */
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

export type AgendaSession = {
  token: string;
  createdAt: string;
  updatedAt: string;
};


