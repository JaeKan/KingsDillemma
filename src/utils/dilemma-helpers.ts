/**
 * 딜레마 관련 노멀라이저 및 헬퍼 함수.
 * App.tsx에서 추출 — UI 의존성 없음.
 */
import {
  dilemmaResultMarkers,
  dilemmaPhotoLimit,
  dilemmaResourceDeltaLimit,
  inventoryCounterMax,
  resourceCounters,
  HOUSE_CATALOG,
  ko,
} from "../resources/gameResources";
import { sanitizeMysteryStickerId } from "../../shared/mystery-stickers.mts";
import { normalizeCounter, normalizeTextField } from "./normalizers";
import { getHouseKoreanName, getHouseHoverLabel, getHouseParenPlayerLine } from "./house-helpers";
import {
  DilemmaRecord,
  DilemmaOutcome,
  DilemmaVote,
  DilemmaPhoto,
  DilemmaEditLock,
  DilemmaHistoryEntry,
  DilemmaResolutionChecklist,
  DilemmaVoteSettlement,
  DilemmaOutcomeEffect,
  RedactedHouse,
  HouseId,
  PersonalResourceId,
  RecordAttachment,
} from "../types/game";

const RESOLUTION_CHECKLIST_MEMO_MAX = 200;
const DILEMMA_OUTCOME_NOTE_MAX = 500;

// ── 딜레마 레코드 ─────────────────────────────────────────────

export function normalizeResolutionChecklist(value: unknown): DilemmaResolutionChecklist {
  if (!value || typeof value !== "object") {
    return {};
  }

  const candidate = value as Record<string, unknown>;
  const next: DilemmaResolutionChecklist = {};

  (["a", "b", "c", "d", "e", "f"] as const).forEach((key) => {
    if (candidate[key] === true) {
      next[key] = true;
    }
  });

  if (typeof candidate.memo === "string") {
    const memo = normalizeTextField(candidate.memo).slice(0, RESOLUTION_CHECKLIST_MEMO_MAX);

    if (memo.trim()) {
      next.memo = memo.trim();
    }
  }

  return next;
}

export function resolutionChecklistHasProgress(checklist: unknown): boolean {
  const normalized = normalizeResolutionChecklist(checklist);

  return Boolean(
    normalized.a ||
      normalized.b ||
      normalized.c ||
      normalized.d ||
      normalized.e ||
      normalized.f ||
      normalized.memo?.trim(),
  );
}

export function normalizeDilemmaRecord(value: any): DilemmaRecord {
  const candidate = value && typeof value === "object" ? value : {};
  const draft = createDilemmaDraft(candidate);

  return {
    ...draft,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : "",
    updatedBy: typeof candidate.updatedBy === "string" ? candidate.updatedBy : null,
    updatedByName: normalizeTextField(candidate.updatedByName),
    dilemmaAuthorHouseId:
      typeof candidate.dilemmaAuthorHouseId === "string" ? candidate.dilemmaAuthorHouseId : null,
    editLock: normalizeDilemmaEditLock(candidate.editLock),
  };
}

export function normalizeDilemmaHistoryEntry(value: any): DilemmaHistoryEntry {
  const candidate = value && typeof value === "object" ? value : {};
  const record = normalizeDilemmaRecord(candidate);

  return {
    ...record,
    historyId: normalizeTextField(candidate.historyId) || record.historyId || createClientId(),
    savedAt: typeof candidate.savedAt === "string" ? candidate.savedAt : record.updatedAt,
    savedBy: (typeof candidate.savedBy === "string" ? candidate.savedBy : record.updatedBy) as HouseId | null,
    savedByName: normalizeTextField(candidate.savedByName) || record.updatedByName,
  };
}

export function createDilemmaDraft(value: any = {}): Omit<
  DilemmaRecord,
  "updatedAt" | "updatedBy" | "updatedByName" | "dilemmaAuthorHouseId" | "editLock"
