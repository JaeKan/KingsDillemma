import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { previewChroniclePlacement } from "../../shared/chronicle-ledger.mts";
import { ko, resourceCounters } from "../resources/gameResources";
import type { ChronicleLedger, ChroniclePolarity, ChronicleResourceId, ChronicleStickerEntry, RecordAttachment } from "../types/game";
import { formatLocalDateTime } from "../utils/dilemma-helpers";
import { createRecordPhotoAttachments } from "../utils/photo-attachments";
import { DilemmaPhotoUploader, RecordPhotoStrip, ledgerPhotoUploaderCopy } from "./DilemmaPhotoUploader";
import { TokenIcon } from "./GameIcons";

type ChronicleLedgerDialogProps = {
  open: boolean;
  state: any;
  busy: boolean;
  mutate: (payload: Record<string, unknown>) => Promise<unknown>;
  onClose: () => void;
  restoreFocusRef: React.RefObject<HTMLElement>;
};

type StickerDraft = {
  resourceId: ChronicleResourceId;
  polarity: ChroniclePolarity;
  stickerCode: string;
  signedByHouseId: string;
  ageMarks: string;
  sourceCardCode: string;
  sourceDilemmaHistoryId: string;
  note: string;
  photos: RecordAttachment[];
};

const DEFAULT_RESOURCE_ID = resourceCounters[0].id as ChronicleResourceId;

function createEmptyLedger(): ChronicleLedger {
  return {
    influence: [],
    wealth: [],
    morale: [],
    welfare: [],
    knowledge: [],
  };
}

function createDraft(signedByHouseId = "", defaults?: Partial<StickerDraft>): StickerDraft {
  return {
    resourceId: defaults?.resourceId || DEFAULT_RESOURCE_ID,
    polarity: defaults?.polarity || "positive",
    stickerCode: defaults?.stickerCode || "",
    signedByHouseId,
    ageMarks: defaults?.ageMarks ?? "0",
    sourceCardCode: defaults?.sourceCardCode || "",
    sourceDilemmaHistoryId: defaults?.sourceDilemmaHistoryId || "",
    note: defaults?.note || "",
    photos: defaults?.photos || [],
  };
}

function normalizeLedger(ledger: ChronicleLedger | null | undefined): ChronicleLedger {
  return ledger || createEmptyLedger();
}

function getSignerLabel(state: any, houseId: string) {
  const house = (state?.houses || []).find((candidate: any) => candidate?.id === houseId);

  return house?.name || house?.koreanTitle || houseId || ko.common.notSpecified;
}

function getEntryDraft(entry: ChronicleStickerEntry): StickerDraft {
  return createDraft(entry.signedByHouseId, {
    resourceId: entry.resourceId,
    polarity: entry.polarity,
    stickerCode: entry.stickerCode,
    signedByHouseId: entry.signedByHouseId,
    ageMarks: String(entry.ageMarks ?? 0),
    sourceCardCode: entry.sourceCardCode || "",
    sourceDilemmaHistoryId: entry.sourceDilemmaHistoryId || "",
    note: entry.note || "",
    photos: entry.photos || [],
  });
}

function getResourceLabel(resourceId: ChronicleResourceId) {
  return resourceCounters.find((resource) => resource.id === resourceId)?.label || resourceId;
}

function clampAgeMarks(value: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.min(6, Math.trunc(parsed)));
}

