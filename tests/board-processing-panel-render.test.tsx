import { renderToStaticMarkup } from "react-dom/server";
import assert from "node:assert/strict";
import BoardProcessingPanel from "../src/components/BoardProcessingPanel";
import { BoardProcessingRecordDialog } from "../src/components/BoardProcessingPanel";
import BoardProcessingHistoryMenu from "../src/components/BoardProcessingHistoryMenu";
import BoardProcessingTypeHistoryDialog from "../src/components/BoardProcessingTypeHistoryDialog";
import type { BoardProcessingItem, RedactedHouse } from "../src/types/game";

const houses = [
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
    name: "가맘",
    hasCustomName: true,
    hasSession: true,
    hasPassword: true,
    hasChosen: true,
    isCurrentTurn: false,
    isSelf: true,
  },
  {
    id: "solad",
    houseId: "solad",
    player: 2,
    number: 2,
    title: "Solad",
    koreanTitle: "솔라드",
    motto: "",
    crest: "",
    goal: "",
    alignments: [],
    profile: "",
    motif: "rose",
    name: "솔라드",
    hasCustomName: true,
    hasSession: true,
    hasPassword: true,
    hasChosen: true,
    isCurrentTurn: false,
    isSelf: false,
  },
] as RedactedHouse[];

const items = [
  {
    id: "bp-1",
    type: "envelope",
    envelopeCode: "70",
    note: "개봉 확인 @복지 #솔라드 공작가",
    createdAt: "2026-05-31T12:00:00.000Z",
    updatedAt: "2026-05-31T12:00:00.000Z",
    createdBy: "gamam",
    createdByName: "가맘",
    photos: [
      {
        id: "photo-1",
        name: "board-photo.png",
        mimeType: "image/png",
        dataUrl: "data:image/png;base64,iVBORw0KGgo=",
        createdAt: "2026-05-31T12:00:00.000Z",
      },
    ],
  },
  {
    id: "bp-2",
    type: "mystery",
    dossierLetter: "A",
    storylineSymbol: "왕관",
    slotKey: "3",
    note: "",
    createdAt: "2026-05-31T12:01:00.000Z",
    updatedAt: "2026-05-31T12:01:00.000Z",
    createdBy: "gamam",
    createdByName: "가맘",
  },
  {
    id: "bp-3",
    type: "envelope",
    envelopeCode: "71",
    note: "추가 개봉",
    createdAt: "2026-05-31T12:02:00.000Z",
    updatedAt: "2026-05-31T12:02:00.000Z",
    createdBy: "gamam",
    createdByName: "가맘",
  },
  {
    id: "bp-4",
    type: "story",
    cardCode: "S12",
    status: "active",
    signedByHouseId: "solad",
    signedByName: "솔라드",
    signerBonusText: "@코인 +2 #솔라드 공작가",
    note: "",
    createdAt: "2026-05-31T12:03:00.000Z",
    updatedAt: "2026-05-31T12:03:00.000Z",
    createdBy: "gamam",
    createdByName: "가맘",
  },
] as BoardProcessingItem[];

const html = renderToStaticMarkup(
  <BoardProcessingPanel
    busy={false}
    canManageBoardProcessing
    currentHouseId="gamam"
    history={{ envelope: [items[0], items[2]], mystery: [items[1]] }}
    houses={houses}
    items={items}
    mutate={async () => ({ ok: true })}
  />,
);

assert.match(html, /구성물 정리 기록/);
assert.doesNotMatch(html, /입력은 이곳 한 곳에서만 하고/);
assert.match(html, /구성물 정리 기록 추가/);
assert.match(html, /유형별 정리 기록/);
assert.match(html, /봉투 개봉/);
assert.match(html, /미스터리 스티커/);
assert.match(html, /70/);
assert.match(html, /A · 왕관 · 3/);
assert.match(html, /board-processing-entry-menu-button/);
assert.doesNotMatch(html, /board-processing-entry-photos/);
assert.doesNotMatch(html, /alt="board-photo\.png"/);
assert.equal(html.includes("board-processing-dialog"), false);

const nonAdminHtml = renderToStaticMarkup(
  <BoardProcessingPanel
    busy={false}
    canManageBoardProcessing={false}
    currentHouseId="solad"
    history={{ envelope: [items[0], items[2]], mystery: [items[1]] }}
    houses={houses}
    items={items}
    mutate={async () => ({ ok: true })}
  />,
);

assert.equal(nonAdminHtml, "");

const inputOnlyHtml = renderToStaticMarkup(
  <BoardProcessingPanel
    busy={false}
    canManageBoardProcessing
    currentHouseId="gamam"
    history={{ envelope: [items[0], items[2]], mystery: [items[1]] }}
    houses={houses}
    items={items}
    mode="input"
    mutate={async () => ({ ok: true })}
  />,
);

assert.match(inputOnlyHtml, /구성물 정리 기록 추가/);
assert.match(inputOnlyHtml, /board-processing-actions board-processing-actions--input-only/);
assert.match(inputOnlyHtml, /board-processing-add-cta/);
assert.match(inputOnlyHtml, /board-processing-add-cta-icon/);
assert.match(inputOnlyHtml, /board-processing-add-cta-copy/);
assert.match(inputOnlyHtml, /처리한 구성물과 사진을 새 기록으로 남깁니다/);
assert.doesNotMatch(inputOnlyHtml, /board-processing-header/);
assert.doesNotMatch(inputOnlyHtml, /<p class="section-label">구성물 정리<\/p>/);
assert.doesNotMatch(inputOnlyHtml, /<h2 id="board-processing-title">구성물 정리 기록<\/h2>/);
assert.doesNotMatch(inputOnlyHtml, /유형별 정리 기록/);

