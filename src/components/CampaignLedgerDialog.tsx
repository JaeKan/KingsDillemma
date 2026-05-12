import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ko } from "../resources/gameResources";
import type {
  CampaignCardEntry,
  CampaignCardStatus,
  CampaignEnvelopeEntry,
  CampaignLedger,
  MysteryStickerEntry,
  RecordAttachment,
} from "../types/game";
import { formatLocalDateTime } from "../utils/dilemma-helpers";
import { createRecordPhotoAttachments } from "../utils/photo-attachments";
import { DilemmaPhotoUploader, RecordPhotoStrip, ledgerPhotoUploaderCopy } from "./DilemmaPhotoUploader";
import { TokenIcon } from "./GameIcons";

type CampaignLedgerDialogProps = {
  open: boolean;
  state: any;
  busy: boolean;
  mutate: (payload: Record<string, unknown>) => Promise<unknown>;
  onClose: () => void;
  restoreFocusRef: React.RefObject<HTMLElement>;
};

type SectionId = "envelope" | "card" | "mystery";
type CardKind = "story" | "event";

type EnvelopeDraft = {
  code: string;
  openedAt: string;
  sourceDilemmaHistoryId: string;
  note: string;
  photos: RecordAttachment[];
};

type CardDraft = {
  cardKind: CardKind;
  code: string;
  status: CampaignCardStatus;
  sourceEnvelopeCode: string;
  sourceDilemmaHistoryId: string;
  note: string;
  photos: RecordAttachment[];
};

type MysteryDraft = {
  dossierLetter: string;
  storylineSymbol: string;
  slotKey: string;
  sourceDilemmaHistoryId: string;
  note: string;
  photos: RecordAttachment[];
};

const DOSSIER_LETTERS = Array.from({ length: 12 }, (_, index) => String.fromCharCode(65 + index));

function createEmptyLedger(): CampaignLedger {
  return {
    openedEnvelopes: {},
    storyCards: {},
    eventCards: {},
    mysteryStickers: {},
  };
}

function normalizeLedger(ledger: CampaignLedger | null | undefined): CampaignLedger {
  return ledger || createEmptyLedger();
}

function createEnvelopeDraft(defaults?: Partial<EnvelopeDraft>): EnvelopeDraft {
  return {
    code: defaults?.code || "",
    openedAt: defaults?.openedAt || "",
    sourceDilemmaHistoryId: defaults?.sourceDilemmaHistoryId || "",
    note: defaults?.note || "",
    photos: defaults?.photos || [],
  };
}

function createCardDraft(defaults?: Partial<CardDraft>): CardDraft {
  return {
    cardKind: defaults?.cardKind || "story",
    code: defaults?.code || "",
    status: defaults?.status || "active",
    sourceEnvelopeCode: defaults?.sourceEnvelopeCode || "",
    sourceDilemmaHistoryId: defaults?.sourceDilemmaHistoryId || "",
    note: defaults?.note || "",
    photos: defaults?.photos || [],
  };
}

function createMysteryDraft(defaults?: Partial<MysteryDraft>): MysteryDraft {
  return {
    dossierLetter: (defaults?.dossierLetter || "A").toUpperCase(),
    storylineSymbol: defaults?.storylineSymbol || "",
    slotKey: defaults?.slotKey || "",
    sourceDilemmaHistoryId: defaults?.sourceDilemmaHistoryId || "",
    note: defaults?.note || "",
    photos: defaults?.photos || [],
  };
}

function sortByCode<T extends { code: string }>(entries: T[]) {
  return [...entries].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
}

function sortMystery(entries: MysteryStickerEntry[]) {
  return [...entries].sort(
    (a, b) =>
      a.dossierLetter.localeCompare(b.dossierLetter) ||
      a.storylineSymbol.localeCompare(b.storylineSymbol, undefined, { numeric: true }) ||
      a.slotKey.localeCompare(b.slotKey, undefined, { numeric: true }),
  );
}

function hasFinalSlotSignal(slotKey: string) {
  const normalized = slotKey.trim().toLowerCase();

  return /\\b6\\b/.test(normalized) || normalized.includes("final") || normalized.includes("finale") || normalized.includes("최종") || normalized.includes("마지막");
}