export default function ChronicleLedgerDialog({
  open,
  state,
  busy,
  mutate,
  onClose,
  restoreFocusRef,
}: ChronicleLedgerDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const currentHouseId = state?.currentHouseId || "";
  const ledger = useMemo(() => normalizeLedger(state?.chronicleLedger), [state]);
  const signerLabel = useMemo(() => getSignerLabel(state, currentHouseId), [currentHouseId, state]);
  const participatingHouses = useMemo(() => {
    const houses = (state?.houses || []).filter((house: any) => house?.hasPassword);

    if (houses.some((house: any) => house?.id === currentHouseId) || !currentHouseId) {
      return houses;
    }

    return [
      ...houses,
      {
        id: currentHouseId,
        name: signerLabel,
      },
    ];
  }, [currentHouseId, signerLabel, state]);
  const [editingStickerId, setEditingStickerId] = useState("");
  const [draft, setDraft] = useState(() => createDraft(currentHouseId));
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");
  const [statusTone, setStatusTone] = useState<"info" | "success" | "error">("info");
  const allEntries = useMemo(
    () => Object.values(ledger).flat().sort((a, b) => a.slotIndex - b.slotIndex || a.id.localeCompare(b.id)),
    [ledger],
  );
  const editingEntry = useMemo(
    () => allEntries.find((entry) => entry.id === editingStickerId) || null,
    [allEntries, editingStickerId],
  );
  const placementPreview = useMemo(() => {
    if (editingStickerId) {
      return null;
    }

    return previewChroniclePlacement(ledger, {
      resourceId: draft.resourceId,
      polarity: draft.polarity,
    });
  }, [draft.polarity, draft.resourceId, editingStickerId, ledger]);
  const previewReplacedEntry = useMemo(() => {
    if (!placementPreview?.replacedStickerId) {
      return null;
    }

    return allEntries.find((entry) => entry.id === placementPreview.replacedStickerId) || null;
  }, [allEntries, placementPreview]);
  const resourceGroups = useMemo(
    () =>
      resourceCounters.map((resource) => {
        const entries = ledger[resource.id as ChronicleResourceId] || [];
        const active = entries
          .filter((entry) => !entry.replacedAt)
          .sort((a, b) => a.slotIndex - b.slotIndex || a.stickerCode.localeCompare(b.stickerCode));
        const archived = entries
          .filter((entry) => Boolean(entry.replacedAt))
          .sort((a, b) => (b.replacedAt || "").localeCompare(a.replacedAt || "") || a.slotIndex - b.slotIndex);

        return {
          ...resource,
          active,
          archived,
        };
      }),
    [ledger],
  );

  const resetAddDraft = useCallback(() => {
    setDraft((current) =>
      createDraft(current.signedByHouseId || currentHouseId, {
        resourceId: current.resourceId,
        polarity: current.polarity,
        signedByHouseId: current.signedByHouseId || currentHouseId,
      }),
    );
    setEditingStickerId("");
  }, [currentHouseId]);

  const beginEdit = useCallback((entry: ChronicleStickerEntry) => {
    setEditingStickerId(entry.id);
    setDraft(getEntryDraft(entry));
    setStatusText("");
  }, []);

  const cancelEdit = useCallback(() => {
    resetAddDraft();
    setStatusText("");
    setPhotoError(null);
  }, [resetAddDraft]);

  const addPhotos = useCallback(async (files: FileList | File[]) => {
    const fileList = Array.from(files || []);

    if (!fileList.length) {
      return;
    }

    const remainingSlots = Math.max(3 - draft.photos.length, 0);

    if (remainingSlots <= 0) {
      setPhotoError(ko.app.inventory.photoSlotLimit(3));
      return;
    }

    setPhotoBusy(true);
    setPhotoError(null);

    try {
      const nextPhotos = await createRecordPhotoAttachments(fileList, remainingSlots);
      setDraft((current) => ({ ...current, photos: [...current.photos, ...nextPhotos].slice(0, 3) }));
    } catch (error: any) {
      setPhotoError(error.message || ko.app.inventory.photoAttachFail);
    } finally {
      setPhotoBusy(false);
    }
  }, [draft.photos.length]);

  const removePhoto = useCallback((photoId: string) => {
    setDraft((current) => ({ ...current, photos: current.photos.filter((photo) => photo.id !== photoId) }));
    setPhotoError(null);
  }, []);

  const handleDelete = useCallback(
    async (entry: ChronicleStickerEntry) => {
      if (!window.confirm(ko.chronicleLedger.confirmDelete(entry.stickerCode))) {
        return;
      }

      const result = await mutate({
        action: "deleteChronicleSticker",
        stickerId: entry.id,
      });

      if (!result) {
        setStatusText(ko.chronicleLedger.deleteFail);
        setStatusTone("error");
        return;
      }

      if (editingStickerId === entry.id) {
        resetAddDraft();
      }

      setStatusText(ko.chronicleLedger.deleteOk);
      setStatusTone("success");
    },
    [editingStickerId, mutate, resetAddDraft],
  );

  const handleSave = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const stickerCode = draft.stickerCode.trim();

      if (!stickerCode) {
        setStatusText(ko.chronicleLedger.stickerCodeRequired);
        setStatusTone("error");
        firstInputRef.current?.focus();
        return;
      }

      const ageMarks = clampAgeMarks(draft.ageMarks);
      const basePayload = {
        polarity: draft.polarity,
        stickerCode,
        sourceCardCode: draft.sourceCardCode.trim(),
        sourceDilemmaHistoryId: draft.sourceDilemmaHistoryId.trim(),
        note: draft.note.trim(),
        ageMarks,
        photos: draft.photos,
      };

      const result = editingEntry
        ? await mutate({
            action: "updateChronicleSticker",
            stickerId: editingEntry.id,
            patch: basePayload,
          })
        : await mutate({
            action: "addChronicleSticker",
            input: {
              ...basePayload,
              resourceId: draft.resourceId,
              signedByHouseId: draft.signedByHouseId,
            },
          });

      if (!result) {
        setStatusText(editingEntry ? ko.chronicleLedger.updateFail : ko.chronicleLedger.addFail);
        setStatusTone("error");
        return;
      }

      if (editingEntry) {
        resetAddDraft();
        setStatusText(ko.chronicleLedger.updateOk);
        setStatusTone("success");
        return;
      }

      setStatusText(ko.chronicleLedger.addOk);
      setStatusTone("success");
      setDraft((current) =>
        createDraft(current.signedByHouseId || currentHouseId, {
          resourceId: current.resourceId,
          polarity: current.polarity,
          signedByHouseId: current.signedByHouseId || currentHouseId,
        }),
      );
    },
    [currentHouseId, draft, editingEntry, mutate, resetAddDraft],
  );

  useEffect(() => {
    if (!editingStickerId) {
      return;
    }

    if (!editingEntry) {
      queueMicrotask(resetAddDraft);
    }
  }, [editingEntry, editingStickerId, resetAddDraft]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const focusRestoreEl = restoreFocusRef?.current ?? null;
    const focusTimer = window.setTimeout(() => {
      if (editingStickerId) {
        firstInputRef.current?.focus();
        return;
      }

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
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      window.setTimeout(() => {
        focusRestoreEl?.focus();
      }, 0);
    };
  }, [editingStickerId, onClose, open, restoreFocusRef]);

  if (!open) {
    return null;
  }

  return (
    <div className="session-end-overlay" role="presentation">
      <section
        ref={dialogRef}
        className="session-end-dialog chronicle-ledger-dialog"
        aria-labelledby="chronicle-ledger-title"
        aria-modal="true"
        role="dialog"
      >
        <div className="session-end-heading">
          <span className="session-end-seal" aria-hidden="true">
            <TokenIcon type="history" />
          </span>
          <div>
            <p className="section-label">{ko.chronicleLedger.section}</p>
            <h2 id="chronicle-ledger-title">{ko.chronicleLedger.title}</h2>
          </div>
        </div>
        <p className="session-end-copy">{ko.chronicleLedger.copy}</p>

        <div className="chronicle-ledger-layout">
          <section className="chronicle-ledger-panel chronicle-ledger-panel--rows" aria-labelledby="chronicle-ledger-rows-title">
            <div className="chronicle-ledger-panel-head">
              <div>
                <p className="section-label">{ko.chronicleLedger.rowsSection}</p>
                <h3 id="chronicle-ledger-rows-title">{ko.chronicleLedger.rowsTitle}</h3>
              </div>
            </div>
            <div className="chronicle-ledger-resource-list">
              {resourceGroups.map((group) => (
                <section className={`chronicle-resource-card tone-${group.tone}`} key={group.id}>
                  <header className="chronicle-resource-head">
                    <div>
                      <h4>
                        <TokenIcon type={group.icon as any} />
                        {group.label}
                      </h4>
                      <p>{ko.chronicleLedger.rowSummary(group.active.length, group.archived.length)}</p>
                    </div>
                  </header>

                  {group.active.length ? (
                    <div className="chronicle-sticker-list">
                      {group.active.map((entry) => (
                        <StickerCard
                          key={entry.id}
                          entry={entry}
                          busy={busy}
                          editing={editingStickerId === entry.id}
                          onDelete={handleDelete}
                          onEdit={beginEdit}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="chronicle-empty-row">{ko.chronicleLedger.emptyRow}</p>
                  )}

                  {group.archived.length ? (
                    <details className="chronicle-archive">
                      <summary>{ko.chronicleLedger.archiveSummary(group.archived.length)}</summary>
                      <div className="chronicle-sticker-list chronicle-sticker-list--archived">
                        {group.archived.map((entry) => (
                          <StickerCard
                            key={entry.id}
                            entry={entry}
                            busy={busy}
                            editing={editingStickerId === entry.id}
                            onDelete={handleDelete}
                            onEdit={beginEdit}
                            archived
                          />
                        ))}
                      </div>
                    </details>
                  ) : null}
                </section>
              ))}
            </div>
          </section>

          <form className="chronicle-ledger-panel chronicle-ledger-panel--editor" onSubmit={handleSave} aria-busy={busy}>
            <div className="chronicle-ledger-panel-head">
              <div>
                <p className="section-label">{editingEntry ? ko.chronicleLedger.editSection : ko.chronicleLedger.addSection}</p>
                <h3>{editingEntry ? ko.chronicleLedger.editTitle : ko.chronicleLedger.addTitle}</h3>
              </div>
              {editingEntry ? (
                <button className="ghost-button" type="button" onClick={cancelEdit} disabled={busy}>
                  <TokenIcon type="undo" />
                  {ko.chronicleLedger.cancelEdit}
                </button>
              ) : null}
            </div>

            <div className="chronicle-ledger-form-grid">
              <label>
                <span>{ko.chronicleLedger.resourceLabel}</span>
                <select
                  value={draft.resourceId}
                  onChange={(event) => setDraft((current) => ({ ...current, resourceId: event.target.value as ChronicleResourceId }))}
                  disabled={busy || Boolean(editingEntry)}
                >
                  {resourceCounters.map((resource) => (
                    <option value={resource.id} key={resource.id}>
                      {resource.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>{ko.chronicleLedger.polarityLabel}</span>
                <select
                  value={draft.polarity}
                  onChange={(event) => setDraft((current) => ({ ...current, polarity: event.target.value as ChroniclePolarity }))}
                  disabled={busy}
                >
                  <option value="positive">{ko.chronicleLedger.polarityPositive}</option>
                  <option value="negative">{ko.chronicleLedger.polarityNegative}</option>
                </select>
              </label>

              <label>
                <span>{ko.chronicleLedger.stickerCodeLabel}</span>
                <input
                  ref={firstInputRef}
                  value={draft.stickerCode}
                  onChange={(event) => setDraft((current) => ({ ...current, stickerCode: event.target.value }))}
                  disabled={busy}
                  placeholder={ko.chronicleLedger.stickerCodePlaceholder}
                />
              </label>

              <label>
                <span>{ko.chronicleLedger.signerLabel}</span>
                {editingEntry ? (
                  <input value={getSignerLabel(state, draft.signedByHouseId)} readOnly disabled />
                ) : (
                  <select
                    value={draft.signedByHouseId}
                    onChange={(event) => setDraft((current) => ({ ...current, signedByHouseId: event.target.value }))}
                    disabled={busy}
                  >
                    {participatingHouses.map((house: any) => (
                      <option value={house.id} key={house.id}>
                        {house.name || house.koreanTitle || house.id}
                      </option>
                    ))}
                  </select>
                )}
                <small>{editingEntry ? ko.chronicleLedger.signerLocked : ko.chronicleLedger.signerCurrent(signerLabel)}</small>
              </label>

              <label>
                <span>{ko.chronicleLedger.ageMarksLabel}</span>
                <input
                  type="number"
                  min="0"
                  max="6"
                  value={draft.ageMarks}
                  onChange={(event) => setDraft((current) => ({ ...current, ageMarks: event.target.value }))}
                  disabled={busy}
                />
              </label>

              <label>
                <span>{ko.chronicleLedger.sourceCardCodeLabel}</span>
                <input
                  value={draft.sourceCardCode}
                  onChange={(event) => setDraft((current) => ({ ...current, sourceCardCode: event.target.value }))}
                  disabled={busy}
                  placeholder={ko.chronicleLedger.sourceCardCodePlaceholder}
                />
              </label>

              <label>
                <span>{ko.chronicleLedger.sourceHistoryLabel}</span>
                <input
                  value={draft.sourceDilemmaHistoryId}
                  onChange={(event) => setDraft((current) => ({ ...current, sourceDilemmaHistoryId: event.target.value }))}
                  disabled={busy}
                  placeholder={ko.chronicleLedger.sourceHistoryPlaceholder}
                />
              </label>

              <label className="chronicle-ledger-form-grid__full">
                <span>{ko.chronicleLedger.noteLabel}</span>
                <textarea
                  value={draft.note}
                  onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
                  disabled={busy}
                  rows={4}
                  placeholder={ko.chronicleLedger.notePlaceholder}
                />
              </label>
            </div>

            <DilemmaPhotoUploader
              busy={busy}
              photoBusy={photoBusy}
              error={photoError}
              photos={draft.photos}
              onAddPhotos={addPhotos}
              onRemovePhoto={removePhoto}
              copy={ledgerPhotoUploaderCopy}
            />

            {!editingEntry && placementPreview ? (
              <div className={`chronicle-preview tone-${draft.resourceId}`}>
                <strong>{ko.chronicleLedger.previewTitle}</strong>
                <span>
                  {placementPreview.reason === "empty_slot"
                    ? ko.chronicleLedger.previewEmptySlot(placementPreview.slotIndex)
                    : ko.chronicleLedger.previewReplaceSlot(
                        placementPreview.slotIndex,
                        previewReplacedEntry?.stickerCode || placementPreview.replacedStickerId,
                      )}
                </span>
              </div>
            ) : null}

            {editingEntry ? (
              <div className="chronicle-preview chronicle-preview--static">
                <strong>{ko.chronicleLedger.editPreviewTitle}</strong>
                <span>{ko.chronicleLedger.editPreviewBody(editingEntry.slotIndex, getResourceLabel(editingEntry.resourceId))}</span>
              </div>
            ) : null}

            {statusText ? (
              <p className={`chronicle-ledger-status chronicle-ledger-status--${statusTone}`} aria-live="polite">
                {statusText}
              </p>
            ) : null}

            <div className="session-end-actions chronicle-ledger-actions">
              <button className="primary-button" type="submit" disabled={busy}>
                <TokenIcon type={editingEntry ? "save" : "plus"} />
                {editingEntry ? ko.chronicleLedger.saveEdit : ko.chronicleLedger.saveAdd}
              </button>
              <button ref={closeButtonRef} className="ghost-button" type="button" onClick={onClose}>
                {ko.common.close}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

function StickerCard({
  entry,
  archived = false,
  busy,
  editing,
  onDelete,
  onEdit,
}: {
  entry: ChronicleStickerEntry;
  archived?: boolean;
  busy: boolean;
  editing: boolean;
  onDelete: (entry: ChronicleStickerEntry) => void;
  onEdit: (entry: ChronicleStickerEntry) => void;
}) {
  return (
    <article className={`chronicle-sticker-card${archived ? " archived" : ""}${editing ? " editing" : ""}`}>
      <div className="chronicle-sticker-card__head">
        <div className="chronicle-sticker-card__title">
          <span className="chronicle-slot-badge">{ko.chronicleLedger.slotLabel(entry.slotIndex)}</span>
          <strong>{entry.stickerCode}</strong>
          <span className={`chronicle-polarity-pill ${entry.polarity}`}>{ko.chronicleLedger.polarityText(entry.polarity)}</span>
        </div>
        <div className="chronicle-sticker-card__actions">
          <button className="ghost-button" type="button" onClick={() => onEdit(entry)} disabled={busy}>
            <TokenIcon type="edit" />
            {ko.chronicleLedger.editButton}
          </button>
          <button className="ghost-button danger-button" type="button" onClick={() => void onDelete(entry)} disabled={busy}>
            <TokenIcon type="trash" />
            {ko.common.delete}
          </button>
        </div>
      </div>

      <dl className="chronicle-sticker-meta">
        <div>
          <dt>{ko.chronicleLedger.signerLabel}</dt>
          <dd>{entry.signedByName || entry.signedByHouseId}</dd>
        </div>
        <div>
          <dt>{ko.chronicleLedger.ageMarksLabel}</dt>
          <dd>{ko.chronicleLedger.ageMarksValue(entry.ageMarks)}</dd>
        </div>
        <div>
          <dt>{ko.chronicleLedger.sourceCardCodeLabel}</dt>
          <dd>{entry.sourceCardCode || ko.common.none}</dd>
        </div>
        <div>
          <dt>{ko.chronicleLedger.sourceHistoryLabel}</dt>
          <dd>{entry.sourceDilemmaHistoryId || ko.common.none}</dd>
        </div>
      </dl>

      {entry.note ? <p className="chronicle-sticker-note">{entry.note}</p> : null}
      <RecordPhotoStrip photos={entry.photos || []} />

      <div className="chronicle-sticker-foot">
        <span>{ko.chronicleLedger.entryId(entry.id)}</span>
        {archived && entry.replacedAt ? <span>{ko.chronicleLedger.replacedAt(formatLocalDateTime(entry.replacedAt))}</span> : null}
      </div>
    </article>
  );
}