const historyOnlyHtml = renderToStaticMarkup(
  <BoardProcessingPanel
    busy={false}
    canManageBoardProcessing
    currentHouseId="gamam"
    history={{ envelope: [items[0], items[2]], mystery: [items[1]] }}
    houses={houses}
    items={items}
    mode="history"
    mutate={async () => ({ ok: true })}
  />,
);

assert.match(historyOnlyHtml, /유형별 정리 기록/);
assert.match(historyOnlyHtml, /70/);
assert.doesNotMatch(historyOnlyHtml, /구성물 정리 기록 추가/);

const historyMenuHtml = renderToStaticMarkup(
  <BoardProcessingHistoryMenu
    busy={false}
    canManageBoardProcessing
    history={{ envelope: [items[0], items[2]], mystery: [items[1]] }}
    items={items}
    onOpenType={() => {}}
    open
  />,
);

assert.match(historyMenuHtml, /id="board-processing-history-menu"/);
assert.match(historyMenuHtml, /유형별 정리 기록/);
assert.match(historyMenuHtml, /봉투 개봉/);
assert.match(historyMenuHtml, /board-processing-type-menu-button/);
assert.match(historyMenuHtml, /board-processing-type-menu-count/);
assert.match(historyMenuHtml, /총 2건/);
assert.doesNotMatch(historyMenuHtml, /<svg/);
assert.doesNotMatch(historyMenuHtml, /role="dialog"/);
assert.doesNotMatch(historyMenuHtml, /70/);
assert.doesNotMatch(historyMenuHtml, /board-processing-entry-menu-button/);
assert.doesNotMatch(historyMenuHtml, /board-processing-entry-photos/);
assert.doesNotMatch(historyMenuHtml, /구성물 정리 기록 추가/);

const typeHistoryDialogHtml = renderToStaticMarkup(
  <BoardProcessingTypeHistoryDialog
    busy={false}
    canDelete
    history={{ envelope: [items[0], items[2]], mystery: [items[1]] }}
    items={items}
    onClose={() => {}}
    onDelete={async () => true}
    restoreFocusRef={{ current: null }}
    selectedType="envelope"
  />,
);

assert.match(typeHistoryDialogHtml, /role="dialog"/);
assert.match(typeHistoryDialogHtml, /board-processing-type-history-dialog--wide/);
assert.match(typeHistoryDialogHtml, /board-processing-type-dialog-summary/);
assert.match(typeHistoryDialogHtml, /board-processing-type-dialog-toolbar/);
assert.match(typeHistoryDialogHtml, /board-processing-type-dialog-list/);
assert.match(typeHistoryDialogHtml, /board-processing-type-dialog-target/);
assert.match(typeHistoryDialogHtml, /총 2건/);
assert.match(typeHistoryDialogHtml, /선택 기록/);
assert.match(typeHistoryDialogHtml, /봉투 개봉/);
assert.match(typeHistoryDialogHtml, /70/);
assert.match(typeHistoryDialogHtml, /71/);
assert.match(typeHistoryDialogHtml, /추가 개봉/);
assert.doesNotMatch(typeHistoryDialogHtml, /미스터리 스티커/);
assert.doesNotMatch(typeHistoryDialogHtml, /A · 왕관 · 3/);

const recordDialogHtml = renderToStaticMarkup(
  <BoardProcessingRecordDialog
    busy={false}
    canDelete
    houses={houses}
    item={items[0]}
    onClose={() => {}}
    onDelete={() => {}}
    restoreFocusRef={{ current: null }}
  />,
);

assert.match(recordDialogHtml, /board-processing-record-dialog--wide/);
assert.match(recordDialogHtml, /board-processing-record-dialog-summary/);
assert.match(recordDialogHtml, /board-processing-record-dialog-body/);
assert.match(recordDialogHtml, /봉투 개봉/);
assert.match(recordDialogHtml, /70/);
assert.match(recordDialogHtml, /mention-token-chip/);
assert.match(recordDialogHtml, /house-mention-token-chip/);
assert.match(recordDialogHtml, /aria-label="복지"/);
assert.match(recordDialogHtml, /솔라드/);

const storyRecordDialogHtml = renderToStaticMarkup(
  <BoardProcessingRecordDialog
    busy={false}
    canDelete
    houses={houses}
    item={items[3]}
    onClose={() => {}}
    onDelete={() => {}}
    restoreFocusRef={{ current: null }}
  />,
);

assert.match(storyRecordDialogHtml, /서명인 보너스/);
assert.match(storyRecordDialogHtml, /mention-token-amount/);
assert.match(storyRecordDialogHtml, /\+2/);
assert.match(storyRecordDialogHtml, /house-mention-token-chip/);

const closedHistoryMenuHtml = renderToStaticMarkup(
  <BoardProcessingHistoryMenu
    busy={false}
    canManageBoardProcessing
    history={{ envelope: [items[0], items[2]], mystery: [items[1]] }}
    items={items}
    onOpenType={() => {}}
    open={false}
  />,
);

assert.equal(closedHistoryMenuHtml, "");

console.log("board-processing-panel render tests passed");
