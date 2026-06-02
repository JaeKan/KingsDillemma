import React, { useEffect, useRef } from "react";
import { ko } from "../resources/gameResources";
import type { BoardProcessingHistory, BoardProcessingItem, HouseId, RedactedHouse } from "../types/game";
import BoardProcessingPanel from "./BoardProcessingPanel";
import { TokenIcon } from "./GameIcons";

type BoardProcessingHistoryDialogProps = {
  busy: boolean;
  canManageBoardProcessing?: boolean;
  currentHouseId?: HouseId | null;
  history?: Partial<BoardProcessingHistory>;
  houses: RedactedHouse[];
  items: BoardProcessingItem[];
  mutate: any;
  onClose: () => void;
  open: boolean;
  restoreFocusRef: React.RefObject<HTMLElement | null>;
};

function useDialogFocus(
  open: boolean,
  onClose: () => void,
  restoreFocusRef: React.RefObject<HTMLElement | null>,
  dialogRef: React.RefObject<HTMLElement | null>,
  closeButtonRef: React.RefObject<HTMLButtonElement | null>,
) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const focusRestoreEl = restoreFocusRef?.current ?? null;
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
  }, [closeButtonRef, dialogRef, onClose, open, restoreFocusRef]);
}

export default function BoardProcessingHistoryDialog({
  busy,
  canManageBoardProcessing = false,
  currentHouseId,
  history,
  houses,
  items,
  mutate,
  onClose,
  open,
  restoreFocusRef,
}: BoardProcessingHistoryDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogOpen = Boolean(open && canManageBoardProcessing);

  useDialogFocus(dialogOpen, onClose, restoreFocusRef, dialogRef, closeButtonRef);

  if (!dialogOpen) {
    return null;
  }

  return (
    <div className="session-end-overlay" role="presentation">
      <section
        ref={dialogRef}
        className="board-processing-dialog board-processing-history-dialog"
        aria-labelledby="board-processing-history-dialog-title"
        aria-modal="true"
        role="dialog"
      >
        <div className="session-end-heading">
          <span className="session-end-seal" aria-hidden="true">
            <TokenIcon type="history" />
          </span>
          <div>
            <p className="section-label">{ko.boardProcessing.section}</p>
            <h2 id="board-processing-history-dialog-title">{ko.boardProcessing.historyTitle}</h2>
          </div>
        </div>
        <BoardProcessingPanel
          busy={busy}
          canManageBoardProcessing={canManageBoardProcessing}
          currentHouseId={currentHouseId}
          history={history}
          houses={houses}
          items={items}
          mode="history"
          mutate={mutate}
        />
        <div className="score-guide-actions">
          <button ref={closeButtonRef} className="primary-button" type="button" onClick={onClose}>
            {ko.common.close}
          </button>
        </div>
      </section>
    </div>
  );
}