> {
  const candidate = (value && typeof value === "object") ? value : {};
  const aye = normalizeDilemmaOutcome(candidate.aye);
  const nay = normalizeDilemmaOutcome(candidate.nay);
  const selectedOutcome = (candidate.selectedOutcome === "aye" || candidate.selectedOutcome === "nay") ? candidate.selectedOutcome : "";

  return {
    historyId: normalizeTextField(candidate.historyId),
    cardCode: normalizeTextField(candidate.cardCode),
    title: normalizeTextField(candidate.title),
    mysteryStickerId: sanitizeMysteryStickerId(candidate.mysteryStickerId),
    timeCounterSlot: normalizeTextField(candidate.timeCounterSlot),
    context: normalizeTextField(candidate.context),
    question: normalizeTextField(candidate.question),
    councilNotes: normalizeTextField(candidate.councilNotes),
    aye,
    nay,
    selectedOutcome,
    voteNotes: normalizeTextField(candidate.voteNotes),
    resolutionNotes: normalizeTextField(candidate.resolutionNotes),
    resolutionChecklist: normalizeResolutionChecklist(candidate.resolutionChecklist),
    votes: normalizeDilemmaVotes(candidate.votes),
    voteSettlement: normalizeDilemmaVoteSettlement(candidate.voteSettlement),
    photos: normalizeDilemmaPhotos(candidate.photos),
    resolutionPhotos: normalizeDilemmaPhotos(candidate.resolutionPhotos),
  };
}

export function createDilemmaPayload(draft: any): DilemmaRecord {
  return {
    ...(createDilemmaDraft(draft) as any),
    updatedAt: "",
    updatedBy: null,
    updatedByName: "",
    dilemmaAuthorHouseId: null,
    editLock: null,
  };
}

export function normalizeDilemmaVoteSettlement(value: any): DilemmaVoteSettlement {
  const candidate = value && typeof value === "object" ? value : {};
  const proposalCandidate = candidate.proposal && typeof candidate.proposal === "object" ? candidate.proposal : null;
  const outcome =
    proposalCandidate?.outcome === "aye" || proposalCandidate?.outcome === "nay" ? proposalCandidate.outcome : "";
  const proposal =
    proposalCandidate && outcome
      ? {
          participants: Array.isArray(proposalCandidate.participants)
            ? proposalCandidate.participants.filter((id: any) => typeof id === "string")
            : [],
          outcome,
          tally: {
            ayePower: normalizeCounter(proposalCandidate.tally?.ayePower, 999, 0),
            nayPower: normalizeCounter(proposalCandidate.tally?.nayPower, 999, 0),
            passCount: normalizeCounter(proposalCandidate.tally?.passCount, 5, 0),
            moderatorPassCount: normalizeCounter(proposalCandidate.tally?.moderatorPassCount, 1, 0),
          },
          neutralPowerBefore: normalizeCounter(proposalCandidate.neutralPowerBefore, 999, 0),
          neutralPowerDistributed: normalizeCounter(proposalCandidate.neutralPowerDistributed, 999, 0),
          neutralPowerAfter: normalizeCounter(proposalCandidate.neutralPowerAfter, 999, 0),
          inventoryDeltas:
            proposalCandidate.inventoryDeltas && typeof proposalCandidate.inventoryDeltas === "object"
              ? Object.fromEntries(
                  Object.entries(proposalCandidate.inventoryDeltas).map(([houseId, delta]: any) => [
                    houseId,
                    {
                      coins: normalizeSignedCounter(delta?.coins, 99),
                      powerTokens: normalizeSignedCounter(delta?.powerTokens, 99),
                    },
                  ]),
                )
              : {},
          leaderHouseId: typeof proposalCandidate.leaderHouseId === "string" ? proposalCandidate.leaderHouseId : null,
          moderatorHouseId: typeof proposalCandidate.moderatorHouseId === "string" ? proposalCandidate.moderatorHouseId : null,
          warnings: Array.isArray(proposalCandidate.warnings)
            ? proposalCandidate.warnings.filter((warning: any) => typeof warning === "string")
            : [],
          createdAt: typeof proposalCandidate.createdAt === "string" ? proposalCandidate.createdAt : "",
        }
      : null;
  const status =
    candidate.status === "applied" && proposal
      ? "applied"
      : candidate.status === "proposed" && proposal
        ? "proposed"
        : "none";

  return {
    status,
    proposal: status === "none" ? null : proposal,
    appliedAt: typeof candidate.appliedAt === "string" ? candidate.appliedAt : "",
    appliedBy: typeof candidate.appliedBy === "string" ? candidate.appliedBy : null,
  };
}

