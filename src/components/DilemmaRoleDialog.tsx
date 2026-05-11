import React, { useRef, useState, useEffect, useMemo } from "react";
import { ko } from "../resources/gameResources";
import { RedactedHouse } from "../types/game";
import { TokenIcon } from "./GameIcons";
import { getHouseKoreanName } from "../utils/house-helpers";
import { getActiveDilemmaVoteHouses } from "../utils/dilemma-helpers";
import { Tooltip } from "./Tooltip";

interface DilemmaRoleDialogProps {
  busy: boolean;
  houses?: RedactedHouse[];
  leaderHouseId: string | null;
  moderatorHouseId: string | null;
  open: boolean;
  restoreFocusRef: React.RefObject<HTMLElement>;
  onClose: () => void;
  onOpenVoteOrderDialog: (params: { restoreFocusTarget: HTMLElement }) => void;
  onSave: (roles: { leaderHouseId: string; moderatorHouseId: string }) => Promise<boolean>;
}

function DilemmaRoleDialog({
  busy,
  houses = [],
  leaderHouseId,
  moderatorHouseId,
  open,
  restoreFocusRef,
  onClose,
  onOpenVoteOrderDialog,
  onSave,
}: DilemmaRoleDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeTimerRef = useRef<any>(null);
  const skipRestoreFocusRef = useRef(false);
  const leaderSelectRef = useRef<HTMLSelectElement>(null);
  const activeHouses = useMemo(() => getActiveDilemmaVoteHouses(houses), [houses]);
  const activeIds = useMemo(() => activeHouses.map((house) => house.id), [activeHouses]);
  const [leaderDraft, setLeaderDraft] = useState("");
  const [moderatorDraft, setModeratorDraft] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const canSave = !busy && activeHouses.length > 0 && Boolean(leaderDraft && moderatorDraft);

  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        setLeaderDraft(activeIds.includes(leaderHouseId || "") ? (leaderHouseId || "") : "");
        setModeratorDraft(activeIds.includes(moderatorHouseId || "") ? (moderatorHouseId || "") : "");
        setSaveStatus("");
        skipRestoreFocusRef.current = false;
      });
    }
  }, [activeIds, leaderHouseId, moderatorHouseId, open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const focusRestoreEl = restoreFocusRef?.current ?? null;

    const focusFirstControl = window.setTimeout(() => {
      const firstControl = leaderSelectRef.current || (dialogRef.current as HTMLElement)?.querySelector(
        'button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      firstControl?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusFirstControl);
      window.clearTimeout(closeTimerRef.current);
      document.removeEventListener("keydown", handleKeyDown);
      window.setTimeout(() => {
        if (skipRestoreFocusRef.current) {
          skipRestoreFocusRef.current = false;
          return;
        }

        focusRestoreEl?.focus();
      }, 0);
    };
  }, [onClose, open, restoreFocusRef]);

  if (!open) {
    return null;
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canSave) {
      return;
    }

    setSaveStatus("");
    const result = await onSave({ leaderHouseId: leaderDraft, moderatorHouseId: moderatorDraft });

    if (result) {
      setSaveStatus(ko.dilemmaRole.saveOk);
      closeTimerRef.current = window.setTimeout(onClose, 650);
      return;
    }

    setSaveStatus(ko.dilemmaRole.saveFail);
  };

  const openVoteOrderFromRoleDialog = (event: React.MouseEvent) => {
    skipRestoreFocusRef.current = true;
    onOpenVoteOrderDialog?.({ restoreFocusTarget: (restoreFocusRef?.current || event.currentTarget) as HTMLElement });
    onClose();
  };

  return (
    <div className="session-end-overlay" role="presentation">
      <section
        ref={dialogRef}
        className="dilemma-role-dialog"
        aria-labelledby="dilemma-role-title"
        aria-modal="true"
        role="dialog"
      >
        <div className="session-end-heading">
          <span className="session-end-seal" aria-hidden="true">
            <TokenIcon type="crown" />
          </span>
          <div>
            <p className="section-label">{ko.dilemmaRole.section}</p>
            <h2 id="dilemma-role-title">{ko.dilemmaRole.title}</h2>
          </div>
          <Tooltip className="dilemma-role-order-action" label={ko.dilemmaRole.voteOrderTooltip}>
            <button
              className="ghost-button dilemma-role-order-button"
              type="button"
              onClick={openVoteOrderFromRoleDialog}
              disabled={busy || activeHouses.length === 0}
            >
              <TokenIcon type="rotateRight" />
              {ko.dilemmaRole.voteOrderButton}
            </button>
          </Tooltip>
        </div>
        <form className="dilemma-role-form" onSubmit={submit}>
          <p className="dilemma-role-copy">{ko.dilemmaRole.copy}</p>
          {activeHouses.length > 0 ? (
            <div className="dilemma-role-grid">
              <label className="dilemma-role-card">
                <span>
                  <TokenIcon type="leader" /> {ko.dilemmaRole.leaderTokenChip}
                </span>
                <select
                  ref={leaderSelectRef}
                  value={leaderDraft}
                  onChange={(event) => setLeaderDraft(event.target.value)}
                  disabled={busy}
                >
                  <option value="" disabled>
                    {ko.dilemmaRole.leaderPlaceholder}
                  </option>
                  {activeHouses.map((house) => (
                    <option key={house.id} value={house.id}>
                      {getHouseKoreanName(house)}{house.hasCustomName ? ` (${house.name})` : ""}
                    </option>
                  ))}
                </select>
                <small>{ko.dilemmaRole.leaderHint}</small>
              </label>
              <label className="dilemma-role-card">
                <span>
                  <TokenIcon type="moderator" /> {ko.dilemmaRole.moderatorField}
                </span>
                <select value={moderatorDraft} onChange={(event) => setModeratorDraft(event.target.value)} disabled={busy}>
                  <option value="" disabled>
                    {ko.dilemmaRole.moderatorPlaceholder}
                  </option>
                  {activeHouses.map((house) => (
                    <option key={house.id} value={house.id}>
                      {getHouseKoreanName(house)}{house.hasCustomName ? ` (${house.name})` : ""}
                    </option>
                  ))}
                </select>
                <small>{ko.dilemmaRole.moderatorHint}</small>
              </label>
            </div>
          ) : (
            <p className="vote-order-warning">{ko.dilemmaRole.noHouses}</p>
          )}
          {saveStatus ? <p className="vote-order-status" role="status">{saveStatus}</p> : null}
          <div className="session-end-actions">
            <button className="ghost-button" type="button" onClick={onClose} disabled={busy}>
              {ko.common.close}
            </button>
            <button className="primary-button" type="submit" disabled={!canSave}>
              <TokenIcon type="save" />
              {ko.common.save}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default DilemmaRoleDialog;
