# Chronicle Ledger Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a spoiler-safe digital Chronicle/Campaign ledger so every non-personal, non-spoiler board procedure can be automated from structured state.

**Architecture:** Keep the physical Realm board as the table source of truth, but mirror only non-spoiler mechanical state in the app: Chronicle sticker metadata, age marks, signer, placement slot, envelope/story/mystery status, and ordered Dilemma outcome effects. Personal inventories and campaign scoring fields that the developer explicitly wants users to maintain manually stay manual: coins, power, achievements, prestige, and crave.

**Tech Stack:** React + TypeScript UI, existing `shared/agenda-api.mts` action router, existing `netlify/functions/_shared/agenda-state.mts` state normalizer/mutator, existing `src/types/game.ts` redacted client types, existing `tests/` tsx-based specs.

---

## Automation Boundary

Automate:
- Chronicle sticker placement, replacement, aging, most-recent/oldest tie rules.
- Resource legacy movement suggestions from Chronicle ledger.
- Open Agenda assignment from participating houses and latest Chronicle signer.
- Mystery sticker structured placement and Envelope 70 trigger.
- Envelope/story/event status tracking by code only, without content spoilers.
- Ordered Dilemma outcome effects and board movement calculations.
- King death detection when the Dilemma effect list or time counter state contains the required trigger.
- Next game setup checklist persistence and idempotent setup run log.

Keep manual:
- Coins.
- Power tokens in personal pools.
- House achievements.
- Prestige and Crave.
- Any hidden card/envelope/story text.
- Any unknown family/house-specific spoiler values.

---

## File Structure

Create:
- `shared/chronicle-ledger.mts` — spoiler-safe Chronicle, campaign, mystery, and ordered effect types plus pure rule helpers.
- `src/components/ChronicleLedgerDialog.tsx` — table-facing Chronicle ledger editor and placement preview.
- `src/components/CampaignLedgerDialog.tsx` — envelope/story/event/mystery status editor.
- `tests/chronicle-ledger.test.mts` — pure rule tests for placement, aging, legacy, open agenda, mystery trigger.
- `tests/agenda-chronicle-api.test.mts` — API/state mutation tests.

Modify:
- `netlify/functions/_shared/agenda-state.mts` — store/sanitize `chronicleLedger`, `campaignLedger`, `nextGameSetupState`, and add mutators.
- `shared/agenda-api.mts` — route new actions.
- `src/types/game.ts` — mirror redacted types.
- `src/App.tsx` — add dialog state, settings entry, and pass state/mutate props.
- `src/components/NextGameSetupDialog.tsx` — replace local checklist/calculator with persisted ledger-derived setup automation.
- `src/components/DilemmaEditDialog.tsx` — add ordered outcome effect editor for AYE/NAY.
- `src/components/DilemmaResolutionDialog.tsx` — resolve ordered effects and create ledger actions from selected outcome.
- `src/resources/ko/app.ts` and `src/resources/ko/strings.ts` — Korean UI strings.
- `src/styles/_02-settings.scss`, `src/styles/_04-dialogs-editors.scss`, `src/styles/_10-mobile-overrides.scss` — menu/dialog/mobile layout.
- `package.json` only if tests need a new explicit spec entry; otherwise reuse existing `npm test` glob.

---

## Data Model

### `shared/chronicle-ledger.mts`

