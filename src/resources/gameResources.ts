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

/** 가문 목록·인원수는 `shared/houses.mjs`가 원본입니다. 앱에서는 여기서만 가져가세요. */
import { HOUSE_CATALOG } from "../../shared/houses.mjs";
export { HOUSE_BY_ID, HOUSE_CATALOG, REQUIRED_HOUSE_COUNT } from "../../shared/houses.mjs";

export const defaultNamePattern = /^player\s*[1-5]$/i;
export const sessionEndUnavailableMessage = "비밀 의제 배정이 끝난 뒤 회기를 종료할 수 있습니다.";
export const sessionEndChecklistItems = [
  { id: "inventories", label: "모든 가문 자원 변경을 수기로 저장함" },
  { id: "scores", label: "최종 점수와 명망/갈망 반영을 확인함" },
  { id: "progress", label: "공개 의제와 업적/성향 업적 표시를 확인함" },
  { id: "board", label: "공용 기록과 카드 정리를 완료함" },
];

export const ledgerAutosaveDelayMs = 500;
export const ledgerAutosaveRetryDelayMs = 1800;

export const rulebookPdfUrl = "/king_dilemma_rulebook.pdf";
export const rulebookReferenceTips = [
  {
    id: "chronicle-ledger",
    title: "연대기 장부",
    body: "연대기 스티커는 지시된 위치에 붙이고 교체 규칙을 확인한 뒤, 왕국 연대기 점수 기록과 맞춰 장부에 남깁니다.",
    reference: "한국어 룰북 p.25, p.44",
  },
  {
    id: "campaign-ledger-envelopes",
    title: "캠페인 장부와 봉투",
    body: "봉투는 지시가 있을 때만 열고 표준 절차대로 내용물을 적용하며, 캠페인 장부에는 새 카드/스티커/기록 변화를 함께 남깁니다.",
    reference: "한국어 룰북 p.26, p.42, p.44",
  },
  {
    id: "next-game-setup",
    title: "다음 게임 준비",
    body: "다음 게임은 레거시 준비, 이야기/사건 카드, 연대기 노화 시작, 공개 의제 배정, 레거시 권력/자원 이동 순서를 확인합니다.",
    reference: "한국어 룰북 p.10, p.11, p.12",
  },
  {
    id: "mystery-envelope-70",
    title: "미스터리 스티커와 70번 봉투",
    body: "미스터리 스티커 조건을 확인하고 해당 트리거가 발생하면 70번 봉투 개봉 여부를 별도로 점검합니다.",
    reference: "한국어 룰북 p.42",
  },
  {
    id: "king-death-time-counter",
    title: "시간 카운터와 왕의 죽음",
    body: "딜레마 해결 뒤 시간 카운터를 이동하고 왕의 죽음 조건을 확인해 회기 종료 여부를 결정합니다.",
    reference: "한국어 룰북 p.28-29",
  },
  {
    id: "dilemma-backfill-photos",
    title: "기존 기록 가져오기와 사진",
    body: "딜레마 결과는 A-F 해결 절차와 왕국 연대기 기록을 근거로 보강하고, 사진은 실제 카드/보드 기록을 대조하는 보조 자료로 둡니다.",
    reference: "한국어 룰북 p.23, p.44",
  },
  {
    id: "dilemma-board-effects",
    title: "보드 처리 항목",
    body: "결과가 연대기 스티커, 봉투, 이야기 카드, 사건 카드, 미스터리 스티커 처리를 요구할 때만 항목으로 남기고 각 항목 설명 모달에서 세부 기준을 확인합니다.",
    reference: "한국어 룰북 p.25-28, p.42",
  },
];
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

export const dilemmaResultMarkers = [
  ...resourceCounters,
  { id: "story", label: "스토리", max: 1, icon: "story", tone: "story" },
] as const;

export const valueMentionAmountMax = 99;
export const valueMentionItems = [
  ...tokenCounters.map((counter) => ({ ...counter, category: "가문 값" })),
  ...scoreTrackCounters.map((counter) => ({ ...counter, category: "가문 값" })),
  ...resourceCounters.map((counter) => ({ ...counter, category: "왕국 자원", requiresAmount: false })),
];

export const houseMentionItems = HOUSE_CATALOG.map((house: any) => ({
  id: house.id,
  label: house.koreanTitle || house.title,
  tone: "house",
  motif: house.motif,
  category: "가문",
  searchText: [house.koreanTitle, house.title, house.motto, String(house.number), house.id]
    .filter((value): value is string => typeof value === "string")
    .join(" "),
}));

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
  { id: "", label: "시점 없음", icon: "seal", memo: "적용 시점 미지정", amount: false },
  { id: "instant", label: "즉시", legendIcon: "instant", memo: "작성 후 즉시 처리", amount: true },
  { id: "start", label: "각 게임 시작 시", legendIcon: "start", memo: "각 게임 시작 때 처리", amount: true },
  { id: "condition", label: "특정 조건 만족 시", legendIcon: "condition", memo: "조건 충족 또는 종료 때 처리", amount: true },
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

