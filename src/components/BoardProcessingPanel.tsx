import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resourceCounters, ko } from "../resources/gameResources";
import type {
  BoardProcessingHistory,
  BoardProcessingItem,
  BoardProcessingItemType,
  BoardProcessingPolarity,
  CampaignCardStatus,
  HouseId,
  PersonalResourceId,
  RecordAttachment,
  RedactedHouse,
} from "../types/game";
import { TokenIcon } from "./GameIcons";

type BoardProcessingDraft = {
  type: BoardProcessingItemType;
  resourceId: PersonalResourceId;
  polarity: BoardProcessingPolarity;
  stickerCode: string;
  envelopeCode: string;
  cardCode: string;
  status: CampaignCardStatus;
  dossierLetter: string;
  storylineSymbol: string;
  slotKey: string;
  signedByHouseId: HouseId | "";
  signerBonusText: string;
  note: string;
  photos: RecordAttachment[];
  text: string;
};

type BoardProcessingPanelProps = {
  busy: boolean;
  canManageBoardProcessing?: boolean;
  currentHouseId?: HouseId | null;
  history?: Partial<BoardProcessingHistory>;
  houses: RedactedHouse[];
  items: BoardProcessingItem[];
  mode?: "full" | "history" | "input";
  mutate: (body: Record<string, unknown>) => Promise<{ ok?: boolean; error?: string } | undefined>;
};

const boardProcessingTypes: BoardProcessingItemType[] = ["chronicle", "envelope", "story", "event", "mystery", "note"];
const campaignCardStatuses: CampaignCardStatus[] = ["active", "completed", "archived"];
const recordPhotoLimit = 3;
const recordPhotoDataUrlLimit = 1_200_000;
const recordPhotoMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function createBoardProcessingDraft(currentHouseId?: HouseId | null): BoardProcessingDraft {
  return {
    type: "chronicle",
    resourceId: resourceCounters[0].id as PersonalResourceId,
    polarity: "positive",
    stickerCode: "",
    envelopeCode: "",
    cardCode: "",
    status: "active",
    dossierLetter: "",
    storylineSymbol: "",
    slotKey: "",
    signedByHouseId: currentHouseId || "",
    signerBonusText: "",
    note: "",
    photos: [],
    text: "",
  };
}

