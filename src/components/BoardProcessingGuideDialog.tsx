import React, { useEffect, useRef } from "react";
import { ko } from "../resources/gameResources";
import { TokenIcon } from "./GameIcons";

type BoardProcessingGuideDialogProps = {
  open: boolean;
  onClose: () => void;
  restoreFocusRef: React.RefObject<HTMLElement>;
};

function useDialogFocus(
  open: boolean,
  onClose: () => void,
  restoreFocusRef: React.RefObject<HTMLElement>,
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

export default function BoardProcessingGuideDialog({ open, onClose, restoreFocusRef }: BoardProcessingGuideDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useDialogFocus(open, onClose, restoreFocusRef, dialogRef, closeButtonRef);

  if (!open) {
    return null;
  }

  return (
    <div className="session-end-overlay" role="presentation">
      <section
        ref={dialogRef}
        className="score-guide-dialog board-processing-guide-dialog"
        aria-labelledby="board-processing-guide-title"
        aria-describedby="board-processing-guide-copy"
        aria-modal="true"
        role="dialog"
      >
        <div className="session-end-heading">
          <span className="session-end-seal" aria-hidden="true">
            <TokenIcon type="help" />
          </span>
          <div>
            <p className="section-label">{ko.boardProcessing.section}</p>
            <h2 id="board-processing-guide-title">{ko.boardProcessing.guideTitle}</h2>
          </div>
        </div>
        <p className="score-guide-copy" id="board-processing-guide-copy">
          {ko.boardProcessing.guideIntro}
        </p>
        <div className="board-processing-guide-list">
          {ko.boardProcessing.guideItems.map((item, index) => (
            <React.Fragment key={item.id}>
              <article className="board-processing-guide-item">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <small>{item.reference}</small>
              </article>
              {index < ko.boardProcessing.guideItems.length - 1 ? (
                <hr className="board-processing-guide-divider" aria-hidden="true" />
              ) : null}
            </React.Fragment>
          ))}
        </div>
        <div className="score-guide-actions">
          <button ref={closeButtonRef} className="primary-button" type="button" onClick={onClose}>
            {ko.common.confirm}
          </button>
        </div>
      </section>
    </div>
  );
}
