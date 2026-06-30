/**
 * 순수 노멀라이저/클램프 유틸리티 함수들.
 * App.tsx에서 추출 — UI 의존성 없음, gameResources 상수만 참조.
 */
import {
  alignmentRewardCountMax,
  defaultHouseAlignmentOrder,
  houseAchievementMarkMax,
  houseAchievementRows,
  houseAlignmentMarkMax,
  houseAlignmentRows,
  inventoryCounterMax,
  inventoryCounters,
  openAgendaTokenLimit,
  resourceCounters,
} from "../resources/gameResources";
import {
  AchievementDetail,
  AchievementEffect,
  AchievementEffectEntry,
  AlignmentReward,
  HouseProgress,
  PersonalResourceId,
  PlayerInventory,
} from "../types/game";

// ── 기본값 생성 ───────────────────────────────────────────────

export function createDefaultInventory(): PlayerInventory {
  return {
    coins: 10,
    powerTokens: 8,
    prestige: 0,
    crave: 0,
    resources: Object.fromEntries(resourceCounters.map((counter) => [counter.id, 0])) as Record<PersonalResourceId, number>,
    updatedAt: "",
  };
}

export function createDefaultHouseProgress(): HouseProgress {
  return {
    openAgendaTokens: {
      positive: [],
      negative: [],
    },
    narrativeAchievement: false,
    narrativeAchievementCount: 0,
    narrativeAchievementDetail: createDefaultAchievementDetail(1),
    houseAchievements: houseAchievementRows.map(() => 0),
    houseAchievementComplete: houseAchievementRows.map(() => false),
    houseAchievementDetails: houseAchievementRows.map(() => createDefaultAchievementDetail(houseAchievementMarkMax)),
    alignmentAchievements: Object.fromEntries(houseAlignmentRows.map((alignment) => [alignment.agendaId, 0])),
    alignmentRewards: Object.fromEntries(
      houseAlignmentRows.map((alignment) => [alignment.agendaId, createDefaultAlignmentReward()]),
    ),
    alignmentOrder: defaultHouseAlignmentOrder,
    updatedAt: "",
  };
}

export function createDefaultAlignmentReward(): AlignmentReward {
  return {
    crownType: "",
    count: 0,
  };
}

export function createDefaultAchievementDetail(requiredCount: number): AchievementDetail {
  return {
    conditionText: "",
    requiredCount,
    effectEntries: [],
    effects: [],
    effectIcon: "",
    effectAmount: 0,
    effectText: "",
  };
}

// ── 카운터/클램프 ─────────────────────────────────────────────

export function normalizeCounter(value: any, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return clampCounter(value, max);
}

export function clampCounter(value: any, max: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(max, Math.trunc(value)));
}

// ── 텍스트 ────────────────────────────────────────────────────

export function normalizeTextField(value: any): string {
  return typeof value === "string" ? value : "";
}

// ── 인벤토리 ──────────────────────────────────────────────────

export function normalizeInventory(value: any): PlayerInventory {
  const defaults = createDefaultInventory();
  const candidate = value && typeof value === "object" ? value : {};
  const resources = candidate.resources && typeof candidate.resources === "object" ? candidate.resources : {};

  return {
    coins: normalizeCounter(candidate.coins, inventoryCounterMax.coins, defaults.coins),
    powerTokens: normalizeCounter(candidate.powerTokens, inventoryCounterMax.powerTokens, defaults.powerTokens),
    prestige: normalizeCounter(candidate.prestige, inventoryCounterMax.prestige, defaults.prestige),
    crave: normalizeCounter(candidate.crave, inventoryCounterMax.crave, defaults.crave),
    resources: Object.fromEntries(
      resourceCounters.map((counter) => [
        counter.id,
        normalizeCounter(resources[counter.id], counter.max, defaults.resources[counter.id as PersonalResourceId]),
      ]),
    ) as Record<PersonalResourceId, number>,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : defaults.updatedAt,
  };
}

export function inventoriesMatch(left: PlayerInventory, right: PlayerInventory): boolean {
  return inventoryCounters.every((counter) => left[counter.id as keyof PlayerInventory] === right[counter.id as keyof PlayerInventory]);
}

// ── 가문 진행도 ───────────────────────────────────────────────