export default function BoardProcessingPanel({
  busy,
  canManageBoardProcessing = false,
  currentHouseId,
  history,
  houses,
  items,
  mode = "full",
  mutate,
}: BoardProcessingPanelProps) {
  const [draft, setDraft] = useState<BoardProcessingDraft>(() => createBoardProcessingDraft(currentHouseId));
  const [editorOpen, setEditorOpen] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [statusTone, setStatusTone] = useState<"idle" | "success" | "error">("idle");
  const editorButtonRef = useRef<HTMLButtonElement>(null);
  const groupedItems = useMemo(() => groupBoardProcessingItems(items, history), [history, items]);
  const currentTypeLabel = ko.boardProcessing.typeLabels[draft.type];
  const canSaveItems = Boolean(currentHouseId && canManageBoardProcessing);
  const showInput = mode !== "history";
  const showHistory = mode !== "input";

  const updateDraft = (patch: Partial<BoardProcessingDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const openEditor = () => {
    setStatusText("");
    setStatusTone("idle");
    setEditorOpen(true);
  };

  const closeEditor = useCallback(() => {
    setEditorOpen(false);
  }, []);

  if (showInput && !canSaveItems) {
    return null;
  }

  const handleTypeChange = (type: BoardProcessingItemType) => {
    setDraft((current) => ({ ...createBoardProcessingDraft(currentHouseId), type, note: current.note, photos: current.photos }));
    setStatusText("");
    setStatusTone("idle");
  };

  const handlePhotoAdd = async (files: FileList | null) => {
    const selectedFiles = Array.from(files || []);

    if (!selectedFiles.length) {
      return;
    }

    const nextPhotos = [...draft.photos];
    let warning = "";

    for (const file of selectedFiles) {
      if (nextPhotos.length >= recordPhotoLimit) {
        warning = ko.boardProcessing.photoLimit(recordPhotoLimit);
        break;
      }

      if (!recordPhotoMimeTypes.has(file.type)) {
        warning = ko.boardProcessing.photoUnsupported;
        continue;
      }

      const dataUrl = await readFileAsDataUrl(file);

      if (dataUrl.length > recordPhotoDataUrlLimit) {
        warning = ko.boardProcessing.photoTooLarge;
        continue;
      }

      nextPhotos.push({
        id: createPhotoId(),
        name: file.name || ko.boardProcessing.photoFallbackName,
        mimeType: file.type,
        dataUrl,
        createdAt: new Date().toISOString(),
      });
    }

    setDraft((current) => ({ ...current, photos: nextPhotos }));

    if (warning) {
      setStatusText(warning);
      setStatusTone("error");
      return;
    }

    setStatusText("");
    setStatusTone("idle");
  };

  const handlePhotoRemove = (photoId: string) => {
    setDraft((current) => ({
      ...current,
      photos: current.photos.filter((photo) => photo.id !== photoId),
    }));
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSaveItems) {
      setStatusText(ko.boardProcessing.adminOnly);
      setStatusTone("error");
      return;
    }

    const validationMessage = getValidationMessage(draft);
    if (validationMessage) {
      setStatusText(validationMessage);
      setStatusTone("error");
      return;
    }

    const result = await mutate({ action: "saveBoardProcessingItem", item: toBoardProcessingPayload(draft, houses) });

    if (result?.ok === false) {
      setStatusText(result.error || ko.boardProcessing.saveFail);
      setStatusTone("error");
      return;
    }

    setDraft(createBoardProcessingDraft(currentHouseId));
    setStatusText(ko.boardProcessing.saveOk);
    setStatusTone("success");
    setEditorOpen(false);
  };

  const handleDelete = async (item: BoardProcessingItem) => {
    if (!canSaveItems) {
      setStatusText(ko.boardProcessing.adminOnly);
      setStatusTone("error");
      return;
    }

    if (!window.confirm(ko.boardProcessing.confirmDelete)) {
      return;
    }

    const result = await mutate({ action: "deleteBoardProcessingItem", itemId: item.id });

    if (result?.ok === false) {
      setStatusText(result.error || ko.boardProcessing.deleteFail);
      setStatusTone("error");
      return;
    }

    setStatusText("");
    setStatusTone("idle");
  };

  return (
    <section
      className={`board-processing-panel board-processing-panel--${mode}`}
      aria-labelledby={showInput ? "board-processing-title" : "board-processing-history-title"}
    >
      {showInput ? (
        <header className="board-processing-header">
          <div>
            <p className="section-label">{ko.boardProcessing.section}</p>
            <h2 id="board-processing-title">{ko.boardProcessing.title}</h2>
          </div>
          <div className="board-processing-actions">
            <button
              ref={editorButtonRef}
              className="primary-button"
              type="button"
              onClick={openEditor}
              disabled={busy || !canSaveItems}
            >
              <TokenIcon type="plus" />
              {ko.boardProcessing.openEditor}
            </button>
          </div>
        </header>
      ) : null}

      {statusText && (!editorOpen || !showInput) ? (
        <p className={`board-processing-status board-processing-status--${statusTone}`} aria-live="polite">
          {statusText}
        </p>
      ) : null}

      {showHistory ? (
        <div className="board-processing-layout board-processing-layout--history-only">
          <section className="board-processing-history" aria-labelledby="board-processing-history-title">
            <div className="board-processing-section-head">
              <h3 id="board-processing-history-title">{ko.boardProcessing.historyTitle}</h3>
            </div>
            <div className="board-processing-history-grid">
              {boardProcessingTypes.map((type) => (
                <HistorySection
                  busy={busy}
                  canDelete={canSaveItems}
                  items={groupedItems[type]}
                  key={type}
                  onDelete={handleDelete}
                  title={ko.boardProcessing.typeLabels[type]}
                  type={type}
                />
              ))}
            </div>
          </section>
        </div>
      ) : null}
      {showInput ? (
        <BoardProcessingEditorDialog
          busy={busy}
          currentTypeLabel={currentTypeLabel}
          draft={draft}
          houses={houses}
          onChange={updateDraft}
          onClose={closeEditor}
          onSave={handleSave}
          onPhotoAdd={handlePhotoAdd}
          onPhotoRemove={handlePhotoRemove}
          onTypeChange={handleTypeChange}
          open={editorOpen}
          restoreFocusRef={editorButtonRef}
          statusText={statusText}
          statusTone={statusTone}
        />
      ) : null}
    </section>
  );
}

