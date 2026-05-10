import { TokenIcon } from "./GameIcons";
import { resourceCounters, sessionEndChecklistItems, ko } from "../resources/gameResources";

function formatSignedScore(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

interface SessionEndDialogProps {
  boardComplete: boolean;
  boardDraft: Record<string, string>;
  busy: boolean;
  checks: Record<string, boolean>;
  scoring: any;
  scoringBusy: boolean;
  open: boolean;
  ready: boolean;
  onBoardChange: (resourceId: string, value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  onToggle: (itemId: string) => void;
}

function SessionEndDialog({
  boardComplete,
  boardDraft,
  busy,
  checks,
  scoring,
  scoringBusy,
  open,
  ready,
  onBoardChange,
  onCancel,
  onConfirm,
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
