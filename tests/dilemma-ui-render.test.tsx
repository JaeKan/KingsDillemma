import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import type { RefObject } from "react";
import DilemmaEditDialog from "../src/components/DilemmaEditDialog.tsx";
import DilemmaResolutionDialog from "../src/components/DilemmaResolutionDialog.tsx";
import DilemmaHistoryDialog from "../src/components/DilemmaHistoryDialog.tsx";
import { DilemmaOutcomeEffectEditor } from "../src/components/DilemmaEditDialog.tsx";
import { DilemmaOutcomePreview, DilemmaSummaryCard, DilemmaVotingPanel } from "../src/components/DilemmaUI.tsx";
import { HOUSE_CATALOG, dilemmaResultMarkers, ko } from "../src/resources/gameResources.ts";
import { createDilemmaDraft, createDilemmaPayload } from "../src/utils/dilemma-helpers.ts";
import type { RedactedHouse } from "../src/types/game.ts";

const outcomeHtml = renderToStaticMarkup(
  <DilemmaOutcomePreview
    label="찬성"
    selected
    outcome={{
      result: "@재화 보상",
      resourcePolarities: { wealth: "positive" },
      resourceDeltas: { wealth: 2, morale: -1 },
      effects: [
        { id: "resource-wealth", type: "resource", resourceId: "wealth", amount: 2 },
        { id: "note-1", type: "note", text: "봉투 70 확인" },
      ],
    }}
  />,
);

assert.match(outcomeHtml, /찬성/);
assert.match(outcomeHtml, new RegExp(ko.dilemmaResolution.labelBackResult));
assert.match(outcomeHtml, /재화 보상/);
assert.match(outcomeHtml, /\+2/);
assert.match(outcomeHtml, /-1/);
assert.match(outcomeHtml, /봉투 70 확인/);

assert.equal(ko.dilemmaResolution.resourceBackDeltaSection, "결과에 따른 자원 수치");
assert.equal(ko.dilemmaResolution.outcomeLocked("찬성"), "투표 집계 결과 「찬성」으로 확정되었습니다.");
assert.doesNotMatch(ko.dilemmaResolution.stepOutcome, /^\d+\./);
assert.doesNotMatch(ko.dilemmaResolution.stepTimeSlot, /^\d+\./);
assert.doesNotMatch(ko.dilemmaResolution.stepRulebookChecklist, /^\d+\./);
assert.doesNotMatch(ko.dilemmaResolution.stepFollowUp, /^\d+\./);

const effectEditorHtml = renderToStaticMarkup(
  <DilemmaOutcomeEffectEditor
    outcomeLabel="찬성"
    houses={[
      { id: "gamam", koreanTitle: "가맘 공작가", name: "House Gamam" },
      { id: "solad", koreanTitle: "솔라드 공작가", name: "House Solad" },
    ]}
    effects={[
      {
        id: "story-1",
        type: "story",
        cardCode: "S.99.0.F",
        status: "active",
        signedByHouseId: "solad",
        photos: [
          {
            id: "effect-photo-1",
            name: "effect-proof.jpg",
            mimeType: "image/jpeg",
            dataUrl: "data:image/jpeg;base64,proof",
            size: 5,
            addedAt: "",
            addedBy: null,
            addedByName: "",
          },
        ],
      },
      { id: "envelope-1", type: "envelope", envelopeCode: "70" },
    ]}
    onChange={() => undefined}
  />,
);

