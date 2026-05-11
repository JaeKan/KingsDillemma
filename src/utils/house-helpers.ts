import {
  HOUSE_CATALOG,
  REQUIRED_HOUSE_COUNT,
  defaultNamePattern,
  ko,
  phaseLabels,
  phaseCopy,
} from "../resources/gameResources";
import { RedactedHouse, RedactedState, HouseId } from "../types/game";
import {
  dilemmaAwaitingModeratorResolution,
  normalizeDilemmaRecord,
  isDilemmaBlank,
  normalizeDilemmaVotes,
} from "./dilemma-helpers";

export function isCustomNameReady(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 32 && !defaultNamePattern.test(trimmed);
}

export function isHouseCrestImageSrc(crest: string | undefined | null): boolean {
  if (typeof crest !== "string") {
    return false;
  }
  const t = crest.trim();
  if (!t) {
    return false;
  }
  return t.startsWith("/") || /^https?:\/\//i.test(t) || t.startsWith("data:image/");
}

export function getHouses(state: RedactedState | null): RedactedHouse[] {
  if (state?.houses?.length === HOUSE_CATALOG.length) {
    return state.houses;
  }

  return HOUSE_CATALOG.map((house) => ({
    ...house,
    houseId: house.id,
    player: house.number,
    name: house.koreanTitle,
    hasSession: false,
    hasPassword: false,
    hasCustomName: false,
    hasChosen: false,
    isCurrentTurn: false,
    isSelf: false,
  }));
}

export function getHouseKoreanName(house: any): string {
  return house?.koreanTitle || house?.name || ko.common.houseFallback;
}

export function getHouseCustomName(house: any): string {
  return house?.hasCustomName && typeof house.name === "string" ? house.name.trim() : "";
}

/** 플레이어 표시용: 커스텀 이름 또는 name 필드 중 가문과 구별되는 값 */
export function getHouseSeatPlayerLabel(house: any): string {
  const fromFlag = getHouseCustomName(house);
  if (fromFlag) {
    return fromFlag;
  }

  const houseName = getHouseKoreanName(house);
  const raw = typeof house?.name === "string" ? house.name.trim() : "";

  if (raw && raw !== houseName && raw !== house?.koreanTitle && raw !== house?.title) {
    return raw;
  }

  return "";
}

/**
 * 두 번째 줄: 구별되는 플레이어 이름만 `(이름)` 형태. 없으면 빈 문자열.
 * 투표 칩 등에서 투표 제출자 이름은 자리 표시 이름이 없을 때만 보조로 사용.
 */
export function getHouseParenPlayerLine(house: any, options?: { reporterName?: string | null }): string {
  const houseName = getHouseKoreanName(house);

  const toParen = (label: string): string => {
    const t = label.trim();
    if (!t || t === houseName || t === house?.koreanTitle || t === house?.title) {
      return "";
    }
    return `(${t})`;
  };

  const fromSeat = toParen(getHouseSeatPlayerLabel(house));
  if (fromSeat) {
    return fromSeat;
  }

  const reporter = options?.reporterName;
  if (typeof reporter === "string" && reporter.trim()) {
    return toParen(reporter);
  }

  return "";
}

export function getHouseHoverLabel(house: any, customNameOverride?: string | null): string {
  const houseName = getHouseKoreanName(house);
  const customName =
    typeof customNameOverride === "string" && customNameOverride.trim()
      ? customNameOverride.trim()
      : getHouseSeatPlayerLabel(house);

  if (!customName || customName === houseName || customName === house?.koreanTitle || customName === house?.title) {
    return houseName;
  }

  return `${houseName} (${customName})`;
}

export function getHouseStatus(house: RedactedHouse, selectionClosed: boolean = false): string {
  if (house.isSelf) {
    return ko.houseHelpers.currentSeat;
  }

  if (house.hasChosen) {
    return ko.houseHelpers.agendaPickPhase;
  }

  if (house.hasPassword) {
    return ko.houseHelpers.houseChosen;
  }

  if (selectionClosed) {
    return ko.houseHelpers.rosterFull;
  }

  return ko.houseHelpers.canSelect;
}