export function normalizeHouseProgress(value: any): HouseProgress {
  const defaults = createDefaultHouseProgress();
  const candidate = value && typeof value === "object" ? value : {};
  const openAgendaTokens =
    candidate.openAgendaTokens && typeof candidate.openAgendaTokens === "object" ? candidate.openAgendaTokens : {};
  const alignmentAchievements =
    candidate.alignmentAchievements && typeof candidate.alignmentAchievements === "object"
      ? candidate.alignmentAchievements
      : {};
  const alignmentRewards =
    candidate.alignmentRewards && typeof candidate.alignmentRewards === "object" ? candidate.alignmentRewards : {};
  const houseAchievements = Array.isArray(candidate.houseAchievements) ? candidate.houseAchievements : [];
  const houseAchievementComplete = Array.isArray(candidate.houseAchievementComplete)
    ? candidate.houseAchievementComplete
    : [];
  const narrativeAchievementDetail = normalizeNarrativeAchievementDetail(candidate.narrativeAchievementDetail);
  const houseAchievementDetails = Array.isArray(candidate.houseAchievementDetails)
    ? (candidate.houseAchievementDetails as any[]).map((detail) => normalizeAchievementDetail(detail, houseAchievementMarkMax))
    : [];
  const normalizedHouseAchievementDetails = houseAchievementRows.map(
    (row) => houseAchievementDetails[row.id] || defaults.houseAchievementDetails[row.id],
  );
  const narrativeAchievementCount = normalizeCounter(
    candidate.narrativeAchievementCount,
    narrativeAchievementDetail.requiredCount,
    candidate.narrativeAchievement === true
      ? narrativeAchievementDetail.requiredCount
      : defaults.narrativeAchievementCount,
  );

  return {
    openAgendaTokens: {
      positive: normalizeOpenAgendaTokens(openAgendaTokens.positive),
      negative: normalizeOpenAgendaTokens(openAgendaTokens.negative),
    },
    narrativeAchievement:
      narrativeAchievementCount >= narrativeAchievementDetail.requiredCount ||
      (narrativeAchievementDetail.requiredCount <= 1 && candidate.narrativeAchievement === true),
    narrativeAchievementCount,
    narrativeAchievementDetail,
    houseAchievements: houseAchievementRows.map((row) =>
      normalizeCounter(
        houseAchievements[row.id],
        normalizedHouseAchievementDetails[row.id].requiredCount,
        defaults.houseAchievements[row.id],
      ),
    ),
    houseAchievementComplete: houseAchievementRows.map((row) =>
      houseAchievementComplete[row.id] === true,
    ),
    houseAchievementDetails: normalizedHouseAchievementDetails,
    alignmentAchievements: Object.fromEntries(
      houseAlignmentRows.map((alignment) => [
        alignment.agendaId,
        normalizeCounter(
          alignmentAchievements[alignment.agendaId] ?? alignmentAchievements[alignment.id],
          houseAlignmentMarkMax,
          defaults.alignmentAchievements[alignment.agendaId],
        ),
      ]),
    ),
    alignmentRewards: Object.fromEntries(
      houseAlignmentRows.map((alignment) => [
        alignment.agendaId,
        normalizeAlignmentReward(
          alignmentRewards[alignment.agendaId] ?? alignmentRewards[alignment.id],
          defaults.alignmentRewards[alignment.agendaId],
        ),
      ]),
    ),
    alignmentOrder: normalizeHouseAlignmentOrder(candidate.alignmentOrder),
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : defaults.updatedAt,
  };
}

export function normalizeHouseAlignmentOrder(_value: any): string[] {
  return [...defaultHouseAlignmentOrder];
}

export function normalizeAlignmentReward(value: any, fallback: AlignmentReward = createDefaultAlignmentReward()): AlignmentReward {
  const candidate = value && typeof value === "object" ? value : {};
  const crownType = candidate.crownType === "prestige" || candidate.crownType === "crave" ? candidate.crownType : "";
  const count = normalizeCounter(candidate.count, alignmentRewardCountMax, fallback.count);

  return {
    crownType: count > 0 ? (crownType as any) : "",
    count: crownType ? count : 0,
  };
}

export function normalizeOpenAgendaTokens(value: any): PersonalResourceId[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<PersonalResourceId>();
  const tokens: PersonalResourceId[] = [];

  for (const resourceId of value) {
    if (!resourceCounters.some((resource) => resource.id === resourceId) || seen.has(resourceId as PersonalResourceId)) {
      continue;
    }

    seen.add(resourceId as PersonalResourceId);
    tokens.push(resourceId as PersonalResourceId);

    if (tokens.length >= openAgendaTokenLimit) {
      break;
    }
  }

  return tokens;
}

