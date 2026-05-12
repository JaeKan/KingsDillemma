import { useMemo, useState } from "react";
import {
  assignOpenAgendasFromChronicles,
  calculateLegacyResourceDeltas,
  type ChronicleLedger,
  type ChronicleOpenAgendaAssignments,
  type ChroniclePolarity,
  type ChronicleResourceId,
} from "../../shared/chronicle-ledger.mts";
import { TokenIcon } from "./GameIcons";
import { ko, openAgendaTokenTypes, resourceCounters } from "../resources/gameResources";

type AssignmentMap = ChronicleOpenAgendaAssignments;
type ChecklistMap = Record<string, boolean>;
type LegacyResourceCounts = Partial<Record<ChronicleResourceId, { positive: number; negative: number }>>;

const setupCheckIds = [
  "cleanupTimeCounter",
  "saveStoryEvents",
  "resetCards",
  "defaultResources",
  "defaultInventories",
  "leaderModerator",
  "chronicleAging",
  "legacyPower",
  "legacyResources",
] as const;

function createAssignments(): AssignmentMap {
  return {
    positive: {},
    negative: {},
  };
}

function normalizeChecks(checklist: unknown): ChecklistMap {
  const source = checklist && typeof checklist === "object" ? checklist as Record<string, unknown> : {};
  return Object.fromEntries(setupCheckIds.map((id) => [id, Boolean(source[id])])) as ChecklistMap;
}

interface NextGameSetupDialogProps {
  open: boolean;
  state: any;
  busy: boolean;
  mutate: (payload: Record<string, unknown>) => Promise<unknown>;
  onClose: () => void;
}

