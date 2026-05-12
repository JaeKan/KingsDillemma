import React, { useCallback, useEffect, useRef, useState } from "react";
import { ValueMentionTextarea, MentionRenderedPreview, hasMentionToken, type MentionPart } from "./MentionUI";
import { TokenIcon } from "./GameIcons";
import {
  deriveDilemmaResourceEffects,
  dilemmaAwaitingModeratorResolution,
  normalizeDilemmaRecord,
  normalizeDilemmaResourceDeltas,
  normalizeDilemmaVotes,
  normalizeDilemmaResolutionBoardState,
  normalizeResolutionChecklist,
  getOrderedDilemmaResourceEffects,
  getDilemmaOutcomeKingDeathReason,
  shouldTriggerFifthCardKingDeath,
  sumDilemmaVotes,
  getActiveDilemmaVoteHouses,
} from "../utils/dilemma-helpers";
import type { DilemmaEditDraft, DilemmaMomentumDirection, PersonalResourceId } from "../types/game";
import { dilemmaOutcomeLabels, ko, resourceCounters } from "../resources/gameResources";
import { DilemmaPhotoUploader, dilemmaResolutionPhotoUploaderCopy, getClipboardImageFiles } from "./DilemmaPhotoUploader";
import { DilemmaOutcomeEffectEditor } from "./DilemmaEditDialog";

