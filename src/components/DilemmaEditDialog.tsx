import React, { useCallback, useEffect, useId, useRef } from "react";
import { ValueMentionTextarea, MentionRenderedPreview, hasMentionToken, type MentionPart } from "./MentionUI";
import { 
  normalizeDilemmaOutcome,
  dilemmaResourceDeltasHaveValues
} from "../utils/dilemma-helpers";
import { dilemmaPhotoLimit, resourceCounters, ko } from "../resources/gameResources";
import { TokenIcon } from "./GameIcons";
import { DilemmaResourceDeltaPreview } from "./DilemmaUI";
import { DilemmaPhoto, DilemmaEditDraft } from "../types/game";
import { MysteryStickerPicker } from "./MysteryStickerPicker";

function getClipboardImageFiles(clipboardData: DataTransfer | null): File[] {
  if (!clipboardData) {
    return [];
  }

  const itemFiles = Array.from(clipboardData.items || [])
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file));

  if (itemFiles.length) {
    return itemFiles;
  }

  return Array.from(clipboardData.files || []).filter((file) => file.type.startsWith("image/"));
}

interface DilemmaPhotoEditorProps {
  busy: boolean;
  error: string | null;
  photos: DilemmaPhoto[];
  onAddPhotos: (files: FileList | File[]) => Promise<void>;
  onRemovePhoto: (id: string) => void;
}

function DilemmaPhotoEditor({ busy, error, photos, onAddPhotos, onRemovePhoto }: DilemmaPhotoEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const remaining = Math.max(dilemmaPhotoLimit - photos.length, 0);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    void onAddPhotos(files).finally(() => {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    });
  };

  return (
    <section className="dilemma-photo-editor" aria-labelledby="dilemma-photo-title">
      <div className="dilemma-photo-editor-head">
        <div>
          <h3 id="dilemma-photo-title">{ko.dilemmaEdit.photoSectionTitle}</h3>
          <p>{ko.dilemmaEdit.photoHelp}</p>
        </div>
        <label className={`ghost-button dilemma-photo-add${remaining <= 0 ? " disabled" : ""}`}>
          <TokenIcon type="photo" />
          <span>{ko.dilemmaEdit.photoAttach}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            disabled={busy || remaining <= 0}
          />
        </label>
      </div>
      {photos.length ? (
        <div className="dilemma-photo-editor-grid">
          {photos.map((photo) => (
            <figure key={photo.id} className="dilemma-photo-editor-item">
              <img src={photo.dataUrl} alt={photo.name || ko.dilemmaEdit.photoAlt} />
              <figcaption>{photo.name || ko.dilemmaEdit.photoAlt}</figcaption>
              <button type="button" className="stepper-button" onClick={() => onRemovePhoto(photo.id)} disabled={busy}>
                <TokenIcon type="trash" />
              </button>
            </figure>
          ))}
        </div>
      ) : (
        <p className="dilemma-photo-empty">{ko.dilemmaEdit.photoEmpty}</p>
      )}
      <p className="dilemma-photo-limit">
        {ko.dilemmaEdit.photoLimitsCaption(photos.length, dilemmaPhotoLimit)}
      </p>
      {error ? <p className="dilemma-photo-error" role="alert">{error}</p> : null}
    </section>
  );
}

interface DilemmaOutcomeSelectorProps {
  value: string;
  aye: any;
  nay: any;
  disabled?: boolean;
  disabledReason?: string;
  onChange: (value: string) => void;
}