function normalizeSignedCounter(value: any, maxAbs: number): number {
  const number = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(-maxAbs, Math.min(maxAbs, Math.trunc(number)));
}

// ── 딜레마 결과 ───────────────────────────────────────────────

export function normalizeDilemmaOutcome(value: any): DilemmaOutcome {
  const candidate = value && typeof value === "object" ? value : {};
  const resourceDeltas = normalizeDilemmaResourceDeltas(candidate.resourceDeltas);
  const effects = normalizeDilemmaOutcomeEffects(candidate.effects);
  const normalizedEffects = effects.length ? effects : deriveDilemmaResourceEffects(resourceDeltas);
  const normalizedResourceDeltas = dilemmaResourceDeltasHaveValues(resourceDeltas)
    ? resourceDeltas
    : summarizeDilemmaResourceEffects(normalizedEffects);
  const resourcePolarities = normalizeDilemmaResourcePolarities(candidate.resourcePolarities, normalizedResourceDeltas);

  return {
    preview: normalizeTextField(candidate.preview),
    result: normalizeTextField(candidate.result),
    resourcePolarities,
    resourceDeltas: normalizedResourceDeltas,
    effects: normalizedEffects,
  };
}

// ── 딜레마 자원 변화 ──────────────────────────────────────────

export function deriveDilemmaResourceEffects(value: any): DilemmaOutcomeEffect[] {
  const deltas = normalizeDilemmaResourceDeltas(value);

  return resourceCounters
    .map((resource) => {
      const amount = deltas[resource.id as PersonalResourceId] || 0;

      if (amount === 0) {
        return null;
      }

      return {
        id: `resource-${resource.id}`,
        type: "resource",
        resourceId: resource.id as PersonalResourceId,
        amount,
      } satisfies DilemmaOutcomeEffect;
    })
    .filter((effect): effect is Extract<DilemmaOutcomeEffect, { type: "resource" }> => Boolean(effect));
}

export function getOrderedDilemmaResourceEffects(outcome: DilemmaOutcome | null | undefined): Array<{
  resourceId: PersonalResourceId;
  amount: number;
}> {
  if (!outcome) {
    return [];
  }

  const effects = normalizeDilemmaOutcomeEffects((outcome as any).effects);
  const ordered = effects
    .filter((effect): effect is Extract<DilemmaOutcomeEffect, { type: "resource" }> => effect.type === "resource")
    .map((effect) => ({ resourceId: effect.resourceId, amount: effect.amount }));

  if (ordered.length) {
    return ordered;
  }

  return deriveDilemmaResourceEffects(outcome.resourceDeltas)
    .filter((effect): effect is Extract<DilemmaOutcomeEffect, { type: "resource" }> => effect.type === "resource")
    .map((effect) => ({ resourceId: effect.resourceId, amount: effect.amount }));
}

export function summarizeDilemmaResourceEffects(effects: DilemmaOutcomeEffect[]): Record<string, number> {
  const deltas: Record<string, number> = {};

  for (const effect of effects) {
    if (effect.type !== "resource") {
      continue;
    }

    deltas[effect.resourceId] = clampDilemmaResourceDelta((deltas[effect.resourceId] || 0) + effect.amount);
  }

  return normalizeDilemmaResourceDeltas(deltas);
}

export function normalizeDilemmaOutcomeEffects(value: any): DilemmaOutcomeEffect[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => normalizeDilemmaOutcomeEffect(item, index))
    .filter((effect): effect is DilemmaOutcomeEffect => Boolean(effect));
}

