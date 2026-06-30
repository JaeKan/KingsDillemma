import {
  HOUSE_CATALOG,
  defaultNamePattern,
  ko,
  phaseLabels,
} from "../resources/gameResources";
import { RedactedHouse, RedactedState, HouseId } from "../types/game";

const HOUSE_METADATA_BY_ID = Object.fromEntries(HOUSE_CATALOG.map((house) => [house.id, house]));

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
    return state.houses.map((house) => {
      const profile = HOUSE_METADATA_BY_ID[house.id];
      if (!profile) {
        return house;
      }

      return {
        ...house,
        title: profile.title,
        koreanTitle: profile.koreanTitle,
        motto: profile.motto,
        crest: profile.crest,
        goal: profile.goal,
        alignments: profile.alignments,
        profile: profile.profile,
      };
    });
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
 * 보드 처리 기록 등에서 자리 표시 이름이 없을 때만 보조 이름으로 사용.
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

  const houses = getHouses(state);

  return houses.find((house: any) => house.id === state.currentHouseId) || null;
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
  return phaseLabels[state.phase as keyof typeof phaseLabels] || state.phase;
}

export function getCouncilProcedureTitle(state: RedactedState): string {
  if (state.phase === "complete") {
    return phaseLabels.complete;
  }

  if (state.phase === "discard") {
    return ko.houseHelpers.labelAgendaDiscard;
  }

  if (state.phase === "choose") {
    return ko.houseHelpers.labelSecretPick;
  }

  return ko.houseHelpers.labelCouncilReady;
}