// ── 점수 안내 다이얼로그 (ScoreGuides) ─────────────────────────────────

export const scoreGuideDialogLabels = {
  sectionLabel: "점수 안내",
  confirm: "확인",
} as const;

export type ScoreGuideFormulaPart =
  | { kind: "item"; text: string }
  | { kind: "op"; text: string }
  | { kind: "result"; text: string };

type ScoreGuideListSection = {
  heading: string;
  items: readonly string[];
};

type ScoreGuideTableSection = {
  heading: string;
  paragraph?: string;
  table: {
    headers: readonly string[];
    rows: readonly { rowHeader: string; cells: readonly string[] }[];
  };
};

export type ScoreGuideSection = ScoreGuideListSection | ScoreGuideTableSection;

export const openAgendaScoreGuideContent = {
  sealToken: "scroll" as const,
  title: "공개 의제 토큰 점수",
  copy:
    "공개 의제 토큰은 크로니클 스티커로 배정되는 공개 목표입니다. 게임 종료 시 해당 자원 마커의 최종 순위에 따라 긍정 토큰은 보너스, 부정 토큰은 감점을 줍니다.",
  formulaAriaLabel: "공개 의제 점수 공식",
  formula: [
    { kind: "item" as const, text: "긍정: 1위 +3 / 2위 +1" },
    { kind: "op" as const, text: "·" },
    { kind: "item" as const, text: "부정: 최하위 -3 / 뒤에서 2위 -1" },
  ] satisfies readonly ScoreGuideFormulaPart[],
  sections: [
    {
      heading: "1. 토큰 배정",
      items: [
        "각 자원마다 가장 최근의 긍정 크로니클 스티커 서명자가 해당 긍정 공개 의제 토큰을 받습니다.",
        "각 자원마다 가장 최근의 부정 크로니클 스티커 서명자가 해당 부정 공개 의제 토큰을 받습니다.",
        "현재 게임에 참여하지 않는 가문의 서명은 배정할 때 무시합니다.",
        "한 가문은 한 게임에서 긍정 최대 2개, 부정 최대 2개만 보유합니다. 초과분은 선택해서 버립니다.",
      ],
    },
    {
      heading: "2. 종료 시 점수",
      items: [
        "긍정 공개 의제는 해당 자원이 가장 높으면 +3, 두 번째로 높으면 +1입니다.",
        "부정 공개 의제는 해당 자원이 가장 낮으면 -3, 두 번째로 낮으면 -1입니다.",
        "동률이면 동률인 모든 자원이 같은 보너스 또는 패널티를 적용합니다.",
        "같은 자원이 위에서 두 번째이면서 아래에서 두 번째일 수도 있으므로, 긍정/부정 토큰은 각각 따로 계산합니다.",
      ],
    },
  ] satisfies readonly ScoreGuideSection[],
};

export const secretAgendaScoreGuideContent = {
  sealToken: "scroll" as const,
  title: "비밀 의제 점수",
  copy:
    "비밀 의제 카드는 게임 종료 시 각 가문의 득점 원천입니다. 카드의 자원 목표 점수와 코인 순위 점수를 각각 계산해서 더한 값을 비밀 의제 점수로 기록합니다.",
  formulaAriaLabel: "비밀 의제 점수 공식",
  formula: [
    { kind: "item" as const, text: "자원 목표 점수" },
    { kind: "op" as const, text: "+" },
    { kind: "item" as const, text: "코인 순위 점수" },
    { kind: "result" as const, text: "= 비밀 의제 점수" },
  ] satisfies readonly ScoreGuideFormulaPart[],
  sections: [
    {
      heading: "1. 자원 목표 점수",
      items: [
        "게임이 끝난 시점의 공용 보드 5개 자원 마커 최종 위치를 봅니다.",
        "자신의 비밀 의제 카드에 표시된 자원 목표 표와 그 위치를 대조합니다.",
        "표가 요구하는 구역 안에 들어간 자원 마커 수에 따라 카드의 해당 득점을 받습니다.",
      ],
    },
    {
      heading: "2. 코인 순위 점수",
      items: [
        "각 가문이 게임 종료 시 가문 스크린 뒤에 숨긴 코인 수를 비교합니다.",
        "비밀 의제 카드 하단의 코인 순위 표에서 1위, 2위, 3위에 해당하는 점수를 받습니다.",
        "카드마다 코인 순위 점수가 다르므로 같은 순위라도 비밀 의제에 따라 받는 점수가 달라집니다.",
        "1위부터 3위 안에 들지 못하면 카드에 표시된 코인 순위 점수가 없으므로 0점으로 처리합니다.",
      ],
    },
    {
      heading: "3. 동률 처리",
      items: [
        "코인 수가 같으면 동률인 모든 가문이 같은 순위를 공유합니다.",
        "동률인 가문들은 각자 자기 비밀 의제 카드의 해당 순위 점수를 받습니다.",
        "자원 위치 동률은 묶인 자원이 같은 위치를 공유합니다.",
      ],
    },
  ] satisfies readonly ScoreGuideSection[],
};

