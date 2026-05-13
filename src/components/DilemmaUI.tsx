import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  DilemmaVote,
  RedactedHouse,
  DilemmaRecord,
  DilemmaResultMarkerId,
  DilemmaOutcomeEffect,
  PersonalResourceId,
} from "../types/game";
import { getMysteryStickerEntry } from "../../shared/mystery-stickers.mts";
import { getMysteryStickerLabel } from "../utils/mystery-sticker-labels";
import { MysteryStickerImage } from "./MysteryStickerImage";
import { MentionTokenView } from "./MentionUI";
import {
  formatDilemmaResourceDelta,
  normalizeDilemmaRecord,
  isDilemmaBlank,
  normalizeDilemmaVotes,
  normalizeResolutionChecklist,
  sumDilemmaVotes,
  isDilemmaVoteCompleteForPublish,
  getDilemmaPublishBlockReason,
  hasDilemmaResolutionPublishContent,
  formatDilemmaVoteAdvantage,
  normalizeDilemmaOutcome,
  normalizeDilemmaResourceDeltas,
  normalizeDilemmaResourcePolarities,
  createDilemmaVoteGroups,
  formatDilemmaVoteGroupMetric,
  normalizeDilemmaVote,
  getDilemmaSideLeader,
  getDilemmaStatusLabel,
  dilemmaAwaitingModeratorResolution,
} from "../utils/dilemma-helpers";
import {
  getHouseHoverLabel,
  getDilemmaVoteParticipants,
  getDilemmaVoteTurnName,
  getHouseDisplayName,
  getHouseKoreanName,
  getHouseParenPlayerLine,
  getHouses,
  isHouseCrestImageSrc,
} from "../utils/house-helpers";
import { TokenIcon, HouseIcon } from "./GameIcons";
import { Tooltip } from "./Tooltip";
import { 
  dilemmaResultMarkers,
  resourceCounters, 
  dilemmaOutcomeLabels,
  inventoryCounterMax,
  REQUIRED_HOUSE_COUNT,
  ko,
} from "../resources/gameResources";
import { normalizeCounter } from "../utils/normalizers";

// Helper for date formatting
function formatLocalDateTime(dateStr: string | undefined): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    return date.toLocaleString();
  } catch (_e) {
    return dateStr;
  }
}

// Helper for version check
function isPublishedDilemmaCurrent(dilemma: DilemmaRecord, entry: any): boolean {
  const publishedAt = Date.parse(entry.savedAt || entry.updatedAt || "");
  const updatedAt = Date.parse(dilemma.updatedAt || "");
  if (!Number.isFinite(publishedAt) || !Number.isFinite(updatedAt)) return true;
  return publishedAt >= updatedAt;
}

function getActiveDilemmaVoteHouses(houses: RedactedHouse[] = []): RedactedHouse[] {
  return (houses || []).filter((house) => house?.hasSession).slice(0, REQUIRED_HOUSE_COUNT);
}

function HouseRoleNameStack({
  house,
  emptyMark = "—",
}: {
  house: RedactedHouse | null | undefined;
  emptyMark?: string;
}) {
  if (!house) {
    return <span className="house-role-name-stack house-role-name-stack--empty">{emptyMark}</span>;
  }

  const secondary = getHouseParenPlayerLine(house);

  return (
    <span className="house-role-name-stack" title={getHouseHoverLabel(house)}>
      <span className="house-role-name-stack__primary">{getHouseKoreanName(house)}</span>
      {secondary ? <span className="house-role-name-stack__secondary">{secondary}</span> : null}
    </span>
  );
}

function VoteSideLeadStack({
  votes,
  participants,
  side,
}: {
  votes: Record<string, DilemmaVote>;
  participants: RedactedHouse[];
  side: string;
}) {
  const leader = getDilemmaSideLeader(votes, participants, side);

  if (!leader) {
    return (
      <span className="dilemma-vote-side-lead dilemma-vote-side-lead--empty">{ko.dilemmaHelpers.breakdownEmpty}</span>
    );
  }

  return (
    <span className="dilemma-vote-side-lead">
      <span className="dilemma-vote-side-lead__house">{getHouseKoreanName(leader.house)}</span>
      <span className="dilemma-vote-side-lead__power">{ko.dilemmaHelpers.powerTotal(leader.vote.powerTokens)}</span>
    </span>
  );
}

