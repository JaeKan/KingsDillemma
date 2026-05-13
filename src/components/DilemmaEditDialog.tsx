import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ValueMentionTextarea, MentionRenderedPreview, hasMentionToken, type MentionPart } from "./MentionUI";
import { dilemmaPhotoLimit, dilemmaResultMarkers, resourceCounters, ko } from "../resources/gameResources";
import { TokenIcon } from "./GameIcons";
import { MysteryStickerPicker } from "./MysteryStickerPicker";
import { DilemmaPhotoUploader, dilemmaEditPhotoUploaderCopy, getClipboardImageFiles } from "./DilemmaPhotoUploader";
import { createRecordPhotoAttachments } from "../utils/photo-attachments";
import type { DilemmaOutcomeEffect, DilemmaEditDraft, DilemmaResultMarkerId, PersonalResourceId } from "../types/game";

type DilemmaOutcomeEffectType = DilemmaOutcomeEffect["type"];
type EditableDilemmaOutcomeEffect = DilemmaOutcomeEffect | ({ id: string; type: DilemmaOutcomeEffectType } & Record<string, any>);
type CampaignCardStatus = Extract<DilemmaOutcomeEffect, { type: "story" }>["status"];
type ChroniclePolarity = Extract<DilemmaOutcomeEffect, { type: "chronicle" }>["polarity"];

const DILEMMA_OUTCOME_NOTE_MAX = 500;
const DILEMMA_EFFECT_TYPES: DilemmaOutcomeEffectType[] = [
  "chronicle",
  "envelope",
  "story",
  "event",
  "mystery",
];
const CAMPAIGN_CARD_STATUSES: CampaignCardStatus[] = ["active", "completed", "archived"];
const CHRONICLE_POLARITIES: ChroniclePolarity[] = ["positive", "negative"];

