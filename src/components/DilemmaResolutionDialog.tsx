import React, { useCallback, useEffect, useId, useRef } from "react";
import { ValueMentionTextarea, MentionRenderedPreview, hasMentionToken, type MentionPart } from "./MentionUI";
import { TokenIcon } from "./GameIcons";
import {
  deriveDilemmaResourceEffects,
  dilemmaAwaitingModeratorResolution,
  normalizeDilemmaRecord,
  normalizeDilemmaResourceDeltas,
  normalizeDilemmaVotes,
  normalizeResolutionChecklist,
  getActiveDilemmaVoteHouses,
} from "../utils/dilemma-helpers";
import type { DilemmaEditDraft, PersonalResourceId } from "../types/game";
import { dilemmaOutcomeLabels, ko, resourceCounters } from "../resources/gameResources";
import { DilemmaPhotoUploader, dilemmaResolutionPhotoUploaderCopy, getClipboardImageFiles } from "./DilemmaPhotoUploader";
import { DilemmaOutcomeEffectEditor } from "./DilemmaEditDialog";
import { Tooltip } from "./Tooltip";

interface DilemmaResolutionDialogProps {
  busy: boolean;
  currentHouseId: string | null;
  dilemmaModeratorId: string | null;
  draft: DilemmaEditDraft;
  history: any[];
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
  history,
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
  const timeSlotInputId = useId();
  const resourceDeltaHeadingId = useId();

  const normalized = normalizeDilemmaRecord(draft as any);
  const votes = normalizeDilemmaVotes(normalized.votes);
  const participants = getActiveDilemmaVoteHouses(houses);
  const tieAwaitingModerator = dilemmaAwaitingModeratorResolution(normalized, votes, participants);
  const isModerator = Boolean(currentHouseId && dilemmaModeratorId === currentHouseId);
  const outcomeLabel =
    normalized.selectedOutcome && (dilemmaOutcomeLabels as any)[normalized.selectedOutcome]
      ? (dilemmaOutcomeLabels as any)[normalized.selectedOutcome]
      : ko.common.undecided;

  const saveBlockedByTie = tieAwaitingModerator && !normalized.selectedOutcome;
  const resolutionChecklist = normalizeResolutionChecklist(draft.resolutionChecklist);
  const disabledResolutionFields = busy || saveBlockedByTie;

  const selectedOutcomeKey = normalized.selectedOutcome === "aye" || normalized.selectedOutcome === "nay"
    ? normalized.selectedOutcome
    : "";
  const selectedOutcome = selectedOutcomeKey === "aye" ? normalized.aye : selectedOutcomeKey === "nay" ? normalized.nay : null;
  const rawSelectedOutcome =
    selectedOutcomeKey === "aye" ? draft.aye : selectedOutcomeKey === "nay" ? draft.nay : null;
  const editableSelectedOutcome = selectedOutcome
    ? {
        ...selectedOutcome,
        ...(rawSelectedOutcome || {}),
      }
    : null;
  const selectedOutcomeEffects = Array.isArray(editableSelectedOutcome?.effects)
    ? editableSelectedOutcome.effects.filter((effect) => effect?.type !== "resource")
    : [];
  const mysteryStickerCount = new Set(
    [...(Array.isArray(history) ? history : []), normalized]
      .map((entry) => entry?.mysteryStickerId)
      .filter(Boolean),
  ).size;
  const mysteryFinaleTriggered = Boolean(normalized.mysteryStickerId && mysteryStickerCount >= 6);

  const setChecklistKey = (key: "a" | "b" | "c" | "d" | "e" | "f", checked: boolean) => {
    const next = { ...resolutionChecklist };
    if (checked) {
      next[key] = true;
    } else {
      delete next[key];
    }
    onFieldChange("resolutionChecklist", normalizeResolutionChecklist(next));
  };

  const setSelectedOutcomePatch = (patch: Record<string, unknown>) => {
    if (!selectedOutcomeKey || !editableSelectedOutcome) {
      return;
    }

    onFieldChange(selectedOutcomeKey, {
      ...editableSelectedOutcome,
      ...patch,
    });
  };

  const setSelectedOutcomeResourceDelta = (resourceId: PersonalResourceId, value: string) => {
    if (!editableSelectedOutcome) {
      return;
    }

    const nextResourceDeltas = normalizeDilemmaResourceDeltas({
      ...(editableSelectedOutcome.resourceDeltas || {}),
      [resourceId]: Number(value),
    });
    const nonResourceEffects = Array.isArray(editableSelectedOutcome.effects)
      ? editableSelectedOutcome.effects.filter((effect) => effect?.type !== "resource")
      : [];

    setSelectedOutcomePatch({
      resourceDeltas: nextResourceDeltas,
      effects: [...deriveDilemmaResourceEffects(nextResourceDeltas), ...nonResourceEffects],
    });
  };