// ── 업적 상세 ─────────────────────────────────────────────────

export function normalizeAchievementDetail(value: any, fallbackRequiredCount: number): AchievementDetail {
  const candidate = value && typeof value === "object" ? value : {};
  const hasEffectEntries = Array.isArray(candidate.effectEntries);
  const legacyEffectText = normalizeAchievementText(candidate.effectText);
  const effectEntries = normalizeAchievementEffectEntries(
    candidate.effectEntries,
    candidate.effects,
    legacyEffectText,
    candidate.effectIcon,
    candidate.effectAmount,
  );
  const effects = normalizeAchievementEffectsFromEntries(effectEntries);
  const primaryEffect = effects[0] || { icon: "", amount: 0 };

  return {
    conditionText: normalizeAchievementText(candidate.conditionText),
    requiredCount: normalizeRequiredCount(candidate.requiredCount, fallbackRequiredCount),
    effectEntries,
    effects,
    effectIcon: primaryEffect.icon,
    effectAmount: primaryEffect.amount,
    effectText: hasEffectEntries ? formatAchievementEffectEntriesText(effectEntries) : legacyEffectText,
  };
}

export function normalizeNarrativeAchievementDetail(value: any): AchievementDetail {
  return {
    ...normalizeAchievementDetail(value, 1),
    requiredCount: 1,
  };
}

export function normalizeRequiredCount(value: any, fallback: number = houseAchievementMarkMax): number {
  const fallbackValue = getAchievementRequiredCount({ requiredCount: fallback });
  const number = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(number)) {
    return fallbackValue;
  }

  return Math.max(1, Math.min(houseAchievementMarkMax, Math.trunc(number)));
}

export function getAchievementRequiredCount(detail: any): number {
  const number = Number(detail?.requiredCount);

  if (!Number.isFinite(number)) {
    return houseAchievementMarkMax;
  }

  return Math.max(1, Math.min(houseAchievementMarkMax, Math.trunc(number)));
}

export function normalizeAchievementText(value: any): string {
  return typeof value === "string"
    ? value.replace(/\r\n?/g, "\n").slice(0, 300)
    : "";
}

// ── 업적 효과 ─────────────────────────────────────────────────

import {
  achievementEffectAmountMax,
  achievementEffectAmountOptionIds,
  achievementEffectEntryMax,
  achievementEffectOptionById,
} from "../resources/gameResources";

export function normalizeAchievementEffectIcon(value: any): string {
  return typeof value === "string" && achievementEffectOptionById[value]?.id ? value : "";
}

export function normalizeAchievementEffectAmount(value: any, effectIcon: string): number {
  if (!achievementEffectAmountOptionIds.has(effectIcon)) {
    return 0;
  }

  return normalizeCounter(value, achievementEffectAmountMax, 0);
}

export function normalizeAchievementEffectEntries(
  value: any,
  legacyEffects?: any,
  legacyEffectText?: any,
  legacyEffectIcon?: any,
  legacyEffectAmount?: any,
): AchievementEffectEntry[] {
  if (Array.isArray(value)) {
    return value.slice(0, achievementEffectEntryMax).flatMap((item) => {
      const candidate = typeof item === "string" ? { text: item } : item && typeof item === "object" ? item : {};
      const icon = normalizeAchievementEffectIcon(candidate.icon ?? candidate.effectIcon);
      const amount = normalizeAchievementEffectAmount(candidate.amount ?? candidate.effectAmount, icon);
      const text = normalizeAchievementText(candidate.text ?? candidate.memoText ?? candidate.effectText);

      return icon || text ? [{ icon, amount, text }] : [];
    });
  }

  const text = normalizeAchievementText(legacyEffectText);
  const effects = normalizeAchievementEffects(legacyEffects, legacyEffectIcon, legacyEffectAmount);

  if (effects.length) {
    return effects.slice(0, achievementEffectEntryMax).map((effect, index) => ({
      icon: effect.icon,
      amount: effect.amount,
      text: index === 0 ? text : "",
    }));
  }

  return text ? [{ icon: "", amount: 0, text }] : [];
}

export function normalizeAchievementEffectsFromEntries(entries: any): AchievementEffect[] {
  const seen = new Set();
  const effects: AchievementEffect[] = [];

  for (const entry of normalizeAchievementEffectEntries(entries)) {
    if (!entry.icon || seen.has(entry.icon)) {
      continue;
    }

    seen.add(entry.icon);
    effects.push({
      icon: entry.icon,
      amount: normalizeAchievementEffectAmount(entry.amount, entry.icon),
    });
  }

  return effects;
}

