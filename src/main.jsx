import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const phaseLabels = {
  discard: "무작위 폐기",
  choose: "아젠다 선택",
  complete: "선택 완료",
};

function App() {
  const [state, setState] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [playerInput, setPlayerInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const apiRequest = useCallback(async (options = {}) => {
    const response = await fetch("/api/agenda", {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.ok === false) {
      throw new Error(result.error || "요청을 처리하지 못했습니다.");
    }

    return result;
  }, []);

  const refresh = useCallback(async () => {
    if (busy) {
      return;
    }

    try {
      const result = await apiRequest();
      setAuthenticated(Boolean(result.authenticated));
      setState(result.state);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }, [apiRequest, busy]);

  const mutate = useCallback(
    async (payload) => {
      setBusy(true);

      try {
        const result = await apiRequest({
          method: "POST",
          body: JSON.stringify(payload),
        });

        setAuthenticated(Boolean(result.authenticated ?? authenticated));

        if (result.state) {
          setState(result.state);
        }

        setError("");
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setBusy(false);
      }
    },
    [apiRequest, authenticated],
  );

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 4000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const handleLogin = async (event) => {
    event.preventDefault();
    await mutate({ action: "login", player: playerInput.trim() });
    setPlayerInput("");
  };

  const handleLogout = async () => {
    await mutate({ action: "logout" });
    setAuthenticated(false);
    setState(null);
  };

  const handleReset = async () => {
    const code = window.prompt("초기화 코드를 입력하세요.");

    if (!code) {
      return;
    }

    await mutate({ action: "reset", code });
    setAuthenticated(false);
  };

  return (
    <main className="app-shell">
      <header className="topbar" aria-label="게임 헤더">
        <div>
          <p className="section-label">King's Dilemma</p>
          <h1>Secret Agenda 선택</h1>
        </div>
        <button className="ghost-button" type="button" onClick={handleReset} disabled={busy}>
          초기화
        </button>
      </header>

      {error ? <div className="error-box">{error}</div> : null}

      {!authenticated || !state ? (
        <LoginPanel
          busy={busy}
          playerInput={playerInput}
          setPlayerInput={setPlayerInput}
          onSubmit={handleLogin}
        />
      ) : (
        <GamePanel state={state} busy={busy} mutate={mutate} onLogout={handleLogout} />
      )}
    </main>
  );
}

function LoginPanel({ busy, playerInput, setPlayerInput, onSubmit }) {
  return (
    <section className="login-panel">
      <div>
        <h2>플레이어 입장</h2>
        <p>각 플레이어는 자기 번호인 1, 2, 3, 4, 5 중 하나를 입력해서 들어갑니다.</p>
      </div>
      <form className="login-form" onSubmit={onSubmit}>
        <label>
          플레이어 번호
          <input
            value={playerInput}
            onChange={(event) => setPlayerInput(event.target.value)}
            type="text"
            inputMode="numeric"
            pattern="[1-5]"
            maxLength={1}
            placeholder="1"
            autoComplete="off"
            required
          />
        </label>
        <button type="submit" disabled={busy}>
          입장
        </button>
      </form>
    </section>
  );
}

function GamePanel({ state, busy, mutate, onLogout }) {
  return (
    <section className="game-grid">
      <aside className="status-panel" aria-live="polite">
        <StatusItem label="내 플레이어" value={state.currentPlayer ? `Player ${state.currentPlayer}` : "-"} />
        <StatusItem label="현재 차례" value={`Player ${state.turn}`} />
        <StatusItem label="진행" value={phaseLabels[state.phase] || state.phase} />
        <StatusItem label="선택 완료" value={`${state.selectedCount} / 5`} />
        <p className="privacy-note">남은 아젠다 이름은 자기 차례가 오기 전까지 서버에서 내려오지 않습니다.</p>
        <button className="ghost-button wide" type="button" onClick={onLogout} disabled={busy}>
          나가기
        </button>
      </aside>

      <section className="play-panel">
        <GameMessage state={state} />
        <OwnChoice agenda={state.ownChoice} />
        <ActionPanel state={state} busy={busy} mutate={mutate} />
        <AgendaList agendas={state.availableAgendas || []} busy={busy} mutate={mutate} />
      </section>
    </section>
  );
}

function StatusItem({ label, value }) {
  return (
    <div className="status-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function GameMessage({ state }) {
  const text = useMemo(() => {
    if (state.phase === "complete") {
      return "모든 플레이어가 Secret Agenda를 선택했습니다. 각자 본인 아젠다만 계속 확인할 수 있습니다.";
    }

    if (state.canDiscard) {
      return "Player 1 차례입니다. 룰에 따라 6장 중 1장을 무작위로 버린 뒤 남은 5장 중 하나를 선택합니다.";
    }

    if (state.canChoose) {
      return `Player ${state.currentPlayer} 차례입니다. 아래 남은 아젠다 중 하나를 선택하세요.`;
    }

    if (state.ownChoice) {
      return "선택이 끝났습니다. 다른 플레이어 차례가 끝날 때까지 남은 아젠다 목록은 볼 수 없습니다.";
    }

    return `아직 Player ${state.currentPlayer}의 차례가 아닙니다. 현재 Player ${state.turn} 진행 중이며 남은 아젠다 목록은 숨겨져 있습니다.`;
  }, [state]);

  return <div className="message">{text}</div>;
}

function OwnChoice({ agenda }) {
  if (!agenda) {
    return null;
  }

  return (
    <div className="own-choice">
      <h3>내 Secret Agenda: {agenda.name}</h3>
      <p>{agenda.resourceGoal}</p>
      {agenda.note ? <p>{agenda.note}</p> : null}
    </div>
  );
}

function ActionPanel({ state, busy, mutate }) {
  if (!state.canDiscard) {
    return null;
  }

  return (
    <div className="action-card">
      <p>버려진 카드는 누구에게도 공개되지 않습니다.</p>
      <button type="button" onClick={() => mutate({ action: "discard" })} disabled={busy}>
        무작위 1장 버리기
      </button>
    </div>
  );
}

function AgendaList({ agendas, busy, mutate }) {
  if (!agendas.length) {
    return null;
  }

  return (
    <div className="agenda-list">
      {agendas.map((agenda) => (
        <AgendaCard key={agenda.id} agenda={agenda} busy={busy} mutate={mutate} />
      ))}
    </div>
  );
}

function AgendaCard({ agenda, busy, mutate }) {
  const choose = () => {
    const confirmed = window.confirm(`${agenda.name} 아젠다를 선택할까요? 선택 후 되돌릴 수 없습니다.`);

    if (confirmed) {
      mutate({ action: "choose", agendaId: agenda.id });
    }
  };

  return (
    <article className="agenda-card">
      <div>
        <h3>{agenda.name}</h3>
        <p>{agenda.resourceGoal}</p>
        {agenda.note ? <p>{agenda.note}</p> : null}
      </div>
      <ScoreBlock
        title="자원"
        rows={agenda.resourceScoring.map((item) => [item.label, `${item.vp} 승점`])}
      />
      <ScoreBlock
        title="재화 순위"
        rows={agenda.coinRanking.map((item) => [`${item.rank}위`, `${item.vp} 승점`])}
      />
      <button type="button" onClick={choose} disabled={busy}>
        선택
      </button>
    </article>
  );
}

function ScoreBlock({ title, rows }) {
  return (
    <div className="score-block">
      <div className="score-title">{title}</div>
      {rows.map(([label, value]) => (
        <div className="score-row" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

createRoot(document.querySelector("#root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