interface DilemmaResolutionDialogProps {
  busy: boolean;
  currentHouseId: string | null;
  currentSessionResolvedDilemmaCount: number;
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

function clampBoardPosition(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function getMoveDirection(movement: number): DilemmaMomentumDirection {
  if (movement > 0) {
    return "positive";
  }

  if (movement < 0) {
    return "negative";
  }

  return "";
}

function getMomentumLabel(direction: string, hasMarker?: boolean) {
  if (direction === "positive") {
    return hasMarker ? ko.dilemmaResolution.momentumPositiveMarked : ko.dilemmaResolution.momentumPositive;
  }

  if (direction === "negative") {
    return hasMarker ? ko.dilemmaResolution.momentumNegativeMarked : ko.dilemmaResolution.momentumNegative;
  }

  return ko.dilemmaResolution.momentumNone;
}

function calculateMomentumMovement(
  cardMovement: number,
  currentDirection: DilemmaMomentumDirection,
  hasMomentumMarker: boolean,
) {
  const baseMovement = Number.isFinite(cardMovement) ? Math.trunc(cardMovement) : 0;
  const moveDirection = getMoveDirection(baseMovement);

  if (!moveDirection) {
    return {
      totalMovement: 0,
      finalDirection: currentDirection,
      finalMarker: Boolean(currentDirection && hasMomentumMarker),
    };
  }

  if (currentDirection === moveDirection) {
    const bonus = hasMomentumMarker ? 2 : 1;
    return {
      totalMovement: baseMovement + (moveDirection === "positive" ? bonus : -bonus),
      finalDirection: currentDirection,
      finalMarker: true,
    };
  }

  return {
    totalMovement: baseMovement,
    finalDirection: moveDirection,
    finalMarker: false,
  };
}

function deriveBoardResolution(
  boardState: any,
  fallbackMovements: Record<string, number> = {},
  orderedMovements: Array<{ resourceId: PersonalResourceId; amount: number }> = [],
  kingDeathReason = "",
) {
  const aggregatedMovements = orderedMovements.length
    ? orderedMovements.reduce<Record<string, number>>((totals, movement) => {
        totals[movement.resourceId] = (totals[movement.resourceId] || 0) + movement.amount;
        return totals;
      }, {})
    : fallbackMovements;
  const calculatedRows = resourceCounters.map((resource) => {
    const start = Number(boardState.resourceStartPositions?.[resource.id] || 0);
    const cardMovement = Number(aggregatedMovements[resource.id] ?? boardState.resourceMovements?.[resource.id] ?? 0);
    const momentum = calculateMomentumMovement(
      cardMovement,
      boardState.resourceMomentum?.[resource.id] || "",
      Boolean(boardState.resourceMomentumMarkers?.[resource.id]),
    );

    return {
      resourceId: resource.id,
      start,
      cardMovement,
      ...momentum,
      finalPosition: start > 0 ? clampBoardPosition(start + momentum.totalMovement, 1, 17) : 0,
    };
  });

  const resourceMovements = Object.fromEntries(
    calculatedRows.filter((row) => row.totalMovement !== 0).map((row) => [row.resourceId, row.totalMovement]),
  );
  const resourceFinalPositions = Object.fromEntries(
    calculatedRows.filter((row) => row.finalPosition > 0).map((row) => [row.resourceId, row.finalPosition]),
  );
  const resourceFinalMomentum = Object.fromEntries(
    calculatedRows.filter((row) => row.finalDirection).map((row) => [row.resourceId, row.finalDirection]),
  );
  const resourceFinalMomentumMarkers = Object.fromEntries(
    calculatedRows.filter((row) => row.finalMarker).map((row) => [row.resourceId, true]),
  );
  const stabilityStart = Number(boardState.stabilityStart || 0);
  let stabilityCurrent = stabilityStart;
  let stabilityMovement = 0;
  let stabilityTrigger = "";
  const stabilitySequence = orderedMovements.length
    ? orderedMovements
        .map((movement) => ({ totalMovement: Number(movement.amount) || 0 }))
        .filter((movement) => movement.totalMovement !== 0)
    : calculatedRows;

  if (stabilityStart > 0) {
    for (const row of stabilitySequence) {
      if (stabilityTrigger || row.totalMovement === 0) {
        continue;
      }

      const nextStability = stabilityCurrent + row.totalMovement;
      if (nextStability >= 13) {
        stabilityMovement += 13 - stabilityCurrent;
        stabilityCurrent = 13;
        stabilityTrigger = "abdication_top";
      } else if (nextStability <= 1) {
        stabilityMovement += 1 - stabilityCurrent;
        stabilityCurrent = 1;
        stabilityTrigger = "abdication_bottom";
      } else {
        stabilityMovement += row.totalMovement;
        stabilityCurrent = nextStability;
      }
    }
  }

  const stabilityFinal = stabilityStart > 0 ? stabilityCurrent : 0;
  const endTrigger = kingDeathReason || boardState.kingDeathReason ? "king_death" : stabilityTrigger || "none";

  return {
    resourceMovements,
    resourceFinalPositions,
    resourceFinalMomentum,
    resourceFinalMomentumMarkers,
    stabilityMovement,
    stabilityFinal,
    endTrigger,
  };
}

function formatEndTrigger(trigger: string) {
  if (trigger === "king_death") {
    return ko.dilemmaResolution.endTriggerKingDeath;
  }

  if (trigger === "abdication_top") {
    return ko.dilemmaResolution.endTriggerAbdicationTop;
  }

  if (trigger === "abdication_bottom") {
    return ko.dilemmaResolution.endTriggerAbdicationBottom;
  }

  return ko.dilemmaResolution.endTriggerNone;
}

export default function DilemmaResolutionDialog({
  busy,
  currentHouseId,
  currentSessionResolvedDilemmaCount,
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
  const [kingDeathSpaceChecked, setKingDeathSpaceChecked] = useState(false);

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

  const boardState = normalizeDilemmaResolutionBoardState(normalized.resolutionBoardState);
  const selectedOutcomeKey = normalized.selectedOutcome === "aye" || normalized.selectedOutcome === "nay"
    ? normalized.selectedOutcome
    : "";
  const selectedOutcome = selectedOutcomeKey === "aye" ? normalized.aye : selectedOutcomeKey === "nay" ? normalized.nay : null;
  const selectedResourceEffects = getOrderedDilemmaResourceEffects(selectedOutcome);
  const selectedOutcomeEffects = Array.isArray(selectedOutcome?.effects)
    ? selectedOutcome.effects.filter((effect) => effect?.type !== "resource")
    : [];
  const selectedKingDeathReason = getDilemmaOutcomeKingDeathReason(selectedOutcome);
  const effectiveKingDeathReason = boardState.kingDeathReason || selectedKingDeathReason;
  const currentSessionCardNumber = Math.max(1, Math.trunc(Number(currentSessionResolvedDilemmaCount) || 0) + 1);
  const boardCalculation = deriveBoardResolution(
    boardState,
    selectedOutcome?.resourceDeltas || {},
    selectedResourceEffects,
    effectiveKingDeathReason,
  );
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

  const setBoardState = (patch: Record<string, unknown>) => {
    const next = normalizeDilemmaResolutionBoardState({
      ...boardState,
      ...patch,
    });
    const nextKingDeathReason = next.kingDeathReason || selectedKingDeathReason;
    onFieldChange("resolutionBoardState", {
      ...next,
      ...deriveBoardResolution(next, selectedOutcome?.resourceDeltas || {}, selectedResourceEffects, nextKingDeathReason),
    });
  };

  const setKingDeathSpace = (checked: boolean) => {
    setKingDeathSpaceChecked(checked);

    if (shouldTriggerFifthCardKingDeath(currentSessionCardNumber, checked)) {
      setBoardState({ kingDeathReason: "fifth_card" });
    } else if (!checked && boardState.kingDeathReason === "fifth_card") {
      setBoardState({ kingDeathReason: "" });
    }
  };

  const setResourceBoardValue = (
    field: "resourceStartPositions" | "resourceMovements",
    resourceId: string,
    value: string,
  ) => {
    const nextField = {
      ...(boardState as any)[field],
      [resourceId]: Number(value),
    };
    setBoardState({ [field]: nextField });
  };

  const setResourceMomentumValue = (
    field: "resourceMomentum" | "resourceMomentumMarkers",
    resourceId: string,
    value: string | boolean,
  ) => {
    const nextField = {
      ...(boardState as any)[field],
      [resourceId]: value,
    };
    setBoardState({ [field]: nextField });
  };

  const setSelectedOutcomePatch = (patch: Record<string, unknown>) => {
    if (!selectedOutcomeKey || !selectedOutcome) {
      return;
    }

    onFieldChange(selectedOutcomeKey, {
      ...selectedOutcome,
      ...patch,
    });
  };

  const setSelectedOutcomeResourceDelta = (resourceId: PersonalResourceId, value: string) => {
    if (!selectedOutcome) {
      return;
    }

    const nextResourceDeltas = normalizeDilemmaResourceDeltas({
      ...(selectedOutcome.resourceDeltas || {}),
      [resourceId]: Number(value),
    });
    const nonResourceEffects = Array.isArray(selectedOutcome.effects)
      ? selectedOutcome.effects.filter((effect) => effect?.type !== "resource")
      : [];

    setSelectedOutcomePatch({
      resourceDeltas: nextResourceDeltas,
      effects: [...deriveDilemmaResourceEffects(nextResourceDeltas), ...nonResourceEffects],
    });
  };

  const setSelectedOutcomeEffects = (effects: any[]) => {
    if (!selectedOutcome) {
      return;
    }

    const nonResourceEffects = effects.filter((effect) => effect?.type !== "resource");

    setSelectedOutcomePatch({
      effects: [...deriveDilemmaResourceEffects(selectedOutcome.resourceDeltas || {}), ...nonResourceEffects],
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
            {selectedOutcome ? (
              <div className="dilemma-resolution-result-entry">
                <p className="dilemma-resolution-step-body">{ko.dilemmaResolution.backResultHelp}</p>
                <DilemmaResolutionMentionTextarea
                  label={ko.dilemmaResolution.labelBackResult}
                  value={selectedOutcome.result || ""}
                  onChange={(value) => setSelectedOutcomePatch({ result: value })}
                  placeholder={ko.dilemmaResolution.phBackResult}
                  disabled={disabledResolutionFields}
                />
                <div className="dilemma-resolution-resource-deltas" aria-label={ko.dilemmaResolution.resourceBackDeltaSection}>
                  <p className="section-label dilemma-resource-deltas-heading">
                    {ko.dilemmaResolution.resourceBackDeltaSection}
                  </p>
                  <div className="dilemma-resource-deltas-rows">
                    {resourceCounters.map((resource) => {
                      const resourceId = resource.id as PersonalResourceId;

                      return (
                        <div key={resource.id} className="dilemma-resource-delta-edit-row">
                          <div className="dilemma-resource-delta-edit-label">
                            <TokenIcon type={resource.icon} />
                            <span className="dilemma-resource-delta-edit-name">{resource.label}</span>
                          </div>
                          <input
                            className="dilemma-resource-delta-edit-input"
                            type="number"
                            aria-label={`${outcomeLabel} · ${resource.label} · ${ko.dilemmaResolution.resourceBackDeltaSection}`}
                            value={selectedOutcome.resourceDeltas?.[resourceId] || ""}
                            onChange={(event) => setSelectedOutcomeResourceDelta(resourceId, event.target.value)}
                            disabled={disabledResolutionFields}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <DilemmaOutcomeEffectEditor
                  outcomeLabel={outcomeLabel}
                  effects={selectedOutcomeEffects}
                  onChange={setSelectedOutcomeEffects}
                />
              </div>
            ) : null}
          </article>

          <article className="dilemma-resolution-step">
            <h3 className="dilemma-resolution-step-title">{ko.dilemmaResolution.stepBoardResolution}</h3>
            <p className="dilemma-resolution-step-body">{ko.dilemmaResolution.boardResolutionHelp}</p>
            <div className="dilemma-board-resolution-grid">
              {resourceCounters.map((resource) => {
                const resourceId = resource.id as PersonalResourceId;
                const start = boardState.resourceStartPositions[resourceId] || 0;
                const orderedCardMovement = selectedResourceEffects
                  .filter((effect) => effect.resourceId === resourceId)
                  .reduce((total, effect) => total + effect.amount, 0);
                const cardMovement =
                  orderedCardMovement ||
                  selectedOutcome?.resourceDeltas?.[resourceId] ||
                  boardState.resourceMovements[resourceId] ||
                  0;
                const movement = boardCalculation.resourceMovements[resourceId] || 0;
                const final = boardCalculation.resourceFinalPositions[resourceId] || 0;
                const finalMomentum = boardCalculation.resourceFinalMomentum[resourceId] || "";
                const finalMarker = Boolean(boardCalculation.resourceFinalMomentumMarkers[resourceId]);
                return (
                  <div className={`dilemma-board-resource-row tone-${resource.tone}`} key={resource.id}>
                    <span>
                      <TokenIcon type={resource.icon as any} />
                      {resource.label}
                    </span>
                    <label>
                      {ko.dilemmaResolution.labelBoardStart}
                      <input
                        type="number"
                        min="1"
                        max="17"
                        value={start || ""}
                        onChange={(e) => setResourceBoardValue("resourceStartPositions", resource.id, e.target.value)}
                        disabled={disabledResolutionFields}
                      />
                    </label>
                    <label>
                      {ko.dilemmaResolution.labelCurrentMomentum}
                      <select
                        value={boardState.resourceMomentum[resourceId] || ""}
                        onChange={(e) => setResourceMomentumValue("resourceMomentum", resourceId, e.target.value)}
                        disabled={disabledResolutionFields}
                      >
                        <option value="">{ko.dilemmaResolution.momentumNone}</option>
                        <option value="positive">{ko.dilemmaResolution.momentumPositive}</option>
                        <option value="negative">{ko.dilemmaResolution.momentumNegative}</option>
                      </select>
                    </label>
                    <label className="dilemma-board-marker-check">
                      <input
                        type="checkbox"
                        checked={Boolean(boardState.resourceMomentumMarkers[resourceId])}
                        onChange={(e) => setResourceMomentumValue("resourceMomentumMarkers", resourceId, e.target.checked)}
                        disabled={disabledResolutionFields}
                      />
                      {ko.dilemmaResolution.labelMomentumMarker}
                    </label>
                    <label>
                      {ko.dilemmaResolution.labelCardMove}
                      <input
                        type="number"
                        min="-17"
                        max="17"
                        value={cardMovement || ""}
                        onChange={(e) => setResourceBoardValue("resourceMovements", resourceId, e.target.value)}
                        disabled={disabledResolutionFields}
                      />
                    </label>
                    <output>
                      {final
                        ? ko.dilemmaResolution.boardAutoResult(
                            movement,
                            final,
                            getMomentumLabel(finalMomentum, finalMarker),
                          )
                        : ko.common.notSpecified}
                    </output>
                  </div>
                );
              })}
            </div>
            <div className="dilemma-stability-resolution-grid">
              <label className="dilemma-field">
                <span>{ko.dilemmaResolution.labelStabilityStart}</span>
                <input
                  type="number"
                  min="1"
                  max="13"
                  value={boardState.stabilityStart || ""}
                  onChange={(e) => setBoardState({ stabilityStart: Number(e.target.value) })}
                  disabled={disabledResolutionFields}
                />
              </label>
              <label className="dilemma-field">
                <span>{ko.dilemmaResolution.labelStabilityMove}</span>
                <input
                  type="number"
                  min="-13"
                  max="13"
                  value={boardCalculation.stabilityMovement || ""}
                  disabled
                />
              </label>
              <div className="dilemma-board-result-card">
                <span>{ko.dilemmaResolution.labelStabilityFinal}</span>
                <strong>
                  {boardCalculation.stabilityFinal ? boardCalculation.stabilityFinal : ko.common.notSpecified}
                </strong>
              </div>
            </div>
            <div className="dilemma-end-trigger-grid">
              <div className="dilemma-board-result-card">
                <span>{ko.dilemmaResolution.labelCurrentSessionCard}</span>
                <strong>{ko.dilemmaResolution.currentSessionCardNumber(currentSessionCardNumber)}</strong>
              </div>
              <label className="dilemma-resolution-checklist-row">
                <input
                  type="checkbox"
                  checked={kingDeathSpaceChecked}
                  onChange={(e) => setKingDeathSpace(e.target.checked)}
                  disabled={disabledResolutionFields}
                />
                <span>{ko.dilemmaResolution.kingDeathSpaceCheck}</span>
              </label>
              <label className="dilemma-field">
                <span>{ko.dilemmaResolution.labelKingDeathReason}</span>
                <select
                  value={boardState.kingDeathReason}
                  onChange={(e) => setBoardState({ kingDeathReason: e.target.value })}
                  disabled={disabledResolutionFields}
                >
                  <option value="">{ko.dilemmaResolution.deathReasonNone}</option>
                  <option value="death_symbol">{ko.dilemmaResolution.deathReasonSymbol}</option>
                  <option value="fifth_card">{ko.dilemmaResolution.deathReasonFifth}</option>
                  <option value="card_text">{ko.dilemmaResolution.deathReasonCardText}</option>
                </select>
              </label>
              <div className="dilemma-board-result-card">
                <span>{ko.dilemmaResolution.labelEndTrigger}</span>
                <strong>{formatEndTrigger(boardCalculation.endTrigger)}</strong>
              </div>
            </div>
            <label className="dilemma-field dilemma-field-textarea">
              <span>{ko.dilemmaResolution.boardMemoLabel}</span>
              <textarea
                value={boardState.memo}
                onChange={(e) => setBoardState({ memo: e.target.value })}
                disabled={disabledResolutionFields}
                placeholder={ko.dilemmaResolution.boardMemoPh}
              />
            </label>
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