export function normalizeAchievementEffects(value: any, legacyEffectIcon?: any, legacyEffectAmount?: any): AchievementEffect[] {
  const candidates =
    Array.isArray(value) && value.length > 0
      ? value
      : typeof legacyEffectIcon === "string" && legacyEffectIcon
        ? [{ icon: legacyEffectIcon, amount: legacyEffectAmount }]
        : [];
  const seen = new Set();
  const effects: AchievementEffect[] = [];

  for (const item of candidates) {
    const candidate = typeof item === "string" ? { icon: item } : item && typeof item === "object" ? item : {};
    const icon = normalizeAchievementEffectIcon(candidate.icon ?? candidate.effectIcon);

    if (!icon || seen.has(icon)) {
      continue;
    }

    seen.add(icon);
    effects.push({
      icon,
      amount: normalizeAchievementEffectAmount(candidate.amount ?? candidate.effectAmount, icon),
    });
  }

  return effects;
}

export function formatAchievementEffectEntriesText(entries: any): string {
  return normalizeAchievementEffectEntries(entries)
    .map((entry) => entry.text)
    .filter(Boolean)
    .join(" · ")
    .slice(0, 300);
}

export function getAchievementEffectOption(effectIcon: string): any {
  return achievementEffectOptionById[effectIcon] || achievementEffectOptionById[""];
}

export function createDefaultAchievementEffectEntry(): AchievementEffectEntry {
  return {
    icon: "instant",
    amount: 0,
    text: "",
  };
}

export function applyAchievementEffectEntries(detail: AchievementDetail, entries: any): AchievementDetail {
  const normalizedEntries = normalizeAchievementEffectEntries(entries);
  const effects = normalizeAchievementEffectsFromEntries(normalizedEntries);
  const primaryEffect = effects[0] || { icon: "", amount: 0 };

  return {
    ...detail,
    effectEntries: normalizedEntries,
    effects,
    effectIcon: primaryEffect.icon,
    effectAmount: primaryEffect.amount,
    effectText: formatAchievementEffectEntriesText(normalizedEntries),
  };
}

export function addAchievementEffectEntry(entries: any): AchievementEffectEntry[] {
  const normalizedEntries = normalizeAchievementEffectEntries(entries);
  return normalizedEntries.length >= achievementEffectEntryMax
    ? normalizedEntries
    : [...normalizedEntries, createDefaultAchievementEffectEntry()];
}

export function removeAchievementEffectEntryAt(entries: any, index: number): AchievementEffectEntry[] {
  return normalizeAchievementEffectEntries(entries).filter((_, entryIndex) => entryIndex !== index);
}

export function updateAchievementEffectEntryAt(entries: any, index: any, patch: any): AchievementEffectEntry[] {
  const normalizedEntries = normalizeAchievementEffectEntries(entries);

  if (!Number.isInteger(index) || index < 0 || index >= normalizedEntries.length) {
    return normalizedEntries;
  }

  return normalizeAchievementEffectEntries(
    normalizedEntries.map((entry, entryIndex) => {
      if (entryIndex !== index) {
        return entry;
      }

      const nextIcon = Object.prototype.hasOwnProperty.call(patch || {}, "icon")
        ? normalizeAchievementEffectIcon(patch.icon)
        : entry.icon;

      return {
        ...entry,
        icon: nextIcon,
        amount: Object.prototype.hasOwnProperty.call(patch || {}, "amount")
          ? normalizeAchievementEffectAmount(patch.amount, nextIcon)
          : normalizeAchievementEffectAmount(entry.amount, nextIcon),
        text: Object.prototype.hasOwnProperty.call(patch || {}, "text")
          ? normalizeAchievementText(patch.text)
          : entry.text,
      };
    }),
  );
}

export function normalizeLegacyAchievementDetailUpdate(detail: any): AchievementDetail {
  return normalizeAchievementDetail(detail, detail?.requiredCount || houseAchievementMarkMax);
}

