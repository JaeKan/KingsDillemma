import React, { useCallback, useEffect, useRef } from "react";
import { ValueMentionTextarea, MentionRenderedPreview, hasMentionToken, type MentionPart } from "./MentionUI";
import { TokenIcon } from "./GameIcons";
import {
  dilemmaAwaitingModeratorResolution,
  normalizeDilemmaRecord,
  normalizeDilemmaVotes,
  normalizeResolutionChecklist,
  sumDilemmaVotes,
  getActiveDilemmaVoteHouses,
} from "../utils/dilemma-helpers";
import { DilemmaEditDraft } from "../types/game";
import { dilemmaOutcomeLabels, ko } from "../resources/gameResources";
import { DilemmaPhotoUploader, dilemmaResolutionPhotoUploaderCopy, getClipboardImageFiles } from "./DilemmaPhotoUploader";

interface DilemmaResolutionDialogProps {
  busy: boolean;
  currentHouseId: string | null;
  dilemmaModeratorId: string | null;
  draft: DilemmaEditDraft;
  houses: any[];
  mutate: (payload: any) => Promise<boolean>;
  open: boolean;
  restoreFocusRef: React.RefObject<HTMLElement>;
  onCancel: () => void;
  onFieldChange: (field: string, value: unknown) => void;
  onSave: () => void;
  photoBusy: boolean;
  photoError: string | null;
  onAddResolutionPhotos: (files: FileList | File[]) => Promise<void>;
  onRemoveResolutionPhoto: (id: string) => void;
}

