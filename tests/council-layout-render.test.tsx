import { renderToStaticMarkup } from "react-dom/server";
import assert from "node:assert/strict";
import { GamePanel } from "../src/App";
import { HOUSE_CATALOG } from "../src/resources/gameResources";

const currentHouse = HOUSE_CATALOG.find((house) => house.id === "solad")!;
const houses = [
  {
    ...currentHouse,
    houseId: currentHouse.id,
    player: currentHouse.number,
    name: "가맘",
    hasCustomName: true,
    hasSession: true,
    hasPassword: true,
    hasChosen: true,
    isCurrentTurn: true,
    isSelf: true,
  },
];

const ownChoice = {
  id: "layout-test-agenda",
  title: "Layout Test",
  koreanTitle: "배치 검증 의제",
  alignment: "Moderate",
  resourceGoal: "복지가 높을수록 득점합니다.",
  note: "",
  resourceScoring: [
    { label: "상위", vp: 3 },
    { label: "하위", vp: -1 },
  ],
  coinRanking: [
    { rank: 1, vp: 3 },
    { rank: 2, vp: 1 },
    { rank: 3, vp: 0 },
  ],
};

const state = {
  phase: "choose",
  currentHouseId: currentHouse.id,
  turn: currentHouse.id,
  houses,
  requiredHouseCount: 5,
  claimedHouseCount: 1,
  selectedCount: 1,
  draftOrder: [currentHouse.id],
  availableAgendas: [],
  canDiscard: false,
  randomDiscardEnabled: true,
  ownInventory: {
    coins: 7,
    powerTokens: 2,
    prestige: 15,
    crave: 4,
  },
  ownHouseProgress: {
    openAgendaTokens: {
      positive: ["welfare"],
      negative: ["wealth"],
    },
    narrativeAchievement: true,
    narrativeAchievementCount: 1,
    narrativeAchievementDetail: { requiredCount: 1, text: "", effects: [] },
    houseAchievements: [0, 0],
    houseAchievementComplete: [false, false],
    houseAchievementDetails: [
      { requiredCount: 1, text: "", effects: [] },
      { requiredCount: 1, text: "", effects: [] },
    ],
    alignmentAchievements: {},
    alignmentRewards: {},
    alignmentOrder: ["moderate"],
  },
  ownChoice,
  boardProcessingOwnerHouseId: "",
  isBoardProcessingOwner: false,
  boardProcessingOwnerName: "",
  boardProcessingItems: [],
  boardProcessingHistory: {},
};

const html = renderToStaticMarkup(
  <GamePanel
    state={state}
    busy={false}
    mutate={async () => ({ ok: true })}
    refresh={async () => {}}
    onOpenOpenAgendaGuide={() => {}}
    onOpenSecretAgendaGuide={() => {}}
  />,
);

const statusIndex = html.indexOf("sidebar-status-section");
const ledgerIndex = html.indexOf("sidebar-ledger-stack");
const sidebarTokensIndex = html.indexOf("sidebar-ledger-tokens");
const sidebarAgendaIndex = html.indexOf("sidebar-ledger-agenda");
const mainIndex = html.indexOf("council-main");
const inventoryPanelIndex = html.indexOf("inventory-panel");
const tokensIndex = html.indexOf("토큰");
const coinIndex = html.indexOf("코인");
const powerIndex = html.indexOf("권력");
const agendaIndex = html.indexOf("의제", sidebarAgendaIndex);
const openAgendaIndex = html.indexOf("공통");
const secretAgendaIndex = html.indexOf("비밀", sidebarAgendaIndex);
const agendaGuideActionsIndex = html.indexOf("agenda-section-title-actions", sidebarAgendaIndex);
const secretAgendaCardIndex = html.indexOf("secret-agenda-card-frame", sidebarAgendaIndex);
const secretAgendaScoreTableIndex = html.indexOf("agenda-score-table", secretAgendaCardIndex);
const secretAgendaProgressSpineIndex = html.indexOf("secret-agenda-progress-spine", secretAgendaCardIndex);
const emptySecretAgendaBannerIndex = html.indexOf("secret-agenda-card-banner", secretAgendaCardIndex);
const coinIncreaseIndex = html.indexOf("코인 올리기");
const powerIncreaseIndex = html.indexOf("권력 올리기");
const openAgendaTokenButtonIndex = html.indexOf("긍정 복지 공개 의제 토큰");
const openAgendaTokenTooltipIndex = html.indexOf('class="app-tooltip-anchor open-agenda-resource-tooltip"', sidebarAgendaIndex);
const openAgendaTokenTooltipButtonIndex = html.indexOf("resource-token-chip", openAgendaTokenTooltipIndex);
const longHouseProfileIndex = html.indexOf(currentHouse.profile.slice(0, 80));
const houseAlignmentTrackIndex = html.indexOf("house-alignment-track");
const alignmentPanelIndex = html.indexOf("alignment-achievement-panel");
const alignmentHeadingIndex = html.indexOf(">성향</h3>", alignmentPanelIndex);
const alignmentRewardControlsIndex = html.indexOf("house-alignment-reward-controls", alignmentPanelIndex);
const challengeActionRailIndex = html.indexOf("achievement-card-action-rail", inventoryPanelIndex);
const challengeEditButtonIndex = html.indexOf("achievement-edit-button", challengeActionRailIndex);
const challengeCompleteStatusIndex = html.indexOf("achievement-challenge-status complete", challengeActionRailIndex);