function normalizeDilemmaOutcomeEffect(value: any, index: number): DilemmaOutcomeEffect | null {
  const candidate = value && typeof value === "object" ? value : {};
  const id = normalizeTextField(candidate.id) || `effect-${index + 1}`;
  const photos = normalizeRecordAttachments(candidate.photos);

  if (candidate.type === "resource") {
    const resourceId = normalizePersonalResourceId(candidate.resourceId);
    const amount = clampDilemmaResourceDelta(candidate.amount);

    return resourceId && amount !== 0
      ? withDilemmaOutcomeEffectPhotos({ id, type: "resource", resourceId, amount }, photos)
      : null;
  }

  if (candidate.type === "chronicle") {
    const resourceId = normalizePersonalResourceId(candidate.resourceId);
    const polarity = normalizeChroniclePolarity(candidate.polarity);
    const stickerCode = normalizeTextField(candidate.stickerCode);
    const signedByHouseId = normalizeTextField(candidate.signedByHouseId);
    const signedByName = normalizeTextField(candidate.signedByName);

    return resourceId && polarity && stickerCode
      ? withDilemmaOutcomeEffectPhotos({
          id,
          type: "chronicle",
          resourceId,
          polarity,
          stickerCode,
          ...(signedByHouseId ? { signedByHouseId } : {}),
          ...(signedByName ? { signedByName } : {}),
        }, photos)
      : null;
  }

  if (candidate.type === "envelope") {
    const envelopeCode = normalizeTextField(candidate.envelopeCode);
    return envelopeCode ? withDilemmaOutcomeEffectPhotos({ id, type: "envelope", envelopeCode }, photos) : null;
  }

  if (candidate.type === "story" || candidate.type === "event") {
    const cardCode = normalizeTextField(candidate.cardCode);
    const status = normalizeCampaignCardStatus(candidate.status);

    if (!cardCode || !status) {
      return null;
    }

    if (candidate.type === "story") {
      const signedByHouseId = normalizeTextField(candidate.signedByHouseId);
      const signedByName = normalizeTextField(candidate.signedByName);
      const signerBonusText = normalizeTextField(candidate.signerBonusText).slice(0, DILEMMA_OUTCOME_NOTE_MAX);

      return withDilemmaOutcomeEffectPhotos({
        id,
        type: "story",
        cardCode,
        status,
        ...(signedByHouseId ? { signedByHouseId } : {}),
        ...(signedByName ? { signedByName } : {}),
        ...(signerBonusText ? { signerBonusText } : {}),
      }, photos);
    }

    return withDilemmaOutcomeEffectPhotos({ id, type: "event", cardCode, status }, photos);
  }

  if (candidate.type === "mystery") {
    const dossierLetter = normalizeTextField(candidate.dossierLetter);
    const storylineSymbol = normalizeTextField(candidate.storylineSymbol);
    const slotKey = normalizeTextField(candidate.slotKey);

    return dossierLetter && storylineSymbol && slotKey
      ? withDilemmaOutcomeEffectPhotos({ id, type: "mystery", dossierLetter, storylineSymbol, slotKey }, photos)
      : null;
  }

  if (candidate.type === "note") {
    const text = normalizeTextField(candidate.text).slice(0, DILEMMA_OUTCOME_NOTE_MAX);
    return text ? withDilemmaOutcomeEffectPhotos({ id, type: "note", text }, photos) : null;
  }

  return null;
}

function withDilemmaOutcomeEffectPhotos<T extends DilemmaOutcomeEffect>(effect: T, photos: RecordAttachment[]): T {
  return photos.length ? { ...effect, photos } : effect;
}

function normalizePersonalResourceId(value: any): PersonalResourceId | "" {
  return resourceCounters.some((resource) => resource.id === value) ? value : "";
}

function normalizeChroniclePolarity(value: any): "positive" | "negative" | "" {
  return value === "positive" || value === "negative" ? value : "";
}

function normalizeCampaignCardStatus(value: any): "active" | "completed" | "archived" | "" {
  return value === "active" || value === "completed" || value === "archived" ? value : "";
}

export function normalizeDilemmaResourceDeltas(value: any): Record<string, number> {
  const candidate = value && typeof value === "object" ? value : {};
  const nextDeltas: Record<string, number> = {};

  resourceCounters.forEach((resource) => {
    const delta = clampDilemmaResourceDelta(candidate[resource.id]);

    if (delta !== 0) {
      nextDeltas[resource.id] = delta;
    }
  });

  return nextDeltas;
}

