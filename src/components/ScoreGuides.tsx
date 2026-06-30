import React, { useEffect, useRef } from "react";
import { TokenIcon } from "./GameIcons";
import {
  mainScoreGuideContent,
  openAgendaScoreGuideContent,
  scoreGuideDialogLabels,
  secretAgendaScoreGuideContent,
  type ScoreGuideFormulaPart,
  type ScoreGuideSection,
} from "../resources/gameResources";

interface ScoreGuideDialogProps {
  open: boolean;
  onClose: () => void;
  restoreFocusRef: React.RefObject<HTMLElement>;
}

function useScoreGuideFocus(
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
        (dialogRef.current as HTMLElement).querySelectorAll(
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
  }, [onClose, open, restoreFocusRef, dialogRef, closeButtonRef]);
}

function ScoreGuideFormula({ parts, ariaLabel }: { parts: readonly ScoreGuideFormulaPart[]; ariaLabel: string }) {
  return (
    <div className="score-guide-formula" aria-label={ariaLabel}>
      {parts.map((part, index) => {
        if (part.kind === "op") {
          return (
            <span key={index} className="score-guide-formula-operator">
              {part.text}
            </span>
          );
        }
        if (part.kind === "result") {
          return <strong key={index}>{part.text}</strong>;
        }
        return (
          <span key={index} className="score-guide-formula-item">
            {part.text}
          </span>
        );
      })}
    </div>
  );
}

function ScoreGuideSections({ sections }: { sections: readonly ScoreGuideSection[] }) {
  return (
    <div className="score-guide-sections">
      {sections.map((section) => (
        <section key={section.heading} className="score-guide-section">
          <h3>{section.heading}</h3>
          {"table" in section ? (
            <>
              {section.paragraph ? <p>{section.paragraph}</p> : null}
              <div className="score-guide-table-wrap">
                <table className="score-guide-table">
                  <thead>
                    <tr>
                      {section.table.headers.map((header) => (
                        <th key={header} scope="col">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.table.rows.map((row) => (
                      <tr key={row.rowHeader}>
                        <th scope="row">{row.rowHeader}</th>
                        {row.cells.map((cell, cellIndex) => (
                          <td key={cellIndex}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <ul>
              {section.items.map((item, itemIndex) => (
                <li key={itemIndex}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

function OpenAgendaScoreDialog({ open, onClose, restoreFocusRef }: ScoreGuideDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const c = openAgendaScoreGuideContent;

  useScoreGuideFocus(open, onClose, restoreFocusRef, dialogRef, closeButtonRef);

  if (!open) {
    return null;
  }

  return (
    <div className="session-end-overlay" role="presentation">
      <section
        ref={dialogRef}
        className="score-guide-dialog open-agenda-guide-dialog"
        aria-labelledby="open-agenda-guide-title"
        aria-describedby="open-agenda-guide-copy"
        aria-modal="true"
        role="dialog"
      >
        <div className="session-end-heading">
          <span className="session-end-seal" aria-hidden="true">
            <TokenIcon type={c.sealToken} />
          </span>
          <div>
            <p className="section-label">{scoreGuideDialogLabels.sectionLabel}</p>
            <h2 id="open-agenda-guide-title">{c.title}</h2>
          </div>
        </div>
        <p className="score-guide-copy" id="open-agenda-guide-copy">
          {c.copy}
        </p>
        <ScoreGuideFormula parts={c.formula} ariaLabel={c.formulaAriaLabel} />
        <ScoreGuideSections sections={c.sections} />
        <div className="score-guide-actions">
          <button ref={closeButtonRef} className="primary-button" type="button" onClick={onClose}>
            {scoreGuideDialogLabels.confirm}
          </button>
        </div>
      </section>
    </div>
  );
}

function SecretAgendaScoreDialog({ open, onClose, restoreFocusRef }: ScoreGuideDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const c = secretAgendaScoreGuideContent;

  useScoreGuideFocus(open, onClose, restoreFocusRef, dialogRef, closeButtonRef);

  if (!open) {
    return null;
  }

  return (
    <div className="session-end-overlay" role="presentation">
      <section
        ref={dialogRef}
        className="score-guide-dialog secret-agenda-guide-dialog"
        aria-labelledby="secret-agenda-guide-title"
        aria-describedby="secret-agenda-guide-copy"
        aria-modal="true"
        role="dialog"
      >
        <div className="session-end-heading">
          <span className="session-end-seal" aria-hidden="true">
            <TokenIcon type={c.sealToken} />
          </span>
          <div>
            <p className="section-label">{scoreGuideDialogLabels.sectionLabel}</p>
            <h2 id="secret-agenda-guide-title">{c.title}</h2>
          </div>
        </div>
        <p className="score-guide-copy" id="secret-agenda-guide-copy">
          {c.copy}
        </p>
        <ScoreGuideFormula parts={c.formula} ariaLabel={c.formulaAriaLabel} />
        <ScoreGuideSections sections={c.sections} />
        <div className="score-guide-actions">
          <button ref={closeButtonRef} className="primary-button" type="button" onClick={onClose}>
            {scoreGuideDialogLabels.confirm}
          </button>
        </div>
      </section>
    </div>
  );
}

function ScoreGuideDialog({ open, onClose, restoreFocusRef }: ScoreGuideDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const c = mainScoreGuideContent;

  useScoreGuideFocus(open, onClose, restoreFocusRef, dialogRef, closeButtonRef);

  if (!open) {
    return null;
  }

  return (
    <div className="session-end-overlay" role="presentation">
      <section
        ref={dialogRef}
        className="score-guide-dialog"
        aria-labelledby="score-guide-title"
        aria-describedby="score-guide-copy"
        aria-modal="true"
        role="dialog"
      >
        <div className="session-end-heading">
          <span className="session-end-seal" aria-hidden="true">
            <TokenIcon type={c.sealToken} />
          </span>
          <div>
            <p className="section-label">{scoreGuideDialogLabels.sectionLabel}</p>
            <h2 id="score-guide-title">{c.title}</h2>
          </div>
        </div>
        <p className="score-guide-copy" id="score-guide-copy">
          {c.copy}
        </p>
        <ScoreGuideFormula parts={c.formula} ariaLabel={c.formulaAriaLabel} />
        <ScoreGuideSections sections={c.sections} />
        <div className="score-guide-actions">
          <button ref={closeButtonRef} className="primary-button" type="button" onClick={onClose}>
            {scoreGuideDialogLabels.confirm}
          </button>
        </div>
      </section>
    </div>
  );
}

export { OpenAgendaScoreDialog, SecretAgendaScoreDialog, ScoreGuideDialog };
