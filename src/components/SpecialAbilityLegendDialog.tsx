import React, { useRef, useEffect } from "react";
import { SpecialAbilityLegendIcon, TokenIcon } from "./GameIcons";
import { 
  specialAbilityLegendImageUrl, 
  specialAbilityLegendRows,
  ko,
} from "../resources/gameResources";

interface SpecialAbilityLegendDialogProps {
  open: boolean;
  restoreFocusRef: React.RefObject<HTMLElement>;
  onClose: () => void;
}

function SpecialAbilityLegendDialog({ open, restoreFocusRef, onClose }: SpecialAbilityLegendDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

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
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      if (focusCloseButton) window.clearTimeout(focusCloseButton);
      document.removeEventListener("keydown", handleKeyDown);
      window.setTimeout(() => {
        focusRestoreEl?.focus();
      }, 0);
    };
  }, [onClose, open, restoreFocusRef]);

  if (!open) {
    return null;
  }

  return (
    <div className="session-end-overlay" role="presentation">
      <section
        ref={dialogRef}
        className="score-guide-dialog achievement-legend-dialog"
        aria-labelledby="achievement-legend-title"
        aria-modal="true"
        role="dialog"
      >
        <div className="session-end-heading">
          <span className="session-end-seal" aria-hidden="true">
            <TokenIcon type="help" />
          </span>
          <div>
            <p className="section-label">{ko.specialLegend.section}</p>
            <h2 id="achievement-legend-title">{ko.specialLegend.title}</h2>
          </div>
        </div>
        <figure className="rulebook-legend-figure">
          <img src={specialAbilityLegendImageUrl} alt={ko.specialLegend.imageAlt} />
          <figcaption>{ko.specialLegend.caption}</figcaption>
        </figure>
        <div className="score-guide-table-wrap">
          <table className="score-guide-table achievement-legend-table">
            <thead>
              <tr>
                <th scope="col">{ko.specialLegend.thGlyph}</th>
                <th scope="col">{ko.specialLegend.thTiming}</th>
                <th scope="col">{ko.specialLegend.thEffect}</th>
              </tr>
            </thead>
            <tbody>
              {specialAbilityLegendRows.map((row) => (
                <tr key={row.id}>
                  <th scope="row">
                    <span className="achievement-legend-label">
                      <SpecialAbilityLegendIcon type={row.icon as any} />
                      <span>{row.label}</span>
                    </span>
                  </th>
                  <td>{row.timing}</td>
                  <td>{row.effect}</td>
                </tr>
              ))}
            </tbody>
          </table>
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

export default SpecialAbilityLegendDialog;