```ts
export const CHRONICLE_ROW_CAPACITY = 5 as const;

export type ChronicleResourceId = "influence" | "wealth" | "morale" | "welfare" | "knowledge";
export type ChroniclePolarity = "positive" | "negative";
export type ChroniclePlacementReason = "empty_slot" | "replace_oldest";

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
};

export type ChronicleLedger = Record<ChronicleResourceId, ChronicleStickerEntry[]>;

export type ChroniclePlacementPreview = {
  resourceId: ChronicleResourceId;
  polarity: ChroniclePolarity;
  slotIndex: number;
  reason: ChroniclePlacementReason;
  replacedStickerId: string;
};

export type CampaignLedger = {
  openedEnvelopes: Record<string, CampaignEnvelopeEntry>;
  storyCards: Record<string, CampaignCardEntry>;
  eventCards: Record<string, CampaignCardEntry>;
  mysteryStickers: Record<string, MysteryStickerEntry>;
};

export type CampaignEnvelopeEntry = {
  code: string;
  openedAt: string;
  sourceDilemmaHistoryId: string;
  note: string;
};

export type CampaignCardEntry = {
  code: string;
  status: "active" | "completed" | "archived";
  sourceEnvelopeCode: string;
  sourceDilemmaHistoryId: string;
  note: string;
  updatedAt: string;
};

export type MysteryStickerEntry = {
  dossierLetter: string;
  storylineSymbol: string;
  slotKey: string;
  sourceDilemmaHistoryId: string;
  attachedAt: string;
  note: string;
};

export type NextGameSetupState = {
  checklist: Record<string, boolean>;
  lastAppliedAt: string;
  lastAppliedBy: string | null;
  lastLegacyResourceDeltas: Partial<Record<ChronicleResourceId, number>>;
  lastOpenAgendaAssignments: Record<"positive" | "negative", Partial<Record<ChronicleResourceId, string>>>;
};
```

Pure helpers:

```ts
export function previewChroniclePlacement(
  ledger: ChronicleLedger,
  input: Pick<ChronicleStickerEntry, "resourceId" | "polarity">,
): ChroniclePlacementPreview {
  const row = [...(ledger[input.resourceId] || [])].sort((a, b) => a.slotIndex - b.slotIndex);
  const used = new Set(row.filter((entry) => !entry.replacedAt).map((entry) => entry.slotIndex));

  for (let slot = 0; slot < CHRONICLE_ROW_CAPACITY; slot += 1) {
    if (!used.has(slot)) {
      return { resourceId: input.resourceId, polarity: input.polarity, slotIndex: slot, reason: "empty_slot", replacedStickerId: "" };
    }
  }

  const oldest = row
    .filter((entry) => !entry.replacedAt)
    .sort((a, b) => b.ageMarks - a.ageMarks || a.slotIndex - b.slotIndex)[0];

  return {
    resourceId: input.resourceId,
    polarity: input.polarity,
    slotIndex: oldest.slotIndex,
    reason: "replace_oldest",
    replacedStickerId: oldest.id,
  };
}

export function calculateLegacyResourceDeltas(ledger: ChronicleLedger): Partial<Record<ChronicleResourceId, number>> {
  return Object.fromEntries(
    Object.entries(ledger).map(([resourceId, entries]) => {
      const active = entries.filter((entry) => !entry.replacedAt);
      const positive = active.filter((entry) => entry.polarity === "positive").length;
      const negative = active.filter((entry) => entry.polarity === "negative").length;
      return [resourceId, positive - negative];
    }).filter(([, delta]) => delta !== 0),
  ) as Partial<Record<ChronicleResourceId, number>>;
}

export function ageChronicleLedger(ledger: ChronicleLedger): ChronicleLedger {
  return Object.fromEntries(
    Object.entries(ledger).map(([resourceId, entries]) => [
      resourceId,
      entries.map((entry) => entry.replacedAt ? entry : { ...entry, ageMarks: Math.min(6, entry.ageMarks + 1) }),
    ]),
  ) as ChronicleLedger;
}
```

---

## Implementation Tasks

### Task 1: Pure Chronicle rule module

**Files:**
- Create: `shared/chronicle-ledger.mts`
- Test: `tests/chronicle-ledger.test.mts`

- [ ] **Step 1: Add tests for placement rules**

Add cases:
- Empty row chooses slot `0`.
- Partially filled row chooses the leftmost empty slot.
- Full row replaces the active sticker with highest `ageMarks`.
- Full row tie replaces the leftmost tied sticker.

- [ ] **Step 2: Add tests for aging and legacy deltas**

Add cases:
- Active stickers age by 1.
- Replaced stickers do not age.
- Positive count minus negative count returns per-resource delta.

- [ ] **Step 3: Implement `shared/chronicle-ledger.mts`**

Implement the types and pure helpers from the Data Model section.

- [ ] **Step 4: Run targeted test**

Run: `npm test -- tests/chronicle-ledger.test.mts`

Expected: placement, aging, and legacy tests pass.

### Task 2: Persist Chronicle/Campaign state in agenda state