export function getHouseTone(house: RedactedHouse, selectionClosed: boolean = false): string {
  if (house.hasChosen) {
    return "done";
  }

  if (house.hasPassword) {
    return "locked";
  }

  if (selectionClosed) {
    return "closed";
  }

  return "idle";
}

export function getCurrentHouse(state: RedactedState): RedactedHouse | any | null {
  if (!state.currentHouseId) {
    return null;
  }

  return (
    state.houses?.find((house) => house.id === state.currentHouseId) ||
    HOUSE_CATALOG.find((house) => house.id === state.currentHouseId) ||
    null
  );
}

export function getHouseDisplayName(state: RedactedState, houseId: HouseId | null): string {
  if (!houseId) {
    return "";
  }

  const house =
    state.houses?.find((item) => item.id === houseId) ||
    HOUSE_CATALOG.find((item) => item.id === houseId);
  const houseName = getHouseKoreanName(house);
  const customName = getHouseSeatPlayerLabel(house);

  if (!customName || customName === houseName || customName === house?.koreanTitle || customName === house?.title) {
    return houseName;
  }

  return `${houseName} (${customName})`;
}

export function getCouncilStageLabel(state: RedactedState): string {
  if (state.phase === "complete" && isDilemmaBlank(state.dilemma)) {
    return ko.houseHelpers.dilemmaWrite;
  }

  if (state.phase === "complete" && !isDilemmaBlank(state.dilemma)) {
    const dilemma = normalizeDilemmaRecord(state.dilemma);

    if (dilemma.selectedOutcome) {
      return ko.houseHelpers.outcomeDone;
    }

    return isDilemmaVotingComplete(state) ? ko.houseHelpers.votingDone : ko.houseHelpers.votingInProgress;
  }

  return phaseLabels[state.phase as keyof typeof phaseLabels] || state.phase;
}

export function getCouncilStageCopy(state: RedactedState): string {
  if (state.phase === "complete" && isDilemmaBlank(state.dilemma)) {
    return ko.houseHelpers.councilDilemmaBlurb;
  }

  if (state.phase === "complete" && !isDilemmaBlank(state.dilemma)) {
    const dilemma = normalizeDilemmaRecord(state.dilemma);

    if (dilemma.selectedOutcome) {
      return ko.houseHelpers.outcomeSelectedBlurb;
    }

    if (dilemma.voteNotes?.trim() && !dilemma.selectedOutcome) {
      const votes = normalizeDilemmaVotes(dilemma.votes);
      const participants = getDilemmaVoteParticipants(state);

      return dilemmaAwaitingModeratorResolution(dilemma, votes, participants)
        ? ko.houseHelpers.moderatorTieBlurb
        : ko.houseHelpers.needOutcome;
    }

    if (isDilemmaVotingComplete(state)) {
      return ko.houseHelpers.allVotedBlurb;
    }

    return ko.houseHelpers.votingNegotiateBlurb;
  }

  return phaseCopy[state.phase as keyof typeof phaseCopy] || ko.houseHelpers.councilUpdating;
}

export function getCouncilProcedureTitle(state: RedactedState): string {
  if (state.phase === "complete" && !isDilemmaBlank(state.dilemma)) {
    const dilemma = normalizeDilemmaRecord(state.dilemma);

    return dilemma.selectedOutcome ? ko.houseHelpers.labelDilemmaOutcome : ko.houseHelpers.labelDilemmaVote;
  }

  if (state.phase === "complete") {
    return ko.houseHelpers.dilemmaWrite;
  }

  if (state.phase === "discard") {
    return ko.houseHelpers.labelAgendaDiscard;
  }

  if (state.phase === "choose") {
    return ko.houseHelpers.labelSecretPick;
  }

  return ko.houseHelpers.labelCouncilReady;
}

/** UI 전용: 서버가 순서를 강제하지 않을 때 시계방향 권장 차례로 첫 미투표 가문. */
export function getSuggestedDilemmaVoteTurnHouseId(state: RedactedState): HouseId | null {
  if (state.phase !== "complete" || isDilemmaBlank(state.dilemma)) {
    return null;
  }

  const dilemma = normalizeDilemmaRecord(state.dilemma);

  if (dilemma.selectedOutcome || dilemma.editLock || dilemma.voteNotes?.trim()) {
    return null;
  }

  const participants = getDilemmaVoteParticipants(state);
  const votes = normalizeDilemmaVotes(dilemma.votes);
  const next = participants.find((house) => !votes[house.id]?.side);

  return next?.id ?? null;
}

