export const phaseLabels = {
  "house-select": "가문 선택",
  discard: "의제 폐기",
  choose: "의제 선택",
  complete: "딜레마 작성",
};

export const phaseCopy = {
  "house-select": "이번 회의에 참여할 5개 가문을 정합니다.",
  discard: "첫 차례 가문이 보인 의제 1장을 폐기하고 드래프트를 시작합니다.",
  choose: "차례가 된 가문만 자신의 비밀 의제를 확인합니다.",
  complete: "리더와 중재자가 지정한 값으로 이번 라운드의 딜레마를 작성합니다.",
};

export const defaultNamePattern = /^player\s*[1-5]$/i;
export const sessionEndUnavailableMessage = "비밀 의제 배정이 끝난 뒤 회기를 종료할 수 있습니다.";
export const sessionEndChecklistItems = [
  { id: "inventories", label: "모든 가문 자원 변경을 수기로 저장함" },
  { id: "scores", label: "최종 점수와 명망/갈망 반영을 확인함" },
  { id: "progress", label: "공개 의제와 업적/성향 업적 표시를 확인함" },
  { id: "board", label: "공용 보드와 물리 카드 정리를 완료함" },
];

export const ledgerAutosaveDelayMs = 500;
export const ledgerAutosaveRetryDelayMs = 1800;

export const sharedBoardSheetUrl =
  "https://docs.google.com/spreadsheets/d/1hJw0gYAeIafIFUJOBTDaC_2QR87CXyXABrOKvu3QG2M/edit?usp=sharing";

export const rulebookPdfUrl = "/king_dilemma_rulebook.pdf";
export const specialAbilityLegendImageUrl = "/rulebook-special-ability-legend.png";
export const specialAbilityIconUrls = {
  instant: "/rulebook-special-ability-instant.png",
  start: "/rulebook-special-ability-start.png",
  condition: "/rulebook-special-ability-condition.png",
  charges: "/rulebook-special-ability-charges.png",
  prestige: "/rulebook-special-ability-prestige.png",
  crave: "/rulebook-special-ability-crave.png",
  coin: "/rulebook-special-ability-coin.png",
  power: "/rulebook-special-ability-power.png",
  harmony: "/rulebook-special-ability-harmony.png",
  discord: "/rulebook-special-ability-discord.png",
};

export const bgmSource = "/Morrowind.mp3";
export const bgmMutedStorageKey = "kd-bgm-muted";
export const bgmVolumeStorageKey = "kd-bgm-volume";
export const defaultBgmVolume = 0.34;

export const dilemmaPhotoLimit = 3;
export const dilemmaPhotoMaxInputBytes = 8 * 1024 * 1024;
export const dilemmaPhotoMaxDataUrlLength = 1_200_000;
export const dilemmaPhotoMaxDimension = 1280;
export const dilemmaPhotoQuality = 0.78;
export const dilemmaPhotoAllowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export const dilemmaOutcomeLabels = {
  "": "미정",
  aye: "찬성",
  nay: "반대",
};
export const dilemmaResourceDeltaLimit = 9;

export const tokenCounters = [
  { id: "coins", label: "코인", max: 99, icon: "coin", tone: "coin" },
  { id: "powerTokens", label: "권력", max: 99, icon: "power", tone: "power" },
];

export const scoreTrackCounters = [
  { id: "prestige", label: "명망", max: 100, icon: "prestige", tone: "prestige" },
  { id: "crave", label: "갈망", max: 50, icon: "crave", tone: "crave" },
];

export const inventoryCounters = [...tokenCounters, ...scoreTrackCounters];
export const inventoryCounterMax = Object.fromEntries(inventoryCounters.map((counter) => [counter.id, counter.max]));

export const houseAlignmentRows = [
  { id: "Extremist", agendaId: "extremist", label: "Extremist", koreanLabel: "극단주의자" },
  { id: "Rebel", agendaId: "rebel", label: "Rebel", koreanLabel: "반역자" },
  { id: "Opulent", agendaId: "opulent", label: "Opulent", koreanLabel: "재력가" },
  { id: "Opportunist", agendaId: "opportunist", label: "Opportunist", koreanLabel: "기회주의자" },
  { id: "Moderate", agendaId: "moderate", label: "Moderate", koreanLabel: "중도주의자" },
  { id: "Greedy", agendaId: "greedy", label: "Greedy", koreanLabel: "탐욕가" },
];

export const defaultHouseAlignmentOrder = houseAlignmentRows.map((alignment) => alignment.agendaId);

export const alignmentRewardTypes = [
  { id: "prestige", label: "명망", icon: "prestige", tone: "prestige" },
  { id: "crave", label: "갈망", icon: "crave", tone: "crave" },
];
export const alignmentRewardTypeLabels = Object.fromEntries(alignmentRewardTypes.map((reward) => [reward.id, reward.label]));
export const houseAlignmentLabelById = Object.fromEntries(
  houseAlignmentRows.map((alignment) => [alignment.id, alignment.koreanLabel]),
);