export function normalizeDilemmaResourcePolarities(
  value: any,
  fallbackDeltas: any = {},
): Record<string, "positive" | "negative"> {
  const candidate = value && typeof value === "object" ? value : {};
  const deltas = normalizeDilemmaResourceDeltas(fallbackDeltas);
  const polarities: Record<string, "positive" | "negative"> = {};

  dilemmaResultMarkers.forEach((marker) => {
    const raw = candidate[marker.id];
    if (raw === "positive" || raw === "negative") {
      polarities[marker.id] = raw;
      return;
    }

    const delta = marker.id === "story" ? 0 : deltas[marker.id] || 0;
    if (delta > 0) {
      polarities[marker.id] = "positive";
    } else if (delta < 0) {
      polarities[marker.id] = "negative";
    }
  });

  return polarities;
}

export function clampDilemmaResourceDelta(value: any): number {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(-dilemmaResourceDeltaLimit, Math.min(dilemmaResourceDeltaLimit, Math.trunc(number)));
}

export function formatDilemmaResourceDelta(value: any): string {
  const delta = clampDilemmaResourceDelta(value);

  return delta > 0 ? `+${delta}` : String(delta);
}

export function compactDilemmaResourceDeltas(value: any): Record<string, number> {
  return normalizeDilemmaResourceDeltas(value);
}

export function dilemmaResourceDeltasHaveValues(value: any): boolean {
  const deltas = normalizeDilemmaResourceDeltas(value);

  return resourceCounters.some((resource) => (deltas[resource.id] || 0) !== 0);
}

export function dilemmaResourcePolaritiesHaveValues(value: any): boolean {
  const polarities = normalizeDilemmaResourcePolarities(value);

  return dilemmaResultMarkers.some((marker) => polarities[marker.id] === "positive" || polarities[marker.id] === "negative");
}

// ── 딜레마 투표 ───────────────────────────────────────────────

export function normalizeDilemmaVotes(value: any): Record<string, DilemmaVote> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([houseId, vote]) => [houseId, normalizeDilemmaVote(vote)])
      .filter(([, vote]) => (vote as DilemmaVote).side),
  );
}

export function normalizeDilemmaVote(value: any): DilemmaVote {
  const candidate = value && typeof value === "object" ? value : {};
  const side =
    candidate.side === "pass_moderator"
      ? "pass"
      : ["aye", "nay", "pass"].includes(candidate.side)
        ? (candidate.side as DilemmaVote["side"])
        : "";

  return {
    side,
    powerTokens: side === "pass" ? 0 : normalizeCounter(candidate.powerTokens, inventoryCounterMax.powerTokens, 0),
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : "",
    updatedByName: normalizeTextField(candidate.updatedByName),
  };
}

export function sumDilemmaVotes(votes: Record<string, DilemmaVote>, participants: RedactedHouse[], side: string): number {
  return participants.reduce((total, house) => {
    const vote = normalizeDilemmaVote(votes[house.id]);
    return total + (vote.side === side ? vote.powerTokens : 0);
  }, 0);
}

/** 집계(apply) 후에만 `voteNotes`가 생김. 동률 또는 전원 기권(0=0) 때만 중재자 결정 단계이며, 권력 차가 나면 다수 확정이어야 한다. */
export function dilemmaAwaitingModeratorResolution(
  dilemma: unknown,
  votes: Record<string, DilemmaVote>,
  participants: RedactedHouse[],
): boolean {
  const record = normalizeDilemmaRecord(dilemma);

  if (record.selectedOutcome) {
    return false;
  }

  if (!record.voteNotes?.trim()) {
    return false;
  }

  return sumDilemmaVotes(votes, participants, "aye") === sumDilemmaVotes(votes, participants, "nay");
}

export function getDilemmaSideLeader(votes: Record<string, DilemmaVote>, participants: RedactedHouse[], side: string): { house: RedactedHouse; index: number; vote: DilemmaVote } | null {
  const leaders = participants
    .map((house, index) => ({
      house,
      index,
      vote: normalizeDilemmaVote(votes[house.id]),
    }))
    .filter((item) => item.vote.side === side && item.vote.powerTokens > 0)
    .sort((left, right) => right.vote.powerTokens - left.vote.powerTokens || left.index - right.index);

  return leaders[0] || null;
}

export function formatDilemmaSideLeader(votes: Record<string, DilemmaVote>, participants: RedactedHouse[], side: string): string {
  const leader = getDilemmaSideLeader(votes, participants, side);

  if (!leader) {
    return ko.dilemmaHelpers.breakdownEmpty;
  }

  return ko.dilemmaHelpers.leaderVoteLine(getHouseKoreanName(leader.house), leader.vote.powerTokens);
}