function entryTime(value: string) {
  return value ? formatLocalDateTime(value) : ko.common.notSpecified;
}

export default function CampaignLedgerDialog({
  open,
  state,
  busy,
  mutate,
  onClose,
  restoreFocusRef,
}: CampaignLedgerDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const ledger = useMemo(() => normalizeLedger(state?.campaignLedger), [state]);
  const envelopes = useMemo(() => sortByCode(Object.values(ledger.openedEnvelopes)), [ledger]);
  const storyCards = useMemo(() => sortByCode(Object.values(ledger.storyCards)), [ledger]);
  const eventCards = useMemo(() => sortByCode(Object.values(ledger.eventCards)), [ledger]);
  const mysteryStickers = useMemo(() => sortMystery(Object.values(ledger.mysteryStickers)), [ledger]);
  const [activeSection, setActiveSection] = useState<SectionId>("envelope");
  const [editingKey, setEditingKey] = useState("");
  const [envelopeDraft, setEnvelopeDraft] = useState(createEnvelopeDraft);
  const [cardDraft, setCardDraft] = useState(createCardDraft);
  const [mysteryDraft, setMysteryDraft] = useState(createMysteryDraft);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");
  const [statusTone, setStatusTone] = useState<"info" | "success" | "error">("info");
  const editingEnvelope = activeSection === "envelope" ? ledger.openedEnvelopes[editingKey] || null : null;
  const editingCard =
    activeSection === "card"
      ? (cardDraft.cardKind === "story" ? ledger.storyCards[editingKey] : ledger.eventCards[editingKey]) || null
      : null;
  const editingMystery = activeSection === "mystery" ? ledger.mysteryStickers[editingKey] || null : null;
  const mysteryWarningActive = mysteryStickers.length >= 6 || hasFinalSlotSignal(mysteryDraft.slotKey);
  const currentPhotos =
    activeSection === "envelope" ? envelopeDraft.photos : activeSection === "card" ? cardDraft.photos : mysteryDraft.photos;

  const resetEditor = useCallback((section: SectionId = activeSection) => {
    setEditingKey("");
    setStatusText("");
    setPhotoError(null);

    if (section === "envelope") {
      setEnvelopeDraft(createEnvelopeDraft());
      return;
    }

    if (section === "card") {
      setCardDraft((current) => createCardDraft({ cardKind: current.cardKind }));
      return;
    }

    setMysteryDraft(createMysteryDraft());
  }, [activeSection]);

  const switchSection = useCallback(
    (section: SectionId) => {
      setActiveSection(section);
      resetEditor(section);
    },
    [resetEditor],
  );

  const beginEnvelopeEdit = useCallback((entry: CampaignEnvelopeEntry) => {
    setActiveSection("envelope");
    setEditingKey(entry.code);
    setEnvelopeDraft(createEnvelopeDraft(entry));
    setStatusText("");
    setPhotoError(null);
  }, []);

  const beginCardEdit = useCallback((cardKind: CardKind, entry: CampaignCardEntry) => {
    setActiveSection("card");
    setEditingKey(entry.code);
    setCardDraft(createCardDraft({ ...entry, cardKind }));
    setStatusText("");
    setPhotoError(null);
  }, []);

  const beginMysteryEdit = useCallback((entry: MysteryStickerEntry) => {
    setActiveSection("mystery");
    setEditingKey(entry.slotKey);
    setMysteryDraft(createMysteryDraft(entry));
    setStatusText("");
    setPhotoError(null);
  }, []);

  const setActivePhotos = useCallback((photos: RecordAttachment[]) => {
    if (activeSection === "envelope") {
      setEnvelopeDraft((current) => ({ ...current, photos }));
      return;
    }

    if (activeSection === "card") {
      setCardDraft((current) => ({ ...current, photos }));
      return;
    }

    setMysteryDraft((current) => ({ ...current, photos }));
  }, [activeSection]);

  const addPhotos = useCallback(async (files: FileList | File[]) => {
    const fileList = Array.from(files || []);

    if (!fileList.length) {
      return;
    }

    const remainingSlots = Math.max(3 - currentPhotos.length, 0);

    if (remainingSlots <= 0) {
      setPhotoError(ko.app.inventory.photoSlotLimit(3));
      return;
    }

    setPhotoBusy(true);
    setPhotoError(null);

    try {
      const nextPhotos = await createRecordPhotoAttachments(fileList, remainingSlots);
      setActivePhotos([...currentPhotos, ...nextPhotos].slice(0, 3));
    } catch (error: any) {
      setPhotoError(error.message || ko.app.inventory.photoAttachFail);
    } finally {
      setPhotoBusy(false);
    }
  }, [currentPhotos, setActivePhotos]);

  const removePhoto = useCallback((photoId: string) => {
    setActivePhotos(currentPhotos.filter((photo) => photo.id !== photoId));
    setPhotoError(null);
  }, [currentPhotos, setActivePhotos]);

  const handleDeleteEnvelope = useCallback(
    async (entry: CampaignEnvelopeEntry) => {
      if (!window.confirm(ko.campaignLedger.confirmDeleteEnvelope(entry.code))) {
        return;
      }

      const result = await mutate({ action: "deleteCampaignEnvelope", code: entry.code });

      if (!result) {
        setStatusText(ko.campaignLedger.deleteFail);
        setStatusTone("error");
        return;
      }

      if (editingKey === entry.code) {
        resetEditor("envelope");
      }

      setStatusText(ko.campaignLedger.deleteOk);
      setStatusTone("success");
    },
    [editingKey, mutate, resetEditor],
  );

  const handleDeleteCard = useCallback(
    async (cardKind: CardKind, entry: CampaignCardEntry) => {
      if (!window.confirm(ko.campaignLedger.confirmDeleteCard(entry.code))) {
        return;
      }

      const result = await mutate({ action: "deleteCampaignCard", cardKind, code: entry.code });

      if (!result) {
        setStatusText(ko.campaignLedger.deleteFail);
        setStatusTone("error");
        return;
      }

      if (activeSection === "card" && editingKey === entry.code && cardDraft.cardKind === cardKind) {
        resetEditor("card");
      }

      setStatusText(ko.campaignLedger.deleteOk);
      setStatusTone("success");
    },
    [activeSection, cardDraft.cardKind, editingKey, mutate, resetEditor],
  );

  const handleDeleteMystery = useCallback(
    async (entry: MysteryStickerEntry) => {
      if (!window.confirm(ko.campaignLedger.confirmDeleteMystery(entry.slotKey))) {
        return;
      }

      const result = await mutate({ action: "deleteMysterySticker", slotKey: entry.slotKey });

      if (!result) {
        setStatusText(ko.campaignLedger.deleteFail);
        setStatusTone("error");
        return;
      }

      if (editingKey === entry.slotKey) {
        resetEditor("mystery");
      }

      setStatusText(ko.campaignLedger.deleteOk);
      setStatusTone("success");
    },
    [editingKey, mutate, resetEditor],
  );

  const handleSave = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (activeSection === "envelope") {
        const code = envelopeDraft.code.trim();

        if (!code) {
          setStatusText(ko.campaignLedger.envelopeCodeRequired);
          setStatusTone("error");
          firstInputRef.current?.focus();
          return;
        }

        const result = await mutate({
          action: "saveCampaignEnvelope",
          envelope: {
            code,
            openedAt: envelopeDraft.openedAt.trim(),
            sourceDilemmaHistoryId: envelopeDraft.sourceDilemmaHistoryId.trim(),
            note: envelopeDraft.note.trim(),
            photos: envelopeDraft.photos,
          },
        });

        if (!result) {
          setStatusText(ko.campaignLedger.saveFail);
          setStatusTone("error");
          return;
        }

        resetEditor("envelope");
        setStatusText(editingEnvelope ? ko.campaignLedger.updateOk : ko.campaignLedger.addOk);
        setStatusTone("success");
        return;
      }

      if (activeSection === "card") {
        const code = cardDraft.code.trim();

        if (!code) {
          setStatusText(ko.campaignLedger.cardCodeRequired);
          setStatusTone("error");
          firstInputRef.current?.focus();
          return;
        }

        const result = await mutate({
          action: "saveCampaignCard",
          cardKind: cardDraft.cardKind,
          card: {
            code,
            status: cardDraft.status,
            sourceEnvelopeCode: cardDraft.sourceEnvelopeCode.trim(),
            sourceDilemmaHistoryId: cardDraft.sourceDilemmaHistoryId.trim(),
            note: cardDraft.note.trim(),
            photos: cardDraft.photos,
          },
        });

        if (!result) {
          setStatusText(ko.campaignLedger.saveFail);
          setStatusTone("error");
          return;
        }

        resetEditor("card");
        setStatusText(editingCard ? ko.campaignLedger.updateOk : ko.campaignLedger.addOk);
        setStatusTone("success");
        return;
      }

      const slotKey = mysteryDraft.slotKey.trim();
      const storylineSymbol = mysteryDraft.storylineSymbol.trim();

      if (!mysteryDraft.dossierLetter || !storylineSymbol || !slotKey) {
        setStatusText(ko.campaignLedger.mysteryRequired);
        setStatusTone("error");
        firstInputRef.current?.focus();
        return;
      }

      const result = await mutate({
        action: "saveMysterySticker",
        sticker: {
          dossierLetter: mysteryDraft.dossierLetter,
          storylineSymbol,
          slotKey,
          sourceDilemmaHistoryId: mysteryDraft.sourceDilemmaHistoryId.trim(),
          note: mysteryDraft.note.trim(),
          photos: mysteryDraft.photos,
        },
      });

      if (!result) {
        setStatusText(ko.campaignLedger.saveFail);
        setStatusTone("error");
        return;
      }

      resetEditor("mystery");
      setStatusText(editingMystery ? ko.campaignLedger.updateOk : ko.campaignLedger.addOk);
      setStatusTone("success");
    },
    [activeSection, cardDraft, editingCard, editingEnvelope, editingMystery, envelopeDraft, mysteryDraft, mutate, resetEditor],
  );

  useEffect(() => {
    if (!editingKey) {
      return;
    }

    const stillExists =
      (activeSection === "envelope" && editingEnvelope) ||
      (activeSection === "card" && editingCard) ||
      (activeSection === "mystery" && editingMystery);

    if (!stillExists) {
      queueMicrotask(() => resetEditor(activeSection));
    }
  }, [activeSection, editingCard, editingEnvelope, editingKey, editingMystery, resetEditor]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const focusRestoreEl = restoreFocusRef?.current ?? null;
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);

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
  }, [onClose, open, restoreFocusRef]);

  if (!open) {
    return null;
  }

  return (
    <div className="session-end-overlay" role="presentation">
      <section
        ref={dialogRef}
        className="session-end-dialog chronicle-ledger-dialog campaign-ledger-dialog"
        aria-labelledby="campaign-ledger-title"
        aria-modal="true"
        role="dialog"
      >
        <div className="session-end-heading">
          <span className="session-end-seal" aria-hidden="true">
            <TokenIcon type="sheet" />
          </span>
          <div>
            <p className="section-label">{ko.campaignLedger.section}</p>
            <h2 id="campaign-ledger-title">{ko.campaignLedger.title}</h2>
          </div>
        </div>
        <p className="session-end-copy">{ko.campaignLedger.copy}</p>

        <div className="chronicle-ledger-layout campaign-ledger-layout">
          <section className="chronicle-ledger-panel campaign-ledger-board" aria-labelledby="campaign-ledger-board-title">
            <div className="chronicle-ledger-panel-head">
              <div>
                <p className="section-label">{ko.campaignLedger.boardSection}</p>
                <h3 id="campaign-ledger-board-title">{ko.campaignLedger.boardTitle}</h3>
              </div>
            </div>

            <LedgerSection
              title={ko.campaignLedger.envelopesTitle}
              count={envelopes.length}
              active={activeSection === "envelope"}
              onAdd={() => switchSection("envelope")}
            >
              {envelopes.length ? (
                envelopes.map((entry) => (
                  <EnvelopeCard
                    key={entry.code}
                    entry={entry}
                    busy={busy}
                    editing={activeSection === "envelope" && editingKey === entry.code}
                    onDelete={handleDeleteEnvelope}
                    onEdit={beginEnvelopeEdit}
                  />
                ))
              ) : (
                <p className="chronicle-empty-row">{ko.campaignLedger.emptyEnvelopes}</p>
              )}
            </LedgerSection>

            <LedgerSection
              title={ko.campaignLedger.cardsTitle}
              count={storyCards.length + eventCards.length}
              active={activeSection === "card"}
              onAdd={() => switchSection("card")}
            >
              {storyCards.length || eventCards.length ? (
                <>
                  {storyCards.map((entry) => (
                    <CardEntryCard
                      key={`story-${entry.code}`}
                      cardKind="story"
                      entry={entry}
                      busy={busy}
                      editing={activeSection === "card" && cardDraft.cardKind === "story" && editingKey === entry.code}
                      onDelete={handleDeleteCard}
                      onEdit={beginCardEdit}
                    />
                  ))}
                  {eventCards.map((entry) => (
                    <CardEntryCard
                      key={`event-${entry.code}`}
                      cardKind="event"
                      entry={entry}
                      busy={busy}
                      editing={activeSection === "card" && cardDraft.cardKind === "event" && editingKey === entry.code}
                      onDelete={handleDeleteCard}
                      onEdit={beginCardEdit}
                    />
                  ))}
                </>
              ) : (
                <p className="chronicle-empty-row">{ko.campaignLedger.emptyCards}</p>
              )}
            </LedgerSection>

            <LedgerSection
              title={ko.campaignLedger.mysteryTitle}
              count={mysteryStickers.length}
              active={activeSection === "mystery"}
              onAdd={() => switchSection("mystery")}
            >
              {mysteryStickers.length ? (
                mysteryStickers.map((entry) => (
                  <MysteryCard
                    key={entry.slotKey}
                    entry={entry}
                    busy={busy}
                    editing={activeSection === "mystery" && editingKey === entry.slotKey}
                    onDelete={handleDeleteMystery}
                    onEdit={beginMysteryEdit}
                  />
                ))
              ) : (
                <p className="chronicle-empty-row">{ko.campaignLedger.emptyMystery}</p>
              )}
            </LedgerSection>
          </section>

          <form className="chronicle-ledger-panel chronicle-ledger-panel--editor" onSubmit={handleSave} aria-busy={busy}>
            <div className="chronicle-ledger-panel-head">
              <div>
                <p className="section-label">{editingKey ? ko.campaignLedger.editSection : ko.campaignLedger.addSection}</p>
                <h3>{ko.campaignLedger.editorTitle(activeSection)}</h3>
              </div>
              {editingKey ? (
                <button className="ghost-button" type="button" onClick={() => resetEditor(activeSection)} disabled={busy}>
                  <TokenIcon type="undo" />
                  {ko.campaignLedger.cancelEdit}
                </button>
              ) : null}
            </div>

            <div className="campaign-ledger-tabs" role="tablist" aria-label={ko.campaignLedger.sectionTabsLabel}>
              {(["envelope", "card", "mystery"] as SectionId[]).map((section) => (
                <button
                  key={section}
                  className={activeSection === section ? "active" : ""}
                  type="button"
                  role="tab"
                  aria-selected={activeSection === section}
                  onClick={() => switchSection(section)}
                  disabled={busy}
                >
                  {ko.campaignLedger.sectionTab(section)}
                </button>
              ))}
            </div>

            {activeSection === "envelope" ? (
              <div className="chronicle-ledger-form-grid">
                <label>
                  <span>{ko.campaignLedger.envelopeCodeLabel}</span>
                  <input
                    ref={firstInputRef}
                    value={envelopeDraft.code}
                    onChange={(event) => setEnvelopeDraft((current) => ({ ...current, code: event.target.value }))}
                    disabled={busy || Boolean(editingEnvelope)}
                    placeholder={ko.campaignLedger.envelopeCodePlaceholder}
                  />
                </label>
                <label>
                  <span>{ko.campaignLedger.openedAtLabel}</span>
                  <input
                    value={envelopeDraft.openedAt}
                    onChange={(event) => setEnvelopeDraft((current) => ({ ...current, openedAt: event.target.value }))}
                    disabled={busy}
                    placeholder={ko.campaignLedger.openedAtPlaceholder}
                  />
                </label>
                <SourceAndNoteFields
                  sourceValue={envelopeDraft.sourceDilemmaHistoryId}
                  noteValue={envelopeDraft.note}
                  busy={busy}
                  onSourceChange={(sourceDilemmaHistoryId) =>
                    setEnvelopeDraft((current) => ({ ...current, sourceDilemmaHistoryId }))
                  }
                  onNoteChange={(note) => setEnvelopeDraft((current) => ({ ...current, note }))}
                />
              </div>
            ) : null}

            {activeSection === "card" ? (
              <div className="chronicle-ledger-form-grid">
                <label>
                  <span>{ko.campaignLedger.cardKindLabel}</span>
                  <select
                    value={cardDraft.cardKind}
                    onChange={(event) => setCardDraft((current) => ({ ...current, cardKind: event.target.value as CardKind }))}
                    disabled={busy || Boolean(editingCard)}
                  >
                    <option value="story">{ko.campaignLedger.cardKindStory}</option>
                    <option value="event">{ko.campaignLedger.cardKindEvent}</option>
                  </select>
                </label>
                <label>
                  <span>{ko.campaignLedger.cardCodeLabel}</span>
                  <input
                    ref={firstInputRef}
                    value={cardDraft.code}
                    onChange={(event) => setCardDraft((current) => ({ ...current, code: event.target.value }))}
                    disabled={busy || Boolean(editingCard)}
                    placeholder={ko.campaignLedger.cardCodePlaceholder}
                  />
                </label>
                <label>
                  <span>{ko.campaignLedger.cardStatusLabel}</span>
                  <select
                    value={cardDraft.status}
                    onChange={(event) => setCardDraft((current) => ({ ...current, status: event.target.value as CampaignCardStatus }))}
                    disabled={busy}
                  >
                    <option value="active">{ko.campaignLedger.statusActive}</option>
                    <option value="completed">{ko.campaignLedger.statusCompleted}</option>
                    <option value="archived">{ko.campaignLedger.statusArchived}</option>
                  </select>
                </label>
                <label>
                  <span>{ko.campaignLedger.sourceEnvelopeLabel}</span>
                  <input
                    value={cardDraft.sourceEnvelopeCode}
                    onChange={(event) => setCardDraft((current) => ({ ...current, sourceEnvelopeCode: event.target.value }))}
                    disabled={busy}
                    placeholder={ko.campaignLedger.sourceEnvelopePlaceholder}
                  />
                </label>
                <SourceAndNoteFields
                  sourceValue={cardDraft.sourceDilemmaHistoryId}
                  noteValue={cardDraft.note}
                  busy={busy}
                  onSourceChange={(sourceDilemmaHistoryId) => setCardDraft((current) => ({ ...current, sourceDilemmaHistoryId }))}
                  onNoteChange={(note) => setCardDraft((current) => ({ ...current, note }))}
                />
              </div>
            ) : null}

            {activeSection === "mystery" ? (
              <>
                <div className="chronicle-ledger-form-grid">
                  <label>
                    <span>{ko.campaignLedger.dossierLabel}</span>
                    <select
                      value={mysteryDraft.dossierLetter}
                      onChange={(event) => setMysteryDraft((current) => ({ ...current, dossierLetter: event.target.value }))}
                      disabled={busy}
                    >
                      {DOSSIER_LETTERS.map((letter) => (
                        <option value={letter} key={letter}>
                          {letter}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>{ko.campaignLedger.storylineSymbolLabel}</span>
                    <input
                      value={mysteryDraft.storylineSymbol}
                      onChange={(event) => setMysteryDraft((current) => ({ ...current, storylineSymbol: event.target.value }))}
                      disabled={busy}
                      placeholder={ko.campaignLedger.storylineSymbolPlaceholder}
                    />
                  </label>
                  <label>
                    <span>{ko.campaignLedger.slotKeyLabel}</span>
                    <input
                      ref={firstInputRef}
                      value={mysteryDraft.slotKey}
                      onChange={(event) => setMysteryDraft((current) => ({ ...current, slotKey: event.target.value }))}
                      disabled={busy || Boolean(editingMystery)}
                      placeholder={ko.campaignLedger.slotKeyPlaceholder}
                    />
                  </label>
                  <SourceAndNoteFields
                    sourceValue={mysteryDraft.sourceDilemmaHistoryId}
                    noteValue={mysteryDraft.note}
                    busy={busy}
                    onSourceChange={(sourceDilemmaHistoryId) =>
                      setMysteryDraft((current) => ({ ...current, sourceDilemmaHistoryId }))
                    }
                    onNoteChange={(note) => setMysteryDraft((current) => ({ ...current, note }))}
                  />
                </div>
                {mysteryWarningActive ? (
                  <div className="chronicle-preview campaign-ledger-warning" role="note">
                    <strong>{ko.campaignLedger.envelope70WarningTitle}</strong>
                    <span>{ko.campaignLedger.envelope70WarningBody}</span>
                  </div>
                ) : null}
              </>
            ) : null}

            <DilemmaPhotoUploader
              busy={busy}
              photoBusy={photoBusy}
              error={photoError}
              photos={currentPhotos}
              onAddPhotos={addPhotos}
              onRemovePhoto={removePhoto}
              copy={ledgerPhotoUploaderCopy}
            />

            {statusText ? (
              <p className={`chronicle-ledger-status chronicle-ledger-status--${statusTone}`} aria-live="polite">
                {statusText}
              </p>
            ) : null}

            <div className="session-end-actions chronicle-ledger-actions">
              <button className="primary-button" type="submit" disabled={busy}>
                <TokenIcon type={editingKey ? "save" : "plus"} />
                {editingKey ? ko.campaignLedger.saveEdit : ko.campaignLedger.saveAdd}
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

function LedgerSection({
  title,
  count,
  active,
  children,
  onAdd,
}: {
  title: string;
  count: number;
  active: boolean;
  children: React.ReactNode;
  onAdd: () => void;
}) {
  return (
    <section className={`chronicle-resource-card campaign-ledger-section${active ? " active" : ""}`}>
      <header className="chronicle-resource-head">
        <div>
          <h4>{title}</h4>
          <p>{ko.campaignLedger.countSummary(count)}</p>
        </div>
        <button className="ghost-button" type="button" onClick={onAdd}>
          <TokenIcon type="plus" />
          {ko.campaignLedger.addButton}
        </button>
      </header>
      <div className="chronicle-sticker-list">{children}</div>
    </section>
  );
}

function SourceAndNoteFields({
  sourceValue,
  noteValue,
  busy,
  onSourceChange,
  onNoteChange,
}: {
  sourceValue: string;
  noteValue: string;
  busy: boolean;
  onSourceChange: (value: string) => void;
  onNoteChange: (value: string) => void;
}) {
  return (
    <>
      <label>
        <span>{ko.campaignLedger.sourceHistoryLabel}</span>
        <input
          value={sourceValue}
          onChange={(event) => onSourceChange(event.target.value)}
          disabled={busy}
          placeholder={ko.campaignLedger.sourceHistoryPlaceholder}
        />
      </label>
      <label className="chronicle-ledger-form-grid__full">
        <span>{ko.campaignLedger.noteLabel}</span>
        <textarea
          value={noteValue}
          onChange={(event) => onNoteChange(event.target.value)}
          disabled={busy}
          rows={4}
          placeholder={ko.campaignLedger.notePlaceholder}
        />
      </label>
    </>
  );
}

function EnvelopeCard({
  entry,
  busy,
  editing,
  onDelete,
  onEdit,
}: {
  entry: CampaignEnvelopeEntry;
  busy: boolean;
  editing: boolean;
  onDelete: (entry: CampaignEnvelopeEntry) => void;
  onEdit: (entry: CampaignEnvelopeEntry) => void;
}) {
  return (
    <article className={`chronicle-sticker-card campaign-ledger-entry${editing ? " editing" : ""}`}>
      <EntryHead title={entry.code} badge={ko.campaignLedger.envelopeBadge} busy={busy} onDelete={() => onDelete(entry)} onEdit={() => onEdit(entry)} />
      <MetaGrid
        items={[
          [ko.campaignLedger.openedAtLabel, entryTime(entry.openedAt)],
          [ko.campaignLedger.sourceHistoryLabel, entry.sourceDilemmaHistoryId || ko.common.none],
        ]}
      />
      <EntryNote note={entry.note} />
      <RecordPhotoStrip photos={entry.photos || []} />
    </article>
  );
}

function CardEntryCard({
  cardKind,
  entry,
  busy,
  editing,
  onDelete,
  onEdit,
}: {
  cardKind: CardKind;
  entry: CampaignCardEntry;
  busy: boolean;
  editing: boolean;
  onDelete: (cardKind: CardKind, entry: CampaignCardEntry) => void;
  onEdit: (cardKind: CardKind, entry: CampaignCardEntry) => void;
}) {
  return (
    <article className={`chronicle-sticker-card campaign-ledger-entry${editing ? " editing" : ""}`}>
      <EntryHead
        title={entry.code}
        badge={cardKind === "story" ? ko.campaignLedger.cardKindStory : ko.campaignLedger.cardKindEvent}
        busy={busy}
        onDelete={() => onDelete(cardKind, entry)}
        onEdit={() => onEdit(cardKind, entry)}
      />
      <MetaGrid
        items={[
          [ko.campaignLedger.cardStatusLabel, ko.campaignLedger.statusText(entry.status)],
          [ko.campaignLedger.sourceEnvelopeLabel, entry.sourceEnvelopeCode || ko.common.none],
          [ko.campaignLedger.sourceHistoryLabel, entry.sourceDilemmaHistoryId || ko.common.none],
          [ko.campaignLedger.updatedAtLabel, entryTime(entry.updatedAt)],
        ]}
      />
      <EntryNote note={entry.note} />
      <RecordPhotoStrip photos={entry.photos || []} />
    </article>
  );
}

function MysteryCard({
  entry,
  busy,
  editing,
  onDelete,
  onEdit,
}: {
  entry: MysteryStickerEntry;
  busy: boolean;
  editing: boolean;
  onDelete: (entry: MysteryStickerEntry) => void;
  onEdit: (entry: MysteryStickerEntry) => void;
}) {
  return (
    <article className={`chronicle-sticker-card campaign-ledger-entry${editing ? " editing" : ""}`}>
      <EntryHead
        title={ko.campaignLedger.mysteryEntryTitle(entry.dossierLetter, entry.storylineSymbol, entry.slotKey)}
        badge={ko.campaignLedger.mysteryBadge}
        busy={busy}
        onDelete={() => onDelete(entry)}
        onEdit={() => onEdit(entry)}
      />
      <MetaGrid
        items={[
          [ko.campaignLedger.dossierLabel, entry.dossierLetter],
          [ko.campaignLedger.storylineSymbolLabel, entry.storylineSymbol],
          [ko.campaignLedger.slotKeyLabel, entry.slotKey],
          [ko.campaignLedger.sourceHistoryLabel, entry.sourceDilemmaHistoryId || ko.common.none],
          [ko.campaignLedger.attachedAtLabel, entryTime(entry.attachedAt)],
        ]}
      />
      <EntryNote note={entry.note} />
      <RecordPhotoStrip photos={entry.photos || []} />
    </article>
  );
}

function EntryHead({
  title,
  badge,
  busy,
  onDelete,
  onEdit,
}: {
  title: string;
  badge: string;
  busy: boolean;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="chronicle-sticker-card__head">
      <div className="chronicle-sticker-card__title">
        <span className="chronicle-slot-badge">{badge}</span>
        <strong>{title}</strong>
      </div>
      <div className="chronicle-sticker-card__actions">
        <button className="ghost-button" type="button" onClick={onEdit} disabled={busy}>
          <TokenIcon type="edit" />
          {ko.campaignLedger.editButton}
        </button>
        <button className="ghost-button danger-button" type="button" onClick={onDelete} disabled={busy}>
          <TokenIcon type="trash" />
          {ko.common.delete}
        </button>
      </div>
    </div>
  );
}

function MetaGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <dl className="chronicle-sticker-meta">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function EntryNote({ note }: { note: string }) {
  return note ? <p className="chronicle-sticker-note">{note}</p> : null;
}