export const resourceCounters = [
  { id: "influence", label: "영향력", max: 17, icon: "influence", tone: "influence" },
  { id: "wealth", label: "부", max: 17, icon: "wealth", tone: "wealth" },
  { id: "morale", label: "사기", max: 17, icon: "morale", tone: "morale" },
  { id: "welfare", label: "복지", max: 17, icon: "welfare", tone: "welfare" },
  { id: "knowledge", label: "지식", max: 17, icon: "knowledge", tone: "knowledge" },
];

export const valueMentionAmountMax = 99;
export const valueMentionItems = [
  ...tokenCounters.map((counter) => ({ ...counter, category: "가문 값" })),
  ...scoreTrackCounters.map((counter) => ({ ...counter, category: "가문 값" })),
  ...resourceCounters.map((counter) => ({ ...counter, category: "왕국 자원", requiresAmount: false })),
  { id: "stability", label: "안정도 마커", max: 17, icon: "balance", tone: "stability", category: "왕국 상태", requiresAmount: false },
  { id: "momentum", label: "모멘텀", max: 9, icon: "turn", tone: "momentum", category: "왕국 상태", requiresAmount: false },
];

export const openAgendaTokenTypes = [
  { id: "positive", label: "긍정 공개 의제", shortLabel: "긍정", tone: "positive" },
  { id: "negative", label: "부정 공개 의제", shortLabel: "부정", tone: "negative" },
];
export const openAgendaTokenLimit = 2;

export const houseAchievementRows = [
  { id: 0, label: "도전 과제 1" },
  { id: 1, label: "도전 과제 2" },
  { id: 2, label: "도전 과제 3" },
];
export const houseAchievementMarkMax = 5;
export const achievementDetailTextMaxLength = 300;
export const houseAlignmentMarkMax = 4;

export const specialAbilityLegendRows = [
  {
    id: "instant",
    icon: "instant",
    label: "즉시",
    timing: "도전과제를 달성했거나 이야기 카드가 보드에 배치되었을 때",
    effect: "즉시 활성화합니다.",
  },
  {
    id: "start",
    icon: "start",
    label: "각 게임 시작 시",
    timing: "각 게임 시작 시",
    effect: "이야기 카드 더미 맨 위에 놓이지 않은 이야기 카드 능력은 무시합니다.",
  },
  {
    id: "condition",
    icon: "condition",
    label: "특정 조건 ",
    timing: "게임 중 특정 조건을 만족했거나 게임이 종료될 때",
    effect: "조건이 맞으면 활성화합니다. 맨 위에 없는 이야기 카드 능력은 무시합니다.",
  },
  {
    id: "charges",
    icon: "charges",
    label: "칸 표시",
    timing: "표시할 수 있는 칸이 있는 이야기 카드 능력",
    effect: "사용하거나 효과가 발휘될 때마다 칸 1개를 색칠하고, 모든 칸이 표시되면 더 이상 사용할 수 없습니다.",
  },
  {
    id: "prestige-crave",
    icon: "prestigeCrave",
    label: "명망/갈망",
    timing: "+X 명망 또는 갈망",
    effect: "표시된 수치만큼 해당 점수를 얻습니다. 이야기 카드라면 서명인만 받습니다.",
  },
  {
    id: "coins",
    icon: "coins",
    label: "코인",
    timing: "+X 코인",
    effect: "공용 저장소에서 표시된 수만큼 코인을 가져와 개인 저장소에 더합니다.",
  },
  {
    id: "power",
    icon: "power",
    label: "권력",
    timing: "+X 권력 토큰",
    effect: "공용 저장소에서 표시된 수만큼 권력 토큰을 가져와 개인 저장소에 더합니다.",
  },
  {
    id: "finale",
    icon: "finale",
    label: "화합/불화",
    timing: "결말 카드 전용",
    effect: "표시된 화합/불화 값은 캠페인의 대단원 때 영향을 줍니다.",
  },
];

export const achievementEffectAmountMax = 99;
export const achievementEffectEntryMax = 8;
export const achievementEffectOptions = [
  { id: "", label: "시점 없음", icon: "seal", memo: "적용 시점 미지정" },
  { id: "instant", label: "즉시", legendIcon: "instant", memo: "작성 후 즉시 처리" },
  { id: "start", label: "각 게임 시작 시", legendIcon: "start", memo: "각 게임 시작 때 처리" },
  { id: "condition", label: "특정 조건 만족 시", legendIcon: "condition", memo: "조건 충족 또는 종료 때 처리" },
];
export const achievementEffectSelectableOptions = achievementEffectOptions.filter((option) => option.id);
export const achievementEffectOptionById = Object.fromEntries(achievementEffectOptions.map((option) => [option.id, option]));
export const achievementEffectAmountOptionIds = new Set(
  achievementEffectOptions.filter((option) => option.amount).map((option) => option.id),
);

export const alignmentRewardCountMax = 3;
export const boardRows = Array.from({ length: 17 }, (_, index) => index + 1);
export const agendaScoringZones = {
  extremist: [{ from: 1, to: 17, mode: "distance" }],
  opulent: [{ from: 9, to: 17 }],
  moderate: [{ from: 5, to: 13 }],
  rebel: [
    { from: 1, to: 5 },
    { from: 13, to: 17 },
  ],
  opportunist: [{ from: 1, to: 9 }],
  greedy: [
    { from: 1, to: 5 },
    { from: 13, to: 17 },
  ],
};