**Files:**
- Modify: `netlify/functions/_shared/agenda-state.mts`
- Modify: `src/types/game.ts`
- Test: `tests/agenda-chronicle-api.test.mts`

- [ ] **Step 1: Extend `GameState` and `RedactedState`**

Add:

```ts
chronicleLedger: ChronicleLedger;
campaignLedger: CampaignLedger;
nextGameSetupState: NextGameSetupState;
```

- [ ] **Step 2: Add default factories**

Add:

```ts
function createDefaultChronicleLedger(): ChronicleLedger
function createDefaultCampaignLedger(): CampaignLedger
function createDefaultNextGameSetupState(): NextGameSetupState
```

- [ ] **Step 3: Add sanitizers**

Add sanitizers that clamp:
- `ageMarks` to `0..6`.
- `slotIndex` to `0..CHRONICLE_ROW_CAPACITY - 1`.
- text fields to existing project single-line/multiline limits.
- invalid resource/polarity/status values to safe empty defaults or filtered entries.

- [ ] **Step 4: Redact state**

Expose only spoiler-safe codes and metadata. Do not store or emit card/envelope body text.

- [ ] **Step 5: Add migration defaults**

Existing saved state without these keys must normalize to empty defaults.

### Task 3: Chronicle ledger mutators and API actions

**Files:**
- Modify: `netlify/functions/_shared/agenda-state.mts`
- Modify: `shared/agenda-api.mts`
- Test: `tests/agenda-chronicle-api.test.mts`

- [ ] **Step 1: Add server mutators**

Implement:

```ts
export function addChronicleSticker(state, houseId, input, now): GameState
export function updateChronicleSticker(state, houseId, stickerId, patch, now): GameState
export function deleteChronicleSticker(state, houseId, stickerId, now): GameState
export function ageChroniclesForNextGame(state, houseId, now): GameState
```

Rules:
- Only authenticated/participating houses can mutate.
- Placement uses `previewChroniclePlacement`.
- Replacement marks old entry `replacedAt`, does not delete it.
- Deleting a mistakenly entered active sticker removes it and compacts nothing; next placement still chooses first empty slot.

- [ ] **Step 2: Add API actions**

Route:
- `addChronicleSticker`
- `updateChronicleSticker`
- `deleteChronicleSticker`
- `ageChroniclesForNextGame`

- [ ] **Step 3: Add tests**

Test placement, replacement, aging, and permission failures through the API action handler.

### Task 4: Ordered Dilemma outcome effects

**Files:**
- Modify: `src/types/game.ts`
- Modify: `netlify/functions/_shared/agenda-state.mts`
- Modify: `src/utils/dilemma-helpers.ts`
- Modify: `src/components/DilemmaEditDialog.tsx`
- Modify: `src/components/DilemmaResolutionDialog.tsx`
- Test: `tests/chronicle-ledger.test.mts`

- [ ] **Step 1: Add effect type**

```ts
export type DilemmaOutcomeEffect =
  | { id: string; type: "resource"; resourceId: PersonalResourceId; amount: number }
  | { id: string; type: "chronicle"; resourceId: PersonalResourceId; polarity: ChroniclePolarity; stickerCode: string }
  | { id: string; type: "envelope"; envelopeCode: string }
  | { id: string; type: "story"; cardCode: string; status: "active" | "completed" | "archived" }
  | { id: string; type: "event"; cardCode: string; status: "active" | "completed" | "archived" }
  | { id: string; type: "mystery"; dossierLetter: string; storylineSymbol: string; slotKey: string }
  | { id: string; type: "king_death"; reason: "death_symbol" | "fifth_card" | "card_text" }
  | { id: string; type: "note"; text: string };
```

Add `effects: DilemmaOutcomeEffect[]` to `DilemmaOutcome` while preserving `resourceDeltas` for backward compatibility.

- [ ] **Step 2: Normalize old records**

If `effects` is missing, derive resource effects from `resourceDeltas` in resource display order.

- [ ] **Step 3: Update edit UI**

Add a compact ordered effect list under each AYE/NAY result:
- Add resource effect.
- Add Chronicle sticker effect.
- Add envelope/story/event/mystery effect.
- Add king death effect.
- Reorder up/down.

