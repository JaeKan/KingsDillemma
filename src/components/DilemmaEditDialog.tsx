import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { ValueMentionTextarea, MentionRenderedPreview, hasMentionToken, type MentionPart } from "./MentionUI";
import { resourceCounters, ko } from "../resources/gameResources";
import { TokenIcon } from "./GameIcons";
import { MysteryStickerPicker } from "./MysteryStickerPicker";
import { DilemmaPhotoUploader, dilemmaEditPhotoUploaderCopy, getClipboardImageFiles } from "./DilemmaPhotoUploader";
import type { DilemmaOutcomeEffect, DilemmaEditDraft, PersonalResourceId } from "../types/game";

type DilemmaOutcomeEffectType = DilemmaOutcomeEffect["type"];
type EditableDilemmaOutcomeEffect = DilemmaOutcomeEffect | ({ id: string; type: DilemmaOutcomeEffectType } & Record<string, any>);
type CampaignCardStatus = Extract<DilemmaOutcomeEffect, { type: "story" }>["status"];
type ChroniclePolarity = Extract<DilemmaOutcomeEffect, { type: "chronicle" }>["polarity"];
type KingDeathReason = Extract<DilemmaOutcomeEffect, { type: "king_death" }>["reason"];

const DILEMMA_OUTCOME_NOTE_MAX = 500;
const DILEMMA_EFFECT_TYPES: DilemmaOutcomeEffectType[] = [
  "chronicle",
  "envelope",
  "story",
  "event",
  "mystery",
  "king_death",
  "note",
];
const CAMPAIGN_CARD_STATUSES: CampaignCardStatus[] = ["active", "completed", "archived"];
const CHRONICLE_POLARITIES: ChroniclePolarity[] = ["positive", "negative"];
const KING_DEATH_REASONS: KingDeathReason[] = ["death_symbol", "fifth_card", "card_text"];

interface DilemmaEditDialogProps {
  busy: boolean;
  draft: DilemmaEditDraft;
  isNewDilemma: boolean;
  open: boolean;
  restoreFocusRef: React.RefObject<HTMLElement>;
  onAddPhotos: (files: FileList | File[]) => Promise<void>;
  onCancel: () => void;
  onFieldChange: (field: string, value: any) => void;
  onOutcomeChange: (side: "aye" | "nay", field: string, value: any) => void;
  onRemovePhoto: (id: string) => void;
  onSave: () => void;
  photoBusy: boolean;
  photoError: string | null;
}