export default function NextGameSetupDialog({ open, state, busy, mutate, onClose }: NextGameSetupDialogProps) {
  const [assignments, setAssignments] = useState(createAssignments);
  const [statusText, setStatusText] = useState("");
  const ledger = useMemo(() => normalizeLedger(state?.chronicleLedger), [state]);
  const houses = useMemo(
    () => (state?.houses || []).filter((house: any) => house?.hasChosen || house?.hasSession),
    [state],
  );
  const participatingHouseIds = useMemo(() => houses.map((house: any) => house.id).filter(Boolean), [houses]);
  const setupState = state?.nextGameSetupState || {};
  const checks = useMemo(() => normalizeChecks(setupState.checklist), [setupState.checklist]);
  const legacyDeltas = useMemo(() => calculateLegacyResourceDeltas(ledger), [ledger]);
  const legacyCounts = useMemo(() => countLegacyResources(ledger), [ledger]);
  const suggestedAssignments = useMemo(
    () => assignOpenAgendasFromChronicles(ledger, participatingHouseIds),
    [ledger, participatingHouseIds],
  );
  const assignmentCounts = useMemo(() => countAssignments(assignments), [assignments]);
  const warnings = useMemo(() => getAssignmentWarnings(assignments, houses), [assignments, houses]);
  const hasAssignments = useMemo(
    () =>
      (openAgendaTokenTypes as any).some((type: any) =>
        resourceCounters.some((resource) => Boolean(assignments[type.id as ChroniclePolarity]?.[resource.id as ChronicleResourceId])),
      ),
    [assignments],
  );
  const hasSuggestedAssignments = useMemo(() => hasAnyAssignments(suggestedAssignments), [suggestedAssignments]);
  const lastAppliedAt = typeof setupState.lastAppliedAt === "string" ? setupState.lastAppliedAt : "";
  const lastAppliedBy = typeof setupState.lastAppliedBy === "string" ? setupState.lastAppliedBy : "";
  const lastLegacyDeltas = setupState.lastLegacyResourceDeltas || {};
  const lastOpenAgendaAssignments = normalizeAssignments(setupState.lastOpenAgendaAssignments);

  if (!open) {
    return null;
  }

  const saveChecks = async (nextChecks: ChecklistMap) => {
    setStatusText("");
    const result = await mutate({
      action: "saveNextGameSetupChecklist",
      checklist: nextChecks,
    });
    setStatusText(result ? ko.app.nextGameSetup.checklistSaveOk : ko.app.nextGameSetup.checklistSaveFail);
  };

  const toggleCheck = (id: string) => {
    void saveChecks({
      ...checks,
      [id]: !checks[id],
    });
  };

  const setAssignment = (polarity: ChroniclePolarity, resourceId: ChronicleResourceId, houseId: string) => {
    setAssignments((current) => ({
      ...current,
      [polarity]: {
        ...current[polarity],
        [resourceId]: houseId,
      },
    }));
  };

  const copySuggestions = () => {
    setAssignments(cloneAssignments(suggestedAssignments));
    setStatusText(ko.app.nextGameSetup.suggestionsCopied);
  };

  const applyAssignments = async () => {
    setStatusText("");
    const result = await mutate({
      action: "applyOpenAgendaAssignments",
      assignments,
    });
    setStatusText(result ? ko.app.nextGameSetup.applyOk : ko.app.nextGameSetup.applyFail);
  };

  const applySetupAutomation = async () => {
    setStatusText("");

    if (lastAppliedAt && !window.confirm(ko.app.nextGameSetup.reapplyConfirm(formatLocalDateTime(lastAppliedAt), getHouseName(houses, lastAppliedBy)))) {
      return;
    }

    const result = await mutate({
      action: "applyNextGameSetupAutomation",
      force: Boolean(lastAppliedAt),
    });
    setStatusText(result ? ko.app.nextGameSetup.automationApplyOk : ko.app.nextGameSetup.automationApplyFail);
  };

  return (
    <div className="session-end-overlay" role="presentation">
      <section className="session-end-dialog next-game-setup-dialog" aria-modal="true" role="dialog">
        <div className="session-end-heading">
          <span className="session-end-seal" aria-hidden="true">
            <TokenIcon type="seal" />
          </span>
          <div>
            <p className="section-label">{ko.app.nextGameSetup.section}</p>
            <h2>{ko.app.nextGameSetup.title}</h2>
          </div>
        </div>
        <p className="session-end-copy">{ko.app.nextGameSetup.copy}</p>

        <section className="next-game-setup-section">
          <h3>{ko.app.nextGameSetup.cleanupTitle}</h3>
          <SetupCheckList
            checks={checks}
            ids={["cleanupTimeCounter", "saveStoryEvents", "resetCards"]}
            onToggle={toggleCheck}
          />
        </section>

        <section className="next-game-setup-section">
          <h3>{ko.app.nextGameSetup.defaultsTitle}</h3>
          <SetupCheckList
            checks={checks}
            ids={["defaultResources", "defaultInventories", "leaderModerator"]}
            onToggle={toggleCheck}
          />
        </section>

        <section className="next-game-setup-section">
          <h3>{ko.app.nextGameSetup.legacyTitle}</h3>
          <SetupCheckList
            checks={checks}
            ids={["chronicleAging", "legacyPower", "legacyResources"]}
            onToggle={toggleCheck}
          />
          <p>{ko.app.nextGameSetup.legacyResourceCopy}</p>
          <div className="legacy-resource-calculator-grid">
            {resourceCounters.map((resource) => {
              const resourceId = resource.id as ChronicleResourceId;
              const counts = legacyCounts[resourceId] || { positive: 0, negative: 0 };
              const net = legacyDeltas[resourceId] || 0;

              return (
                <div className={`legacy-resource-calculator-card tone-${resource.tone}`} key={resource.id}>
                  <strong>
                    <TokenIcon type={resource.icon as any} />
                    {resource.label}
                  </strong>
                  <div className="legacy-resource-count-row positive">
                    <span>{ko.app.nextGameSetup.positiveChronicles}</span>
                    <strong>{ko.app.nextGameSetup.legacyPositiveMove(counts.positive)}</strong>
                  </div>
                  <div className="legacy-resource-count-row negative">
                    <span>{ko.app.nextGameSetup.negativeChronicles}</span>
                    <strong>{ko.app.nextGameSetup.legacyNegativeMove(counts.negative)}</strong>
                  </div>
                  <output>{ko.app.nextGameSetup.legacyNetMove(net)}</output>
                </div>
              );
            })}
          </div>
        </section>

        <section className="next-game-setup-section">
          <h3>{ko.app.nextGameSetup.openAgendaTitle}</h3>
          <p>{ko.app.nextGameSetup.openAgendaCopy}</p>
          <div className="open-agenda-suggestion-panel">
            <div>
              <strong>{ko.app.nextGameSetup.suggestionsTitle}</strong>
              <p>{ko.app.nextGameSetup.suggestionsCopy}</p>
            </div>
            <button className="secondary-button" type="button" disabled={!hasSuggestedAssignments} onClick={copySuggestions}>
              {ko.app.nextGameSetup.copySuggestions}
            </button>
          </div>
          <AssignmentPreview assignments={suggestedAssignments} houses={houses} title={ko.app.nextGameSetup.suggestionsPreviewTitle} />
          <div className="open-agenda-assignment-grid">
            {openAgendaTokenTypes.map((type: any) => (
              <div className={`open-agenda-assignment-card tone-${type.tone}`} key={type.id}>
                <h4>{type.label}</h4>
                {resourceCounters.map((resource) => (
                  <label key={`${type.id}-${resource.id}`}>
                    <span>{resource.label}</span>
                    <select
                      value={assignments[type.id as ChroniclePolarity]?.[resource.id as ChronicleResourceId] || ""}
                      onChange={(event) => setAssignment(type.id as ChroniclePolarity, resource.id as ChronicleResourceId, event.target.value)}
                    >
                      <option value="">{ko.app.nextGameSetup.unassigned}</option>
                      {houses.map((house: any) => (
                        <option value={house.id} key={house.id}>
                          {house.name || house.koreanTitle}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            ))}
          </div>
          <div className="open-agenda-assignment-summary">
            {houses.map((house: any) => {
              const positive = assignmentCounts.positive[house.id] || 0;
              const negative = assignmentCounts.negative[house.id] || 0;
              return (
                <span key={house.id}>
                  {ko.app.nextGameSetup.assignmentCount(house.name || house.koreanTitle, positive, negative)}
                </span>
              );
            })}
          </div>
          {warnings.length ? (
            <div className="dilemma-settlement-warnings">
              <strong>{ko.app.nextGameSetup.warningTitle}</strong>
              {warnings.map((warning) => (
                <span key={warning}>{warning}</span>
              ))}
            </div>
          ) : (
            <p className="session-score-status">{ko.app.nextGameSetup.noWarnings}</p>
          )}
          <div className="next-game-setup-actions">
            <button className="primary-button" type="button" disabled={busy || !hasAssignments} onClick={applyAssignments}>
              {ko.app.nextGameSetup.applyAssignments}
            </button>
            {statusText ? <span>{statusText}</span> : null}
          </div>
        </section>

        <section className="next-game-setup-section">
          <h3>{ko.app.nextGameSetup.automationTitle}</h3>
          <p>{ko.app.nextGameSetup.automationCopy}</p>
          <div className="next-game-setup-actions">
            <button className="primary-button" type="button" disabled={busy} onClick={applySetupAutomation}>
              {ko.app.nextGameSetup.applyAutomation}
            </button>
          </div>
          {lastAppliedAt ? (
            <div className="next-game-setup-snapshot">
              <strong>{ko.app.nextGameSetup.lastAppliedTitle}</strong>
              <span>{ko.app.nextGameSetup.lastAppliedMeta(formatLocalDateTime(lastAppliedAt), getHouseName(houses, lastAppliedBy))}</span>
              <SnapshotLegacyDeltas deltas={lastLegacyDeltas} />
              <AssignmentPreview assignments={lastOpenAgendaAssignments} houses={houses} title={ko.app.nextGameSetup.lastAssignmentsTitle} />
            </div>
          ) : (
            <p className="session-score-status">{ko.app.nextGameSetup.notAppliedYet}</p>
          )}
        </section>

        <div className="session-end-actions">
          <button className="primary-button" type="button" onClick={onClose}>
            {ko.common.close}
          </button>
        </div>
      </section>
    </div>
  );
}

function SetupCheckList({
  checks,
  ids,
  onToggle,
}: {
  checks: Record<string, boolean>;
  ids: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="session-end-checklist">
      {ids.map((id) => (
        <label className="session-end-check" key={id}>
          <input type="checkbox" checked={Boolean(checks[id])} onChange={() => onToggle(id)} />
          <span>{ko.app.nextGameSetup.checks[id]}</span>
        </label>
      ))}
    </div>
  );
}

function countAssignments(assignments: AssignmentMap) {
  const counts: Record<string, Record<string, number>> = { positive: {}, negative: {} };

  for (const type of openAgendaTokenTypes as any) {
    for (const houseId of Object.values(assignments[type.id as ChroniclePolarity] || {})) {
      if (!houseId) {
        continue;
      }

      counts[type.id][houseId as string] = (counts[type.id][houseId as string] || 0) + 1;
    }
  }

  return counts;
}

function countLegacyResources(ledger: ChronicleLedger): LegacyResourceCounts {
  const counts: LegacyResourceCounts = {};

  for (const resource of resourceCounters) {
    const resourceId = resource.id as ChronicleResourceId;
    counts[resourceId] = { positive: 0, negative: 0 };

    for (const entry of ledger[resourceId] || []) {
      if (entry.replacedAt) {
        continue;
      }

      counts[resourceId][entry.polarity] += 1;
    }
  }

  return counts;
}

function getAssignmentWarnings(assignments: AssignmentMap, houses: any[]) {
  const counts = countAssignments(assignments);
  const warnings: string[] = [];

  for (const house of houses) {
    const positive = counts.positive[house.id] || 0;
    const negative = counts.negative[house.id] || 0;

    if (positive > 2) {
      warnings.push(ko.app.nextGameSetup.tooManyPositive(house.name || house.koreanTitle, positive));
    }

    if (negative > 2) {
      warnings.push(ko.app.nextGameSetup.tooManyNegative(house.name || house.koreanTitle, negative));
    }
  }

  return warnings;
}

function hasAnyAssignments(assignments: AssignmentMap) {
  return (openAgendaTokenTypes as any).some((type: any) =>
    resourceCounters.some((resource) => Boolean(assignments[type.id as ChroniclePolarity]?.[resource.id as ChronicleResourceId])),
  );
}

function cloneAssignments(assignments: AssignmentMap): AssignmentMap {
  return {
    positive: { ...assignments.positive },
    negative: { ...assignments.negative },
  };
}

function normalizeAssignments(assignments: unknown): AssignmentMap {
  if (!assignments || typeof assignments !== "object") {
    return createAssignments();
  }

  const source = assignments as Partial<Record<ChroniclePolarity, Partial<Record<ChronicleResourceId, string>>>>;
  return {
    positive: { ...(source.positive || {}) },
    negative: { ...(source.negative || {}) },
  };
}

function normalizeLedger(ledger: unknown): ChronicleLedger {
  const source = ledger && typeof ledger === "object" ? ledger as Partial<ChronicleLedger> : {};
  return {
    influence: Array.isArray(source.influence) ? source.influence : [],
    wealth: Array.isArray(source.wealth) ? source.wealth : [],
    morale: Array.isArray(source.morale) ? source.morale : [],
    welfare: Array.isArray(source.welfare) ? source.welfare : [],
    knowledge: Array.isArray(source.knowledge) ? source.knowledge : [],
  };
}

function getHouseName(houses: any[], houseId: string) {
  const house = houses.find((candidate) => candidate.id === houseId);
  return house?.name || house?.koreanTitle || houseId || ko.app.nextGameSetup.unknownHouse;
}

function formatLocalDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function AssignmentPreview({ assignments, houses, title }: { assignments: AssignmentMap; houses: any[]; title: string }) {
  if (!hasAnyAssignments(assignments)) {
    return <p className="chronicle-empty-row">{ko.app.nextGameSetup.noSuggestedAssignments}</p>;
  }

  return (
    <div className="open-agenda-preview">
      <strong>{title}</strong>
      <div>
        {openAgendaTokenTypes.map((type: any) =>
          resourceCounters.map((resource) => {
            const houseId = assignments[type.id as ChroniclePolarity]?.[resource.id as ChronicleResourceId];

            return houseId ? (
              <span key={`${title}-${type.id}-${resource.id}`}>
                {type.label} {resource.label}: {getHouseName(houses, houseId)}
              </span>
            ) : null;
          }),
        )}
      </div>
    </div>
  );
}

function SnapshotLegacyDeltas({ deltas }: { deltas: Partial<Record<ChronicleResourceId, number>> }) {
  const hasDeltas = resourceCounters.some((resource) => Boolean(deltas[resource.id as ChronicleResourceId]));

  if (!hasDeltas) {
    return <span>{ko.app.nextGameSetup.lastLegacyNoMove}</span>;
  }

  return (
    <div className="open-agenda-preview">
      <strong>{ko.app.nextGameSetup.lastLegacyTitle}</strong>
      <div>
        {resourceCounters.map((resource) => {
          const delta = deltas[resource.id as ChronicleResourceId] || 0;

          return delta ? (
            <span key={resource.id}>
              {resource.label}: {ko.app.nextGameSetup.legacyNetMove(delta)}
            </span>
          ) : null;
        })}
      </div>
    </div>
  );
}