function DilemmaOutcomeSelector({ value, aye, nay, disabled = false, disabledReason = "", onChange }: DilemmaOutcomeSelectorProps) {
  const options = [
    {
      value: "",
      title: ko.dilemmaEdit.undecidedTitle,
      meta: ko.dilemmaEdit.noResultMeta,
      icon: "turn",
      deltas: {},
    },
    {
      value: "aye",
      title: ko.dilemmaEdit.ayeResultTitle,
      meta: ko.dilemmaEdit.ayeResultMeta,
      icon: "plus",
      deltas: normalizeDilemmaOutcome(aye).resourceDeltas,
    },
    {
      value: "nay",
      title: ko.dilemmaEdit.nayResultTitle,
      meta: ko.dilemmaEdit.nayResultMeta,
      icon: "minus",
      deltas: normalizeDilemmaOutcome(nay).resourceDeltas,
    },
  ];

  return (
    <fieldset className={`dilemma-outcome-selector${disabled ? " disabled" : ""}`}>
      <legend>{ko.dilemmaEdit.outcomeLegend}</legend>
      {disabled ? <p className="dilemma-outcome-selector-note">{disabledReason}</p> : null}
      <div className="dilemma-outcome-selector-grid">
        {options.map((option) => {
          const checked = value === option.value;
          const hasDeltas = dilemmaResourceDeltasHaveValues(option.deltas);

          return (
            <label className={`dilemma-outcome-choice${checked ? " selected" : ""}`} key={option.value || "pending"}>
              <input
                type="radio"
                name="selectedOutcome"
                value={option.value}
                checked={checked}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
              />
              <span className="dilemma-outcome-choice-mark" aria-hidden="true">
                <TokenIcon type={option.icon} />
              </span>
              <span className="dilemma-outcome-choice-copy">
                <strong>{option.title}</strong>
                <small>{option.meta}</small>
              </span>
              {hasDeltas ? (
                <DilemmaResourceDeltaPreview deltas={option.deltas} />
              ) : (
                <span className="dilemma-outcome-choice-empty">{option.value ? ko.dilemmaEdit.unchanged : ko.dilemmaEdit.waiting}</span>
              )}
              {checked ? <span className="dilemma-outcome-choice-badge">{ko.dilemmaEdit.outcomePickedBadge}</span> : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

interface DilemmaEditDialogProps {
  busy: boolean;
  draft: DilemmaEditDraft;
  isNewDilemma: boolean;
  open: boolean;
  resolutionDisabled: boolean;
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
  resolutionDisabled,
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
          <div className="dilemma-dialog-grid compact">
            <DilemmaInput
              ref={firstInputRef}
              label={ko.dilemmaEdit.labelCardCode}
              value={draft.cardCode}
              onChange={(value) => onFieldChange("cardCode", value)}
              placeholder={ko.dilemmaEdit.phCardCode}
            />
            <DilemmaInput
              label={ko.dilemmaEdit.labelTitle}
              value={draft.title}
              onChange={(value) => onFieldChange("title", value)}
              placeholder={ko.dilemmaEdit.phTitle}
            />
            <DilemmaInput
              label={ko.dilemmaEdit.labelSlot}
              value={draft.timeCounterSlot}
              onChange={(value) => onFieldChange("timeCounterSlot", value)}
              placeholder={ko.dilemmaEdit.phSlot}
            />
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
          <DilemmaOutcomeSelector
            value={draft.selectedOutcome}
            aye={draft.aye}
            nay={draft.nay}
            disabled={resolutionDisabled}
            disabledReason={ko.dilemmaEdit.outcomeDisabled}
            onChange={(value) => onFieldChange("selectedOutcome", value)}
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
          <DilemmaMentionTextarea
            label={ko.dilemmaEdit.labelResolution}
            value={draft.resolutionNotes}
            onChange={(value) => onFieldChange("resolutionNotes", value)}
            placeholder={resolutionDisabled ? ko.dilemmaEdit.phResolutionLocked : ko.dilemmaEdit.phResolution}
            disabled={resolutionDisabled}
          />
          <DilemmaPhotoEditor
            busy={busy || photoBusy}
            error={photoError}
            photos={draft.photos}
            onAddPhotos={onAddPhotos}
            onRemovePhoto={onRemovePhoto}
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

const DilemmaInput = React.forwardRef<HTMLInputElement, { label: string; value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }>(
  ({ label, value, onChange, placeholder, disabled }, ref) => (
    <label className="dilemma-field">
      <span>{label}</span>
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </label>
  )
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

  return (
    <fieldset className={`dilemma-outcome-editor${selected ? " selected" : ""}`}>
      <legend>{label}</legend>
      <DilemmaMentionTextarea
        label={ko.dilemmaEdit.labelSummary}
        value={outcome.preview}
        onChange={(v) => onChange("preview", v)}
        placeholder={ko.dilemmaEdit.phSummary}
      />
      <DilemmaMentionTextarea
        label={ko.dilemmaEdit.labelOutcomeShort}
        value={outcome.result}
        onChange={(v) => onChange("result", v)}
        placeholder={ko.dilemmaEdit.phOutcome}
      />
      <div className="dilemma-resource-deltas-edit" aria-labelledby={resourceHeadingId}>
        <p id={resourceHeadingId} className="section-label dilemma-resource-deltas-heading">
          {ko.dilemmaEdit.resourceDeltaSection}
        </p>
        <div className="dilemma-resource-deltas-rows">
          {resourceCounters.map((resource) => (
            <div key={resource.id} className="dilemma-resource-delta-edit-row">
              <div className="dilemma-resource-delta-edit-label">
                <TokenIcon type={resource.icon} />
                <span className="dilemma-resource-delta-edit-name">{resource.label}</span>
              </div>
              <input
                className="dilemma-resource-delta-edit-input"
                type="number"
                aria-label={`${label} · ${resource.label} · ${ko.dilemmaEdit.resourceDeltaSection}`}
                value={outcome.resourceDeltas[resource.id] || 0}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  onChange("resourceDeltas", { ...outcome.resourceDeltas, [resource.id]: isNaN(val) ? 0 : val });
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </fieldset>
  );
}

export default DilemmaEditDialog;