- [ ] **Step 4: Update resolution UI**

Use ordered effects instead of resource map for automatic movement. Keep manual override field for edge cases.

### Task 5: Chronicle ledger dialog

**Files:**
- Create: `src/components/ChronicleLedgerDialog.tsx`
- Modify: `src/App.tsx`
- Modify: `src/resources/ko/app.ts`
- Modify: `src/styles/_04-dialogs-editors.scss`

- [ ] **Step 1: Add settings menu entry**

Place under `게임 흐름` or `물리 보드 보조`, not under personal inventory.

- [ ] **Step 2: Build ledger UI**

Game Studio UI rule:
- Dialog only, not persistent HUD.
- Resource rows grouped by icon/color.
- Active stickers first, replaced archive collapsed.
- Each row shows slot index, polarity, sticker code, signer, age marks.

- [ ] **Step 3: Add placement preview**

Before saving a sticker, show:
- Empty slot placement.
- Replacement target if row is full.
- Tie reason if replacing oldest-leftmost.

### Task 6: Campaign ledger dialog

**Files:**
- Create: `src/components/CampaignLedgerDialog.tsx`
- Modify: `src/App.tsx`
- Modify: `src/resources/ko/app.ts`
- Modify: `src/styles/_04-dialogs-editors.scss`

- [ ] **Step 1: Track envelopes by code**

Fields:
- envelope code.
- opened date.
- source dilemma/card.
- note.

No envelope contents.

- [ ] **Step 2: Track story/event cards by code and status**

Statuses:
- active.
- completed.
- archived.

No card contents.

- [ ] **Step 3: Track mystery stickers structurally**

Fields:
- dossier letter A-L.
- storyline symbol.
- slot key.
- source dilemma.

Show automatic warning when exactly six mystery stickers are attached or when the final configured slot is filled: open Envelope 70 after current Dilemma resolution.

### Task 7: Fully automate Open Agenda assignment

**Files:**
- Modify: `shared/chronicle-ledger.mts`
- Modify: `netlify/functions/_shared/agenda-state.mts`
- Modify: `src/components/NextGameSetupDialog.tsx`
- Test: `tests/chronicle-ledger.test.mts`

- [ ] **Step 1: Add pure helper**

```ts
export function assignOpenAgendasFromChronicles(
  ledger: ChronicleLedger,
  participatingHouseIds: string[],
): Record<"positive" | "negative", Partial<Record<ChronicleResourceId, string>>>;
```

Rules:
- For each resource and polarity, ignore replaced stickers.
- Ignore stickers signed by non-participating houses.
- Most recent = fewest age marks.
- Tie = rightmost slot index.
- No active signed sticker = unassigned.

- [ ] **Step 2: Replace manual assignment default**

Next game setup should pre-fill assignments from the helper.

- [ ] **Step 3: Keep override**

Users can override a computed assignment if their physical board differs; the override is visible and saved.

### Task 8: Fully automate legacy resource movement suggestions

**Files:**
- Modify: `shared/chronicle-ledger.mts`
- Modify: `src/components/NextGameSetupDialog.tsx`

- [ ] **Step 1: Replace count-input calculator**

Use `calculateLegacyResourceDeltas(chronicleLedger)`.

- [ ] **Step 2: Display movement instructions**

Example UI copy:
- `영향력: 위로 2칸, 아래로 1칸 => 순이동 위로 1칸`
- `안정도는 중앙 유지, 자원 앞뒷면은 뒤집지 않음`

- [ ] **Step 3: Persist setup result**

Save `lastLegacyResourceDeltas` in `nextGameSetupState` when applying next game setup.

### Task 9: Persist next game setup checklist

**Files:**
- Modify: `netlify/functions/_shared/agenda-state.mts`
- Modify: `shared/agenda-api.mts`
- Modify: `src/components/NextGameSetupDialog.tsx`

- [ ] **Step 1: Add action**

`saveNextGameSetupChecklist` updates `nextGameSetupState.checklist`.

- [ ] **Step 2: Add idempotent apply action**

`applyNextGameSetupAutomation` performs:
- age active chronicle stickers once.
- compute legacy resource deltas.
- compute open agenda assignments.
- save run timestamp.

