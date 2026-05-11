import React, { useState, useEffect, useMemo } from "react";
import { RedactedHouse, DilemmaPhoto, DilemmaRecord } from "../types/game";
import { getMysteryStickerEntry } from "../../shared/mystery-stickers.mts";
import { getMysteryStickerLabel } from "../utils/mystery-sticker-labels";
import { MysteryStickerImage } from "./MysteryStickerImage";
import { 
  formatDilemmaResourceDelta, 
  normalizeDilemmaRecord, 
  isDilemmaBlank, 
  normalizeDilemmaVotes, 
  sumDilemmaVotes, 
  isDilemmaVoteCompleteForPublish, 
  getDilemmaPublishBlockReason, 
  formatDilemmaCardLabel, 
  formatDilemmaVoteAdvantage,
  normalizeDilemmaOutcome,
  normalizeDilemmaResourceDeltas,
  createDilemmaVoteGroups,
  formatDilemmaVoteGroupMetric,
  normalizeDilemmaVote,
  formatDilemmaSideLeader,
  getDilemmaStatusLabel,
} from "../utils/dilemma-helpers";
import { 
  getHouseKoreanName, 
  getHouseHoverLabel, 
  getDilemmaVoteParticipants, 
  getDilemmaVoteTurnName,
  getHouseDisplayName,
  isHouseCrestImageSrc,
} from "../utils/house-helpers";
import { TokenIcon, HouseIcon } from "./GameIcons";
import { Tooltip } from "./Tooltip";
import { 
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

export function DilemmaFact({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="dilemma-fact">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

export function DilemmaTextPreview({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="dilemma-text-preview">
      <span>{label}</span>
      <p>{value || ko.common.none}</p>
    </div>
  );
}

export function DilemmaOutcomePreview({ label, outcome, selected }: { label: string; outcome: any; selected: boolean }) {
  const normalizedOutcome = normalizeDilemmaOutcome(outcome);
  const hasResourceDeltas = resourceCounters.some(
    (resource) => ((normalizedOutcome.resourceDeltas as any)[resource.id] || 0) !== 0,
  );

  return (
    <article className={`dilemma-outcome-preview${selected ? " selected" : ""}`}>
      <header>
        <strong>{label}</strong>
        {selected ? <span>{ko.dilemmaUi.outcomeSelectedChip}</span> : null}
      </header>
      {hasResourceDeltas ? (
        <DilemmaResourceDeltaPreview deltas={normalizedOutcome.resourceDeltas} />
      ) : (
        <p className="dilemma-outcome-empty">{ko.dilemmaUi.outcomeEmptyPreview}</p>
      )}
    </article>
  );
}

export function DilemmaPhotoStrip({ photos = [] }: { photos?: DilemmaPhoto[] }) {
  if (!photos.length) {
    return null;
  }

  return (
    <div className="dilemma-photo-strip" aria-label={ko.dilemmaUi.photoStripAria}>
      {photos.map((photo) => (
        <Tooltip key={photo.id} label={photo.name}>
          <a href={photo.dataUrl} target="_blank" rel="noreferrer">
            <img src={photo.dataUrl} alt={photo.name || ko.dilemmaHelpers.defaultPhotoName} />
          </a>
        </Tooltip>
      ))}
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
  editButtonRef?: React.RefObject<HTMLButtonElement>;
  roleButtonRef?: React.RefObject<HTMLButtonElement>;
  onEdit: () => void;
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
  editButtonRef,
  roleButtonRef,
  onEdit,
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
  const participants = getActiveDilemmaVoteHouses(houses);
  const ayePower = sumDilemmaVotes(votes, participants, "aye");
  const nayPower = sumDilemmaVotes(votes, participants, "nay");
  const houseById = new Map((houses || []).map((house) => [house.id, house]));
  const leaderHouse = houseById.get(leaderHouseId as string) || null;
  const moderatorHouse = houseById.get(moderatorHouseId as string) || null;
  const rolesReady = Boolean(leaderHouse && moderatorHouse);
  const hasResettableDilemma = !isBlank || Boolean(leaderHouseId || moderatorHouseId);
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
  
  const canSetRoles = Boolean(currentHouseId) && isBlank && !locked;
  const canEdit = Boolean(currentHouseId) && !lockedByOther && rolesReady;
  const canPublish = Boolean(currentHouseId) && !locked && !isBlank && !publishBlockReason;
  const canReset = Boolean(currentHouseId) && !lockedByOther && hasResettableDilemma;

  const roleTooltip = locked
    ? ko.dilemmaUi.roleTooltipLocked
    : !isBlank
      ? ko.dilemmaUi.roleTooltipWrongPhase
      : ko.dilemmaUi.roleTooltipOk;
  const editTooltip = lockedByOther
    ? ko.dilemmaUi.editTooltipWait
    : !rolesReady
      ? ko.dilemmaUi.editTooltipNeedRoles
      : isBlank
        ? ko.dilemmaUi.editTooltipNew
        : ko.dilemmaUi.editTooltipEdit;
  const publishTooltip = locked
    ? ko.dilemmaUi.publishTooltipLocked
    : isBlank
      ? ko.dilemmaUi.publishTooltipEmpty
      : publishBlockReason || ko.dilemmaUi.publishTooltipDefault;
  const resetTooltip = lockedByOther
    ? ko.dilemmaUi.resetTooltipWait
    : !hasResettableDilemma
      ? ko.dilemmaUi.resetTooltipNone
      : ko.dilemmaUi.resetTooltipOk;

  return (
    <section className="dilemma-ledger-card" aria-labelledby="dilemma-ledger-title">
      <div className="dilemma-summary-head">
        <div className="panel-title-row">
          <span className="panel-title-icon" aria-hidden="true">
            <TokenIcon type="scroll" />
          </span>
          <h3 id="dilemma-ledger-title">{ko.dilemmaUi.ledgerTitle}</h3>
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
        </div>
      </div>

      {isBlank ? (
        <p className="dilemma-empty">{ko.dilemmaUi.emptyRound}</p>
      ) : (
        <div className="dilemma-summary-body">
          <div className="dilemma-facts">
            <DilemmaFact label={ko.dilemmaHistory.factCard} value={formatDilemmaCardLabel(dilemma)} />
            <DilemmaFact label={ko.dilemmaHistory.factSlot} value={dilemma.timeCounterSlot} />
            {dilemma.mysteryStickerId ? (
              <div className="dilemma-fact dilemma-fact-sticker">
                <span>{ko.mysteryStickers.previewLabel}</span>
                <strong>
                  <MysteryStickerImage
                    stickerId={dilemma.mysteryStickerId}
                    publicPath={getMysteryStickerEntry(dilemma.mysteryStickerId)?.publicPath}
                    presentation="meaningful"
                    meaningfulAlt={ko.mysteryStickers.previewAlt}
                  />
                  <span>{getMysteryStickerLabel(dilemma.mysteryStickerId)}</span>
                </strong>
              </div>
            ) : null}
            <DilemmaFact
              label={ko.dilemmaHistory.factResult}
              value={(dilemmaOutcomeLabels as any)[dilemma.selectedOutcome || ""] || ko.common.undecided}
            />
            <DilemmaFact label={ko.dilemmaUi.sessionLeader} value={leaderHouse ? getHouseKoreanName(leaderHouse) : ""} />
            <DilemmaFact label={ko.dilemmaUi.sessionModerator} value={moderatorHouse ? getHouseKoreanName(moderatorHouse) : ""} />
            <DilemmaFact label={ko.dilemmaUi.factAdvantage} value={formatDilemmaVoteAdvantage(ayePower, nayPower)} />
          </div>
          <DilemmaVoteBreakdown dilemma={dilemma} houses={houses} />
          <DilemmaTextPreview label={ko.dilemmaHistory.labelContext} value={dilemma.context} />
          <DilemmaTextPreview label={ko.dilemmaHistory.labelQuestion} value={dilemma.question} />
          <DilemmaTextPreview label={ko.dilemmaHistory.labelMemo} value={dilemma.councilNotes} />
          <div className="dilemma-outcome-grid">
            <DilemmaOutcomePreview label={ko.dilemmaUi.labelAye} selected={dilemma.selectedOutcome === "aye"} outcome={dilemma.aye} />
            <DilemmaOutcomePreview label={ko.dilemmaUi.labelNay} selected={dilemma.selectedOutcome === "nay"} outcome={dilemma.nay} />
          </div>
          <DilemmaTextPreview label={ko.dilemmaHistory.labelVote} value={dilemma.voteNotes} />
          <DilemmaTextPreview label={ko.dilemmaHistory.labelFollowUp} value={dilemma.resolutionNotes} />
          <DilemmaPhotoStrip photos={dilemma.photos} />
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
                  <strong>{item.name}</strong>
                  <small>{item.houseName}</small>
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
    side === "aye" ? ko.dilemmaHelpers.sideAye : side === "nay" ? ko.dilemmaHelpers.sideNay : ko.dilemmaHelpers.sidePass;
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
        <TokenIcon type="crown" />
        <strong>{ko.dilemmaUi.sessionLeader}</strong>
      </span>
    );
  }
  if (role === "moderator") {
    return (
      <span className="session-role-label tone-moderator">
        <TokenIcon type="eye" />
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
        text = ko.houseHelpers.moderatorTieBlurb;
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
  const [side, setSide] = useState(ownVote.side || "aye");
  const [powerTokens, setPowerTokens] = useState(Math.min(ownVote.powerTokens || 1, ownPowerTokens));
  const [statusText, setStatusText] = useState("");
  const selectedOutcome = dilemma.selectedOutcome;
  const votedCount = participants.filter((house) => votes[house.id]?.side).length;
  const allVoted = participants.length > 0 && participants.every((house) => Boolean(votes[house.id]?.side));
  const voteTurnName = getDilemmaVoteTurnName(state);
  const tallyPending = !dilemma.voteNotes?.trim();
  const votingComplete = !selectedOutcome && tallyPending && allVoted;
  const tieAwaitingModerator = !selectedOutcome && Boolean(dilemma.voteNotes?.trim());
  const isModerator = Boolean(state.currentHouseId && state.dilemmaModerator === state.currentHouseId);
  const ayePower = sumDilemmaVotes(votes, participants, "aye");
  const nayPower = sumDilemmaVotes(votes, participants, "nay");
  const passCount = participants.filter((house) => votes[house.id]?.side === "pass").length;
  const leaderName = getHouseDisplayName(state, state.dilemmaLeader);
  const moderatorName = getHouseDisplayName(state, state.dilemmaModerator);
  const ayeLeader = formatDilemmaSideLeader(votes, participants, "aye");
  const nayLeader = formatDilemmaSideLeader(votes, participants, "nay");
  const advantageText = formatDilemmaVoteAdvantage(ayePower, nayPower);
  const activePower = side === "pass" ? 0 : Math.min(powerTokens, ownPowerTokens);
  const hasValidWager = side === "pass" || activePower >= 1;
  const canSaveVote =
    Boolean(state.currentHouseId) && state.canVoteDilemma && !busy && !selectedOutcome && tallyPending && side && hasValidWager;
  const canApply = !busy && votingComplete;

  useEffect(() => {
    const nextVote = normalizeDilemmaVote(votes[state.currentHouseId]);
    queueMicrotask(() => {
      setSide(nextVote.side || "aye");
      setPowerTokens(Math.min(nextVote.powerTokens || 1, ownPowerTokens));
    });
  }, [ownPowerTokens, state.currentHouseId, votes]);

  const updateSide = (nextSide: string) => {
    setSide(nextSide as any);

    if (nextSide === "pass") {
      setPowerTokens(0);
    } else if (powerTokens < 1) {
      setPowerTokens(Math.min(1, ownPowerTokens));
    }
  };

  const adjustPower = (amount: number) => {
    setPowerTokens((current) => Math.max(0, Math.min(ownPowerTokens, current + amount)));
  };

  const saveVote = async () => {
    setStatusText("");
    const result = await mutate({
      action: "saveDilemmaVote",
      vote: {
        side,
        powerTokens: activePower,
      },
    });

    setStatusText(result ? ko.dilemmaUi.voteSavedOk : ko.dilemmaUi.voteSavedFail);
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
        <span className="role-cell role-cell--leader">
          <small>
            <TokenIcon type="leader" /> {ko.dilemmaUi.leaderShort}
          </small>
          <strong>{leaderName || ko.common.notSpecified}</strong>
        </span>
        <span>
          <small>
            <TokenIcon type="moderator" /> {ko.dilemmaUi.moderatorShort}
          </small>
          <strong>{moderatorName || ko.common.notSpecified}</strong>
        </span>
        <span>
          <small>{ko.dilemmaUi.ayeLead}</small>
          <strong>{ayeLeader}</strong>
        </span>
        <span>
          <small>{ko.dilemmaUi.nayLead}</small>
          <strong>{nayLeader}</strong>
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
                onClick={() => updateSide(option.id)}
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
                disabled={busy || side === "pass" || activePower <= 0}
              >
                <TokenIcon type="minus" />
              </button>
              <output aria-label={ko.dilemmaUi.wagerOutputAria}>
                {side === "pass" ? 0 : activePower}
                <span>/{ownPowerTokens}</span>
              </output>
              <button
                className="stepper-button compact"
                type="button"
                aria-label={ko.dilemmaUi.stepperPlusAria}
                onClick={() => adjustPower(1)}
                disabled={busy || side === "pass" || activePower >= ownPowerTokens}
              >
                <TokenIcon type="plus" />
              </button>
            </div>
          </div>
        </>
      ) : null}
      {votingComplete ? <p className="dilemma-vote-turn-note">{ko.dilemmaUi.applyHint}</p> : null}
      {!selectedOutcome && (state.canVoteDilemma || votingComplete) ? (
        <div className="dilemma-vote-actions">
          {state.canVoteDilemma ? (
            <button className="secondary-button compact" type="button" onClick={saveVote} disabled={!canSaveVote}>
              {ko.dilemmaUi.saveVote}
            </button>
          ) : null}
          {votingComplete ? (
            <button className="primary-button compact" type="button" onClick={applyVotes} disabled={!canApply}>
              {ko.dilemmaUi.applyTally}
            </button>
          ) : null}
        </div>
      ) : null}
      {statusText ? <p className="dilemma-vote-status" aria-live="polite">{statusText}</p> : null}
    </div>
  );
}