function getDilemmaEffectTypeOptions(currentType?: DilemmaOutcomeEffectType): DilemmaOutcomeEffectType[] {
  return currentType && !DILEMMA_EFFECT_TYPES.includes(currentType)
    ? [...DILEMMA_EFFECT_TYPES, currentType]
    : DILEMMA_EFFECT_TYPES;
}

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
                className="dilemma-field-card-code"
              />
              <MysteryStickerPicker
                value={draft.mysteryStickerId || ""}
                disabled={busy}
                onChange={(id) => onFieldChange("mysteryStickerId", id)}
              />
            </div>
          </div>
          <DilemmaMentionTextarea
            label={ko.dilemmaEdit.labelContext}
            value={draft.context}
            onChange={(value) => onFieldChange("context", value)}
            placeholder={ko.dilemmaEdit.phContext}
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
  const updateResultMarker = (markerId: DilemmaResultMarkerId, polarity: string) => {
    const nextPolarities = { ...(outcome.resourcePolarities || {}) };

    if (polarity === "positive" || polarity === "negative") {
      nextPolarities[markerId] = polarity;
    } else {
      delete nextPolarities[markerId];
    }

    onChange("resourcePolarities", nextPolarities);
  };

  return (
    <fieldset className={`dilemma-outcome-editor${selected ? " selected" : ""}`}>
      <legend>{label}</legend>
      <div className="dilemma-resource-deltas-edit dilemma-resource-deltas-edit--compact" aria-labelledby={resourceHeadingId}>
        <p id={resourceHeadingId} className="section-label dilemma-resource-deltas-heading">
          {ko.dilemmaEdit.resourcePolaritySection}
        </p>
        <div className="dilemma-resource-deltas-rows dilemma-resource-deltas-rows--compact dilemma-resource-deltas-rows--markers">
          {dilemmaResultMarkers.map((marker) => (
            <div
              key={marker.id}
              className="dilemma-resource-delta-edit-row dilemma-resource-delta-edit-row--compact dilemma-resource-delta-edit-row--marker"
            >
              <div className="dilemma-resource-delta-edit-label">
                <TokenIcon type={marker.icon} />
                <span className="dilemma-resource-delta-edit-name">{marker.label}</span>
              </div>
              <select
                className="dilemma-resource-polarity-select"
                aria-label={`${label} · ${marker.label} · ${ko.dilemmaEdit.resourcePolaritySection}`}
                value={outcome.resourcePolarities?.[marker.id] || ""}
                onChange={(event) => updateResultMarker(marker.id as DilemmaResultMarkerId, event.target.value)}
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
  houses = [],
  onChange,
  onOpenEffectHelp,
}: {
  outcomeLabel: string;
  effects: EditableDilemmaOutcomeEffect[];
  houses?: any[];
  onChange: (effects: EditableDilemmaOutcomeEffect[]) => void;
  onOpenEffectHelp?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const headingId = useId();
  const [nextType, setNextType] = useState<DilemmaOutcomeEffectType>("chronicle");
  const effectIds = effects.map((effect, index) => getEffectSortableId(effect, index));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const updateEffect = (index: number, patch: Record<string, any>) => {
    onChange(effects.map((effect, effectIndex) => effectIndex === index ? { ...effect, ...patch } : effect));
  };

  const replaceEffect = (index: number, nextEffect: EditableDilemmaOutcomeEffect) => {
    onChange(effects.map((effect, effectIndex) => effectIndex === index ? nextEffect : effect));
  };

  const reorderEffects = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = effectIds.indexOf(String(active.id));
    const nextIndex = effectIds.indexOf(String(over.id));

    if (oldIndex < 0 || nextIndex < 0) {
      return;
    }

    onChange(arrayMove(effects, oldIndex, nextIndex));
  };

  const removeEffect = (index: number) => {
    onChange(effects.filter((_, effectIndex) => effectIndex !== index));
  };

  return (
    <section className="dilemma-outcome-effects-edit" aria-labelledby={headingId}>
      <div className="dilemma-outcome-effects-head">
        <div className="dilemma-outcome-effects-title">
          <p id={headingId} className="section-label dilemma-outcome-effects-heading">
            {ko.dilemmaEdit.effectSection}
          </p>
          {onOpenEffectHelp ? (
            <button
              className="agenda-score-help-button dilemma-outcome-effects-help-button"
              type="button"
              aria-label={ko.dilemmaEdit.effectGuideOpenAria}
              onClick={onOpenEffectHelp}
            >
              <TokenIcon type="help" />
              {ko.dilemmaEdit.effectGuideTitle}
            </button>
          ) : null}
        </div>
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
            <TokenIcon type="plus" />
            {ko.dilemmaEdit.effectAdd}
          </button>
        </div>
      </div>
      {effects.length ? (
        <DndContext collisionDetection={closestCenter} sensors={sensors} onDragEnd={reorderEffects}>
          <SortableContext items={effectIds} strategy={verticalListSortingStrategy}>
            <ol className="dilemma-outcome-effects-list">
              {effects.map((effect, index) => {
                const effectTypeLabel = ko.dilemmaEdit.effectTypeLabels[effect.type];
                const effectPositionLabel = `${outcomeLabel} · ${effectTypeLabel}`;
                const sortableId = getEffectSortableId(effect, index);

                return (
                  <SortableDilemmaOutcomeEffectRow
                    effect={effect}
                    effectPositionLabel={effectPositionLabel}
                    houses={houses}
                    key={sortableId}
                    onRemove={() => removeEffect(index)}
                    onReplace={(nextEffect) => replaceEffect(index, nextEffect)}
                    onUpdate={(patch) => updateEffect(index, patch)}
                    sortableId={sortableId}
                  />
                );
              })}
            </ol>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="dilemma-outcome-effects-empty">{ko.dilemmaEdit.effectEmpty}</p>
      )}
    </section>
  );
}

function SortableDilemmaOutcomeEffectRow({
  effect,
  effectPositionLabel,
  houses,
  onRemove,
  onReplace,
  onUpdate,
  sortableId,
}: {
  effect: EditableDilemmaOutcomeEffect;
  effectPositionLabel: string;
  houses: any[];
  onRemove: () => void;
  onReplace: (nextEffect: EditableDilemmaOutcomeEffect) => void;
  onUpdate: (patch: Record<string, any>) => void;
  sortableId: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sortableId });
  const rowStyle = {
    transform: formatSortableTransform(transform),
    transition,
  } as React.CSSProperties;

  return (
    <li
      ref={setNodeRef}
      className={`dilemma-outcome-effect-row${isDragging ? " is-dragging" : ""}`}
      style={rowStyle}
    >
      <div className="dilemma-outcome-effect-body">
        <div className="dilemma-outcome-effect-toolbar">
          <button
            type="button"
            className="ghost-button icon-button dilemma-outcome-effect-drag-handle"
            aria-label={`${effectPositionLabel} · ${ko.dilemmaEdit.effectDragHandle}`}
            {...attributes}
            {...listeners}
          >
            <TokenIcon type="drag" />
          </button>
          <label className="dilemma-effect-field dilemma-effect-type-field">
            <span className="visually-hidden">{ko.dilemmaEdit.effectType}</span>
            <select
              aria-label={ko.dilemmaEdit.effectType}
              value={effect.type}
              onChange={(event) =>
                onReplace(createDefaultDilemmaOutcomeEffect(event.target.value as DilemmaOutcomeEffectType, effect.id))
              }
            >
              {getDilemmaEffectTypeOptions(effect.type).map((type) => (
                <option key={type} value={type}>
                  {ko.dilemmaEdit.effectTypeLabels[type]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="ghost-button icon-button danger-button dilemma-outcome-effect-remove"
            onClick={onRemove}
            aria-label={`${effectPositionLabel} · ${ko.common.delete}`}
          >
            <TokenIcon type="trash" />
          </button>
        </div>
        <div className="dilemma-outcome-effect-fields">
          <DilemmaOutcomeEffectFields effect={effect} houses={houses} onChange={onUpdate} />
        </div>
        <DilemmaOutcomeEffectPhotoEditor effect={effect} onChange={onUpdate} />
      </div>
    </li>
  );
}

function DilemmaOutcomeEffectPhotoEditor({
  effect,
  onChange,
}: {
  effect: EditableDilemmaOutcomeEffect;
  onChange: (patch: Record<string, any>) => void;
}) {
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photos = Array.isArray(effect.photos) ? effect.photos : [];
  const remaining = Math.max(dilemmaPhotoLimit - photos.length, 0);
  const disabled = photoBusy || remaining <= 0;

  const addPhotos = async (files: FileList | File[]) => {
    if (!files.length || disabled) {
      return;
    }

    setPhotoBusy(true);
    setPhotoError(null);

    try {
      const nextPhotos = await createRecordPhotoAttachments(files, dilemmaPhotoLimit - photos.length);
      onChange({ photos: [...photos, ...nextPhotos] });
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : ko.dilemmaHelpers.photoErrors.processFail);
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (!files) {
      return;
    }

    void addPhotos(files).finally(() => {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    });
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const files = getClipboardImageFiles(event.clipboardData);

    if (!files.length) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    void addPhotos(files);
  };

  return (
    <div className="dilemma-outcome-effect-photo-editor" onPaste={handlePaste}>
      <label className={`ghost-button dilemma-outcome-effect-photo-add${disabled ? " disabled" : ""}`}>
        <TokenIcon type="photo" />
        <span>{ko.dilemmaEdit.photoAttach}</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          disabled={disabled}
        />
      </label>
      {photos.length ? (
        <div className="dilemma-outcome-effect-photo-strip" aria-label={ko.dilemmaEdit.photoAttach}>
          {photos.map((photo) => (
            <figure className="dilemma-outcome-effect-photo-thumb" key={photo.id} title={photo.name || ko.dilemmaEdit.effectPhotoAlt}>
              <img src={photo.dataUrl} alt={photo.name || ko.dilemmaEdit.effectPhotoAlt} />
              <button
                type="button"
                className="stepper-button"
                onClick={() => onChange({ photos: photos.filter((entry) => entry.id !== photo.id) })}
                disabled={photoBusy}
                aria-label={`${photo.name || ko.dilemmaEdit.effectPhotoAlt} · ${ko.common.delete}`}
              >
                <TokenIcon type="trash" />
              </button>
            </figure>
          ))}
        </div>
      ) : null}
      {photoError ? (
        <p className="dilemma-outcome-effect-photo-error" role="alert">
          {photoError}
        </p>
      ) : null}
    </div>
  );
}

function DilemmaOutcomeEffectFields({
  effect,
  houses = [],
  onChange,
}: {
  effect: EditableDilemmaOutcomeEffect;
  houses?: any[];
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
            placeholder={ko.dilemmaEdit.effectAmountPlaceholder}
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
          <input
            value={effect.stickerCode || ""}
            placeholder={ko.dilemmaEdit.effectStickerCodePlaceholder}
            onChange={(event) => onChange({ stickerCode: event.target.value })}
          />
        </label>
        <DilemmaEffectSignerSelect
          houses={houses}
          value={effect.signedByHouseId || ""}
          onChange={(houseId) =>
            onChange({
              signedByHouseId: houseId,
              signedByName: houseId ? getDilemmaEffectHouseName(houses, houseId) : "",
            })
          }
        />
      </>
    );
  }

  if (effect.type === "envelope") {
    return (
      <label className="dilemma-effect-field">
        <span>{ko.dilemmaEdit.effectEnvelopeCode}</span>
        <input
          value={effect.envelopeCode || ""}
          placeholder={ko.dilemmaEdit.effectEnvelopeCodePlaceholder}
          onChange={(event) => onChange({ envelopeCode: event.target.value })}
        />
      </label>
    );
  }

  if (effect.type === "story" || effect.type === "event") {
    return (
      <>
        <label className="dilemma-effect-field">
          <span>{ko.dilemmaEdit.effectCardCode}</span>
          <input
            value={effect.cardCode || ""}
            placeholder={
              effect.type === "story"
                ? ko.dilemmaEdit.effectStoryCardCodePlaceholder
                : ko.dilemmaEdit.effectEventCardCodePlaceholder
            }
            onChange={(event) => onChange({ cardCode: event.target.value })}
          />
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
        {effect.type === "story" ? (
          <>
            <DilemmaEffectSignerSelect
              houses={houses}
              value={effect.signedByHouseId || ""}
              onChange={(houseId) =>
                onChange({
                  signedByHouseId: houseId,
                  signedByName: houseId ? getDilemmaEffectHouseName(houses, houseId) : "",
                })
              }
            />
            <DilemmaEffectMentionTextarea
              label={ko.dilemmaEdit.effectSignerBonus}
              value={effect.signerBonusText || ""}
              placeholder={ko.dilemmaEdit.effectSignerBonusPlaceholder}
              onChange={(signerBonusText) => onChange({ signerBonusText })}
            />
          </>
        ) : null}
      </>
    );
  }

  if (effect.type === "mystery") {
    return (
      <>
        <label className="dilemma-effect-field">
          <span>{ko.dilemmaEdit.effectDossierLetter}</span>
          <input
            value={effect.dossierLetter || ""}
            placeholder={ko.dilemmaEdit.effectDossierLetterPlaceholder}
            onChange={(event) => onChange({ dossierLetter: event.target.value })}
          />
        </label>
        <MysteryStickerPicker
          value={effect.storylineSymbol || ""}
          label={ko.dilemmaEdit.effectStorylineSymbol}
          ariaLabel={ko.dilemmaEdit.effectStorylineSymbolAria}
          className="dilemma-effect-storyline-picker"
          onChange={(storylineSymbol) => onChange({ storylineSymbol })}
        />
        <label className="dilemma-effect-field">
          <span>{ko.dilemmaEdit.effectSlotKey}</span>
          <input
            value={effect.slotKey || ""}
            placeholder={ko.dilemmaEdit.effectSlotKeyPlaceholder}
            onChange={(event) => onChange({ slotKey: event.target.value })}
          />
        </label>
      </>
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

function DilemmaEffectSignerSelect({
  houses,
  value,
  onChange,
}: {
  houses: any[];
  value: string;
  onChange: (houseId: string) => void;
}) {
  return (
    <label className="dilemma-effect-field">
      <span>{ko.dilemmaEdit.effectSignerHouse}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{ko.dilemmaEdit.effectSignerNone}</option>
        {houses.map((house) => (
          <option key={house.id} value={house.id}>
            {getDilemmaEffectHouseName(houses, house.id)}
          </option>
        ))}
      </select>
    </label>
  );
}

function DilemmaEffectMentionTextarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
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
    <label className="dilemma-effect-field dilemma-effect-mention-field">
      <span>{label}</span>
      <ValueMentionTextarea
        ref={fieldRef}
        value={raw}
        maxLength={DILEMMA_OUTCOME_NOTE_MAX}
        onChange={(event) => onChange((event.target as HTMLTextAreaElement).value.slice(0, DILEMMA_OUTCOME_NOTE_MAX))}
        placeholder={placeholder}
      />
      <MentionRenderedPreview
        text={raw}
        wrapperClassName="dilemma-effect-mention-preview"
        tokenViewClassName="dilemma-mention-token-preview"
        onTokenClick={hasMentionToken(raw) ? focusMentionToken : undefined}
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
    return type === "story"
      ? { id, type, cardCode: "", status: "active", signedByHouseId: "", signedByName: "", signerBonusText: "" }
      : { id, type, cardCode: "", status: "active" };
  }

  if (type === "mystery") {
    return { id, type, dossierLetter: "", storylineSymbol: "", slotKey: "" };
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

function getEffectSortableId(effect: EditableDilemmaOutcomeEffect, index: number): string {
  return effect.id || `effect-${index}`;
}

function formatSortableTransform(transform: { x: number; y: number; scaleX?: number; scaleY?: number } | null): string | undefined {
  if (!transform) {
    return undefined;
  }

  const scaleX = transform.scaleX ?? 1;
  const scaleY = transform.scaleY ?? 1;
  return `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0) scaleX(${scaleX}) scaleY(${scaleY})`;
}

function getDilemmaEffectHouseName(houses: any[], houseId: string): string {
  const house = houses.find((entry) => entry?.id === houseId);

  return house?.koreanTitle || house?.name || house?.englishName || houseId;
}

export default DilemmaEditDialog;
