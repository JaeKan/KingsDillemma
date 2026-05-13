import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  formatDilemmaCardLabel,
  formatDilemmaVoteAdvantage,
  formatLocalDateTime,
  normalizeDilemmaHistoryEntry,
  normalizeDilemmaVotes,
  normalizeResolutionChecklist,
  sumDilemmaVotes,
} from "../utils/dilemma-helpers";
import { getMysteryStickerEntry } from "../../shared/mystery-stickers.mts";
import { MysteryStickerImage } from "./MysteryStickerImage";
import { dilemmaOutcomeLabels, ko } from "../resources/gameResources";
import { TokenIcon } from "./GameIcons";
import {
  DilemmaTextPreview,
  DilemmaOutcomeEffectsSummary,
  DilemmaOutcomePreview,
  DilemmaPhotoStrip,
  DilemmaVoteBreakdown,
} from "./DilemmaUI";
import { DilemmaHistoryEntry, RedactedHouse } from "../types/game";

interface DilemmaHistoryDialogProps {
  busy: boolean;
  currentHouseId: string | null;
  houses?: RedactedHouse[];
  history: DilemmaHistoryEntry[];
  open: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  restoreFocusRef: React.RefObject<HTMLElement>;
}

function DilemmaHistoryDialog({
  busy,
  currentHouseId,
  houses = [],
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
              houses={houses}
              onDelete={handleDeleteSelected}
            />
            <DilemmaHistoryBoardPhotoArchive
              entries={normalizedHistory}
              selectedId={selectedEntry?.historyId || ""}
              onSelect={setSelectedId}
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
  houses: RedactedHouse[];
  onDelete: () => void;
}

function DilemmaHistoryDetail({ canDelete, deleteBusy, entry, houses, onDelete }: DilemmaHistoryDetailProps) {
  if (!entry) {
    return null;
  }

  const votes = normalizeDilemmaVotes(entry.votes);
  const ayePower = sumDilemmaVotes(votes, houses, "aye");
  const nayPower = sumDilemmaVotes(votes, houses, "nay");
  const outcomeDisplay = (dilemmaOutcomeLabels as any)[entry.selectedOutcome || ""] || ko.common.undecided;
  const advantageDisplay = formatDilemmaVoteAdvantage(ayePower, nayPower);
  const resolutionMemo = normalizeResolutionChecklist(entry.resolutionChecklist).memo || "";
  const cardLabel = formatDilemmaCardLabel(entry as any) || ko.common.noTitle;
  const selectedOutcomeRecord =
    entry.selectedOutcome === "aye" ? entry.aye : entry.selectedOutcome === "nay" ? entry.nay : null;
  const savedLine = ko.dilemmaHistory.savedLine(
    entry.savedByName || entry.updatedByName || ko.common.councilFallback,
    formatLocalDateTime(entry.savedAt || entry.updatedAt),
  );

  return (
    <article className="dilemma-history-detail">
      {canDelete ? (
        <header className="dilemma-history-detail-head">
          <button
            className="ghost-button danger-button dilemma-history-delete"
            type="button"
            onClick={onDelete}
            disabled={deleteBusy}
          >
            <TokenIcon type="trash" />
            {ko.common.delete}
          </button>
        </header>
      ) : null}
      <div className="dilemma-summary-meta-grid dilemma-history-meta-grid">
        <span className="dilemma-summary-meta-field dilemma-summary-meta-field--code">
          <span className="dilemma-summary-meta-label">{ko.dilemmaUi.summaryLabelCardCode}</span>
          <strong className="dilemma-summary-meta-value dilemma-summary-card-code">{cardLabel}</strong>
        </span>
        {entry.timeCounterSlot?.trim() ? (
          <span className="dilemma-summary-meta-field dilemma-summary-meta-field--time">
            <span className="dilemma-summary-meta-label">{ko.dilemmaUi.summaryLabelTimeSlot}</span>
            <strong className="dilemma-summary-meta-value">{entry.timeCounterSlot}</strong>
          </span>
        ) : null}
        {entry.mysteryStickerId ? (
          <span className="dilemma-summary-meta-field dilemma-summary-meta-field--sticker">
            <span className="dilemma-summary-meta-label">{ko.dilemmaUi.summaryLabelStorySticker}</span>
            <strong className="dilemma-summary-meta-value dilemma-summary-sticker-group">
              <span className="dilemma-summary-sticker-wrap dilemma-history-sticker-wrap">
                <MysteryStickerImage
                  stickerId={entry.mysteryStickerId}
                  publicPath={getMysteryStickerEntry(entry.mysteryStickerId)?.publicPath}
                  presentation="meaningful"
                  meaningfulAlt={ko.mysteryStickers.previewAlt}
                />
              </span>
            </strong>
          </span>
        ) : null}
      </div>
      <DilemmaTextPreview label={ko.dilemmaHistory.labelContext} value={entry.context} />
      <div className="dilemma-summary-vote-divider" aria-hidden="true" />
      <DilemmaVoteBreakdown dilemma={entry as any} houses={houses} />
      <div className="dilemma-summary-vote-pills" role="group">
        <div className="dilemma-summary-vote-pill">
          <span className="dilemma-summary-vote-pill__label">{ko.dilemmaHistory.factResult}</span>
          <span className="dilemma-summary-vote-pill__value">{outcomeDisplay}</span>
          {entry.voteNotes?.trim() ? (
            <span className="dilemma-summary-vote-pill__detail">{entry.voteNotes}</span>
          ) : null}
        </div>
        <div className="dilemma-summary-vote-pill">
          <span className="dilemma-summary-vote-pill__label">{ko.dilemmaUi.factAdvantage}</span>
          <span className="dilemma-summary-vote-pill__value">{advantageDisplay}</span>
        </div>
      </div>
      <div className="dilemma-outcome-grid">
        <DilemmaOutcomePreview label={ko.dilemmaHistory.labelAye} selected={entry.selectedOutcome === "aye"} outcome={entry.aye} />
        <DilemmaOutcomePreview label={ko.dilemmaHistory.labelNay} selected={entry.selectedOutcome === "nay"} outcome={entry.nay} />
      </div>
      <DilemmaPhotoStrip
        photos={entry.photos}
        sectionLabel={ko.dilemmaHistory.labelPhotosCard}
        stripAriaLabel={ko.dilemmaUi.photoStripAria}
      />
      <DilemmaOutcomeEffectsSummary outcome={selectedOutcomeRecord} houses={houses} />
      {resolutionMemo ? <DilemmaTextPreview label={ko.dilemmaHistory.labelMemo} value={resolutionMemo} /> : null}
      <DilemmaPhotoStrip
        photos={entry.resolutionPhotos}
        sectionLabel={ko.dilemmaHistory.labelPhotosResolution}
        stripAriaLabel={ko.dilemmaUi.photoStripResolutionAria}
      />
      <p className="dilemma-updated">{savedLine}</p>
    </article>
  );
}

function DilemmaHistoryBoardPhotoArchive({
  entries,
  selectedId,
  onSelect,
}: {
  entries: DilemmaHistoryEntry[];
  selectedId: string;
  onSelect: (historyId: string) => void;
}) {
  const photoItems = entries.flatMap((entry) =>
    (entry.resolutionPhotos || []).map((photo, photoIndex) => ({
      entry,
      photo,
      photoIndex,
      label: formatDilemmaCardLabel(entry as any) || ko.common.noTitle,
      savedAt: formatLocalDateTime(entry.savedAt || entry.updatedAt),
    })),
  );

  return (
    <section className="dilemma-history-board-gallery" aria-label={ko.dilemmaHistory.boardPhotoArchiveTitle}>
      <header className="dilemma-history-board-gallery-head">
        <div>
          <p className="section-label">{ko.dilemmaHistory.labelPhotosResolution}</p>
          <h3>{ko.dilemmaHistory.boardPhotoArchiveTitle}</h3>
        </div>
        <span>{photoItems.length} / {entries.length}</span>
      </header>
      {photoItems.length ? (
        <div className="dilemma-history-board-gallery-grid">
          {photoItems.map(({ entry, photo, photoIndex, label, savedAt }) => (
            <button
              className={`dilemma-history-board-photo-card${entry.historyId === selectedId ? " selected" : ""}`}
              key={`${entry.historyId}-${photo.id || photoIndex}`}
              type="button"
              onClick={() => onSelect(entry.historyId)}
            >
              <span className="dilemma-history-board-photo-frame">
                <img src={photo.dataUrl} alt={photo.name || ko.dilemmaResolution.photoAlt} />
              </span>
              <span className="dilemma-history-board-photo-meta">
                <strong>{label}</strong>
                <span>{savedAt}</span>
                <em>{photoIndex + 1} / {entry.resolutionPhotos.length}</em>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="dilemma-history-board-gallery-empty">{ko.dilemmaHistory.boardPhotoArchiveEmpty}</p>
      )}
    </section>
  );
}

export default DilemmaHistoryDialog;