assert.ok(statusIndex > -1, "status card should render in the sidebar");
assert.ok(ledgerIndex > statusIndex && ledgerIndex < mainIndex, "sidebar ledger should render below the status card");
assert.ok(sidebarTokensIndex > ledgerIndex && sidebarTokensIndex < mainIndex, "token ledger should render in the sidebar ledger");
assert.ok(sidebarAgendaIndex > sidebarTokensIndex && sidebarAgendaIndex < mainIndex, "agenda ledger should follow token ledger");
assert.ok(mainIndex > statusIndex, "main council content should render after the sidebar status card");
assert.ok(inventoryPanelIndex > mainIndex, "remaining inventory panel should stay in the main council content");
assert.ok(tokensIndex > statusIndex && tokensIndex < mainIndex, "token section should render below the status card");
assert.ok(coinIndex > statusIndex && coinIndex < mainIndex, "coin counter should render below the status card");
assert.ok(powerIndex > statusIndex && powerIndex < mainIndex, "power counter should render below the status card");
assert.ok(agendaIndex > statusIndex && agendaIndex < mainIndex, "agenda section should render below the status card");
assert.ok(openAgendaIndex > statusIndex && openAgendaIndex < mainIndex, "open agenda marker should render below the status card");
assert.ok(secretAgendaIndex > statusIndex && secretAgendaIndex < mainIndex, "secret agenda marker should render below the status card");
assert.equal(agendaGuideActionsIndex, -1, "agenda guide actions should not render in the inventory agenda section");
assert.ok(secretAgendaCardIndex > sidebarAgendaIndex, "secret agenda should render with the reference card frame");
assert.equal(emptySecretAgendaBannerIndex, -1, "secret agenda card should not render an empty banner container");
assert.ok(secretAgendaScoreTableIndex > secretAgendaCardIndex, "secret agenda should render score rows as compact card tables");
assert.ok(secretAgendaProgressSpineIndex > secretAgendaCardIndex, "secret agenda should render the reference-style vertical progress spine");
assert.ok(coinIncreaseIndex > sidebarTokensIndex && coinIncreaseIndex < mainIndex, "coin control should stay interactive in the sidebar ledger");
assert.ok(powerIncreaseIndex > sidebarTokensIndex && powerIncreaseIndex < mainIndex, "power control should stay interactive in the sidebar ledger");
assert.ok(
  openAgendaTokenButtonIndex > sidebarAgendaIndex && openAgendaTokenButtonIndex < mainIndex,
  "open agenda token control should stay interactive in the sidebar ledger",
);
assert.ok(
  openAgendaTokenTooltipIndex > sidebarAgendaIndex && openAgendaTokenTooltipButtonIndex > openAgendaTokenTooltipIndex,
  "sidebar open-agenda resource chips should be tooltip-backed icon controls",
);
assert.match(html, /house-profile-story/, "house detail should render the profile story container");
assert.ok(longHouseProfileIndex > inventoryPanelIndex, "house detail should render the canonical long profile text");
assert.equal(houseAlignmentTrackIndex, -1, "house detail should not render a separate alignment track");
assert.ok(alignmentPanelIndex > inventoryPanelIndex, "alignment progress panel should render in the inventory panel");
assert.ok(alignmentHeadingIndex > alignmentPanelIndex, "alignment progress panel should be labeled as 성향");
assert.ok(
  alignmentRewardControlsIndex > alignmentPanelIndex,
  "alignment reward controls should be merged into the alignment progress panel",
);
assert.ok(challengeActionRailIndex > inventoryPanelIndex, "challenge actions should render in a dedicated right-side card rail");
assert.ok(challengeEditButtonIndex > challengeActionRailIndex, "challenge edit control should live inside the action rail");
assert.ok(challengeCompleteStatusIndex > challengeActionRailIndex, "challenge complete control should live inside the action rail");

console.log("council-layout render tests passed");
