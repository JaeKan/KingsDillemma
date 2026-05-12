import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  assignOpenAgendasFromChronicles,
  calculateLegacyResourceDeltas,
  type CampaignCardStatus,
  type ChronicleLedger,
  type ChroniclePolarity,
  type ChronicleResourceId,
} from "../../shared/chronicle-ledger.mts";
import { ko, openAgendaTokenTypes, resourceCounters } from "../resources/gameResources";
import type { RecordAttachment } from "../types/game";
import { createRecordPhotoAttachments } from "../utils/photo-attachments";
import { DilemmaPhotoUploader, ledgerPhotoUploaderCopy } from "./DilemmaPhotoUploader";
import { TokenIcon } from "./GameIcons";

type CampaignBackfillDialogProps = {
  open: boolean;
  state: any;
  busy: boolean;
  mutate: (payload: Record<string, unknown>) => Promise<unknown>;
  onClose: () => void;
  restoreFocusRef: React.RefObject<HTMLElement>;
};

type ChronicleDraft = {
  rowId: string;
  stickerCode: string;
  resourceId: ChronicleResourceId;
  polarity: ChroniclePolarity;
  signedByHouseId: string;
  signedByName: string;
  ageMarks: string;
  slotIndex: string;
  sourceDilemmaHistoryId: string;
  sourceCardCode: string;
  note: string;
  photos: RecordAttachment[];
};

type EnvelopeDraft = {
  rowId: string;
  code: string;
  openedAt: string;
  sourceDilemmaHistoryId: string;
  note: string;
  photos: RecordAttachment[];
};

type CardDraft = {
  rowId: string;
  cardKind: "story" | "event";
  code: string;
  status: CampaignCardStatus;
  sourceEnvelopeCode: string;
  sourceDilemmaHistoryId: string;
  note: string;
  photos: RecordAttachment[];
};

type MysteryDraft = {
  rowId: string;
  dossierLetter: string;
  storylineSymbol: string;
  slotKey: string;
  sourceDilemmaHistoryId: string;
  note: string;
  photos: RecordAttachment[];
};

type DraftSection = "chronicle" | "envelope" | "card" | "mystery";

const DOSSIER_LETTERS = Array.from({ length: 12 }, (_, index) => String.fromCharCode(65 + index));
const DEFAULT_RESOURCE_ID = resourceCounters[0].id as ChronicleResourceId;
let draftRowCounter = 0;

function nextRowId(prefix: string) {
  draftRowCounter += 1;
  return `${prefix}-${draftRowCounter}`;
}

function getParticipatingHouses(state: any) {
  const houses = Array.isArray(state?.houses) ? state.houses : [];
  const active = houses.filter((house: any) => house?.hasPassword || house?.hasChosen || house?.hasSession);
  return active.length ? active : houses;
}

function getHouseName(houses: any[], houseId: string) {
  const house = houses.find((candidate) => candidate?.id === houseId);
  return house?.name || house?.koreanTitle || houseId || ko.common.notSpecified;
}

function createChronicleDraft(houseId = ""): ChronicleDraft {
  return {
    rowId: nextRowId("chronicle"),
    stickerCode: "",
    resourceId: DEFAULT_RESOURCE_ID,
    polarity: "positive",
    signedByHouseId: houseId,
    signedByName: "",
    ageMarks: "0",
    slotIndex: "",
    sourceDilemmaHistoryId: "",
    sourceCardCode: "",
    note: "",
    photos: [],
  };
}

function createEnvelopeDraft(): EnvelopeDraft {
  return {
    rowId: nextRowId("envelope"),
    code: "",
    openedAt: "",
    sourceDilemmaHistoryId: "",
    note: "",
    photos: [],
  };
}

function createCardDraft(cardKind: "story" | "event" = "story"): CardDraft {
  return {
    rowId: nextRowId("card"),
    cardKind,
    code: "",
    status: "active",
    sourceEnvelopeCode: "",
    sourceDilemmaHistoryId: "",
    note: "",
    photos: [],
  };
}

function createMysteryDraft(): MysteryDraft {
  return {
    rowId: nextRowId("mystery"),
    dossierLetter: "A",
    storylineSymbol: "",
    slotKey: "",
    sourceDilemmaHistoryId: "",
    note: "",
    photos: [],
  };
}