function DilemmaResolutionMentionTextarea({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const fieldRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const raw = typeof value === "string" ? value : "";

  const focusMentionToken = useCallback(
    (token: MentionPart) => {
      if (token.type !== "mention") {
        return;
      }

      const field = fieldRef.current;

      if (!field || typeof field.setSelectionRange !== "function") {
        return;
      }

      const start = typeof token.start === "number" ? token.start : 0;
      const end = typeof token.end === "number" ? token.end : start;
      field.focus();
      field.setSelectionRange(start, end);
    },
    [],
  );

  return (
    <label className="dilemma-field dilemma-field-textarea">
      <span>{label}</span>
      <ValueMentionTextarea
        ref={fieldRef}
        value={raw}
        onChange={(event) => onChange((event.target as HTMLTextAreaElement).value)}
        placeholder={placeholder}
        disabled={disabled}
      />
      <MentionRenderedPreview
        text={raw}
        tokenViewClassName="dilemma-mention-token-preview"
        onTokenClick={hasMentionToken(raw) ? focusMentionToken : undefined}
      />
    </label>
  );
}

export default function DilemmaResolutionDialog({
  busy,
  currentHouseId,
  dilemmaModeratorId,
  draft,
  houses,
  mutate,
  open,
  restoreFocusRef,
  onCancel,
  onFieldChange,
  onSave,
  photoBusy,
  photoError,
  onAddResolutionPhotos,
  onRemoveResolutionPhoto,
}: DilemmaResolutionDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);

  const normalized = normalizeDilemmaRecord(draft as any);
  const votes = normalizeDilemmaVotes(normalized.votes);
  const participants = getActiveDilemmaVoteHouses(houses);
  const tallyApplied = Boolean(normalized.voteNotes?.trim());
  const tieAwaitingModerator = dilemmaAwaitingModeratorResolution(normalized, votes, participants);
  const isModerator = Boolean(currentHouseId && dilemmaModeratorId === currentHouseId);
  const ayePower = sumDilemmaVotes(votes, participants, "aye");
  const nayPower = sumDilemmaVotes(votes, participants, "nay");
  const outcomeLabel =
    normalized.selectedOutcome && (dilemmaOutcomeLabels as any)[normalized.selectedOutcome]
      ? (dilemmaOutcomeLabels as any)[normalized.selectedOutcome]
      : ko.common.undecided;

  const saveBlockedByTie = tieAwaitingModerator && !normalized.selectedOutcome;
  const resolutionChecklist = normalizeResolutionChecklist(draft.resolutionChecklist);
  const disabledResolutionFields = busy || saveBlockedByTie;

  const setChecklistKey = (key: "a" | "b" | "c" | "d" | "f", checked: boolean) => {
    const next = { ...resolutionChecklist };
    if (checked) {
      next[key] = true;
    } else {
      delete next[key];
    }
    onFieldChange("resolutionChecklist", normalizeResolutionChecklist(next));
  };

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePhotoPaste = (event: ClipboardEvent) => {
      const imageFiles = getClipboardImageFiles(event.clipboardData);

      if (!imageFiles.length) {
        return;
      }

      event.preventDefault();

      const normalizedDraft = normalizeDilemmaRecord(draft as any);
      const votesNow = normalizeDilemmaVotes(normalizedDraft.votes);
      const participantsNow = getActiveDilemmaVoteHouses(houses);
      const tieNow = dilemmaAwaitingModeratorResolution(normalizedDraft, votesNow, participantsNow);

      if (busy || photoBusy || (tieNow && !normalizedDraft.selectedOutcome)) {
        return;
      }

      void onAddResolutionPhotos(imageFiles);
    };

    document.addEventListener("paste", handlePhotoPaste);

    return () => {
      document.removeEventListener("paste", handlePhotoPaste);
    };
  }, [busy, draft, houses, onAddResolutionPhotos, open, photoBusy]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const focusRestoreEl = restoreFocusRef?.current ?? null;

    const focusFirst = window.setTimeout(() => {
      const root = dialogRef.current;
      if (!root) {
        return;
      }

      const target = root.querySelector<HTMLElement>(
        ".dilemma-resolution-moderator-actions button, textarea:not([disabled]), .dilemma-resolution-checklist input:not([disabled]), .dilemma-photo-add input:not([disabled]), .session-end-actions button",
      );
      target?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
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

      const firstEl = focusable[0] as HTMLElement;
      const lastEl = focusable[focusable.length - 1] as HTMLElement;

      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusFirst);
      document.removeEventListener("keydown", handleKeyDown);
      window.setTimeout(() => {
        focusRestoreEl?.focus();
      }, 0);
    };
  }, [onCancel, open, restoreFocusRef]);

  const resolveTie = async (decision: "aye" | "nay") => {
    await mutate({ action: "resolveModeratorDecision", decision });
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    if (saveBlockedByTie) {
      return;
    }

    onSave();
  };

  if (!open) {
    return null;
  }

  return (
    <div className="session-end-overlay" role="presentation">
      <section
        ref={dialogRef}
        className="dilemma-dialog dilemma-resolution-dialog"
        aria-labelledby="dilemma-resolution-title"
        aria-modal="true"
        role="dialog"
      >
        <div className="session-end-heading">
          <span className="session-end-seal" aria-hidden="true">
            <TokenIcon type="turn" />
          </span>
          <div>
            <p className="section-label">{ko.dilemmaResolution.sectionCouncil}</p>
            <h2 id="dilemma-resolution-title">{ko.dilemmaResolution.title}</h2>
          </div>
        </div>

        <form className="dilemma-form dilemma-resolution-form" onSubmit={submit}>
          <article className="dilemma-resolution-step">
            <h3 className="dilemma-resolution-step-title">{ko.dilemmaResolution.stepTally}</h3>
            <p className="dilemma-resolution-step-body">
              {tallyApplied ? ko.dilemmaResolution.tallyOk : ko.dilemmaResolution.tallyWait}
            </p>
            {normalized.voteNotes?.trim() ? (
              <pre className="dilemma-resolution-vote-notes">{normalized.voteNotes}</pre>
            ) : null}
            <p className="dilemma-resolution-power-line">
              {ko.dilemmaResolution.powerCompare(ayePower, nayPower)}
            </p>
          </article>

          <article className="dilemma-resolution-step">
            <h3 className="dilemma-resolution-step-title">{ko.dilemmaResolution.stepOutcome}</h3>
            {tieAwaitingModerator ? (
              <>
                <p className="dilemma-resolution-step-body">{ko.dilemmaResolution.tieExplain}</p>
                {isModerator ? (
                  <div className="dilemma-resolution-moderator-actions" role="group" aria-label={ko.dilemmaUi.moderatorDecideAria}>
                    <button
                      className="primary-button compact"
                      type="button"
                      onClick={() => resolveTie("aye")}
                      disabled={busy}
                    >
                      {ko.dilemmaUi.moderatorPickAye}
                    </button>
                    <button className="secondary-button compact" type="button" onClick={() => resolveTie("nay")} disabled={busy}>
                      {ko.dilemmaUi.moderatorPickNay}
                    </button>
                  </div>
                ) : (
                  <p className="dilemma-resolution-step-note">{ko.dilemmaResolution.moderatorOnly}</p>
                )}
              </>
            ) : normalized.selectedOutcome ? (
              <p className="dilemma-resolution-step-body">
                {ko.dilemmaResolution.outcomeLocked(outcomeLabel)}
              </p>
            ) : (
              <p className="dilemma-resolution-step-body">{ko.dilemmaResolution.outcomePending}</p>
            )}
          </article>

          <article className="dilemma-resolution-step">
            <h3 className="dilemma-resolution-step-title">{ko.dilemmaResolution.stepTimeSlot}</h3>
            <p className="dilemma-resolution-step-body">{ko.dilemmaResolution.timeSlotHelp}</p>
            <label className="dilemma-field">
              <span>{ko.dilemmaResolution.labelTimeSlot}</span>
              <input
                type="text"
                value={draft.timeCounterSlot}
                onChange={(e) => onFieldChange("timeCounterSlot", e.target.value)}
                placeholder={ko.dilemmaResolution.phTimeSlot}
                disabled={disabledResolutionFields}
              />
            </label>
          </article>

          <article className="dilemma-resolution-step">
            <h3 className="dilemma-resolution-step-title">{ko.dilemmaResolution.stepRulebookChecklist}</h3>
            <p className="dilemma-resolution-step-body">{ko.dilemmaResolution.rulebookChecklistHelp}</p>
            <div
              className="dilemma-resolution-checklist"
              role="group"
              aria-label={ko.dilemmaResolution.stepRulebookChecklist}
            >
              <label className="dilemma-resolution-checklist-row">
                <input
                  type="checkbox"
                  checked={Boolean(resolutionChecklist.a)}
                  onChange={(e) => setChecklistKey("a", e.target.checked)}
                  disabled={disabledResolutionFields}
                />
                <span>{ko.dilemmaResolution.checklistItemA}</span>
              </label>
              <label className="dilemma-resolution-checklist-row">
                <input
                  type="checkbox"
                  checked={Boolean(resolutionChecklist.b)}
                  onChange={(e) => setChecklistKey("b", e.target.checked)}
                  disabled={disabledResolutionFields}
                />
                <span>{ko.dilemmaResolution.checklistItemB}</span>
              </label>
              <label className="dilemma-resolution-checklist-row">
                <input
                  type="checkbox"
                  checked={Boolean(resolutionChecklist.c)}
                  onChange={(e) => setChecklistKey("c", e.target.checked)}
                  disabled={disabledResolutionFields}
                />
                <span>{ko.dilemmaResolution.checklistItemC}</span>
              </label>
              <label className="dilemma-resolution-checklist-row">
                <input
                  type="checkbox"
                  checked={Boolean(resolutionChecklist.d)}
                  onChange={(e) => setChecklistKey("d", e.target.checked)}
                  disabled={disabledResolutionFields}
                />
                <span>{ko.dilemmaResolution.checklistItemD}</span>
              </label>
              <label className="dilemma-resolution-checklist-row">
                <input
                  type="checkbox"
                  checked={Boolean(resolutionChecklist.f)}
                  onChange={(e) => setChecklistKey("f", e.target.checked)}
                  disabled={disabledResolutionFields}
                />
                <span>{ko.dilemmaResolution.checklistItemF}</span>
              </label>
            </div>
            <label className="dilemma-field">
              <span>{ko.dilemmaResolution.checklistMemoLabel}</span>
              <input
                type="text"
                value={resolutionChecklist.memo || ""}
                maxLength={200}
                placeholder={ko.dilemmaResolution.checklistMemoPh}
                disabled={disabledResolutionFields}
                onChange={(e) =>
                  onFieldChange(
                    "resolutionChecklist",
                    normalizeResolutionChecklist({
                      ...resolutionChecklist,
                      memo: e.target.value,
                    }),
                  )
                }
              />
            </label>
          </article>

          <article className="dilemma-resolution-step">
            <h3 className="dilemma-resolution-step-title">{ko.dilemmaResolution.stepFollowUp}</h3>
            <p className="dilemma-resolution-step-body">{ko.dilemmaResolution.followUpHint}</p>
            <DilemmaResolutionMentionTextarea
              label={ko.dilemmaEdit.labelResolution}
              value={draft.resolutionNotes}
              onChange={(value) => onFieldChange("resolutionNotes", value)}
              placeholder={saveBlockedByTie ? ko.dilemmaResolution.phResolutionAfterTie : ko.dilemmaEdit.phResolution}
              disabled={disabledResolutionFields}
            />
            {saveBlockedByTie ? <p className="dilemma-resolution-step-note" role="status">{ko.dilemmaResolution.saveDisabledTie}</p> : null}
            <DilemmaPhotoUploader
              busy={disabledResolutionFields}
              photoBusy={photoBusy}
              error={photoError}
              photos={draft.resolutionPhotos}
              onAddPhotos={onAddResolutionPhotos}
              onRemovePhoto={onRemoveResolutionPhoto}
              copy={dilemmaResolutionPhotoUploaderCopy}
            />
          </article>

          <div className="session-end-actions">
            <button className="ghost-button" type="button" onClick={onCancel} disabled={busy}>
              {ko.common.cancel}
            </button>
            <button className="primary-button" type="submit" disabled={busy || saveBlockedByTie}>
              <TokenIcon type="save" />
              {busy ? ko.common.saving : ko.common.save}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
