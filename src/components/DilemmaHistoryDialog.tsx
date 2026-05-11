import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeDilemmaHistoryEntry, formatDilemmaCardLabel, formatLocalDateTime } from "../utils/dilemma-helpers";
import { getMysteryStickerEntry } from "../../shared/mystery-stickers.mts";
import { getMysteryStickerLabel } from "../utils/mystery-sticker-labels";
import { MysteryStickerImage } from "./MysteryStickerImage";
import { dilemmaOutcomeLabels, ko } from "../resources/gameResources";
import { TokenIcon } from "./GameIcons";
import { DilemmaFact, DilemmaTextPreview, DilemmaOutcomePreview, DilemmaPhotoStrip } from "./DilemmaUI";
import { DilemmaHistoryEntry } from "../types/game";

interface DilemmaHistoryDialogProps {
  busy: boolean;
  currentHouseId: string | null;
  history: DilemmaHistoryEntry[];
  open: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  restoreFocusRef: React.RefObject<HTMLElement>;
}

function DilemmaHistoryDialog({
  busy,
  currentHouseId,
  history,
  open,
  onClose,
  onDelete,
  restoreFocusRef,
}: DilemmaHistoryDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const normalizedHistory = useMemo(() => history.map(normalizeDilemmaHistoryEntry), [history]);
  const [selectedId, setSelectedId] = useState("");
  const selectedEntry =
    normalizedHistory.find((entry: DilemmaHistoryEntry) => entry.historyId === selectedId) || normalizedHistory[0] || null;
  const canDeleteSelected = Boolean(currentHouseId && selectedEntry?.savedBy === currentHouseId);

  const handleDeleteSelected = useCallback(async () => {
    if (!selectedEntry || !canDeleteSelected) {
      return;
    }

    if (!window.confirm(ko.dilemmaHistory.confirmDelete)) {
      return;
    }

    await onDelete?.(selectedEntry.historyId);
  }, [canDeleteSelected, onDelete, selectedEntry]);

  useEffect(() => {
    if (!open) {
      return;
    }

    queueMicrotask(() => {
      setSelectedId((current) =>
        normalizedHistory.some((entry: DilemmaHistoryEntry) => entry.historyId === current)
          ? current
          : normalizedHistory[0]?.historyId || "",
      );
    });
  }, [normalizedHistory, open]);

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
      ).filter((element) => element instanceof HTMLElement && element.getClientRects().length > 0);

      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0] as HTMLElement;
      const last = focusable[focusable.length - 1] as HTMLElement;

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

  if (!open) {
    return null;
  }

  return (
    <div className="session-end-overlay" role="presentation">
      <section
        ref={dialogRef}
        className="dilemma-history-dialog"
        aria-labelledby="dilemma-history-title"
        aria-modal="true"
        role="dialog"
      >
        <div className="session-end-heading">
          <span className="session-end-seal" aria-hidden="true">
            <TokenIcon type="history" />
          </span>
          <div>
            <p className="section-label">{ko.dilemmaHistory.sectionCouncil}</p>
            <h2 id="dilemma-history-title">{ko.dilemmaHistory.title}</h2>
          </div>
        </div>
        {normalizedHistory.length ? (
          <div className="dilemma-history-layout">
            <div className="dilemma-history-list" aria-label={ko.dilemmaHistory.listAria}>
              {normalizedHistory.map((entry: DilemmaHistoryEntry) => (
                <button
                  key={entry.historyId}
                  className={`dilemma-history-item${entry.historyId === selectedEntry?.historyId ? " selected" : ""}`}
                  type="button"
                  onClick={() => setSelectedId(entry.historyId)}
                >
                  <strong>{formatDilemmaCardLabel(entry as any) || ko.common.noTitle}</strong>
                   <span>{(dilemmaOutcomeLabels as any)[entry.selectedOutcome || ""] || ko.common.undecided}</span>
                  <small>{formatLocalDateTime(entry.savedAt || entry.updatedAt)}</small>
                </button>
              ))}
            </div>
            <DilemmaHistoryDetail
              canDelete={canDeleteSelected}
              deleteBusy={busy}
              entry={selectedEntry}
              onDelete={handleDeleteSelected}
            />
          </div>
        ) : (
          <p className="dilemma-history-empty">{ko.dilemmaHistory.empty}</p>
        )}
        <div className="score-guide-actions">
          <button ref={closeButtonRef} className="primary-button" type="button" onClick={onClose}>
            {ko.common.confirm}
          </button>
        </div>
      </section>
    </div>
  );
}


