import { renderToStaticMarkup } from "react-dom/server";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GamePanel } from "../src/App";
import { CouncilStatusStack } from "../src/components/CouncilStatusUI";

const completeHtml = renderToStaticMarkup(
  <CouncilStatusStack
    claimedHouseCount={5}
    councilStageLabel="구성물 정리"
    currentHouseName="가맘"
    draftOrderCount={5}
    draftTurnName="올리오 후작가"
    phase="complete"
    requiredHouseCount={5}
    selectedCount={5}
  />,
);

assert.match(completeHtml, /내 가문/);
assert.match(completeHtml, /가맘/);
assert.match(completeHtml, /status-stack status-stack--complete/);
assert.doesNotMatch(completeHtml, /차례/);
assert.doesNotMatch(completeHtml, /현재 단계/);
assert.doesNotMatch(completeHtml, /구성물 정리/);
assert.doesNotMatch(completeHtml, /의제 선택/);
assert.doesNotMatch(completeHtml, /5 \/ 5/);

const chooseHtml = renderToStaticMarkup(
  <CouncilStatusStack
    claimedHouseCount={5}
    councilStageLabel="의제 선택"
    currentHouseName="가맘"
    draftOrderCount={5}
    draftTurnName="올리오 후작가"
    phase="choose"
    requiredHouseCount={5}
    selectedCount={3}
  />,
);

assert.match(chooseHtml, /차례/);
assert.match(chooseHtml, /올리오 후작가/);
assert.match(chooseHtml, /의제 선택/);
assert.match(chooseHtml, /3 \/ 5/);
assert.doesNotMatch(chooseHtml, /status-stack--complete/);

const completePanelHtml = renderToStaticMarkup(
  <GamePanel
    state={{
      phase: "complete",
      currentHouseId: "gamam",
      turn: null,
      houses: [
        {
          id: "gamam",
          houseId: "gamam",
          player: 1,
          number: 1,
          title: "Gamam",
          koreanTitle: "가맘",
          motto: "",
          crest: "",
          goal: "",
          alignments: [],
          profile: "",
          motif: "oak",
          name: "차건의 후예",
          hasCustomName: true,
          hasSession: true,
          hasPassword: true,
          hasChosen: true,
          isCurrentTurn: false,
          isSelf: true,
        },
      ],
      requiredHouseCount: 5,
      claimedHouseCount: 5,
      selectedCount: 5,
      draftOrder: ["gamam"],
      availableAgendas: [],
      canDiscard: false,
      canChoose: false,
      randomDiscardEnabled: true,
      ownInventory: {
        coins: 7,
        powerTokens: 2,
        prestige: 15,
        crave: 4,
      },
      ownHouseProgress: {
        openAgendaTokens: {
          positive: [],
          negative: [],
        },
        narrativeAchievement: false,
        narrativeAchievementCount: 0,
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
      ownChoice: {
        id: "complete-test-agenda",
        title: "Complete Test",
        koreanTitle: "완료 검증 의제",
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
      },
      boardProcessingOwnerHouseId: "",
      isBoardProcessingOwner: false,
      boardProcessingOwnerName: "",
      boardProcessingItems: [],
      boardProcessingHistory: {},
    }}
    busy={false}
    mutate={async () => ({ ok: true })}
    refresh={async () => {}}
    onOpenOpenAgendaGuide={() => {}}
    onOpenSecretAgendaGuide={() => {}}
  />,
);

assert.doesNotMatch(completePanelHtml, /<p class="section-label">의회 절차<\/p>/);
assert.doesNotMatch(completePanelHtml, /<h2 id="stage-title">구성물 정리<\/h2>/);
assert.doesNotMatch(completePanelHtml, /class="game-stage phase-complete"/);
assert.doesNotMatch(completePanelHtml, /sidebar-status-section/);

const entryStylesSource = readFileSync("src/styles/_05-entry-sidebar.scss", "utf8");
assert.match(
  entryStylesSource,
  /\.status-stack--complete\s+\.status-item:last-child\s*\{[\s\S]*border-bottom:\s*0;[\s\S]*\}/,
  "complete status stack should not draw a dangling bottom separator",
);
assert.doesNotMatch(entryStylesSource, /^\s*\.status-item:last-child\s*\{/m);

console.log("status-panel render tests passed");