export function DilemmaFact({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="dilemma-fact">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

export function DilemmaTextPreview({ label, value }: { label: string; value: string | undefined }) {
  const text = typeof value === "string" && value.trim() ? value : "";

  return (
    <div className="dilemma-text-preview">
      <span>{label}</span>
      <p>
        <MentionTokenView
          className="dilemma-display-mention-token"
          emptyText={ko.common.none}
          text={text}
        />
      </p>
    </div>
  );
}

function getDilemmaResourceLabel(resourceId: PersonalResourceId | string | undefined): string {
  return resourceCounters.find((resource) => resource.id === resourceId)?.label || resourceId || "";
}

function formatDilemmaOutcomeEffectPreview(effect: DilemmaOutcomeEffect): string {
  if (effect.type === "resource") {
    return `${getDilemmaResourceLabel(effect.resourceId)} ${formatDilemmaResourceDelta(effect.amount)}`;
  }

  if (effect.type === "chronicle") {
    return [
      ko.dilemmaEdit.effectTypeLabels.chronicle,
      getDilemmaResourceLabel(effect.resourceId),
      ko.dilemmaEdit.effectPolarityLabels[effect.polarity],
      effect.stickerCode,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  if (effect.type === "envelope") {
    return `${ko.dilemmaEdit.effectTypeLabels.envelope} ${effect.envelopeCode}`;
  }

  if (effect.type === "story" || effect.type === "event") {
    return [
      ko.dilemmaEdit.effectTypeLabels[effect.type],
      effect.cardCode,
      ko.dilemmaEdit.effectStatusLabels[effect.status],
      effect.type === "story" && (effect.signedByName || effect.signedByHouseId)
        ? `${ko.dilemmaEdit.effectSignerHouse}: ${effect.signedByName || effect.signedByHouseId}`
        : "",
    ]
      .filter(Boolean)
      .join(" · ");
  }

  if (effect.type === "mystery") {
    return [
      ko.dilemmaEdit.effectTypeLabels.mystery,
      effect.dossierLetter,
      effect.storylineSymbol,
      effect.slotKey,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  return effect.text;
}

export function DilemmaOutcomePreview({ label, outcome, selected }: { label: string; outcome: any; selected: boolean }) {
  const normalizedOutcome = normalizeDilemmaOutcome(outcome);
  const hasResourcePolarities = dilemmaResultMarkers.some(
    (marker) =>
      normalizedOutcome.resourcePolarities?.[marker.id as DilemmaResultMarkerId] === "positive" ||
      normalizedOutcome.resourcePolarities?.[marker.id as DilemmaResultMarkerId] === "negative",
  );
  const resultText = normalizedOutcome.result.trim();
  const effectSummaries = normalizedOutcome.effects
    .filter((effect) => effect.type !== "resource")
    .map((effect) => formatDilemmaOutcomeEffectPreview(effect))
    .filter(Boolean);
  const effectPhotos = normalizedOutcome.effects.flatMap((effect) => effect.photos || []);
  const hasResourceDeltas = resourceCounters.some((resource) => {
    const resourceId = resource.id as PersonalResourceId;
    return (normalizedOutcome.resourceDeltas?.[resourceId] || 0) !== 0;
  });
  const hasBackPanel = Boolean(resultText || hasResourceDeltas || effectSummaries.length || effectPhotos.length);

  return (
    <article className={`dilemma-outcome-preview${selected ? " selected" : ""}`}>
      <header>
        <strong>{label}</strong>
        {selected ? <span>{ko.dilemmaUi.outcomeSelectedChip}</span> : null}
      </header>
      <div className="dilemma-front-polarity-panel">
        {hasResourcePolarities ? (
          <DilemmaResourcePolarityPreview polarities={normalizedOutcome.resourcePolarities} />
        ) : (
          <p className="dilemma-outcome-empty">{ko.dilemmaUi.resourcePolarityEmpty}</p>
        )}
      </div>
      {hasBackPanel ? (
        <div className="dilemma-outcome-back-panel">
          {resultText ? (
            <div className="dilemma-outcome-result">
              <p className="section-label dilemma-outcome-result-heading">{ko.dilemmaResolution.labelBackResult}</p>
              <p className="dilemma-outcome-result-preview">
                <MentionTokenView
                  className="dilemma-display-mention-token"
                  emptyText={ko.common.none}
                  text={resultText}
                />
              </p>
            </div>
          ) : null}
          <DilemmaResourceDeltaPreview deltas={normalizedOutcome.resourceDeltas} />
          {effectSummaries.length ? (
            <div className="dilemma-outcome-effect-preview">
              <p className="section-label dilemma-outcome-effect-preview-heading">{ko.dilemmaEdit.effectSection}</p>
              <ol className="dilemma-outcome-effect-preview-list">
                {effectSummaries.map((effectSummary, index) => (
                  <li key={`${effectSummary}-${index}`}>{effectSummary}</li>
                ))}
              </ol>
            </div>
          ) : null}
          <DilemmaPhotoStrip
            photos={effectPhotos}
            sectionLabel={ko.dilemmaEdit.effectPhotoSectionTitle}
            stripAriaLabel={ko.dilemmaEdit.effectPhotoSectionTitle}
          />
        </div>
      ) : null}
    </article>
  );
}

type DilemmaPhotoPreview = { id: string; name?: string; dataUrl: string };

export function DilemmaPhotoStrip({
  photos = [],
  sectionLabel,
  stripAriaLabel,
}: {
  photos?: DilemmaPhotoPreview[];
  /** 섹션 제목(있을 때만 표시) */
  sectionLabel?: string;
  /** 사진 갤러리 접근성 이름 */
  stripAriaLabel?: string;
}) {
  const [activePhoto, setActivePhoto] = useState<DilemmaPhotoPreview | null>(null);

  if (!photos.length) {
    return null;
  }

  const aria = stripAriaLabel || ko.dilemmaUi.photoStripAria;

  return (
    <div className="dilemma-photo-strip-block">
      {sectionLabel ? <p className="section-label dilemma-photo-strip-section-label">{sectionLabel}</p> : null}
      <div className="dilemma-photo-strip" aria-label={aria}>
        {photos.map((photo) => (
          <Tooltip key={photo.id} label={photo.name}>
            <button type="button" className="dilemma-photo-strip-button" onClick={() => setActivePhoto(photo)}>
              <img src={photo.dataUrl} alt={photo.name || ko.dilemmaHelpers.defaultPhotoName} />
            </button>
          </Tooltip>
        ))}
      </div>
      {activePhoto ? (
        <div className="dilemma-photo-lightbox" role="dialog" aria-modal="true" aria-label={activePhoto.name || ko.dilemmaHelpers.defaultPhotoName} onClick={() => setActivePhoto(null)}>
          <button type="button" className="dilemma-photo-lightbox-close" onClick={() => setActivePhoto(null)}>
            ×
          </button>
          <img src={activePhoto.dataUrl} alt={activePhoto.name || ko.dilemmaHelpers.defaultPhotoName} onClick={(event) => event.stopPropagation()} />
        </div>
      ) : null}
    </div>
  );
}

interface HouseCrestBadgeProps {
  house: RedactedHouse | undefined;
  className?: string;
  tooltipLabel?: React.ReactNode;
  ariaLabel?: string;
  disableTooltip?: boolean;
}

export function HouseCrestBadge({ house, className = "", tooltipLabel, ariaLabel, disableTooltip = false }: HouseCrestBadgeProps) {
  const content = (
    <div className={`house-crest-badge ${className}`} aria-label={ariaLabel || house?.koreanTitle}>
      {isHouseCrestImageSrc(house?.crest) ? (
        <img src={house!.crest!.trim()} alt="" aria-hidden="true" />
      ) : (
        <HouseIcon motif={house?.motif} />
      )}
    </div>
  );

  if (disableTooltip || !tooltipLabel) {
    return content;
  }

  return <Tooltip label={tooltipLabel}>{content}</Tooltip>;
}

interface DilemmaSummaryCardProps {
  busy: boolean;
  currentHouseId: string | null;
  dilemma: DilemmaRecord;
  leaderHouseId: string | null;
  moderatorHouseId: string | null;
  history?: any[];
  houses?: RedactedHouse[];
  canEditDilemmaRoles?: boolean;
  canEditDilemmaCard?: boolean;
  editButtonRef?: React.RefObject<HTMLButtonElement>;
  resolutionButtonRef?: React.RefObject<HTMLButtonElement>;
  roleButtonRef?: React.RefObject<HTMLButtonElement>;
  /** 서버 redactState — 결과 입력(모달) 허용 여부; 작성자만 */
  canEnterDilemmaResolution?: boolean;
  /** 서버 redactState — 게시(이력) 가능 여부 */
  canPublishDilemmaResolution?: boolean;
  /** 서버 redactState — 결과 초기화 가능 여부 */
  canResetDilemmaResult?: boolean;
  onEdit: () => void;
  onOpenResolutionEntry?: () => void;
  onOpenRoleDialog: () => void;
  onPublish: () => void;
  onReset: () => void;
}

export function DilemmaSummaryCard({
  busy,
  currentHouseId,
  dilemma,
  leaderHouseId,
  moderatorHouseId,
  history = [],
  houses = [],
  canEditDilemmaRoles = false,
  canEditDilemmaCard,
  editButtonRef,
  resolutionButtonRef,
  roleButtonRef,
  canEnterDilemmaResolution = false,
  canPublishDilemmaResolution = false,
  canResetDilemmaResult = false,
  onEdit,
  onOpenResolutionEntry,
  onOpenRoleDialog,
  onPublish,
  onReset,
}: DilemmaSummaryCardProps) {
  const locked = Boolean(dilemma.editLock);
  const lockedByOther = Boolean(dilemma.editLock && dilemma.editLock.houseId !== currentHouseId);
  const isBlank = isDilemmaBlank(dilemma);
  const publishedEntry = dilemma.historyId ? history.find((entry) => entry.historyId === dilemma.historyId) : null;
  const published = Boolean(publishedEntry && isPublishedDilemmaCurrent(dilemma, publishedEntry));
  const editButtonLabel = isBlank ? ko.dilemmaUi.write : ko.dilemmaUi.edit;
  const votes = normalizeDilemmaVotes(dilemma.votes);
  const resolutionChecklist = normalizeResolutionChecklist(dilemma.resolutionChecklist);
  const resolutionMemo = resolutionChecklist.memo || "";
  const participants = getActiveDilemmaVoteHouses(houses);
  const ayePower = sumDilemmaVotes(votes, participants, "aye");
  const nayPower = sumDilemmaVotes(votes, participants, "nay");
  const houseById = new Map((houses || []).map((house) => [house.id, house]));
  const leaderHouse = houseById.get(leaderHouseId as string) || null;
  const moderatorHouse = houseById.get(moderatorHouseId as string) || null;
  const rolesReady = Boolean(leaderHouseId && moderatorHouseId);
  const hasDilemmaFlowState = !isBlank || rolesReady;
  const voteComplete = isDilemmaVoteCompleteForPublish(dilemma, houses);
  const publishBlockReason = getDilemmaPublishBlockReason(dilemma, houses);
  const status = getDilemmaStatusLabel({
    dilemma,
    isBlank,
    leaderHouse,
    moderatorHouse,
    published,
    rolesReady,
    voteComplete,
  });
  
  const hasAssignedRoles = Boolean(leaderHouseId || moderatorHouseId);
  const canSetRoles =
    Boolean(currentHouseId) &&
    isBlank &&
    !locked &&
    (!hasAssignedRoles || canEditDilemmaRoles);
  const canEdit =
    Boolean(currentHouseId) &&
    !lockedByOther &&
    rolesReady &&
    (typeof canEditDilemmaCard === "boolean" ? canEditDilemmaCard : true);
  const canPublishByOwner =
    typeof canEditDilemmaCard === "boolean" ? canEditDilemmaCard : canPublishDilemmaResolution;
  const publishReadyClient = Boolean(currentHouseId) && !locked && !isBlank && !publishBlockReason;
  const canPublish = publishReadyClient && canPublishByOwner;
  const canReset = Boolean(currentHouseId) && !lockedByOther && hasDilemmaFlowState && canResetDilemmaResult;
  const resolutionEntryAvailable =
    rolesReady &&
    !isBlank &&
    (Boolean(dilemma.voteNotes?.trim()) ||
      Boolean(dilemma.selectedOutcome) ||
      hasDilemmaResolutionPublishContent(dilemma));
  const resolutionLockOk = !dilemma.editLock || dilemma.editLock.houseId === currentHouseId;
  const canOpenResolutionEntry =
    Boolean(currentHouseId && onOpenResolutionEntry) &&
    resolutionEntryAvailable &&
    resolutionLockOk &&
    (canEnterDilemmaResolution || canResetDilemmaResult);

  const roleTooltip = locked
    ? ko.dilemmaUi.roleTooltipLocked
    : !isBlank
      ? ko.dilemmaUi.roleTooltipWrongPhase
      : !hasAssignedRoles || canEditDilemmaRoles
        ? ko.dilemmaUi.roleTooltipOk
        : ko.dilemmaUi.roleTooltipOwnerOnly;
  const editTooltip = lockedByOther
    ? ko.dilemmaUi.editTooltipWait
    : !rolesReady
      ? ko.dilemmaUi.editTooltipNeedRoles
      : typeof canEditDilemmaCard === "boolean"
        ? canEditDilemmaCard
          ? isBlank
            ? ko.dilemmaUi.editTooltipNew
            : ko.dilemmaUi.editTooltipEdit
          : ko.dilemmaUi.editTooltipAuthorOnly
        : isBlank
          ? ko.dilemmaUi.editTooltipNew
          : ko.dilemmaUi.editTooltipEdit;
  const publishTooltip = locked
    ? ko.dilemmaUi.publishTooltipLocked
    : isBlank
      ? ko.dilemmaUi.publishTooltipEmpty
      : publishBlockReason ||
        (!canPublishByOwner && publishReadyClient
          ? ko.dilemmaUi.publishTooltipAuthorOnly
          : ko.dilemmaUi.publishTooltipDefault);
  const resetTooltip = lockedByOther
    ? ko.dilemmaUi.resetTooltipWait
    : !hasDilemmaFlowState
      ? ko.dilemmaUi.resetTooltipNone
      : !canResetDilemmaResult
      ? ko.dilemmaUi.resetTooltipAuthorOnly
      : ko.dilemmaUi.resetTooltipOk;
  const resolutionEntryTooltip = !resolutionLockOk
    ? ko.dilemmaResolution.resultEntryTooltipLocked
    : ko.dilemmaResolution.resultEntryTooltip;

  const cardCode = dilemma.cardCode.trim();
  const slotPlacement = dilemma.timeCounterSlot.trim();
  const voteNotesText = dilemma.voteNotes.trim();
  const voteTallyRecorded = Boolean(voteNotesText);
  const outcomeDisplay =
    (dilemmaOutcomeLabels as Record<string, string>)[dilemma.selectedOutcome || ""] || ko.common.undecided;
  const advantageDisplay = formatDilemmaVoteAdvantage(ayePower, nayPower);
  return (
    <section className="dilemma-ledger-card" aria-labelledby="dilemma-ledger-title">
      <div className="dilemma-summary-head">
        <div className="panel-title-row">
          <span className="panel-title-icon" aria-hidden="true">
            <TokenIcon type="scroll" />
          </span>
          <h3 id="dilemma-ledger-title">{ko.dilemmaUi.ledgerTitle}</h3>
          {!isBlank ? (
            <div className="dilemma-header-meta" aria-label="딜레마 카드 정보">
              <span className="dilemma-header-meta-chip">
                <span>{ko.dilemmaUi.summaryLabelCardCode}</span>
                <strong>{cardCode || "—"}</strong>
              </span>
              <span className="dilemma-header-meta-chip dilemma-header-meta-chip--sticker">
                <span>{ko.dilemmaUi.summaryLabelStorySticker}</span>
                {dilemma.mysteryStickerId ? (
                  <Tooltip
                    label={`${ko.mysteryStickers.previewLabel}: ${getMysteryStickerLabel(dilemma.mysteryStickerId)}`}
                    ariaLabel={`${ko.mysteryStickers.previewAlt}: ${getMysteryStickerLabel(dilemma.mysteryStickerId)}`}
                  >
                    <span className="dilemma-header-sticker-wrap">
                      <MysteryStickerImage
                        stickerId={dilemma.mysteryStickerId}
                        publicPath={getMysteryStickerEntry(dilemma.mysteryStickerId)?.publicPath}
                        presentation="decorative"
                      />
                    </span>
                  </Tooltip>
                ) : (
                  <strong>—</strong>
                )}
              </span>
              {slotPlacement ? (
                <span className="dilemma-header-meta-chip">
                  <span>{ko.dilemmaUi.summaryLabelTimeSlot}</span>
                  <strong>{slotPlacement}</strong>
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="dilemma-summary-actions">
          <span className={`dilemma-status-pill status-${status.tone}${dilemma.editLock ? " locked" : ""}`}>
            {status.text}
          </span>
          <Tooltip label={roleTooltip}>
            <button
              ref={roleButtonRef}
              className="ghost-button dilemma-summary-button"
              type="button"
              onClick={onOpenRoleDialog}
              disabled={busy || !canSetRoles}
            >
              <TokenIcon type="crown" />
              {ko.dilemmaUi.roleButton}
            </button>
          </Tooltip>
          <Tooltip label={editTooltip}>
            <button
              ref={editButtonRef}
              className="ghost-button dilemma-summary-button dilemma-edit-button"
              type="button"
              onClick={onEdit}
              disabled={busy || !canEdit}
            >
              <TokenIcon type="scroll" />
              {editButtonLabel}
            </button>
          </Tooltip>
          {resolutionEntryAvailable ? (
            <Tooltip label={resolutionEntryTooltip}>
              <button
                ref={resolutionButtonRef}
                className="ghost-button dilemma-summary-button dilemma-resolution-entry-button"
                type="button"
                onClick={onOpenResolutionEntry}
                disabled={busy || !canOpenResolutionEntry}
              >
                <TokenIcon type="resolution" />
                {ko.dilemmaResolution.resultEntryButton}
              </button>
            </Tooltip>
          ) : null}
          <Tooltip label={publishTooltip}>
            <button
              className="ghost-button dilemma-summary-button"
              type="button"
              onClick={onPublish}
              disabled={busy || !canPublish}
            >
              <TokenIcon type="history" />
              {ko.dilemmaUi.publish}
            </button>
          </Tooltip>
          <Tooltip label={resetTooltip}>
            <button
              className="ghost-button dilemma-summary-button danger-button"
              type="button"
              onClick={onReset}
              disabled={busy || !canReset}
            >
              <TokenIcon type="reset" />
              {ko.dilemmaUi.reset}
            </button>
          </Tooltip>
        </div>
      </div>

      {isBlank ? (
        <p className="dilemma-empty">{ko.dilemmaUi.emptyRound}</p>
      ) : (
        <div className="dilemma-summary-body">
          <div className="dilemma-summary-compact">
            <section className="dilemma-summary-roles" aria-label={ko.dilemmaUi.summaryLabelRoles}>
              <p className="section-label dilemma-summary-roles-label">{ko.dilemmaUi.summaryLabelRoles}</p>
              <div className="dilemma-summary-roles-row">
                <div className="dilemma-summary-role">
                  {leaderHouse ? (
                    <HouseCrestBadge house={leaderHouse} className="dilemma-summary-role-crest" disableTooltip />
                  ) : (
                    <div className="house-crest-badge dilemma-summary-role-crest dilemma-summary-role-crest--empty" aria-hidden="true" />
                  )}
                  <div className="dilemma-summary-role-text">
                    <span className="dilemma-summary-role-kind">
                      <span className="dilemma-summary-role-kind-icon">
                        <TokenIcon type="leader" />
                      </span>
                      <span className="dilemma-summary-role-kind-label">{ko.dilemmaUi.sessionLeader}</span>
                    </span>
                    {leaderHouse ? (
                      <Tooltip className="dilemma-summary-role-name-tooltip" label={getHouseHoverLabel(leaderHouse)}>
                        <HouseRoleNameStack house={leaderHouse} />
                      </Tooltip>
                    ) : (
                      <HouseRoleNameStack house={leaderHouse} />
                    )}
                  </div>
                </div>
                <div className="dilemma-summary-role">
                  {moderatorHouse ? (
                    <HouseCrestBadge house={moderatorHouse} className="dilemma-summary-role-crest" disableTooltip />
                  ) : (
                    <div className="house-crest-badge dilemma-summary-role-crest dilemma-summary-role-crest--empty" aria-hidden="true" />
                  )}
                  <div className="dilemma-summary-role-text">
                    <span className="dilemma-summary-role-kind">
                      <span className="dilemma-summary-role-kind-icon">
                        <TokenIcon type="moderator" />
                      </span>
                      <span className="dilemma-summary-role-kind-label">{ko.dilemmaUi.sessionModerator}</span>
                    </span>
                    {moderatorHouse ? (
                      <Tooltip className="dilemma-summary-role-name-tooltip" label={getHouseHoverLabel(moderatorHouse)}>
                        <HouseRoleNameStack house={moderatorHouse} />
                      </Tooltip>
                    ) : (
                      <HouseRoleNameStack house={moderatorHouse} />
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
          <DilemmaTextPreview label={ko.dilemmaHistory.labelContext} value={dilemma.context} />
          <div className="dilemma-summary-vote-divider" aria-hidden="true" />
          <DilemmaVoteBreakdown dilemma={dilemma} houses={houses} />
          {voteTallyRecorded ? (
            <div className="dilemma-summary-vote-pills" role="group">
              <div className="dilemma-summary-vote-pill">
                <span className="dilemma-summary-vote-pill__label">{ko.dilemmaHistory.factResult}</span>
                <span className="dilemma-summary-vote-pill__value">{outcomeDisplay}</span>
                <span className="dilemma-summary-vote-pill__detail">
                  <MentionTokenView
                    className="dilemma-display-mention-token"
                    emptyText={ko.common.none}
                    text={voteNotesText}
                  />
                </span>
              </div>
              <div className="dilemma-summary-vote-pill">
                <span className="dilemma-summary-vote-pill__label">{ko.dilemmaUi.factAdvantage}</span>
                <span className="dilemma-summary-vote-pill__value">{advantageDisplay}</span>
              </div>
            </div>
          ) : null}
          <div className="dilemma-outcome-grid">
            <DilemmaOutcomePreview label={ko.dilemmaUi.labelAye} selected={dilemma.selectedOutcome === "aye"} outcome={dilemma.aye} />
            <DilemmaOutcomePreview label={ko.dilemmaUi.labelNay} selected={dilemma.selectedOutcome === "nay"} outcome={dilemma.nay} />
          </div>
          <DilemmaPhotoStrip
            photos={dilemma.photos}
            sectionLabel={ko.dilemmaHistory.labelPhotosCard}
            stripAriaLabel={ko.dilemmaUi.photoStripAria}
          />
          {resolutionMemo ? (
            <DilemmaTextPreview label={ko.dilemmaHistory.labelMemo} value={resolutionMemo} />
          ) : null}
          <DilemmaPhotoStrip
            photos={dilemma.resolutionPhotos}
            sectionLabel={ko.dilemmaHistory.labelPhotosResolution}
            stripAriaLabel={ko.dilemmaUi.photoStripResolutionAria}
          />
          {dilemma.updatedByName ? (
            <p className="dilemma-updated">
              {ko.dilemmaUi.savedLine(dilemma.updatedByName, formatLocalDateTime(dilemma.updatedAt))}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}

export function DilemmaVoteBreakdown({ dilemma, houses = [] }: { dilemma: DilemmaRecord; houses?: RedactedHouse[] }) {
  const votes = normalizeDilemmaVotes(dilemma.votes);
  const groups = createDilemmaVoteGroups(votes, houses);
  const hasVotes = groups.some((group) => group.items.length > 0);

  if (!hasVotes) {
    return null;
  }

  return (
    <section className="dilemma-vote-breakdown" aria-label={ko.dilemmaUi.voteBreakdownAria}>
      {groups.map((group) => (
        <div className={`dilemma-vote-breakdown-group tone-${group.side}`} key={group.side}>
          <header>
            <span>{group.label}</span>
            <strong>{formatDilemmaVoteGroupMetric(group)}</strong>
          </header>
          <div className="dilemma-vote-breakdown-list">
            {group.items.length ? (
              group.items.map((item: any) => (
                <span className="dilemma-vote-breakdown-chip" key={item.houseId}>
                  <HouseCrestBadge
                    house={item.house}
                    className="dilemma-vote-breakdown-crest"
                    tooltipLabel={item.hoverLabel}
                    ariaLabel={item.hoverLabel}
                  />
                  <span className="dilemma-vote-breakdown-chip-main">
                    <strong>{item.houseTitle}</strong>
                    {item.secondaryLine ? <small>{item.secondaryLine}</small> : null}
                  </span>
                  {item.powerTokens > 0 ? <em>{ko.dilemmaUi.powerEm(item.powerTokens)}</em> : null}
                </span>
              ))
            ) : (
              <span className="dilemma-vote-breakdown-empty">{ko.dilemmaUi.breakdownEmpty}</span>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}

export function DilemmaResourceDeltaPreview({ deltas }: { deltas: any }) {
  const normalizedDeltas = normalizeDilemmaResourceDeltas(deltas);
  const entries = resourceCounters
    .map((resource) => ({
      ...resource,
      value: normalizedDeltas[resource.id] || 0,
    }))
    .filter((resource) => resource.value !== 0);

  if (!entries.length) {
    return null;
  }

  return (
    <div className="dilemma-resource-delta-preview" aria-label={ko.dilemmaUi.resourceDeltaAria}>
      {entries.map((resource) => (
        <Tooltip
          className={`dilemma-resource-delta-chip tone-${resource.tone} ${
            resource.value > 0 ? "positive" : "negative"
          }`}
          key={resource.id}
          label={`${resource.label} ${formatDilemmaResourceDelta(resource.value)}`}
        >
          <TokenIcon type={resource.icon} />
          <span>{resource.label}</span>
          <strong>{formatDilemmaResourceDelta(resource.value)}</strong>
        </Tooltip>
      ))}
    </div>
  );
}

export function HouseVoteResultLabel({ side, powerTokens }: { side: string; powerTokens: number }) {
  const sideLabel =
    side === "aye"
      ? ko.dilemmaHelpers.sideAye
      : side === "nay"
        ? ko.dilemmaHelpers.sideNay
        : ko.dilemmaHelpers.sidePass;
  const tone = side === "aye" ? "aye" : side === "nay" ? "nay" : "pass";

  return (
    <span className={`house-vote-result-label tone-${tone}`}>
      <strong>{sideLabel}</strong>
      {powerTokens > 0 ? <em>{ko.dilemmaUi.powerEm(powerTokens)}</em> : null}
    </span>
  );
}

export function SessionRoleLabel({ role }: { role: string }) {
  if (role === "leader") {
    return (
      <span className="session-role-label tone-leader">
        <TokenIcon type="leader" />
        <strong>{ko.dilemmaUi.sessionLeader}</strong>
      </span>
    );
  }
  if (role === "moderator") {
    return (
      <span className="session-role-label tone-moderator">
        <TokenIcon type="moderator" />
        <strong>{ko.dilemmaUi.sessionModerator}</strong>
      </span>
    );
  }
  return null;
}
export function StatusItem({ icon, label, value, splitParenthetical = false }: { icon: string; label: string; value: string; splitParenthetical?: boolean }) {
  const parentheticalValue =
    splitParenthetical && typeof value === "string" ? splitParentheticalStatusValue(value) : null;
  const leaderRow = icon === "leader";

  return (
    <div className={`status-item${leaderRow ? " status-item--leader" : ""}`}>
      <span className="status-icon" aria-hidden="true">
        <TokenIcon type={icon} />
      </span>
      <span>{label}</span>
      <strong>
        {parentheticalValue ? (
          <>
            <span className="status-value-main">{parentheticalValue.main}</span>
            <span className="status-value-detail">({parentheticalValue.detail})</span>
          </>
        ) : (
          value
        )}
      </strong>
    </div>
  );
}

function splitParentheticalStatusValue(value: string) {
  const match = value.match(/^(.+?)\s+\(([^)]+)\)$/);

  if (!match) {
    return null;
  }

  return {
    main: match[1],
    detail: match[2],
  };
}

interface TurnTrackProps {
  houses: RedactedHouse[];
  draftOrder: string[];
  turn: string | null;
  phase: string;
}

export function TurnTrack({ houses, draftOrder, turn, phase }: TurnTrackProps) {
  const claimedHouses = (houses || []).filter((house) => house.hasPassword);
  const orderedHouses = draftOrder?.length
    ? draftOrder.map((houseId) => houses?.find((house: RedactedHouse) => house.id === houseId)).filter((h): h is RedactedHouse => Boolean(h))
    : claimedHouses;
  const nodes = orderedHouses.length ? orderedHouses : [];

  return (
    <div
      className="turn-track"
      aria-label={ko.dilemmaUi.turnTrackAria}
      style={{ gridTemplateColumns: `repeat(${Math.max(nodes.length, 1)}, 34px)` }}
    >
      {nodes.map((house: RedactedHouse) => {
        const selected = turn === house.id;
        const done = Boolean(house.hasChosen);
        const statusLabel = [
          getHouseHoverLabel(house),
          selected ? ko.dilemmaUi.currentTurn : "",
          done ? ko.dilemmaUi.agendaChosen : "",
        ]
          .filter(Boolean)
          .join(", ");

        return (
          <HouseCrestBadge
            house={house}
            className={`turn-node${selected ? " current" : ""}${done ? " done" : ""}${phase === "house-select" ? " claimed" : ""}`}
            key={house.id}
            tooltipLabel={getHouseHoverLabel(house)}
            ariaLabel={statusLabel}
          />
        );
      })}
    </div>
  );
}

interface VoteOrderTrackProps {
  houses: RedactedHouse[];
  leaderHouseId: string | null;
  moderatorHouseId: string | null;
  turn: string | null;
}

export function VoteOrderTrack({ houses, leaderHouseId, moderatorHouseId, turn }: VoteOrderTrackProps) {
  if (!houses.length) {
    return null;
  }

  return (
    <div className="vote-order-track" aria-label={ko.dilemmaUi.voteOrderAria}>
      <div className="vote-order-track-ring">
        {houses.map((house: RedactedHouse, index: number) => {
          const leader = house.id === leaderHouseId;
          const moderator = house.id === moderatorHouseId;
          const current = house.id === turn;
          const statusLabel = [
            ko.voteOrder.seatAria(index + 1, getHouseHoverLabel(house)),
            leader ? ko.dilemmaUi.legendLeader : "",
            moderator ? ko.dilemmaUi.legendModerator : "",
            current ? ko.dilemmaUi.legendCurrent : "",
          ]
            .filter(Boolean)
            .join(", ");

          return (
            <HouseCrestBadge
              house={house}
              className={`vote-order-track-node${leader ? " leader" : ""}${moderator ? " moderator" : ""}${current ? " current" : ""}`}
              key={house.id}
              tooltipLabel={getHouseHoverLabel(house)}
              ariaLabel={statusLabel}
            />
          );
        })}
      </div>
      <div className="vote-order-track-legend">
        <span className="leader">
          <TokenIcon type="leader" /> {ko.dilemmaUi.legendLeader}
        </span>
        <span className="moderator">
          <TokenIcon type="moderator" /> {ko.dilemmaUi.legendModerator}
        </span>
        <span className="legend-current">
          <i className="current" /> {ko.dilemmaUi.legendCurrent}
        </span>
      </div>
    </div>
  );
}

export function GameMessage({ state }: { state: any }) {
  let text: string;

  if (state.phase === "house-select") {
    const remaining = Math.max((state.requiredHouseCount || REQUIRED_HOUSE_COUNT) - (state.claimedHouseCount || 0), 0);
    text = remaining ? ko.dilemmaUi.houseSelectRemain(remaining) : ko.dilemmaUi.seatsFull;
  } else if (state.phase === "complete") {
    if (!isDilemmaBlank(state.dilemma)) {
      const dilemma = normalizeDilemmaRecord(state.dilemma);
      const participants = getDilemmaVoteParticipants(state);
      const votes = normalizeDilemmaVotes(dilemma.votes);
      const selfId = state.currentHouseId;
      const selfVoted = Boolean(selfId && votes[selfId]?.side);
      const everyVoted =
        participants.length > 0 && participants.every((house: RedactedHouse) => Boolean(votes[house.id]?.side));

      if (dilemma.selectedOutcome) {
        text = ko.dilemmaUi.outcomePickedBlurb(dilemmaOutcomeLabels[dilemma.selectedOutcome as keyof typeof dilemmaOutcomeLabels]);
      } else if (dilemma.voteNotes?.trim() && !dilemma.selectedOutcome) {
        text = dilemmaAwaitingModeratorResolution(dilemma, votes, participants)
          ? ko.houseHelpers.moderatorTieBlurb
          : ko.houseHelpers.needOutcome;
      } else if (state.canVoteDilemma) {
        if (selfVoted && !everyVoted) {
          text = ko.dilemmaUi.voteSubmittedWaitOthers;
        } else if (everyVoted && !dilemma.voteNotes?.trim()) {
          text = ko.dilemmaUi.allVotedRecord;
        } else {
          text = ko.dilemmaUi.myVoteTurn;
        }
      } else if (selfVoted && !everyVoted) {
        text = ko.dilemmaUi.voteSubmittedWaitOthers;
      } else if (everyVoted && !dilemma.voteNotes?.trim()) {
        text = ko.dilemmaUi.allVotedRecord;
      } else {
        text = ko.dilemmaUi.waitYourTurn;
      }
    } else {
      text = ko.dilemmaUi.needRolesWrite;
    }
  } else if (state.canDiscard) {
    text = state.randomDiscardEnabled
      ? ko.dilemmaUi.discardRandom(getHouseDisplayName(state, state.currentHouseId))
      : ko.dilemmaUi.discardPick(getHouseDisplayName(state, state.currentHouseId));
  } else if (state.canChoose) {
    text = ko.dilemmaUi.chooseSecret(getHouseDisplayName(state, state.currentHouseId));
  } else if (state.ownChoice) {
    text = ko.dilemmaUi.choiceDone;
  } else {
    text = ko.dilemmaUi.waitingTurn(getHouseDisplayName(state, state.currentHouseId), getHouseDisplayName(state, state.turn));
  }

  return <p className="message">{text}</p>;
}

interface DilemmaVotingPanelProps {
  state: any;
  busy: boolean;
  mutate: (data: any) => Promise<boolean>;
}

export function DilemmaVotingPanel({ state, busy, mutate }: DilemmaVotingPanelProps) {
  const dilemma = useMemo(() => normalizeDilemmaRecord(state.dilemma), [state.dilemma]);
  const votes = useMemo(() => normalizeDilemmaVotes(dilemma.votes), [dilemma.votes]);
  const participants = useMemo(() => getDilemmaVoteParticipants(state), [state]);
  const ownVote = normalizeDilemmaVote(votes[state.currentHouseId]);
  const ownPowerTokens = normalizeCounter(state.ownInventory?.powerTokens, inventoryCounterMax.powerTokens, 0);
  const [side, setSide] = useState<DilemmaVote["side"]>(ownVote.side || "");
  const [powerTokens, setPowerTokens] = useState(Math.min(ownVote.powerTokens || 1, ownPowerTokens));
  const [statusText, setStatusText] = useState("");
  const voteTouchedRef = useRef(false);
  const selectedOutcome = dilemma.selectedOutcome;
  const votedCount = participants.filter((house) => votes[house.id]?.side).length;
  const allVoted = participants.length > 0 && participants.every((house) => Boolean(votes[house.id]?.side));
  const voteTurnName = getDilemmaVoteTurnName(state);
  const tallyPending = !dilemma.voteNotes?.trim();
  const votingComplete = !selectedOutcome && tallyPending && allVoted;
  const ayePower = sumDilemmaVotes(votes, participants, "aye");
  const nayPower = sumDilemmaVotes(votes, participants, "nay");
  const tieAwaitingModerator = dilemmaAwaitingModeratorResolution(dilemma, votes, participants);
  const isModerator = Boolean(state.currentHouseId && state.dilemmaModerator === state.currentHouseId);
  const passCount = participants.filter((house) => votes[house.id]?.side === "pass").length;
  const roster = getHouses(state);
  const leaderHouse =
    state.dilemmaLeader ? roster.find((h) => h.id === state.dilemmaLeader) ?? null : null;
  const moderatorHouse =
    state.dilemmaModerator ? roster.find((h) => h.id === state.dilemmaModerator) ?? null : null;
  const advantageText = formatDilemmaVoteAdvantage(ayePower, nayPower);
  const isPassing = side === "pass";
  const activePower = isPassing ? 0 : Math.min(powerTokens, ownPowerTokens);
  const hasValidWager = isPassing || activePower >= 1;
  const canSaveVote =
    Boolean(state.currentHouseId) && state.canVoteDilemma && !busy && !selectedOutcome && tallyPending && side && hasValidWager;
  const canApplyTally = Boolean(state.canApplyDilemmaVotes) && !busy;

  useEffect(() => {
    const nextVote = normalizeDilemmaVote(votes[state.currentHouseId]);
    queueMicrotask(() => {
      setSide(nextVote.side || "");
      setPowerTokens(Math.min(nextVote.powerTokens || 1, ownPowerTokens));
    });
  }, [ownPowerTokens, state.currentHouseId, votes]);

  const updateSide = (nextSide: DilemmaVote["side"]) => {
    voteTouchedRef.current = true;
    setSide(nextSide);

    if (nextSide === "pass") {
      setPowerTokens(0);
    } else if (powerTokens < 1) {
      setPowerTokens(Math.min(1, ownPowerTokens));
    }
  };

  const adjustPower = (amount: number) => {
    voteTouchedRef.current = true;
    setPowerTokens((current) => Math.max(0, Math.min(ownPowerTokens, current + amount)));
  };

  const applyVotes = async () => {
    setStatusText("");
    const result = await mutate({ action: "applyDilemmaVotes" });
    setStatusText(result ? ko.dilemmaUi.applyOk : ko.dilemmaUi.applyFail);
  };

  const resolveTie = async (decision: "aye" | "nay") => {
    setStatusText("");
    const result = await mutate({ action: "resolveModeratorDecision", decision });
    setStatusText(result ? ko.dilemmaUi.moderatorResolveOk : ko.dilemmaUi.moderatorResolveFail);
  };

  useEffect(() => {
    if (!voteTouchedRef.current || !canSaveVote) {
      return undefined;
    }

    const savedPower = ownVote.side === "pass" ? 0 : ownVote.powerTokens;

    if (ownVote.side === side && savedPower === activePower) {
      return undefined;
    }

    const timer = window.setTimeout(async () => {
      const result = await mutate({
        action: "saveDilemmaVote",
        vote: {
          side,
          powerTokens: activePower,
        },
      });

      setStatusText(result ? "" : ko.dilemmaUi.voteSavedFail);
    }, 180);

    return () => window.clearTimeout(timer);
  }, [activePower, canSaveVote, mutate, ownVote.powerTokens, ownVote.side, side]);

  return (
    <div className={`dilemma-vote-panel${selectedOutcome ? " applied" : ""}`}>
      <div className="dilemma-vote-summary">
        <span>
          {selectedOutcome
            ? ko.dilemmaUi.voteSummaryOutcome(dilemmaOutcomeLabels[selectedOutcome as keyof typeof dilemmaOutcomeLabels])
            : tieAwaitingModerator
              ? ko.dilemmaUi.votePhaseComplete
              : votingComplete
                ? ko.dilemmaUi.votePhaseComplete
                : ko.dilemmaUi.votePhaseProgress}
        </span>
        <strong>
          {selectedOutcome
            ? ko.dilemmaUi.tallyLine(ayePower, nayPower, passCount)
            : tieAwaitingModerator
              ? ko.houseHelpers.moderatorTieBlurb
              : votingComplete
                ? ko.dilemmaUi.allHouseVotedLine
                : voteTurnName
                  ? ko.dilemmaUi.turnOnly(voteTurnName)
                  : ko.dilemmaUi.voteCountLine(votedCount, participants.length)}
        </strong>
      </div>
      <div className="dilemma-vote-role-grid" aria-label={ko.dilemmaUi.voteRoleGridAria}>
        <span className="role-cell">
          <small>
            <TokenIcon type="leader" /> {ko.dilemmaUi.leaderShort}
          </small>
          <strong>
            <HouseRoleNameStack house={leaderHouse} emptyMark={ko.common.notSpecified} />
          </strong>
        </span>
        <span className="role-cell">
          <small>
            <TokenIcon type="moderator" /> {ko.dilemmaUi.moderatorShort}
          </small>
          <strong>
            <HouseRoleNameStack house={moderatorHouse} emptyMark={ko.common.notSpecified} />
          </strong>
        </span>
        <span>
          <small>{ko.dilemmaUi.ayeLead}</small>
          <strong>
            <VoteSideLeadStack votes={votes} participants={participants} side="aye" />
          </strong>
        </span>
        <span>
          <small>{ko.dilemmaUi.nayLead}</small>
          <strong>
            <VoteSideLeadStack votes={votes} participants={participants} side="nay" />
          </strong>
        </span>
        <span className="wide">
          <small>{ko.dilemmaUi.advantageNow}</small>
          <strong>{advantageText}</strong>
        </span>
      </div>
      {!selectedOutcome && tieAwaitingModerator && isModerator ? (
        <div className="dilemma-vote-actions" role="group" aria-label={ko.dilemmaUi.moderatorDecideAria}>
          <button
            className="primary-button compact"
            type="button"
            onClick={() => resolveTie("aye")}
            disabled={busy}
          >
            {ko.dilemmaUi.moderatorPickAye}
          </button>
          <button
            className="secondary-button compact"
            type="button"
            onClick={() => resolveTie("nay")}
            disabled={busy}
          >
            {ko.dilemmaUi.moderatorPickNay}
          </button>
        </div>
      ) : null}
      {!selectedOutcome && !tieAwaitingModerator && !state.canVoteDilemma && !votingComplete ? (
        <p className="dilemma-vote-turn-note">{ko.dilemmaUi.waitYourTurn}</p>
      ) : null}
      {!selectedOutcome && state.canVoteDilemma ? (
        <>
          <div className="dilemma-vote-options" role="group" aria-label={ko.dilemmaUi.voteOptionsAria}>
            {[
              { id: "aye", label: ko.dilemmaUi.labelAye, tone: "aye" },
              { id: "nay", label: ko.dilemmaUi.labelNay, tone: "nay" },
              { id: "pass", label: ko.dilemmaUi.labelPass, tone: "pass" },
            ].map((option) => (
              <button
                className={`dilemma-vote-option tone-${option.tone}${side === option.id ? " selected" : ""}`}
                type="button"
                key={option.id}
                onClick={() => updateSide(option.id as DilemmaVote["side"])}
                disabled={busy}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="dilemma-vote-wager">
            <span className="counter-icon" aria-hidden="true">
              <TokenIcon type="power" />
            </span>
            <span className="counter-label">{ko.common.powerTokensLabel}</span>
            <div className="counter-controls">
              <button
                className="stepper-button compact"
                type="button"
                aria-label={ko.dilemmaUi.stepperMinusAria}
                onClick={() => adjustPower(-1)}
                disabled={busy || isPassing || activePower <= 0}
              >
                <TokenIcon type="minus" />
              </button>
              <output aria-label={ko.dilemmaUi.wagerOutputAria}>
                {isPassing ? 0 : activePower}
                <span>/{ownPowerTokens}</span>
              </output>
              <button
                className="stepper-button compact"
                type="button"
                aria-label={ko.dilemmaUi.stepperPlusAria}
                onClick={() => adjustPower(1)}
                disabled={busy || isPassing || activePower >= ownPowerTokens}
              >
                <TokenIcon type="plus" />
              </button>
            </div>
          </div>
        </>
      ) : null}
      {!selectedOutcome && (state.canVoteDilemma || votingComplete) ? (
        <div className="dilemma-vote-actions">
          {votingComplete && state.canApplyDilemmaVotes ? (
            <button className="primary-button compact" type="button" onClick={applyVotes} disabled={!canApplyTally}>
              {ko.dilemmaUi.applyTally}
            </button>
          ) : null}
        </div>
      ) : null}
      {statusText ? <p className="dilemma-vote-status" aria-live="polite">{statusText}</p> : null}
    </div>
  );
}

export function DilemmaResourcePolarityPreview({ polarities }: { polarities: any }) {
  const normalizedPolarities = normalizeDilemmaResourcePolarities(polarities);
  const entries = dilemmaResultMarkers
    .map((marker) => ({
      ...marker,
      polarity: normalizedPolarities[marker.id as DilemmaResultMarkerId],
    }))
    .filter((marker) => marker.polarity === "positive" || marker.polarity === "negative");

  if (!entries.length) {
    return null;
  }

  return (
    <div className="dilemma-resource-delta-preview" aria-label={ko.dilemmaUi.resourcePolarityAria}>
      {entries.map((resource) => {
        const polarityLabel =
          resource.polarity === "positive"
            ? ko.dilemmaUi.resourcePolarityPositive
            : ko.dilemmaUi.resourcePolarityNegative;

        return (
          <Tooltip
            className={`dilemma-resource-delta-chip tone-${resource.tone} ${resource.polarity}`}
            key={resource.id}
            label={`${resource.label} ${polarityLabel}`}
          >
            <TokenIcon type={resource.icon} />
            <span>{resource.label}</span>
            <strong>{polarityLabel}</strong>
          </Tooltip>
        );
      })}
    </div>
  );
}