export const mainScoreGuideContent = {
  sealToken: "balance" as const,
  title: "점수 산정 방식",
  copy:
    "왕이 사망하거나 안정도 트랙 끝에 도달해 게임이 종료되면 점수를 계산합니다. 중간 저장으로 세션만 멈춘 경우에는 점수를 산정하지 않습니다.",
  formulaAriaLabel: "최종 득점 공식",
  formula: [
    { kind: "item" as const, text: "비밀 의제: 자원 목표 + 코인 순위" },
    { kind: "op" as const, text: "+" },
    { kind: "item" as const, text: "공개 의제" },
    { kind: "op" as const, text: "+" },
    { kind: "item" as const, text: "권력 보너스" },
    { kind: "result" as const, text: "= 합계" },
  ] satisfies readonly ScoreGuideFormulaPart[],
  sections: [
    {
      heading: "1. 득점 합산",
      items: [
        "비밀 의제는 자원 목표 점수와 코인 순위 점수를 더해 산정합니다.",
        "자원 목표는 공용 보드의 최종 자원 위치를 비밀 의제 카드의 자원 조건과 대조합니다.",
        "코인 순위는 남은 코인이 1위, 2위, 3위인지에 따라 카드 하단의 순위 점수를 받습니다.",
        "긍정 공개 의제는 해당 자원이 가장 높으면 +3, 두 번째로 높으면 +1입니다.",
        "부정 공개 의제는 해당 자원이 가장 낮으면 -3, 두 번째로 낮으면 -1입니다.",
        "권력 보너스는 남은 권력이 가장 많은 가문이 +2, 두 번째 가문이 +1입니다.",
      ],
    },
    {
      heading: "2. 비밀 의제 점수",
      items: [
        "각 비밀 의제 카드는 자원 목표와 코인 순위 목표 두 가지 점수 조건을 가집니다.",
        "자원 목표는 게임 종료 시 공용 보드의 자원 마커 위치를 카드의 자원 구간/표와 대조해 계산합니다.",
        "코인 순위 목표는 남은 코인이 다른 가문과 비교해 몇 위인지 보고 카드 하단의 1위, 2위, 3위 점수를 받습니다.",
        "코인 순위가 동률이면 동률인 모든 가문이 같은 순위 점수를 받습니다.",
      ],
    },
    {
      heading: "3. 순위와 동률",
      items: [
        "자원 위치와 코인/권력 수량이 동률이면 묶인 대상이 같은 순위 보너스 또는 패널티를 받습니다.",
        "득점 합계가 가장 높은 가문이 이번 게임의 승자입니다. 득점 동률이면 승리를 공유합니다.",
        "마지막 순위는 항상 존재합니다. 5인 게임에서 4인 동률 뒤에 아무도 없으면 그 동률을 Last로 봅니다.",
      ],
    },
    {
      heading: "4. 명망/갈망 기록",
      paragraph:
        "이 앱은 득점 합계와 순위를 계산한 뒤, 종료 사유를 선택하면 아래 표의 명망/갈망과 이번 회기 비밀 의제 성향 1칸을 명시적 버튼으로 반영합니다.",
      table: {
        headers: ["조건", "1위", "2위", "3위", "4위", "Last"],
        rows: [
          { rowHeader: "왕 사망", cells: ["명망 2", "명망 2", "명망 1, 갈망 1", "명망 1, 갈망 1", "갈망 2"] },
          { rowHeader: "상단 안정도", cells: ["명망 3", "명망 2", "명망 1", "명망 1", "갈망 2"] },
          { rowHeader: "하단 안정도", cells: ["갈망 2", "갈망 1", "갈망 1", "갈망 1", "명망 2"] },
        ],
      },
    },
  ] satisfies readonly ScoreGuideSection[],
};

export { ko, type Ko } from "./ko";
