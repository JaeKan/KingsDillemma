import { existsSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";

const appSource = readFileSync("src/App.tsx", "utf8");
const agendaStateSource = readFileSync("netlify/functions/_shared/agenda-state.mts", "utf8");
const agendaApiSource = readFileSync("shared/agenda-api.mts", "utf8");
const gameResourcesSource = readFileSync("src/resources/gameResources.ts", "utf8");
const appKoSource = readFileSync("src/resources/ko/app.ts", "utf8");
const stringsKoSource = readFileSync("src/resources/ko/strings.ts", "utf8");
const clientTypesSource = readFileSync("src/types/game.ts", "utf8");
const boardProcessingPanelSource = readFileSync("src/components/BoardProcessingPanel.tsx", "utf8");
const boardProcessingHistoryDialogSource = readFileSync("src/components/BoardProcessingHistoryDialog.tsx", "utf8");
const dialogStylesSource = readFileSync("src/styles/_04-dialogs-editors.scss", "utf8");
const entryStylesSource = readFileSync("src/styles/_05-entry-sidebar.scss", "utf8");
const settingsStylesSource = readFileSync("src/styles/_02-settings.scss", "utf8");
const boardProcessingStylesSource = readFileSync("src/styles/_07-inventory-progress.scss", "utf8");
const agendaTonesStylesSource = readFileSync("src/styles/_09-agenda-tones.scss", "utf8");
const responsiveStylesSource = readFileSync("src/styles/_08-desktop-responsive.scss", "utf8");
const mobileStylesSource = readFileSync("src/styles/_10-mobile-overrides.scss", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { scripts?: Record<string, string> };

function readCssBlock(source: string, selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `${selector} style block should exist`);
  return match[1];
}

function readAtRuleBlock(source: string, atRule: string) {
  const start = source.indexOf(`${atRule} {`);
  assert.ok(start >= 0, `${atRule} block should exist`);
  const bodyStart = source.indexOf("{", start) + 1;
  let depth = 1;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(bodyStart, index);
      }
    }
  }
  assert.fail(`${atRule} block should close`);
}

function readCssBlocks(source: string, selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = Array.from(source.matchAll(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, "g")));
  assert.ok(matches.length > 0, `${selector} style blocks should exist`);
  return matches.map((match) => match[1]);
}

const removedUiTokens = [
  "VoteOrderDialog",
  "DilemmaHistoryDialog",
  "ChronicleLedgerDialog",
  "CampaignLedgerDialog",
  "CampaignBackfillDialog",
  "DilemmaEditDialog",
  "DilemmaResolutionDialog",
  "DilemmaRoleDialog",
  "NextGameSetupDialog",
  "DilemmaVotingPanel",
  "DilemmaSummaryCard",
  "VoteOrderTrack",
  "dilemmaHistoryOpen",
  "chronicleLedgerOpen",
  "campaignLedgerOpen",
  "campaignBackfillOpen",
  "voteOrderDialogOpen",
  "dilemmaDialogOpen",
  "dilemmaResolutionOpen",
  "dilemmaRoleDialogOpen",
  "onOpenDilemmaHistory",
  "onOpenChronicleLedger",
  "onOpenCampaignLedger",
  "onOpenCampaignBackfill",
  "onOpenVoteOrderDialog",
];

for (const token of removedUiTokens) {
  assert.equal(appSource.includes(token), false, `src/App.tsx should not expose removed feature token: ${token}`);
}

const removedApiActions = [
  "beginDilemmaEdit",
  "cancelDilemmaEdit",
  "saveDilemma",
  "publishDilemma",
  "resetDilemma",
  "deleteDilemmaHistory",
  "saveDilemmaVoteOrder",
  "saveDilemmaRoles",
  "saveDilemmaVote",
  "applyDilemmaVotes",
  "resolveModeratorDecision",
  "applyDilemmaVoteSettlement",
  "addChronicleSticker",
  "updateChronicleSticker",
  "deleteChronicleSticker",
  "saveCampaignEnvelope",
  "deleteCampaignEnvelope",
  "saveCampaignCard",
  "deleteCampaignCard",
  "saveMysterySticker",
  "deleteMysterySticker",
  "applyCampaignBackfill",
  "ageChroniclesForNextGame",
  "applyOpenAgendaAssignments",
  "saveNextGameSetupChecklist",
  "applyNextGameSetupAutomation",
];