assert.match(effectEditorHtml, /드래그/);
assert.match(effectEditorHtml, /서명 가문/);
assert.match(effectEditorHtml, /dilemma-outcome-effect-toolbar/);
assert.match(effectEditorHtml, /dilemma-outcome-effect-fields/);
assert.match(effectEditorHtml, new RegExp(`aria-label="${ko.dilemmaEdit.effectType}"`));
assert.match(effectEditorHtml, /dilemma-outcome-effect-photo-add/);
assert.match(effectEditorHtml, /dilemma-outcome-effect-photo-strip/);
assert.match(effectEditorHtml, /effect-proof\.jpg/);
assert.doesNotMatch(effectEditorHtml, /dilemma-photo-editor/);
assert.doesNotMatch(effectEditorHtml, new RegExp(ko.dilemmaEdit.effectPhotoSectionTitle));
assert.doesNotMatch(effectEditorHtml, new RegExp(ko.dilemmaEdit.effectPhotoHelp));
assert.doesNotMatch(effectEditorHtml, new RegExp(ko.dilemmaEdit.effectPhotoEmpty));
assert.doesNotMatch(effectEditorHtml, />↑</);
assert.doesNotMatch(effectEditorHtml, />↓</);
assert.doesNotMatch(effectEditorHtml, /dilemma-outcome-effect-order/);

const testHouses = HOUSE_CATALOG.slice(0, 2).map((house, index) => ({
  ...house,
  houseId: house.id,
  player: index + 1,
  hasSession: true,
  hasPassword: true,
  hasChosen: true,
  isCurrentTurn: false,
  isSelf: false,
})) as RedactedHouse[];

const voteHouses = HOUSE_CATALOG.map((house, index) => ({
  ...house,
  houseId: house.id,
  player: house.number,
  name: house.koreanTitle,
  hasSession: index < 5,
  hasPassword: true,
  hasChosen: true,
  isCurrentTurn: false,
  isSelf: index === 0,
})) as RedactedHouse[];
const voteParticipants = voteHouses.slice(0, 5);
const votePanelDilemma = createDilemmaPayload({
  cardCode: "V.00.1",
  context: "투표 상황",
  aye: { result: "찬성 결과" },
  nay: { result: "반대 결과" },
});
const votePanelState = {
  phase: "complete",
  currentHouseId: voteParticipants[0].id,
  houses: voteHouses,
  dilemma: votePanelDilemma,
  dilemmaLeader: voteParticipants[0].id,
  dilemmaModerator: voteParticipants[1].id,
  dilemmaVoteOrder: voteParticipants.map((house) => house.id),
  canVoteDilemma: true,
  canApplyDilemmaVotes: false,
  ownInventory: { powerTokens: 8 },
};

const initialVotingPanelHtml = renderToStaticMarkup(
  <DilemmaVotingPanel
    state={votePanelState}
    busy={false}
    mutate={async () => true}
  />,
);

assert.doesNotMatch(initialVotingPanelHtml, /tone-aye selected/);
assert.doesNotMatch(initialVotingPanelHtml, /tone-nay selected/);
assert.doesNotMatch(initialVotingPanelHtml, /tone-pass selected/);
assert.equal(initialVotingPanelHtml.includes(ko.dilemmaUi.voteSavedOk), false);

const allVotedPanelHtml = renderToStaticMarkup(
  <DilemmaVotingPanel
    state={{
      ...votePanelState,
      canVoteDilemma: false,
      canApplyDilemmaVotes: true,
      dilemma: {
        ...votePanelDilemma,
        votes: Object.fromEntries(
          voteParticipants.map((house, index) => [
            house.id,
            { side: index === 1 ? "nay" : "aye", powerTokens: 1, updatedAt: "", updatedByName: "" },
          ]),
        ),
      },
    }}
    busy={false}
    mutate={async () => true}
  />,
);

assert.match(allVotedPanelHtml, new RegExp(ko.dilemmaUi.applyTally));
assert.equal(allVotedPanelHtml.includes(ko.dilemmaUi.applyHint), false);
assert.equal(allVotedPanelHtml.includes(ko.dilemmaUi.applyWaitEditor), false);

