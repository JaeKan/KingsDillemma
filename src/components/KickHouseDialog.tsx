import React, { useEffect, useMemo, useRef, useState } from "react";
import { ko } from "../resources/gameResources";
import type { RedactedHouse } from "../types/game";
import { getHouseKoreanName } from "../utils/house-helpers";
import { TokenIcon } from "./GameIcons";

interface KickHouseDialogProps {
  busy: boolean;
  houses: RedactedHouse[];
  open: boolean;
  restoreFocusRef?: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  onConfirm: (houseId: string) => void | Promise<void>;
}

export default function KickHouseDialog({
  busy,
  houses,
  open,
  restoreFocusRef,
  onClose,
  onConfirm,
}: KickHouseDialogProps) {
  const activeHouses = useMemo(() => houses.filter((house) => house.hasSession), [houses]);
  const [selectedHouseId, setSelectedHouseId] = useState("");
  const dialogRef = useRef<HTMLElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const focusRestoreEl = restoreFocusRef?.current ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const focusTarget = window.setTimeout(() => {
      (selectRef.current || closeButtonRef.current)?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const root = dialogRef.current;
      if (!root) {
        return;
      }

      const focusable = Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getClientRects().length > 0);

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
      window.clearTimeout(focusTarget);
      document.removeEventListener("keydown", handleKeyDown);
      window.setTimeout(() => {
        focusRestoreEl?.focus();
      }, 0);
    };
  }, [onClose, open, restoreFocusRef]);

  if (!open) {
    return null;
  }

  const selectedHouseAvailable = activeHouses.some((house) => house.id === selectedHouseId);
  const selectedValue = selectedHouseAvailable ? selectedHouseId : "";
  const canConfirm = Boolean(selectedValue);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!canConfirm) {
      return;
    }

    void onConfirm(selectedValue);
  };

  return (
    <div className="session-end-overlay" role="presentation">
      <section
        ref={dialogRef}
        className="board-processing-dialog kick-house-dialog"
        aria-labelledby="kick-house-dialog-title"
        aria-describedby="kick-house-dialog-copy"
        aria-modal="true"
        role="dialog"
      >
        <div className="session-end-heading">
          <span className="session-end-seal" aria-hidden="true">
            <TokenIcon type="exit" />
          </span>
          <div>
            <p className="section-label">{ko.app.settings.adminSection}</p>
            <h2 id="kick-house-dialog-title">{ko.app.settings.kickHouseDialogTitle}</h2>
          </div>
        </div>
        <p className="score-guide-copy" id="kick-house-dialog-copy">
          {ko.app.settings.kickHouseDialogBody}
        </p>
        <form className="board-processing-editor kick-house-dialog-form" onSubmit={handleSubmit}>
          <label className="board-processing-field board-processing-field--full">
            <span>{ko.app.settings.kickHouseSelectLabel}</span>
            <select
              ref={selectRef}
              value={selectedValue}
              onChange={(event) => setSelectedHouseId(event.target.value)}
              disabled={busy || !activeHouses.length}
            >
              <option value="">{activeHouses.length ? ko.app.settings.kickHousePlaceholder : ko.app.settings.noActiveSessions}</option>
              {activeHouses.map((house) => (
                <option key={house.id} value={house.id}>
                  {getHouseKoreanName(house)}
                </option>
              ))}
            </select>
          </label>
          <div className="score-guide-actions">
            <button ref={closeButtonRef} className="secondary-button" type="button" onClick={onClose}>
              {ko.common.close}
            </button>
            <button className="primary-button danger-button" type="submit" disabled={busy || !canConfirm}>
              <TokenIcon type="exit" />
              {ko.app.settings.kickHouseConfirm}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