for (const action of removedApiActions) {
  assert.equal(
    agendaApiSource.includes(`action === "${action}"`),
    false,
    `shared/agenda-api.mts should not handle removed action: ${action}`,
  );
  assert.equal(
    agendaStateSource.includes(`export function ${action}`),
    false,
    `agenda-state should not export removed action implementation: ${action}`,
  );
}

for (const token of [
  "createDefaultDilemmaRecord",
  "DilemmaRecord",
  "dilemmaHistory",
  "dilemmaVoteOrder",
  "chronicleLedger",
  "campaignLedger",
  "nextGameSetupState",
  "shared/chronicle-ledger",
  "shared/mystery-stickers",
]) {
  assert.equal(agendaStateSource.includes(token), false, `agenda-state should not keep removed feature token: ${token}`);
}

for (const removedPath of [
  "shared/chronicle-ledger.mts",
  "shared/mystery-stickers.mts",
  "public/king-dilemma-voting-rules.txt",
  "src/styles/_03-vote-order.scss",
  "src/components/MysteryStickerImage.tsx",
  "src/components/MysteryStickerPicker.tsx",
  "src/utils/mystery-sticker-labels.ts",
  "scripts/extract-mystery-stickers.mjs",
]) {
  assert.equal(existsSync(removedPath), false, `removed feature file should not exist: ${removedPath}`);
}

for (const token of [
  "dilemmaOutcomeLabels",
  "dilemmaResourceDeltaLimit",
  "dilemmaResultMarkers",
]) {
  assert.equal(gameResourcesSource.includes(token), false, `gameResources should not export removed dilemma token: ${token}`);
}

for (const token of [
  "dilemmaHistory",
  "chronicleLedger",
  "campaignLedger",
  "campaignBackfill",
  "dilemmaRole",
  "voteOrder",
  "dilemmaResolution",
  "dilemmaEdit",
  "dilemmaUi",
]) {
  assert.equal(stringsKoSource.includes(`${token}:`), false, `strings.ts should not keep removed feature section: ${token}`);
}

for (const token of [
  "DilemmaRecord",
  "DilemmaHistoryEntry",
  "DilemmaOutcome",
  "DilemmaPhoto",
  "ChronicleLedger",
  "CampaignLedger",
  "NextGameSetupState",
]) {
  assert.equal(clientTypesSource.includes(token), false, `src/types/game.ts should not expose removed feature type: ${token}`);
}