const summaryDilemma = createDilemmaPayload({
  cardCode: "S.00.1.F",
  title: "테스트 딜레마",
  context: "상황",
  mysteryStickerId: "rulebook-42-1",
  timeCounterSlot: "시간 카운터 3",
  aye: {
    result: "찬성 결과",
    resourcePolarities: { wealth: "positive" },
    effects: [
      { id: "summary-envelope", type: "envelope", envelopeCode: "70" },
      {
        id: "summary-story",
        type: "story",
        cardCode: "S.99.0.F",
        status: "active",
        signedByHouseId: testHouses[1].id,
        signedByName: testHouses[1].koreanTitle,
      },
    ],
  },
  nay: { result: "반대 결과", resourcePolarities: { morale: "negative" } },
  selectedOutcome: "aye",
  voteNotes: "투표 집계 텍스트",
  votes: {
    [testHouses[0].id]: { side: "aye", powerTokens: 1, updatedAt: "" },
    [testHouses[1].id]: { side: "pass", powerTokens: 0, updatedAt: "" },
  },
  resolutionPhotos: [
    {
      id: "summary-board-photo",
      name: "summary-board.jpg",
      mimeType: "image/jpeg",
      dataUrl: "data:image/jpeg;base64,summary",
      size: 4,
      addedAt: "",
      addedBy: null,
      addedByName: "",
    },
  ],
  resolutionChecklist: {
    memo: "왕국 보드 메모 표시",
  },
  resolutionNotes: "삭제되어야 하는 결과 후속 텍스트",
});

const summaryHtml = renderToStaticMarkup(
  <DilemmaSummaryCard
    busy={false}
    currentHouseId="gamam"
    dilemma={summaryDilemma}
    leaderHouseId={testHouses[0].id}
    moderatorHouseId={testHouses[1].id}
    houses={testHouses}
    onEdit={() => undefined}
    onOpenRoleDialog={() => undefined}
    onPublish={() => undefined}
    onReset={() => undefined}
  />,
);

const preTallySummaryHtml = renderToStaticMarkup(
  <DilemmaSummaryCard
    busy={false}
    currentHouseId="gamam"
    dilemma={{
      ...summaryDilemma,
      selectedOutcome: "",
      voteNotes: "",
      votes: {
        [testHouses[0].id]: { side: "aye", powerTokens: 1, updatedAt: "" },
      },
    } as any}
    leaderHouseId={testHouses[0].id}
    moderatorHouseId={testHouses[1].id}
    houses={testHouses}
    onEdit={() => undefined}
    onOpenRoleDialog={() => undefined}
    onPublish={() => undefined}
    onReset={() => undefined}
  />,
);

assert.match(preTallySummaryHtml, /dilemma-vote-breakdown/);
assert.doesNotMatch(preTallySummaryHtml, /dilemma-summary-vote-pills/);
assert.doesNotMatch(preTallySummaryHtml, new RegExp(ko.dilemmaUi.factAdvantage));

