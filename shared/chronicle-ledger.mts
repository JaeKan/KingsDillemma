export const CHRONICLE_ROW_CAPACITY = 5 as const;

export type ChronicleResourceId = "influence" | "wealth" | "morale" | "welfare" | "knowledge";
export type ChroniclePolarity = "positive" | "negative";
export type ChroniclePlacementReason = "empty_slot" | "replace_oldest";

export type RecordAttachment = {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  createdAt: string;
};

export type ChronicleStickerEntry = {
  id: string;
  stickerCode: string;
  resourceId: ChronicleResourceId;
  polarity: ChroniclePolarity;
  signedByHouseId: string;
  signedByName: string;
  ageMarks: number;
  slotIndex: number;
  sourceDilemmaHistoryId: string;
  sourceCardCode: string;
  placedAt: string;
  updatedAt: string;
  replacedAt: string;
  note: string;
  photos?: RecordAttachment[];
};

export type ChronicleLedger = Record<ChronicleResourceId, ChronicleStickerEntry[]>;

export type CampaignEnvelopeEntry = {
  code: string;
  openedAt: string;
  sourceDilemmaHistoryId: string;
  note: string;
  photos?: RecordAttachment[];
};

export type CampaignCardStatus = "active" | "completed" | "archived";

export type CampaignCardEntry = {
  code: string;
  status: CampaignCardStatus;
  sourceEnvelopeCode: string;
  sourceDilemmaHistoryId: string;
  note: string;
  updatedAt: string;
  photos?: RecordAttachment[];
};

export type MysteryStickerEntry = {
  dossierLetter: string;
  storylineSymbol: string;
  slotKey: string;
  sourceDilemmaHistoryId: string;
  attachedAt: string;
  note: string;
  photos?: RecordAttachment[];
};

export type CampaignLedger = {
  openedEnvelopes: Record<string, CampaignEnvelopeEntry>;
  storyCards: Record<string, CampaignCardEntry>;
  eventCards: Record<string, CampaignCardEntry>;
  mysteryStickers: Record<string, MysteryStickerEntry>;
};

export type NextGameSetupState = {
  checklist: Record<string, boolean>;
  lastAppliedAt: string;
  lastAppliedBy: string | null;
  lastLegacyResourceDeltas: Partial<Record<ChronicleResourceId, number>>;
  lastOpenAgendaAssignments: ChronicleOpenAgendaAssignments;
};

export type ChroniclePlacementPreview = {
  resourceId: ChronicleResourceId;
  polarity: ChroniclePolarity;
  slotIndex: number;
  reason: ChroniclePlacementReason;
  replacedStickerId: string;
};

export type ChronicleOpenAgendaAssignments = Record<
  ChroniclePolarity,
  Partial<Record<ChronicleResourceId, string>>
>;

export function createDefaultChronicleLedger(): ChronicleLedger {
  return {
    influence: [],
    wealth: [],
    morale: [],
    welfare: [],
    knowledge: [],
  };
}

export function createDefaultCampaignLedger(): CampaignLedger {
  return {
    openedEnvelopes: {},
    storyCards: {},
    eventCards: {},
    mysteryStickers: {},
  };
}

export function createDefaultNextGameSetupState(): NextGameSetupState {
  return {
    checklist: {},
    lastAppliedAt: "",
    lastAppliedBy: null,
    lastLegacyResourceDeltas: {},
    lastOpenAgendaAssignments: {
      positive: {},
      negative: {},
    },
  };
}

export function previewChroniclePlacement(
  ledger: ChronicleLedger,
  input: Pick<ChronicleStickerEntry, "resourceId" | "polarity">,
): ChroniclePlacementPreview {
  const activeRow = (ledger[input.resourceId] || [])
    .filter((entry) => !entry.replacedAt)
    .sort((a, b) => a.slotIndex - b.slotIndex);
  const usedSlots = new Set(activeRow.map((entry) => entry.slotIndex));

  for (let slotIndex = 0; slotIndex < CHRONICLE_ROW_CAPACITY; slotIndex += 1) {
    if (!usedSlots.has(slotIndex)) {
      return {
        resourceId: input.resourceId,
        polarity: input.polarity,
        slotIndex,
        reason: "empty_slot",
        replacedStickerId: "",
      };
    }
  }

  const replaced = [...activeRow].sort((a, b) => b.ageMarks - a.ageMarks || a.slotIndex - b.slotIndex)[0];

  return {
    resourceId: input.resourceId,
    polarity: input.polarity,
    slotIndex: replaced.slotIndex,
    reason: "replace_oldest",
    replacedStickerId: replaced.id,
  };
}

export function ageChronicleLedger(ledger: ChronicleLedger): ChronicleLedger {
  return mapChronicleLedger(ledger, (entry) => (
    entry.replacedAt ? entry : { ...entry, ageMarks: Math.min(6, entry.ageMarks + 1) }
  ));
}

export function calculateLegacyResourceDeltas(
  ledger: ChronicleLedger,
): Partial<Record<ChronicleResourceId, number>> {
  const deltas: Partial<Record<ChronicleResourceId, number>> = {};

  for (const [resourceId, entries] of Object.entries(ledger) as Array<[ChronicleResourceId, ChronicleStickerEntry[]]>) {
    const delta = entries
      .filter((entry) => !entry.replacedAt)
      .reduce((total, entry) => total + (entry.polarity === "positive" ? 1 : -1), 0);

    if (delta !== 0) {
      deltas[resourceId] = delta;
    }
  }

  return deltas;
}

export function assignOpenAgendasFromChronicles(
  ledger: ChronicleLedger,
  participatingHouseIds: readonly string[],
): ChronicleOpenAgendaAssignments {
  const participating = new Set(participatingHouseIds);
  const assignments: ChronicleOpenAgendaAssignments = {
    positive: {},
    negative: {},
  };

  for (const [resourceId, entries] of Object.entries(ledger) as Array<[ChronicleResourceId, ChronicleStickerEntry[]]>) {
    for (const polarity of ["positive", "negative"] as const) {
      const mostRecent = entries
        .filter((entry) => (
          !entry.replacedAt
          && entry.polarity === polarity
          && participating.has(entry.signedByHouseId)
        ))
        .sort((a, b) => a.ageMarks - b.ageMarks || b.slotIndex - a.slotIndex)[0];

      if (mostRecent) {
        assignments[polarity][resourceId] = mostRecent.signedByHouseId;
      }
    }
  }

  return assignments;
}

function mapChronicleLedger(
  ledger: ChronicleLedger,
  mapEntry: (entry: ChronicleStickerEntry) => ChronicleStickerEntry,
): ChronicleLedger {
  return {
    influence: ledger.influence.map(mapEntry),
    wealth: ledger.wealth.map(mapEntry),
    morale: ledger.morale.map(mapEntry),
    welfare: ledger.welfare.map(mapEntry),
    knowledge: ledger.knowledge.map(mapEntry),
  };
}