export function updateAchievementDetailDraft(detail: AchievementDetail, field: string, value: any): AchievementDetail {
  if (field === "requiredCount") {
    return {
      ...detail,
      requiredCount: normalizeRequiredCount(value),
    };
  }

  if (field === "effectEntries") {
    return applyAchievementEffectEntries(detail, value);
  }

  if (field === "effectEntryAdd") {
    return applyAchievementEffectEntries(detail, addAchievementEffectEntry(detail.effectEntries));
  }

  if (field === "effectEntryRemove") {
    return applyAchievementEffectEntries(detail, removeAchievementEffectEntryAt(detail.effectEntries, value));
  }

  if (field === "effectEntryUpdate") {
    return applyAchievementEffectEntries(
      detail,
      updateAchievementEffectEntryAt(detail.effectEntries, value?.index, value),
    );
  }

  if (field === "effects" || field === "effectText" || field === "effectIcon" || field === "effectAmount") {
    return normalizeLegacyAchievementDetailUpdate({
      ...detail,
      [field]: value,
      effectEntries: undefined,
    } as any);
  }

  return {
    ...detail,
    [field]: value,
  };
}

// ── 진행도 비교 ───────────────────────────────────────────────

export function progressMatches(left: HouseProgress, right: HouseProgress): boolean {
  return (
    left.narrativeAchievement === right.narrativeAchievement &&
    left.narrativeAchievementCount === right.narrativeAchievementCount &&
    achievementDetailsMatch(left.narrativeAchievementDetail, right.narrativeAchievementDetail) &&
    arraysMatch(left.openAgendaTokens.positive, right.openAgendaTokens.positive) &&
    arraysMatch(left.openAgendaTokens.negative, right.openAgendaTokens.negative) &&
    arraysMatch(left.alignmentOrder, right.alignmentOrder) &&
    arraysMatch(left.houseAchievements, right.houseAchievements) &&
    arraysMatch(left.houseAchievementComplete, right.houseAchievementComplete) &&
    houseAchievementRows.every((row) =>
      achievementDetailsMatch(left.houseAchievementDetails[row.id], right.houseAchievementDetails[row.id]),
    ) &&
    houseAlignmentRows.every(
      (alignment) => left.alignmentAchievements[alignment.agendaId] === right.alignmentAchievements[alignment.agendaId],
    ) &&
    houseAlignmentRows.every((alignment) =>
      alignmentRewardsMatch(left.alignmentRewards?.[alignment.agendaId], right.alignmentRewards?.[alignment.agendaId]),
    )
  );
}

export function progressMatchesExceptAlignmentRewards(left: HouseProgress, right: HouseProgress): boolean {
  return (
    left.narrativeAchievement === right.narrativeAchievement &&
    left.narrativeAchievementCount === right.narrativeAchievementCount &&
    achievementDetailsMatch(left.narrativeAchievementDetail, right.narrativeAchievementDetail) &&
    arraysMatch(left.openAgendaTokens.positive, right.openAgendaTokens.positive) &&
    arraysMatch(left.openAgendaTokens.negative, right.openAgendaTokens.negative) &&
    arraysMatch(left.houseAchievements, right.houseAchievements) &&
    arraysMatch(left.houseAchievementComplete, right.houseAchievementComplete) &&
    houseAchievementRows.every((row) =>
      achievementDetailsMatch(left.houseAchievementDetails[row.id], right.houseAchievementDetails[row.id]),
    ) &&
    houseAlignmentRows.every(
      (alignment) => left.alignmentAchievements[alignment.agendaId] === right.alignmentAchievements[alignment.agendaId],
    )
  );
}

export function achievementDetailsMatch(left: any, right: any): boolean {
  const leftDetail = normalizeAchievementDetail(left, houseAchievementMarkMax);
  const rightDetail = normalizeAchievementDetail(right, houseAchievementMarkMax);

  return (
    leftDetail.conditionText === rightDetail.conditionText &&
    leftDetail.requiredCount === rightDetail.requiredCount &&
    achievementEffectEntriesMatch(leftDetail.effectEntries, rightDetail.effectEntries)
  );
}

export function achievementEffectEntriesMatch(left: any, right: any): boolean {
  const leftEntries = normalizeAchievementEffectEntries(left);
  const rightEntries = normalizeAchievementEffectEntries(right);

  return (
    leftEntries.length === rightEntries.length &&
    leftEntries.every(
      (entry, index) =>
        entry.icon === rightEntries[index].icon &&
        entry.amount === rightEntries[index].amount &&
        entry.text === rightEntries[index].text,
    )
  );
}

export function alignmentRewardsMatch(left: any, right: any): boolean {
  const leftReward = normalizeAlignmentReward(left);
  const rightReward = normalizeAlignmentReward(right);

  return leftReward.crownType === rightReward.crownType && leftReward.count === rightReward.count;
}

export function arraysMatch(left: any[] = [], right: any[] = []): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