Guard:
- If `lastAppliedAt` already exists for current setup cycle, show confirmation before applying again.

### Task 10: King death automation

**Files:**
- Modify: `src/components/DilemmaResolutionDialog.tsx`
- Modify: `src/utils/dilemma-helpers.ts`
- Modify: `netlify/functions/_shared/agenda-state.mts`

- [ ] **Step 1: Detect explicit king death effect**

If selected ordered effect includes `{ type: "king_death" }`, set `resolutionBoardState.endTrigger = "king_death"`.

- [ ] **Step 2: Detect fifth-card rule from session counter**

Store `currentSessionResolvedDilemmaCount` or derive from current session history if reliable. If this Dilemma is the fifth card and rule condition is marked, set king death.

- [ ] **Step 3: Keep manual override**

Because card symbols are physical/spoiler-sensitive, allow manual override reason.

### Task 11: Backfill assistant

**Files:**
- Create: `src/components/CampaignBackfillDialog.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Build one-time guided input**

For existing campaigns, ask the user to enter:
- current active Chronicle stickers by resource row.
- age marks.
- signer house.
- opened envelopes by code.
- active story/event cards by code.
- attached mystery stickers.

- [ ] **Step 2: Preview before apply**

Show computed:
- next open agenda assignments.
- resource legacy deltas.
- any row replacement implications.
- Envelope 70 trigger status.

- [ ] **Step 3: Apply to ledger**

Save only after explicit user confirmation.

---

## Execution Order

1. `shared/chronicle-ledger.mts` and pure tests.
2. Agenda state persistence and API actions.
3. Chronicle ledger dialog.
4. Ordered Dilemma outcome effects.
5. Campaign ledger dialog.
6. Open Agenda automation from ledger.
7. Legacy resource automation from ledger.
8. Next game setup persistence and apply action.
9. King death automation refinements.
10. Backfill assistant.

This order avoids building UI on unstable state and makes every automation depend on tested pure rules.

---

## Acceptance Criteria

- A user can enter a Chronicle sticker once and the app stores signer, resource, polarity, age, and board slot.
- If a Chronicle row is full, the app previews and applies oldest-leftmost replacement.
- Next game setup can age all active Chronicle stickers once.
- Next game setup computes resource legacy deltas from active Chronicle stickers without user count input.
- Next game setup computes Open Agenda assignments from latest active signed stickers and participating houses.
- Mystery stickers are tracked by dossier letter and placement slot without revealing hidden text.
- The sixth mystery sticker automatically warns to open Envelope 70 after current resolution.
- Envelope/story/event status is tracked by code/status only.
- Dilemma outcome effects preserve left-to-right order.
- King death can be triggered by structured outcome effect, fifth-card condition, or manual physical-card override.
- Setup checklist survives closing/reopening the dialog.
- Coins, power, achievements, prestige, and crave remain user-managed manual fields.

---

## Validation Plan

Targeted first:
- `npm test -- tests/chronicle-ledger.test.mts`
- `npm test -- tests/agenda-chronicle-api.test.mts`

Final before completion:
- `npm run check`
- `npm run verify`

Browser/UI validation:
- Open `http://127.0.0.1:3291/`.
- Confirm settings menu entries are grouped under game-flow/board support, not personal inventory.
- Confirm dialogs fit mobile portrait width.
- Confirm no persistent HUD blocks the main play surface.

---

## Self-Review

Spec coverage:
- Digital Chronicle ledger: Task 1-5.
- Chronicle aging automation: Task 3 and Task 9.
- Full Open Agenda automation: Task 7.
- Full legacy resource automation: Task 8.
- Chronicle placement/replacement rules: Task 1 and Task 3.
- Envelope/story state: Task 6.
- Mystery structured tracking: Task 6.
- Ordered Dilemma effects: Task 4.
- King death automation: Task 10.
- Next game setup persistence: Task 9.
- Manual-only personal economy/scoring philosophy: Automation Boundary and Acceptance Criteria.

Placeholder scan:
- No `TBD`, `TODO`, or undefined future behavior remains in the plan.

Type consistency:
- `ChronicleResourceId`, `ChroniclePolarity`, `ChronicleLedger`, `CampaignLedger`, and `NextGameSetupState` are defined before use.
