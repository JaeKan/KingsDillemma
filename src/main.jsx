import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const phaseLabels = {
  discard: "무작위 폐기",
  choose: "아젠다 선택",
  complete: "선택 완료",
};

const playerNumbers = [1, 2, 3, 4, 5];
const defaultNamePattern = /^player\s*[1-5]$/i;
const unsavedExitMessage = "저장하지 않은 변경사항이 있습니다. 정말 창을 종료하겠습니까?";
const inventoryDraftPrefix = "kd-personal-inventory-draft:";
const inventoryCounters = [
  { id: "coins", label: "재화(코인)", max: 99 },
  { id: "powerTokens", label: "권력 토큰", max: 99 },
  { id: "prestige", label: "위신 점수", max: 99 },
  { id: "crave", label: "갈망 점수", max: 99 },
];
const resourceCounters = [
  { id: "influence", label: "영향력", max: 17 },
  { id: "wealth", label: "부", max: 17 },
  { id: "morale", label: "사기", max: 17 },
  { id: "welfare", label: "복지", max: 17 },
  { id: "knowledge", label: "지식", max: 17 },
];

function App() {
  const [state, setState] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [playerInput, setPlayerInput] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [seatPassword, setSeatPassword] = useState("");
  const [seatPasswordConfirm, setSeatPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasUnsavedInventoryChanges, setHasUnsavedInventoryChanges] = useState(false);
  const refreshInFlight = useRef(null);
  const mutationInFlight = useRef(false);

  const apiRequest = useCallback(async (options = {}) => {
    const { headers, ...requestOptions } = options;
    const requestHeaders = options.body ? { "Content-Type": "application/json", ...headers } : headers;
    const response = await fetch("/api/agenda", {
      credentials: "same-origin",
      ...requestOptions,
      ...(requestHeaders ? { headers: requestHeaders } : {}),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.ok === false) {
      throw new Error(result.error || "요청을 처리하지 못했습니다.");
    }

    return result;
  }, []);

  const refresh = useCallback(async () => {
    if (!refreshInFlight.current) {
      refreshInFlight.current = (async () => {
        try {
          const result = await apiRequest();
          setAuthenticated(Boolean(result.authenticated));
          setState(result.state);
          setError("");
          return result;
        } catch (requestError) {
          setError(requestError.message);
          return null;
        } finally {
          refreshInFlight.current = null;
        }
      })();
    }

    return refreshInFlight.current;
  }, [apiRequest]);

  const mutate = useCallback(
    async (payload) => {
      if (mutationInFlight.current) {
        return null;
      }

      mutationInFlight.current = true;
      setBusy(true);

      try {
        const result = await apiRequest({
          method: "POST",
          body: JSON.stringify(payload),
        });

        setAuthenticated((wasAuthenticated) => Boolean(result.authenticated ?? wasAuthenticated));

        if (result.state) {
          setState(result.state);
        }

        setError("");
        return result;
      } catch (requestError) {
        setError(requestError.message);
        return null;
      } finally {
        mutationInFlight.current = false;
        setBusy(false);
      }
    },
    [apiRequest],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!hasUnsavedInventoryChanges) {
      return undefined;
    }

    const warnBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = unsavedExitMessage;
      return unsavedExitMessage;
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasUnsavedInventoryChanges]);

  const confirmUnsavedExit = useCallback(() => {
    return !hasUnsavedInventoryChanges || window.confirm(unsavedExitMessage);
  }, [hasUnsavedInventoryChanges]);

  const handleLogin = async (event) => {
    event.preventDefault();
    const selectedSeat = state?.players?.find((seat) => String(seat.player) === playerInput);
    const needsDisplayName = Boolean(selectedSeat) && (!selectedSeat.hasPassword || !selectedSeat.hasCustomName);

    if (!selectedSeat?.hasPassword && seatPassword !== seatPasswordConfirm) {
      setError("새 좌석 비밀번호가 서로 다릅니다.");
      return;
    }

    if (needsDisplayName && !isCustomNameReady(displayName)) {
      setError("Player 1 같은 기본 이름 대신 사용할 이름을 입력하세요.");
      return;
    }

    const result = await mutate({
      action: "login",
      player: playerInput.trim(),
      password: seatPassword,
      displayName: needsDisplayName ? displayName.trim() : undefined,
    });

    if (result?.authenticated) {
      setPlayerInput("");
      setDisplayName("");
      setSeatPassword("");
      setSeatPasswordConfirm("");
    }
  };

  const handleLogout = async () => {
    if (!confirmUnsavedExit()) {
      return;
    }

    const result = await mutate({ action: "logout" });

    if (result) {
      setHasUnsavedInventoryChanges(false);
      setPlayerInput("");
      setDisplayName("");
      setSeatPassword("");
      setSeatPasswordConfirm("");
    }
  };

  const handleReset = async () => {
    if (!confirmUnsavedExit()) {
      return;
    }

    const code = window.prompt("초기화 코드를 입력하세요.");

    if (!code) {
      return;
    }

    const result = await mutate({ action: "reset", code });

    if (!result) {
      return;
    }

    setHasUnsavedInventoryChanges(false);
    setAuthenticated(false);
    setPlayerInput("");
    setDisplayName("");
    setSeatPassword("");
    setSeatPasswordConfirm("");
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

      {error ? <div className="error-box" role="alert">{error}</div> : null}

      {!authenticated || !state ? (
        <LoginPanel
          state={state}
          busy={busy}
          playerInput={playerInput}
          setPlayerInput={setPlayerInput}
          displayName={displayName}
          setDisplayName={setDisplayName}
          seatPassword={seatPassword}
          setSeatPassword={setSeatPassword}
          seatPasswordConfirm={seatPasswordConfirm}
          setSeatPasswordConfirm={setSeatPasswordConfirm}
          onSubmit={handleLogin}
        />
      ) : (
        <GamePanel
          state={state}
          busy={busy}
          mutate={mutate}
          onLogout={handleLogout}
          onRefresh={refresh}
          onDirtyChange={setHasUnsavedInventoryChanges}
        />
      )}
    </main>
  );
}