export function formatDilemmaVoteAdvantage(ayePower: number, nayPower: number): string {
  if (ayePower > nayPower) {
    return ko.dilemmaHelpers.ayeAdvantage(ayePower - nayPower);
  }

  if (nayPower > ayePower) {
    return ko.dilemmaHelpers.nayAdvantage(nayPower - ayePower);
  }

  return ko.dilemmaHelpers.tie;
}

export function createDilemmaVoteGroups(votes: Record<string, DilemmaVote>, houses: RedactedHouse[] = []): any[] {
  const housesById = new Map((houses || []).map((house) => [house.id, house]));
  const groupDefs = [
    { side: "aye", label: ko.dilemmaHelpers.sideAye },
    { side: "nay", label: ko.dilemmaHelpers.sideNay },
    { side: "pass", label: ko.dilemmaHelpers.sidePass },
  ];
  const items = Object.entries(votes)
    .map(([houseId, vote]) => {
      const normalizedVote = normalizeDilemmaVote(vote);

      if (!normalizedVote.side) {
        return null;
      }

      const house = housesById.get(houseId) || (HOUSE_CATALOG.find((candidate) => candidate.id === houseId) as any) || null;
      const houseTitle = getHouseKoreanName(house);
      const displayNameCandidate =
        (typeof normalizedVote.updatedByName === "string" && normalizedVote.updatedByName.trim()) ||
        (typeof house?.name === "string" && house.name.trim()) ||
        null;
      const secondaryLine = getHouseParenPlayerLine(house, { reporterName: normalizedVote.updatedByName });

      return {
        houseId,
        house,
        side: normalizedVote.side,
        houseTitle,
        secondaryLine,
        hoverLabel: getHouseHoverLabel(house, displayNameCandidate),
        houseNumber: house?.number || 0,
        powerTokens: normalizedVote.powerTokens,
      };
    })
    .filter((item): item is any => Boolean(item))
    .sort(
      (left, right) =>
        (left.houseNumber as number) - (right.houseNumber as number) ||
        left.houseTitle.localeCompare(right.houseTitle),
    );

  return groupDefs.map((group) => ({
    ...group,
    items: items.filter((item) => group.side === "pass" ? item.side.startsWith("pass") : item.side === group.side),
    powerTotal: items
      .filter((item) => group.side === "pass" ? item.side.startsWith("pass") : item.side === group.side)
      .reduce((total, item) => total + item.powerTokens, 0),
  }));
}

export function formatDilemmaVoteGroupMetric(group: any): string {
  if (group.side === "pass") {
    return ko.dilemmaHelpers.passCount(group.items.length);
  }

  return ko.dilemmaHelpers.powerTotal(group.powerTotal);
}

// ── 딜레마 사진 ───────────────────────────────────────────────

export function normalizeDilemmaPhotos(value: any): DilemmaPhoto[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((photo) => {
      const candidate = photo && typeof photo === "object" ? photo : {};
      return {
        id: normalizeTextField(candidate.id) || createClientId(),
        name: normalizeTextField(candidate.name) || ko.dilemmaHelpers.defaultPhotoName,
        mimeType: normalizeTextField(candidate.mimeType) || "image/jpeg",
        dataUrl: normalizeTextField(candidate.dataUrl),
        size: typeof candidate.size === "number" && Number.isFinite(candidate.size) ? Math.max(0, candidate.size) : 0,
        addedAt: typeof candidate.addedAt === "string" ? candidate.addedAt : "",
        addedBy: (typeof candidate.addedBy === "string" ? candidate.addedBy : null) as HouseId | null,
        addedByName: normalizeTextField(candidate.addedByName),
      };
    })
    .filter((photo) => photo.dataUrl)
    .slice(0, dilemmaPhotoLimit);
}

function normalizeRecordAttachments(value: any): RecordAttachment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((photo) => {
      const candidate = photo && typeof photo === "object" ? photo : {};
      return {
        id: normalizeTextField(candidate.id) || createClientId(),
        name: normalizeTextField(candidate.name) || ko.dilemmaHelpers.defaultPhotoName,
        mimeType: normalizeTextField(candidate.mimeType) || "image/jpeg",
        dataUrl: normalizeTextField(candidate.dataUrl),
        createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : "",
      };
    })
    .filter((photo) => photo.dataUrl)
    .slice(0, dilemmaPhotoLimit);
}