assert.doesNotMatch(summaryHtml, /삭제되어야 하는 결과 후속 텍스트/);
assert.doesNotMatch(
  summaryHtml,
  new RegExp(`<div class="dilemma-text-preview"><span>${ko.dilemmaHistory.labelFollowUp}</span>`),
);
assert.match(summaryHtml, /왕국 보드 메모 표시/);
assert.ok(
  summaryHtml.indexOf("왕국 보드 메모 표시") <
    summaryHtml.indexOf(ko.dilemmaHistory.labelPhotosResolution),
);
assert.match(summaryHtml, new RegExp(ko.dilemmaHistory.labelPhotosResolution));
assert.doesNotMatch(summaryHtml, /후속·결과 사진/);
assert.match(
  summaryHtml,
  new RegExp(`class="section-label dilemma-summary-roles-label">${ko.dilemmaUi.summaryLabelRoles}</p>`),
);
assert.ok(
  summaryHtml.indexOf("dilemma-summary-roles-label") < summaryHtml.indexOf(ko.dilemmaUi.sessionLeader),
  "역할 라벨은 리더/중재자 칩 묶음 앞에 있어야 합니다.",
);
assert.ok(
  summaryHtml.indexOf("투표 집계 텍스트") > -1 &&
    summaryHtml.indexOf("투표 집계 텍스트") > summaryHtml.indexOf("dilemma-vote-breakdown"),
  "투표 결과 텍스트는 찬성/반대/기권 투표 카드 아래에 있어야 합니다.",
);
assert.ok(
  summaryHtml.indexOf(ko.dilemmaUi.factAdvantage) > summaryHtml.indexOf("dilemma-vote-breakdown"),
  "우세 칩은 찬성/반대/기권 투표 카드 아래에 있어야 합니다.",
);
assert.doesNotMatch(
  summaryHtml,
  new RegExp(`<div class="dilemma-text-preview"><span>${ko.dilemmaHistory.labelVote}</span>`),
);
assert.ok(
  summaryHtml.indexOf("상황") > -1 &&
    summaryHtml.indexOf("상황") < summaryHtml.indexOf("dilemma-vote-breakdown"),
  "상황은 찬성/반대/기권 투표 칩 위에 있어야 합니다.",
);
assert.ok(
  summaryHtml.indexOf("dilemma-summary-vote-divider") > summaryHtml.indexOf("상황") &&
    summaryHtml.indexOf("dilemma-summary-vote-divider") < summaryHtml.indexOf("dilemma-vote-breakdown"),
  "투표 내용 구분선은 상황 아래, 투표 상세 위에 있어야 합니다.",
);
assert.match(summaryHtml, new RegExp(ko.dilemmaEdit.effectSection));
assert.match(summaryHtml, /봉투 70/);
assert.match(summaryHtml, /이야기 · S\.99\.0\.F/);
assert.match(summaryHtml, new RegExp(testHouses[1].koreanTitle));

const historyDialogHtml = renderToStaticMarkup(
  <DilemmaHistoryDialog
    busy={false}
    currentHouseId="gamam"
    houses={testHouses}
    history={[
      {
        ...summaryDilemma,
        historyId: "history-summary",
        savedAt: "2026-05-13T05:00:00.000Z",
        savedBy: "gamam",
        savedByName: "House Pinchay",
        updatedAt: "2026-05-13T05:00:00.000Z",
        updatedByName: "House Pinchay",
      } as any,
    ]}
    open
    onClose={() => undefined}
    onDelete={() => undefined}
    restoreFocusRef={{ current: null } as unknown as RefObject<HTMLElement>}
  />,
);

assert.match(historyDialogHtml, new RegExp(ko.dilemmaHistory.boardPhotoArchiveTitle));
assert.match(historyDialogHtml, /dilemma-history-sticker-wrap/);
assert.match(historyDialogHtml, /dilemma-history-board-photo-frame/);
assert.match(historyDialogHtml, new RegExp(ko.dilemmaUi.summaryLabelCardCode));
assert.match(historyDialogHtml, new RegExp(ko.dilemmaUi.summaryLabelTimeSlot));
assert.match(historyDialogHtml, new RegExp(ko.dilemmaUi.summaryLabelStorySticker));
assert.match(historyDialogHtml, /summary-board\.jpg/);
assert.match(historyDialogHtml, /왕국 보드 메모 표시/);
assert.doesNotMatch(historyDialogHtml, new RegExp(`<span>${ko.dilemmaHistory.labelQuestion}</span>`));
assert.doesNotMatch(historyDialogHtml, new RegExp(ko.dilemmaHistory.detailSection));
assert.doesNotMatch(historyDialogHtml, /<h3>S\.00\.1\.F/);
assert.doesNotMatch(historyDialogHtml, /삭제되어야 하는 결과 후속 텍스트/);
assert.ok(
  historyDialogHtml.indexOf("dilemma-vote-breakdown") <
    historyDialogHtml.indexOf("dilemma-summary-vote-pills"),
  "딜레마 이력 상세도 표시판처럼 투표 상세 아래에 결과/우세 칩을 표시해야 합니다.",
);
assert.ok(
  historyDialogHtml.indexOf("왕국 보드 메모 표시") <
    historyDialogHtml.indexOf(ko.dilemmaHistory.labelPhotosResolution),
  "이력 상세의 결과 메모는 왕국 보드 사진 위에 있어야 합니다.",
);