function LoginPanel({
  state,
  busy,
  playerInput,
  setPlayerInput,
  displayName,
  setDisplayName,
  seatPassword,
  setSeatPassword,
  seatPasswordConfirm,
  setSeatPasswordConfirm,
  onSubmit,
}) {
  const seats =
    state?.players?.length === playerNumbers.length
      ? state.players
      : playerNumbers.map((player) => ({
          player,
          hasSession: false,
          hasPassword: false,
          hasCustomName: false,
          name: `Player ${player}`,
          hasChosen: false,
          isCurrentTurn: false,
          isSelf: false,
        }));
  const selectedSeat = seats.find((seat) => String(seat.player) === playerInput);
  const needsDisplayName = Boolean(selectedSeat) && (!selectedSeat.hasPassword || !selectedSeat.hasCustomName);
  const passwordReady =
    Boolean(selectedSeat) &&
    seatPassword.length >= 4 &&
    (!needsDisplayName || isCustomNameReady(displayName)) &&
    (selectedSeat.hasPassword || seatPassword === seatPasswordConfirm);
  const selectSeat = (player) => {
    setPlayerInput(String(player));
    setDisplayName("");
    setSeatPassword("");
    setSeatPasswordConfirm("");
  };

  return (
    <section className="login-panel" aria-labelledby="login-title">
      <div className="login-copy">
        <p className="section-label">Council Seating</p>
        <h2 id="login-title">가문 좌석 선택</h2>
        <p>이번 회의에서 사용할 플레이어 좌석을 선택하세요.</p>
        <div className="login-state-strip" aria-label="현재 회의 상태">
          <span>좌석 보호</span>
          <strong>{selectedSeat ? getSeatName(selectedSeat) : "좌석을 고르세요"}</strong>
        </div>
      </div>
      <form className="login-form" onSubmit={onSubmit} aria-busy={busy}>
        <fieldset className="seat-fieldset">
          <legend>플레이어 좌석</legend>
          <div className="seat-grid">
            {seats.map((seat) => {
              const selected = playerInput === String(seat.player);

              return (
                <label className={`seat-option${selected ? " selected" : ""}`} key={seat.player}>
                  <input
                    checked={selected}
                    name="player"
                    onChange={() => selectSeat(seat.player)}
                    type="radio"
                    value={seat.player}
                  />
                  <span className="seat-main">{getSeatName(seat)}</span>
                  <span className={`seat-status ${getSeatTone(seat)}`}>{getSeatStatus(seat)}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <PasswordPanel
          selectedSeat={selectedSeat}
          needsDisplayName={needsDisplayName}
          displayName={displayName}
          setDisplayName={setDisplayName}
          seatPassword={seatPassword}
          setSeatPassword={setSeatPassword}
          seatPasswordConfirm={seatPasswordConfirm}
          setSeatPasswordConfirm={setSeatPasswordConfirm}
        />
        <button type="submit" disabled={busy || !passwordReady}>
          {busy ? "입장 중" : "좌석에 앉기"}
        </button>
      </form>
    </section>
  );
}

function PasswordPanel({
  selectedSeat,
  needsDisplayName,
  displayName,
  setDisplayName,
  seatPassword,
  setSeatPassword,
  seatPasswordConfirm,
  setSeatPasswordConfirm,
}) {
  if (!selectedSeat) {
    return <p className="password-hint">좌석을 선택하면 비밀번호 입력란이 열립니다.</p>;
  }

  if (selectedSeat.hasPassword) {
    return (
      <div className="password-panel">
        {needsDisplayName ? (
          <NameField displayName={displayName} setDisplayName={setDisplayName} />
        ) : null}
        <label>
          좌석 비밀번호
          <input
            value={seatPassword}
            onChange={(event) => setSeatPassword(event.target.value)}
            type="password"
            minLength={4}
            maxLength={64}
            autoComplete="current-password"
            required
          />
        </label>
      </div>
    );
  }

  return (
    <div className="password-panel">
      <NameField displayName={displayName} setDisplayName={setDisplayName} />
      <label>
        새 좌석 비밀번호
        <input
          value={seatPassword}
          onChange={(event) => setSeatPassword(event.target.value)}
          type="password"
          minLength={4}
          maxLength={64}
          autoComplete="new-password"
          required
        />
      </label>
      <label>
        비밀번호 확인
        <input
          value={seatPasswordConfirm}
          onChange={(event) => setSeatPasswordConfirm(event.target.value)}
          type="password"
          minLength={4}
          maxLength={64}
          autoComplete="new-password"
          required
        />
      </label>
    </div>
  );
}

function NameField({ displayName, setDisplayName }) {
  return (
    <label>
      사용할 이름
      <input
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        type="text"
        minLength={2}
        maxLength={24}
        autoComplete="nickname"
        placeholder="예: 라니스터"
        required
      />
    </label>
  );
}

function isCustomNameReady(name) {
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 24 && !defaultNamePattern.test(trimmed);
}

function getSeatName(seat) {
  return seat.name || `Player ${seat.player}`;
}

function getSeatStatus(seat) {
  if (seat.isSelf) {
    return "현재 접속";
  }

  if (seat.hasChosen) {
    return "선택 완료";
  }

  if (seat.hasPassword) {
    return "잠김";
  }

  return "설정 필요";
}

function getSeatTone(seat) {
  if (seat.hasChosen) {
    return "done";
  }

  if (seat.hasPassword) {
    return "locked";
  }

  return "idle";
}

function GamePanel({ state, busy, mutate, onLogout, onRefresh, onDirtyChange }) {
  const currentPlayerName = getPlayerName(state, state.currentPlayer);
  const turnName = getPlayerName(state, state.turn);

  return (
    <section className="game-grid">
      <aside className="status-panel" aria-live="polite">
        <StatusItem label="내 플레이어" value={currentPlayerName || "-"} />
        <StatusItem label="현재 차례" value={turnName} />
        <StatusItem label="진행" value={phaseLabels[state.phase] || state.phase} />
        <StatusItem label="선택 완료" value={`${state.selectedCount} / 5`} />
        <p className="privacy-note">남은 아젠다 이름은 자기 차례가 오기 전까지 서버에서 내려오지 않습니다.</p>
        <button className="ghost-button wide" type="button" onClick={onRefresh} disabled={busy}>
          상태 새로고침
        </button>
        <button className="ghost-button wide" type="button" onClick={onLogout} disabled={busy}>
          나가기
        </button>
      </aside>

      <section className="play-panel">
        <GameMessage state={state} />
        <PersonalInventoryPanel
          inventory={state.ownInventory}
          player={state.currentPlayer}
          busy={busy}
          mutate={mutate}
          onDirtyChange={onDirtyChange}
        />
        <OwnChoice agenda={state.ownChoice} />
        <ActionPanel state={state} busy={busy} mutate={mutate} />
        <AgendaList agendas={state.availableAgendas || []} busy={busy} mutate={mutate} />
      </section>
    </section>
  );
}

function getPlayerName(state, player) {
  if (!player) {
    return "";
  }

  return state.players?.find((seat) => seat.player === player)?.name || `Player ${player}`;
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
      return `${getPlayerName(state, 1)} 차례입니다. 룰에 따라 6장 중 1장을 무작위로 버린 뒤 남은 5장 중 하나를 선택합니다.`;
    }

    if (state.canChoose) {
      return `${getPlayerName(state, state.currentPlayer)} 차례입니다. 아래 남은 아젠다 중 하나를 선택하세요.`;
    }

    if (state.ownChoice) {
      return "선택이 끝났습니다. 다른 플레이어 차례가 끝날 때까지 남은 아젠다 목록은 볼 수 없습니다.";
    }

    return `아직 ${getPlayerName(state, state.currentPlayer)}의 차례가 아닙니다. 현재 ${getPlayerName(state, state.turn)} 진행 중이며 남은 아젠다 목록은 숨겨져 있습니다.`;
  }, [state]);

  return <div className="message">{text}</div>;
}

function PersonalInventoryPanel({ inventory, player, busy, mutate, onDirtyChange }) {
  const storageKey = player ? `${inventoryDraftPrefix}${player}` : "";
  const serverInventory = useMemo(() => normalizeInventory(inventory), [inventory]);
  const [draft, setDraft] = useState(serverInventory);
  const isDirty = useMemo(() => !inventoriesMatch(draft, serverInventory), [draft, serverInventory]);

  useEffect(() => {
    const storedDraft = storageKey ? readStoredInventoryDraft(storageKey) : null;
    setDraft(storedDraft && !inventoriesMatch(storedDraft, serverInventory) ? storedDraft : serverInventory);
  }, [storageKey]);

  useEffect(() => {
    if (!isDirty) {
      setDraft(serverInventory);
    }
  }, [isDirty, serverInventory]);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    return () => onDirtyChange(false);
  }, [onDirtyChange]);

  useEffect(() => {
    if (!storageKey) {
      return;
    }

    if (isDirty) {
      window.sessionStorage.setItem(storageKey, JSON.stringify(draft));
    } else {
      window.sessionStorage.removeItem(storageKey);
    }
  }, [draft, isDirty, storageKey]);

  const adjustCounter = (counter, delta) => {
    setDraft((current) => ({
      ...current,
      [counter.id]: clampCounter(current[counter.id] + delta, counter.max),
    }));
  };

  const adjustResource = (counter, delta) => {
    setDraft((current) => ({
      ...current,
      resources: {
        ...current.resources,
        [counter.id]: clampCounter(current.resources[counter.id] + delta, counter.max),
      },
    }));
  };

  const resetDraft = () => {
    if (isDirty && !window.confirm("저장하지 않은 개인 보유물 변경사항을 되돌릴까요?")) {
      return;
    }

    setDraft(serverInventory);
    if (storageKey) {
      window.sessionStorage.removeItem(storageKey);
    }
  };

  const saveDraft = async () => {
    const result = await mutate({ action: "saveInventory", inventory: draft });

    if (result && storageKey) {
      window.sessionStorage.removeItem(storageKey);
    }
  };

  return (
    <section className="inventory-panel" aria-labelledby="inventory-title">
      <div className="inventory-header">
        <div>
          <p className="section-label">Private Ledger</p>
          <h2 id="inventory-title">내 개인 보유물</h2>
        </div>
        {isDirty ? <span className="dirty-pill">저장 전</span> : <span className="saved-pill">저장됨</span>}
      </div>

      <div className="inventory-section">
        <h3>재화와 토큰</h3>
        <div className="inventory-grid">
          {inventoryCounters.map((counter) => (
            <CounterRow
              key={counter.id}
              label={counter.label}
              value={draft[counter.id]}
              max={counter.max}
              disabled={busy}
              onDecrease={() => adjustCounter(counter, -1)}
              onIncrease={() => adjustCounter(counter, 1)}
            />
          ))}
        </div>
      </div>

      <div className="inventory-section">
        <h3>자원 메모</h3>
        <div className="inventory-grid resource-grid">
          {resourceCounters.map((counter) => (
            <CounterRow
              key={counter.id}
              label={counter.label}
              value={draft.resources[counter.id]}
              max={counter.max}
              disabled={busy}
              onDecrease={() => adjustResource(counter, -1)}
              onIncrease={() => adjustResource(counter, 1)}
            />
          ))}
        </div>
      </div>

      <div className="inventory-actions">
        <span>{isDirty ? "저장 버튼을 눌러야 서버에 반영됩니다." : "마지막 저장값과 같습니다."}</span>
        <div>
          <button className="ghost-button" type="button" onClick={resetDraft} disabled={busy || !isDirty}>
            되돌리기
          </button>
          <button type="button" onClick={saveDraft} disabled={busy || !isDirty}>
            {busy ? "저장 중" : "일괄 저장"}
          </button>
        </div>
      </div>
    </section>
  );
}