// ── 딜레마 잠금 ───────────────────────────────────────────────

export function normalizeDilemmaEditLock(value: any): DilemmaEditLock | null {
  if (!value || typeof value !== "object" || typeof value.houseId !== "string") {
    return null;
  }

  return {
    houseId: value.houseId as HouseId,
    houseName: normalizeTextField(value.houseName),
    acquiredAt: typeof value.acquiredAt === "string" ? value.acquiredAt : "",
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : "",
    expiresAt: typeof value.expiresAt === "string" ? value.expiresAt : "",
  };
}

// ── 딜레마 판정 헬퍼 ──────────────────────────────────────────

export function isDilemmaBlank(dilemma: any): boolean {
  const draft = createDilemmaDraft(dilemma);

  const textFieldsBlank = [
    draft.cardCode,
    draft.title,
    draft.timeCounterSlot,
    draft.mysteryStickerId,
    draft.context,
    draft.question,
    draft.councilNotes,
    draft.aye.preview,
    draft.aye.result,
    draft.nay.preview,
    draft.nay.result,
    draft.voteNotes,
    draft.resolutionNotes,
    draft.selectedOutcome,
  ].every((value) => !String(value).trim());

  return (
    textFieldsBlank &&
    !resolutionChecklistHasProgress(draft.resolutionChecklist) &&
    !dilemmaResourcePolaritiesHaveValues(draft.aye.resourcePolarities) &&
    !dilemmaResourcePolaritiesHaveValues(draft.nay.resourcePolarities) &&
    !dilemmaResourceDeltasHaveValues(draft.aye.resourceDeltas) &&
    !dilemmaResourceDeltasHaveValues(draft.nay.resourceDeltas) &&
    draft.photos.length === 0 &&
    draft.resolutionPhotos.length === 0
  );
}

function getSelectedDilemmaOutcomeResultText(dilemma: DilemmaRecord): string {
  if (dilemma.selectedOutcome === "aye") {
    return dilemma.aye.result || "";
  }

  if (dilemma.selectedOutcome === "nay") {
    return dilemma.nay.result || "";
  }

  return "";
}

export function hasSelectedDilemmaOutcomeResult(dilemma: any): boolean {
  const record = normalizeDilemmaRecord(dilemma);
  return Boolean(record.selectedOutcome && getSelectedDilemmaOutcomeResultText(record).trim());
}

export function hasDilemmaResolutionPublishContent(dilemma: any): boolean {
  const record = normalizeDilemmaRecord(dilemma);
  const selectedOutcome =
    record.selectedOutcome === "aye" ? record.aye : record.selectedOutcome === "nay" ? record.nay : null;

  return Boolean(
    getSelectedDilemmaOutcomeResultText(record).trim() ||
    (selectedOutcome && dilemmaResourceDeltasHaveValues(selectedOutcome.resourceDeltas)) ||
    (selectedOutcome && selectedOutcome.effects.length > 0) ||
    record.timeCounterSlot.trim() ||
    record.resolutionNotes.trim() ||
    resolutionChecklistHasProgress(record.resolutionChecklist) ||
    record.resolutionPhotos.length
  );
}

/** 클라이언트 표시용: 투표 제출 여부. 서버 초기화는 작성자면 별도 surface 없이 허용. */
export function dilemmaHasVoteActivity(dilemma: unknown): boolean {
  const votes = normalizeDilemmaVotes((dilemma as any)?.votes);
  return Object.values(votes).some((vote) => Boolean(vote?.side));
}

export function formatDilemmaCardLabel(dilemma: DilemmaRecord): string {
  const code = dilemma.cardCode.trim();
  const title = dilemma.title.trim();

  if (code && title) {
    return `${code} · ${title}`;
  }

  return code || title || "";
}

export function isDilemmaVoteCompleteForPublish(dilemma: any, houses: RedactedHouse[] = []): boolean {
  const participants = getActiveDilemmaVoteHouses(houses);
  const votes = normalizeDilemmaVotes(dilemma?.votes);

  return participants.length > 0 && participants.every((house) => Boolean(votes[house.id]?.side));
}

