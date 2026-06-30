import { ko } from "../resources/gameResources";
import type { BoardProcessingHistory, BoardProcessingItem, BoardProcessingItemType } from "../types/game";
import { boardProcessingTypes, groupBoardProcessingItems } from "./BoardProcessingPanel";

type BoardProcessingHistoryMenuProps = {
  busy: boolean;
  canManageBoardProcessing?: boolean;
  history?: Partial<BoardProcessingHistory>;
  items: BoardProcessingItem[];
  onOpenType: (type: BoardProcessingItemType, trigger: HTMLButtonElement) => void;
  open: boolean;
};

export default function BoardProcessingHistoryMenu({
  busy,
  canManageBoardProcessing = false,
  history,
  items,
  onOpenType,
  open,
}: BoardProcessingHistoryMenuProps) {
  if (!open || !canManageBoardProcessing) {
    return null;
  }

  const groupedItems = groupBoardProcessingItems(items, history);

  return (
    <div className="settings-menu board-processing-history-menu" id="board-processing-history-menu">
      <p className="section-label">{ko.boardProcessing.historyTitle}</p>
      {boardProcessingTypes.map((type) => {
        const count = groupedItems[type].length;

        return (
          <button
            className="ghost-button wide board-processing-type-menu-button"
            disabled={busy || !count}
            key={type}
            onClick={(event) => onOpenType(type, event.currentTarget)}
            type="button"
          >
            <span className="board-processing-type-menu-text">
              <strong>{ko.boardProcessing.typeLabels[type]}</strong>
            </span>
            <span className="board-processing-type-menu-count">{ko.boardProcessing.typeHistoryCount(count)}</span>
          </button>
        );
      })}
    </div>
  );
}