type BoardProcessingEditorDialogProps = {
  busy: boolean;
  currentTypeLabel: string;
  draft: BoardProcessingDraft;
  houses: RedactedHouse[];
  onChange: (patch: Partial<BoardProcessingDraft>) => void;
  onClose: () => void;
  onPhotoAdd: (files: FileList | null) => Promise<void>;
  onPhotoRemove: (photoId: string) => void;
  onSave: (event: React.FormEvent<HTMLFormElement>) => void;
  onTypeChange: (type: BoardProcessingItemType) => void;
  open: boolean;
  restoreFocusRef: React.RefObject<HTMLButtonElement | null>;
  statusText: string;
  statusTone: "idle" | "success" | "error";
};

function BoardProcessingEditorDialog({
  busy,
  currentTypeLabel,
  draft,
  houses,
  onChange,
  onClose,
  onPhotoAdd,
  onPhotoRemove,
  onSave,
  onTypeChange,
  open,
  restoreFocusRef,
  statusText,
  statusTone,
}: BoardProcessingEditorDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const focusRestoreEl = restoreFocusRef.current;
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
        dialogRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element instanceof HTMLElement && element.getClientRects().length > 0) as HTMLElement[];

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
        className="board-processing-dialog"
        aria-labelledby="board-processing-editor-title"
        aria-modal="true"
        role="dialog"
      >
        <div className="session-end-heading">
          <span className="session-end-seal" aria-hidden="true">
            <TokenIcon type="plus" />
          </span>
          <div>
            <p className="section-label">{ko.boardProcessing.section}</p>
            <h2 id="board-processing-editor-title">{ko.boardProcessing.editorDialogTitle}</h2>
          </div>
        </div>
        <form className="board-processing-editor" onSubmit={onSave} aria-busy={busy}>
          <div className="board-processing-section-head">
            <h3>{ko.boardProcessing.inputTitle}</h3>
            <span>{currentTypeLabel}</span>
          </div>
          <div className="board-processing-form-grid">
            <label className="board-processing-field board-processing-field--full board-processing-type-field">
              <span>{ko.boardProcessing.typeLabel}</span>
              <select value={draft.type} onChange={(event) => onTypeChange(event.target.value as BoardProcessingItemType)} disabled={busy}>
                {boardProcessingTypes.map((type) => (
                  <option key={type} value={type}>
                    {ko.boardProcessing.typeLabels[type]}
                  </option>
                ))}
              </select>
            </label>

            <BoardProcessingFields busy={busy} draft={draft} houses={houses} onChange={onChange} />

            <label className="board-processing-field board-processing-field--full">
              <span>{ko.boardProcessing.noteLabel}</span>
              <textarea
                value={draft.note}
                onChange={(event) => onChange({ note: event.target.value })}
                disabled={busy}
                placeholder={ko.boardProcessing.notePlaceholder}
                rows={3}
              />
            </label>

            {draft.type === "note" ? (
              <label className="board-processing-field board-processing-field--full">
                <span>{ko.boardProcessing.textLabel}</span>
                <textarea
                  value={draft.text}
                  onChange={(event) => onChange({ text: event.target.value })}
                  disabled={busy}
                  placeholder={ko.boardProcessing.textPlaceholder}
                  rows={4}
                />
              </label>
            ) : null}

            <PhotoAttachmentField
              busy={busy}
              onAdd={onPhotoAdd}
              onRemove={onPhotoRemove}
              photos={draft.photos}
            />
          </div>
          {statusText ? (
            <p className={`board-processing-status board-processing-status--${statusTone}`} aria-live="polite">
              {statusText}
            </p>
          ) : null}
          <div className="board-processing-actions">
            <button ref={closeButtonRef} className="secondary-button" type="button" onClick={onClose}>
              {ko.boardProcessing.closeEditor}
            </button>
            <button className="primary-button" type="submit" disabled={busy}>
              <TokenIcon type="save" />
              {busy ? ko.boardProcessing.saving : ko.boardProcessing.save}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function PhotoAttachmentField({
  busy,
  onAdd,
  onRemove,
  photos,
}: {
  busy: boolean;
  onAdd: (files: FileList | null) => Promise<void>;
  onRemove: (photoId: string) => void;
  photos: RecordAttachment[];
}) {
  const inputId = React.useId();

  return (
    <section className="board-processing-photos board-processing-field--full" aria-labelledby={`${inputId}-label`}>
      <div className="board-processing-photo-head">
        <div>
          <span id={`${inputId}-label`}>{ko.boardProcessing.photoLabel}</span>
          <small>{ko.boardProcessing.photoHelp}</small>
        </div>
        <label className={`secondary-button board-processing-photo-trigger${busy || photos.length >= recordPhotoLimit ? " disabled" : ""}`} htmlFor={inputId}>
          <TokenIcon type="photo" />
          {ko.boardProcessing.photoAdd}
        </label>
        <input
          id={inputId}
          className="board-processing-photo-input"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          disabled={busy || photos.length >= recordPhotoLimit}
          onChange={(event) => {
            void onAdd(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
        />
      </div>
      {photos.length ? (
        <div className="board-processing-photo-list">
          {photos.map((photo) => (
            <figure className="board-processing-photo-chip" key={photo.id}>
              <img src={photo.dataUrl} alt={photo.name} loading="lazy" />
              <figcaption>{photo.name}</figcaption>
              <button
                className="ghost-button icon-button danger-button"
                type="button"
                onClick={() => onRemove(photo.id)}
                disabled={busy}
                aria-label={ko.boardProcessing.photoRemove(photo.name)}
              >
                <TokenIcon type="trash" />
              </button>
            </figure>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function BoardProcessingFields({
  busy,
  draft,
  houses,
  onChange,
}: {
  busy: boolean;
  draft: BoardProcessingDraft;
  houses: RedactedHouse[];
  onChange: (patch: Partial<BoardProcessingDraft>) => void;
}) {
  if (draft.type === "chronicle") {
    return (
      <>
        <ResourceSelect value={draft.resourceId} onChange={(resourceId) => onChange({ resourceId })} busy={busy} />
        <label className="board-processing-field">
          <span>{ko.boardProcessing.polarityLabel}</span>
          <select value={draft.polarity} onChange={(event) => onChange({ polarity: event.target.value as BoardProcessingPolarity })} disabled={busy}>
            <option value="positive">{ko.boardProcessing.polarityPositive}</option>
            <option value="negative">{ko.boardProcessing.polarityNegative}</option>
          </select>
        </label>
        <TextField
          label={ko.boardProcessing.stickerCodeLabel}
          value={draft.stickerCode}
          onChange={(stickerCode) => onChange({ stickerCode })}
          placeholder={ko.boardProcessing.stickerCodePlaceholder}
          busy={busy}
        />
        <SignerSelect value={draft.signedByHouseId} houses={houses} onChange={(signedByHouseId) => onChange({ signedByHouseId })} busy={busy} />
      </>
    );
  }

  if (draft.type === "envelope") {
    return (
      <TextField
        label={ko.boardProcessing.envelopeCodeLabel}
        value={draft.envelopeCode}
        onChange={(envelopeCode) => onChange({ envelopeCode })}
        placeholder={ko.boardProcessing.envelopeCodePlaceholder}
        busy={busy}
      />
    );
  }

  if (draft.type === "story" || draft.type === "event") {
    return (
      <>
        <TextField
          label={ko.boardProcessing.cardCodeLabel}
          value={draft.cardCode}
          onChange={(cardCode) => onChange({ cardCode })}
          placeholder={draft.type === "story" ? ko.boardProcessing.storyCardCodePlaceholder : ko.boardProcessing.eventCardCodePlaceholder}
          busy={busy}
        />
        <label className="board-processing-field">
          <span>{ko.boardProcessing.statusLabel}</span>
          <select value={draft.status} onChange={(event) => onChange({ status: event.target.value as CampaignCardStatus })} disabled={busy}>
            {campaignCardStatuses.map((status) => (
              <option key={status} value={status}>
                {ko.boardProcessing.statusLabels[status]}
              </option>
            ))}
          </select>
        </label>
        {draft.type === "story" ? (
          <>
            <SignerSelect value={draft.signedByHouseId} houses={houses} onChange={(signedByHouseId) => onChange({ signedByHouseId })} busy={busy} />
            <TextField
              label={ko.boardProcessing.signerBonusLabel}
              value={draft.signerBonusText}
              onChange={(signerBonusText) => onChange({ signerBonusText })}
              placeholder={ko.boardProcessing.signerBonusPlaceholder}
              busy={busy}
            />
          </>
        ) : null}
      </>
    );
  }

  if (draft.type === "mystery") {
    return (
      <>
        <TextField
          label={ko.boardProcessing.dossierLetterLabel}
          value={draft.dossierLetter}
          onChange={(dossierLetter) => onChange({ dossierLetter })}
          placeholder={ko.boardProcessing.dossierLetterPlaceholder}
          busy={busy}
        />
        <TextField
          label={ko.boardProcessing.storylineSymbolLabel}
          value={draft.storylineSymbol}
          onChange={(storylineSymbol) => onChange({ storylineSymbol })}
          placeholder={ko.boardProcessing.storylineSymbolPlaceholder}
          busy={busy}
        />
        <TextField
          label={ko.boardProcessing.slotKeyLabel}
          value={draft.slotKey}
          onChange={(slotKey) => onChange({ slotKey })}
          placeholder={ko.boardProcessing.slotKeyPlaceholder}
          busy={busy}
        />
      </>
    );
  }

  return null;
}

function ResourceSelect({
  busy,
  onChange,
  value,
}: {
  busy: boolean;
  onChange: (resourceId: PersonalResourceId) => void;
  value: PersonalResourceId;
}) {
  return (
    <label className="board-processing-field">
      <span>{ko.boardProcessing.resourceLabel}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as PersonalResourceId)} disabled={busy}>
        {resourceCounters.map((resource) => (
          <option key={resource.id} value={resource.id}>
            {resource.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SignerSelect({
  busy,
  houses,
  onChange,
  value,
}: {
  busy: boolean;
  houses: RedactedHouse[];
  onChange: (houseId: HouseId | "") => void;
  value: HouseId | "";
}) {
  return (
    <label className="board-processing-field">
      <span>{ko.boardProcessing.signerLabel}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as HouseId | "")} disabled={busy}>
        <option value="">{ko.boardProcessing.signerNone}</option>
        {houses.map((house) => (
          <option key={house.id} value={house.id}>
            {house.koreanTitle || house.name || house.id}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextField({
  busy,
  label,
  onChange,
  placeholder,
  value,
}: {
  busy: boolean;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="board-processing-field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} disabled={busy} placeholder={placeholder} />
    </label>
  );
}

function HistorySection({
  busy,
  canDelete,
  items,
  onDelete,
  title,
  type,
}: {
  busy: boolean;
  canDelete: boolean;
  items: BoardProcessingItem[];
  onDelete: (item: BoardProcessingItem) => void;
  title: string;
  type: BoardProcessingItemType;
}) {
  return (
    <section className={`board-processing-history-section board-processing-history-section--${type}`}>
      <header>
        <strong>{title}</strong>
        <span>{items.length}</span>
      </header>
      {items.length ? (
        <div className="board-processing-entry-list">
          {items.map((item) => (
            <article className="board-processing-entry" key={item.id}>
              <div className="board-processing-entry-head">
                <strong>{getEntryTitle(item)}</strong>
                <button
                  className="ghost-button icon-button danger-button"
                  type="button"
                  onClick={() => onDelete(item)}
                  disabled={busy || !canDelete}
                  aria-label={`${getEntryTitle(item)} ${ko.common.delete}`}
                >
                  <TokenIcon type="trash" />
                </button>
              </div>
              <p>{ko.boardProcessing.recordedBy(item.createdByName || ko.common.houseFallback, formatLocalDateTime(item.createdAt))}</p>
              <dl>{getEntryMeta(item).map(([label, value]) => value ? (
                <React.Fragment key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </React.Fragment>
              ) : null)}</dl>
              {item.note ? <p className="board-processing-entry-note">{item.note}</p> : null}
              {item.text ? <p className="board-processing-entry-note">{item.text}</p> : null}
              {item.photos?.length ? <PhotoPreviewList photos={item.photos} /> : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="board-processing-empty">{ko.boardProcessing.emptyHistory}</p>
      )}
    </section>
  );
}

function groupBoardProcessingItems(
  items: BoardProcessingItem[],
  history?: Partial<BoardProcessingHistory>,
): BoardProcessingHistory {
  const grouped = Object.fromEntries(boardProcessingTypes.map((type) => [type, []])) as unknown as BoardProcessingHistory;

  for (const type of boardProcessingTypes) {
    const source = history?.[type] || items.filter((item) => item.type === type);
    grouped[type] = [...source].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  return grouped;
}

function toBoardProcessingPayload(draft: BoardProcessingDraft, houses: RedactedHouse[]): Partial<BoardProcessingItem> {
  const base = {
    type: draft.type,
    note: draft.note,
    photos: draft.photos,
  };
  const signedByName = draft.signedByHouseId ? getHouseName(houses, draft.signedByHouseId) : undefined;

  if (draft.type === "chronicle") {
    return {
      ...base,
      resourceId: draft.resourceId,
      polarity: draft.polarity,
      stickerCode: draft.stickerCode,
      signedByHouseId: draft.signedByHouseId || undefined,
      signedByName,
    };
  }

  if (draft.type === "envelope") {
    return { ...base, envelopeCode: draft.envelopeCode };
  }

  if (draft.type === "story") {
    return {
      ...base,
      cardCode: draft.cardCode,
      status: draft.status,
      signedByHouseId: draft.signedByHouseId || undefined,
      signedByName,
      signerBonusText: draft.signerBonusText,
    };
  }

  if (draft.type === "event") {
    return { ...base, cardCode: draft.cardCode, status: draft.status };
  }

  if (draft.type === "mystery") {
    return {
      ...base,
      dossierLetter: draft.dossierLetter,
      storylineSymbol: draft.storylineSymbol,
      slotKey: draft.slotKey,
    };
  }

  return { ...base, type: "note", note: "", text: draft.text };
}

function PhotoPreviewList({ photos }: { photos: RecordAttachment[] }) {
  return (
    <div className="board-processing-entry-photos">
      {photos.map((photo) => (
        <a href={photo.dataUrl} key={photo.id} target="_blank" rel="noreferrer" title={photo.name}>
          <img src={photo.dataUrl} alt={photo.name} loading="lazy" />
        </a>
      ))}
    </div>
  );
}

function createPhotoId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `photo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function getValidationMessage(draft: BoardProcessingDraft): string {
  if (draft.type === "chronicle" && !draft.stickerCode.trim()) {
    return ko.boardProcessing.requiredCode;
  }

  if (draft.type === "envelope" && !draft.envelopeCode.trim()) {
    return ko.boardProcessing.requiredCode;
  }

  if ((draft.type === "story" || draft.type === "event") && !draft.cardCode.trim()) {
    return ko.boardProcessing.requiredCode;
  }

  if (draft.type === "mystery" && (!draft.dossierLetter.trim() || !draft.storylineSymbol.trim() || !draft.slotKey.trim())) {
    return ko.boardProcessing.requiredMystery;
  }

  if (draft.type === "note" && !draft.text.trim()) {
    return ko.boardProcessing.requiredNote;
  }

  return "";
}

function getEntryTitle(item: BoardProcessingItem): string {
  if (item.type === "chronicle") {
    return item.stickerCode || ko.boardProcessing.typeLabels.chronicle;
  }

  if (item.type === "envelope") {
    return item.envelopeCode || ko.boardProcessing.typeLabels.envelope;
  }

  if (item.type === "story" || item.type === "event") {
    return item.cardCode || ko.boardProcessing.typeLabels[item.type];
  }

  if (item.type === "mystery") {
    return [item.dossierLetter, item.storylineSymbol, item.slotKey].filter(Boolean).join(" · ") || ko.boardProcessing.typeLabels.mystery;
  }

  return item.text?.split(/\s+/).slice(0, 6).join(" ") || ko.boardProcessing.entryFallback;
}

function getEntryMeta(item: BoardProcessingItem): [string, string | undefined][] {
  if (item.type === "chronicle") {
    return [
      [ko.boardProcessing.resourceLabel, getResourceLabel(item.resourceId)],
      [
        ko.boardProcessing.polarityLabel,
        item.polarity === "negative" ? ko.boardProcessing.polarityNegative : ko.boardProcessing.polarityPositive,
      ],
      [ko.boardProcessing.signerLabel, item.signedByName],
    ];
  }

  if (item.type === "story") {
    return [
      [ko.boardProcessing.statusLabel, item.status ? ko.boardProcessing.statusLabels[item.status] : undefined],
      [ko.boardProcessing.signerLabel, item.signedByName],
      [ko.boardProcessing.signerBonusLabel, item.signerBonusText],
    ];
  }

  if (item.type === "event") {
    return [[ko.boardProcessing.statusLabel, item.status ? ko.boardProcessing.statusLabels[item.status] : undefined]];
  }

  if (item.type === "mystery") {
    return [
      [ko.boardProcessing.dossierLetterLabel, item.dossierLetter],
      [ko.boardProcessing.storylineSymbolLabel, item.storylineSymbol],
      [ko.boardProcessing.slotKeyLabel, item.slotKey],
    ];
  }

  return [];
}

function getResourceLabel(resourceId: string | undefined): string | undefined {
  return resourceCounters.find((resource) => resource.id === resourceId)?.label || resourceId;
}

function getHouseName(houses: RedactedHouse[], houseId: HouseId): string | undefined {
  const house = houses.find((entry) => entry.id === houseId);
  return house?.koreanTitle || house?.name || houseId;
}

function formatLocalDateTime(value: string): string {
  if (!value) {
    return ko.common.notSpecified;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
