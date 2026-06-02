import { renderToStaticMarkup } from "react-dom/server";
import assert from "node:assert/strict";
import BoardProcessingHistoryDialog from "../src/components/BoardProcessingHistoryDialog";
import BoardProcessingPanel from "../src/components/BoardProcessingPanel";
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
    note: "개봉 확인",
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
] as BoardProcessingItem[];

const html = renderToStaticMarkup(
  <BoardProcessingPanel
    busy={false}
    canManageBoardProcessing
    currentHouseId="gamam"
    history={{ envelope: [items[0]], mystery: [items[1]] }}
    houses={houses}
    items={items}
    mutate={async () => ({ ok: true })}
  />,
);

assert.match(html, /구성물 정리 기록/);
assert.doesNotMatch(html, /입력은 이곳 한 곳에서만 하고/);
assert.match(html, /정리 기록 추가/);
assert.match(html, /유형별 정리 기록/);
assert.match(html, /봉투 개봉/);
assert.match(html, /미스터리 스티커/);
assert.match(html, /70/);
assert.match(html, /A · 왕관 · 3/);
assert.match(html, /board-processing-entry-photos/);
assert.match(html, /alt="board-photo\.png"/);
assert.equal(html.includes("board-processing-dialog"), false);

const nonAdminHtml = renderToStaticMarkup(
  <BoardProcessingPanel
    busy={false}
    canManageBoardProcessing={false}
    currentHouseId="solad"
    history={{ envelope: [items[0]], mystery: [items[1]] }}
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
    history={{ envelope: [items[0]], mystery: [items[1]] }}
    houses={houses}
    items={items}
    mode="input"
    mutate={async () => ({ ok: true })}
  />,
);

assert.match(inputOnlyHtml, /정리 기록 추가/);
assert.doesNotMatch(inputOnlyHtml, /유형별 정리 기록/);

const historyOnlyHtml = renderToStaticMarkup(
  <BoardProcessingPanel
    busy={false}
    canManageBoardProcessing
    currentHouseId="gamam"
    history={{ envelope: [items[0]], mystery: [items[1]] }}
    houses={houses}
    items={items}
    mode="history"
    mutate={async () => ({ ok: true })}
  />,
);

assert.match(historyOnlyHtml, /유형별 정리 기록/);
assert.match(historyOnlyHtml, /70/);
assert.doesNotMatch(historyOnlyHtml, /정리 기록 추가/);

const historyDialogHtml = renderToStaticMarkup(
  <BoardProcessingHistoryDialog
    busy={false}
    canManageBoardProcessing
    currentHouseId="gamam"
    history={{ envelope: [items[0]], mystery: [items[1]] }}
    houses={houses}
    items={items}
    mutate={async () => ({ ok: true })}
    onClose={() => {}}
    open
    restoreFocusRef={{ current: null }}
  />,
);

assert.match(historyDialogHtml, /role="dialog"/);
assert.match(historyDialogHtml, /유형별 정리 기록/);
assert.match(historyDialogHtml, /봉투 개봉/);
assert.match(historyDialogHtml, /70/);
assert.doesNotMatch(historyDialogHtml, /정리 기록 추가/);

const closedHistoryDialogHtml = renderToStaticMarkup(
  <BoardProcessingHistoryDialog
    busy={false}
    canManageBoardProcessing
    currentHouseId="gamam"
    history={{ envelope: [items[0]], mystery: [items[1]] }}
    houses={houses}
    items={items}
    mutate={async () => ({ ok: true })}
    onClose={() => {}}
    open={false}
    restoreFocusRef={{ current: null }}
  />,
);

assert.equal(closedHistoryDialogHtml, "");

console.log("board-processing-panel render tests passed");
