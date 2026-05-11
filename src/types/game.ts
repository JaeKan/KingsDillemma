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
  votes: Partial<Record<HouseId, DilemmaVote>>;
  photos: DilemmaPhoto[];
  updatedAt: string;
  updatedBy: HouseId | null;
  updatedByName: string;
  editLock: DilemmaEditLock | null;
};

export type DilemmaEditDraft = Omit<DilemmaRecord, "updatedAt" | "updatedBy" | "updatedByName" | "editLock">;

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