interface DilemmaHistoryDetailProps {
  canDelete: boolean;
  deleteBusy: boolean;
  entry: DilemmaHistoryEntry;
  onDelete: () => void;
}

function DilemmaHistoryDetail({ canDelete, deleteBusy, entry, onDelete }: DilemmaHistoryDetailProps) {
  if (!entry) {
    return null;
  }

  return (
    <article className="dilemma-history-detail">
      <header className="dilemma-history-detail-head">
        <div>
          <p className="section-label">{ko.dilemmaHistory.detailSection}</p>
          <h3>{formatDilemmaCardLabel(entry as any) || ko.common.noTitle}</h3>
        </div>
        {canDelete ? (
          <button
            className="ghost-button danger-button dilemma-history-delete"
            type="button"
            onClick={onDelete}
            disabled={deleteBusy}
          >
            <TokenIcon type="trash" />
            {ko.common.delete}
          </button>
        ) : null}
      </header>
      <div className="dilemma-facts">
        <DilemmaFact label={ko.dilemmaHistory.factCard} value={formatDilemmaCardLabel(entry as any)} />
        <DilemmaFact label={ko.dilemmaHistory.factSlot} value={entry.timeCounterSlot} />
        {entry.mysteryStickerId ? (
          <div className="dilemma-fact dilemma-fact-sticker">
            <span>{ko.mysteryStickers.previewLabel}</span>
            <strong>
              <MysteryStickerImage
                stickerId={entry.mysteryStickerId}
                publicPath={getMysteryStickerEntry(entry.mysteryStickerId)?.publicPath}
                presentation="meaningful"
                meaningfulAlt={ko.mysteryStickers.previewAlt}
              />
              <span>{getMysteryStickerLabel(entry.mysteryStickerId)}</span>
            </strong>
          </div>
        ) : null}
        <DilemmaFact label={ko.dilemmaHistory.factResult} value={(dilemmaOutcomeLabels as any)[entry.selectedOutcome || ""] || ko.common.undecided} />
      </div>
      <DilemmaTextPreview label={ko.dilemmaHistory.labelContext} value={entry.context} />
      <DilemmaTextPreview label={ko.dilemmaHistory.labelQuestion} value={entry.question} />
      <DilemmaTextPreview label={ko.dilemmaHistory.labelMemo} value={entry.councilNotes} />
      <div className="dilemma-outcome-grid">
        <DilemmaOutcomePreview label={ko.dilemmaHistory.labelAye} selected={entry.selectedOutcome === "aye"} outcome={entry.aye} />
        <DilemmaOutcomePreview label={ko.dilemmaHistory.labelNay} selected={entry.selectedOutcome === "nay"} outcome={entry.nay} />
      </div>
      <DilemmaTextPreview label={ko.dilemmaHistory.labelVote} value={entry.voteNotes} />
      <DilemmaTextPreview label={ko.dilemmaHistory.labelFollowUp} value={entry.resolutionNotes} />
      <DilemmaPhotoStrip photos={entry.photos} />
      <p className="dilemma-updated">
        {ko.dilemmaHistory.savedLine(entry.savedByName || entry.updatedByName || ko.common.councilFallback, formatLocalDateTime(entry.savedAt || entry.updatedAt))}
      </p>
    </article>
  );
}

export default DilemmaHistoryDialog;