export function getDilemmaVoteTurnName(state: RedactedState): string {
  const turnHouse = state.dilemmaVoteTurn ?? getSuggestedDilemmaVoteTurnHouseId(state);

  return turnHouse ? getHouseDisplayName(state, turnHouse) : "";
}

export function getDilemmaProgressLabel(state: RedactedState): string {
  if (state.phase !== "complete") {
    return "-";
  }

  const dilemma = normalizeDilemmaRecord(state.dilemma);

  if (isDilemmaBlank(dilemma)) {
    return ko.houseHelpers.needAuthoring;
  }

  if (dilemma.selectedOutcome) {
    return ko.houseHelpers.outcomeDone;
  }

  if (isDilemmaVotingComplete(state)) {
    return ko.houseHelpers.needOutcome;
  }

  return ko.houseHelpers.votingOngoing;
}

export function isDilemmaVotingComplete(state: RedactedState): boolean {
  if (state.phase !== "complete" || isDilemmaBlank(state.dilemma)) {
    return false;
  }

  const dilemma = normalizeDilemmaRecord(state.dilemma);

  if (dilemma.selectedOutcome || dilemma.voteNotes?.trim()) {
    return true;
  }

  const participants = getDilemmaVoteParticipants(state);

  if (participants.length === 0) {
    return false;
  }

  const votes = normalizeDilemmaVotes(dilemma.votes);

  return participants.every((house) => Boolean(votes[house.id]?.side));
}

export function getDilemmaVoteParticipants(state: RedactedState): RedactedHouse[] {
  const houses = getVoteOrderHouses(state);

  if (state?.dilemmaLeader && houses.some((house) => house.id === state.dilemmaLeader)) {
    const houseById = new Map(houses.map((house) => [house.id, house]));
    return rotateOrderToHouse(houses.map((house) => house.id), state.dilemmaLeader)
      .map((houseId) => houseById.get(houseId))
      .filter((h): h is RedactedHouse => Boolean(h));
  }

  return houses;
}

export function getVoteOrderHouses(state: RedactedState): RedactedHouse[] {
  if (!state) {
    return [];
  }

  const candidateState = state || {};
  const houses = getHouses(state);
  const housesById = new Map(houses.map((house) => [house.id, house]));
  const loggedInIds = houses.filter((house) => house.hasSession).map((house) => house.id);
  const loggedInIdSet = new Set(loggedInIds);
  let orderedIds = loggedInIds;

  if (Array.isArray(candidateState.dilemmaVoteOrder) && candidateState.dilemmaVoteOrder.length) {
    orderedIds = candidateState.dilemmaVoteOrder.filter((houseId) => loggedInIdSet.has(houseId));
  } else if (candidateState.phase !== "complete" && Array.isArray(candidateState.draftOrder) && candidateState.draftOrder.length) {
    orderedIds = candidateState.draftOrder.filter((houseId) => loggedInIdSet.has(houseId));
  }

  return orderedIds
    .map((houseId) => housesById.get(houseId) || (HOUSE_CATALOG.find((house) => house.id === houseId) as any))
    .filter(Boolean)
    .slice(0, REQUIRED_HOUSE_COUNT);
}

export function isVoteOrderSettingLocked(state: RedactedState): boolean {
  if (!state || state.phase !== "complete" || isDilemmaBlank(state.dilemma)) {
    return false;
  }

  return !normalizeDilemmaRecord(state.dilemma).selectedOutcome;
}

export function splitParentheticalStatusValue(value: any): { name: string; detail: string } {
  if (typeof value !== "string" || !value) {
    return { name: "", detail: "" };
  }
  const match = value.match(/^([^()]+)\s*(?:\(([^()]+)\))?$/);
  if (!match) {
    return { name: value, detail: "" };
  }
  return { name: match[1].trim(), detail: match[2]?.trim() || "" };
}

export function rotateOrderToHouse(order: HouseId[] = [], houseId: HouseId): HouseId[] {
  const index = order.indexOf(houseId);
  if (index < 0) {
    return order;
  }
  return [...order.slice(index), ...order.slice(0, index)];
}