import { renderToStaticMarkup } from "react-dom/server";
import assert from "node:assert/strict";
import { GamePanel } from "../src/App";
import { TurnTrack } from "../src/components/CouncilStatusUI";
import { HOUSE_CATALOG } from "../src/resources/gameResources";
import type { RedactedHouse } from "../src/types/game";

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

const detailHouseName = "test";
const gamePanelHouses = HOUSE_CATALOG.map((house) =>
  house.id === currentHouse.id
    ? {
        ...currentHouse,
        houseId: currentHouse.id,
        player: currentHouse.number,
        name: detailHouseName,
        hasCustomName: true,
        hasSession: true,
        hasPassword: true,
        hasChosen: true,
        isCurrentTurn: true,
        isSelf: true,
      }
    : {
        ...house,
        houseId: house.id,
        player: house.number,
        name: house.koreanTitle,
        hasCustomName: false,
        hasSession: false,
        hasPassword: false,
        hasChosen: false,
        isCurrentTurn: false,
        isSelf: false,
      },
);

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
  houses: gamePanelHouses,
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
const draftingHtml = renderToStaticMarkup(
  <GamePanel
    state={{
      ...state,
      selectedCount: 0,
      availableAgendas: [ownChoice],
      ownChoice: null,
    }}
    busy={false}
    mutate={async () => ({ ok: true })}
    refresh={async () => {}}
    onOpenOpenAgendaGuide={() => {}}
    onOpenSecretAgendaGuide={() => {}}
  />,
);
const turnTrackHtml = renderToStaticMarkup(
  <TurnTrack houses={houses as unknown as RedactedHouse[]} draftOrder={[currentHouse.id]} turn={currentHouse.id} phase="choose" />,
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
const turnTrackLegendIndex = turnTrackHtml.indexOf("turn-track-legend");
const turnTrackGridIndex = turnTrackHtml.indexOf('class="turn-track"');
const turnLegendCurrentIndex = turnTrackHtml.indexOf("turn-track-legend-node current", turnTrackLegendIndex);
const turnLegendDoneIndex = turnTrackHtml.indexOf("turn-track-legend-node done", turnTrackLegendIndex);
const turnLegendWaitingIndex = turnTrackHtml.indexOf("turn-track-legend-node waiting", turnTrackLegendIndex);
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
const openAgendaToneLegendIndex = html.indexOf("open-agenda-tone-legend", sidebarAgendaIndex);
const agendaCommonTypeNodeIndex = html.indexOf("agenda-type-dot common", sidebarAgendaIndex);
const agendaSecretTypeNodeIndex = html.indexOf("agenda-type-dot secret", sidebarAgendaIndex);
const longHouseProfileIndex = html.indexOf(currentHouse.profile.slice(0, 80));
const houseProfileTitleIndex = html.indexOf(`${currentHouse.koreanTitle}(${detailHouseName})`);
const houseAlignmentTrackIndex = html.indexOf("house-alignment-track");
const alignmentPanelIndex = html.indexOf("alignment-achievement-panel");
const alignmentHeadingIndex = html.indexOf('id="alignment-achievements-title"', alignmentPanelIndex);
const alignmentRewardControlsIndex = html.indexOf("house-alignment-reward-controls", alignmentPanelIndex);
const challengeActionRailIndex = html.indexOf("achievement-card-action-rail", inventoryPanelIndex);
const challengeEditButtonIndex = html.indexOf("achievement-edit-button", challengeActionRailIndex);
const challengeCompleteStatusIndex = html.indexOf("achievement-challenge-status complete", challengeActionRailIndex);
const draftingSidebarAgendaIndex = draftingHtml.indexOf("sidebar-ledger-agenda");
const draftingAgendaListIndex = draftingHtml.indexOf("agenda-list");

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
assert.ok(turnTrackLegendIndex > -1 && turnTrackLegendIndex < turnTrackGridIndex, "agenda turn color legend should render above the turn track");
assert.ok(turnLegendCurrentIndex > turnTrackLegendIndex, "turn legend should include the current turn color node");
assert.ok(turnLegendDoneIndex > turnTrackLegendIndex, "turn legend should include the completed turn color node");
assert.ok(turnLegendWaitingIndex > turnTrackLegendIndex, "turn legend should include the waiting turn color node");
assert.ok(openAgendaIndex > statusIndex && openAgendaIndex < mainIndex, "open agenda marker should render below the status card");
assert.ok(secretAgendaIndex > statusIndex && secretAgendaIndex < mainIndex, "secret agenda marker should render below the status card");
assert.ok(agendaCommonTypeNodeIndex > sidebarAgendaIndex, "agenda header should render the common type node");
assert.ok(agendaSecretTypeNodeIndex > agendaCommonTypeNodeIndex, "agenda header should render the secret type node after common");
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
assert.equal(openAgendaToneLegendIndex, -1, "agenda card should only keep common and secret legend nodes");
assert.ok(houseProfileTitleIndex > inventoryPanelIndex, "house detail title should include the custom house name in parentheses");
assert.match(html, /house-profile-story/, "house detail should render the profile story container");
assert.ok(longHouseProfileIndex > inventoryPanelIndex, "house detail should render the canonical long profile text");
assert.equal(houseAlignmentTrackIndex, -1, "house detail should not render a separate alignment track");
assert.ok(alignmentPanelIndex > inventoryPanelIndex, "alignment progress panel should render in the inventory panel");
assert.ok(alignmentHeadingIndex > alignmentPanelIndex, "alignment progress panel should render its labeled heading");
assert.ok(
  alignmentRewardControlsIndex > alignmentPanelIndex,
  "alignment reward controls should be merged into the alignment progress panel",
);
assert.ok(challengeActionRailIndex > inventoryPanelIndex, "challenge actions should render in a dedicated right-side card rail");
assert.ok(challengeEditButtonIndex > challengeActionRailIndex, "challenge edit control should live inside the action rail");
assert.ok(challengeCompleteStatusIndex > challengeActionRailIndex, "challenge complete control should live inside the action rail");
assert.equal(
  draftingSidebarAgendaIndex,
  -1,
  "agenda ledger should stay hidden while the current house has not chosen a secret agenda",
);
assert.ok(draftingAgendaListIndex > -1, "secret agenda draft list should remain visible while choosing a secret agenda");

console.log("council-layout render tests passed");