export function getActiveDilemmaVoteHouses(houses: RedactedHouse[] = []): RedactedHouse[] {
  return (houses || []).filter((house) => house?.hasSession).slice(0, 5);
}

export function isPublishedDilemmaCurrent(dilemma: DilemmaRecord, entry: DilemmaHistoryEntry): boolean {
  const publishedAt = Date.parse(entry.savedAt || entry.updatedAt || "");
  const updatedAt = Date.parse(dilemma.updatedAt || "");

  if (!Number.isFinite(publishedAt) || !Number.isFinite(updatedAt)) {
    return true;
  }

  return publishedAt >= updatedAt;
}

export function getDilemmaPublishBlockReason(dilemma: any, houses: RedactedHouse[] = []): string {
  const normalizedDilemma = normalizeDilemmaRecord(dilemma);

  if (isDilemmaBlank(normalizedDilemma)) {
    return ko.dilemmaHelpers.publishNoRecord;
  }

  if (!isDilemmaVoteCompleteForPublish(normalizedDilemma, houses)) {
    return ko.dilemmaHelpers.publishNeedAllVotes;
  }

  if (!normalizedDilemma.selectedOutcome) {
    return ko.dilemmaHelpers.publishNeedOutcome;
  }

  if (!hasDilemmaResolutionPublishContent(normalizedDilemma)) {
    return ko.dilemmaHelpers.publishNeedResolution;
  }

  return "";
}

/** 집계 기록 후 · 결과/후속 입력이 아직 덜 된 상태(게시 직전 단계) */
export function isDilemmaResolutionEntryPending(dilemma: unknown, houses: RedactedHouse[] = []): boolean {
  const record = normalizeDilemmaRecord(dilemma);

  if (isDilemmaBlank(record)) {
    return false;
  }

  if (!isDilemmaVoteCompleteForPublish(record, houses)) {
    return false;
  }

  if (!record.voteNotes?.trim()) {
    return false;
  }

  if (!record.selectedOutcome) {
    return true;
  }

  if (!hasDilemmaResolutionPublishContent(record)) {
    return true;
  }

  return false;
}

export function getDilemmaStatusLabel({
  dilemma,
  isBlank,
  leaderHouse,
  moderatorHouse,
  published,
  rolesReady,
  voteComplete,
}: {
  dilemma: DilemmaRecord;
  isBlank: boolean;
  leaderHouse: RedactedHouse | null;
  moderatorHouse: RedactedHouse | null;
  published: boolean;
  rolesReady: boolean;
  voteComplete: boolean;
}): { text: string; tone: string } {
  if (dilemma.editLock) {
    return { text: ko.dilemmaHelpers.editingBy(dilemma.editLock.houseName), tone: "locked" };
  }

  if (!rolesReady) {
    if (!leaderHouse && !moderatorHouse) {
      return { text: ko.dilemmaHelpers.needRoles, tone: "needs-action" };
    }

    return {
      text: leaderHouse ? ko.dilemmaHelpers.needModerator : ko.dilemmaHelpers.needLeader,
      tone: "needs-action",
    };
  }

  if (isBlank) {
    return { text: ko.dilemmaHelpers.needWrite, tone: "needs-action" };
  }

  if (published) {
    return { text: ko.dilemmaHelpers.published, tone: "done" };
  }

  if (!voteComplete) {
    return { text: ko.dilemmaHelpers.votingNeeded, tone: "in-progress" };
  }

  if (!dilemma.selectedOutcome) {
    return { text: ko.dilemmaHelpers.needOutcomePick, tone: "needs-action" };
  }

  if (!hasDilemmaResolutionPublishContent(dilemma)) {
    return { text: ko.dilemmaHelpers.needFollowUp, tone: "needs-action" };
  }

  return { text: ko.dilemmaHelpers.canPublish, tone: "ready" };
}

// ── 포맷 ──────────────────────────────────────────────────────

export function formatLocalDateTime(value: any): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatSignedScore(value: any): string {
  const number = Number(value);
  return number > 0 ? `+${number}` : String(number);
}

// ── 유틸 ──────────────────────────────────────────────────────

export function createClientId(): string {
  return (globalThis as any).crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