assert.match(appSource, /agenda-card-expand-button/);
assert.match(appSource, /toggleContent/);
assert.match(appSource, /AgendaSecretContent/);
assert.match(appSource, /agenda\.resourceGoal/);
assert.match(appSource, /agenda\.note/);
assert.match(appKoSource, /toggleContent/);
assert.match(appKoSource, /goalTitle/);
assert.match(appKoSource, /noteTitle/);
assert.doesNotMatch(agendaApiSource, /setBoardProcessingOwner/);
assert.match(clientTypesSource, /boardProcessingOwnerHouseId/);
assert.match(clientTypesSource, /isAdmin/);
assert.doesNotMatch(appSource, /BoardProcessingOwnerPanel/);
assert.match(boardProcessingPanelSource, /BoardProcessingEditorDialog/);
assert.match(boardProcessingPanelSource, /board-processing-dialog/);
assert.match(boardProcessingPanelSource, /PhotoAttachmentField/);
assert.match(boardProcessingPanelSource, /photos: draft\.photos/);
assert.match(boardProcessingPanelSource, /const closeEditor = useCallback/);
assert.match(boardProcessingHistoryDialogSource, /BoardProcessingPanel/);
assert.match(boardProcessingHistoryDialogSource, /mode="history"/);
assert.match(boardProcessingPanelSource, /canManageBoardProcessing/);
assert.match(boardProcessingHistoryDialogSource, /canManageBoardProcessing/);
assert.match(appSource, /onOpenBoardProcessingHistory/);
assert.match(appKoSource, /boardProcessingHistory/);
assert.doesNotMatch(boardProcessingPanelSource, /ownerRequired/);
assert.match(stringsKoSource, /adminOnly/);
assert.match(stringsKoSource, /editorDialogTitle/);
assert.match(stringsKoSource, /photoAdd/);
assert.match(dialogStylesSource, /z-index: 2147483200/);
assert.doesNotMatch(settingsStylesSource, /settings-menu > \.board-processing-panel/);
assert.match(boardProcessingStylesSource, /linear-gradient\(180deg, #243731, #111918\)/);
assert.match(entryStylesSource, /\.sidebar-title-row\s*\{[\s\S]*grid-template-columns: 38px minmax\(0, 1fr\);[\s\S]*gap: 8px;/);
assert.match(appSource, /className="inventory-toolbar"/);
assert.match(appSource, /className="inventory-toolbar-actions"/);
assert.doesNotMatch(appSource, /className="inventory-header"/);
assert.doesNotMatch(appSource, /className="inventory-actions"/);
assert.match(
  readCssBlock(entryStylesSource, ".council-entry"),
  /align-items:\s*start;/,
  "house-select columns should size to their own content instead of stretching each other",
);
assert.match(
  readCssBlock(entryStylesSource, ".seat-ledger"),
  /align-content:\s*start;/,
  "house-select form rows should not grow to fill extra column height",
);
assert.match(
  readCssBlock(entryStylesSource, ".seat-grid"),
  /align-items:\s*start;/,
  "house-select cards should keep content-height instead of stretching within grid rows",
);
assert.match(boardProcessingStylesSource, /\.panel-title-row\s*\{[\s\S]*grid-template-columns: 38px minmax\(0, 1fr\);[\s\S]*gap: 8px;/);
assert.match(boardProcessingStylesSource, /\.panel-title-icon\s*\{[\s\S]*width: 38px;[\s\S]*height: 38px;[\s\S]*border-radius: 50%;[\s\S]*color: var\(--gold-2\);/);
assert.match(boardProcessingStylesSource, /\.panel-title-icon svg\s*\{[\s\S]*width: 24px;[\s\S]*height: 24px;/);
assert.match(
  readCssBlock(boardProcessingStylesSource, ".inventory-toolbar"),
  /grid-area:\s*head;[\s\S]*display:\s*flex;[\s\S]*justify-content:\s*space-between;/,
  "inventory heading and actions should share one toolbar grid area",
);
assert.match(boardProcessingStylesSource, /\.inventory-toolbar h2\s*\{[\s\S]*margin: 0;[\s\S]*color: var\(--ink-strong\);[\s\S]*font-size: var\(--council-panel-title-size\);[\s\S]*line-height: 1\.05;/);
const houseProfileStoryBlock = readCssBlock(boardProcessingStylesSource, ".house-profile-story");
assert.match(
  houseProfileStoryBlock,
  /font-size:\s*0\.78rem;/,
  "house detail profile story should use compact long-text sizing",
);
assert.match(
  houseProfileStoryBlock,
  /line-height:\s*1\.4;/,
  "house detail profile story should use compact long-text line height",
);
const wideHouseProfileInventoryBlock = readCssBlock(responsiveStylesSource, ".inventory-panel.has-house-profile");
assert.match(
  wideHouseProfileInventoryBlock,
  /grid-template-rows:\s*auto\s+minmax\(0,\s*1fr\)\s+auto;/,
  "wide house inventory layout should make the three main sections share one equal-height row",
);
const wideHouseProfileInventoryBlocks = readCssBlocks(responsiveStylesSource, ".inventory-panel.has-house-profile");
const wideHouseProfileGridBlocks = wideHouseProfileInventoryBlocks.filter((block) => /"resources house challenge"/.test(block));
assert.ok(wideHouseProfileGridBlocks.length >= 2, "wide house inventory layout should define the shared desktop grid for full-width breakpoints");
for (const block of wideHouseProfileGridBlocks) {
  assert.match(
    block,
    /grid-template-columns:\s*max-content\s+minmax\(276px,\s*0\.78fr\)\s+minmax\(0,\s*1\.22fr\);/,
    "victory score column should size to content while detail stays narrower than challenge",
  );
  assert.match(
    block,
    /grid-template-areas:\s*"head head head"\s*"resources house challenge"\s*"progress progress progress";/,
    "wide house inventory layout should keep score, detail, and challenge in one shared row",
  );
  assert.doesNotMatch(
    block,
    /minmax\(0,\s*0\.9fr\)|minmax\(0,\s*0\.88fr\)|minmax\(154px,\s*0\.58fr\)|minmax\(148px,\s*0\.56fr\)|minmax\(0,\s*1\.18fr\)|minmax\(0,\s*1\.14fr\)/,
    "wide house inventory layout should not use the old six-track fractional split",
  );
}
const midWidthHouseProfileInventoryBlock = readCssBlock(
  readAtRuleBlock(responsiveStylesSource, "@media (min-width: 981px) and (max-width: 1279px)"),
  ".inventory-panel.has-house-profile",
);
assert.match(
  midWidthHouseProfileInventoryBlock,
  /grid-template-columns:\s*max-content\s+minmax\(0,\s*1fr\);/,
  "mid-width house inventory layout should place detail beside the content-width victory score column",
);
assert.match(
  midWidthHouseProfileInventoryBlock,
  /grid-template-areas:\s*"head head"\s*"resources house"\s*"challenge challenge"\s*"progress progress";/,
  "mid-width house inventory layout should use a two-over-one grid for score/detail and challenge",
);
assert.match(
  readCssBlock(
    readAtRuleBlock(responsiveStylesSource, "@media (min-width: 981px) and (max-width: 1279px)"),
    ".inventory-panel.has-house-profile > .house-detail-section > .house-profile-card",
  ),
  /width:\s*100%;/,
  "mid-width house detail card should fill its stacked section instead of leaving a fixed-width gutter",
);
assert.match(
  responsiveStylesSource,
  /\.inventory-panel\.has-house-profile \.resource-section,\s*\.inventory-panel\.has-house-profile \.house-detail-section,\s*\.inventory-panel\.has-house-profile \.inventory-challenge-section\s*\{[\s\S]*height:\s*100%;/,
  "victory score, detail, and challenge sections should stretch to the shared row height",
);
const wideResourceSectionBlock = readCssBlock(responsiveStylesSource, ".inventory-panel.has-house-profile .resource-section");
assert.match(
  wideResourceSectionBlock,
  /grid-template-rows:\s*minmax\(0,\s*1fr\);/,
  "victory score section should not reserve an unused grid row while matching the detail card",
);
assert.match(
  wideResourceSectionBlock,
  /gap:\s*0;/,
  "victory score section should remove its outer gap so the visible score grid reaches the shared row bottom",
);
assert.match(
  readCssBlock(responsiveStylesSource, ".inventory-panel.has-house-profile .resource-section > .inventory-counter-group"),
  /height:\s*100%;/,
  "victory score content should fill the equal-height row instead of ending above the detail card",
);
assert.match(
  readCssBlock(boardProcessingStylesSource, ".inventory-resource-grid.score-ledger-grid"),
  /grid-template-rows:\s*minmax\(0,\s*1fr\)\s+max-content;/,
  "prestige should take remaining score height while crave keeps compact content height",
);
assert.match(
  readCssBlock(boardProcessingStylesSource, ".score-track-row.tone-crave"),
  /height:\s*auto;/,
  "crave score card should not stretch to the prestige card height",
);
assert.match(
  boardProcessingStylesSource,
  /\.score-track-row\.tone-crave\s*\{[\s\S]*\.score-track-group\s*\{[\s\S]*grid-template-columns:\s*repeat\(5,\s*\$score-ledger-cell-size\);[\s\S]*grid-auto-rows:\s*\$score-ledger-cell-size;/,
  "crave score card should use the same marker cell size as prestige while keeping its own group count",
);
assert.match(
  boardProcessingStylesSource,
  /\.score-track-row\.tone-crave\s*\{[\s\S]*\.score-track-group span\s*\{[\s\S]*width:\s*\$score-ledger-cell-size;[\s\S]*height:\s*\$score-ledger-cell-size;/,
  "crave score markers should share the prestige marker dimensions",
);
const wideChallengeListBlock = readCssBlock(
  responsiveStylesSource,
  ".inventory-panel.has-house-profile .inventory-challenge-section .achievement-primary-list",
);
assert.match(
  wideChallengeListBlock,
  /height:\s*auto;/,
  "challenge list should not keep a fixed height when matching the detail card",
);
assert.match(
  wideChallengeListBlock,
  /flex:\s*1 1 auto;/,
  "challenge list should grow to fill the equal-height challenge section",
);
const narrowLayoutStylesSource = readAtRuleBlock(mobileStylesSource, "@media (max-width: 980px)");
const narrowScoreLedgerBlock = readCssBlock(narrowLayoutStylesSource, ".inventory-panel.has-house-profile .score-ledger-grid");
assert.match(
  narrowScoreLedgerBlock,
  /height:\s*auto;/,
  "narrow score ledger should not stretch prestige and crave cards taller than their content",
);
assert.match(
  narrowScoreLedgerBlock,
  /grid-template-rows:\s*repeat\(2,\s*max-content\);/,
  "narrow score ledger should let each score card keep compact content height",
);
assert.match(
  readCssBlock(narrowLayoutStylesSource, ".inventory-panel.has-house-profile .score-ledger-grid .score-track-row"),
  /min-height:\s*0;/,
  "narrow score ledger cards should remove the wide equal-height minimum",
);
assert.match(
  readCssBlock(narrowLayoutStylesSource, ".inventory-panel.has-house-profile .score-ledger-grid .score-track-group"),
  /height:\s*auto;/,
  "narrow score marker groups should not inherit stretched row height",
);
assert.match(
  readCssBlock(narrowLayoutStylesSource, ".inventory-panel.has-house-profile > .house-detail-section > .house-profile-card"),
  /width:\s*100%;/,
  "narrow detail card should fill its stacked section instead of leaving a fixed-width gutter",
);
assert.doesNotMatch(
  responsiveStylesSource,
  /\.house-profile-card p:last-child\s*\{[\s\S]*line-clamp/,
  "house detail profile story should not be clamped to a short summary",
);
assert.match(appKoSource, /bgmVolume:\s*"BGM"/);
assert.match(appKoSource, /bgmToggle:\s*"BGM 음소거 전환"/);
assert.match(appKoSource, /alignmentHeading:\s*"성향"/);
assert.match(appKoSource, /alignmentListAria:\s*"성향 진행"/);
assert.doesNotMatch(appKoSource, /alignmentHeading:\s*"업적"/);
assert.match(appSource, /className="settings-volume-mute-button"/);
assert.match(appSource, /aria-label=\{ko\.app\.settings\.bgmToggle\}/);
assert.doesNotMatch(appSource, /className="ghost-button wide"[\s\S]{0,240}aria-pressed=\{bgmMuted\}/);
assert.match(
  settingsStylesSource,
  /\.settings-volume-mute-button\s*\{[\s\S]*width: 34px;[\s\S]*height: 34px;[\s\S]*min-width: 34px;[\s\S]*min-height: 34px;[\s\S]*border: 1px solid transparent;[\s\S]*border-radius: 50%;[\s\S]*background: transparent;[\s\S]*padding: 0;/,
);

const settingsMenuIndex = appSource.indexOf('id="settings-menu"');
const tipsMenuIndex = appSource.indexOf('id="tips-menu"');
const historyPanelRenderIndex = appSource.indexOf('mode="history"', settingsMenuIndex);
const historyMenuButtonIndex = appSource.indexOf("onOpenBoardProcessingHistory", settingsMenuIndex);
const openAgendaGuideIndex = appSource.indexOf("onOpenOpenAgendaGuide", tipsMenuIndex);
const secretAgendaGuideIndex = appSource.indexOf("onOpenSecretAgendaGuide", tipsMenuIndex);
const specialAbilityLegendIndex = appSource.indexOf("onOpenSpecialAbilityLegend", tipsMenuIndex);
const boardProcessingGuideIndex = appSource.indexOf("onOpenBoardProcessingGuide", tipsMenuIndex);
const historyAdminGateIndex = appSource.indexOf("state?.isAdmin", settingsMenuIndex);
const boardProcessingPanelRenderIndex = appSource.indexOf('mode="input"', historyMenuButtonIndex);
const inputPanelGateIndex = appSource.indexOf("showBoardProcessingInputPanel");
const carrotRenderIndex = appSource.indexOf("<CarrotWaitAction />", boardProcessingPanelRenderIndex);
const gameFlowSectionIndex = appSource.indexOf("ko.app.settings.gameFlowSection", settingsMenuIndex);
const sessionEndPrepIndex = appSource.indexOf("ko.app.settings.sessionEndPrep", settingsMenuIndex);
const randomDiscardControlIndex = appSource.indexOf("ko.app.settings.randomDiscardAria", settingsMenuIndex);
const leaveCouncilIndex = appSource.indexOf("ko.app.settings.leaveCouncil", settingsMenuIndex);
const resetKingdomIndex = appSource.indexOf("ko.app.settings.resetKingdom", settingsMenuIndex);
const adminSectionIndex = appSource.indexOf("ko.app.settings.adminSection", settingsMenuIndex);
const adminModeControlIndex = appSource.indexOf("ko.app.settings.adminModeAria", settingsMenuIndex);
const appSectionIndex = appSource.indexOf("ko.app.settings.appSection", settingsMenuIndex);
const bgmVolumeHeadingIndex = appSource.indexOf('className="settings-volume-heading"', settingsMenuIndex);
const bgmMuteButtonIndex = appSource.indexOf('className="settings-volume-mute-button"', bgmVolumeHeadingIndex);
assert.ok(settingsMenuIndex > -1, "App should render the hamburger settings menu");
assert.ok(tipsMenuIndex > -1, "App should render the reference materials menu");
assert.ok(openAgendaGuideIndex > tipsMenuIndex, "reference menu should start with open-agenda score guidance");
assert.ok(specialAbilityLegendIndex > secretAgendaGuideIndex, "reference menu should expose the special ability legend after agenda score references");
assert.ok(boardProcessingGuideIndex > specialAbilityLegendIndex, "board-processing guide should remain after the special ability legend reference");
assert.match(appSource, /specialAbilityLegendOpen/);
assert.match(appSource, /restoreFocusRef=\{specialAbilityLegendButtonRef as any\}/);
assert.ok(historyMenuButtonIndex > settingsMenuIndex, "board-processing history should have a hamburger menu item");
assert.ok(historyAdminGateIndex > settingsMenuIndex, "board-processing history menu item should be gated to admins");
assert.equal(historyPanelRenderIndex, -1, "board-processing history should open in a modal instead of rendering inline in the hamburger menu");
assert.ok(inputPanelGateIndex > -1, "App should gate the board-processing input card visibility");
assert.ok(boardProcessingPanelRenderIndex > inputPanelGateIndex, "board-processing record card should render from the admin-gated input panel");
assert.ok(carrotRenderIndex > boardProcessingPanelRenderIndex, "board-processing record card should render above carrot action");
const sidebarTokenSectionIndex = appSource.indexOf("const tokenSection = (");
const sidebarAgendaSectionIndex = appSource.indexOf("const agendaSection = (");
const sidebarLedgerIndex = appSource.indexOf("const prioritySections = (");
const sidebarTokenClassIndex = appSource.indexOf("sidebar-ledger-tokens", sidebarTokenSectionIndex);
const sidebarAgendaClassIndex = appSource.indexOf("sidebar-ledger-agenda", sidebarAgendaSectionIndex);
const sidebarTokenAdjustIndex = appSource.indexOf("onIncrease={() => adjustCounter(counter, 1)}", sidebarTokenSectionIndex);
const sidebarAgendaToggleIndex = appSource.indexOf("toggleOpenAgendaToken(type.id, resourceId)", sidebarAgendaSectionIndex);
const sidebarLedgerTokenSlotIndex = appSource.indexOf("{tokenSection}", sidebarLedgerIndex);
const sidebarLedgerAgendaSlotIndex = appSource.indexOf("{agendaSection}", sidebarLedgerIndex);
assert.ok(sidebarLedgerIndex > -1, "personal ledger should expose a sidebar ledger slot");
assert.ok(sidebarTokenClassIndex > sidebarTokenSectionIndex, "token controls should render in the sidebar ledger");
assert.ok(sidebarAgendaClassIndex > sidebarAgendaSectionIndex, "agenda controls should render in the sidebar ledger");
assert.ok(sidebarTokenAdjustIndex > sidebarTokenSectionIndex, "moved token controls should keep the existing inventory adjust path");
assert.ok(sidebarAgendaToggleIndex > sidebarAgendaSectionIndex, "moved agenda controls should keep the existing agenda token toggle path");
assert.ok(sidebarLedgerTokenSlotIndex > sidebarLedgerIndex, "sidebar ledger should include token controls");
assert.ok(sidebarLedgerAgendaSlotIndex > sidebarLedgerTokenSlotIndex, "sidebar ledger should render agenda controls after token controls");
assert.match(
  boardProcessingStylesSource,
  /\.sidebar-ledger-tokens\s+\.inventory-resource-grid\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\);[\s\S]*\}/,
  "sidebar coin and power controls should stack vertically",
);
assert.match(
  readCssBlock(entryStylesSource, ".council-sidebar-column"),
  /--council-panel-title-size:\s*1\.02rem;/,
  "sidebar column panel title size should stay compact for sibling panels",
);
const councilSidebarBlock = readCssBlock(entryStylesSource, ".council-sidebar");
assert.match(
  councilSidebarBlock,
  /flex:\s*0 0 auto;/,
  "status sidebar should not shrink into a tiny scroll area when the ledger below is tall",
);
assert.match(
  councilSidebarBlock,
  /box-sizing:\s*border-box;/,
  "status sidebar should size its padding inside the fixed sidebar column",
);
assert.match(
  councilSidebarBlock,
  /width:\s*100%;/,
  "status sidebar should fill the sidebar column instead of using content-width fit-content",
);
assert.doesNotMatch(
  councilSidebarBlock,
  /overflow-y:\s*auto;/,
  "sidebar column should own vertical scrolling instead of the status sidebar",
);
assert.doesNotMatch(
  councilSidebarBlock,
  /overflow-x:\s*hidden;/,
  "status sidebar should not force vertical overflow to compute as auto",
);
assert.match(
  councilSidebarBlock,
  /overflow:\s*visible;/,
  "status sidebar should not create a nested scroll container",
);
assert.match(
  readCssBlock(boardProcessingStylesSource, ".sidebar-ledger-section"),
  /--inventory-title-font-size:\s*0\.86rem;/,
  "sidebar ledger headings should use compact typography",
);
assert.match(
  readCssBlock(boardProcessingStylesSource, ".sidebar-ledger-agenda .agenda-section-title-lead"),
  /justify-content:\s*space-between;/,
  "sidebar agenda title legend should attach to the right edge of the card header",
);
assert.match(
  readCssBlock(boardProcessingStylesSource, ".sidebar-ledger-agenda .agenda-type-legend"),
  /margin-left:\s*auto;/,
  "sidebar agenda common/secret legend should stay pushed to the right",
);
assert.match(
  readCssBlock(boardProcessingStylesSource, ".sidebar-ledger-agenda .open-agenda-token-heading"),
  /font-size:\s*0\.76rem;/,
  "sidebar open-agenda token headings should stay compact",
);
assert.match(
  readCssBlock(boardProcessingStylesSource, ".sidebar-ledger-agenda .resource-token-chip"),
  /padding:\s*2px;/,
  "sidebar open-agenda resource chips should collapse to icon-only spacing",
);
const sidebarResourceChipLabelBlock = readCssBlock(boardProcessingStylesSource, ".sidebar-ledger-agenda .resource-token-chip-label");
assert.match(
  sidebarResourceChipLabelBlock,
  /position:\s*absolute;/,
  "sidebar open-agenda resource chip labels should be visually hidden when width is tight",
);
assert.match(
  sidebarResourceChipLabelBlock,
  /clip:\s*rect\(0 0 0 0\);/,
  "sidebar open-agenda resource chip labels should stay available to layout-free tooltip text",
);
assert.match(
  readCssBlock(boardProcessingStylesSource, ".sidebar-ledger-section .counter-row .counter-label"),
  /font-size:\s*0\.82rem;/,
  "sidebar token labels should not inherit large main-panel counter text",
);
assert.match(
  readCssBlock(boardProcessingStylesSource, ".sidebar-ledger-section .counter-row .counter-controls output"),
  /font-size:\s*0\.82rem;/,
  "sidebar token values should not inherit large main-panel counter text",
);
assert.match(
  readCssBlock(boardProcessingStylesSource, ".inventory-resource-grid.score-ledger-grid"),
  /grid-template-columns:\s*1fr;/,
  "victory score prestige/crave cards should stack vertically instead of rendering side by side",
);
assert.match(
  readCssBlock(boardProcessingStylesSource, ".achievement-progress-row--challenge"),
  /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+max-content\s+max-content\s+minmax\(42px,\s*auto\);/,
  "challenge rows should reserve a distinct right-side action rail inside the card",
);
const challengeActionRailBlock = readCssBlock(boardProcessingStylesSource, ".achievement-card-action-rail");
assert.match(
  challengeActionRailBlock,
  /display:\s*grid;/,
  "challenge action rail should be its own grid area",
);
assert.match(
  challengeActionRailBlock,
  /border-left:\s*1px solid rgba\(234,\s*223,\s*189,\s*0\.14\);/,
  "challenge action rail should read as an in-card side area instead of a standalone button",
);
assert.match(
  readCssBlock(boardProcessingStylesSource, ".sidebar-ledger-agenda .own-choice h3"),
  /font-size:\s*1rem;/,
  "sidebar secret agenda title should read as a card heading",
);
const secretAgendaCardFrameBlock = readCssBlock(agendaTonesStylesSource, ".secret-agenda-card-frame");
assert.match(
  secretAgendaCardFrameBlock,
  /box-sizing:\s*border-box;/,
  "secret agenda card frame should include padding and border inside its narrow width",
);
assert.match(
  secretAgendaCardFrameBlock,
  /width:\s*100%;/,
  "secret agenda card frame should stretch to its narrow container instead of shrink-wrapping content",
);
assert.match(
  secretAgendaCardFrameBlock,
  /max-width:\s*100%;/,
  "secret agenda card frame should not overflow its narrow container",
);
const secretAgendaCardInnerBlock = readCssBlock(agendaTonesStylesSource, ".secret-agenda-card-inner");
assert.match(
  secretAgendaCardInnerBlock,
  /box-sizing:\s*border-box;/,
  "secret agenda card inner should include padding and border inside its frame width",
);
assert.match(
  secretAgendaCardInnerBlock,
  /width:\s*100%;/,
  "secret agenda card inner should fill the frame on narrow screens",
);
assert.match(
  readCssBlock(agendaTonesStylesSource, ".agenda-score-board"),
  /--agenda-score-value-column:\s*calc\(3ch \+ 10px\);/,
  "secret agenda score tables should define a stable value column wide enough for +20",
);
assert.match(
  readCssBlock(agendaTonesStylesSource, ".agenda-score-table-title"),
  /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+var\(--agenda-score-value-column\);/,
  "secret agenda score table headers should align with the fixed score value column",
);
const agendaScoreSegmentBlock = readCssBlock(agendaTonesStylesSource, ".agenda-score-segment");
assert.match(
  agendaScoreSegmentBlock,
  /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+var\(--agenda-score-value-column\);/,
  "secret agenda score rows should keep the divider aligned for one- and two-digit values",
);
assert.doesNotMatch(
  agendaScoreSegmentBlock,
  /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto;/,
  "secret agenda score rows should not auto-size the value column by digit count",
);
assert.match(
  readCssBlock(agendaTonesStylesSource, ".agenda-score-segment span"),
  /border-right:\s*1px solid rgba\(31,\s*38,\s*33,\s*0\.15\);/,
  "secret agenda score row label/value divider should stay on the fixed grid boundary",
);
assert.match(
  agendaTonesStylesSource,
  /\.agenda-score-segment strong\s*\{[^}]*font-variant-numeric:\s*tabular-nums;/,
  "secret agenda score values should use tabular numerals",
);
assert.ok(gameFlowSectionIndex > settingsMenuIndex, "settings menu should start flow actions with the game-flow section label");
assert.ok(sessionEndPrepIndex > gameFlowSectionIndex, "round-end action should render under the game-flow section");
assert.ok(randomDiscardControlIndex > sessionEndPrepIndex, "random discard should render with game-flow controls");
assert.ok(adminSectionIndex > randomDiscardControlIndex, "admin section should follow game-flow actions");
assert.ok(adminModeControlIndex > adminSectionIndex, "admin mode should render under the admin section label");
assert.ok(appSectionIndex > adminModeControlIndex, "app settings should follow admin controls");
assert.ok(bgmVolumeHeadingIndex > settingsMenuIndex, "BGM controls should render inside the settings menu");
assert.ok(bgmVolumeHeadingIndex > appSectionIndex, "BGM controls should render under the app settings label");
assert.ok(bgmMuteButtonIndex > bgmVolumeHeadingIndex, "BGM mute should be an icon button in the volume heading");
assert.ok(leaveCouncilIndex > bgmVolumeHeadingIndex, "leave-council should render with app settings controls");
assert.ok(resetKingdomIndex > leaveCouncilIndex, "kingdom reset should render after leave-council");
assert.doesNotMatch(settingsStylesSource, /grid-auto-flow:\s*row\s+dense/, "settings menu grid should not backfill controls above section labels");

for (const [key, label] of [
  ["openSettings", "게임 메뉴 열기"],
  ["openTips", "참고자료 열기"],
  ["specialAbilityLegend", "특수 능력 범례"],
  ["gameFlowSection", "게임 흐름"],
  ["adminSection", "관리자"],
  ["appSection", "앱 설정"],
  ["sessionEndPrep", "라운드 종료 준비"],
  ["boardProcessingHistory", "유형별 정리 기록"],
  ["bgmVolume", "BGM"],
  ["randomDiscard", "무작위 의제 폐기"],
  ["leaveCouncil", "의회 퇴장"],
  ["resetKingdom", "왕국 초기화"],
]) {
  assert.match(appKoSource, new RegExp(`${key}:\\s*"${label}"`), `settings label should remain exact: ${key}`);
}

assert.match(packageJson.scripts?.test || "", /feature-slimdown\.test\.mts/);
assert.match(packageJson.scripts?.test || "", /secret-agenda-scoring\.test\.mts/);
assert.match(packageJson.scripts?.test || "", /board-processing-api\.test\.mts/);
assert.match(packageJson.scripts?.test || "", /board-processing-panel-render\.test\.tsx/);
assert.match(packageJson.scripts?.test || "", /council-layout-render\.test\.tsx/);
assert.doesNotMatch(packageJson.scripts?.test || "", /dilemma-ui-render|chronicle-ledger|agenda-chronicle-api|agenda-campaign-api|agenda-backfill-api/);

console.log("feature-slimdown tests passed");
