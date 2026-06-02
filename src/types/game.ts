export type HouseId = string;
type Phase = "house-select" | "discard" | "choose" | "complete";

export type PersonalResourceId = "influence" | "wealth" | "morale" | "welfare" | "knowledge";
export type OpenAgendaTokenPolarity = "positive" | "negative";
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

export type NeutralPowerPool = {
  powerTokens: number;
  updatedAt: string;
};

export type SessionEndCause = "king_death" | "abdication_top" | "abdication_bottom";
export type RoundEndTrigger = "" | "none" | SessionEndCause;

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
  isCurrentTurn: boolean;
  canDiscard: boolean;
  canChoose: boolean;
  ownChoice: Agenda | null;
  ownInventory: PlayerInventory | null;
  ownHouseProgress: HouseProgress | null;
  adminHouseId: HouseId | null;
  adminHouseName: string;
  isAdmin: boolean;
  boardProcessingOwnerHouseId: HouseId | null;
  boardProcessingOwnerName: string;
  isBoardProcessingOwner: boolean;
  boardProcessingItems: BoardProcessingItem[];
  boardProcessingHistory: BoardProcessingHistory;
  availableAgendas?: Agenda[];
};

export type AgendaSession = {
  token: string;
  createdAt: string;
  updatedAt: string;
};