const editDialogHtml = renderToStaticMarkup(
  <DilemmaEditDialog
    busy={false}
    draft={createDilemmaDraft(summaryDilemma)}
    isNewDilemma={false}
    open
    restoreFocusRef={{ current: null } as unknown as RefObject<HTMLElement>}
    onAddPhotos={async () => undefined}
    onCancel={() => undefined}
    onFieldChange={() => undefined}
    onOutcomeChange={() => undefined}
    onRemovePhoto={() => undefined}
    onSave={() => undefined}
    photoBusy={false}
    photoError={null}
  />,
);

assert.equal((editDialogHtml.match(/dilemma-resource-deltas-rows--compact/g) || []).length, 2);
assert.equal(
  (editDialogHtml.match(/dilemma-resource-delta-edit-row--compact/g) || []).length,
  dilemmaResultMarkers.length * 2,
);

const resolutionDialogHtml = renderToStaticMarkup(
  <DilemmaResolutionDialog
    busy={false}
    currentHouseId="gamam"
    dilemmaModeratorId="solad"
    draft={createDilemmaDraft({
      ...summaryDilemma,
      resolutionPhotos: [
        {
          id: "board-photo",
          name: "board.jpg",
          mimeType: "image/jpeg",
          dataUrl: "data:image/jpeg;base64,abc",
          size: 3,
          addedAt: "",
          addedBy: null,
          addedByName: "",
        },
      ],
    })}
    history={[]}
    houses={testHouses}
    mutate={async () => true}
    open
    restoreFocusRef={{ current: null } as unknown as RefObject<HTMLElement>}
    onCancel={() => undefined}
    onFieldChange={() => undefined}
    onSave={() => undefined}
    photoBusy={false}
    photoError={null}
    onAddResolutionPhotos={async () => undefined}
    onRemoveResolutionPhoto={() => undefined}
  />,
);

assert.match(resolutionDialogHtml, /왕국 보드 사진/);
assert.match(resolutionDialogHtml, /왕국 보드의 자원 트랙/);
assert.match(resolutionDialogHtml, /dilemma-resource-deltas-rows--compact/);
assert.match(resolutionDialogHtml, /dilemma-resource-deltas-rows--resolution/);
assert.match(resolutionDialogHtml, /dilemma-resource-delta-edit-row--compact/);
assert.match(resolutionDialogHtml, /dilemma-resolution-effects-edit/);
assert.ok(
  resolutionDialogHtml.indexOf("dilemma-resolution-resource-deltas-label") <
    resolutionDialogHtml.indexOf('class="dilemma-resolution-resource-deltas"'),
);
assert.match(resolutionDialogHtml, /aria-labelledby="[^"]+"/);
assert.match(resolutionDialogHtml, /dilemma-field-help-button/);
assert.doesNotMatch(resolutionDialogHtml, /dilemma-resolution-result-entry/);
assert.match(resolutionDialogHtml, new RegExp(`aria-label="${ko.dilemmaResolution.timeSlotHelpAria}"`));
assert.match(resolutionDialogHtml, new RegExp(`aria-label="${ko.dilemmaResolution.rulebookChecklistHelpAria}"`));
assert.doesNotMatch(
  resolutionDialogHtml,
  new RegExp(`class="dilemma-resolution-step-body">${ko.dilemmaResolution.timeSlotHelp}`),
);
assert.doesNotMatch(
  resolutionDialogHtml,
  new RegExp(`class="dilemma-resolution-step-body">${ko.dilemmaResolution.rulebookChecklistHelp}`),
);
assert.doesNotMatch(resolutionDialogHtml, /결과 후속/);