function CounterRow({ label, value, max, disabled, onDecrease, onIncrease }) {
  return (
    <div className="counter-row">
      <span>{label}</span>
      <div className="counter-controls">
        <button
          className="stepper-button"
          type="button"
          aria-label={`${label} 내리기`}
          onClick={onDecrease}
          disabled={disabled || value <= 0}
        >
          ▼
        </button>
        <output aria-label={`${label} 현재 값`}>{value}</output>
        <button
          className="stepper-button"
          type="button"
          aria-label={`${label} 올리기`}
          onClick={onIncrease}
          disabled={disabled || value >= max}
        >
          ▲
        </button>
      </div>
    </div>
  );
}

function normalizeInventory(value) {
  const defaults = createDefaultInventory();
  const candidate = value && typeof value === "object" ? value : {};
  const resources = candidate.resources && typeof candidate.resources === "object" ? candidate.resources : {};

  return {
    coins: normalizeCounter(candidate.coins, 99, defaults.coins),
    powerTokens: normalizeCounter(candidate.powerTokens, 99, defaults.powerTokens),
    prestige: normalizeCounter(candidate.prestige, 99, defaults.prestige),
    crave: normalizeCounter(candidate.crave, 99, defaults.crave),
    resources: Object.fromEntries(
      resourceCounters.map((counter) => [
        counter.id,
        normalizeCounter(resources[counter.id], counter.max, defaults.resources[counter.id]),
      ]),
    ),
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : defaults.updatedAt,
  };
}

function createDefaultInventory() {
  return {
    coins: 10,
    powerTokens: 8,
    prestige: 0,
    crave: 0,
    resources: Object.fromEntries(resourceCounters.map((counter) => [counter.id, 0])),
    updatedAt: "",
  };
}

function normalizeCounter(value, max, fallback) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return clampCounter(value, max);
}

function clampCounter(value, max) {
  return Math.max(0, Math.min(max, Math.trunc(value)));
}

function inventoriesMatch(left, right) {
  return (
    inventoryCounters.every((counter) => left[counter.id] === right[counter.id]) &&
    resourceCounters.every((counter) => left.resources[counter.id] === right.resources[counter.id])
  );
}

function readStoredInventoryDraft(storageKey) {
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    return raw ? normalizeInventory(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
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
