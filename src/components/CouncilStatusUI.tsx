import React from "react";
import type { RedactedHouse, RedactedState } from "../types/game";
import { REQUIRED_HOUSE_COUNT, ko } from "../resources/gameResources";
import {
  getHouseDisplayName,
  getHouseHoverLabel,
  isHouseCrestImageSrc,
} from "../utils/house-helpers";
import { HouseIcon, TokenIcon } from "./GameIcons";
import { Tooltip } from "./Tooltip";

function HouseCrestBadge({
  house,
  className = "",
  tooltipLabel,
  ariaLabel,
}: {
  house: RedactedHouse | undefined;
  className?: string;
  tooltipLabel?: React.ReactNode;
  ariaLabel?: string;
}) {
  const content = (
    <div className={`house-crest-badge ${className}`} aria-label={ariaLabel || house?.koreanTitle}>
      {isHouseCrestImageSrc(house?.crest) ? (
        <img src={house!.crest!.trim()} alt="" aria-hidden="true" />
      ) : (
        <HouseIcon motif={house?.motif} />
      )}
    </div>
  );

  return tooltipLabel ? <Tooltip label={tooltipLabel}>{content}</Tooltip> : content;
}

export function StatusItem({
  icon,
  label,
  value,
  splitParenthetical = false,
}: {
  icon: string;
  label: string;
  value: string;
  splitParenthetical?: boolean;
}) {
  const parentheticalValue =
    splitParenthetical && typeof value === "string" ? splitParentheticalStatusValue(value) : null;

  return (
    <div className="status-item">
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

export function CouncilStatusStack({
  claimedHouseCount,
  councilStageLabel,
  currentHouseName,
  draftOrderCount,
  draftTurnName,
  phase,
  requiredHouseCount,
  selectedCount,
}: {
  claimedHouseCount: number;
  councilStageLabel: string;
  currentHouseName: string;
  draftOrderCount: number;
  draftTurnName: string;
  phase: RedactedState["phase"];
  requiredHouseCount: number;
  selectedCount: number;
}) {
  const showDraftRows = phase !== "complete";
  const pickLabel = phase === "house-select" ? ko.app.gamePanel.housePick : ko.app.gamePanel.agendaPick;
  const pickValue =
    phase === "house-select"
      ? `${claimedHouseCount} / ${requiredHouseCount}`
      : `${selectedCount} / ${draftOrderCount || REQUIRED_HOUSE_COUNT}`;

  return (
    <div className={`status-stack${phase === "complete" ? " status-stack--complete" : ""}`}>
      <StatusItem icon="house" label={ko.app.gamePanel.myHouse} value={currentHouseName} />
      {showDraftRows ? (
        <>
          <StatusItem icon="turn" label={ko.app.gamePanel.turn} value={draftTurnName} splitParenthetical />
          <StatusItem icon="scroll" label={ko.app.gamePanel.currentPhase} value={councilStageLabel} />
          <StatusItem icon="seal" label={pickLabel} value={pickValue} />
        </>
      ) : null}
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

export function TurnTrack({
  houses,
  draftOrder,
  turn,
  phase,
}: {
  houses: RedactedHouse[];
  draftOrder: string[];
  turn: string | null;
  phase: string;
}) {
  const claimedHouses = (houses || []).filter((house) => house.hasPassword);
  const orderedHouses = draftOrder?.length
    ? draftOrder
        .map((houseId) => houses?.find((house: RedactedHouse) => house.id === houseId))
        .filter((house): house is RedactedHouse => Boolean(house))
    : claimedHouses;
  const nodes = orderedHouses.length ? orderedHouses : [];
  const showTurnLegend = nodes.length > 0 && (phase === "discard" || phase === "choose");
  const turnLegendItems = [
    { key: "current", label: ko.gameUi.currentTurn },
    { key: "done", label: ko.gameUi.agendaChosen },
    { key: "waiting", label: ko.app.gamePanel.wait },
  ] as const;

  return (
    <div className="turn-track-stack">
      {showTurnLegend ? (
        <div className="turn-track-legend">
          {turnLegendItems.map((item) => (
            <span className={`turn-track-legend-node ${item.key}`} key={item.key}>
              <span className="turn-track-legend-swatch" aria-hidden="true" />
              {item.label}
            </span>
          ))}
        </div>
      ) : null}
      <div
        className="turn-track"
        aria-label={ko.gameUi.turnTrackAria}
        style={{ gridTemplateColumns: `repeat(${Math.max(nodes.length, 1)}, 34px)` }}
      >
        {nodes.map((house: RedactedHouse) => {
          const selected = turn === house.id;
          const done = Boolean(house.hasChosen);
          const statusLabel = [
            getHouseHoverLabel(house),
            selected ? ko.gameUi.currentTurn : "",
            done ? ko.gameUi.agendaChosen : "",
          ]
            .filter(Boolean)
            .join(", ");

          return (
            <HouseCrestBadge
              house={house}
              className={`turn-node${selected ? " current" : ""}${done ? " done" : ""}${
                phase === "house-select" ? " claimed" : ""
              }`}
              key={house.id}
              tooltipLabel={getHouseHoverLabel(house)}
              ariaLabel={statusLabel}
            />
          );
        })}
      </div>
    </div>
  );
}

export function GameMessage({ state }: { state: any }) {
  let text: string;

  if (state.phase === "house-select") {
    const remaining = Math.max((state.requiredHouseCount || REQUIRED_HOUSE_COUNT) - (state.claimedHouseCount || 0), 0);
    text = remaining ? ko.gameUi.houseSelectRemain(remaining) : ko.gameUi.seatsFull;
  } else if (state.phase === "complete") {
    text = ko.app.gamePanel.boardProcessingOnly;
  } else if (state.canDiscard) {
    text = state.randomDiscardEnabled
      ? ko.gameUi.discardRandom(getHouseDisplayName(state, state.currentHouseId))
      : ko.gameUi.discardPick(getHouseDisplayName(state, state.currentHouseId));
  } else if (state.canChoose) {
    text = ko.gameUi.chooseSecret(getHouseDisplayName(state, state.currentHouseId));
  } else if (state.ownChoice) {
    text = ko.gameUi.choiceDone;
  } else {
    text = ko.gameUi.waitingTurn(getHouseDisplayName(state, state.currentHouseId), getHouseDisplayName(state, state.turn));
  }

  return <p className="message">{text}</p>;
}