function createEmptyLedger(): ChronicleLedger {
  return {
    influence: [],
    wealth: [],
    morale: [],
    welfare: [],
    knowledge: [],
  };
}

function clampAgeMarks(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(6, Math.trunc(parsed))) : 0;
}

function parseSlotIndex(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed) - 1) : undefined;
}

function hasFinalSlotSignal(slotKey: string) {
  const normalized = slotKey.trim().toLowerCase();
  return /\b6\b/.test(normalized) || normalized.includes("final") || normalized.includes("finale") || normalized.includes("최종") || normalized.includes("마지막");
}

function formatLegacyDelta(delta: number) {
  return delta > 0 ? ko.campaignBackfill.legacyUp(delta) : delta < 0 ? ko.campaignBackfill.legacyDown(Math.abs(delta)) : ko.campaignBackfill.legacyNone;
}

export default function CampaignBackfillDialog({
  open,
  state,
  busy,
  mutate,
  onClose,
  restoreFocusRef,
}: CampaignBackfillDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const houses = useMemo(() => getParticipatingHouses(state), [state]);
  const defaultHouseId = state?.currentHouseId || houses[0]?.id || "";
  const [activeSection, setActiveSection] = useState<DraftSection>("chronicle");
  const [chronicleEntries, setChronicleEntries] = useState<ChronicleDraft[]>(() => [createChronicleDraft(defaultHouseId)]);
  const [envelopes, setEnvelopes] = useState<EnvelopeDraft[]>(() => [createEnvelopeDraft()]);
  const [cards, setCards] = useState<CardDraft[]>(() => [createCardDraft("story")]);
  const [mysteryStickers, setMysteryStickers] = useState<MysteryDraft[]>(() => [createMysteryDraft()]);
  const [confirmed, setConfirmed] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [statusTone, setStatusTone] = useState<"info" | "success" | "error">("info");

  const draftLedger = useMemo(() => buildDraftLedger(chronicleEntries, houses), [chronicleEntries, houses]);
  const participatingHouseIds = useMemo(() => houses.map((house: any) => house.id).filter(Boolean), [houses]);
  const legacyDeltas = useMemo(() => calculateLegacyResourceDeltas(draftLedger), [draftLedger]);
  const openAgendaAssignments = useMemo(
    () => assignOpenAgendasFromChronicles(draftLedger, participatingHouseIds),
    [draftLedger, participatingHouseIds],
  );
  const nonEmptyCounts = useMemo(() => ({
    chronicle: chronicleEntries.filter((entry) => entry.stickerCode.trim()).length,
    envelopes: envelopes.filter((entry) => entry.code.trim()).length,
    storyCards: cards.filter((entry) => entry.cardKind === "story" && entry.code.trim()).length,
    eventCards: cards.filter((entry) => entry.cardKind === "event" && entry.code.trim()).length,
    mystery: mysteryStickers.filter((entry) => entry.slotKey.trim()).length,
  }), [cards, chronicleEntries, envelopes, mysteryStickers]);
  const envelope70Warning = nonEmptyCounts.mystery >= 6 || mysteryStickers.some((entry) => hasFinalSlotSignal(entry.slotKey));
  const currentCounts = useMemo(() => ({
    chronicle: Object.values(state?.chronicleLedger || {}).flat().length,
    envelopes: Object.keys(state?.campaignLedger?.openedEnvelopes || {}).length,
    storyCards: Object.keys(state?.campaignLedger?.storyCards || {}).length,
    eventCards: Object.keys(state?.campaignLedger?.eventCards || {}).length,
    mystery: Object.keys(state?.campaignLedger?.mysteryStickers || {}).length,
  }), [state]);
  const canApply = confirmed && !busy;

  const addChronicle = useCallback(() => setChronicleEntries((current) => [...current, createChronicleDraft(defaultHouseId)]), [defaultHouseId]);
  const addEnvelope = useCallback(() => setEnvelopes((current) => [...current, createEnvelopeDraft()]), []);
  const addCard = useCallback(() => setCards((current) => [...current, createCardDraft(current.at(-1)?.cardKind || "story")]), []);
  const addMystery = useCallback(() => setMysteryStickers((current) => [...current, createMysteryDraft()]), []);

  const applyBackfill = useCallback(async () => {
    if (!confirmed || busy) {
      return;
    }

    setStatusText("");
    const result = await mutate({
      action: "applyCampaignBackfill",
      backfill: {
        chronicleEntries: chronicleEntries.map(toChroniclePayload),
        envelopes: envelopes.map(toEnvelopePayload),
        storyCards: cards.filter((entry) => entry.cardKind === "story").map(toCardPayload),
        eventCards: cards.filter((entry) => entry.cardKind === "event").map(toCardPayload),
        mysteryStickers: mysteryStickers.map(toMysteryPayload),
      },
    });

    if (!result) {
      setStatusText(ko.campaignBackfill.applyFail);
      setStatusTone("error");
      return;
    }

    setStatusText(ko.campaignBackfill.applyOk);
    setStatusTone("success");
    setConfirmed(false);
  }, [busy, cards, chronicleEntries, confirmed, envelopes, mysteryStickers, mutate]);

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
      window.setTimeout(() => focusRestoreEl?.focus(), 0);
    };
  }, [onClose, open, restoreFocusRef]);

  if (!open) {
    return null;
  }

  return (
    <div className="session-end-overlay" role="presentation">
      <section
        ref={dialogRef}
        className="session-end-dialog chronicle-ledger-dialog campaign-ledger-dialog campaign-backfill-dialog"
        aria-labelledby="campaign-backfill-title"
        aria-modal="true"
        role="dialog"
      >
        <div className="session-end-heading">
          <span className="session-end-seal" aria-hidden="true">
            <TokenIcon type="sheet" />
          </span>
          <div>
            <p className="section-label">{ko.campaignBackfill.section}</p>
            <h2 id="campaign-backfill-title">{ko.campaignBackfill.title}</h2>
          </div>
        </div>
        <p className="session-end-copy">{ko.campaignBackfill.copy}</p>

        <div className="campaign-backfill-tabs" role="tablist" aria-label={ko.campaignBackfill.tabsLabel}>
          {(["chronicle", "envelope", "card", "mystery"] as DraftSection[]).map((section) => (
            <button
              key={section}
              className={activeSection === section ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={activeSection === section}
              onClick={() => setActiveSection(section)}
              disabled={busy}
            >
              {ko.campaignBackfill.tab(section)}
            </button>
          ))}
        </div>

        <div className="chronicle-ledger-layout campaign-backfill-layout">
          <section className="chronicle-ledger-panel campaign-backfill-editor" aria-labelledby="campaign-backfill-editor-title">
            <div className="chronicle-ledger-panel-head">
              <div>
                <p className="section-label">{ko.campaignBackfill.inputSection}</p>
                <h3 id="campaign-backfill-editor-title">{ko.campaignBackfill.editorTitle(activeSection)}</h3>
              </div>
              <AddButton section={activeSection} busy={busy} onChronicle={addChronicle} onEnvelope={addEnvelope} onCard={addCard} onMystery={addMystery} />
            </div>

            {activeSection === "chronicle" ? (
              <div className="campaign-backfill-row-list">
                {chronicleEntries.map((entry, index) => (
                  <ChronicleRow
                    key={entry.rowId}
                    entry={entry}
                    houses={houses}
                    busy={busy}
                    firstInputRef={index === 0 ? firstInputRef : undefined}
                    onChange={(patch) => setChronicleEntries((current) => updateByRowId(current, entry.rowId, patch))}
                    onRemove={() => setChronicleEntries((current) => removeByRowId(current, entry.rowId, createChronicleDraft(defaultHouseId)))}
                  />
                ))}
              </div>
            ) : null}

            {activeSection === "envelope" ? (
              <div className="campaign-backfill-row-list">
                {envelopes.map((entry, index) => (
                  <EnvelopeRow
                    key={entry.rowId}
                    entry={entry}
                    busy={busy}
                    firstInputRef={index === 0 ? firstInputRef : undefined}
                    onChange={(patch) => setEnvelopes((current) => updateByRowId(current, entry.rowId, patch))}
                    onRemove={() => setEnvelopes((current) => removeByRowId(current, entry.rowId, createEnvelopeDraft()))}
                  />
                ))}
              </div>
            ) : null}

            {activeSection === "card" ? (
              <div className="campaign-backfill-row-list">
                {cards.map((entry, index) => (
                  <CardRow
                    key={entry.rowId}
                    entry={entry}
                    busy={busy}
                    firstInputRef={index === 0 ? firstInputRef : undefined}
                    onChange={(patch) => setCards((current) => updateByRowId(current, entry.rowId, patch))}
                    onRemove={() => setCards((current) => removeByRowId(current, entry.rowId, createCardDraft()))}
                  />
                ))}
              </div>
            ) : null}

            {activeSection === "mystery" ? (
              <div className="campaign-backfill-row-list">
                {mysteryStickers.map((entry, index) => (
                  <MysteryRow
                    key={entry.rowId}
                    entry={entry}
                    busy={busy}
                    firstInputRef={index === 0 ? firstInputRef : undefined}
                    onChange={(patch) => setMysteryStickers((current) => updateByRowId(current, entry.rowId, patch))}
                    onRemove={() => setMysteryStickers((current) => removeByRowId(current, entry.rowId, createMysteryDraft()))}
                  />
                ))}
              </div>
            ) : null}
          </section>

          <aside className="chronicle-ledger-panel campaign-backfill-preview" aria-labelledby="campaign-backfill-preview-title">
            <div className="chronicle-ledger-panel-head">
              <div>
                <p className="section-label">{ko.campaignBackfill.previewSection}</p>
                <h3 id="campaign-backfill-preview-title">{ko.campaignBackfill.previewTitle}</h3>
              </div>
            </div>

            <div className="campaign-backfill-counts">
              <strong>{ko.campaignBackfill.replaceTitle}</strong>
              <span>{ko.campaignBackfill.replaceCount("연대기", currentCounts.chronicle, nonEmptyCounts.chronicle)}</span>
              <span>{ko.campaignBackfill.replaceCount("봉투", currentCounts.envelopes, nonEmptyCounts.envelopes)}</span>
              <span>{ko.campaignBackfill.replaceCount("스토리 카드", currentCounts.storyCards, nonEmptyCounts.storyCards)}</span>
              <span>{ko.campaignBackfill.replaceCount("이벤트 카드", currentCounts.eventCards, nonEmptyCounts.eventCards)}</span>
              <span>{ko.campaignBackfill.replaceCount("미스터리 스티커", currentCounts.mystery, nonEmptyCounts.mystery)}</span>
            </div>

            <PreviewLegacyDeltas deltas={legacyDeltas} />
            <PreviewAssignments assignments={openAgendaAssignments} houses={houses} />

            {envelope70Warning ? (
              <div className="chronicle-preview campaign-ledger-warning" role="note">
                <strong>{ko.campaignBackfill.envelope70Title}</strong>
                <span>{ko.campaignBackfill.envelope70Body}</span>
              </div>
            ) : null}

            <div className="chronicle-preview chronicle-preview--static">
              <strong>{ko.campaignBackfill.spoilerSafeTitle}</strong>
              <span>{ko.campaignBackfill.spoilerSafeBody}</span>
            </div>

            <label className="session-end-check campaign-backfill-confirm">
              <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={busy} />
              <span>{ko.campaignBackfill.confirmReplace}</span>
            </label>

            {statusText ? (
              <p className={`chronicle-ledger-status chronicle-ledger-status--${statusTone}`} aria-live="polite">
                {statusText}
              </p>
            ) : null}

            <div className="session-end-actions chronicle-ledger-actions">
              <button className="primary-button" type="button" disabled={!canApply} onClick={() => void applyBackfill()}>
                <TokenIcon type="save" />
                {busy ? ko.common.saving : ko.campaignBackfill.apply}
              </button>
              <button ref={closeButtonRef} className="ghost-button" type="button" onClick={onClose}>
                {ko.common.close}
              </button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function AddButton({
  section,
  busy,
  onChronicle,
  onEnvelope,
  onCard,
  onMystery,
}: {
  section: DraftSection;
  busy: boolean;
  onChronicle: () => void;
  onEnvelope: () => void;
  onCard: () => void;
  onMystery: () => void;
}) {
  const handlers = {
    chronicle: onChronicle,
    envelope: onEnvelope,
    card: onCard,
    mystery: onMystery,
  };

  return (
    <button className="ghost-button" type="button" onClick={handlers[section]} disabled={busy}>
      <TokenIcon type="plus" />
      {ko.campaignBackfill.addRow}
    </button>
  );
}

function ChronicleRow({
  entry,
  houses,
  busy,
  firstInputRef,
  onChange,
  onRemove,
}: {
  entry: ChronicleDraft;
  houses: any[];
  busy: boolean;
  firstInputRef?: React.RefObject<HTMLInputElement | null>;
  onChange: (patch: Partial<ChronicleDraft>) => void;
  onRemove: () => void;
}) {
  return (
    <article className="chronicle-resource-card campaign-backfill-row">
      <RowHead title={entry.stickerCode || ko.campaignBackfill.newChronicleRow} onRemove={onRemove} busy={busy} />
      <div className="chronicle-ledger-form-grid">
        <label>
          <span>{ko.chronicleLedger.resourceLabel}</span>
          <select value={entry.resourceId} onChange={(event) => onChange({ resourceId: event.target.value as ChronicleResourceId })} disabled={busy}>
            {resourceCounters.map((resource) => <option value={resource.id} key={resource.id}>{resource.label}</option>)}
          </select>
        </label>
        <label>
          <span>{ko.chronicleLedger.polarityLabel}</span>
          <select value={entry.polarity} onChange={(event) => onChange({ polarity: event.target.value as ChroniclePolarity })} disabled={busy}>
            <option value="positive">{ko.chronicleLedger.polarityPositive}</option>
            <option value="negative">{ko.chronicleLedger.polarityNegative}</option>
          </select>
        </label>
        <label>
          <span>{ko.chronicleLedger.stickerCodeLabel}</span>
          <input ref={firstInputRef} value={entry.stickerCode} onChange={(event) => onChange({ stickerCode: event.target.value })} disabled={busy} placeholder={ko.chronicleLedger.stickerCodePlaceholder} />
        </label>
        <label>
          <span>{ko.chronicleLedger.signerLabel}</span>
          <select value={entry.signedByHouseId} onChange={(event) => onChange({ signedByHouseId: event.target.value })} disabled={busy}>
            <option value="">{ko.common.notSpecified}</option>
            {houses.map((house: any) => <option value={house.id} key={house.id}>{house.name || house.koreanTitle || house.id}</option>)}
          </select>
        </label>
        <label>
          <span>{ko.campaignBackfill.signedByNameLabel}</span>
          <input value={entry.signedByName} onChange={(event) => onChange({ signedByName: event.target.value })} disabled={busy} placeholder={ko.campaignBackfill.signedByNamePlaceholder} />
        </label>
        <label>
          <span>{ko.chronicleLedger.ageMarksLabel}</span>
          <input type="number" min="0" max="6" value={entry.ageMarks} onChange={(event) => onChange({ ageMarks: event.target.value })} disabled={busy} />
        </label>
        <label>
          <span>{ko.campaignBackfill.slotIndexLabel}</span>
          <input type="number" min="1" max="5" value={entry.slotIndex} onChange={(event) => onChange({ slotIndex: event.target.value })} disabled={busy} placeholder={ko.campaignBackfill.slotIndexPlaceholder} />
        </label>
        <label>
          <span>{ko.chronicleLedger.sourceCardCodeLabel}</span>
          <input value={entry.sourceCardCode} onChange={(event) => onChange({ sourceCardCode: event.target.value })} disabled={busy} placeholder={ko.chronicleLedger.sourceCardCodePlaceholder} />
        </label>
        <SourceAndNoteFields sourceValue={entry.sourceDilemmaHistoryId} noteValue={entry.note} busy={busy} onSourceChange={(sourceDilemmaHistoryId) => onChange({ sourceDilemmaHistoryId })} onNoteChange={(note) => onChange({ note })} />
      </div>
      <BackfillPhotoUploader photos={entry.photos} busy={busy} onChange={(photos) => onChange({ photos })} />
    </article>
  );
}

function EnvelopeRow({ entry, busy, firstInputRef, onChange, onRemove }: { entry: EnvelopeDraft; busy: boolean; firstInputRef?: React.RefObject<HTMLInputElement | null>; onChange: (patch: Partial<EnvelopeDraft>) => void; onRemove: () => void }) {
  return (
    <article className="chronicle-resource-card campaign-backfill-row">
      <RowHead title={entry.code || ko.campaignBackfill.newEnvelopeRow} onRemove={onRemove} busy={busy} />
      <div className="chronicle-ledger-form-grid">
        <label>
          <span>{ko.campaignLedger.envelopeCodeLabel}</span>
          <input ref={firstInputRef} value={entry.code} onChange={(event) => onChange({ code: event.target.value })} disabled={busy} placeholder={ko.campaignLedger.envelopeCodePlaceholder} />
        </label>
        <label>
          <span>{ko.campaignLedger.openedAtLabel}</span>
          <input value={entry.openedAt} onChange={(event) => onChange({ openedAt: event.target.value })} disabled={busy} placeholder={ko.campaignLedger.openedAtPlaceholder} />
        </label>
        <SourceAndNoteFields sourceValue={entry.sourceDilemmaHistoryId} noteValue={entry.note} busy={busy} onSourceChange={(sourceDilemmaHistoryId) => onChange({ sourceDilemmaHistoryId })} onNoteChange={(note) => onChange({ note })} />
      </div>
      <BackfillPhotoUploader photos={entry.photos} busy={busy} onChange={(photos) => onChange({ photos })} />
    </article>
  );
}

function CardRow({ entry, busy, firstInputRef, onChange, onRemove }: { entry: CardDraft; busy: boolean; firstInputRef?: React.RefObject<HTMLInputElement | null>; onChange: (patch: Partial<CardDraft>) => void; onRemove: () => void }) {
  return (
    <article className="chronicle-resource-card campaign-backfill-row">
      <RowHead title={entry.code || ko.campaignBackfill.newCardRow} onRemove={onRemove} busy={busy} />
      <div className="chronicle-ledger-form-grid">
        <label>
          <span>{ko.campaignLedger.cardKindLabel}</span>
          <select value={entry.cardKind} onChange={(event) => onChange({ cardKind: event.target.value as "story" | "event" })} disabled={busy}>
            <option value="story">{ko.campaignLedger.cardKindStory}</option>
            <option value="event">{ko.campaignLedger.cardKindEvent}</option>
          </select>
        </label>
        <label>
          <span>{ko.campaignLedger.cardCodeLabel}</span>
          <input ref={firstInputRef} value={entry.code} onChange={(event) => onChange({ code: event.target.value })} disabled={busy} placeholder={ko.campaignLedger.cardCodePlaceholder} />
        </label>
        <label>
          <span>{ko.campaignLedger.cardStatusLabel}</span>
          <select value={entry.status} onChange={(event) => onChange({ status: event.target.value as CampaignCardStatus })} disabled={busy}>
            <option value="active">{ko.campaignLedger.statusActive}</option>
            <option value="completed">{ko.campaignLedger.statusCompleted}</option>
            <option value="archived">{ko.campaignLedger.statusArchived}</option>
          </select>
        </label>
        <label>
          <span>{ko.campaignLedger.sourceEnvelopeLabel}</span>
          <input value={entry.sourceEnvelopeCode} onChange={(event) => onChange({ sourceEnvelopeCode: event.target.value })} disabled={busy} placeholder={ko.campaignLedger.sourceEnvelopePlaceholder} />
        </label>
        <SourceAndNoteFields sourceValue={entry.sourceDilemmaHistoryId} noteValue={entry.note} busy={busy} onSourceChange={(sourceDilemmaHistoryId) => onChange({ sourceDilemmaHistoryId })} onNoteChange={(note) => onChange({ note })} />
      </div>
      <BackfillPhotoUploader photos={entry.photos} busy={busy} onChange={(photos) => onChange({ photos })} />
    </article>
  );
}

function MysteryRow({ entry, busy, firstInputRef, onChange, onRemove }: { entry: MysteryDraft; busy: boolean; firstInputRef?: React.RefObject<HTMLInputElement | null>; onChange: (patch: Partial<MysteryDraft>) => void; onRemove: () => void }) {
  return (
    <article className="chronicle-resource-card campaign-backfill-row">
      <RowHead title={entry.slotKey || ko.campaignBackfill.newMysteryRow} onRemove={onRemove} busy={busy} />
      <div className="chronicle-ledger-form-grid">
        <label>
          <span>{ko.campaignLedger.dossierLabel}</span>
          <select value={entry.dossierLetter} onChange={(event) => onChange({ dossierLetter: event.target.value })} disabled={busy}>
            {DOSSIER_LETTERS.map((letter) => <option value={letter} key={letter}>{letter}</option>)}
          </select>
        </label>
        <label>
          <span>{ko.campaignLedger.storylineSymbolLabel}</span>
          <input value={entry.storylineSymbol} onChange={(event) => onChange({ storylineSymbol: event.target.value })} disabled={busy} placeholder={ko.campaignLedger.storylineSymbolPlaceholder} />
        </label>
        <label>
          <span>{ko.campaignLedger.slotKeyLabel}</span>
          <input ref={firstInputRef} value={entry.slotKey} onChange={(event) => onChange({ slotKey: event.target.value })} disabled={busy} placeholder={ko.campaignLedger.slotKeyPlaceholder} />
        </label>
        <SourceAndNoteFields sourceValue={entry.sourceDilemmaHistoryId} noteValue={entry.note} busy={busy} onSourceChange={(sourceDilemmaHistoryId) => onChange({ sourceDilemmaHistoryId })} onNoteChange={(note) => onChange({ note })} />
      </div>
      <BackfillPhotoUploader photos={entry.photos} busy={busy} onChange={(photos) => onChange({ photos })} />
    </article>
  );
}

function BackfillPhotoUploader({
  photos,
  busy,
  onChange,
}: {
  photos: RecordAttachment[];
  busy: boolean;
  onChange: (photos: RecordAttachment[]) => void;
}) {
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const addPhotos = useCallback(async (files: FileList | File[]) => {
    const fileList = Array.from(files || []);

    if (!fileList.length) {
      return;
    }

    const remainingSlots = Math.max(3 - photos.length, 0);

    if (remainingSlots <= 0) {
      setPhotoError(ko.app.inventory.photoSlotLimit(3));
      return;
    }

    setPhotoBusy(true);
    setPhotoError(null);

    try {
      const nextPhotos = await createRecordPhotoAttachments(fileList, remainingSlots);
      onChange([...photos, ...nextPhotos].slice(0, 3));
    } catch (error: any) {
      setPhotoError(error.message || ko.app.inventory.photoAttachFail);
    } finally {
      setPhotoBusy(false);
    }
  }, [onChange, photos]);

  const removePhoto = useCallback((photoId: string) => {
    onChange(photos.filter((photo) => photo.id !== photoId));
    setPhotoError(null);
  }, [onChange, photos]);

  return (
    <DilemmaPhotoUploader
      busy={busy}
      photoBusy={photoBusy}
      error={photoError}
      photos={photos}
      onAddPhotos={addPhotos}
      onRemovePhoto={removePhoto}
      copy={ledgerPhotoUploaderCopy}
    />
  );
}

function RowHead({ title, busy, onRemove }: { title: string; busy: boolean; onRemove: () => void }) {
  return (
    <header className="chronicle-resource-head">
      <div>
        <h4>{title}</h4>
        <p>{ko.campaignBackfill.rowSpoilerSafe}</p>
      </div>
      <button className="ghost-button danger-button" type="button" onClick={onRemove} disabled={busy}>
        <TokenIcon type="trash" />
        {ko.common.delete}
      </button>
    </header>
  );
}

function SourceAndNoteFields({ sourceValue, noteValue, busy, onSourceChange, onNoteChange }: { sourceValue: string; noteValue: string; busy: boolean; onSourceChange: (value: string) => void; onNoteChange: (value: string) => void }) {
  return (
    <>
      <label>
        <span>{ko.campaignLedger.sourceHistoryLabel}</span>
        <input value={sourceValue} onChange={(event) => onSourceChange(event.target.value)} disabled={busy} placeholder={ko.campaignLedger.sourceHistoryPlaceholder} />
      </label>
      <label className="chronicle-ledger-form-grid__full">
        <span>{ko.campaignLedger.noteLabel}</span>
        <textarea value={noteValue} onChange={(event) => onNoteChange(event.target.value)} disabled={busy} rows={3} placeholder={ko.campaignLedger.notePlaceholder} />
      </label>
    </>
  );
}

function PreviewLegacyDeltas({ deltas }: { deltas: Partial<Record<ChronicleResourceId, number>> }) {
  return (
    <div className="campaign-backfill-preview-card">
      <strong>{ko.campaignBackfill.legacyTitle}</strong>
      {resourceCounters.map((resource) => {
        const delta = deltas[resource.id as ChronicleResourceId] || 0;
        return <span key={resource.id}>{resource.label}: {formatLegacyDelta(delta)}</span>;
      })}
    </div>
  );
}

function PreviewAssignments({ assignments, houses }: { assignments: ReturnType<typeof assignOpenAgendasFromChronicles>; houses: any[] }) {
  const rows = (openAgendaTokenTypes as any[]).flatMap((type) => resourceCounters.map((resource) => {
    const houseId = assignments[type.id as ChroniclePolarity]?.[resource.id as ChronicleResourceId];
    return houseId ? `${type.label} ${resource.label}: ${getHouseName(houses, houseId)}` : "";
  })).filter(Boolean);

  return (
    <div className="campaign-backfill-preview-card">
      <strong>{ko.campaignBackfill.assignmentsTitle}</strong>
      {rows.length ? rows.map((row) => <span key={row}>{row}</span>) : <span>{ko.campaignBackfill.noAssignments}</span>}
    </div>
  );
}

function updateByRowId<T extends { rowId: string }>(entries: T[], rowId: string, patch: Partial<T>) {
  return entries.map((entry) => entry.rowId === rowId ? { ...entry, ...patch } : entry);
}

function removeByRowId<T extends { rowId: string }>(entries: T[], rowId: string, fallback: T) {
  const next = entries.filter((entry) => entry.rowId !== rowId);
  return next.length ? next : [fallback];
}

function buildDraftLedger(entries: ChronicleDraft[], houses: any[]): ChronicleLedger {
  const ledger = createEmptyLedger();

  for (const [index, entry] of entries.entries()) {
    const stickerCode = entry.stickerCode.trim();
    const signedByHouseId = entry.signedByHouseId.trim();

    if (!stickerCode || !signedByHouseId) {
      continue;
    }

    const explicitSlot = parseSlotIndex(entry.slotIndex);
    ledger[entry.resourceId].push({
      id: entry.rowId,
      stickerCode,
      resourceId: entry.resourceId,
      polarity: entry.polarity,
      signedByHouseId,
      signedByName: entry.signedByName.trim() || getHouseName(houses, signedByHouseId),
      ageMarks: clampAgeMarks(entry.ageMarks),
      slotIndex: explicitSlot ?? index,
      sourceDilemmaHistoryId: entry.sourceDilemmaHistoryId.trim(),
      sourceCardCode: entry.sourceCardCode.trim(),
      placedAt: "",
      updatedAt: "",
      replacedAt: "",
      note: entry.note.trim(),
      photos: entry.photos,
    });
  }

  return ledger;
}

function toChroniclePayload(entry: ChronicleDraft) {
  const slotIndex = parseSlotIndex(entry.slotIndex);
  return {
    stickerCode: entry.stickerCode.trim(),
    resourceId: entry.resourceId,
    polarity: entry.polarity,
    signedByHouseId: entry.signedByHouseId.trim(),
    signedByName: entry.signedByName.trim(),
    ageMarks: clampAgeMarks(entry.ageMarks),
    ...(slotIndex === undefined ? {} : { slotIndex }),
    sourceDilemmaHistoryId: entry.sourceDilemmaHistoryId.trim(),
    sourceCardCode: entry.sourceCardCode.trim(),
    note: entry.note.trim(),
    photos: entry.photos,
  };
}

function toEnvelopePayload(entry: EnvelopeDraft) {
  return {
    code: entry.code.trim(),
    openedAt: entry.openedAt.trim(),
    sourceDilemmaHistoryId: entry.sourceDilemmaHistoryId.trim(),
    note: entry.note.trim(),
    photos: entry.photos,
  };
}

function toCardPayload(entry: CardDraft) {
  return {
    code: entry.code.trim(),
    status: entry.status,
    sourceEnvelopeCode: entry.sourceEnvelopeCode.trim(),
    sourceDilemmaHistoryId: entry.sourceDilemmaHistoryId.trim(),
    note: entry.note.trim(),
    photos: entry.photos,
  };
}

function toMysteryPayload(entry: MysteryDraft) {
  return {
    dossierLetter: entry.dossierLetter.trim(),
    storylineSymbol: entry.storylineSymbol.trim(),
    slotKey: entry.slotKey.trim(),
    sourceDilemmaHistoryId: entry.sourceDilemmaHistoryId.trim(),
    note: entry.note.trim(),
    photos: entry.photos,
  };
}
