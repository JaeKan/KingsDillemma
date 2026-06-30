import { TokenIcon } from "./GameIcons";
import { resourceCounters, sessionEndChecklistItems, ko } from "../resources/gameResources";

function formatSignedScore(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

type SessionEndCause = "king_death" | "abdication_top" | "abdication_bottom";

const sessionEndRewardTable: Record<
  SessionEndCause,
  { ranks: Record<number, { prestige: number; crave: number }>; last: { prestige: number; crave: number } }
> = {
  king_death: {
    ranks: {
      1: { prestige: 2, crave: 0 },
      2: { prestige: 2, crave: 0 },
      3: { prestige: 1, crave: 1 },
      4: { prestige: 1, crave: 1 },
    },
    last: { prestige: 0, crave: 2 },
  },
  abdication_top: {
    ranks: {
      1: { prestige: 3, crave: 0 },
      2: { prestige: 2, crave: 0 },
      3: { prestige: 1, crave: 0 },
      4: { prestige: 1, crave: 0 },
    },
    last: { prestige: 0, crave: 2 },
  },
  abdication_bottom: {
    ranks: {
      1: { prestige: 0, crave: 2 },
      2: { prestige: 0, crave: 1 },
      3: { prestige: 0, crave: 1 },
      4: { prestige: 0, crave: 1 },
    },
    last: { prestige: 2, crave: 0 },
  },
};

interface SessionEndDialogProps {
  boardComplete: boolean;
  boardDraft: Record<string, string>;
  busy: boolean;
  checks: Record<string, boolean>;
  endCause: string;
  rewardsApplied: boolean;
  scoring: any;
  scoringBusy: boolean;
  open: boolean;
  ready: boolean;
  onBoardChange: (resourceId: string, value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  onEndCauseChange: (cause: string) => void;
  onApplyRewards: () => void;
  onToggle: (itemId: string) => void;
}

function SessionEndDialog({
  boardComplete,
  boardDraft,
  busy,
  checks,
  endCause,
  rewardsApplied,
  scoring,
  scoringBusy,
  open,
  ready,
  onBoardChange,
  onCancel,
  onConfirm,
  onEndCauseChange,
  onApplyRewards,
  onToggle,
}: SessionEndDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="session-end-overlay" role="presentation">
      <section
        className="session-end-dialog"
        aria-labelledby="session-end-title"
        aria-modal="true"
        role="dialog"
      >
        <div className="session-end-heading">
          <span className="session-end-seal" aria-hidden="true">
            <TokenIcon type="seal" />
          </span>
          <div>
            <p className="section-label">{ko.sessionEnd.sectionLabel}</p>
            <h2 id="session-end-title">{ko.sessionEnd.title}</h2>
          </div>
        </div>
        <p className="session-end-copy">{ko.sessionEnd.copy}</p>
        <SessionScorePanel
          boardComplete={boardComplete}
          boardDraft={boardDraft}
          scoring={scoring}
          scoringBusy={scoringBusy}
          onBoardChange={onBoardChange}
        />
        <SessionRewardPanel
          busy={busy}
          endCause={endCause}
          rewardsApplied={rewardsApplied}
          scoring={scoring}
          scoringBusy={scoringBusy}
          onApplyRewards={onApplyRewards}
          onEndCauseChange={onEndCauseChange}
        />
        <div className="session-end-checklist">
          {sessionEndChecklistItems.map((item) => (
            <label className="session-end-check" key={item.id}>
              <input
                type="checkbox"
                checked={Boolean(checks[item.id])}
                onChange={() => onToggle(item.id)}
                disabled={busy || (item.id === "scores" && !scoring)}
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
        <div className="session-end-actions">
          <button className="ghost-button" type="button" onClick={onCancel} disabled={busy}>
            {ko.common.cancel}
          </button>
          <button className="primary-button" type="button" onClick={onConfirm} disabled={busy || !ready}>
            <TokenIcon type="seal" />
            {ko.sessionEnd.endSession}
          </button>
        </div>
      </section>
    </div>
  );
}

interface SessionRewardPanelProps {
  busy: boolean;
  endCause: string;
  rewardsApplied: boolean;
  scoring: any;
  scoringBusy: boolean;
  onApplyRewards: () => void;
  onEndCauseChange: (cause: string) => void;
}

function SessionRewardPanel({
  busy,
  endCause,
  rewardsApplied,
  scoring,
  scoringBusy,
  onApplyRewards,
  onEndCauseChange,
}: SessionRewardPanelProps) {
  const cause = isSessionEndCause(endCause) ? endCause : "";
  const canApply = Boolean(cause && scoring?.rows?.length && !scoringBusy && !rewardsApplied);

  return (
    <section className="session-score-panel session-reward-panel" aria-labelledby="session-reward-title">
      <div className="session-score-heading">
        <div>
          <p className="section-label">{ko.sessionEnd.causeTitle}</p>
          <h3 id="session-reward-title">{ko.sessionEnd.rewardTitle}</h3>
        </div>
        <span>{rewardsApplied ? ko.sessionEnd.rewardsApplied : ko.sessionEnd.rewardApply}</span>
      </div>
      <p className="session-score-status">{ko.sessionEnd.causeHelp}</p>
      <div className="session-end-cause-grid">
        {[
          ["king_death", ko.sessionEnd.causeKingDeath],
          ["abdication_top", ko.sessionEnd.causeAbdicationTop],
          ["abdication_bottom", ko.sessionEnd.causeAbdicationBottom],
        ].map(([id, label]) => (
          <label className="session-end-cause-option" key={id}>
            <input
              type="radio"
              name="session-end-cause"
              value={id}
              checked={endCause === id}
              onChange={() => onEndCauseChange(id)}
              disabled={busy || rewardsApplied}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <SessionRewardSummary cause={cause} scoring={scoring} scoringBusy={scoringBusy} />
      <p className="session-score-status">{ko.sessionEnd.rewardHelp}</p>
      <button className="primary-button compact" type="button" onClick={onApplyRewards} disabled={busy || !canApply}>
        <TokenIcon type="seal" />
        {rewardsApplied ? ko.sessionEnd.rewardsApplied : ko.sessionEnd.rewardApply}
      </button>
    </section>
  );
}

function SessionRewardSummary({ cause, scoring, scoringBusy }: { cause: SessionEndCause | ""; scoring: any; scoringBusy: boolean }) {
  if (!cause) {
    return <p className="session-score-status">{ko.sessionEnd.rewardNeedCause}</p>;
  }

  if (scoringBusy || !scoring?.rows?.length) {
    return <p className="session-score-status">{ko.sessionEnd.rewardNeedScore}</p>;
  }

  const lastRank = Math.max(...scoring.rows.map((row: any) => row.ranks.total));

  return (
    <div className="final-score-table-wrap" aria-live="polite">
      <table className="final-score-table">
        <thead>
          <tr>
            <th scope="col">{ko.sessionEnd.tableHouse}</th>
            <th scope="col">{ko.sessionEnd.tableRank}</th>
            <th scope="col">{ko.sessionEnd.tableReward}</th>
          </tr>
        </thead>
        <tbody>
          {scoring.rows.map((row: any) => {
            const reward = getSessionEndReward(cause, row.ranks.total, row.ranks.total === lastRank);
            return (
              <tr key={row.houseId}>
                <th scope="row">{row.houseName}</th>
                <td>{row.ranks.total}{ko.sessionEnd.rankSuffix}</td>
                <td>{ko.sessionEnd.rewardCell(reward.prestige, reward.crave)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function isSessionEndCause(value: string): value is SessionEndCause {
  return value === "king_death" || value === "abdication_top" || value === "abdication_bottom";
}

function getSessionEndReward(cause: SessionEndCause, rank: number, isLast: boolean) {
  const rewards = sessionEndRewardTable[cause];
  return isLast ? rewards.last : rewards.ranks[rank] || { prestige: 0, crave: 0 };
}

interface SessionScorePanelProps {
  boardComplete: boolean;
  boardDraft: Record<string, string>;
  scoring: any;
  scoringBusy: boolean;
  onBoardChange: (resourceId: string, value: string) => void;
}

function SessionScorePanel({ boardComplete, boardDraft, scoring, scoringBusy, onBoardChange }: SessionScorePanelProps) {
  const status = !boardComplete
    ? ko.sessionEnd.statusEnterPositions
    : scoringBusy
      ? ko.sessionEnd.statusCalculating
      : scoring
        ? ko.sessionEnd.statusDone
        : ko.sessionEnd.statusWaiting;

  return (
    <section className="session-score-panel" aria-labelledby="session-score-title">
      <div className="session-score-heading">
        <div>
          <p className="section-label">{ko.sessionEnd.scoreSection}</p>
          <h3 id="session-score-title">{ko.sessionEnd.boardTitle}</h3>
        </div>
        <span>{status}</span>
      </div>
      <div className="session-board-grid">
        {resourceCounters.map((resource) => (
          <label className={`board-position-field tone-${resource.tone}`} key={resource.id}>
            <span>
              <TokenIcon type={resource.icon as any} />
              {resource.label}
            </span>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              max="17"
              value={boardDraft[resource.id]}
              onChange={(event) => onBoardChange(resource.id, event.target.value)}
              aria-label={`${resource.label} ${ko.sessionEnd.boardFieldSuffix}`}
              placeholder={ko.sessionEnd.placeholderBoard}
            />
          </label>
        ))}
      </div>
      <FinalScoreSummary boardComplete={boardComplete} scoring={scoring} scoringBusy={scoringBusy} />
    </section>
  );
}

interface FinalScoreSummaryProps {
  boardComplete: boolean;
  scoring: any;
  scoringBusy: boolean;
}

function FinalScoreSummary({ boardComplete, scoring, scoringBusy }: FinalScoreSummaryProps) {
  if (!boardComplete) {
    return <p className="session-score-status">{ko.sessionEnd.scoreHintIncomplete}</p>;
  }

  if (scoringBusy) {
    return <p className="session-score-status">{ko.sessionEnd.scoreHintBusy}</p>;
  }

  if (!scoring?.rows?.length) {
    return <p className="session-score-status">{ko.sessionEnd.scoreHintEmpty}</p>;
  }

  return (
    <div className="final-score-table-wrap" aria-live="polite">
      <table className="final-score-table">
        <thead>
          <tr>
            <th scope="col">{ko.sessionEnd.tableHouse}</th>
            <th scope="col">{ko.sessionEnd.tableSecret}</th>
            <th scope="col">{ko.sessionEnd.tableOpen}</th>
            <th scope="col">{ko.sessionEnd.tableCoin}</th>
            <th scope="col">{ko.sessionEnd.tablePower}</th>
            <th scope="col">{ko.sessionEnd.tableTotal}</th>
            <th scope="col">{ko.sessionEnd.tableRank}</th>
          </tr>
        </thead>
        <tbody>
          {scoring.rows.map((row: any) => (
            <tr key={row.houseId}>
              <th scope="row">{row.houseName}</th>
              <td>{formatSignedScore(row.scores.resourceGoal)}</td>
              <td>{formatSignedScore(row.scores.openAgenda)}</td>
              <td>{formatSignedScore(row.scores.moneyRanking)}</td>
              <td>{formatSignedScore(row.scores.powerMajority)}</td>
              <td>{row.scores.total}</td>
              <td>{row.ranks.total}{ko.sessionEnd.rankSuffix}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default SessionEndDialog;