function DilemmaEditDialog({
  busy,
  draft,
  isNewDilemma,
  open,
  restoreFocusRef,
  onAddPhotos,
  onCancel,
  onFieldChange,
  onOutcomeChange,
  onRemovePhoto,
  onSave,
  photoBusy,
  photoError,
}: DilemmaEditDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const handlePhotoPaste = useCallback(
    (event: ClipboardEvent) => {
      const imageFiles = getClipboardImageFiles(event.clipboardData);

      if (!imageFiles.length) {
        return;
      }

      event.preventDefault();

      if (busy || photoBusy) {
        return;
      }

      void onAddPhotos(imageFiles);
    },
    [busy, onAddPhotos, photoBusy],
  );

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const focusRestoreEl = restoreFocusRef?.current ?? null;

    const focusFirstInput = window.setTimeout(() => {
      firstInputRef.current?.focus();
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
      window.clearTimeout(focusFirstInput);
      document.removeEventListener("keydown", handleKeyDown);
      window.setTimeout(() => {
        focusRestoreEl?.focus();
      }, 0);
    };
  }, [onCancel, open, restoreFocusRef]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    document.addEventListener("paste", handlePhotoPaste);

    return () => document.removeEventListener("paste", handlePhotoPaste);
  }, [handlePhotoPaste, open]);

  if (!open) {
    return null;
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave();
  };

  return (
    <div className="session-end-overlay" role="presentation">
      <section
        ref={dialogRef}
        className="dilemma-dialog"
        aria-labelledby="dilemma-dialog-title"
        aria-modal="true"
        role="dialog"
      >
        <div className="session-end-heading">
          <span className="session-end-seal" aria-hidden="true">
            <TokenIcon type="scroll" />
          </span>
          <div>
            <p className="section-label">{ko.dilemmaEdit.sharedSection}</p>
            <h2 id="dilemma-dialog-title">{isNewDilemma ? ko.dilemmaEdit.titleNew : ko.dilemmaEdit.titleEdit}</h2>
          </div>
        </div>
        <form className="dilemma-form" onSubmit={submit}>
          <div className="dilemma-dialog-meta">
            <div className="dilemma-dialog-grid compact dilemma-card-title-row">
              <DilemmaInput
                ref={firstInputRef}
                label={ko.dilemmaEdit.labelCardCode}
                value={draft.cardCode}
                onChange={(value) => onFieldChange("cardCode", value)}
                placeholder={ko.dilemmaEdit.phCardCode}
                prefix="No."
                className="dilemma-field-card-code"
              />
              <DilemmaInput
                label={ko.dilemmaEdit.labelTitle}
                value={draft.title}
                onChange={(value) => onFieldChange("title", value)}
                placeholder={ko.dilemmaEdit.phTitle}
              />
            </div>
          </div>
          <MysteryStickerPicker
            value={draft.mysteryStickerId || ""}
            disabled={busy}
            onChange={(id) => onFieldChange("mysteryStickerId", id)}
          />
          <div className="dilemma-dialog-grid">
            <DilemmaMentionTextarea
              label={ko.dilemmaEdit.labelContext}
              value={draft.context}
              onChange={(value) => onFieldChange("context", value)}
              placeholder={ko.dilemmaEdit.phContext}
            />
            <DilemmaMentionTextarea
              label={ko.dilemmaEdit.labelQuestion}
              value={draft.question}
              onChange={(value) => onFieldChange("question", value)}
              placeholder={ko.dilemmaEdit.phQuestion}
            />
          </div>
          <DilemmaMentionTextarea
            label={ko.dilemmaEdit.labelMemo}
            value={draft.councilNotes}
            onChange={(value) => onFieldChange("councilNotes", value)}
            placeholder={ko.dilemmaEdit.phMemo}
          />
          <div className="dilemma-outcome-edit-grid">
            <DilemmaOutcomeEditor
              label={ko.dilemmaEdit.labelAye}
              outcome={draft.aye}
              selected={draft.selectedOutcome === "aye"}
              onChange={(field, value) => onOutcomeChange("aye", field, value)}
            />
            <DilemmaOutcomeEditor
              label={ko.dilemmaEdit.labelNay}
              outcome={draft.nay}
              selected={draft.selectedOutcome === "nay"}
              onChange={(field, value) => onOutcomeChange("nay", field, value)}
            />
          </div>
          <DilemmaPhotoUploader
            busy={busy}
            photoBusy={photoBusy}
            error={photoError}
            photos={draft.photos}
            onAddPhotos={onAddPhotos}
            onRemovePhoto={onRemovePhoto}
            copy={dilemmaEditPhotoUploaderCopy}
          />
          <div className="session-end-actions">
            <button className="ghost-button" type="button" onClick={onCancel} disabled={busy}>
              {ko.common.cancel}
            </button>
            <button className="primary-button" type="submit" disabled={busy}>
              <TokenIcon type="save" />
              {busy ? ko.common.saving : ko.common.save}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

const DilemmaInput = React.forwardRef<
  HTMLInputElement,
  {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    disabled?: boolean;
    prefix?: string;
    className?: string;
  }
>(
  ({ label, value, onChange, placeholder, disabled, prefix, className }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [isFocused, setIsFocused] = useState(false);

    const assignRef = (node: HTMLInputElement | null) => {
      inputRef.current = node;

      if (!ref) {
        return;
      }

      if (typeof ref === "function") {
        ref(node);
      } else {
        ref.current = node;
      }
    };

    return (
      <label className={`dilemma-field ${className ?? ""}`.trim()}>
        <span>{label}</span>
        <div className={`dilemma-field-input-wrap${isFocused ? " focused" : ""}`}>
          {prefix ? (
            <span
              className="dilemma-field-input-prefix"
              aria-hidden="true"
            >
              {prefix}
            </span>
          ) : null}
          <input
            ref={assignRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            className={prefix ? "dilemma-field-input-prefix-input" : undefined}
          />
        </div>
      </label>
    );
  }
);

function DilemmaMentionTextarea({
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

function DilemmaOutcomeEditor({
  label,
  outcome,
  selected,
  onChange,
}: {
  label: string;
  outcome: any;
  selected: boolean;
  onChange: (f: string, v: any) => void;
}) {
  const resourceHeadingId = useId();
  const updateResourcePolarity = (resourceId: PersonalResourceId, polarity: string) => {
    const nextPolarities = { ...(outcome.resourcePolarities || {}) };

    if (polarity === "positive" || polarity === "negative") {
      nextPolarities[resourceId] = polarity;
    } else {
      delete nextPolarities[resourceId];
    }

    onChange("resourcePolarities", nextPolarities);
  };

  return (
    <fieldset className={`dilemma-outcome-editor${selected ? " selected" : ""}`}>
      <legend>{label}</legend>
      <DilemmaMentionTextarea
        label={ko.dilemmaEdit.labelSummary}
        value={outcome.preview}
        onChange={(v) => onChange("preview", v)}
        placeholder={ko.dilemmaEdit.phSummary}
      />
      <div className="dilemma-resource-deltas-edit" aria-labelledby={resourceHeadingId}>
        <p id={resourceHeadingId} className="section-label dilemma-resource-deltas-heading">
          {ko.dilemmaEdit.resourcePolaritySection}
        </p>
        <div className="dilemma-resource-deltas-rows">
          {resourceCounters.map((resource) => (
            <div key={resource.id} className="dilemma-resource-delta-edit-row">
              <div className="dilemma-resource-delta-edit-label">
                <TokenIcon type={resource.icon} />
                <span className="dilemma-resource-delta-edit-name">{resource.label}</span>
              </div>
              <select
                className="dilemma-resource-polarity-select"
                aria-label={`${label} · ${resource.label} · ${ko.dilemmaEdit.resourcePolaritySection}`}
                value={outcome.resourcePolarities?.[resource.id] || ""}
                onChange={(event) => updateResourcePolarity(resource.id as PersonalResourceId, event.target.value)}
              >
                <option value="">{ko.dilemmaEdit.resourcePolarityNone}</option>
                <option value="positive">{ko.dilemmaEdit.resourcePolarityPositive}</option>
                <option value="negative">{ko.dilemmaEdit.resourcePolarityNegative}</option>
              </select>
            </div>
          ))}
        </div>
      </div>
    </fieldset>
  );
}

export function DilemmaOutcomeEffectEditor({
  outcomeLabel,
  effects,
  onChange,
}: {
  outcomeLabel: string;
  effects: EditableDilemmaOutcomeEffect[];
  onChange: (effects: EditableDilemmaOutcomeEffect[]) => void;
}) {
  const headingId = useId();
  const [nextType, setNextType] = useState<DilemmaOutcomeEffectType>("chronicle");

  const updateEffect = (index: number, patch: Record<string, any>) => {
    onChange(effects.map((effect, effectIndex) => effectIndex === index ? { ...effect, ...patch } : effect));
  };

  const replaceEffect = (index: number, nextEffect: EditableDilemmaOutcomeEffect) => {
    onChange(effects.map((effect, effectIndex) => effectIndex === index ? nextEffect : effect));
  };

  const moveEffect = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= effects.length) {
      return;
    }

    const nextEffects = [...effects];
    const [effect] = nextEffects.splice(index, 1);
    nextEffects.splice(targetIndex, 0, effect);
    onChange(nextEffects);
  };

  const removeEffect = (index: number) => {
    onChange(effects.filter((_, effectIndex) => effectIndex !== index));
  };

  return (
    <section className="dilemma-outcome-effects-edit" aria-labelledby={headingId}>
      <div className="dilemma-outcome-effects-head">
        <p id={headingId} className="section-label dilemma-outcome-effects-heading">
          {ko.dilemmaEdit.effectSection}
        </p>
        <div className="dilemma-outcome-effects-add">
          <label>
            <span className="visually-hidden">{ko.dilemmaEdit.effectType}</span>
            <select value={nextType} onChange={(event) => setNextType(event.target.value as DilemmaOutcomeEffectType)}>
              {DILEMMA_EFFECT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ko.dilemmaEdit.effectTypeLabels[type]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="ghost-button compact-button"
            onClick={() => onChange([...effects, createDefaultDilemmaOutcomeEffect(nextType)])}
          >
            {ko.dilemmaEdit.effectAdd}
          </button>
        </div>
      </div>
      {effects.length ? (
        <ol className="dilemma-outcome-effects-list">
          {effects.map((effect, index) => {
            const effectTypeLabel = ko.dilemmaEdit.effectTypeLabels[effect.type];
            const effectPositionLabel = `${outcomeLabel} · ${index + 1} · ${effectTypeLabel}`;

            return (
              <li key={effect.id || index} className="dilemma-outcome-effect-row">
                <div className="dilemma-outcome-effect-order" aria-label={effectPositionLabel}>
                  <span>{index + 1}</span>
                  <button
                    type="button"
                    className="ghost-button icon-button"
                    disabled={index === 0}
                    onClick={() => moveEffect(index, -1)}
                    aria-label={`${effectPositionLabel} · ${ko.dilemmaEdit.effectMoveUp}`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="ghost-button icon-button"
                    disabled={index === effects.length - 1}
                    onClick={() => moveEffect(index, 1)}
                    aria-label={`${effectPositionLabel} · ${ko.dilemmaEdit.effectMoveDown}`}
                  >
                    ↓
                  </button>
                </div>
                <div className="dilemma-outcome-effect-body">
                  <label className="dilemma-effect-field dilemma-effect-type-field">
                    <span>{ko.dilemmaEdit.effectType}</span>
                    <select
                      value={effect.type}
                      onChange={(event) =>
                        replaceEffect(index, createDefaultDilemmaOutcomeEffect(event.target.value as DilemmaOutcomeEffectType, effect.id))
                      }
                    >
                      {DILEMMA_EFFECT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {ko.dilemmaEdit.effectTypeLabels[type]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <DilemmaOutcomeEffectFields effect={effect} onChange={(patch) => updateEffect(index, patch)} />
                </div>
                <button
                  type="button"
                  className="ghost-button icon-button danger-button dilemma-outcome-effect-remove"
                  onClick={() => removeEffect(index)}
                  aria-label={`${effectPositionLabel} · ${ko.common.delete}`}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="dilemma-outcome-effects-empty">{ko.dilemmaEdit.effectEmpty}</p>
      )}
    </section>
  );
}

function DilemmaOutcomeEffectFields({
  effect,
  onChange,
}: {
  effect: EditableDilemmaOutcomeEffect;
  onChange: (patch: Record<string, any>) => void;
}) {
  if (effect.type === "resource") {
    return (
      <>
        <DilemmaResourceSelect value={effect.resourceId} onChange={(resourceId) => onChange({ resourceId })} />
        <label className="dilemma-effect-field">
          <span>{ko.dilemmaEdit.effectAmount}</span>
          <input
            type="number"
            value={effect.amount ?? 0}
            onChange={(event) => onChange({ amount: parseEffectInteger(event.target.value) })}
          />
        </label>
      </>
    );
  }

  if (effect.type === "chronicle") {
    return (
      <>
        <DilemmaResourceSelect value={effect.resourceId} onChange={(resourceId) => onChange({ resourceId })} />
        <label className="dilemma-effect-field">
          <span>{ko.dilemmaEdit.effectPolarity}</span>
          <select value={effect.polarity || "positive"} onChange={(event) => onChange({ polarity: event.target.value })}>
            {CHRONICLE_POLARITIES.map((polarity) => (
              <option key={polarity} value={polarity}>
                {ko.dilemmaEdit.effectPolarityLabels[polarity]}
              </option>
            ))}
          </select>
        </label>
        <label className="dilemma-effect-field">
          <span>{ko.dilemmaEdit.effectStickerCode}</span>
          <input value={effect.stickerCode || ""} onChange={(event) => onChange({ stickerCode: event.target.value })} />
        </label>
      </>
    );
  }

  if (effect.type === "envelope") {
    return (
      <label className="dilemma-effect-field">
        <span>{ko.dilemmaEdit.effectEnvelopeCode}</span>
        <input value={effect.envelopeCode || ""} onChange={(event) => onChange({ envelopeCode: event.target.value })} />
      </label>
    );
  }

  if (effect.type === "story" || effect.type === "event") {
    return (
      <>
        <label className="dilemma-effect-field">
          <span>{ko.dilemmaEdit.effectCardCode}</span>
          <input value={effect.cardCode || ""} onChange={(event) => onChange({ cardCode: event.target.value })} />
        </label>
        <label className="dilemma-effect-field">
          <span>{ko.dilemmaEdit.effectStatus}</span>
          <select value={effect.status || "active"} onChange={(event) => onChange({ status: event.target.value })}>
            {CAMPAIGN_CARD_STATUSES.map((status) => (
              <option key={status} value={status}>
                {ko.dilemmaEdit.effectStatusLabels[status]}
              </option>
            ))}
          </select>
        </label>
      </>
    );
  }

  if (effect.type === "mystery") {
    return (
      <>
        <label className="dilemma-effect-field">
          <span>{ko.dilemmaEdit.effectDossierLetter}</span>
          <input value={effect.dossierLetter || ""} onChange={(event) => onChange({ dossierLetter: event.target.value })} />
        </label>
        <label className="dilemma-effect-field">
          <span>{ko.dilemmaEdit.effectStorylineSymbol}</span>
          <input value={effect.storylineSymbol || ""} onChange={(event) => onChange({ storylineSymbol: event.target.value })} />
        </label>
        <label className="dilemma-effect-field">
          <span>{ko.dilemmaEdit.effectSlotKey}</span>
          <input value={effect.slotKey || ""} onChange={(event) => onChange({ slotKey: event.target.value })} />
        </label>
      </>
    );
  }

  if (effect.type === "king_death") {
    return (
      <label className="dilemma-effect-field">
        <span>{ko.dilemmaEdit.effectKingDeathReason}</span>
        <select value={effect.reason || "death_symbol"} onChange={(event) => onChange({ reason: event.target.value })}>
          {KING_DEATH_REASONS.map((reason) => (
            <option key={reason} value={reason}>
              {ko.dilemmaEdit.effectKingDeathReasonLabels[reason]}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="dilemma-effect-field dilemma-effect-note-field">
      <span>{ko.dilemmaEdit.effectNoteText}</span>
      <textarea
        maxLength={DILEMMA_OUTCOME_NOTE_MAX}
        value={effect.text || ""}
        placeholder={ko.dilemmaEdit.effectNotePlaceholder}
        onChange={(event) => onChange({ text: event.target.value.slice(0, DILEMMA_OUTCOME_NOTE_MAX) })}
      />
    </label>
  );
}

function DilemmaResourceSelect({
  value,
  onChange,
}: {
  value: PersonalResourceId | undefined;
  onChange: (resourceId: PersonalResourceId) => void;
}) {
  return (
    <label className="dilemma-effect-field">
      <span>{ko.dilemmaEdit.effectResource}</span>
      <select value={value || getDefaultResourceId()} onChange={(event) => onChange(event.target.value as PersonalResourceId)}>
        {resourceCounters.map((resource) => (
          <option key={resource.id} value={resource.id}>
            {resource.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function getEditableDilemmaOutcomeEffects(outcome: any): EditableDilemmaOutcomeEffect[] {
  if (Array.isArray(outcome?.effects) && outcome.effects.length) {
    return outcome.effects.filter((effect) => effect?.type !== "resource");
  }

  return [];
}

function createDefaultDilemmaOutcomeEffect(
  type: DilemmaOutcomeEffectType,
  id = createDilemmaOutcomeEffectId(),
): EditableDilemmaOutcomeEffect {
  if (type === "resource") {
    return { id, type, resourceId: getDefaultResourceId(), amount: 1 };
  }

  if (type === "chronicle") {
    return { id, type, resourceId: getDefaultResourceId(), polarity: "positive", stickerCode: "" };
  }

  if (type === "envelope") {
    return { id, type, envelopeCode: "" };
  }

  if (type === "story" || type === "event") {
    return { id, type, cardCode: "", status: "active" };
  }

  if (type === "mystery") {
    return { id, type, dossierLetter: "", storylineSymbol: "", slotKey: "" };
  }

  if (type === "king_death") {
    return { id, type, reason: "death_symbol" };
  }

  return { id, type, text: "" };
}

function createDilemmaOutcomeEffectId(): string {
  return `effect-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getDefaultResourceId(): PersonalResourceId {
  return resourceCounters[0].id as PersonalResourceId;
}

function parseEffectInteger(value: string): number {
  const number = parseInt(value, 10);
  return Number.isFinite(number) ? number : 0;
}

export default DilemmaEditDialog;