  const setSelectedOutcomeEffects = (effects: any[]) => {
    if (!editableSelectedOutcome) {
      return;
    }

    const nonResourceEffects = effects.filter((effect) => effect?.type !== "resource");

    setSelectedOutcomePatch({
      effects: [...deriveDilemmaResourceEffects(editableSelectedOutcome.resourceDeltas || {}), ...nonResourceEffects],
    });
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
          <article className="dilemma-resolution-step" aria-label={ko.dilemmaResolution.stepOutcome}>
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
            {editableSelectedOutcome ? (
              <>
                <DilemmaResolutionMentionTextarea
                  label={ko.dilemmaResolution.labelBackResult}
                  value={editableSelectedOutcome.result || ""}
                  onChange={(value) => setSelectedOutcomePatch({ result: value })}
                  placeholder={ko.dilemmaResolution.phBackResult}
                  disabled={disabledResolutionFields}
                />
                <p id={resourceDeltaHeadingId} className="section-label dilemma-resource-deltas-heading dilemma-resolution-resource-deltas-label">
                  {ko.dilemmaResolution.resourceBackDeltaSection}
                </p>
                <div className="dilemma-resolution-resource-deltas" aria-labelledby={resourceDeltaHeadingId}>
                  <div className="dilemma-resource-deltas-rows dilemma-resource-deltas-rows--compact dilemma-resource-deltas-rows--resolution">
                    {resourceCounters.map((resource) => {
                      const resourceId = resource.id as PersonalResourceId;

                      return (
                        <div
                          key={resource.id}
                          className="dilemma-resource-delta-edit-row dilemma-resource-delta-edit-row--compact"
                        >
                          <div className="dilemma-resource-delta-edit-label">
                            <TokenIcon type={resource.icon} />
                            <span className="dilemma-resource-delta-edit-name">{resource.label}</span>
                          </div>
                          <input
                            className="dilemma-resource-delta-edit-input"
                            type="number"
                            aria-label={`${outcomeLabel} · ${resource.label} · ${ko.dilemmaResolution.resourceBackDeltaSection}`}
                            value={editableSelectedOutcome.resourceDeltas?.[resourceId] || ""}
                            onChange={(event) => setSelectedOutcomeResourceDelta(resourceId, event.target.value)}
                            disabled={disabledResolutionFields}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="dilemma-resolution-effects-edit">
                  <DilemmaOutcomeEffectEditor
                    outcomeLabel={outcomeLabel}
                    effects={selectedOutcomeEffects}
                    houses={houses}
                    onChange={setSelectedOutcomeEffects}
                  />
                </div>
              </>
            ) : null}
          </article>

          <article className="dilemma-resolution-step" aria-label={ko.dilemmaResolution.stepTimeSlot}>
            <div className="dilemma-field">
              <span className="dilemma-field-label-with-help">
                <label htmlFor={timeSlotInputId}>{ko.dilemmaResolution.labelTimeSlot}</label>
                <Tooltip
                  className="dilemma-field-help-tooltip"
                  label={ko.dilemmaResolution.timeSlotHelp}
                  ariaLabel={ko.dilemmaResolution.timeSlotHelpAria}
                >
                  <button
                    className="icon-help-button dilemma-field-help-button"
                    type="button"
                    aria-label={ko.dilemmaResolution.timeSlotHelpAria}
                  >
                    <TokenIcon type="help" />
                  </button>
                </Tooltip>
              </span>
              <input
                id={timeSlotInputId}
                type="text"
                value={draft.timeCounterSlot}
                onChange={(e) => onFieldChange("timeCounterSlot", e.target.value)}
                placeholder={ko.dilemmaResolution.phTimeSlot}
                disabled={disabledResolutionFields}
              />
            </div>
          </article>

          <article className="dilemma-resolution-step" aria-label={ko.dilemmaResolution.stepRulebookChecklist}>
            <span className="dilemma-field-label-with-help">
              <span>{ko.dilemmaResolution.labelResolutionChecklist}</span>
              <Tooltip
                className="dilemma-field-help-tooltip"
                label={ko.dilemmaResolution.rulebookChecklistHelp}
                ariaLabel={ko.dilemmaResolution.rulebookChecklistHelpAria}
              >
                <button
                  className="icon-help-button dilemma-field-help-button"
                  type="button"
                  aria-label={ko.dilemmaResolution.rulebookChecklistHelpAria}
                >
                  <TokenIcon type="help" />
                </button>
              </Tooltip>
            </span>
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
              {mysteryFinaleTriggered ? (
                <p className="session-score-status">{ko.dilemmaResolution.mysteryFinaleTrigger}</p>
              ) : null}
              <label className="dilemma-resolution-checklist-row">
                <input
                  type="checkbox"
                  checked={Boolean(resolutionChecklist.e)}
                  onChange={(e) => setChecklistKey("e", e.target.checked)}
                  disabled={disabledResolutionFields}
                />
                <span>{ko.dilemmaResolution.checklistItemE}</span>
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

          <article className="dilemma-resolution-step" aria-label={ko.dilemmaResolution.photoSectionTitle}>
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
