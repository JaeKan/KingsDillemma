import React, { useEffect, useMemo, useRef, useState } from "react";
import { ko } from "../resources/gameResources";
import type { BoardProcessingHistory, BoardProcessingItem, BoardProcessingItemType, RedactedHouse } from "../types/game";
import {
  BoardProcessingRecordArticle,
  formatLocalDateTime,
  getEntrySummary,
  getEntryTitle,
  groupBoardProcessingItems,
} from "./BoardProcessingPanel";
import { TokenIcon } from "./GameIcons";

type BoardProcessingTypeHistoryDialogProps = {
  busy: boolean;
  canDelete: boolean;
  houses?: RedactedHouse[];
  history?: Partial<BoardProcessingHistory>;
  items: BoardProcessingItem[];
  onClose: () => void;
  onDelete: (item: BoardProcessingItem) => Promise<boolean> | boolean;
  restoreFocusRef: React.RefObject<HTMLButtonElement | null>;
  selectedType: BoardProcessingItemType | null;
};

export default function BoardProcessingTypeHistoryDialog({
  busy,
  canDelete,
  houses = [],
  history,
  items,
  onClose,
  onDelete,
  restoreFocusRef,
  selectedType,
}: BoardProcessingTypeHistoryDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const groupedItems = useMemo(() => groupBoardProcessingItems(items, history), [history, items]);
  const typeItems = selectedType ? groupedItems[selectedType] : [];
  const selectedItem = typeItems.find((item) => item.id === selectedItemId) || typeItems[0] || null;
  const title = selectedType ? ko.boardProcessing.typeLabels[selectedType] : ko.boardProcessing.historyTitle;
  const open = Boolean(selectedType);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const focusRestoreEl = restoreFocusRef.current;
    const focusCloseButton = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(
        dialogRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element instanceof HTMLElement && element.getClientRects().length > 0) as HTMLElement[];

      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusCloseButton);
      document.removeEventListener("keydown", handleKeyDown);
      window.setTimeout(() => {
        focusRestoreEl?.focus();
      }, 0);
    };
  }, [onClose, open, restoreFocusRef]);

  if (!open || !selectedType) {
    return null;
  }

  const handleDelete = async () => {
    if (!selectedItem) {
      return;
    }

    const selectedIndex = typeItems.findIndex((item) => item.id === selectedItem.id);
    const fallbackItem = typeItems[selectedIndex + 1] || typeItems[selectedIndex - 1] || null;
    const deleted = await onDelete(selectedItem);

    if (deleted) {
      setSelectedItemId(fallbackItem?.id ?? null);
    }
  };

  return (
    <div className="session-end-overlay" role="presentation">
      <section
        ref={dialogRef}
        className="board-processing-dialog board-processing-type-history-dialog board-processing-type-history-dialog--wide"
        aria-labelledby="board-processing-type-history-dialog-title"
        aria-modal="true"
        role="dialog"
      >
        <div className="session-end-heading">
          <span className="session-end-seal" aria-hidden="true">
            <TokenIcon type="history" />
          </span>
          <div>
            <p className="section-label">{ko.boardProcessing.historyTitle}</p>
            <h2 id="board-processing-type-history-dialog-title">{title}</h2>
          </div>
        </div>
        <div className="board-processing-type-dialog-summary">
          <span>{ko.boardProcessing.typeHistoryCount(typeItems.length)}</span>
          <span>{selectedItem ? getEntryTitle(selectedItem) : ko.boardProcessing.emptyHistory}</span>
        </div>
        <div className="board-processing-type-dialog-layout">
          <div className="board-processing-type-dialog-list" aria-label={title}>
            {typeItems.length ? (
              typeItems.map((item) => {
                const selected = selectedItem?.id === item.id;

                return (
                  <button
                    aria-pressed={selected}
                    className={`board-processing-entry-menu-button${selected ? " is-selected" : ""}`}
                    disabled={busy}
                    key={item.id}
                    onClick={() => setSelectedItemId(item.id)}
                    type="button"
                  >
                    <span className="board-processing-entry-menu-main">
                      <strong>{getEntryTitle(item)}</strong>
                      <small>{ko.boardProcessing.recordedBy(item.createdByName || ko.common.houseFallback, formatLocalDateTime(item.createdAt))}</small>
                    </span>
                    <span className="board-processing-entry-menu-meta">
                      {getEntrySummary(item) || title}
                    </span>
                    <TokenIcon type="external" />
                  </button>
                );
              })
            ) : (
              <p className="board-processing-empty">{ko.boardProcessing.emptyHistory}</p>
            )}
          </div>
          <div className="board-processing-type-dialog-target">
            <div className="board-processing-type-dialog-toolbar">
              <span>{ko.boardProcessing.selectedRecord}</span>
              <strong>{selectedItem ? getEntryTitle(selectedItem) : ko.boardProcessing.emptyHistory}</strong>
            </div>
            {selectedItem ? <BoardProcessingRecordArticle houses={houses} item={selectedItem} /> : <p className="board-processing-empty">{ko.boardProcessing.emptyHistory}</p>}
          </div>
        </div>
        <div className="score-guide-actions">
          <button ref={closeButtonRef} className="secondary-button" type="button" onClick={onClose}>
            {ko.common.close}
          </button>
          <button className="secondary-button danger-button" type="button" onClick={() => void handleDelete()} disabled={busy || !canDelete || !selectedItem}>
            <TokenIcon type="trash" />
            {ko.common.delete}
          </button>
        </div>
      </section>
    </div>
  );
}
