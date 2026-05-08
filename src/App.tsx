import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { closestCenter, DndContext, DragOverlay, KeyboardSensor, PointerSensor, useDraggable, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { HOUSE_CATALOG, REQUIRED_HOUSE_COUNT } from "../shared/houses.mjs";
import { agendaRequest, useAgendaMutations, useAgendaRefresh, useAgendaStateQuery } from "./app/agendaClient";
import { Carrot as shakeCarrot } from "./Carrot";
import { AchievementEffectOptionIcon, HouseIcon, SpecialAbilityLegendIcon, TokenIcon } from "./components/GameIcons";
import {
  achievementDetailTextMaxLength,
  achievementEffectAmountMax,
  achievementEffectAmountOptionIds,
  achievementEffectEntryMax,
  achievementEffectOptionById,
  achievementEffectOptions,
  achievementEffectSelectableOptions,
  agendaScoringZones,
  alignmentRewardCountMax,
  alignmentRewardTypeLabels,
  alignmentRewardTypes,
  bgmMutedStorageKey,
  bgmSource,
  bgmVolumeStorageKey,
  boardRows,
  defaultBgmVolume,
  defaultHouseAlignmentOrder,
  defaultNamePattern,
  dilemmaOutcomeLabels,
  dilemmaPhotoAllowedTypes,
  dilemmaPhotoLimit,
  dilemmaPhotoMaxDataUrlLength,
  dilemmaPhotoMaxDimension,
  dilemmaPhotoMaxInputBytes,
  dilemmaPhotoQuality,
  dilemmaResourceDeltaLimit,
  houseAchievementMarkMax,
  houseAchievementRows,
  houseAlignmentLabelById,
  houseAlignmentMarkMax,
  houseAlignmentRows,
  inventoryCounterMax,
  inventoryCounters,
  ledgerAutosaveDelayMs,
  ledgerAutosaveRetryDelayMs,
  openAgendaTokenLimit,
  openAgendaTokenTypes,
  phaseCopy,
  phaseLabels,
  resourceCounters,
  rulebookPdfUrl,
  scoreTrackCounters,
  sessionEndChecklistItems,
  sessionEndUnavailableMessage,
  sharedBoardSheetUrl,
  specialAbilityLegendImageUrl,
  specialAbilityLegendRows,
  tokenCounters,
  valueMentionAmountMax,
  valueMentionItems,
} from "./resources/gameResources";

function createFinalBoardDraft() {
  return Object.fromEntries(resourceCounters.map((resource) => [resource.id, ""]));
}

function createSessionEndChecklistState() {
  return Object.fromEntries(sessionEndChecklistItems.map((item) => [item.id, false]));
}

function clampBgmVolume(value) {
  const volume = Number(value);
  return Number.isFinite(volume) ? Math.min(Math.max(volume, 0), 1) : defaultBgmVolume;
}

function readStoredBgmMuted() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(bgmMutedStorageKey) === "true";
  } catch {
    return false;
  }
}

function readStoredBgmVolume() {
  if (typeof window === "undefined") {
    return defaultBgmVolume;
  }

  try {
    const storedVolume = window.localStorage.getItem(bgmVolumeStorageKey);
    return storedVolume === null ? defaultBgmVolume : clampBgmVolume(storedVolume);
  } catch {
    return defaultBgmVolume;
  }
}

function writeStoredBgmMuted(muted) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(bgmMutedStorageKey, muted ? "true" : "false");
  } catch {
    // Ignore storage failures; audio state still works for the current page.
  }
}

function writeStoredBgmVolume(volume) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(bgmVolumeStorageKey, String(clampBgmVolume(volume)));
  } catch {
    // Ignore storage failures; audio state still works for the current page.
  }
}

function App() {
  const [houseInput, setHouseInput] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [seatPassword, setSeatPassword] = useState("");
  const [seatPasswordConfirm, setSeatPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [sessionEndDialogOpen, setSessionEndDialogOpen] = useState(false);
  const [sessionEndChecklist, setSessionEndChecklist] = useState(createSessionEndChecklistState);
  const [finalBoardDraft, setFinalBoardDraft] = useState(createFinalBoardDraft);
  const [finalScoring, setFinalScoring] = useState(null);
  const [finalScoringBusy, setFinalScoringBusy] = useState(false);
  const [scoreGuideOpen, setScoreGuideOpen] = useState(false);
  const [secretAgendaGuideOpen, setSecretAgendaGuideOpen] = useState(false);
  const [dilemmaHistoryOpen, setDilemmaHistoryOpen] = useState(false);
  const [voteOrderDialogOpen, setVoteOrderDialogOpen] = useState(false);
  const [bgmMuted, setBgmMuted] = useState(readStoredBgmMuted);
  const [bgmVolume, setBgmVolume] = useState(readStoredBgmVolume);
  const finalScoringRequest = useRef(0);
  const bgmAudioRef = useRef(null);
  const settingsToggleRef = useRef(null);
  const tipsToggleRef = useRef(null);
  const dilemmaHistoryToggleRef = useRef(null);
  const voteOrderToggleRef = useRef(null);
  const secretAgendaGuideToggleRef = useRef(null);
  const finalBoardComplete = useMemo(() => isFinalBoardDraftComplete(finalBoardDraft), [finalBoardDraft]);
  const sessionEndChecklistComplete = useMemo(
    () => sessionEndChecklistItems.every((item) => sessionEndChecklist[item.id]),
    [sessionEndChecklist],
  );
  const agendaQuery = useAgendaStateQuery(setError);
  const { busy, mutate, mutationInFlight } = useAgendaMutations(setError);
  const refresh = useAgendaRefresh(setError, mutationInFlight);
  const apiRequest = useCallback((options = {}) => agendaRequest(options), []);
  const state = agendaQuery.data?.state ?? null;
  const authenticated = Boolean(agendaQuery.data?.authenticated);
  const realtimeEnabled = Boolean(agendaQuery.data?.realtimeEnabled);
  const sessionStatus = agendaQuery.isPending ? "checking" : "ready";

  useEffect(() => {
    if (
      !realtimeEnabled ||
      !authenticated ||
      sessionStatus === "checking" ||
      sessionEndDialogOpen
    ) {
      return undefined;
    }

    const refreshIfVisible = () => {
      if (document.visibilityState !== "visible" || mutationInFlight.current) {
        return;
      }

      void refresh();
    };

    const events = new EventSource("/api/agenda/events");
    events.addEventListener("connected", refreshIfVisible);
    events.addEventListener("state", refreshIfVisible);
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      events.close();
      events.removeEventListener("connected", refreshIfVisible);
      events.removeEventListener("state", refreshIfVisible);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [authenticated, realtimeEnabled, refresh, sessionEndDialogOpen, sessionStatus]);

  useEffect(() => {
    const audio = bgmAudioRef.current;

    if (!audio) {
      return undefined;
    }

    audio.loop = true;
    audio.muted = bgmMuted;
    audio.volume = bgmVolume;
    writeStoredBgmMuted(bgmMuted);
    writeStoredBgmVolume(bgmVolume);

    if (bgmMuted) {
      audio.pause();
    }
  }, [bgmMuted, bgmVolume]);

  useEffect(() => {
    const audio = bgmAudioRef.current;

    if (!audio || bgmMuted) {
      return undefined;
    }

    let active = true;
    const removeInteractionListeners = () => {
      window.removeEventListener("pointerdown", playAfterInteraction);
      window.removeEventListener("keydown", playAfterInteraction);
    };
    const playBgm = () => {
      if (!active || audio.muted) {
        return;
      }

      void audio.play().then(removeInteractionListeners).catch(() => undefined);
    };
    const playAfterInteraction = () => {
      removeInteractionListeners();
      playBgm();
    };

    window.addEventListener("pointerdown", playAfterInteraction);
    window.addEventListener("keydown", playAfterInteraction);
    playBgm();

    return () => {
      active = false;
      removeInteractionListeners();
    };
  }, [bgmMuted]);

  useEffect(() => {
    if (!sessionEndDialogOpen || !finalBoardComplete) {
      finalScoringRequest.current += 1;
      setFinalScoring(null);
      setFinalScoringBusy(false);
      setSessionEndChecklist((current) => (current.scores ? { ...current, scores: false } : current));
      return undefined;
    }

    const requestId = finalScoringRequest.current + 1;
    finalScoringRequest.current = requestId;
    const timer = window.setTimeout(async () => {
      setFinalScoringBusy(true);

      try {
        const result = await apiRequest({
          method: "POST",
          body: JSON.stringify({
            action: "calculateFinalScores",
            board: createFinalBoardPayload(finalBoardDraft),
          }),
        });

        if (finalScoringRequest.current === requestId) {
          setFinalScoring(result.scoring || null);
          setError("");
        }
      } catch (requestError) {
        if (finalScoringRequest.current === requestId) {
          setFinalScoring(null);
          setSessionEndChecklist((current) => (current.scores ? { ...current, scores: false } : current));
          setError(requestError.message);
        }
      } finally {
        if (finalScoringRequest.current === requestId) {
          setFinalScoringBusy(false);
        }
      }
    }, 260);

    return () => window.clearTimeout(timer);
  }, [apiRequest, finalBoardComplete, finalBoardDraft, sessionEndDialogOpen]);

  const handleLogin = async (event) => {
    event.preventDefault();
    const selectedHouse = getHouses(state).find((house) => house.id === houseInput);
    const needsDisplayName = Boolean(selectedHouse) && (!selectedHouse.hasPassword || !selectedHouse.hasCustomName);

    if (!selectedHouse?.hasPassword && seatPassword !== seatPasswordConfirm) {
      setError("가문 비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    if (needsDisplayName && !isCustomNameReady(displayName)) {
      setError("Player 1 같은 기본 이름 대신 사용할 가문 표시명을 입력하세요.");
      return;
    }

    const result = await mutate({
      action: "login",
      houseId: houseInput,
      password: seatPassword,
      displayName: needsDisplayName ? displayName.trim() : undefined,
    });

    if (result?.authenticated) {
      setHouseInput("");
      setDisplayName("");
      setSeatPassword("");
      setSeatPasswordConfirm("");
    }
  };

  const handleLogout = async () => {
    const result = await mutate({ action: "logout" });

    if (result) {
      setHouseInput("");
      setDisplayName("");
      setSeatPassword("");
      setSeatPasswordConfirm("");
    }
  };

  const handleReset = async () => {
    const code = window.prompt("초기화 코드를 입력하세요.");

    if (!code) {
      return;
    }

    const result = await mutate({ action: "reset", code });

    if (!result) {
      return;
    }

    setHouseInput("");
    setDisplayName("");
    setSeatPassword("");
    setSeatPasswordConfirm("");
  };

  const handleEndSession = () => {
    if (state?.phase !== "complete") {
      setError(sessionEndUnavailableMessage);
      return;
    }

    setSessionEndChecklist(createSessionEndChecklistState());
    setFinalBoardDraft(createFinalBoardDraft());
    setFinalScoring(null);
    setFinalScoringBusy(false);
    setSessionEndDialogOpen(true);
  };

  const handleFinalBoardChange = (resourceId, value) => {
    setFinalBoardDraft((current) => ({
      ...current,
      [resourceId]: normalizeFinalBoardInput(value),
    }));
    setFinalScoring(null);
    setSessionEndChecklist((current) => (current.scores ? { ...current, scores: false } : current));
  };

  const handleToggleSessionEndCheck = (itemId) => {
    if (itemId === "scores" && !finalScoring) {
      return;
    }

    setSessionEndChecklist((current) => ({
      ...current,
      [itemId]: !current[itemId],
    }));
  };

  const handleCancelSessionEnd = () => {
    setSessionEndDialogOpen(false);
  };

  const handleConfirmSessionEnd = async () => {
    if (!sessionEndChecklistComplete) {
      setError("회기 종료 전 확인 항목을 모두 체크하세요.");
      return;
    }

    const result = await mutate({ action: "endSession" });

    if (!result) {
      return;
    }

    setHouseInput("");
    setDisplayName("");
    setSeatPassword("");
    setSeatPasswordConfirm("");
    setSessionEndDialogOpen(false);
  };

  const handleSettingsReset = async () => {
    setSettingsOpen(false);
    await handleReset();
  };

  const handleSettingsLogout = async () => {
    setSettingsOpen(false);
    await handleLogout();
  };

  const handleSettingsEndSession = async () => {
    setSettingsOpen(false);
    await handleEndSession();
  };

  const handleToggleSettings = useCallback(() => {
    setTipsOpen(false);
    setSettingsOpen((current) => !current);
  }, []);

  const handleToggleTips = useCallback(() => {
    setSettingsOpen(false);
    setTipsOpen((current) => !current);
  }, []);

  const handleOpenDilemmaHistory = useCallback(() => {
    setSettingsOpen(false);
    setTipsOpen(false);
    setDilemmaHistoryOpen(true);
  }, []);

  const handleCloseDilemmaHistory = useCallback(() => {
    setDilemmaHistoryOpen(false);
  }, []);

  const handleOpenVoteOrderDialog = useCallback((event) => {
    setSettingsOpen(false);
    setTipsOpen(false);
    if (event?.currentTarget) {
      voteOrderToggleRef.current = event.currentTarget;
    }
    setVoteOrderDialogOpen(true);
  }, []);

  const handleCloseVoteOrderDialog = useCallback(() => {
    setVoteOrderDialogOpen(false);
  }, []);

  const handleSaveVoteOrder = useCallback(
    async ({ voteOrder }) => await mutate({ action: "saveDilemmaVoteOrder", voteOrder }),
    [mutate],
  );

  const handleDeleteDilemmaHistory = useCallback(
    async (historyId) => {
      if (!historyId) {
        return null;
      }

      return await mutate({ action: "deleteDilemmaHistory", historyId });
    },
    [mutate],
  );

  const handleOpenScoreGuide = useCallback(() => {
    setSettingsOpen(false);
    setTipsOpen(false);
    setScoreGuideOpen(true);
  }, []);

  const handleCloseScoreGuide = useCallback(() => {
    setScoreGuideOpen(false);
  }, []);

  const handleOpenSecretAgendaGuide = useCallback((event) => {
    setSettingsOpen(false);
    setTipsOpen(false);
    if (event?.currentTarget) {
      secretAgendaGuideToggleRef.current = event.currentTarget;
    }
    setSecretAgendaGuideOpen(true);
  }, []);

  const handleCloseSecretAgendaGuide = useCallback(() => {
    setSecretAgendaGuideOpen(false);
  }, []);

  const handleToggleBgmMuted = useCallback(() => {
    const nextMuted = !bgmMuted;
    const audio = bgmAudioRef.current;
    const nextVolume = !nextMuted && bgmVolume === 0 ? defaultBgmVolume : bgmVolume;

    setBgmMuted(nextMuted);
    setBgmVolume(nextVolume);

    if (!audio) {
      return;
    }

    audio.muted = nextMuted;
    audio.volume = nextVolume;

    if (nextMuted) {
      audio.pause();
      return;
    }

    void audio.play().catch(() => undefined);
  }, [bgmMuted, bgmVolume]);

  const handleBgmVolumeChange = useCallback((event) => {
    const nextVolume = clampBgmVolume(event.target.valueAsNumber / 100);
    const nextMuted = nextVolume === 0;
    const audio = bgmAudioRef.current;

    setBgmVolume(nextVolume);
    setBgmMuted(nextMuted);

    if (!audio) {
      return;
    }

    audio.volume = nextVolume;
    audio.muted = nextMuted;

    if (nextMuted) {
      audio.pause();
      return;
    }

    void audio.play().catch(() => undefined);
  }, []);

  const handleToggleRandomDiscard = useCallback(() => {
    if (!state) {
      return;
    }

    void mutate({
      action: "setRandomDiscardEnabled",
      enabled: !(state.randomDiscardEnabled ?? true),
    });
  }, [mutate, state]);

  const sessionChecking = sessionStatus === "checking";
  const isCouncilRoute = Boolean(authenticated && state);
  const voteOrderLocked = Boolean(state && isVoteOrderSettingLocked(state));
  const canEditVoteOrder = Boolean(authenticated && state && getVoteOrderHouses(state).length > 0 && !voteOrderLocked);
  const routeClass = sessionChecking ? "is-session-checking" : isCouncilRoute ? "is-council" : "is-entry";

  return (
    <main className={`app-shell ${routeClass}`}>
      <DecorativeBackdrop />
      <audio ref={bgmAudioRef} src={bgmSource} loop preload="auto" aria-hidden="true" />
      <header className="app-header" aria-label="게임 헤더">
        <BrandLockup />
      </header>
      {!sessionChecking ? (
        <FloatingSettings
          authenticated={authenticated}
          bgmMuted={bgmMuted}
          bgmVolume={bgmVolume}
          busy={busy}
          canEndSession={Boolean(authenticated && state?.phase === "complete")}
          canEditVoteOrder={canEditVoteOrder}
          canToggleRandomDiscard={Boolean(
            authenticated &&
              state &&
              (state.phase === "house-select" ||
                (state.phase === "discard" && !state.discardedHiddenCount && !state.selectedCount)),
          )}
          open={settingsOpen}
          historyCount={state?.dilemmaHistory?.length || 0}
          randomDiscardEnabled={state?.randomDiscardEnabled ?? true}
          tipsOpen={tipsOpen}
          onEndSession={handleSettingsEndSession}
          onLogout={handleSettingsLogout}
          onOpenDilemmaHistory={handleOpenDilemmaHistory}
          onOpenVoteOrderDialog={handleOpenVoteOrderDialog}
          onOpenScoreGuide={handleOpenScoreGuide}
          onReset={handleSettingsReset}
          onBgmVolumeChange={handleBgmVolumeChange}
          onToggleRandomDiscard={handleToggleRandomDiscard}
          onToggleBgmMuted={handleToggleBgmMuted}
          onToggle={handleToggleSettings}
          onToggleTips={handleToggleTips}
          historyToggleRef={dilemmaHistoryToggleRef}
          voteOrderToggleRef={voteOrderToggleRef}
          tipsToggleRef={tipsToggleRef}
          toggleRef={settingsToggleRef}
          voteOrderLocked={voteOrderLocked}
        />
      ) : null}

      {error ? (
        <div className="error-box" role="alert">
          <TokenIcon type="warning" />
          <span>{error}</span>
        </div>
      ) : null}

      {sessionChecking ? (
        <SessionCheckPanel />
      ) : !isCouncilRoute ? (
        <LoginPanel
          state={state}
          busy={busy}
          houseInput={houseInput}
          setHouseInput={setHouseInput}
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
          onOpenSecretAgendaGuide={handleOpenSecretAgendaGuide}
        />
      )}
      <SessionEndDialog
        boardComplete={finalBoardComplete}
        boardDraft={finalBoardDraft}
        busy={busy}
        checks={sessionEndChecklist}
        scoring={finalScoring}
        scoringBusy={finalScoringBusy}
        open={sessionEndDialogOpen}
        ready={sessionEndChecklistComplete}
        onBoardChange={handleFinalBoardChange}
        onCancel={handleCancelSessionEnd}
        onConfirm={handleConfirmSessionEnd}
        onToggle={handleToggleSessionEndCheck}
      />
      <ScoreGuideDialog open={scoreGuideOpen} onClose={handleCloseScoreGuide} restoreFocusRef={tipsToggleRef} />
      <SecretAgendaScoreDialog
        open={secretAgendaGuideOpen}
        onClose={handleCloseSecretAgendaGuide}
        restoreFocusRef={secretAgendaGuideToggleRef}
      />
      <DilemmaHistoryDialog
        busy={busy}
        currentHouseId={state?.currentHouseId || null}
        history={state?.dilemmaHistory || []}
        open={dilemmaHistoryOpen}
        onClose={handleCloseDilemmaHistory}
        onDelete={handleDeleteDilemmaHistory}
        restoreFocusRef={dilemmaHistoryToggleRef}
      />
      <VoteOrderDialog
        busy={busy}
        open={voteOrderDialogOpen}
        state={state}
        onClose={handleCloseVoteOrderDialog}
        onSave={handleSaveVoteOrder}
        restoreFocusRef={voteOrderToggleRef}
      />
    </main>
  );
}

function SessionCheckPanel() {
  return (
    <section className="session-check-panel" aria-busy="true" aria-live="polite">
      <div className="session-check-seal" aria-hidden="true">
        <TokenIcon type="key" />
      </div>
      <div>
        <p className="section-label">세션 확인</p>
        <h2>의회 출입 기록을 확인 중입니다.</h2>
        <p>잠시 후 현재 가문의 의회 화면 또는 가문 선택 화면으로 이동합니다.</p>
      </div>
    </section>
  );
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
}) {
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
            <p className="section-label">회기 종료 확인</p>
            <h2 id="session-end-title">다음 비밀 의제 드래프트 준비</h2>
          </div>
        </div>
        <p className="session-end-copy">
          공용 보드의 최종 위치를 기준으로 비밀 의제, 공개 의제, 코인 순위, 권력 보너스를 계산합니다. 회기 종료는
          다음 비밀 의제 드래프트만 준비하며 코인/권력/공개 의제 표시는 자동으로 초기화하지 않습니다.
        </p>
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
            취소
          </button>
          <button className="primary-button" type="button" onClick={onConfirm} disabled={busy || !ready}>
            <TokenIcon type="seal" />
            회기 종료
          </button>
        </div>
      </section>
    </div>
  );
}

function SessionScorePanel({ boardComplete, boardDraft, scoring, scoringBusy, onBoardChange }) {
  const status = !boardComplete ? "위치 입력" : scoringBusy ? "계산 중" : scoring ? "계산 완료" : "계산 대기";

  return (
    <section className="session-score-panel" aria-labelledby="session-score-title">
      <div className="session-score-heading">
        <div>
          <p className="section-label">점수 계산</p>
          <h3 id="session-score-title">공용 보드 최종 위치</h3>
        </div>
        <span>{status}</span>
      </div>
      <div className="session-board-grid">
        {resourceCounters.map((resource) => (
          <label className={`board-position-field tone-${resource.tone}`} key={resource.id}>
            <span>
              <TokenIcon type={resource.icon} />
              {resource.label}
            </span>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              max="17"
              value={boardDraft[resource.id]}
              onChange={(event) => onBoardChange(resource.id, event.target.value)}
              aria-label={`${resource.label} 최종 위치`}
              placeholder="1-17"
            />
          </label>
        ))}
      </div>
      <FinalScoreSummary boardComplete={boardComplete} scoring={scoring} scoringBusy={scoringBusy} />
    </section>
  );
}

function FinalScoreSummary({ boardComplete, scoring, scoringBusy }) {
  if (!boardComplete) {
    return <p className="session-score-status">5개 자원 위치를 모두 입력하면 점수표가 갱신됩니다.</p>;
  }

  if (scoringBusy) {
    return <p className="session-score-status">점수 계산 중입니다.</p>;
  }

  if (!scoring?.rows?.length) {
    return <p className="session-score-status">계산 결과를 기다리고 있습니다.</p>;
  }

  return (
    <div className="final-score-table-wrap" aria-live="polite">
      <table className="final-score-table">
        <thead>
          <tr>
            <th scope="col">가문</th>
            <th scope="col">비밀</th>
            <th scope="col">공개</th>
            <th scope="col">코인</th>
            <th scope="col">권력</th>
            <th scope="col">합계</th>
            <th scope="col">순위</th>
          </tr>
        </thead>
        <tbody>
          {scoring.rows.map((row) => (
            <tr key={row.houseId}>
              <th scope="row">{row.houseName}</th>
              <td>{formatSignedScore(row.scores.resourceGoal)}</td>
              <td>{formatSignedScore(row.scores.openAgenda)}</td>
              <td>{formatSignedScore(row.scores.moneyRanking)}</td>
              <td>{formatSignedScore(row.scores.powerMajority)}</td>
              <td>{row.scores.total}</td>
              <td>{row.ranks.total}위</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FloatingSettings({
  authenticated,
  bgmMuted,
  bgmVolume,
  busy,
  canEndSession,
  canEditVoteOrder,
  canToggleRandomDiscard,
  historyCount,
  open,
  randomDiscardEnabled,
  tipsOpen,
  onEndSession,
  onLogout,
  onOpenDilemmaHistory,
  onOpenVoteOrderDialog,
  onOpenScoreGuide,
  onReset,
  onBgmVolumeChange,
  onToggle,
  onToggleBgmMuted,
  onToggleRandomDiscard,
  onToggleTips,
  historyToggleRef,
  voteOrderToggleRef,
  tipsToggleRef,
  toggleRef,
  voteOrderLocked,
}) {
  const bgmVolumePercent = Math.round(bgmVolume * 100);

  return (
    <div className="settings-float">
      <div className="settings-float-actions">
        <button
          ref={toggleRef}
          className="settings-toggle"
          type="button"
          aria-controls="settings-menu"
          aria-expanded={open}
          aria-label="설정 열기"
          onClick={onToggle}
        >
          <TokenIcon type="menu" />
        </button>
        <button
          ref={tipsToggleRef}
          className="settings-toggle"
          type="button"
          aria-controls="tips-menu"
          aria-expanded={tipsOpen}
          aria-label="팁 열기"
          onClick={onToggleTips}
        >
          <TokenIcon type="tip" />
        </button>
        <button
          ref={historyToggleRef}
          className="settings-toggle"
          type="button"
          aria-haspopup="dialog"
          aria-label={`딜레마 이력 ${historyCount}건`}
          onClick={onOpenDilemmaHistory}
        >
          <TokenIcon type="history" />
        </button>
      </div>
      {tipsOpen ? (
        <div className="settings-menu tips-menu" id="tips-menu">
          <button className="ghost-button wide" type="button" onClick={onOpenScoreGuide}>
            <TokenIcon type="balance" />
            비밀 의제 점수
          </button>
          <a className="settings-link" href={rulebookPdfUrl} target="_blank" rel="noreferrer">
            <TokenIcon type="scroll" />
            룰북 PDF 보기
            <TokenIcon type="external" />
          </a>
        </div>
      ) : null}
      {open ? (
        <div className="settings-menu" id="settings-menu">
          <button
            className="ghost-button wide"
            type="button"
            aria-pressed={bgmMuted}
            onClick={onToggleBgmMuted}
          >
            <TokenIcon type={bgmMuted ? "soundOff" : "soundOn"} />
            {bgmMuted ? "BGM 음소거 해제" : "BGM 음소거"}
          </button>
          <div className="settings-volume-control">
            <div className="settings-volume-heading">
              <label htmlFor="bgm-volume">BGM 음량</label>
              <span>{bgmVolumePercent}%</span>
            </div>
            <input
              id="bgm-volume"
              type="range"
              min="0"
              max="100"
              step="1"
              value={bgmVolumePercent}
              onChange={onBgmVolumeChange}
            />
          </div>
          <button
            className={`settings-switch-control${!canToggleRandomDiscard ? " disabled" : ""}`}
            type="button"
            aria-pressed={randomDiscardEnabled}
            aria-label={`무작위 의제 폐기 ${randomDiscardEnabled ? "ON" : "OFF"}`}
            onClick={onToggleRandomDiscard}
            disabled={busy || !canToggleRandomDiscard}
          >
            <span>
              <strong>무작위 의제 폐기</strong>
            </span>
            <span className="settings-state-segment" aria-hidden="true">
              <span className={randomDiscardEnabled ? "active" : ""}>ON</span>
              <span className={!randomDiscardEnabled ? "active" : ""}>OFF</span>
            </span>
          </button>
          <a className="settings-link" href={sharedBoardSheetUrl} target="_blank" rel="noreferrer">
            <TokenIcon type="sheet" />
            공유 시트 열기
            <TokenIcon type="external" />
          </a>
          {authenticated ? (
            <>
              <button
                ref={voteOrderToggleRef}
                className="ghost-button wide"
                type="button"
                onClick={onOpenVoteOrderDialog}
                disabled={busy || !canEditVoteOrder}
                title={
                  voteOrderLocked
                    ? "현재 의제 선택 중에는 투표 순서를 바꿀 수 없습니다."
                    : canEditVoteOrder
                      ? "투표 순서를 직접 조정합니다."
                      : "활성 가문 5명이 있어야 수정할 수 있습니다."
                }
              >
                <TokenIcon type="turn" />
                투표 순서 설정
              </button>
              <button
                className="ghost-button wide session-end-button"
                type="button"
                onClick={onEndSession}
                disabled={busy || !canEndSession}
                title={canEndSession ? "이번 세션을 종료하고 체크리스트를 엽니다." : sessionEndUnavailableMessage}
              >
                <TokenIcon type="seal" />
                세션 종료 준비
              </button>
              <button className="ghost-button wide" type="button" onClick={onLogout} disabled={busy}>
                <TokenIcon type="exit" />
                가문 나가기
              </button>
            </>
          ) : null}
          <button className="ghost-button wide" type="button" onClick={onReset} disabled={busy}>
            <TokenIcon type="reset" />
            전체 초기화
          </button>
        </div>
      ) : null}
    </div>
  );
}

function rotateOrderToHouse(order, houseId) {
  const index = order.indexOf(houseId);

  if (index <= 0) {
    return order;
  }

  return [...order.slice(index), ...order.slice(0, index)];
}

function VoteOrderDialog({ busy, open, state, onClose, onSave, restoreFocusRef }) {
  const dialogRef = useRef(null);
  const closeTimerRef = useRef(null);
  const ringRef = useRef(null);
  const dragStartOrderRef = useRef([]);
  const houses = useMemo(() => getVoteOrderHouses(state), [state]);
  const initialOrder = useMemo(() => {
    return houses.map((house) => house.id);
  }, [houses]);
  const [draftOrder, setDraftOrder] = useState(initialOrder);
  const [activeDragId, setActiveDragId] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const locked = Boolean(state && isVoteOrderSettingLocked(state));
  const canSave = !busy && !locked && draftOrder.length > 0;
  const houseById = useMemo(() => new Map(houses.map((house) => [house.id, house])), [houses]);
  const activeDragHouse = activeDragId ? houseById.get(activeDragId) : null;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (open) {
      setDraftOrder(initialOrder);
      setActiveDragId("");
      setSaveStatus("");
    }
  }, [initialOrder, open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const focusFirstControl = window.setTimeout(() => {
      const firstControl = dialogRef.current?.querySelector(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      firstControl?.focus();
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(
        dialogRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element instanceof HTMLElement && element.getClientRects().length > 0);

      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusFirstControl);
      window.clearTimeout(closeTimerRef.current);
      document.removeEventListener("keydown", handleKeyDown);
      window.setTimeout(() => {
        restoreFocusRef?.current?.focus();
      }, 0);
    };
  }, [onClose, open, restoreFocusRef]);

  const getVoteOrderIndexFromPoint = useCallback(
    (x, y) => {
      const ringRect = ringRef.current?.getBoundingClientRect();

      if (!ringRect || draftOrder.length === 0) {
        return -1;
      }

      const centerX = ringRect.left + ringRect.width / 2;
      const centerY = ringRect.top + ringRect.height / 2;
      const angle = (Math.atan2(y - centerY, x - centerX) * 180) / Math.PI;
      const normalized = (angle + 90 + 360) % 360;
      const segment = 360 / draftOrder.length;

      return Math.max(0, Math.min(draftOrder.length - 1, Math.round(normalized / segment) % draftOrder.length));
    },
    [draftOrder.length],
  );

  const moveActiveSeatToPoint = useCallback(
    (activeId, x, y) => {
      const targetIndex = getVoteOrderIndexFromPoint(x, y);

      if (targetIndex < 0) {
        return;
      }

      setDraftOrder((current) => {
        const oldIndex = current.indexOf(activeId);

        if (oldIndex < 0 || oldIndex === targetIndex) {
          return current;
        }

        return arrayMove(current, oldIndex, targetIndex);
      });
    },
    [getVoteOrderIndexFromPoint],
  );

  const handleDragStart = (event) => {
    if (locked) {
      return;
    }

    dragStartOrderRef.current = draftOrder;
    setActiveDragId(String(event.active.id));
  };

  const handleDragMove = (event) => {
    if (locked || !event.active?.id) {
      return;
    }

    const initialRect = event.active.rect.current.initial;

    if (!initialRect) {
      return;
    }

    moveActiveSeatToPoint(
      String(event.active.id),
      initialRect.left + initialRect.width / 2 + event.delta.x,
      initialRect.top + initialRect.height / 2 + event.delta.y,
    );
  };

  const handleDragEnd = () => {
    dragStartOrderRef.current = [];
    setActiveDragId("");
  };

  const handleDragCancel = () => {
    if (dragStartOrderRef.current.length) {
      setDraftOrder(dragStartOrderRef.current);
    }

    dragStartOrderRef.current = [];
    setActiveDragId("");
  };

  if (!open) {
    return null;
  }

  const submit = async (event) => {
    event.preventDefault();

    if (!canSave) {
      return;
    }

    setSaveStatus("");
    const result = await onSave({
      voteOrder: draftOrder,
    });

    if (result) {
      setSaveStatus("투표 순서를 저장했습니다. 창을 닫습니다.");
      closeTimerRef.current = window.setTimeout(onClose, 650);
      return;
    }

    setSaveStatus("투표 순서를 저장하지 못했습니다.");
  };

  return (
    <div className="session-end-overlay" role="presentation">
      <section
        ref={dialogRef}
        className="vote-order-dialog"
        aria-labelledby="vote-order-title"
        aria-modal="true"
        role="dialog"
      >
        <div className="session-end-heading">
          <span className="session-end-seal" aria-hidden="true">
            <TokenIcon type="turn" />
          </span>
          <div>
            <p className="section-label">의회 절차</p>
            <h2 id="vote-order-title">투표 순서 설정</h2>
          </div>
        </div>
        <form className="vote-order-form" onSubmit={submit}>
          <div className="vote-order-copy">
            <p>
              이 화면의 좌석은 실제 참석 기준의 시계방향 순서만 저장합니다. 딜레마 투표는 현재 리더 토큰 보유자의
              위치에서 시작해 이 순서를 따라 진행합니다.
            </p>
            <p>리더와 중재자는 투표 결과와 기권 선택을 마음대로 바꾸지 않습니다. 투표가 시작되면 순서를 바꿀 수 없습니다.</p>
          </div>
          {locked ? (
            <p className="vote-order-warning" role="status">
              현재 딜레마 투표가 진행 중이라 순서를 수정할 수 없습니다.
            </p>
          ) : null}
          {draftOrder.length > 0 ? (
            <DndContext
              sensors={sensors}
              onDragCancel={handleDragCancel}
              onDragEnd={handleDragEnd}
              onDragMove={handleDragMove}
              onDragStart={handleDragStart}
            >
              <div
                className={`vote-order-ring${activeDragId ? " is-dragging" : ""}`}
                aria-label="시계방향 투표 순서"
                ref={ringRef}
                style={{ "--seat-count": draftOrder.length }}
              >
                <span className="vote-order-ring-center" aria-hidden="true">
                  <TokenIcon type="turn" />
                  <span>시계방향</span>
                </span>
                {draftOrder.map((houseId, index) => (
                  <DraggableVoteOrderSeat
                    active={activeDragId === houseId}
                    disabled={busy || locked}
                    house={houseById.get(houseId)}
                    id={houseId}
                    index={index}
                    total={draftOrder.length}
                    key={houseId}
                  />
                ))}
              </div>
              <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
                {activeDragHouse ? (
                  <VoteOrderDragPreview
                    house={activeDragHouse}
                    index={Math.max(0, draftOrder.indexOf(activeDragId))}
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : (
            <p className="vote-order-warning">로그인 중인 가문이 있을 때 순서를 설정할 수 있습니다.</p>
          )}
          {draftOrder.length > 0 ? (
            <ol className="vote-order-readout" aria-label="저장할 투표 순서">
              {draftOrder.map((houseId, index) => {
                const house = houseById.get(houseId);
                return (
                  <li key={houseId}>
                    <HouseCrestBadge
                      house={house}
                      className="vote-order-readout-crest"
                      ariaLabel={`${index + 1}번째 ${getHouseHoverLabel(house)}`}
                    />
                    <strong>{getHouseKoreanName(house)}</strong>
                  </li>
                );
              })}
            </ol>
          ) : null}
          {saveStatus ? <p className="vote-order-status" role="status">{saveStatus}</p> : null}
          <div className="session-end-actions">
            <button className="ghost-button" type="button" onClick={onClose} disabled={busy}>
              닫기
            </button>
            <button className="primary-button" type="submit" disabled={!canSave}>
              <TokenIcon type="save" />
              저장
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function getVoteOrderSeatTransform(angle) {
  return `translate(-50%, -50%) rotate(${angle}deg) translate(var(--seat-radius)) rotate(${-angle}deg)`;
}

function VoteOrderSeatContents({ house, index }) {
  const houseName = getHouseKoreanName(house);
  const displayName = house?.hasCustomName && house.name ? house.name : houseName;

  return (
    <>
      <HouseCrestBadge
        house={house}
        className="vote-order-rank"
        ariaLabel={`${index + 1}번째 ${getHouseHoverLabel(house)}`}
      />
      <span className="vote-order-house">
        <strong>{displayName}</strong>
        <small>{houseName}</small>
      </span>
    </>
  );
}

function DraggableVoteOrderSeat({ active, disabled, house, id, index, total }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, disabled });
  const angle = total > 0 ? -90 + (360 / total) * index : -90;
  const displayName = getHouseHoverLabel(house);
  const style = {
    "--seat-index": index,
    "--seat-angle": `${angle}deg`,
    transform: getVoteOrderSeatTransform(angle),
  };

  return (
    <button
      ref={setNodeRef}
      className={`vote-order-seat${active || isDragging ? " dragging" : ""}${active ? " placeholder" : ""}${disabled ? " disabled" : ""}`}
      style={style}
      type="button"
      disabled={disabled}
      aria-label={`${index + 1}번째 ${displayName} 시계방향 순서 이동`}
      {...attributes}
      {...listeners}
    >
      <VoteOrderSeatContents house={house} index={index} />
    </button>
  );
}

function VoteOrderDragPreview({ house, index }) {
  return (
    <div className="vote-order-seat vote-order-seat-preview">
      <VoteOrderSeatContents house={house} index={index} />
    </div>
  );
}

function SecretAgendaScoreDialog({ open, onClose, restoreFocusRef }) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const focusCloseButton = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(
        dialogRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element instanceof HTMLElement && element.getClientRects().length > 0);

      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusCloseButton);
      document.removeEventListener("keydown", handleKeyDown);
      window.setTimeout(() => {
        restoreFocusRef?.current?.focus();
      }, 0);
    };
  }, [onClose, open, restoreFocusRef]);

  if (!open) {
    return null;
  }

  return (
    <div className="session-end-overlay" role="presentation">
      <section
        ref={dialogRef}
        className="score-guide-dialog secret-agenda-guide-dialog"
        aria-labelledby="secret-agenda-guide-title"
        aria-describedby="secret-agenda-guide-copy"
        aria-modal="true"
        role="dialog"
      >
        <div className="session-end-heading">
          <span className="session-end-seal" aria-hidden="true">
            <TokenIcon type="scroll" />
          </span>
          <div>
            <p className="section-label">룰북 p.30</p>
            <h2 id="secret-agenda-guide-title">비밀 의제 점수</h2>
          </div>
        </div>
        <p className="score-guide-copy" id="secret-agenda-guide-copy">
          비밀 의제 카드는 게임 종료 시 각 가문의 득점 원천입니다. 카드의 자원 목표 점수와 코인 순위 점수를
          각각 계산해서 더한 값을 비밀 의제 점수로 기록합니다.
        </p>
        <div className="score-guide-formula" aria-label="비밀 의제 점수 공식">
          <span className="score-guide-formula-item">자원 목표 점수</span>
          <span className="score-guide-formula-operator">+</span>
          <span className="score-guide-formula-item">코인 순위 점수</span>
          <strong>= 비밀 의제 점수</strong>
        </div>
        <div className="score-guide-sections">
          <section className="score-guide-section">
            <h3>1. 자원 목표 점수</h3>
            <ul>
              <li>게임이 끝난 시점의 공용 보드 5개 자원 마커 최종 위치를 봅니다.</li>
              <li>자신의 비밀 의제 카드에 표시된 자원 목표 표와 그 위치를 대조합니다.</li>
              <li>표가 요구하는 구역 안에 들어간 자원 마커 수에 따라 카드의 해당 득점을 받습니다.</li>
            </ul>
          </section>
          <section className="score-guide-section">
            <h3>2. 코인 순위 점수</h3>
            <ul>
              <li>각 가문이 게임 종료 시 가문 스크린 뒤에 숨긴 코인 수를 비교합니다.</li>
              <li>비밀 의제 카드 하단의 코인 순위 표에서 1위, 2위, 3위에 해당하는 점수를 받습니다.</li>
              <li>카드마다 코인 순위 점수가 다르므로 같은 순위라도 비밀 의제에 따라 받는 점수가 달라집니다.</li>
              <li>1위부터 3위 안에 들지 못하면 카드에 표시된 코인 순위 점수가 없으므로 0점으로 처리합니다.</li>
            </ul>
          </section>
          <section className="score-guide-section">
            <h3>3. 동률 처리</h3>
            <ul>
              <li>코인 수가 같으면 동률인 모든 가문이 같은 순위를 공유합니다.</li>
              <li>동률인 가문들은 각자 자기 비밀 의제 카드의 해당 순위 점수를 받습니다.</li>
              <li>자원 위치 동률은 룰북의 일반 동률 규칙처럼 묶인 자원이 같은 위치를 공유합니다.</li>
            </ul>
          </section>
        </div>
        <div className="score-guide-actions">
          <button ref={closeButtonRef} className="primary-button" type="button" onClick={onClose}>
            확인
          </button>
        </div>
      </section>
    </div>
  );
}

function DilemmaHistoryDialog({ busy, currentHouseId, history, open, onClose, onDelete, restoreFocusRef }) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const normalizedHistory = useMemo(() => history.map(normalizeDilemmaHistoryEntry), [history]);
  const [selectedId, setSelectedId] = useState("");
  const selectedEntry =
    normalizedHistory.find((entry) => entry.historyId === selectedId) || normalizedHistory[0] || null;
  const canDeleteSelected = Boolean(currentHouseId && selectedEntry?.savedBy === currentHouseId);

  const handleDeleteSelected = useCallback(async () => {
    if (!selectedEntry || !canDeleteSelected) {
      return;
    }

    if (!window.confirm("선택한 딜레마 이력을 삭제할까요?")) {
      return;
    }

    await onDelete?.(selectedEntry.historyId);
  }, [canDeleteSelected, onDelete, selectedEntry]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSelectedId((current) =>
      normalizedHistory.some((entry) => entry.historyId === current) ? current : normalizedHistory[0]?.historyId || "",
    );
  }, [normalizedHistory, open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const focusCloseButton = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(
        dialogRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element instanceof HTMLElement && element.getClientRects().length > 0);

      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusCloseButton);
      document.removeEventListener("keydown", handleKeyDown);
      window.setTimeout(() => {
        restoreFocusRef?.current?.focus();
      }, 0);
    };
  }, [onClose, open, restoreFocusRef]);

  if (!open) {
    return null;
  }

  return (
    <div className="session-end-overlay" role="presentation">
      <section
        ref={dialogRef}
        className="dilemma-history-dialog"
        aria-labelledby="dilemma-history-title"
        aria-modal="true"
        role="dialog"
      >
        <div className="session-end-heading">
          <span className="session-end-seal" aria-hidden="true">
            <TokenIcon type="history" />
          </span>
          <div>
            <p className="section-label">의회 기록</p>
            <h2 id="dilemma-history-title">딜레마 이력</h2>
          </div>
        </div>
        {normalizedHistory.length ? (
          <div className="dilemma-history-layout">
            <div className="dilemma-history-list" aria-label="저장된 딜레마 목록">
              {normalizedHistory.map((entry) => (
                <button
                  key={entry.historyId}
                  className={`dilemma-history-item${entry.historyId === selectedEntry?.historyId ? " selected" : ""}`}
                  type="button"
                  onClick={() => setSelectedId(entry.historyId)}
                >
                  <strong>{formatDilemmaCardLabel(entry) || "제목 없음"}</strong>
                  <span>{dilemmaOutcomeLabels[entry.selectedOutcome] || "미정"}</span>
                  <small>{formatLocalDateTime(entry.savedAt || entry.updatedAt)}</small>
                </button>
              ))}
            </div>
            <DilemmaHistoryDetail
              canDelete={canDeleteSelected}
              deleteBusy={busy}
              entry={selectedEntry}
              onDelete={handleDeleteSelected}
            />
          </div>
        ) : (
          <p className="dilemma-history-empty">저장된 딜레마 이력이 없습니다.</p>
        )}
        <div className="score-guide-actions">
          <button ref={closeButtonRef} className="primary-button" type="button" onClick={onClose}>
            확인
          </button>
        </div>
      </section>
    </div>
  );
}

function DilemmaHistoryDetail({ canDelete, deleteBusy, entry, onDelete }) {
  if (!entry) {
    return null;
  }

  return (
    <article className="dilemma-history-detail">
      <header className="dilemma-history-detail-head">
        <div>
          <p className="section-label">상세 기록</p>
          <h3>{formatDilemmaCardLabel(entry) || "제목 없음"}</h3>
        </div>
        {canDelete ? (
          <button
            className="ghost-button danger-button dilemma-history-delete"
            type="button"
            onClick={onDelete}
            disabled={deleteBusy}
          >
            <TokenIcon type="trash" />
            삭제
          </button>
        ) : null}
      </header>
      <div className="dilemma-facts">
        <DilemmaFact label="카드" value={formatDilemmaCardLabel(entry)} />
        <DilemmaFact label="배치 위치" value={entry.timeCounterSlot} />
        <DilemmaFact label="결과" value={dilemmaOutcomeLabels[entry.selectedOutcome] || "미정"} />
      </div>
      <DilemmaTextPreview label="상황" value={entry.context} />
      <DilemmaTextPreview label="질문" value={entry.question} />
      <DilemmaTextPreview label="메모" value={entry.councilNotes} />
      <div className="dilemma-outcome-grid">
        <DilemmaOutcomePreview label="찬성" selected={entry.selectedOutcome === "aye"} outcome={entry.aye} />
        <DilemmaOutcomePreview label="반대" selected={entry.selectedOutcome === "nay"} outcome={entry.nay} />
      </div>
      <DilemmaTextPreview label="투표" value={entry.voteNotes} />
      <DilemmaTextPreview label="후속" value={entry.resolutionNotes} />
      <DilemmaPhotoStrip photos={entry.photos} />
      <p className="dilemma-updated">
        {(entry.savedByName || entry.updatedByName || "의회")} 저장 · {formatLocalDateTime(entry.savedAt || entry.updatedAt)}
      </p>
    </article>
  );
}

function ScoreGuideDialog({ open, onClose, restoreFocusRef }) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const focusCloseButton = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(
        dialogRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element instanceof HTMLElement && element.getClientRects().length > 0);

      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusCloseButton);
      document.removeEventListener("keydown", handleKeyDown);
      window.setTimeout(() => {
        restoreFocusRef?.current?.focus();
      }, 0);
    };
  }, [onClose, open, restoreFocusRef]);

  if (!open) {
    return null;
  }

  return (
    <div className="session-end-overlay" role="presentation">
      <section
        ref={dialogRef}
        className="score-guide-dialog"
        aria-labelledby="score-guide-title"
        aria-describedby="score-guide-copy"
        aria-modal="true"
        role="dialog"
      >
        <div className="session-end-heading">
          <span className="session-end-seal" aria-hidden="true">
            <TokenIcon type="balance" />
          </span>
          <div>
            <p className="section-label">룰북 기준</p>
            <h2 id="score-guide-title">점수 산정 방식</h2>
          </div>
        </div>
        <p className="score-guide-copy" id="score-guide-copy">
          왕이 사망하거나 안정도 트랙 끝에 도달해 게임이 종료되면 점수를 계산합니다. 중간 저장으로 세션만 멈춘 경우에는
          점수를 산정하지 않습니다.
        </p>
        <div className="score-guide-formula" aria-label="최종 득점 공식">
          <span className="score-guide-formula-item">비밀 의제: 자원 목표 + 코인 순위</span>
          <span className="score-guide-formula-operator">+</span>
          <span className="score-guide-formula-item">공개 의제</span>
          <span className="score-guide-formula-operator">+</span>
          <span className="score-guide-formula-item">권력 보너스</span>
          <strong>= 합계</strong>
        </div>
        <div className="score-guide-sections">
          <section className="score-guide-section">
            <h3>1. 득점 합산</h3>
            <ul>
              <li>비밀 의제는 자원 목표 점수와 코인 순위 점수를 더해 산정합니다.</li>
              <li>자원 목표는 공용 보드의 최종 자원 위치를 비밀 의제 카드의 자원 조건과 대조합니다.</li>
              <li>코인 순위는 남은 코인이 1위, 2위, 3위인지에 따라 카드 하단의 순위 점수를 받습니다.</li>
              <li>긍정 공개 의제는 해당 자원이 가장 높으면 +3, 두 번째로 높으면 +1입니다.</li>
              <li>부정 공개 의제는 해당 자원이 가장 낮으면 -3, 두 번째로 낮으면 -1입니다.</li>
              <li>권력 보너스는 남은 권력이 가장 많은 가문이 +2, 두 번째 가문이 +1입니다.</li>
            </ul>
          </section>
          <section className="score-guide-section">
            <h3>2. 비밀 의제 점수</h3>
            <ul>
              <li>각 비밀 의제 카드는 자원 목표와 코인 순위 목표 두 가지 점수 조건을 가집니다.</li>
              <li>자원 목표는 게임 종료 시 공용 보드의 자원 마커 위치를 카드의 자원 구간/표와 대조해 계산합니다.</li>
              <li>
                코인 순위 목표는 남은 코인이 다른 가문과 비교해 몇 위인지 보고 카드 하단의 1위, 2위, 3위 점수를 받습니다.
              </li>
              <li>코인 순위가 동률이면 동률인 모든 가문이 같은 순위 점수를 받습니다.</li>
            </ul>
          </section>
          <section className="score-guide-section">
            <h3>3. 순위와 동률</h3>
            <ul>
              <li>자원 위치와 코인/권력 수량이 동률이면 묶인 대상이 같은 순위 보너스 또는 패널티를 받습니다.</li>
              <li>득점 합계가 가장 높은 가문이 이번 게임의 승자입니다. 득점 동률이면 승리를 공유합니다.</li>
              <li>마지막 순위는 항상 존재합니다. 5인 게임에서 4인 동률 뒤에 아무도 없으면 그 동률을 Last로 봅니다.</li>
            </ul>
          </section>
          <section className="score-guide-section">
            <h3>4. 명망/갈망 기록</h3>
            <p>
              이 앱은 득점 합계와 순위까지만 자동 계산합니다. 명망/갈망은 득점 순위와 종료 조건을 아래 룰북 표에 대입해
              각 가문 값에 직접 반영합니다.
            </p>
            <div className="score-guide-table-wrap">
              <table className="score-guide-table">
                <thead>
                  <tr>
                    <th scope="col">조건</th>
                    <th scope="col">1위</th>
                    <th scope="col">2위</th>
                    <th scope="col">3위</th>
                    <th scope="col">4위</th>
                    <th scope="col">Last</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">왕 사망</th>
                    <td>명망 5</td>
                    <td>명망 4</td>
                    <td>명망 2, 갈망 1</td>
                    <td>명망 2, 갈망 1</td>
                    <td>갈망 2</td>
                  </tr>
                  <tr>
                    <th scope="row">상단 안정도</th>
                    <td>명망 3</td>
                    <td>명망 2</td>
                    <td>명망 1</td>
                    <td>명망 1</td>
                    <td>갈망 2</td>
                  </tr>
                  <tr>
                    <th scope="row">하단 안정도</th>
                    <td>갈망 3</td>
                    <td>갈망 2</td>
                    <td>갈망 1</td>
                    <td>갈망 1</td>
                    <td>명망 2</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
        <div className="score-guide-actions">
          <button ref={closeButtonRef} className="primary-button" type="button" onClick={onClose}>
            확인
          </button>
        </div>
      </section>
    </div>
  );
}

function DecorativeBackdrop() {
  return (
    <div className="royal-backdrop" aria-hidden="true">
      <div className="backdrop-band top" />
      <div className="backdrop-band bottom" />
      <div className="backdrop-grid" />
    </div>
  );
}

function BrandLockup() {
  return (
    <div className="brand-lockup">
      <div className="brand-seal" aria-hidden="true">
        <TokenIcon type="crown" />
      </div>
      <div>
        <p className="brand-title">왕의 딜레마</p>
        <h1>King's Dilemma Deck</h1>
        <p className="brand-subtitle">가문 정보와 비밀 의제를 한 화면에서 관리합니다.</p>
      </div>
    </div>
  );
}

function LoginPanel({
  state,
  busy,
  houseInput,
  setHouseInput,
  displayName,
  setDisplayName,
  seatPassword,
  setSeatPassword,
  seatPasswordConfirm,
  setSeatPasswordConfirm,
  onSubmit,
}) {
  const houses = getHouses(state);
  const selectedHouse = houses.find((house) => house.id === houseInput);
  const selectionClosed =
    (state?.claimedHouseCount || 0) >= (state?.requiredHouseCount || REQUIRED_HOUSE_COUNT);
  const needsDisplayName = Boolean(selectedHouse) && (!selectedHouse.hasPassword || !selectedHouse.hasCustomName);
  const passwordReady =
    Boolean(selectedHouse) &&
    seatPassword.length >= 4 &&
    (!needsDisplayName || isCustomNameReady(displayName)) &&
    (selectedHouse.hasPassword || seatPassword === seatPasswordConfirm);
  const selectHouse = (houseId) => {
    setHouseInput(houseId);
    setDisplayName("");
    setSeatPassword("");
    setSeatPasswordConfirm("");
  };

  return (
    <section className="council-entry" aria-labelledby="login-title">
      <div className="entry-brief">
        <div className="entry-emblem" aria-hidden="true">
          <TokenIcon type="balance" />
        </div>
        <div>
          <p className="section-label">왕국 회기</p>
          <h2 id="login-title">참여할 가문을 선택하세요</h2>
          <p>
            이번 회의에 참여할 5개 가문을 고릅니다. 비밀 의제는 명망이 낮은 가문부터 선택합니다. 명망 동률에서는
            가문 번호가 높은 쪽을 더 높은 명망으로 보므로, 낮은 번호 가문이 먼저 선택합니다.
          </p>
        </div>
        {selectedHouse ? (
          <section className="entry-house-profile" aria-live="polite">
            <div className="entry-house-profile-heading">
              <div>
                <p className="section-label">가문 설명</p>
                <h3>{getHouseKoreanName(selectedHouse)}</h3>
              </div>
              <span>#{String(selectedHouse.number).padStart(2, "0")}</span>
            </div>
            <p className="entry-house-motto">{selectedHouse.motto}</p>
            <p>{selectedHouse.profile}</p>
          </section>
        ) : (
          <p className="entry-house-placeholder">가문을 선택하면 이곳에 해당 가문의 설명을 표시합니다.</p>
        )}
      </div>

      <form className="seat-ledger" onSubmit={onSubmit} aria-busy={busy}>
        <div className="ledger-heading">
          <div>
            <p className="section-label">가문 명부</p>
            <h3>{selectedHouse ? getHouseKoreanName(selectedHouse) : "가문을 선택하세요"}</h3>
          </div>
          <span className="ledger-status">
            {state?.claimedHouseCount || 0} / {state?.requiredHouseCount || REQUIRED_HOUSE_COUNT} 선택
          </span>
        </div>
        <fieldset className="seat-fieldset">
          <legend>가문 선택</legend>
          <div className="seat-grid">
            {houses.map((house) => {
              const selected = houseInput === house.id;
              const unavailable = selectionClosed && !house.hasPassword;

              return (
                <label
                  className={`seat-option tone-${house.motif}${selected ? " selected" : ""}${unavailable ? " unavailable" : ""}`}
                  key={house.id}
                  aria-disabled={unavailable}
                >
                  <input
                    checked={selected}
                    disabled={unavailable}
                    name="house"
                    onChange={() => selectHouse(house.id)}
                    type="radio"
                    value={house.id}
                  />
                  <span className="house-number">#{String(house.number).padStart(2, "0")}</span>
                  <span className="house-crest" aria-hidden="true">
                    <HouseIcon motif={house.motif} />
                  </span>
                  <span className="seat-copy">
                    <span className="seat-main">{getHouseKoreanName(house)}</span>
                    <span className={`seat-motto${house.hasCustomName ? "" : " placeholder"}`}>
                      {house.hasCustomName ? house.name : selectionClosed ? "회의 불참" : "아직 선택하지 않음"}
                    </span>
                  </span>
                  <span className={`seat-status ${getHouseTone(house, selectionClosed)}`}>
                    {getHouseStatus(house, selectionClosed)}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <PasswordPanel
          selectedHouse={selectedHouse}
          needsDisplayName={needsDisplayName}
          displayName={displayName}
          setDisplayName={setDisplayName}
          seatPassword={seatPassword}
          setSeatPassword={setSeatPassword}
          seatPasswordConfirm={seatPasswordConfirm}
          setSeatPasswordConfirm={setSeatPasswordConfirm}
        />
        <button className="primary-button wide" type="submit" disabled={busy || !passwordReady}>
          <TokenIcon type="key" />
              {busy ? "저장 중" : "저장"}
        </button>
      </form>
    </section>
  );
}

function PasswordPanel({
  selectedHouse,
  needsDisplayName,
  displayName,
  setDisplayName,
  seatPassword,
  setSeatPassword,
  seatPasswordConfirm,
  setSeatPasswordConfirm,
}) {
  if (!selectedHouse) {
    return (
      <p className="password-hint">
        <TokenIcon type="seal" />
        가문을 고르면 표시명과 비밀번호를 기록합니다.
      </p>
    );
  }

  if (selectedHouse.hasPassword) {
    return (
      <div className="password-panel">
        {needsDisplayName ? (
          <NameField displayName={displayName} setDisplayName={setDisplayName} />
        ) : null}
        <label className="credential-field">
          <span className="field-label">가문 비밀번호</span>
          <input
            value={seatPassword}
            onChange={(event) => setSeatPassword(event.target.value)}
            type="password"
            minLength={4}
            maxLength={64}
            autoComplete="current-password"
            aria-label="가문 비밀번호"
            placeholder="가문 비밀번호"
            required
          />
        </label>
      </div>
    );
  }

  return (
    <div className="password-panel">
      <NameField displayName={displayName} setDisplayName={setDisplayName} />
      <label className="credential-field">
        <span className="field-label">새 가문 비밀번호</span>
        <input
          value={seatPassword}
          onChange={(event) => setSeatPassword(event.target.value)}
          type="password"
          minLength={4}
          maxLength={64}
          autoComplete="new-password"
          aria-label="새 가문 비밀번호"
          placeholder="새 가문 비밀번호"
          required
        />
      </label>
      <label className="credential-field">
        <span className="field-label">가문 비밀번호 확인</span>
        <input
          value={seatPasswordConfirm}
          onChange={(event) => setSeatPasswordConfirm(event.target.value)}
          type="password"
          minLength={4}
          maxLength={64}
          autoComplete="new-password"
          aria-label="가문 비밀번호 확인"
          placeholder="가문 비밀번호 확인"
          required
        />
      </label>
    </div>
  );
}

function NameField({ displayName, setDisplayName }) {
  return (
    <label className="credential-field">
      <span className="field-label">가문 표시명</span>
      <input
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        type="text"
        minLength={2}
        maxLength={32}
        autoComplete="nickname"
        aria-label="가문 표시명"
        placeholder="예: 올류드 후작가"
        required
      />
    </label>
  );
}

function isCustomNameReady(name) {
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 32 && !defaultNamePattern.test(trimmed);
}

function getHouses(state) {
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

function getHouseKoreanName(house) {
  return house?.koreanTitle || house?.name || "가문";
}

function getHouseCustomName(house) {
  return house?.hasCustomName && typeof house.name === "string" ? house.name.trim() : "";
}

function getHouseHoverLabel(house, customNameOverride) {
  const houseName = getHouseKoreanName(house);
  const customName =
    typeof customNameOverride === "string" ? customNameOverride.trim() : getHouseCustomName(house);

  if (!customName || customName === houseName || customName === house?.koreanTitle || customName === house?.title) {
    return houseName;
  }

  return `${houseName} (${customName})`;
}

function getHouseStatus(house, selectionClosed = false) {
  if (house.isSelf) {
    return "현재 접속";
  }

  if (house.hasChosen) {
    return "의제 선택";
  }

  if (house.hasPassword) {
    return "가문 선택됨";
  }

  if (selectionClosed) {
    return "정원 마감";
  }

  return "선택 가능";
}

function getHouseTone(house, selectionClosed = false) {
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

function GamePanel({ state, busy, mutate, onOpenSecretAgendaGuide }) {
  const currentHouseName = getHouseDisplayName(state, state.currentHouseId);
  const voteOrderHouses = getDilemmaVoteParticipants(state);
  const currentVoteName = state.dilemmaVoteTurn ? getHouseDisplayName(state, state.dilemmaVoteTurn) : "";
  const draftTurnName = state.turn ? getHouseDisplayName(state, state.turn) : "시작 전";
  const leaderName = getHouseDisplayName(state, state.dilemmaLeader);
  const moderatorName = getHouseDisplayName(state, state.dilemmaModerator);
  const dilemmaProgressLabel = getDilemmaProgressLabel(state);
  const currentHouse = getCurrentHouse(state);
  const currentHouseChosenName =
    currentHouse?.hasCustomName && typeof currentHouse.name === "string"
      ? currentHouse.name.trim()
      : "";
  const availableAgendas = state.availableAgendas || [];
  const showAgendaList = state.phase !== "complete" && availableAgendas.length > 0;
  const discardSelectionMode = Boolean(state.canDiscard && !state.randomDiscardEnabled);
  const hasCouncilContext = Boolean(state.canDiscard);
  const councilStageLabel = getCouncilStageLabel(state);
  const councilProcedureTitle = getCouncilProcedureTitle(state);
  const handleSaveAlignmentReward = useCallback(
    (agendaId, reward) => mutate({ action: "saveAlignmentReward", agendaId, reward }),
    [mutate],
  );
  const handleSaveAlignmentOrder = useCallback(
    (alignmentOrder) => mutate({ action: "saveAlignmentOrder", alignmentOrder }),
    [mutate],
  );

  return (
    <section className="council-layout">
      <aside className="council-sidebar" aria-live="polite">
        <section className={`dilemma-stage phase-${state.phase}`} aria-labelledby="stage-title">
          <div className="stage-copy">
            <p className="section-label">의회 절차</p>
            <h2 id="stage-title">{councilProcedureTitle}</h2>
            <GameMessage state={state} />
            {isWaitingForDraft(state) ? <CarrotWaitAction /> : null}
            {state.phase === "complete" && !isDilemmaBlank(state.dilemma) ? (
              <DilemmaVotingPanel state={state} busy={busy} mutate={mutate} />
            ) : null}
          </div>
          <div className="stage-tableau" aria-hidden="true">
            <div className="balance-rail">
              <span />
              <span />
              <span />
            </div>
            <div className="tableau-token coin-token">
              <TokenIcon type="coin" />
            </div>
            <div className="tableau-token power-token">
              <TokenIcon type="power" />
            </div>
            <div className="tableau-token seal-token">
              <TokenIcon type="seal" />
            </div>
          </div>
        </section>
        <div className="status-stack">
          <StatusItem icon="house" label="내 가문" value={currentHouseChosenName || "-"} />
          <StatusItem
            icon="turn"
            label={state.phase === "complete" ? "투표 차례" : "차례"}
            value={state.phase === "complete" ? currentVoteName || "대기" : draftTurnName}
            splitParenthetical
          />
          <StatusItem icon="scroll" label="현재 단계" value={councilStageLabel} />
          {state.phase === "complete" ? (
            <>
              <StatusItem icon="crown" label="리더" value={leaderName || "미지정"} splitParenthetical />
              <StatusItem icon="balance" label="중재자" value={moderatorName || "미지정"} splitParenthetical />
              <StatusItem icon="seal" label="딜레마" value={dilemmaProgressLabel} />
            </>
          ) : (
            <StatusItem
              icon="seal"
              label={state.phase === "house-select" ? "가문 선택" : "의제 선택"}
              value={
                state.phase === "house-select"
                  ? `${state.claimedHouseCount} / ${state.requiredHouseCount}`
                  : `${state.selectedCount} / ${state.draftOrder.length || REQUIRED_HOUSE_COUNT}`
              }
            />
          )}
        </div>
        {state.phase === "complete" ? (
          <VoteOrderTrack houses={voteOrderHouses} leaderHouseId={state.dilemmaLeader} moderatorHouseId={state.dilemmaModerator} turn={state.dilemmaVoteTurn} />
        ) : (
          <TurnTrack houses={state.houses} draftOrder={state.draftOrder} turn={state.turn} phase={state.phase} />
        )}
        <p className="privacy-note">비밀 의제는 자기 차례가 오기 전까지 보이지 않습니다.</p>
      </aside>

      <section
        className={`council-main${showAgendaList ? " has-agenda" : ""}${
          hasCouncilContext ? " has-context" : " no-context"
        }${state.phase === "complete" ? " has-dilemma" : ""}`}
      >
        {hasCouncilContext ? (
          <aside className="council-context" aria-label="드래프트 보조 정보">
            <ActionPanel state={state} busy={busy} mutate={mutate} />
          </aside>
        ) : null}
        {showAgendaList ? (
          <AgendaList
            agendas={availableAgendas}
            busy={busy}
            mode={discardSelectionMode ? "discard" : "choose"}
            mutate={mutate}
          />
        ) : null}
        <PersonalInventoryPanel
          inventory={state.ownInventory}
          progress={state.ownHouseProgress}
          house={currentHouse}
          ownChoice={state.ownChoice}
          dilemma={state.phase === "complete" ? state.dilemma : null}
          dilemmaHistory={state.dilemmaHistory || []}
          dilemmaLeader={state.dilemmaLeader}
          dilemmaModerator={state.dilemmaModerator}
          houses={state.houses || []}
          houseId={state.currentHouseId}
          busy={busy}
          mutate={mutate}
          onSaveAlignmentReward={handleSaveAlignmentReward}
          onSaveAlignmentOrder={handleSaveAlignmentOrder}
          onOpenSecretAgendaGuide={onOpenSecretAgendaGuide}
        />
      </section>
    </section>
  );
}

function getCurrentHouse(state) {
  if (!state.currentHouseId) {
    return null;
  }

  return (
    state.houses?.find((house) => house.id === state.currentHouseId) ||
    HOUSE_CATALOG.find((house) => house.id === state.currentHouseId) ||
    null
  );
}

function getHouseDisplayName(state, houseId) {
  if (!houseId) {
    return "";
  }

  const house =
    state.houses?.find((item) => item.id === houseId) ||
    HOUSE_CATALOG.find((item) => item.id === houseId);
  const houseName = getHouseKoreanName(house);
  const customName = getHouseCustomName(house);

  if (!customName || customName === houseName || customName === house?.koreanTitle || customName === house?.title) {
    return houseName;
  }

  return `${houseName} (${customName})`;
}

function getCouncilStageLabel(state) {
  if (state.phase === "complete" && isDilemmaBlank(state.dilemma)) {
    return "딜레마 작성";
  }

  if (state.phase === "complete" && !isDilemmaBlank(state.dilemma)) {
    const dilemma = normalizeDilemmaRecord(state.dilemma);

    if (dilemma.selectedOutcome) {
      return "결과 선택 완료";
    }

    return isDilemmaVotingComplete(state) ? "투표 완료" : "투표 진행 중";
  }

  return phaseLabels[state.phase] || state.phase;
}

function getCouncilStageCopy(state) {
  if (state.phase === "complete" && isDilemmaBlank(state.dilemma)) {
    return "리더와 중재자, 투표 방향, 투표 순서를 지정하고 이번 라운드의 딜레마를 작성하세요.";
  }

  if (state.phase === "complete" && !isDilemmaBlank(state.dilemma)) {
    const dilemma = normalizeDilemmaRecord(state.dilemma);
    const voteTurnName = getDilemmaVoteTurnName(state);

    return dilemma.selectedOutcome
      ? "딜레마 투표 결과가 선택되었습니다. 후속 처리를 수기로 기록하고 게시하세요."
      : voteTurnName
        ? `${voteTurnName} 가문의 투표 차례입니다.`
        : "로그인 중인 모든 가문이 투표했습니다. 결과와 후속 처리를 직접 기록하세요.";
  }

  return phaseCopy[state.phase] || "의회 기록을 갱신하고 있습니다.";
}

function getCouncilProcedureTitle(state) {
  if (state.phase === "complete" && !isDilemmaBlank(state.dilemma)) {
    const dilemma = normalizeDilemmaRecord(state.dilemma);

    return dilemma.selectedOutcome ? "딜레마 결과" : "딜레마 투표";
  }

  if (state.phase === "complete") {
    return "딜레마 작성";
  }

  if (state.phase === "discard") {
    return "의제 폐기";
  }

  if (state.phase === "choose") {
    return "비밀 의제 선택";
  }

  return "의회 준비";
}

function getDilemmaVoteTurnName(state) {
  return state.dilemmaVoteTurn ? getHouseDisplayName(state, state.dilemmaVoteTurn) : "";
}

function getDilemmaProgressLabel(state) {
  if (state.phase !== "complete") {
    return "-";
  }

  const dilemma = normalizeDilemmaRecord(state.dilemma);

  if (isDilemmaBlank(dilemma)) {
    return "작성 필요";
  }

  if (dilemma.selectedOutcome) {
    return "결과 선택 완료";
  }

  if (isDilemmaVotingComplete(state)) {
    return "결과 선택 필요";
  }

  return "투표 진행";
}

function isDilemmaVotingComplete(state) {
  if (state.phase !== "complete" || isDilemmaBlank(state.dilemma)) {
    return false;
  }

  const dilemma = normalizeDilemmaRecord(state.dilemma);

  if (dilemma.selectedOutcome) {
    return true;
  }

  return !state.dilemmaVoteTurn;
}

function getDilemmaVoteParticipants(state) {
  const houses = getVoteOrderHouses(state);

  if (state?.dilemmaLeader && houses.some((house) => house.id === state.dilemmaLeader)) {
    const houseById = new Map(houses.map((house) => [house.id, house]));
    return rotateOrderToHouse(houses.map((house) => house.id), state.dilemmaLeader)
      .map((houseId) => houseById.get(houseId))
      .filter(Boolean);
  }

  return houses;
}

function getVoteOrderHouses(state) {
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
    .map((houseId) => housesById.get(houseId) || HOUSE_CATALOG.find((house) => house.id === houseId))
    .filter(Boolean)
    .slice(0, REQUIRED_HOUSE_COUNT);
}

function isVoteOrderSettingLocked(state) {
  if (!state || state.phase !== "complete" || isDilemmaBlank(state.dilemma)) {
    return false;
  }

  return !normalizeDilemmaRecord(state.dilemma).selectedOutcome;
}

function HouseProfileCard({
  busy,
  house,
  progress,
  showCrest = true,
  showSectionLabel = true,
  onSaveAlignmentReward,
  onSaveAlignmentOrder,
}) {
  const normalizedProgress = useMemo(() => normalizeHouseProgress(progress), [progress]);

  if (!house) {
    return null;
  }

  return (
    <section className={`house-profile-card${showCrest ? "" : " no-crest"}`} aria-labelledby="house-profile-title">
      {showCrest ? (
        <div className="house-profile-crest" aria-hidden="true">
          <HouseIcon motif={house.motif} />
        </div>
      ) : null}
      <div className="house-profile-main">
        <div className="house-profile-heading">
          <div className="house-profile-title-row">
            {!showCrest ? (
              <span className="house-heading-crest" aria-hidden="true">
                <HouseIcon motif={house.motif} />
              </span>
            ) : null}
            <div>
              {showSectionLabel ? <p className="section-label">가문 상세</p> : null}
              <h2 id="house-profile-title">{getHouseKoreanName(house)}</h2>
            </div>
          </div>
          <span className="house-profile-number">#{String(house.number).padStart(2, "0")}</span>
        </div>
        {house.profile ? <p className="house-profile-story">{house.profile}</p> : null}
        <div className="house-profile-grid">
          <HouseProfileField label="서사 목표" value={house.goal} />
          <HouseProfileField label="선호 의제" value={getAlignmentKoreanLabels(house.alignments).join(" / ")} />
        </div>
        <HouseAlignmentTrack
          alignments={house.alignments || []}
          busy={busy}
          progress={normalizedProgress}
          onSaveAlignmentReward={onSaveAlignmentReward}
          onSaveAlignmentOrder={onSaveAlignmentOrder}
        />
      </div>
    </section>
  );
}

function HouseAlignmentTrack({ alignments, busy, progress, onSaveAlignmentReward, onSaveAlignmentOrder }) {
  const favoriteAlignments = new Set(alignments);
  const alignmentByAgendaId = useMemo(
    () => new Map(houseAlignmentRows.map((alignment) => [alignment.agendaId, alignment])),
    [],
  );
  const savedOrder = useMemo(() => normalizeHouseAlignmentOrder(progress?.alignmentOrder), [progress?.alignmentOrder]);
  const [localOrder, setLocalOrder] = useState(savedOrder);
  const dragDisabled = busy || !onSaveAlignmentOrder;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    setLocalOrder((current) => (arraysMatch(current, savedOrder) ? current : savedOrder));
  }, [savedOrder]);

  const handleDragEnd = useCallback(
    async (event) => {
      const { active, over } = event;

      if (dragDisabled || !over || active.id === over.id) {
        return;
      }

      const oldIndex = localOrder.indexOf(active.id);
      const newIndex = localOrder.indexOf(over.id);

      if (oldIndex < 0 || newIndex < 0) {
        return;
      }

      const nextOrder = arrayMove(localOrder, oldIndex, newIndex);
      setLocalOrder(nextOrder);
      const result = await onSaveAlignmentOrder?.(nextOrder);

      if (!result) {
        setLocalOrder(savedOrder);
      }
    },
    [dragDisabled, localOrder, onSaveAlignmentOrder, savedOrder],
  );

  const rows = localOrder.map((agendaId) => alignmentByAgendaId.get(agendaId)).filter(Boolean);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={localOrder} strategy={rectSortingStrategy}>
        <div className="house-alignment-track" aria-label="비밀 의제 성향별 달성 보상">
          {rows.map((alignment) => (
            <SortableHouseAlignmentRewardRow
              alignment={alignment}
              busy={busy}
              disabled={dragDisabled}
              key={alignment.agendaId}
              preferred={favoriteAlignments.has(alignment.id)}
              reward={progress?.alignmentRewards?.[alignment.agendaId]}
              onSaveAlignmentReward={onSaveAlignmentReward}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableHouseAlignmentRewardRow({ alignment, busy, disabled, preferred, reward, onSaveAlignmentReward }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: alignment.agendaId,
    disabled,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <HouseAlignmentRewardRow
      alignment={alignment}
      busy={busy}
      dragProps={disabled ? null : { ...attributes, ...listeners }}
      dragging={isDragging}
      preferred={preferred}
      refCallback={setNodeRef}
      reward={reward}
      style={style}
      onSaveAlignmentReward={onSaveAlignmentReward}
    />
  );
}

function HouseAlignmentRewardRow({
  alignment,
  busy,
  dragProps,
  dragging = false,
  preferred,
  refCallback,
  reward,
  style,
  onSaveAlignmentReward,
}) {
  return (
    <div
      className={`house-alignment-row${preferred ? " preferred" : ""}${dragging ? " dragging" : ""}${
        dragProps ? " draggable" : ""
      }`}
      ref={refCallback}
      style={style}
      {...(dragProps || {})}
    >
      <span className="house-alignment-title">
        {alignment.koreanLabel}
      </span>
      <AlignmentRewardInlineEditor
        alignment={alignment}
        busy={busy}
        reward={reward}
        onSaveAlignmentReward={onSaveAlignmentReward}
      />
    </div>
  );
}

function AlignmentRewardInlineEditor({ alignment, busy, reward, onSaveAlignmentReward }) {
  const normalizedReward = normalizeAlignmentReward(reward);
  const [draft, setDraft] = useState(() => ({
    crownType: normalizedReward.crownType || "prestige",
    count: normalizedReward.count || 0,
  }));

  useEffect(() => {
    setDraft({
      crownType: normalizedReward.crownType || "prestige",
      count: normalizedReward.count || 0,
    });
  }, [normalizedReward.count, normalizedReward.crownType]);

  useEffect(() => {
    if (busy || !onSaveAlignmentReward) {
      return undefined;
    }

    const count = clampCounter(draft.count, alignmentRewardCountMax);
    const nextReward = {
      crownType: count > 0 ? draft.crownType : "",
      count,
    };
    const rewardChanged =
      nextReward.crownType !== normalizedReward.crownType || nextReward.count !== normalizedReward.count;

    if (!rewardChanged || (nextReward.count === 0 && normalizedReward.count === 0)) {
      return undefined;
    }

    const autosaveId = window.setTimeout(() => {
      onSaveAlignmentReward?.(alignment.agendaId, nextReward);
    }, 450);

    return () => window.clearTimeout(autosaveId);
  }, [
    alignment.agendaId,
    busy,
    draft.count,
    draft.crownType,
    normalizedReward.count,
    normalizedReward.crownType,
    onSaveAlignmentReward,
  ]);

  return (
    <HouseAlignmentRewardControls
      alignment={alignment}
      busy={busy}
      draft={draft}
      setDraft={setDraft}
    />
  );
}

function HouseAlignmentRewardControls({ alignment, busy, draft, setDraft }) {
  return (
    <div className="house-alignment-reward-controls" aria-label={`${alignment.koreanLabel} 왕관 보상`}>
      <div className="alignment-crown-toggle" role="group" aria-label={`${alignment.koreanLabel} 왕관 종류`}>
        {alignmentRewardTypes.map((rewardType) => (
          <button
            className={`alignment-crown-button tone-${rewardType.tone}${
              draft.crownType === rewardType.id ? " selected" : ""
            }`}
            key={rewardType.id}
            type="button"
            title={rewardType.label}
            aria-label={rewardType.label}
            aria-pressed={draft.crownType === rewardType.id}
            onClick={() =>
              setDraft((current) => ({
                ...current,
                crownType: rewardType.id,
              }))
            }
            disabled={busy}
          >
            <TokenIcon type={rewardType.icon} />
          </button>
        ))}
      </div>
      <input
        className="alignment-reward-count"
        min="0"
        max={alignmentRewardCountMax}
        type="number"
        value={draft.count}
        aria-label={`${alignment.koreanLabel} 왕관 개수`}
        onChange={(event) =>
          setDraft((current) => ({
            ...current,
            count: clampCounter(event.target.valueAsNumber, alignmentRewardCountMax),
          }))
        }
        disabled={busy}
      />
    </div>
  );
}

function HouseProfileField({ label, value }) {
  return (
    <div className="house-profile-field">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

function HouseCrestBadge({ house, className = "", tooltipLabel, ariaLabel }) {
  const label = tooltipLabel || getHouseHoverLabel(house);
  const classes = ["house-crest-badge", className].filter(Boolean).join(" ");

  return (
    <span
      className={classes}
      role="img"
      title={label}
      data-house-tooltip={label}
      aria-label={ariaLabel || label}
    >
      <HouseIcon motif={house?.motif} />
    </span>
  );
}

function StatusItem({ icon, label, value, splitParenthetical = false }) {
  const parentheticalValue =
    splitParenthetical && typeof value === "string" ? splitParentheticalStatusValue(value) : null;

  return (
    <div className="status-item">
      <span className="status-icon" aria-hidden="true">
        <TokenIcon type={icon} />
      </span>
      <span>{label}</span>
      <strong>
        {parentheticalValue ? (
          <>
            <span className="status-value-main">{parentheticalValue.main}</span>
            <span className="status-value-detail">({parentheticalValue.detail})</span>
          </>
        ) : (
          value
        )}
      </strong>
    </div>
  );
}

function splitParentheticalStatusValue(value) {
  const match = value.match(/^(.+?)\s+\(([^)]+)\)$/);

  if (!match) {
    return null;
  }

  return {
    main: match[1],
    detail: match[2],
  };
}

function TurnTrack({ houses, draftOrder, turn, phase }) {
  const claimedHouses = (houses || []).filter((house) => house.hasPassword);
  const orderedHouses = draftOrder?.length
    ? draftOrder.map((houseId) => houses?.find((house) => house.id === houseId)).filter(Boolean)
    : claimedHouses;
  const nodes = orderedHouses.length ? orderedHouses : HOUSE_CATALOG.slice(0, REQUIRED_HOUSE_COUNT);

  return (
    <div
      className="turn-track"
      aria-label="의회 차례"
      style={{ gridTemplateColumns: `repeat(${Math.max(nodes.length, 1)}, 34px)` }}
    >
      {nodes.map((house) => {
        const selected = turn === house.id;
        const done = Boolean(house.hasChosen);
        const statusLabel = [
          getHouseHoverLabel(house),
          selected ? "현재 차례" : "",
          done ? "의제 선택 완료" : "",
        ]
          .filter(Boolean)
          .join(", ");

        return (
          <HouseCrestBadge
            house={house}
            className={`turn-node${selected ? " current" : ""}${done ? " done" : ""}${phase === "house-select" ? " claimed" : ""}`}
            key={house.id}
            ariaLabel={statusLabel}
          />
        );
      })}
    </div>
  );
}

function VoteOrderTrack({ houses, leaderHouseId, moderatorHouseId, turn }) {
  if (!houses.length) {
    return null;
  }

  return (
    <div className="vote-order-track" aria-label="딜레마 투표 순서">
      <div className="vote-order-track-ring">
        {houses.map((house, index) => {
          const leader = house.id === leaderHouseId;
          const moderator = house.id === moderatorHouseId;
          const current = house.id === turn;
          const statusLabel = [
            `${index + 1}번째 ${getHouseHoverLabel(house)}`,
            leader ? "리더" : "",
            moderator ? "중재자" : "",
            current ? "현재 차례" : "",
          ]
            .filter(Boolean)
            .join(", ");

          return (
            <HouseCrestBadge
              house={house}
              className={`vote-order-track-node${leader ? " leader" : ""}${moderator ? " moderator" : ""}${current ? " current" : ""}`}
              key={house.id}
              ariaLabel={statusLabel}
            />
          );
        })}
      </div>
      <div className="vote-order-track-legend">
        <span><i className="leader" /> 리더</span>
        <span><i className="moderator" /> 중재자</span>
        <span><i className="current" /> 현재 차례</span>
      </div>
    </div>
  );
}
function GameMessage({ state }) {
  const text = useMemo(() => {
    if (state.phase === "house-select") {
      const remaining = Math.max((state.requiredHouseCount || REQUIRED_HOUSE_COUNT) - (state.claimedHouseCount || 0), 0);
      return remaining
        ? `${remaining}개 가문이 더 선택하면 명망이 낮은 가문부터 비밀 의제 드래프트를 시작합니다. 명망 동률에서는 가문 번호가 높은 쪽이 더 높은 명망이므로 낮은 번호가 먼저입니다.`
        : "좌석이 모두 찼습니다. 첫 가문이 의제 폐기를 시작합니다.";
    }

    if (state.phase === "complete") {
      if (!isDilemmaBlank(state.dilemma)) {
        const dilemma = normalizeDilemmaRecord(state.dilemma);
        const voteTurnName = getDilemmaVoteTurnName(state);

        if (dilemma.selectedOutcome) {
          return `${dilemmaOutcomeLabels[dilemma.selectedOutcome]} 결과가 선택되었습니다. 딜레마 후속 처리를 수기로 기록하세요.`;
        }

        if (state.canVoteDilemma) {
          return "내 투표 차례입니다. 찬성, 반대, 기권 중 하나를 선택하세요.";
        }

        return voteTurnName
          ? `${voteTurnName} 가문의 투표 차례입니다.`
          : "로그인 중인 모든 가문이 투표했습니다. 결과와 후속 처리를 직접 기록하세요.";
      }

      return "리더 토큰 보유자와 중재자를 지정한 뒤 이번 라운드의 딜레마를 작성하세요.";
    }

    if (state.canDiscard) {
      return state.randomDiscardEnabled
        ? `${getHouseDisplayName(state, state.currentHouseId)} 차례입니다. 보이는 6장 중 1장을 무작위로 폐기하고 남은 의제를 받습니다.`
        : `${getHouseDisplayName(state, state.currentHouseId)} 차례입니다. 보이는 6장 중 폐기할 의제 1장을 직접 고르세요.`;
    }

    if (state.canChoose) {
      return `${getHouseDisplayName(state, state.currentHouseId)} 차례입니다. 남은 비밀 의제 중 하나를 고르세요.`;
    }

    if (state.ownChoice) {
      return "선택 완료. 다른 가문의 차례에는 남은 의제가 보이지 않습니다.";
    }

    return `${getHouseDisplayName(state, state.currentHouseId)} 대기 중. 지금은 ${getHouseDisplayName(state, state.turn)} 차례이며 남은 의제가 보이지 않습니다.`;
  }, [state]);

  return <p className="message">{text}</p>;
}
function DilemmaVotingPanel({ state, busy, mutate }) {
  const dilemma = useMemo(() => normalizeDilemmaRecord(state.dilemma), [state.dilemma]);
  const votes = useMemo(() => normalizeDilemmaVotes(dilemma.votes), [dilemma.votes]);
  const participants = useMemo(() => getDilemmaVoteParticipants(state), [state]);
  const ownVote = normalizeDilemmaVote(votes[state.currentHouseId]);
  const ownPowerTokens = normalizeCounter(state.ownInventory?.powerTokens, inventoryCounterMax.powerTokens, 0);
  const [side, setSide] = useState(ownVote.side || "aye");
  const [powerTokens, setPowerTokens] = useState(Math.min(ownVote.powerTokens || 1, ownPowerTokens));
  const [statusText, setStatusText] = useState("");
  const selectedOutcome = dilemma.selectedOutcome;
  const votedCount = participants.filter((house) => votes[house.id]?.side).length;
  const allVoted = participants.length > 0 && participants.every((house) => Boolean(votes[house.id]?.side));
  const voteTurnName = getDilemmaVoteTurnName(state);
  const votingComplete = !selectedOutcome && !state.dilemmaVoteTurn && allVoted;
  const ayePower = sumDilemmaVotes(votes, participants, "aye");
  const nayPower = sumDilemmaVotes(votes, participants, "nay");
  const passCount = participants.filter((house) => votes[house.id]?.side === "pass").length;
  const leaderName = getHouseDisplayName(state, state.dilemmaLeader);
  const moderatorName = getHouseDisplayName(state, state.dilemmaModerator);
  const ayeLeader = formatDilemmaSideLeader(votes, participants, "aye");
  const nayLeader = formatDilemmaSideLeader(votes, participants, "nay");
  const advantageText = formatDilemmaVoteAdvantage(ayePower, nayPower);
  const activePower = side === "pass" ? 0 : Math.min(powerTokens, ownPowerTokens);
  const hasValidWager = side === "pass" || activePower >= 1;
  const canSaveVote = Boolean(state.currentHouseId) && state.canVoteDilemma && !busy && !selectedOutcome && side && hasValidWager;
  const canApply = !busy && votingComplete;

  useEffect(() => {
    const nextVote = normalizeDilemmaVote(votes[state.currentHouseId]);
    setSide(nextVote.side || "aye");
    setPowerTokens(Math.min(nextVote.powerTokens || 1, ownPowerTokens));
  }, [ownPowerTokens, state.currentHouseId, votes]);

  const updateSide = (nextSide) => {
    setSide(nextSide);

    if (nextSide === "pass") {
      setPowerTokens(0);
    } else if (powerTokens < 1) {
      setPowerTokens(Math.min(1, ownPowerTokens));
    }
  };

  const adjustPower = (amount) => {
    setPowerTokens((current) => Math.max(0, Math.min(ownPowerTokens, current + amount)));
  };

  const saveVote = async () => {
    setStatusText("");
    const result = await mutate({
      action: "saveDilemmaVote",
      vote: {
        side,
        powerTokens: activePower,
      },
    });

    setStatusText(result ? "투표를 저장했습니다." : "투표를 저장하지 못했습니다.");
  };

  const applyVotes = async () => {
    setStatusText("");
    const result = await mutate({ action: "applyDilemmaVotes" });
    setStatusText(result ? "투표 집계를 기록했습니다." : "투표 집계를 기록하지 못했습니다.");
  };

  return (
    <div className={`dilemma-vote-panel${selectedOutcome ? " applied" : ""}`}>
      <div className="dilemma-vote-summary">
        <span>{selectedOutcome ? `${dilemmaOutcomeLabels[selectedOutcome]} 선택됨` : votingComplete ? "투표 완료" : "투표 진행"}</span>
        <strong>
          {selectedOutcome
            ? `찬성 ${ayePower} · 반대 ${nayPower} · 기권 ${passCount}`
            : votingComplete
              ? "참여 중인 모든 가문이 투표했습니다."
              : voteTurnName
                ? `${voteTurnName} 차례`
                : `${votedCount}/${participants.length || 0} 투표`}
        </strong>
      </div>
      <div className="dilemma-vote-role-grid" aria-label="투표 역할과 선두">
        <span><small>리더</small><strong>{leaderName || "미지정"}</strong></span>
        <span><small>중재자</small><strong>{moderatorName || "미지정"}</strong></span>
        <span><small>찬성 선두</small><strong>{ayeLeader}</strong></span>
        <span><small>반대 선두</small><strong>{nayLeader}</strong></span>
        <span className="wide"><small>현재 우세</small><strong>{advantageText}</strong></span>
      </div>
      {!selectedOutcome && !state.canVoteDilemma && !votingComplete ? (
        <p className="dilemma-vote-turn-note">내 차례가 오면 투표 선택지가 표시됩니다.</p>
      ) : null}
      {!selectedOutcome && state.canVoteDilemma ? (
        <>
          <div className="dilemma-vote-options" role="group" aria-label="딜레마투표 선택">
            {[
              { id: "aye", label: "찬성", tone: "aye" },
              { id: "nay", label: "반대", tone: "nay" },
              { id: "pass", label: "기권", tone: "pass" },
            ].map((option) => (
              <button
                className={`dilemma-vote-option tone-${option.tone}${side === option.id ? " selected" : ""}`}
                type="button"
                key={option.id}
                onClick={() => updateSide(option.id)}
                disabled={busy}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="dilemma-vote-wager">
            <span className="counter-icon" aria-hidden="true">
              <TokenIcon type="power" />
            </span>
            <span className="counter-label">권력 토큰</span>
            <div className="counter-controls">
              <button
                className="stepper-button compact"
                type="button"
                aria-label="권력 토큰 줄이기"
                onClick={() => adjustPower(-1)}
                disabled={busy || side === "pass" || activePower <= 0}
              >
                <TokenIcon type="minus" />
              </button>
              <output aria-label="투표에 거는 권력 토큰">
                {side === "pass" ? 0 : activePower}
                <span>/{ownPowerTokens}</span>
              </output>
              <button
                className="stepper-button compact"
                type="button"
                aria-label="권력 토큰 늘리기"
                onClick={() => adjustPower(1)}
                disabled={busy || side === "pass" || activePower >= ownPowerTokens}
              >
                <TokenIcon type="plus" />
              </button>
            </div>
          </div>
        </>
      ) : null}
      {votingComplete ? <p className="dilemma-vote-turn-note">찬성/반대 권력 합계를 확인하고 결과를 직접 선택하세요.</p> : null}
      {!selectedOutcome && (state.canVoteDilemma || votingComplete) ? (
        <div className="dilemma-vote-actions">
          {state.canVoteDilemma ? (
            <button className="secondary-button compact" type="button" onClick={saveVote} disabled={!canSaveVote}>
              투표 저장
            </button>
          ) : null}
          {votingComplete ? (
            <button className="primary-button compact" type="button" onClick={applyVotes} disabled={!canApply}>
              집계 기록
            </button>
          ) : null}
        </div>
      ) : null}
      {statusText ? <p className="dilemma-vote-status" aria-live="polite">{statusText}</p> : null}
    </div>
  );
}

function isWaitingForDraft(state) {
  if (!state) {
    return false;
  }

  if (state.phase === "house-select") {
    return Boolean(state.currentHouseId);
  }

  return Boolean((state.phase === "discard" || state.phase === "choose") && !state.canDiscard && !state.canChoose);
}

function CarrotWaitAction() {
  return (
    <div className="carrot-wait-action">
      <button className="carrot-button" type="button" onClick={shakeCarrot}>
        <span className="carrot-button-icon" aria-hidden="true">
          !
        </span>
        <span className="carrot-button-label">흔들거나 눌러주세요</span>
      </button>
    </div>
  );
}

function formatAgendaTitle(agenda) {
  return agenda?.name || "";
}

function formatAgendaEnglishTitle(agenda) {
  return agenda?.englishName || "";
}

function AgendaTitle({ agenda }) {
  const title = formatAgendaTitle(agenda);
  const englishTitle = formatAgendaEnglishTitle(agenda);

  return (
    <>
      <span className="agenda-title-korean">{title}</span>
      {englishTitle && englishTitle !== title ? <span className="agenda-title-english">{englishTitle}</span> : null}
    </>
  );
}

function PersonalInventoryPanel({
  inventory,
  progress,
  house,
  ownChoice,
  dilemma,
  dilemmaHistory,
  dilemmaLeader,
  dilemmaModerator,
  houses,
  houseId,
  busy,
  mutate,
  onSaveAlignmentReward,
  onSaveAlignmentOrder,
  onOpenSecretAgendaGuide,
}) {
  const serverInventory = useMemo(() => normalizeInventory(inventory), [inventory]);
  const serverProgress = useMemo(() => normalizeHouseProgress(progress), [progress]);
  const serverDilemma = useMemo(() => normalizeDilemmaRecord(dilemma), [dilemma]);
  const [draft, setDraft] = useState(serverInventory);
  const [progressDraft, setProgressDraft] = useState(serverProgress);
  const [ledgerSaveStatus, setLedgerSaveStatus] = useState("saved");
  const [dilemmaDialogOpen, setDilemmaDialogOpen] = useState(false);
  const [dilemmaRoleDialogOpen, setDilemmaRoleDialogOpen] = useState(false);
  const [dilemmaDraft, setDilemmaDraft] = useState(() => createDilemmaDraft(serverDilemma));
  const [dilemmaEditToken, setDilemmaEditToken] = useState("");
  const [dilemmaPhotoError, setDilemmaPhotoError] = useState("");
  const [dilemmaPhotoBusy, setDilemmaPhotoBusy] = useState(false);
  const dilemmaVotingComplete = useMemo(
    () => isDilemmaVoteCompleteForPublish(serverDilemma, houses),
    [houses, serverDilemma],
  );
  const dilemmaIsBlank = useMemo(() => isDilemmaBlank(serverDilemma), [serverDilemma]);
  const [achievementEditor, setAchievementEditor] = useState(null);
  const [achievementLegendOpen, setAchievementLegendOpen] = useState(false);
  const dilemmaEditButtonRef = useRef(null);
  const dilemmaRoleButtonRef = useRef(null);
  const achievementEditButtonRef = useRef(null);
  const achievementLegendButtonRef = useRef(null);
  const ledgerAutosaveTimerRef = useRef(null);
  const ledgerAutosaveInFlightRef = useRef(false);
  const ledgerAutosaveQueuedRef = useRef(false);
  const latestLedgerDraftRef = useRef({
    draft: serverInventory,
    progressDraft: serverProgress,
    serverProgress,
    inventoryDirty: false,
    progressDirty: false,
  });
  const inventoryDirty = useMemo(() => !inventoriesMatch(draft, serverInventory), [draft, serverInventory]);
  const progressDirty = useMemo(() => !progressMatches(progressDraft, serverProgress), [progressDraft, serverProgress]);
  const isDirty = inventoryDirty || progressDirty;

  useEffect(() => {
    if (!inventoryDirty) {
      setDraft(serverInventory);
    }
  }, [inventoryDirty, serverInventory]);

  useEffect(() => {
    if (!progressDirty || progressMatchesExceptAlignmentRewards(progressDraft, serverProgress)) {
      setProgressDraft(serverProgress);
    }
  }, [progressDirty, progressDraft, serverProgress]);

  useEffect(() => {
    if (!dilemmaDialogOpen) {
      setDilemmaDraft(createDilemmaDraft(serverDilemma));
      setDilemmaPhotoError("");
      setDilemmaPhotoBusy(false);
    }
  }, [dilemmaDialogOpen, serverDilemma]);

  useEffect(() => {
    latestLedgerDraftRef.current = {
      draft,
      progressDraft,
      serverProgress,
      inventoryDirty,
      progressDirty,
    };
  }, [draft, inventoryDirty, progressDirty, progressDraft, serverProgress]);

  const runLedgerAutosave = useCallback(async () => {
    if (!houseId) {
      setLedgerSaveStatus("saved");
      return;
    }

    if (ledgerAutosaveInFlightRef.current) {
      ledgerAutosaveQueuedRef.current = true;
      return;
    }

    const snapshot = latestLedgerDraftRef.current;

    if (!snapshot.inventoryDirty && !snapshot.progressDirty) {
      setLedgerSaveStatus("saved");
      return;
    }

    ledgerAutosaveInFlightRef.current = true;
    ledgerAutosaveQueuedRef.current = false;
    setLedgerSaveStatus("saving");

    let saved = true;

    if (snapshot.inventoryDirty) {
      const inventoryResult = await mutate({ action: "saveInventory", inventory: snapshot.draft });
      saved = Boolean(inventoryResult);
    }

    if (saved && latestLedgerDraftRef.current.progressDirty) {
      const progressPayload = {
        ...latestLedgerDraftRef.current.progressDraft,
        alignmentRewards: latestLedgerDraftRef.current.serverProgress.alignmentRewards,
      };
      const progressResult = await mutate({
        action: "saveHouseProgress",
        progress: progressPayload,
      });
      saved = Boolean(progressResult);
    }

    ledgerAutosaveInFlightRef.current = false;

    if (!saved) {
      setLedgerSaveStatus("error");
      window.clearTimeout(ledgerAutosaveTimerRef.current);
      ledgerAutosaveTimerRef.current = window.setTimeout(runLedgerAutosave, ledgerAutosaveRetryDelayMs);
      return;
    }

    setLedgerSaveStatus("saved");

    if (ledgerAutosaveQueuedRef.current) {
      ledgerAutosaveQueuedRef.current = false;
      window.clearTimeout(ledgerAutosaveTimerRef.current);
      ledgerAutosaveTimerRef.current = window.setTimeout(runLedgerAutosave, 0);
    }
  }, [houseId, mutate]);

  useEffect(() => {
    window.clearTimeout(ledgerAutosaveTimerRef.current);

    if (!isDirty) {
      setLedgerSaveStatus("saved");
      return undefined;
    }

    setLedgerSaveStatus((current) => (current === "error" ? current : "pending"));
    ledgerAutosaveTimerRef.current = window.setTimeout(runLedgerAutosave, ledgerAutosaveDelayMs);

    return () => window.clearTimeout(ledgerAutosaveTimerRef.current);
  }, [draft, isDirty, progressDraft, runLedgerAutosave]);

  useEffect(() => {
    return () => window.clearTimeout(ledgerAutosaveTimerRef.current);
  }, []);

  const adjustCounter = (counter, delta) => {
    setDraft((current) => ({
      ...current,
      [counter.id]: clampCounter(current[counter.id] + delta, counter.max),
    }));
  };

  const toggleOpenAgendaToken = (polarity, resourceId) => {
    setProgressDraft((current) => {
      const currentTokens = current.openAgendaTokens[polarity] || [];
      const hasToken = currentTokens.includes(resourceId);
      const nextTokens = hasToken
        ? currentTokens.filter((token) => token !== resourceId)
        : currentTokens.length < openAgendaTokenLimit
          ? [...currentTokens, resourceId]
          : currentTokens;

      return {
        ...current,
        openAgendaTokens: {
          ...current.openAgendaTokens,
          [polarity]: nextTokens,
        },
      };
    });
  };

  const toggleNarrativeAchievement = () => {
    setProgressDraft((current) => {
      const max = getAchievementRequiredCount(current.narrativeAchievementDetail);
      const complete = !current.narrativeAchievement;

      return {
        ...current,
        narrativeAchievement: complete,
        narrativeAchievementCount: complete ? max : 0,
      };
    });
  };

  const adjustNarrativeAchievement = (delta) => {
    setProgressDraft((current) => {
      const max = getAchievementRequiredCount(current.narrativeAchievementDetail);
      const nextCount = clampCounter((current.narrativeAchievementCount || 0) + delta, max);

      return {
        ...current,
        narrativeAchievement: nextCount >= max,
        narrativeAchievementCount: nextCount,
      };
    });
  };

  const adjustHouseAchievement = (index, delta) => {
    setProgressDraft((current) => ({
      ...current,
      houseAchievements: current.houseAchievements.map((value, itemIndex) =>
        itemIndex === index
          ? clampCounter(value + delta, getAchievementRequiredCount(current.houseAchievementDetails[itemIndex]))
          : value,
      ),
    }));
  };

  const toggleHouseAchievementComplete = (index) => {
    setProgressDraft((current) => ({
      ...current,
      houseAchievementComplete: current.houseAchievementComplete.map((value, itemIndex) =>
        itemIndex === index ? !value : value,
      ),
    }));
  };

  const adjustAlignmentAchievement = (agendaId, delta) => {
    setProgressDraft((current) => ({
      ...current,
      alignmentAchievements: {
        ...current.alignmentAchievements,
        [agendaId]: clampCounter((current.alignmentAchievements[agendaId] || 0) + delta, houseAlignmentMarkMax),
      },
    }));
  };

  const openAchievementEditor = (event, kind, index = -1) => {
    const detail =
      kind === "narrative"
        ? progressDraft.narrativeAchievementDetail
        : progressDraft.houseAchievementDetails[index];

    achievementEditButtonRef.current = event.currentTarget;
    setAchievementEditor({
      kind,
      index,
    title: kind === "narrative" ? "서사 도전 과제" : houseAchievementRows[index]?.label || "도전 과제",
      draft: normalizeAchievementDetail(detail, kind === "narrative" ? 1 : houseAchievementMarkMax),
    });
  };

  const updateAchievementEditorDraft = (field, value) => {
    setAchievementEditor((current) =>
      current
        ? {
            ...current,
            draft: updateAchievementDetailDraft(current.draft, field, value),
          }
        : current,
    );
  };

  const cancelAchievementEditor = () => {
    setAchievementEditor(null);
  };

  const saveAchievementEditor = () => {
    if (!achievementEditor) {
      return;
    }

    const nextDetail = normalizeAchievementDetail(achievementEditor.draft, achievementEditor.kind === "narrative" ? 1 : houseAchievementMarkMax);

    setProgressDraft((current) => {
      if (achievementEditor.kind === "narrative") {
        const nextCount = clampCounter(current.narrativeAchievementCount || 0, nextDetail.requiredCount);

        return {
          ...current,
          narrativeAchievement: nextCount >= nextDetail.requiredCount,
          narrativeAchievementCount: nextCount,
          narrativeAchievementDetail: nextDetail,
        };
      }

      return {
        ...current,
        houseAchievements: current.houseAchievements.map((value, itemIndex) =>
          itemIndex === achievementEditor.index ? clampCounter(value, nextDetail.requiredCount) : value,
        ),
        houseAchievementDetails: current.houseAchievementDetails.map((detail, itemIndex) =>
          itemIndex === achievementEditor.index ? nextDetail : detail,
        ),
      };
    });
    setAchievementEditor(null);
  };

  const applyGameStartDefaults = () => {
    if (!window.confirm(createGameStartDefaultsConfirmMessage())) {
      return;
    }

    setDraft(normalizeInventory(createDefaultInventory()));
    setProgressDraft(normalizeHouseProgress(createDefaultHouseProgress()));
    setLedgerSaveStatus("pending");
  };

  const openDilemmaRoleDialog = useCallback(() => {
    setDilemmaRoleDialogOpen(true);
  }, []);

  const closeDilemmaRoleDialog = useCallback(() => {
    setDilemmaRoleDialogOpen(false);
  }, []);

  const saveDilemmaRoles = useCallback(
    async (roles) => await mutate({ action: "saveDilemmaRoles", roles }),
    [mutate],
  );

  const beginDilemmaEdit = useCallback(async () => {
    if (!dilemma || !houseId) {
      return;
    }

    const result = await mutate({ action: "beginDilemmaEdit" });

    if (!result?.dilemmaEditToken) {
      return;
    }

    setDilemmaEditToken(result.dilemmaEditToken);
    setDilemmaDraft(createDilemmaDraft(result.state?.dilemma || serverDilemma));
    setDilemmaPhotoError("");
    setDilemmaDialogOpen(true);
  }, [dilemma, houseId, mutate, serverDilemma]);

  const updateDilemmaField = useCallback((field, value) => {
    setDilemmaDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }, []);

  const updateDilemmaOutcome = useCallback((side, field, value) => {
    setDilemmaDraft((current) => ({
      ...current,
      [side]: {
        ...current[side],
        [field]: value,
      },
    }));
  }, []);

  const cancelDilemmaEdit = useCallback(async () => {
    const token = dilemmaEditToken;
    setDilemmaDialogOpen(false);
    setDilemmaEditToken("");
    setDilemmaDraft(createDilemmaDraft(serverDilemma));
    setDilemmaPhotoError("");

    if (token) {
      await mutate({ action: "cancelDilemmaEdit", dilemmaEditToken: token });
    }
  }, [dilemmaEditToken, mutate, serverDilemma]);

  const addDilemmaPhotos = useCallback(async (files) => {
    const fileList = Array.from(files || []);

    if (!fileList.length) {
      return;
    }

    const remainingSlots = Math.max(dilemmaPhotoLimit - dilemmaDraft.photos.length, 0);

    if (remainingSlots <= 0) {
      setDilemmaPhotoError(`사진은 최대 ${dilemmaPhotoLimit}장까지 첨부할 수 있습니다.`);
      return;
    }

    setDilemmaPhotoBusy(true);
    setDilemmaPhotoError("");

    try {
      const nextPhotos = [];

      for (const file of fileList.slice(0, remainingSlots)) {
        nextPhotos.push(await createDilemmaPhotoAttachment(file));
      }

      setDilemmaDraft((current) => ({
        ...current,
        photos: [...current.photos, ...nextPhotos].slice(0, dilemmaPhotoLimit),
      }));
    } catch (photoError) {
      setDilemmaPhotoError(photoError.message || "사진을 첨부하지 못했습니다.");
    } finally {
      setDilemmaPhotoBusy(false);
    }
  }, [dilemmaDraft.photos.length]);

  const removeDilemmaPhoto = useCallback((photoId) => {
    setDilemmaDraft((current) => ({
      ...current,
      photos: current.photos.filter((photo) => photo.id !== photoId),
    }));
    setDilemmaPhotoError("");
  }, []);

  const saveDilemma = useCallback(async () => {
    if (!dilemmaEditToken) {
      return;
    }

    if (dilemmaPhotoBusy) {
      setDilemmaPhotoError("사진 처리 중입니다. 잠시 후 저장하세요.");
      return;
    }

    const dilemmaPayload = createDilemmaPayload(dilemmaDraft);

    if (!dilemmaVotingComplete) {
      dilemmaPayload.selectedOutcome = "";
      dilemmaPayload.resolutionNotes = "";
    }

    const result = await mutate({
      action: "saveDilemma",
      dilemmaEditToken,
      dilemma: dilemmaPayload,
    });

    if (result) {
      setDilemmaDialogOpen(false);
      setDilemmaEditToken("");
    }
  }, [dilemmaDraft, dilemmaEditToken, dilemmaVotingComplete, mutate]);

  const publishDilemma = useCallback(async () => {
    if (!houseId || !serverDilemma || isDilemmaBlank(serverDilemma)) {
      return;
    }

    await mutate({ action: "publishDilemma" });
  }, [houseId, mutate, serverDilemma]);

  const ledgerSaving = ledgerSaveStatus === "saving" || ledgerSaveStatus === "pending" || isDirty;
  const ledgerStatusText =
    ledgerSaveStatus === "error"
      ? "저장 실패"
      : ledgerSaving
        ? "저장 중"
        : "저장 완료";
  const ledgerStatusClassName = ledgerSaveStatus === "error" ? "error-pill" : ledgerSaving ? "dirty-pill" : "saved-pill";
  const ledgerStatusDescription =
    ledgerSaveStatus === "error"
      ? "자동 저장에 실패했습니다. 연결이 복구되면 다시 시도합니다."
      : ledgerSaving
        ? "변경사항을 의회 기록에 자동 저장하고 있습니다."
        : "의회 기록에 자동 저장된 값입니다.";
  const narrativeAchievementMax = getAchievementRequiredCount(progressDraft.narrativeAchievementDetail);
  const narrativeAchievementCount = clampCounter(
    progressDraft.narrativeAchievementCount || 0,
    narrativeAchievementMax,
  );
  const narrativeAchievementComplete = progressDraft.narrativeAchievement || narrativeAchievementCount >= narrativeAchievementMax;

  return (
    <>
      {dilemma ? (
        <DilemmaSummaryCard
          busy={busy}
          currentHouseId={houseId}
          dilemma={serverDilemma}
          leaderHouseId={dilemmaLeader}
          moderatorHouseId={dilemmaModerator}
          history={dilemmaHistory || []}
          houses={houses || []}
          editButtonRef={dilemmaEditButtonRef}
          roleButtonRef={dilemmaRoleButtonRef}
          onEdit={beginDilemmaEdit}
          onOpenRoleDialog={openDilemmaRoleDialog}
          onPublish={publishDilemma}
        />
      ) : null}

      <section className={`inventory-panel${house ? " has-house-profile" : ""}`} aria-labelledby="inventory-title">
      <div className="inventory-header">
        <div>
          <h2 id="inventory-title">가문 자원</h2>
        </div>
        <span className={ledgerStatusClassName} aria-live="polite">{ledgerStatusText}</span>
      </div>

      <div className="inventory-section resource-section">
        <div className="inventory-counter-group">
          <h3>토큰</h3>
          <div className="inventory-resource-grid">
            {tokenCounters.map((counter) => (
              <CounterRow
                key={counter.id}
                label={counter.label}
                value={draft[counter.id]}
                max={counter.max}
                icon={counter.icon}
                tone={counter.tone}
                disabled={busy}
                onDecrease={() => adjustCounter(counter, -1)}
                onIncrease={() => adjustCounter(counter, 1)}
              />
            ))}
          </div>
        </div>
        <div className="inventory-counter-group">
          <h3>승리 점수</h3>
          <div className="inventory-resource-grid score-ledger-grid">
            {scoreTrackCounters.map((counter) => (
              <ScoreTrackRow
                key={counter.id}
                label={counter.label}
                value={draft[counter.id]}
                max={counter.max}
                icon={counter.icon}
                tone={counter.tone}
                disabled={busy}
                onDecrease={() => adjustCounter(counter, -1)}
                onIncrease={() => adjustCounter(counter, 1)}
              />
            ))}
          </div>
        </div>
      </div>

      {house ? (
        <div className="inventory-section house-detail-section">
          <div className="house-detail-heading">
            <h3>상세</h3>
          </div>
          <HouseProfileCard
            busy={busy}
            house={house}
            progress={serverProgress}
            showCrest={false}
            showSectionLabel={false}
            onSaveAlignmentReward={onSaveAlignmentReward}
            onSaveAlignmentOrder={onSaveAlignmentOrder}
          />
        </div>
      ) : null}

      <div className={`inventory-section inventory-agenda-section${ownChoice ? " has-secret-agenda" : ""}`}>
        <h3 className="agenda-section-title">
          <span>의제</span>
          <span className="agenda-type-legend" aria-hidden="true">
            <span>
              <i className="agenda-type-dot common" />
              공통
            </span>
            {ownChoice ? (
              <span>
                <i className="agenda-type-dot secret" />
                비밀
              </span>
            ) : null}
          </span>
        </h3>
        <div className="agenda-progress-grid">
          <div className="agenda-progress-group open-agenda-group" aria-label="공통 의제">
            <div className="open-agenda-ledger">
              {openAgendaTokenTypes.map((type) => (
                <OpenAgendaTokenRow
                  key={type.id}
                  type={type}
                  selectedTokens={progressDraft.openAgendaTokens[type.id] || []}
                  disabled={busy}
                  onToggle={(resourceId) => toggleOpenAgendaToken(type.id, resourceId)}
                />
              ))}
            </div>
          </div>
          {ownChoice ? (
            <div className="agenda-progress-group inventory-secret-agenda" aria-label="비밀 의제">
              <OwnChoice agenda={ownChoice} onOpenSecretAgendaGuide={onOpenSecretAgendaGuide} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="inventory-section progress-section">
        <div className="achievement-progress-panel">
          <div className="achievement-panel-heading">
            <h3>업적</h3>
          </div>
          <div className="achievement-ledger">
            <div className="achievement-primary-list">
              <NarrativeAchievementRow
                complete={narrativeAchievementComplete}
                count={narrativeAchievementCount}
                detail={progressDraft.narrativeAchievementDetail}
                disabled={busy}
                max={narrativeAchievementMax}
                onDecrease={() => adjustNarrativeAchievement(-1)}
                onEdit={(event) => openAchievementEditor(event, "narrative")}
                onIncrease={() => adjustNarrativeAchievement(1)}
                onToggle={toggleNarrativeAchievement}
              />
              <div className="achievement-track-list">
                {houseAchievementRows.map((row) => (
                  <AchievementProgressRow
                    key={row.id}
                    label={row.label}
                    value={progressDraft.houseAchievements[row.id] || 0}
                    max={getAchievementRequiredCount(progressDraft.houseAchievementDetails[row.id])}
                    challengeComplete={progressDraft.houseAchievementComplete[row.id] === true}
                    detail={progressDraft.houseAchievementDetails[row.id]}
                    disabled={busy}
                    onDecrease={() => adjustHouseAchievement(row.id, -1)}
                    onEdit={(event) => openAchievementEditor(event, "challenge", row.id)}
                    onIncrease={() => adjustHouseAchievement(row.id, 1)}
                    onToggleChallengeComplete={() => toggleHouseAchievementComplete(row.id)}
                  />
                ))}
              </div>
            </div>
            <div className="alignment-achievement-list" aria-label="성향 업적">
              {houseAlignmentRows.map((alignment) => (
                <AlignmentProgressRow
                  key={alignment.agendaId}
                  alignment={alignment}
                  value={progressDraft.alignmentAchievements[alignment.agendaId] || 0}
                  max={houseAlignmentMarkMax}
                  reward={progressDraft.alignmentRewards[alignment.agendaId]}
                  disabled={busy}
                  onDecrease={() => adjustAlignmentAchievement(alignment.agendaId, -1)}
                  onIncrease={() => adjustAlignmentAchievement(alignment.agendaId, 1)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="inventory-actions">
        <span>{ledgerStatusDescription}</span>
        <div>
          <button className="ghost-button" type="button" onClick={applyGameStartDefaults} disabled={busy}>
            <TokenIcon type="reset" />
            기본값
          </button>
        </div>
      </div>
      <DilemmaRoleDialog
        busy={busy}
        houses={houses || []}
        leaderHouseId={dilemmaLeader}
        moderatorHouseId={dilemmaModerator}
        open={dilemmaRoleDialogOpen}
        restoreFocusRef={dilemmaRoleButtonRef}
        onClose={closeDilemmaRoleDialog}
        onSave={saveDilemmaRoles}
      />
      <DilemmaEditDialog
        busy={busy}
        draft={dilemmaDraft}
        isNewDilemma={dilemmaIsBlank}
        open={dilemmaDialogOpen}
        resolutionDisabled={!dilemmaVotingComplete}
        restoreFocusRef={dilemmaEditButtonRef}
        onCancel={cancelDilemmaEdit}
        onAddPhotos={addDilemmaPhotos}
        onFieldChange={updateDilemmaField}
        onOutcomeChange={updateDilemmaOutcome}
        onRemovePhoto={removeDilemmaPhoto}
        onSave={saveDilemma}
        photoBusy={dilemmaPhotoBusy}
        photoError={dilemmaPhotoError}
      />
      <AchievementEditDialog
        busy={busy}
        editor={achievementEditor}
        legendButtonRef={achievementLegendButtonRef}
        legendOpen={achievementLegendOpen}
        open={Boolean(achievementEditor)}
        restoreFocusRef={achievementEditButtonRef}
        onCancel={cancelAchievementEditor}
        onChange={updateAchievementEditorDraft}
        onOpenLegend={() => setAchievementLegendOpen(true)}
        onSave={saveAchievementEditor}
      />
      <SpecialAbilityLegendDialog
        open={achievementLegendOpen}
        restoreFocusRef={achievementLegendButtonRef}
        onClose={() => setAchievementLegendOpen(false)}
      />
      </section>
    </>
  );
}

function AchievementEditDialog({
  busy,
  editor,
  legendButtonRef,
  legendOpen,
  open,
  restoreFocusRef,
  onCancel,
  onChange,
  onOpenLegend,
  onSave,
}) {
  const dialogRef = useRef(null);
  const firstFieldRef = useRef(null);
  const effectEntryRefs = useRef(new Map());

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const focusFirstField = window.setTimeout(() => {
      firstFieldRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusFirstField);
      window.setTimeout(() => {
        restoreFocusRef?.current?.focus();
      }, 0);
    };
  }, [open, restoreFocusRef]);

  useEffect(() => {
    if (!open || legendOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(
        dialogRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element instanceof HTMLElement && element.getClientRects().length > 0);

      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [legendOpen, onCancel, open]);

  if (!open || !editor) {
    return null;
  }

  const submit = (event) => {
    event.preventDefault();
    onSave();
  };
  const effectEntries = normalizeAchievementEffectEntries(
    editor.draft.effectEntries,
    editor.draft.effects,
    editor.draft.effectText,
    editor.draft.effectIcon,
    editor.draft.effectAmount,
  );
  const canAddEffectEntry = effectEntries.length < achievementEffectEntryMax;
  const setEffectEntryRef = (index) => (node) => {
    if (node) {
      effectEntryRefs.current.set(index, node);
    } else {
      effectEntryRefs.current.delete(index);
    }
  };
  const focusEffectEntryToken = (index, token) => {
    const field = effectEntryRefs.current.get(index);

    if (!field) {
      return;
    }

    field.focus();
    field.setSelectionRange(token.start, token.end);
  };

  return (
    <div className="session-end-overlay" role="presentation">
      <section
        ref={dialogRef}
        className="achievement-dialog"
        aria-labelledby="achievement-dialog-title"
        aria-modal="true"
        role="dialog"
      >
        <div className="session-end-heading">
          <span className="session-end-seal" aria-hidden="true">
            <TokenIcon type="seal" />
          </span>
          <div>
            <p className="section-label">가문 업적</p>
            <div className="achievement-dialog-title-row">
              <h2 id="achievement-dialog-title">{editor.title} 수정</h2>
              {onOpenLegend ? (
                <button
                  ref={legendButtonRef}
                  className="achievement-help-button"
                  type="button"
                  aria-haspopup="dialog"
                  aria-label="특수 능력 범례"
                  onClick={onOpenLegend}
                >
                  <TokenIcon type="help" />
                  특수 능력 범례
                </button>
              ) : null}
            </div>
          </div>
        </div>
        <form className="achievement-edit-form" onSubmit={submit}>
          <label className="dilemma-field">
            <span>조건 텍스트</span>
            <ValueMentionTextarea
              ref={firstFieldRef}
              value={editor.draft.conditionText}
              maxLength={achievementDetailTextMaxLength}
              onChange={(event) => onChange("conditionText", event.target.value)}
              placeholder="달성 조건을 입력합니다."
            />
          </label>
          <label className="dilemma-field achievement-required-field">
            <span>달성에 필요한 카운트</span>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              max={houseAchievementMarkMax}
              value={editor.draft.requiredCount}
              onChange={(event) => onChange("requiredCount", event.target.valueAsNumber)}
            />
          </label>
          <fieldset className="achievement-effect-fieldset">
            <legend>효과 메모</legend>
            <div className="achievement-effect-row-list">
              {effectEntries.length
                ? effectEntries.map((entry, index) => {
                  const option = getAchievementEffectOption(entry.icon);

                  return (
                    <div className="achievement-effect-row" key={`${entry.icon}-${index}`}>
                      <span className="achievement-effect-row-icon" aria-hidden="true">
                        <AchievementEffectOptionIcon option={option} />
                      </span>
                      <label className="achievement-effect-select-field">
                        <span>적용 시점</span>
                        <select
                          value={entry.icon}
                          onChange={(event) =>
                            onChange("effectEntryUpdate", { index, icon: event.target.value })
                          }
                        >
                          {achievementEffectOptions.map((effectOption) => (
                            <option key={effectOption.id} value={effectOption.id}>
                              {effectOption.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="achievement-effect-text-field">
                        <span>내용</span>
                        <ValueMentionTextarea
                          ref={setEffectEntryRef(index)}
                          multiline={false}
                          value={entry.text}
                          maxLength={achievementDetailTextMaxLength}
                          onChange={(event) =>
                            onChange("effectEntryUpdate", { index, text: event.target.value })
                          }
                          placeholder="@코인 +2 또는 @명망 +1"
                        />
                      </label>
                      <button
                        className="achievement-effect-remove-button"
                        type="button"
                        aria-label={`${option.label} 효과 메모 제거`}
                        onClick={() => onChange("effectEntryRemove", index)}
                      >
                        <TokenIcon type="trash" />
                      </button>
                      {hasMentionToken(entry.text) ? (
                        <MentionTokenView
                          className="mention-token-preview achievement-effect-row-preview"
                          onTokenClick={(token) => focusEffectEntryToken(index, token)}
                          text={entry.text}
                        />
                      ) : null}
                    </div>
                  );
                })
                : null}
            </div>
            <button
              className="ghost-button compact achievement-effect-add-button"
              type="button"
              disabled={!canAddEffectEntry}
              onClick={() => onChange("effectEntryAdd")}
            >
              <TokenIcon type="plus" />
              효과 메모 추가
            </button>
          </fieldset>
          <AchievementEffectMemo detail={editor.draft} />
          <div className="session-end-actions">
            <button className="ghost-button" type="button" onClick={onCancel} disabled={busy}>
              취소
            </button>
            <button className="primary-button" type="submit" disabled={busy}>
              <TokenIcon type="save" />
              저장
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function AchievementEffectMemo({ detail }) {
  const entries = normalizeAchievementEffectEntries(
    detail?.effectEntries,
    detail?.effects,
    detail?.effectText,
    detail?.effectIcon,
    detail?.effectAmount,
  );

  if (!entries.length) {
    return <span className="achievement-effect-memo muted">효과 메모가 없습니다.</span>;
  }

  return (
    <span className="achievement-effect-memo">
      {entries.map((entry, index) => (
        <AchievementEffectEntrySummary entry={entry} key={`${entry.icon}-${entry.text}-${index}`} />
      ))}
    </span>
  );
}

function AchievementEffectEntrySummary({ entry }) {
  const option = getAchievementEffectOption(entry?.icon);
  const hasText = Boolean(entry?.text);

  return (
    <span className="achievement-effect-entry-summary">
      {entry?.icon ? <AchievementEffectBadge effect={entry} /> : null}
      <span className="achievement-effect-entry-label">{option.label}:</span>
      {hasText ? (
        <MentionTokenView text={entry.text} />
      ) : (
        <span className="achievement-effect-entry-empty">내용 미입력</span>
      )}
    </span>
  );
}

function AchievementEffectBadges({ detail, effects }) {
  const normalizedEffects = effects || normalizeAchievementEffects(detail?.effects, detail?.effectIcon, detail?.effectAmount);

  return (
    <span className="achievement-effect-badges" aria-hidden="true">
      {normalizedEffects.map((effect) => (
        <AchievementEffectBadge effect={effect} key={effect.icon} />
      ))}
    </span>
  );
}

function AchievementEffectBadge({ effect }) {
  const effectIcon = normalizeAchievementEffectIcon(effect?.icon);
  const option = getAchievementEffectOption(effectIcon);

  if (!option.id) {
    return null;
  }

  return (
    <span className={`achievement-effect-badge tone-${option.id}`} aria-hidden="true">
      <AchievementEffectOptionIcon option={option} />
    </span>
  );
}

function MentionTokenView({ className = "", emptyText = "", onTokenClick, text }) {
  const parts = parseMentionText(text);
  const hasMention = parts.some((part) => part.type === "mention");

  if (!text && emptyText) {
    return <span className={`mention-token-view muted ${className}`.trim()}>{emptyText}</span>;
  }

  if (!hasMention) {
    return text ? <span className={`mention-token-view ${className}`.trim()}>{text}</span> : null;
  }

  return (
    <span className={`mention-token-view ${className}`.trim()}>
      {parts.map((part, index) => {
        if (part.type === "text") {
          return part.text ? <span key={`text-${index}`}>{part.text}</span> : null;
        }

        return (
          <MentionTokenChip
            key={`${part.kind}-${part.start}-${index}`}
            mention={part}
            onClick={onTokenClick ? () => onTokenClick(part) : undefined}
          />
        );
      })}
    </span>
  );
}

function hasMentionToken(text) {
  return parseMentionText(text).some((part) => part.type === "mention");
}

function MentionTokenChip({ mention, onClick }) {
  const label = `${mention.item.label}${typeof mention.amount === "number" ? ` ${formatMentionDisplayAmount(mention.amount)}` : ""}`;
  const content = (
    <>
      {typeof mention.amount === "number" ? (
        <span className="mention-token-amount">{formatMentionDisplayAmount(mention.amount)}</span>
      ) : null}
      <span className={`mention-token-icon tone-${mention.tone}`} aria-hidden="true">
        {mention.kind === "effect" ? (
          <AchievementEffectOptionIcon option={mention.item} />
        ) : (
          <TokenIcon type={mention.item.icon} />
        )}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button className="mention-token-chip editable" type="button" aria-label={label} title={label} onClick={onClick}>
        {content}
      </button>
    );
  }

  return (
    <span className="mention-token-chip" aria-label={label} title={label}>
      {content}
    </span>
  );
}

function SpecialAbilityLegendDialog({ open, restoreFocusRef, onClose }) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const focusCloseButton = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusCloseButton);
      document.removeEventListener("keydown", handleKeyDown);
      window.setTimeout(() => {
        restoreFocusRef?.current?.focus();
      }, 0);
    };
  }, [onClose, open, restoreFocusRef]);

  if (!open) {
    return null;
  }

  return (
    <div className="session-end-overlay" role="presentation">
      <section
        ref={dialogRef}
        className="score-guide-dialog achievement-legend-dialog"
        aria-labelledby="achievement-legend-title"
        aria-modal="true"
        role="dialog"
      >
        <div className="session-end-heading">
          <span className="session-end-seal" aria-hidden="true">
            <TokenIcon type="help" />
          </span>
          <div>
            <p className="section-label">업적 안내</p>
            <h2 id="achievement-legend-title">특수 능력 범례</h2>
          </div>
        </div>
        <figure className="rulebook-legend-figure">
          <img src={specialAbilityLegendImageUrl} alt="룰북 14쪽 특수 능력 범례" />
          <figcaption>룰북 p.14 특수 능력 범례</figcaption>
        </figure>
        <div className="score-guide-table-wrap">
          <table className="score-guide-table achievement-legend-table">
            <thead>
              <tr>
                <th scope="col">표식</th>
                <th scope="col">조건/표시</th>
                <th scope="col">처리</th>
              </tr>
            </thead>
            <tbody>
              {specialAbilityLegendRows.map((row) => (
                <tr key={row.id}>
                  <th scope="row">
                    <span className="achievement-legend-label">
                      <SpecialAbilityLegendIcon type={row.icon} />
                      <span>{row.label}</span>
                    </span>
                  </th>
                  <td>{row.timing}</td>
                  <td>{row.effect}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="score-guide-actions">
          <button ref={closeButtonRef} className="primary-button" type="button" onClick={onClose}>
            확인
          </button>
        </div>
      </section>
    </div>
  );
}
function DilemmaSummaryCard({
  busy,
  currentHouseId,
  dilemma,
  leaderHouseId,
  moderatorHouseId,
  history = [],
  houses = [],
  editButtonRef,
  roleButtonRef,
  onEdit,
  onOpenRoleDialog,
  onPublish,
}) {
  const locked = Boolean(dilemma.editLock);
  const lockedByOther = Boolean(dilemma.editLock && dilemma.editLock.houseId !== currentHouseId);
  const isBlank = isDilemmaBlank(dilemma);
  const publishedEntry = dilemma.historyId ? history.find((entry) => entry.historyId === dilemma.historyId) : null;
  const published = Boolean(publishedEntry && isPublishedDilemmaCurrent(dilemma, publishedEntry));
  const editButtonLabel = isBlank ? "작성" : "편집";
  const votes = normalizeDilemmaVotes(dilemma.votes);
  const participants = getActiveDilemmaVoteHouses(houses);
  const ayePower = sumDilemmaVotes(votes, participants, "aye");
  const nayPower = sumDilemmaVotes(votes, participants, "nay");
  const houseById = new Map((houses || []).map((house) => [house.id, house]));
  const leaderHouse = houseById.get(leaderHouseId) || null;
  const moderatorHouse = houseById.get(moderatorHouseId) || null;
  const rolesReady = Boolean(leaderHouse && moderatorHouse);
  const voteComplete = isDilemmaVoteCompleteForPublish(dilemma, houses);
  const publishBlockReason = getDilemmaPublishBlockReason(dilemma, houses);
  const status = getDilemmaStatusLabel({
    dilemma,
    isBlank,
    leaderHouse,
    moderatorHouse,
    published,
    rolesReady,
    voteComplete,
  });
  const canSetRoles = Boolean(currentHouseId) && isBlank && !locked;
  const canEdit = Boolean(currentHouseId) && !lockedByOther && rolesReady;
  const canPublish = Boolean(currentHouseId) && !locked && !isBlank && !publishBlockReason;

  return (
    <section className="dilemma-ledger-card" aria-labelledby="dilemma-ledger-title">
      <div className="dilemma-summary-head">
        <div>
          <h3 id="dilemma-ledger-title">딜레마</h3>
        </div>
        <div className="dilemma-summary-actions">
          <span className={`dilemma-status-pill status-${status.tone}${dilemma.editLock ? " locked" : ""}`}>
            {status.text}
          </span>
          <button
            ref={roleButtonRef}
            className="ghost-button dilemma-summary-button"
            type="button"
            onClick={onOpenRoleDialog}
            disabled={busy || !canSetRoles}
            title={
              locked
                ? "딜레마 편집을 저장하거나 취소해야 역할을 지정할 수 있습니다."
                : !isBlank
                  ? "딜레마 작성 전 상태에서만 역할을 지정할 수 있습니다."
                  : "딜레마 작성 전에 리더 토큰과 중재자를 지정합니다."
            }
          >
            <TokenIcon type="crown" />
            역할
          </button>
          <button
            ref={editButtonRef}
            className="ghost-button dilemma-summary-button dilemma-edit-button"
            type="button"
            onClick={onEdit}
            disabled={busy || !canEdit}
            title={
              lockedByOther
                ? "다른 가문이 편집을 마칠 때까지 기다려야 합니다."
                : !rolesReady
                  ? "리더와 중재자를 먼저 지정하세요."
                  : isBlank
                    ? "새 딜레마를 작성합니다."
                    : "딜레마 기록을 편집합니다."
            }
          >
            <TokenIcon type="scroll" />
            {editButtonLabel}
          </button>
          <button
            className="ghost-button dilemma-summary-button"
            type="button"
            onClick={onPublish}
            disabled={busy || !canPublish}
            title={
              locked
                ? "딜레마 편집을 저장하거나 취소해야 게시할 수 있습니다."
                : isBlank
                  ? "게시할 딜레마 기록이 없습니다."
                  : publishBlockReason || "현재 저장된 딜레마를 딜레마 이력에 게시합니다."
            }
          >
            <TokenIcon type="history" />
            게시
          </button>
        </div>
      </div>

      {isBlank ? (
        <p className="dilemma-empty">이번 라운드의 딜레마 기록이 아직 없습니다.</p>
      ) : (
        <div className="dilemma-summary-body">
          <div className="dilemma-facts">
            <DilemmaFact label="카드" value={formatDilemmaCardLabel(dilemma)} />
            <DilemmaFact label="배치 위치" value={dilemma.timeCounterSlot} />
            <DilemmaFact label="결과" value={dilemmaOutcomeLabels[dilemma.selectedOutcome] || "미정"} />
            <DilemmaFact label="리더" value={leaderHouse ? getHouseKoreanName(leaderHouse) : ""} />
            <DilemmaFact label="중재자" value={moderatorHouse ? getHouseKoreanName(moderatorHouse) : ""} />
            <DilemmaFact label="우세" value={formatDilemmaVoteAdvantage(ayePower, nayPower)} />
          </div>
          <DilemmaVoteBreakdown dilemma={dilemma} houses={houses} />
          <DilemmaTextPreview label="상황" value={dilemma.context} />
          <DilemmaTextPreview label="질문" value={dilemma.question} />
          <DilemmaTextPreview label="메모" value={dilemma.councilNotes} />
          <div className="dilemma-outcome-grid">
            <DilemmaOutcomePreview label="찬성" selected={dilemma.selectedOutcome === "aye"} outcome={dilemma.aye} />
            <DilemmaOutcomePreview label="반대" selected={dilemma.selectedOutcome === "nay"} outcome={dilemma.nay} />
          </div>
          <DilemmaTextPreview label="투표" value={dilemma.voteNotes} />
          <DilemmaTextPreview label="후속" value={dilemma.resolutionNotes} />
          <DilemmaPhotoStrip photos={dilemma.photos} />
          {dilemma.updatedByName ? (
            <p className="dilemma-updated">
              {dilemma.updatedByName} 저장 · {formatLocalDateTime(dilemma.updatedAt)}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}

function isPublishedDilemmaCurrent(dilemma, entry) {
  const publishedAt = Date.parse(entry.savedAt || entry.updatedAt || "");
  const updatedAt = Date.parse(dilemma.updatedAt || "");

  if (!Number.isFinite(publishedAt) || !Number.isFinite(updatedAt)) {
    return true;
  }

  return publishedAt >= updatedAt;
}

function getDilemmaStatusLabel({
  dilemma,
  isBlank,
  leaderHouse,
  moderatorHouse,
  published,
  rolesReady,
  voteComplete,
}) {
  if (dilemma.editLock) {
    return { text: `${dilemma.editLock.houseName} 수정 중`, tone: "locked" };
  }

  if (!rolesReady) {
    if (!leaderHouse && !moderatorHouse) {
      return { text: "역할 지정 필요", tone: "needs-action" };
    }

    return {
      text: leaderHouse ? "중재자 지정 필요" : "리더 지정 필요",
      tone: "needs-action",
    };
  }

  if (isBlank) {
    return { text: "작성 필요", tone: "needs-action" };
  }

  if (published) {
    return { text: "게시 완료", tone: "done" };
  }

  if (!voteComplete) {
    return { text: "투표 진행 필요", tone: "in-progress" };
  }

  if (!dilemma.selectedOutcome) {
    return { text: "결과 선택 필요", tone: "needs-action" };
  }

  if (!dilemma.resolutionNotes.trim()) {
    return { text: "후속 입력 필요", tone: "needs-action" };
  }

  return { text: "게시 가능", tone: "ready" };
}

function getDilemmaPublishBlockReason(dilemma, houses = []) {
  const normalizedDilemma = normalizeDilemmaRecord(dilemma);

  if (isDilemmaBlank(normalizedDilemma)) {
    return "게시할 딜레마 기록이 없습니다.";
  }

  if (!isDilemmaVoteCompleteForPublish(normalizedDilemma, houses)) {
    return "로그인 중인 모든 가문이 투표해야 게시할 수 있습니다.";
  }

  if (!normalizedDilemma.selectedOutcome) {
    return "딜레마 투표 결과를 직접 선택해야 게시할 수 있습니다.";
  }

  if (!normalizedDilemma.resolutionNotes.trim()) {
    return "후속 처리 내용을 입력해야 게시할 수 있습니다.";
  }

  return "";
}
function isDilemmaVoteCompleteForPublish(dilemma, houses = []) {
  const participants = getActiveDilemmaVoteHouses(houses);
  const votes = normalizeDilemmaVotes(dilemma?.votes);

  return participants.length > 0 && participants.every((house) => Boolean(votes[house.id]?.side));
}

function getActiveDilemmaVoteHouses(houses = []) {
  return (houses || []).filter((house) => house?.hasSession).slice(0, REQUIRED_HOUSE_COUNT);
}

function DilemmaFact({ label, value }) {
  return (
    <div className="dilemma-fact">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

function DilemmaVoteBreakdown({ dilemma, houses = [] }) {
  const votes = normalizeDilemmaVotes(dilemma.votes);
  const groups = createDilemmaVoteGroups(votes, houses);
  const hasVotes = groups.some((group) => group.items.length > 0);

  if (!hasVotes) {
    return null;
  }

  return (
    <section className="dilemma-vote-breakdown" aria-label="딜레마 투표 결과 상세">
      {groups.map((group) => (
        <div className={`dilemma-vote-breakdown-group tone-${group.side}`} key={group.side}>
          <header>
            <span>{group.label}</span>
            <strong>{formatDilemmaVoteGroupMetric(group)}</strong>
          </header>
          <div className="dilemma-vote-breakdown-list">
            {group.items.length ? (
              group.items.map((item) => (
                <span className="dilemma-vote-breakdown-chip" key={item.houseId}>
                  <HouseCrestBadge
                    house={item.house}
                    className="dilemma-vote-breakdown-crest"
                    tooltipLabel={item.hoverLabel}
                    ariaLabel={item.hoverLabel}
                  />
                  <strong>{item.name}</strong>
                  <small>{item.houseName}</small>
                  {item.powerTokens > 0 ? <em>{item.powerTokens}권력</em> : null}
                </span>
              ))
            ) : (
              <span className="dilemma-vote-breakdown-empty">없음</span>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}

function DilemmaTextPreview({ label, value }) {
  return (
    <div className="dilemma-text-preview">
      <span>{label}</span>
      <p>{value || "없음"}</p>
    </div>
  );
}

function DilemmaOutcomePreview({ label, outcome, selected }) {
  const normalizedOutcome = normalizeDilemmaOutcome(outcome);
  const hasResourceDeltas = resourceCounters.some(
    (resource) => (normalizedOutcome.resourceDeltas[resource.id] || 0) !== 0,
  );

  return (
    <article className={`dilemma-outcome-preview${selected ? " selected" : ""}`}>
      <header>
        <strong>{label}</strong>
        {selected ? <span>선택</span> : null}
      </header>
      {hasResourceDeltas ? (
        <DilemmaResourceDeltaPreview deltas={normalizedOutcome.resourceDeltas} />
      ) : (
        <p className="dilemma-outcome-empty">결과 미입력</p>
      )}
    </article>
  );
}

function DilemmaResourceDeltaPreview({ deltas }) {
  const normalizedDeltas = normalizeDilemmaResourceDeltas(deltas);
  const entries = resourceCounters
    .map((resource) => ({
      ...resource,
      value: normalizedDeltas[resource.id] || 0,
    }))
    .filter((resource) => resource.value !== 0);

  if (!entries.length) {
    return null;
  }

  return (
    <div className="dilemma-resource-delta-preview" aria-label="자원 변화">
      {entries.map((resource) => (
        <span
          className={`dilemma-resource-delta-chip tone-${resource.tone} ${
            resource.value > 0 ? "positive" : "negative"
          }`}
          key={resource.id}
          title={`${resource.label} ${formatDilemmaResourceDelta(resource.value)}`}
        >
          <TokenIcon type={resource.icon} />
          <span>{resource.label}</span>
          <strong>{formatDilemmaResourceDelta(resource.value)}</strong>
        </span>
      ))}
    </div>
  );
}

function DilemmaPhotoStrip({ photos = [] }) {
  if (!photos.length) {
    return null;
  }

  return (
    <div className="dilemma-photo-strip" aria-label="딜레마사진">
      {photos.map((photo) => (
        <a key={photo.id} href={photo.dataUrl} target="_blank" rel="noreferrer" title={photo.name}>
          <img src={photo.dataUrl} alt={photo.name || "딜레마사진"} />
        </a>
      ))}
    </div>
  );
}

function DilemmaRoleDialog({
  busy,
  houses = [],
  leaderHouseId,
  moderatorHouseId,
  open,
  restoreFocusRef,
  onClose,
  onSave,
}) {
  const dialogRef = useRef(null);
  const closeTimerRef = useRef(null);
  const activeHouses = useMemo(() => getActiveDilemmaVoteHouses(houses), [houses]);
  const activeIds = useMemo(() => activeHouses.map((house) => house.id), [activeHouses]);
  const [leaderDraft, setLeaderDraft] = useState("");
  const [moderatorDraft, setModeratorDraft] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const canSave = !busy && activeHouses.length > 0 && Boolean(leaderDraft && moderatorDraft);

  useEffect(() => {
    if (open) {
      setLeaderDraft(activeIds.includes(leaderHouseId) ? leaderHouseId : activeIds[0] || "");
      setModeratorDraft(activeIds.includes(moderatorHouseId) ? moderatorHouseId : activeIds[1] || activeIds[0] || "");
      setSaveStatus("");
    }
  }, [activeIds, leaderHouseId, moderatorHouseId, open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const focusFirstControl = window.setTimeout(() => {
      const firstControl = dialogRef.current?.querySelector(
        'button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      firstControl?.focus();
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusFirstControl);
      window.clearTimeout(closeTimerRef.current);
      document.removeEventListener("keydown", handleKeyDown);
      window.setTimeout(() => {
        restoreFocusRef?.current?.focus();
      }, 0);
    };
  }, [onClose, open, restoreFocusRef]);

  if (!open) {
    return null;
  }

  const submit = async (event) => {
    event.preventDefault();

    if (!canSave) {
      return;
    }

    setSaveStatus("");
    const result = await onSave({ leaderHouseId: leaderDraft, moderatorHouseId: moderatorDraft });

    if (result) {
      setSaveStatus("리더와 중재자를 저장했습니다. 창을 닫습니다.");
      closeTimerRef.current = window.setTimeout(onClose, 650);
      return;
    }

    setSaveStatus("리더와 중재자를 저장하지 못했습니다.");
  };

  return (
    <div className="session-end-overlay" role="presentation">
      <section
        ref={dialogRef}
        className="dilemma-role-dialog"
        aria-labelledby="dilemma-role-title"
        aria-modal="true"
        role="dialog"
      >
        <div className="session-end-heading">
          <span className="session-end-seal" aria-hidden="true">
            <TokenIcon type="crown" />
          </span>
          <div>
            <p className="section-label">딜레마 준비</p>
            <h2 id="dilemma-role-title">리더·중재자 지정</h2>
          </div>
        </div>
        <form className="dilemma-role-form" onSubmit={submit}>
          <p className="dilemma-role-copy">
            딜레마를 작성하기 전에 현재 리더 토큰 보유자와 중재자를 실제 테이블 상태에 맞춰 지정하세요.
            투표 순서 설정은 별도의 시계방향 좌석 순서만 다룹니다.
          </p>
          {activeHouses.length > 0 ? (
            <div className="dilemma-role-grid">
              <label className="dilemma-role-card">
                <span>리더 토큰</span>
                <select value={leaderDraft} onChange={(event) => setLeaderDraft(event.target.value)} disabled={busy}>
                  {activeHouses.map((house) => (
                    <option key={house.id} value={house.id}>
                      {getHouseKoreanName(house)}{house.hasCustomName ? ` (${house.name})` : ""}
                    </option>
                  ))}
                </select>
                <small>이번 딜레마 투표의 시작 기준입니다.</small>
              </label>
              <label className="dilemma-role-card">
                <span>중재자</span>
                <select value={moderatorDraft} onChange={(event) => setModeratorDraft(event.target.value)} disabled={busy}>
                  {activeHouses.map((house) => (
                    <option key={house.id} value={house.id}>
                      {getHouseKoreanName(house)}{house.hasCustomName ? ` (${house.name})` : ""}
                    </option>
                  ))}
                </select>
                <small>동률이나 전원 기권 때 결정권을 맡습니다.</small>
              </label>
            </div>
          ) : (
            <p className="vote-order-warning">로그인 중인 가문이 있을 때 리더와 중재자를 지정할 수 있습니다.</p>
          )}
          {saveStatus ? <p className="vote-order-status" role="status">{saveStatus}</p> : null}
          <div className="session-end-actions">
            <button className="ghost-button" type="button" onClick={onClose} disabled={busy}>
              닫기
            </button>
            <button className="primary-button" type="submit" disabled={!canSave}>
              <TokenIcon type="save" />
              저장
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function DilemmaEditDialog({
  busy,
  draft,
  isNewDilemma,
  open,
  resolutionDisabled,
  restoreFocusRef,
  onAddPhotos,
  onCancel,
  onFieldChange,
  onOutcomeChange,
  onRemovePhoto,
  onSave,
  photoBusy,
  photoError,
}) {
  const dialogRef = useRef(null);
  const firstInputRef = useRef(null);
  const handlePhotoPaste = useCallback(
    (event) => {
      const imageFiles = getClipboardImageFiles(event.clipboardData);

      if (!imageFiles.length) {
        return;
      }

      event.preventDefault();

      if (busy || photoBusy) {
        return;
      }

      void onAddPhotos(imageFiles);
    },
    [busy, onAddPhotos, photoBusy],
  );

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const focusFirstInput = window.setTimeout(() => {
      firstInputRef.current?.focus();
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(
        dialogRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element instanceof HTMLElement && element.getClientRects().length > 0);

      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusFirstInput);
      document.removeEventListener("keydown", handleKeyDown);
      window.setTimeout(() => {
        restoreFocusRef?.current?.focus();
      }, 0);
    };
  }, [onCancel, open, restoreFocusRef]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    document.addEventListener("paste", handlePhotoPaste);

    return () => document.removeEventListener("paste", handlePhotoPaste);
  }, [handlePhotoPaste, open]);

  if (!open) {
    return null;
  }

  const submit = (event) => {
    event.preventDefault();
    onSave();
  };

  return (
    <div className="session-end-overlay" role="presentation">
      <section
        ref={dialogRef}
        className="dilemma-dialog"
        aria-labelledby="dilemma-dialog-title"
        aria-modal="true"
        role="dialog"
      >
        <div className="session-end-heading">
          <span className="session-end-seal" aria-hidden="true">
            <TokenIcon type="scroll" />
          </span>
          <div>
            <p className="section-label">공용 기록</p>
            <h2 id="dilemma-dialog-title">{isNewDilemma ? "딜레마 작성" : "딜레마 편집"}</h2>
          </div>
        </div>
        <form className="dilemma-form" onSubmit={submit}>
          <div className="dilemma-dialog-grid compact">
            <DilemmaInput
              ref={firstInputRef}
              label="카드 번호"
              value={draft.cardCode}
              onChange={(value) => onFieldChange("cardCode", value)}
              placeholder="예: 12, II-4"
            />
            <DilemmaInput
              label="제목"
              value={draft.title}
              onChange={(value) => onFieldChange("title", value)}
              placeholder="딜레마 제목"
            />
            <DilemmaInput
              label="카드 배치 위치"
              value={draft.timeCounterSlot}
              onChange={(value) => onFieldChange("timeCounterSlot", value)}
              placeholder="예: 시간 칸 3"
            />
          </div>
          <div className="dilemma-dialog-grid">
            <DilemmaTextarea
              label="상황"
              value={draft.context}
              onChange={(value) => onFieldChange("context", value)}
              placeholder="카드 전문 또는 요약이나 진행상황을 적습니다."
            />
            <DilemmaTextarea
              label="질문"
              value={draft.question}
              onChange={(value) => onFieldChange("question", value)}
              placeholder="찬성/반대로 결정할 질문"
            />
          </div>
          <DilemmaTextarea
            label="메모"
            value={draft.councilNotes}
            onChange={(value) => onFieldChange("councilNotes", value)}
            placeholder="회의 내용, 협상, 주의할 카드 효과"
          />
          <DilemmaOutcomeSelector
            value={draft.selectedOutcome}
            aye={draft.aye}
            nay={draft.nay}
            disabled={resolutionDisabled}
            disabledReason="로그인 중인 모든 가문이 투표해야 결과를 선택할 수 있습니다."
            onChange={(value) => onFieldChange("selectedOutcome", value)}
          />
          <div className="dilemma-outcome-edit-grid">
            <DilemmaOutcomeEditor
              label="찬성"
              outcome={draft.aye}
              selected={draft.selectedOutcome === "aye"}
              onChange={(field, value) => onOutcomeChange("aye", field, value)}
            />
            <DilemmaOutcomeEditor
              label="반대"
              outcome={draft.nay}
              selected={draft.selectedOutcome === "nay"}
              onChange={(field, value) => onOutcomeChange("nay", field, value)}
            />
          </div>
          <DilemmaTextarea
            label="결과 후속"
            value={draft.resolutionNotes}
            onChange={(value) => onFieldChange("resolutionNotes", value)}
            placeholder={resolutionDisabled ? "전원 투표 후 입력할 수 있습니다." : "자원/안정도/모멘텀, 스티커, 보드 투입, 카드 처리"}
            disabled={resolutionDisabled}
            hint={resolutionDisabled ? "전원 투표가 끝난 뒤 입력할 수 있습니다." : ""}
          />
          <DilemmaPhotoEditor
            busy={busy || photoBusy}
            error={photoError}
            photos={draft.photos}
            onAddPhotos={onAddPhotos}
            onRemovePhoto={onRemovePhoto}
          />
          <div className="session-end-actions">
            <button className="ghost-button" type="button" onClick={onCancel} disabled={busy}>
              취소
            </button>
            <button className="primary-button" type="submit" disabled={busy}>
              <TokenIcon type="save" />
              {busy ? "저장 중" : "저장"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function DilemmaOutcomeSelector({ value, aye, nay, disabled = false, disabledReason = "", onChange }) {
  const options = [
    {
      value: "",
      title: "미정",
      meta: "결과 없음",
      icon: "turn",
      deltas: {},
    },
    {
      value: "aye",
      title: "찬성 결과",
      meta: "찬성 결과",
      icon: "plus",
      deltas: normalizeDilemmaOutcome(aye).resourceDeltas,
    },
    {
      value: "nay",
      title: "반대 결과",
      meta: "반대 결과",
      icon: "minus",
      deltas: normalizeDilemmaOutcome(nay).resourceDeltas,
    },
  ];

  return (
    <fieldset className={`dilemma-outcome-selector${disabled ? " disabled" : ""}`}>
      <legend>선택 결과</legend>
      {disabled ? <p className="dilemma-outcome-selector-note">{disabledReason}</p> : null}
      <div className="dilemma-outcome-selector-grid">
        {options.map((option) => {
          const checked = value === option.value;
          const hasDeltas = dilemmaResourceDeltasHaveValues(option.deltas);

          return (
            <label className={`dilemma-outcome-choice${checked ? " selected" : ""}`} key={option.value || "pending"}>
              <input
                type="radio"
                name="selectedOutcome"
                value={option.value}
                checked={checked}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
              />
              <span className="dilemma-outcome-choice-mark" aria-hidden="true">
                <TokenIcon type={option.icon} />
              </span>
              <span className="dilemma-outcome-choice-copy">
                <strong>{option.title}</strong>
                <small>{option.meta}</small>
              </span>
              {hasDeltas ? (
                <DilemmaResourceDeltaPreview deltas={option.deltas} />
              ) : (
                <span className="dilemma-outcome-choice-empty">{option.value ? "변경 없음" : "대기"}</span>
              )}
              {checked ? <span className="dilemma-outcome-choice-badge">선택됨</span> : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function DilemmaPhotoEditor({ busy, error, photos, onAddPhotos, onRemovePhoto }) {
  const fileInputRef = useRef(null);
  const remaining = Math.max(dilemmaPhotoLimit - photos.length, 0);

  const handleFileChange = (event) => {
    const { files } = event.target;
    void onAddPhotos(files).finally(() => {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    });
  };

  return (
    <section className="dilemma-photo-editor" aria-labelledby="dilemma-photo-title">
      <div className="dilemma-photo-editor-head">
        <div>
          <h3 id="dilemma-photo-title">사진</h3>
          <p>보드게임 사진을 선택하거나 Ctrl+V로 붙여넣을 수 있습니다.</p>
        </div>
        <label className={`ghost-button dilemma-photo-add${remaining <= 0 ? " disabled" : ""}`}>
          <TokenIcon type="photo" />
          <span>사진 첨부</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            disabled={busy || remaining <= 0}
          />
        </label>
      </div>
      {photos.length ? (
        <div className="dilemma-photo-editor-grid">
          {photos.map((photo) => (
            <figure key={photo.id} className="dilemma-photo-editor-item">
              <img src={photo.dataUrl} alt={photo.name || "딜레마 사진"} />
              <figcaption>{photo.name || "딜레마 사진"}</figcaption>
              <button type="button" className="stepper-button" onClick={() => onRemovePhoto(photo.id)} disabled={busy}>
                <TokenIcon type="trash" />
              </button>
            </figure>
          ))}
        </div>
      ) : (
        <p className="dilemma-photo-empty">첨부된 사진이 없습니다.</p>
      )}
      <p className="dilemma-photo-limit">
        {photos.length}/{dilemmaPhotoLimit} · 파일당 최대 8MB, 저장용 이미지는 자동 압축
      </p>
      {error ? <p className="dilemma-photo-error" role="alert">{error}</p> : null}
    </section>
  );
}

const DilemmaInput = React.forwardRef(function DilemmaInput({ label, value, onChange, placeholder }, ref) {
  return (
    <label className="dilemma-field">
      <span>{label}</span>
      <input ref={ref} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
});

const ValueMentionTextarea = React.forwardRef(function ValueMentionTextarea(
  { value, onChange, placeholder, disabled = false, maxLength, multiline = true, enableEffectMentions = false, onEffectMention },
  forwardedRef,
) {
  const fieldRef = useRef(null);
  const textareaRef = useRef(null);
  const pendingSelectionRef = useRef(null);
  const [mention, setMention] = useState(null);
  const [amount, setAmount] = useState(1);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);
  const [panelPosition, setPanelPosition] = useState({ left: 0, top: 0, maxHeight: 310 });
  const normalizedValue = typeof value === "string" ? value : "";
  const query = mention?.query?.trim().toLowerCase() || "";
  const mentionItems = mention?.type === "effect" ? achievementEffectSelectableOptions : valueMentionItems;
  const filteredItems = useMemo(() => {
    if (!query) {
      return mentionItems;
    }

    return mentionItems.filter((item) => {
      return item.label.toLowerCase().includes(query) || item.id.toLowerCase().includes(query);
    });
  }, [mentionItems, query]);

  const setTextareaNode = useCallback(
    (node) => {
      textareaRef.current = node;

      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    },
    [forwardedRef],
  );

  useEffect(() => {
    if (!pendingSelectionRef.current || !textareaRef.current) {
      return;
    }

    const nextPosition = pendingSelectionRef.current;
    pendingSelectionRef.current = null;
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(nextPosition, nextPosition);
  });

  const updateMentionPosition = useCallback((caretIndex) => {
    if (!textareaRef.current || !fieldRef.current) {
      return;
    }

    const caret = getTextareaCaretPosition(textareaRef.current, caretIndex);
    const fieldRect = fieldRef.current.getBoundingClientRect();
    const inputRect = textareaRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || fieldRect.width;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || inputRect.bottom;
    const panelWidth = Math.min(360, Math.max(220, fieldRect.width));
    const desiredTop = inputRect.top + caret.top + caret.height + 8;
    const maxPanelHeight = Math.min(310, Math.floor(viewportHeight * 0.46));
    const spaceBelow = viewportHeight - desiredTop - 10;
    const opensUp = spaceBelow < 180 && inputRect.top > spaceBelow;
    const left = Math.max(8, Math.min(inputRect.left + caret.left, viewportWidth - panelWidth - 8));
    const top = opensUp
      ? Math.max(8, inputRect.top + caret.top - maxPanelHeight - 8)
      : Math.max(8, desiredTop);
    const maxHeight = opensUp ? Math.max(160, inputRect.top + caret.top - top - 8) : Math.max(160, viewportHeight - top - 10);

    setPanelPosition({ left, top, maxHeight: Math.min(310, maxHeight) });
  }, []);

  useEffect(() => {
    if (mention) {
      updateMentionPosition(mention.triggerIndex);
    }
  }, [mention, updateMentionPosition]);

  useEffect(() => {
    if (!mention) {
      return undefined;
    }

    const reposition = () => updateMentionPosition(mention.triggerIndex);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);

    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [mention, updateMentionPosition]);

  const emitChange = (nextValue) => {
    const limitedValue = typeof maxLength === "number" ? nextValue.slice(0, maxLength) : nextValue;
    onChange?.({ target: { value: limitedValue }, currentTarget: { value: limitedValue } });
    return limitedValue;
  };

  const closeMention = () => {
    setMention(null);
    setAmount(1);
    setActiveMentionIndex(0);
  };

  const handleChange = (event) => {
    const nextValue = event.target.value;
    const caret = event.target.selectionStart ?? nextValue.length;
    onChange?.(event);

    if (disabled) {
      return;
    }

    const triggerCharacter = nextValue[caret - 1];

    if (triggerCharacter === "@" || (enableEffectMentions && triggerCharacter === "!")) {
      setMention({
        type: triggerCharacter === "!" ? "effect" : "value",
        triggerIndex: caret - 1,
        replaceEnd: caret,
        query: "",
        item: null,
      });
      setActiveMentionIndex(0);
      updateMentionPosition(caret - 1);
      setAmount(1);
      return;
    }

    if (!mention) {
      return;
    }

    if (caret <= mention.triggerIndex) {
      closeMention();
      return;
    }

    const nextQuery = nextValue.slice(mention.triggerIndex + 1, caret);

    if (/[\s\n]/.test(nextQuery)) {
      closeMention();
      return;
    }

    setMention((current) => current && { ...current, replaceEnd: caret, query: nextQuery });
    updateMentionPosition(mention.triggerIndex);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape" && mention) {
      event.preventDefault();
      closeMention();
      return;
    }

    if (!mention) {
      return;
    }

    if (!mention.item && filteredItems.length > 0) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const delta = event.key === "ArrowDown" ? 1 : -1;
        setActiveMentionIndex((current) => {
          const next = (current + delta + filteredItems.length) % filteredItems.length;
          return next;
        });
        return;
      }
    }

    if (event.key === "Enter" && !event.shiftKey) {
      if (!mention.item) {
        const currentItem = filteredItems[activeMentionIndex];
        if (!currentItem || !mention) {
          return;
        }

        event.preventDefault();
        selectMentionItem(currentItem);
        return;
      }

      event.preventDefault();
      insertMention();
    }
  };

  useEffect(() => {
    if (!mention || mention.item) {
      return;
    }

    if (filteredItems.length <= 0) {
      setActiveMentionIndex(0);
      return;
    }

    setActiveMentionIndex((current) => Math.min(current, filteredItems.length - 1));
  }, [mention, mention?.item, filteredItems.length]);

  const normalizeActiveMentionAmount = (value) => {
    if (mention?.type === "effect") {
      return normalizeCounter(value, achievementEffectAmountMax, 0);
    }

    return normalizeMentionAmount(value);
  };

  const adjustAmount = (delta) => {
    setAmount((current) => normalizeActiveMentionAmount(current + delta));
  };

  const updateAmount = (event) => {
    setAmount(normalizeActiveMentionAmount(event.target.valueAsNumber));
  };

  const insertMentionItem = (activeMention, item, activeAmount = amount) => {
    if (!activeMention || !item) {
      return;
    }

    const tokenText =
      activeMention.type === "effect" ? formatEffectMention(item, activeAmount) : formatValueMention(item, activeAmount);
    const replaceEnd = Math.max(activeMention.replaceEnd, activeMention.triggerIndex + 1);
    const separator = shouldAppendMentionSeparator(normalizedValue, replaceEnd) ? " " : "";
    const insertedText = `${tokenText}${separator}`;
    const nextValue = `${normalizedValue.slice(0, activeMention.triggerIndex)}${insertedText}${normalizedValue.slice(replaceEnd)}`;
    const limitedValue = emitChange(nextValue);
    if (activeMention.type === "effect") {
      onEffectMention?.({
        icon: item.id,
        amount: normalizeAchievementEffectAmount(activeAmount, item.id),
      });
    }
    pendingSelectionRef.current = Math.min(activeMention.triggerIndex + insertedText.length, limitedValue.length);
    closeMention();
  };

  const selectMentionItem = (item) => {
    if (!mention) {
      return;
    }

    if (!mentionItemRequiresAmount(mention.type, item)) {
      insertMentionItem(mention, item, amount);
      return;
    }

    setMention((current) => current && { ...current, item });
    setAmount(1);
  };

  const insertMention = () => {
    insertMentionItem(mention, mention?.item, amount);
  };

  const handleScroll = () => {
    if (mention) {
      updateMentionPosition(mention.triggerIndex);
    }
  };
  const mentionPanel = mention ? (
    <div
      className="value-mention-panel"
      style={{
        "--mention-left": `${panelPosition.left}px`,
        "--mention-top": `${panelPosition.top}px`,
        "--mention-max-height": `${panelPosition.maxHeight}px`,
      }}
      onMouseDown={(event) => {
        if (event.target instanceof HTMLInputElement) {
          return;
        }

        event.preventDefault();
      }}
    >
      {mention.item ? (
        <>
          <span className="value-mention-heading">
            <span
              className={`value-mention-icon tone-${mention.type === "effect" ? "effect" : mention.item.tone}`}
              aria-hidden="true"
            >
              {mention.type === "effect" ? (
                <AchievementEffectOptionIcon option={mention.item} />
              ) : (
                <TokenIcon type={mention.item.icon} />
              )}
            </span>
            <strong>{mention.item.label}</strong>
            <small>{mention.type === "effect" ? "적용 시점" : mention.item.category}</small>
          </span>
          {mentionItemRequiresAmount(mention.type, mention.item) ? (
            <span className="value-mention-amount">
              <button type="button" className="stepper-button compact" onClick={() => adjustAmount(-1)}>
                <TokenIcon type="minus" />
              </button>
              <input
                type="number"
                inputMode="numeric"
                min={mention.type === "effect" ? 0 : -valueMentionAmountMax}
                max={valueMentionAmountMax}
                value={amount}
                onChange={updateAmount}
                aria-label={`${mention.item.label} 수치`}
              />
              <button type="button" className="stepper-button compact" onClick={() => adjustAmount(1)}>
                <TokenIcon type="plus" />
              </button>
            </span>
          ) : null}
          <span className="value-mention-actions">
            <button type="button" className="ghost-button compact" onClick={() => setMention((current) => current && { ...current, item: null })}>
              다시 선택
            </button>
            <button type="button" className="primary-button compact" onClick={insertMention}>
              삽입
            </button>
          </span>
        </>
      ) : (
        <>
          <span className="value-mention-title">{mention.type === "effect" ? "! 적용 시점 선택" : "@ 값 선택"}</span>
          <span className="value-mention-options">
              {filteredItems.length ? (
              filteredItems.map((item, index) => (
                <button
                  type="button"
                  key={item.id}
                  className={index === activeMentionIndex ? "active" : ""}
                  onMouseEnter={() => setActiveMentionIndex(index)}
                  onClick={() => selectMentionItem(item)}
                >
                  <span className={`value-mention-icon tone-${mention.type === "effect" ? "effect" : item.tone}`} aria-hidden="true">
                    {mention.type === "effect" ? <AchievementEffectOptionIcon option={item} /> : <TokenIcon type={item.icon} />}
                  </span>
                  <span>
                    <strong>{item.label}</strong>
                    <small>{mention.type === "effect" ? "적용 시점" : item.category}</small>
                  </span>
                </button>
              ))
            ) : (
              <span className="value-mention-empty">일치하는 값이 없습니다.</span>
            )}
          </span>
        </>
      )}
    </div>
  ) : null;

  return (
    <div className="value-mention-field" ref={fieldRef}>
      {multiline ? (
        <textarea
          ref={setTextareaNode}
          value={normalizedValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
        />
      ) : (
        <input
          ref={setTextareaNode}
          type="text"
          value={normalizedValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
        />
      )}
      {mentionPanel && typeof document !== "undefined" ? createPortal(mentionPanel, document.body) : mentionPanel}
    </div>
  );
});

function normalizeMentionAmount(value) {
  const number = Number.isFinite(value) ? Math.trunc(value) : 1;
  const clamped = Math.max(-valueMentionAmountMax, Math.min(valueMentionAmountMax, number));

  return clamped === 0 ? 1 : clamped;
}

function getTextareaCaretPosition(textarea, caretIndex) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { left: 0, top: textarea.clientHeight + 6, height: 18 };
  }

  const style = window.getComputedStyle(textarea);
  const mirror = document.createElement("div");
  const mirrorProperties = [
    "boxSizing",
    "width",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "fontStyle",
    "letterSpacing",
    "lineHeight",
    "textTransform",
    "wordSpacing",
    "textIndent",
    "tabSize",
  ];

  mirrorProperties.forEach((property) => {
    mirror.style[property] = style[property];
  });
  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.overflow = "hidden";
  mirror.style.whiteSpace = textarea.tagName?.toLowerCase() === "textarea" ? "pre-wrap" : "pre";
  mirror.style.wordBreak = textarea.tagName?.toLowerCase() === "textarea" ? "break-word" : "normal";
  mirror.style.overflowWrap = textarea.tagName?.toLowerCase() === "textarea" ? "break-word" : "normal";
  mirror.style.left = "-9999px";
  mirror.style.top = "0";

  const beforeText = textarea.value.slice(0, caretIndex).replace(/\n$/, "\n\u200b");
  const marker = document.createElement("span");
  marker.textContent = "\u200b";
  mirror.textContent = beforeText;
  mirror.appendChild(marker);
  document.body.appendChild(mirror);

  const markerLeft = marker.offsetLeft - textarea.scrollLeft;
  const markerTop = marker.offsetTop - textarea.scrollTop;
  const lineHeight = Number.parseFloat(style.lineHeight);
  const markerHeight = Number.isFinite(lineHeight) ? lineHeight : marker.offsetHeight || 18;
  document.body.removeChild(mirror);

  return {
    left: Math.max(0, markerLeft),
    top: Math.max(0, markerTop),
    height: markerHeight,
  };
}

function formatValueMention(item, amount) {
  if (!mentionItemRequiresAmount("value", item)) {
    return `@${item.label}`;
  }

  const normalizedAmount = normalizeMentionAmount(amount);
  const sign = normalizedAmount > 0 ? "+" : "";

  return `@${item.label} ${sign}${normalizedAmount}`;
}

function mentionItemRequiresAmount(type, item) {
  if (!item) {
    return false;
  }

  if (type === "effect") {
    return Boolean(item.amount);
  }

  return item.requiresAmount !== false;
}

function shouldAppendMentionSeparator(text, replaceEnd) {
  const nextCharacter = text[replaceEnd] || "";
  return !nextCharacter || !/[\s\n.,;:!?)]/.test(nextCharacter);
}

function formatEffectMention(item, amount) {
  if (!item?.id) {
    return "";
  }

  if (!item.amount) {
    return `!${item.label}`;
  }

  const normalizedAmount = normalizeAchievementEffectAmount(amount, item.id);
  return normalizedAmount > 0 ? `!${item.label} +${normalizedAmount}` : `!${item.label}`;
}

function parseMentionText(value) {
  const text = typeof value === "string" ? value : "";
  const valueLabels = getSortedValueMentionLabels();
  const effectLabels = getSortedEffectMentionLabels();
  const parts = [];
  let index = 0;

  while (index < text.length) {
    const triggerIndex = findNextMentionTrigger(text, index);

    if (triggerIndex < 0) {
      parts.push({ type: "text", text: text.slice(index) });
      break;
    }

    if (triggerIndex > index) {
      parts.push({ type: "text", text: text.slice(index, triggerIndex) });
    }

    const trigger = text[triggerIndex];
    const candidates = trigger === "@" ? valueLabels : effectLabels;
    const match = candidates.find((candidate) => text.startsWith(candidate.label, triggerIndex + 1));

    if (!match) {
      parts.push({ type: "text", text: trigger });
      index = triggerIndex + 1;
      continue;
    }

    const amountStart = triggerIndex + 1 + match.label.length;
    const trailingAmountMatch = text.slice(amountStart).match(/^\s*([+-])?\s*(\d+)/);
    const amountMatch = mentionItemRequiresAmount(match.kind, match.item) ? trailingAmountMatch : null;
    const amount = amountMatch ? Number(`${amountMatch[1] || ""}${amountMatch[2]}`) : null;
    const end = amountStart + (amountMatch ? amountMatch[0].length : trailingAmountMatch ? trailingAmountMatch[0].length : 0);

    parts.push({
      type: "mention",
      kind: match.kind,
      item: match.item,
      tone: match.kind === "effect" ? "effect" : match.item.tone,
      amount,
      raw: text.slice(triggerIndex, end),
      start: triggerIndex,
      end,
    });
    index = end;
  }

  return parts;
}

let sortedValueMentionLabelsCache = null;
let sortedEffectMentionLabelsCache = null;

function getSortedValueMentionLabels() {
  if (!sortedValueMentionLabelsCache) {
    sortedValueMentionLabelsCache = valueMentionItems
      .map((item) => ({ kind: "value", item, label: item.label }))
      .sort((left, right) => right.label.length - left.label.length);
  }

  return sortedValueMentionLabelsCache;
}

function getSortedEffectMentionLabels() {
  if (!sortedEffectMentionLabelsCache) {
    sortedEffectMentionLabelsCache = achievementEffectSelectableOptions
      .map((item) => ({ kind: "effect", item, label: item.label }))
      .sort((left, right) => right.label.length - left.label.length);
  }

  return sortedEffectMentionLabelsCache;
}

function findNextMentionTrigger(text, start) {
  const valueIndex = text.indexOf("@", start);
  const effectIndex = text.indexOf("!", start);

  if (valueIndex < 0) {
    return effectIndex;
  }

  if (effectIndex < 0) {
    return valueIndex;
  }

  return Math.min(valueIndex, effectIndex);
}

function formatMentionDisplayAmount(amount) {
  if (!Number.isFinite(amount)) {
    return "";
  }

  return amount > 0 ? `+${amount}` : `${amount}`;
}

function DilemmaTextarea({ label, value, onChange, placeholder, disabled = false, hint = "" }) {
  return (
    <div className="dilemma-field">
      <span>{label}</span>
      <ValueMentionTextarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}

function DilemmaOutcomeEditor({ label, outcome, selected, onChange }) {
  const normalizedOutcome = normalizeDilemmaOutcome(outcome);

  return (
    <fieldset className={`dilemma-outcome-editor${selected ? " selected" : ""}`}>
      <legend>{label}</legend>
      <DilemmaResourceDeltaEditor
        label={`${label} 적용 변경`}
        deltas={normalizedOutcome.resourceDeltas}
        onChange={(value) => onChange("resourceDeltas", value)}
      />
    </fieldset>
  );
}

function DilemmaResourceDeltaEditor({ label, deltas, onChange }) {
  const normalizedDeltas = normalizeDilemmaResourceDeltas(deltas);
  const hasValues = dilemmaResourceDeltasHaveValues(normalizedDeltas);

  const updateDelta = (resourceId, amount) => {
    const nextDeltas = compactDilemmaResourceDeltas({
      ...normalizedDeltas,
      [resourceId]: clampDilemmaResourceDelta((normalizedDeltas[resourceId] || 0) + amount),
    });

    onChange(nextDeltas);
  };

  const clearDeltas = () => onChange({});

  return (
    <div className="dilemma-resource-delta-editor" role="group" aria-label={label}>
      <div className="dilemma-resource-delta-heading">
        <span>적용 변경</span>
        <button
          className="stepper-button compact"
          type="button"
          aria-label="reset"
          title="reset"
          onClick={clearDeltas}
          disabled={!hasValues}
        >
          <TokenIcon type="reset" />
        </button>
      </div>
      <div className="dilemma-resource-delta-list">
        {resourceCounters.map((resource) => {
          const value = normalizedDeltas[resource.id] || 0;

          return (
            <div className={`dilemma-resource-delta-row tone-${resource.tone}`} key={resource.id}>
              <span className="counter-icon" aria-hidden="true">
                <TokenIcon type={resource.icon} />
              </span>
              <span className="counter-label">{resource.label}</span>
              <div className="counter-controls">
                <button
                  className="stepper-button compact"
                  type="button"
                  aria-label={`${label} ${resource.label} 감소`}
                  onClick={() => updateDelta(resource.id, -1)}
                  disabled={value <= -dilemmaResourceDeltaLimit}
                >
                  <TokenIcon type="minus" />
                </button>
                <output
                  className={`dilemma-resource-delta-value${value > 0 ? " positive" : value < 0 ? " negative" : ""}`}
                  aria-label={`${resource.label} 변화`}
                >
                  {formatDilemmaResourceDelta(value)}
                </output>
                <button
                  className="stepper-button compact"
                  type="button"
                  aria-label={`${label} ${resource.label} 증가`}
                  onClick={() => updateDelta(resource.id, 1)}
                  disabled={value >= dilemmaResourceDeltaLimit}
                >
                  <TokenIcon type="plus" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScoreTrackRow({ label, value, max, icon, tone, disabled, onDecrease, onIncrease }) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;
  const groups = max === 100 ? [50, 50] : [25, 25];
  let offset = 0;

  return (
    <div className={`score-track-row tone-${tone}`} style={{ "--track-progress": `${percent}%` }}>
      <div className="score-track-summary">
        <span className="counter-icon" aria-hidden="true">
          <TokenIcon type={icon} />
        </span>
        <span className="counter-label">{label}</span>
        <output className="score-track-value" aria-label={`${label} 현재 값`}>
          {value}
          <span>/{max}</span>
        </output>
      </div>
      <div className="score-track-body">
        <div className="score-track-groups" aria-hidden="true">
          {groups.map((groupSize, groupIndex) => {
            const start = offset;
            offset += groupSize;

            return (
              <div className="score-track-group" key={`${label}-${groupIndex}`}>
                {Array.from({ length: groupSize }, (_, index) => {
                  const checked = start + index < value;

                  return <span className={checked ? "checked" : ""} key={index} />;
                })}
              </div>
            );
          })}
        </div>
        <div className="score-track-header">
          <div className="score-track-rail" aria-hidden="true">
            <span />
          </div>
          <div className="counter-controls score-track-controls">
            <button
              className="stepper-button"
              type="button"
              aria-label={`${label} 내리기`}
              onClick={onDecrease}
              disabled={disabled || value <= 0}
            >
              <TokenIcon type="minus" />
            </button>
            <button
              className="stepper-button"
              type="button"
              aria-label={`${label} 올리기`}
              onClick={onIncrease}
              disabled={disabled || value >= max}
            >
              <TokenIcon type="plus" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CounterRow({ label, value, max, icon, tone, disabled, onDecrease, onIncrease }) {
  return (
    <div className={`counter-row tone-${tone}`}>
      <span className="counter-icon" aria-hidden="true">
        <TokenIcon type={icon} />
      </span>
      <span className="counter-label">{label}</span>
      <div className="counter-controls">
        <button
          className="stepper-button"
          type="button"
          aria-label={`${label} 내리기`}
          onClick={onDecrease}
          disabled={disabled || value <= 0}
        >
          <TokenIcon type="minus" />
        </button>
        <output aria-label={`${label} 현재 값`}>{value}</output>
        <button
          className="stepper-button"
          type="button"
          aria-label={`${label} 올리기`}
          onClick={onIncrease}
          disabled={disabled || value >= max}
        >
          <TokenIcon type="plus" />
        </button>
      </div>
    </div>
  );
}
function OpenAgendaTokenRow({ type, selectedTokens, disabled, onToggle }) {
  const selected = new Set(selectedTokens);

  return (
    <div className={`open-agenda-token-row tone-${type.tone}`}>
      <div className="open-agenda-token-heading">
        <span>{type.shortLabel}</span>
        <strong>
          {selectedTokens.length}/{openAgendaTokenLimit}
        </strong>
      </div>
      <div className="resource-token-list" role="group" aria-label={type.label}>
        {resourceCounters.map((resource) => {
          const isSelected = selected.has(resource.id);
          const isDisabled = disabled || (!isSelected && selectedTokens.length >= openAgendaTokenLimit);

          return (
            <button
              className={`resource-token-chip tone-${resource.tone}${isSelected ? " selected" : ""}`}
              key={resource.id}
              type="button"
              aria-pressed={isSelected}
              aria-label={`${type.shortLabel} ${resource.label} 공개 의제 토큰`}
              title={`${type.shortLabel} ${resource.label}`}
              onClick={() => onToggle(resource.id)}
              disabled={isDisabled}
            >
              <TokenIcon type={resource.icon} />
              <span className="resource-token-chip-label">{resource.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NarrativeAchievementRow({
  complete,
  count,
  detail,
  disabled,
  max,
  onDecrease,
  onEdit,
  onIncrease,
  onToggle,
}) {
  const normalizedDetail = normalizeAchievementDetail(detail, 1);
  const requiredCount = max || normalizedDetail.requiredCount;

  if (requiredCount > 1) {
    return (
      <AchievementProgressRow
        label="서사 도전 과제"
        value={count}
        max={requiredCount}
        challengeComplete={complete}
        detail={normalizedDetail}
        disabled={disabled}
        onDecrease={onDecrease}
        onEdit={onEdit}
        onIncrease={onIncrease}
        onToggleChallengeComplete={onToggle}
      />
    );
  }

  return (
    <div className={`achievement-toggle achievement-toggle-row${complete ? " complete" : ""}`}>
      <button
        className="achievement-toggle-main"
        type="button"
        aria-pressed={complete}
        onClick={onToggle}
        disabled={disabled}
      >
        <span className="achievement-toggle-icon" aria-hidden="true">
          <TokenIcon type="seal" />
        </span>
        <span className="achievement-item-copy">
          <span className="achievement-item-title-line">
            <strong>서사 도전 과제</strong>
          </span>
          <AchievementDetailPreview detail={normalizedDetail} />
        </span>
      </button>
      <button
        className={`achievement-challenge-status${complete ? " complete" : ""}`}
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
        onClick={onToggle}
      >
        <small>{complete ? "달성" : ""}</small>
      </button>
      <button
        className="achievement-edit-button"
        type="button"
        onClick={onEdit}
        disabled={disabled}
        title="수정"
        aria-label="서사 도전 과제 조건과 효과 수정"
      >
        <TokenIcon type="edit" />
      </button>
    </div>
  );
}

function AchievementDetailPreview({ detail }) {
  const hasCondition = Boolean(detail.conditionText);
  const effectEntries = normalizeAchievementEffectEntries(
    detail?.effectEntries,
    detail?.effects,
    detail?.effectText,
    detail?.effectIcon,
    detail?.effectAmount,
  );
  const hasEffect = effectEntries.length > 0;

  if (!hasCondition && !hasEffect) {
    return <span className="achievement-detail-preview muted">조건/효과 미입력</span>;
  }

  return (
    <span className="achievement-detail-preview">
      {hasCondition ? <MentionTokenView className="achievement-detail-condition" text={detail.conditionText} /> : null}
      {hasEffect ? (
        <span className="achievement-detail-segment">
          <span className="achievement-detail-marker" aria-hidden="true">
            ·
          </span>
          <AchievementEffectMemo detail={detail} />
        </span>
      ) : null}
    </span>
  );
}

function AchievementProgressRow({
  label,
  value,
  max,
  disabled,
  onDecrease,
  onEdit,
  onIncrease,
  detail,
  challengeComplete = false,
  onToggleChallengeComplete,
}) {
  const normalizedDetail = normalizeAchievementDetail(detail, houseAchievementMarkMax);

  return (
    <div
      className={`achievement-progress-row${onToggleChallengeComplete ? " achievement-progress-row--challenge" : ""}${
        challengeComplete && onToggleChallengeComplete ? " achievement-progress-row--challenge-complete" : ""
      }`}
    >
      {onToggleChallengeComplete ? (
        <button
          className={`achievement-challenge-toggle${challengeComplete ? " complete" : ""}`}
          type="button"
          aria-pressed={challengeComplete}
          aria-label={`${label} ${challengeComplete ? "달성" : "미달성"}`}
          disabled={disabled}
          onClick={onToggleChallengeComplete}
        >
          <span className="achievement-challenge-icon" aria-hidden="true">
            <TokenIcon type="seal" />
          </span>
          <span className="achievement-item-copy">
            <strong className="achievement-challenge-title">{label}</strong>
            <AchievementDetailPreview detail={normalizedDetail} />
          </span>
        </button>
      ) : (
        <span className="achievement-progress-label">{label}</span>
      )}
      <ProgressPips value={value} max={max} label={label} />
      <div className="counter-controls">
        <button
          className="stepper-button compact"
          type="button"
          aria-label={label + " decrease"}
          onClick={onDecrease}
          disabled={disabled || value <= 0}
        >
          <TokenIcon type="minus" />
        </button>
        <output aria-label={label + " value"}>
          {value}/{max}
        </output>
        <button
          className="stepper-button compact"
          type="button"
          aria-label={label + " increase"}
          onClick={onIncrease}
          disabled={disabled || value >= max}
        >
          <TokenIcon type="plus" />
        </button>
      </div>
      {onToggleChallengeComplete ? (
        <button
          className={`achievement-challenge-status${challengeComplete ? " complete" : ""}`}
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          disabled={disabled}
          onClick={onToggleChallengeComplete}
        >
          <small>{challengeComplete ? "달성" : ""}</small>
        </button>
      ) : null}
      {onEdit ? (
        <button
          className="achievement-edit-button"
          type="button"
          onClick={onEdit}
          disabled={disabled}
          title="수정"
          aria-label={`${label} 조건과 효과 수정`}
        >
          <TokenIcon type="edit" />
        </button>
      ) : null}
    </div>
  );
}

function AlignmentProgressRow({
  alignment,
  value,
  max,
  reward,
  disabled,
  onDecrease,
  onIncrease,
}) {
  const complete = value >= max;
  const normalizedReward = normalizeAlignmentReward(reward);
  const showReward = complete && normalizedReward.crownType && normalizedReward.count > 0;

  return (
    <div className={`alignment-progress-row${complete ? " complete" : ""}`}>
      <span>
        <strong>{alignment.koreanLabel}</strong>
        <small>{alignment.label}</small>
      </span>
      {showReward ? (
        <AlignmentRewardCrowns
          crownType={normalizedReward.crownType}
          count={normalizedReward.count}
          label={alignment.koreanLabel}
        />
      ) : (
        <ProgressPips value={value} max={max} label={`${alignment.koreanLabel} 성향 업적`} />
      )}
      <div className="counter-controls">
        <button
          className="stepper-button compact"
          type="button"
          aria-label={`${alignment.koreanLabel} 성향 업적 줄이기`}
          onClick={onDecrease}
          disabled={disabled || value <= 0}
        >
          <TokenIcon type="minus" />
        </button>
        <output aria-label={`${alignment.koreanLabel} 성향 업적 표시 수`}>
          {value}/{max}
        </output>
        <button
          className="stepper-button compact"
          type="button"
          aria-label={`${alignment.koreanLabel} 성향 업적 늘리기`}
          onClick={onIncrease}
          disabled={disabled || value >= max}
        >
          <TokenIcon type="plus" />
        </button>
      </div>
    </div>
  );
}

function AlignmentRewardCrowns({ crownType, count, label }) {
  const rewardLabel = alignmentRewardTypeLabels[crownType] || "보상";

  return (
    <span
      className={`alignment-reward-crowns tone-${crownType}`}
      aria-label={`${label} 보상 ${rewardLabel} ${count}개`}
    >
      {Array.from({ length: count }, (_, index) => (
        <TokenIcon type={crownType} key={index} />
      ))}
    </span>
  );
}
function ProgressPips({ value, max, label }) {
  return (
    <span className="progress-pips" aria-label={`${label} ${value}/${max}`}>
      {Array.from({ length: max }, (_, index) => (
        <span className={index < value ? "checked" : ""} key={index} aria-hidden="true" />
      ))}
    </span>
  );
}

function normalizeFinalBoardInput(value) {
  const trimmed = String(value).trim();

  if (!trimmed) {
    return "";
  }

  const number = Number(trimmed);

  if (!Number.isFinite(number)) {
    return "";
  }

  return String(Math.max(1, Math.min(17, Math.trunc(number))));
}

function isFinalBoardDraftComplete(draft) {
  return resourceCounters.every((resource) => {
    const value = Number(draft[resource.id]);
    return Number.isInteger(value) && value >= 1 && value <= 17;
  });
}

function createFinalBoardPayload(draft) {
  return Object.fromEntries(resourceCounters.map((resource) => [resource.id, Number(draft[resource.id])]));
}

function formatSignedScore(value) {
  return value > 0 ? `+${value}` : String(value);
}

function createClientId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getClipboardImageFiles(clipboardData) {
  if (!clipboardData) {
    return [];
  }

  const itemFiles = Array.from(clipboardData.items || [])
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter(Boolean);

  if (itemFiles.length) {
    return itemFiles;
  }

  return Array.from(clipboardData.files || []).filter((file) => file.type.startsWith("image/"));
}

async function createDilemmaPhotoAttachment(file) {
  if (!dilemmaPhotoAllowedTypes.has(file?.type)) {
    throw new Error("이미지 파일만 첨부할 수 있습니다.");
  }

  if (file.size > dilemmaPhotoMaxInputBytes) {
    throw new Error("사진 파일은 8MB 이하만 첨부할 수 있습니다.");
  }

  const dataUrl = await resizeDilemmaPhoto(file);

  if (dataUrl.length > dilemmaPhotoMaxDataUrlLength) {
    throw new Error("사진 용량이 큽니다. 더 작은 사진을 선택하세요.");
  }

  const mimeType = dataUrl.startsWith("data:image/png") ? "image/png" : "image/jpeg";

  return {
    id: createClientId(),
    name: file.name || "딜레마 사진",
    mimeType,
    dataUrl,
    size: file.size,
    addedAt: new Date().toISOString(),
    addedBy: null,
    addedByName: "",
  };
}

async function resizeDilemmaPhoto(file) {
  const inputDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(inputDataUrl);
  const scale = Math.min(1, dilemmaPhotoMaxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("사진을 처리하지 못했습니다.");
  }

  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", dilemmaPhotoQuality);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("사진을 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("사진을 불러오지 못했습니다."));
    image.src = src;
  });
}

function createDilemmaDraft(value = {}) {
  const candidate = value && typeof value === "object" ? value : {};

  return {
    historyId: normalizeTextField(candidate.historyId),
    cardCode: normalizeTextField(candidate.cardCode),
    title: normalizeTextField(candidate.title),
    timeCounterSlot: normalizeTextField(candidate.timeCounterSlot),
    context: normalizeTextField(candidate.context),
    question: normalizeTextField(candidate.question),
    councilNotes: normalizeTextField(candidate.councilNotes),
    aye: normalizeDilemmaOutcome(candidate.aye),
    nay: normalizeDilemmaOutcome(candidate.nay),
    selectedOutcome: candidate.selectedOutcome === "aye" || candidate.selectedOutcome === "nay" ? candidate.selectedOutcome : "",
    voteNotes: normalizeTextField(candidate.voteNotes),
    resolutionNotes: normalizeTextField(candidate.resolutionNotes),
    votes: normalizeDilemmaVotes(candidate.votes),
    photos: normalizeDilemmaPhotos(candidate.photos),
  };
}

function createDilemmaPayload(draft) {
  return {
    ...createDilemmaDraft(draft),
    updatedAt: "",
    updatedBy: null,
    updatedByName: "",
    editLock: null,
  };
}

function normalizeDilemmaRecord(value) {
  const candidate = value && typeof value === "object" ? value : {};
  const draft = createDilemmaDraft(candidate);

  return {
    ...draft,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : "",
    updatedBy: typeof candidate.updatedBy === "string" ? candidate.updatedBy : null,
    updatedByName: normalizeTextField(candidate.updatedByName),
    editLock: normalizeDilemmaEditLock(candidate.editLock),
  };
}

function normalizeDilemmaHistoryEntry(value) {
  const candidate = value && typeof value === "object" ? value : {};
  const record = normalizeDilemmaRecord(candidate);

  return {
    ...record,
    historyId: normalizeTextField(candidate.historyId) || record.historyId || createClientId(),
    savedAt: typeof candidate.savedAt === "string" ? candidate.savedAt : record.updatedAt,
    savedBy: typeof candidate.savedBy === "string" ? candidate.savedBy : record.updatedBy,
    savedByName: normalizeTextField(candidate.savedByName) || record.updatedByName,
  };
}

function normalizeDilemmaOutcome(value) {
  const candidate = value && typeof value === "object" ? value : {};

  return {
    preview: normalizeTextField(candidate.preview),
    result: normalizeTextField(candidate.result),
    resourceDeltas: normalizeDilemmaResourceDeltas(candidate.resourceDeltas),
  };
}

function normalizeDilemmaResourceDeltas(value) {
  const candidate = value && typeof value === "object" ? value : {};
  const nextDeltas = {};

  resourceCounters.forEach((resource) => {
    const delta = clampDilemmaResourceDelta(candidate[resource.id]);

    if (delta !== 0) {
      nextDeltas[resource.id] = delta;
    }
  });

  return nextDeltas;
}

function normalizeDilemmaVotes(value) {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([houseId, vote]) => [houseId, normalizeDilemmaVote(vote)])
      .filter(([, vote]) => vote.side),
  );
}

function normalizeDilemmaVote(value) {
  const candidate = value && typeof value === "object" ? value : {};
  const side = candidate.side === "aye" || candidate.side === "nay" || candidate.side === "pass" ? candidate.side : "";

  return {
    side,
    powerTokens: side === "pass" ? 0 : normalizeCounter(candidate.powerTokens, inventoryCounterMax.powerTokens, 0),
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : "",
    updatedByName: normalizeTextField(candidate.updatedByName),
  };
}

function sumDilemmaVotes(votes, participants, side) {
  return participants.reduce((total, house) => {
    const vote = normalizeDilemmaVote(votes[house.id]);
    return total + (vote.side === side ? vote.powerTokens : 0);
  }, 0);
}

function getDilemmaSideLeader(votes, participants, side) {
  const leaders = participants
    .map((house, index) => ({
      house,
      index,
      vote: normalizeDilemmaVote(votes[house.id]),
    }))
    .filter((item) => item.vote.side === side && item.vote.powerTokens > 0)
    .sort((left, right) => right.vote.powerTokens - left.vote.powerTokens || left.index - right.index);

  return leaders[0] || null;
}

function formatDilemmaSideLeader(votes, participants, side) {
  const leader = getDilemmaSideLeader(votes, participants, side);

  if (!leader) {
    return "없음";
  }

  return `${getHouseKoreanName(leader.house)} ${leader.vote.powerTokens}권력`;
}

function formatDilemmaVoteAdvantage(ayePower, nayPower) {
  if (ayePower > nayPower) {
    return `찬성 우세 +${ayePower - nayPower}`;
  }

  if (nayPower > ayePower) {
    return `반대 우세 +${nayPower - ayePower}`;
  }

  return "동률";
}

function createDilemmaVoteGroups(votes, houses = []) {
  const housesById = new Map((houses || []).map((house) => [house.id, house]));
  const groupDefs = [
    { side: "aye", label: "찬성" },
    { side: "nay", label: "반대" },
    { side: "pass", label: "기권" },
  ];
  const items = Object.entries(votes)
    .map(([houseId, vote]) => {
      const normalizedVote = normalizeDilemmaVote(vote);

      if (!normalizedVote.side) {
        return null;
      }

      const house = housesById.get(houseId) || HOUSE_CATALOG.find((candidate) => candidate.id === houseId) || null;
      const houseName = getHouseKoreanName(house);
      const displayName = normalizedVote.updatedByName || house?.name || houseName;

      return {
        houseId,
        house,
        side: normalizedVote.side,
        name: displayName,
        houseName,
        hoverLabel: getHouseHoverLabel(house, displayName),
        houseNumber: house?.number || 0,
        powerTokens: normalizedVote.powerTokens,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.houseNumber - right.houseNumber || left.name.localeCompare(right.name));

  return groupDefs.map((group) => ({
    ...group,
    items: items.filter((item) => item.side === group.side),
    powerTotal: items
      .filter((item) => item.side === group.side)
      .reduce((total, item) => total + item.powerTokens, 0),
  }));
}

function formatDilemmaVoteGroupMetric(group) {
  if (group.side === "pass") {
    return `${group.items.length}명`;
  }

  return `${group.powerTotal}권력`;
}

function compactDilemmaResourceDeltas(value) {
  return normalizeDilemmaResourceDeltas(value);
}

function dilemmaResourceDeltasHaveValues(value) {
  const deltas = normalizeDilemmaResourceDeltas(value);

  return resourceCounters.some((resource) => (deltas[resource.id] || 0) !== 0);
}

function clampDilemmaResourceDelta(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(-dilemmaResourceDeltaLimit, Math.min(dilemmaResourceDeltaLimit, Math.trunc(number)));
}

function formatDilemmaResourceDelta(value) {
  const delta = clampDilemmaResourceDelta(value);

  return delta > 0 ? `+${delta}` : String(delta);
}

function normalizeDilemmaPhotos(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((photo) => {
      const candidate = photo && typeof photo === "object" ? photo : {};
      return {
        id: normalizeTextField(candidate.id) || createClientId(),
        name: normalizeTextField(candidate.name) || "딜레마사진",
        mimeType: normalizeTextField(candidate.mimeType) || "image/jpeg",
        dataUrl: normalizeTextField(candidate.dataUrl),
        size: typeof candidate.size === "number" && Number.isFinite(candidate.size) ? Math.max(0, candidate.size) : 0,
        addedAt: typeof candidate.addedAt === "string" ? candidate.addedAt : "",
        addedBy: typeof candidate.addedBy === "string" ? candidate.addedBy : null,
        addedByName: normalizeTextField(candidate.addedByName),
      };
    })
    .filter((photo) => photo.dataUrl)
    .slice(0, dilemmaPhotoLimit);
}

function normalizeDilemmaEditLock(value) {
  if (!value || typeof value !== "object" || typeof value.houseId !== "string") {
    return null;
  }

  return {
    houseId: value.houseId,
    houseName: normalizeTextField(value.houseName),
    acquiredAt: typeof value.acquiredAt === "string" ? value.acquiredAt : "",
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : "",
    expiresAt: typeof value.expiresAt === "string" ? value.expiresAt : "",
  };
}

function normalizeTextField(value) {
  return typeof value === "string" ? value : "";
}

function isDilemmaBlank(dilemma) {
  const draft = createDilemmaDraft(dilemma);

  const textFieldsBlank = [
    draft.cardCode,
    draft.title,
    draft.timeCounterSlot,
    draft.context,
    draft.question,
    draft.councilNotes,
    draft.aye.preview,
    draft.aye.result,
    draft.nay.preview,
    draft.nay.result,
    draft.voteNotes,
    draft.resolutionNotes,
    draft.selectedOutcome,
  ].every((value) => !String(value).trim());

  return (
    textFieldsBlank &&
    !dilemmaResourceDeltasHaveValues(draft.aye.resourceDeltas) &&
    !dilemmaResourceDeltasHaveValues(draft.nay.resourceDeltas) &&
    draft.photos.length === 0
  );
}

function formatDilemmaCardLabel(dilemma) {
  const code = dilemma.cardCode.trim();
  const title = dilemma.title.trim();

  if (code && title) {
    return `${code} · ${title}`;
  }

  return code || title || "";
}

function formatLocalDateTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeInventory(value) {
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
        normalizeCounter(resources[counter.id], counter.max, defaults.resources[counter.id]),
      ]),
    ),
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : defaults.updatedAt,
  };
}

function normalizeHouseProgress(value) {
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
  const narrativeAchievementDetail = normalizeAchievementDetail(candidate.narrativeAchievementDetail, 1);
  const houseAchievementDetails = Array.isArray(candidate.houseAchievementDetails)
    ? candidate.houseAchievementDetails.map((detail) => normalizeAchievementDetail(detail, houseAchievementMarkMax))
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

function getAlignmentKoreanLabels(alignments = []) {
  return alignments.map((alignment) => houseAlignmentLabelById[alignment] || alignment);
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

function createDefaultHouseProgress() {
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

function normalizeHouseAlignmentOrder(value) {
  const candidate = Array.isArray(value) ? value : defaultHouseAlignmentOrder;
  const allowed = new Set(defaultHouseAlignmentOrder);
  const next = [];

  for (const item of candidate) {
    if (typeof item === "string" && allowed.has(item) && !next.includes(item)) {
      next.push(item);
    }
  }

  for (const agendaId of defaultHouseAlignmentOrder) {
    if (!next.includes(agendaId)) {
      next.push(agendaId);
    }
  }

  return next;
}

function createGameStartDefaultsConfirmMessage() {
  const inventoryDefaults = createDefaultInventory();
  const progressDefaults = createDefaultHouseProgress();
  const resourceDefaultText = resourceCounters
    .map((counter) => `${counter.label} ${inventoryDefaults.resources[counter.id]}`)
    .join(", ");
  const openAgendaDefaultText = openAgendaTokenTypes
    .map((type) => `${type.shortLabel} ${progressDefaults.openAgendaTokens[type.id].length}/${openAgendaTokenLimit}`)
    .join(", ");
  const narrativeRequiredCount = getAchievementRequiredCount(progressDefaults.narrativeAchievementDetail);
  const challengeRequiredCounts = progressDefaults.houseAchievementDetails.map((detail) =>
    getAchievementRequiredCount(detail),
  );
  const sameChallengeCount = challengeRequiredCounts.every((count) => count === challengeRequiredCounts[0]);
  const challengeDefaultText = sameChallengeCount
    ? `${progressDefaults.houseAchievements.length}개 모두 0/${challengeRequiredCounts[0]}`
    : progressDefaults.houseAchievements
        .map((count, index) => {
          const label = houseAchievementRows[index]?.label || `도전 과제 ${index + 1}`;
          return `${label} ${count}/${challengeRequiredCounts[index]}`;
        })
        .join(", ");

  return [
    "장부를 게임 시작 기본값으로 맞출까요?",
    "",
    "초기화:",
    `- 코인 ${inventoryDefaults.coins}, 권력 ${inventoryDefaults.powerTokens}`,
    `- 명망 ${inventoryDefaults.prestige}, 갈망 ${inventoryDefaults.crave}`,
    `- 왕국 자원 ${resourceCounters.length}종 ${resourceDefaultText}`,
    `- 공개 의제: ${openAgendaDefaultText}`,
    `- 서사 도전 과제: ${progressDefaults.narrativeAchievementCount}/${narrativeRequiredCount}`,
    `- 도전 과제: ${challengeDefaultText}`,
    `- 선호 의제: ${houseAlignmentRows.length}개 모두 0/${houseAlignmentMarkMax}`,
    `- 달성 보상: ${houseAlignmentRows.length}개 모두 없음`,
  ].join("\n");
}

function createDefaultAlignmentReward() {
  return {
    crownType: "",
    count: 0,
  };
}

function normalizeAlignmentReward(value, fallback = createDefaultAlignmentReward()) {
  const candidate = value && typeof value === "object" ? value : {};
  const crownType = candidate.crownType === "prestige" || candidate.crownType === "crave" ? candidate.crownType : "";
  const count = normalizeCounter(candidate.count, alignmentRewardCountMax, fallback.count);

  return {
    crownType: count > 0 ? crownType : "",
    count: crownType ? count : 0,
  };
}

function createDefaultAchievementDetail(requiredCount) {
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

function normalizeAchievementDetail(value, fallbackRequiredCount) {
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

function createDefaultAchievementEffectEntry() {
  return {
    icon: "instant",
    amount: 0,
    text: "",
  };
}

function applyAchievementEffectEntries(detail, entries) {
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

function addAchievementEffectEntry(entries) {
  const normalizedEntries = normalizeAchievementEffectEntries(entries);
  return normalizedEntries.length >= achievementEffectEntryMax
    ? normalizedEntries
    : [...normalizedEntries, createDefaultAchievementEffectEntry()];
}

function removeAchievementEffectEntryAt(entries, index) {
  return normalizeAchievementEffectEntries(entries).filter((_, entryIndex) => entryIndex !== index);
}

function updateAchievementEffectEntryAt(entries, index, patch) {
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

function normalizeLegacyAchievementDetailUpdate(detail) {
  return normalizeAchievementDetail(detail, detail?.requiredCount || houseAchievementMarkMax);
}

function updateAchievementDetailDraft(detail, field, value) {
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
    });
  }

  return {
    ...detail,
    [field]: value,
  };
}

function getAchievementEffectOption(effectIcon) {
  return achievementEffectOptionById[effectIcon] || achievementEffectOptionById[""];
}

function normalizeAchievementEffectIcon(value) {
  return typeof value === "string" && achievementEffectOptionById[value]?.id ? value : "";
}

function normalizeAchievementEffectAmount(value, effectIcon) {
  if (!achievementEffectAmountOptionIds.has(effectIcon)) {
    return 0;
  }

  return normalizeCounter(value, achievementEffectAmountMax, 0);
}

function normalizeAchievementEffectEntries(value, legacyEffects, legacyEffectText, legacyEffectIcon, legacyEffectAmount) {
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

function normalizeAchievementEffectsFromEntries(entries) {
  const seen = new Set();
  const effects = [];

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

function normalizeAchievementEffects(value, legacyEffectIcon, legacyEffectAmount) {
  const candidates =
    Array.isArray(value) && value.length > 0
      ? value
      : typeof legacyEffectIcon === "string" && legacyEffectIcon
        ? [{ icon: legacyEffectIcon, amount: legacyEffectAmount }]
        : [];
  const seen = new Set();
  const effects = [];

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

function formatAchievementEffectEntriesText(entries) {
  return normalizeAchievementEffectEntries(entries)
    .map((entry) => entry.text)
    .filter(Boolean)
    .join(" · ")
    .slice(0, achievementDetailTextMaxLength);
}

function normalizeAchievementText(value) {
  return typeof value === "string"
    ? value.replace(/\r\n?/g, "\n").trim().slice(0, achievementDetailTextMaxLength)
    : "";
}

function normalizeRequiredCount(value, fallback = houseAchievementMarkMax) {
  const fallbackValue = getAchievementRequiredCount({ requiredCount: fallback });
  const number = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(number)) {
    return fallbackValue;
  }

  return Math.max(1, Math.min(houseAchievementMarkMax, Math.trunc(number)));
}

function getAchievementRequiredCount(detail) {
  const number = Number(detail?.requiredCount);

  if (!Number.isFinite(number)) {
    return houseAchievementMarkMax;
  }

  return Math.max(1, Math.min(houseAchievementMarkMax, Math.trunc(number)));
}

function normalizeCounter(value, max, fallback) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return clampCounter(value, max);
}

function clampCounter(value, max) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(max, Math.trunc(value)));
}

function inventoriesMatch(left, right) {
  return inventoryCounters.every((counter) => left[counter.id] === right[counter.id]);
}

function progressMatches(left, right) {
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

function progressMatchesExceptAlignmentRewards(left, right) {
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

function achievementDetailsMatch(left, right) {
  const leftDetail = normalizeAchievementDetail(left, houseAchievementMarkMax);
  const rightDetail = normalizeAchievementDetail(right, houseAchievementMarkMax);

  return (
    leftDetail.conditionText === rightDetail.conditionText &&
    leftDetail.requiredCount === rightDetail.requiredCount &&
    achievementEffectEntriesMatch(leftDetail.effectEntries, rightDetail.effectEntries)
  );
}

function achievementEffectEntriesMatch(left, right) {
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

function alignmentRewardsMatch(left, right) {
  const leftReward = normalizeAlignmentReward(left);
  const rightReward = normalizeAlignmentReward(right);

  return leftReward.crownType === rightReward.crownType && leftReward.count === rightReward.count;
}

function normalizeOpenAgendaTokens(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set();
  const tokens = [];

  for (const resourceId of value) {
    if (!resourceCounters.some((resource) => resource.id === resourceId) || seen.has(resourceId)) {
      continue;
    }

    seen.add(resourceId);
    tokens.push(resourceId);

    if (tokens.length >= openAgendaTokenLimit) {
      break;
    }
  }

  return tokens;
}

function arraysMatch(left = [], right = []) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function OwnChoice({ agenda, onOpenSecretAgendaGuide }) {
  if (!agenda) {
    return null;
  }

  return (
    <div className="own-choice">
      <div>
        <div className="own-choice-heading">
          <h3>
            <AgendaTitle agenda={agenda} />
          </h3>
          <SecretAgendaScoreHelpButton onClick={onOpenSecretAgendaGuide} />
        </div>
        <AgendaScoringBoard agenda={agenda} />
      </div>
    </div>
  );
}

function ActionPanel({ state, busy, mutate }) {
  if (!state.canDiscard) {
    return null;
  }

  if (!state.randomDiscardEnabled) {
    return (
      <div className="action-card">
        <div>
          <p className="section-label">보이는 의제 폐기</p>
          <h3>폐기할 의제 직접 선택</h3>
          <p>아래 목록에서 이번 드래프트에서 제외할 비밀 의제 1장을 고릅니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="action-card">
      <div>
        <p className="section-label">보이는 의제 폐기</p>
        <h3>보이는 의제 1장을 무작위 폐기</h3>
        <p>폐기할 의제는 공개하지 않습니다.</p>
      </div>
      <button className="primary-button" type="button" onClick={() => mutate({ action: "discard" })} disabled={busy}>
        <TokenIcon type="flame" />
        무작위 폐기
      </button>
    </div>
  );
}

function AgendaList({ agendas, busy, mode = "choose", mutate }) {
  const [expanded, setExpanded] = useState(false);
  const discardMode = mode === "discard";

  if (!agendas.length) {
    return null;
  }

  return (
    <section className="agenda-section" aria-labelledby="agenda-title">
      <div className="agenda-section-heading">
        <div>
          <p className="section-label">{discardMode ? "폐기" : "드래프트"}</p>
          <h2 id="agenda-title">{discardMode ? "폐기할 비밀 의제 선택" : "선택 가능한 비밀 의제"}</h2>
        </div>
        <span>{agendas.length}장 남음</span>
      </div>
      <div className="agenda-list" id="agenda-list">
        {agendas.map((agenda) => (
          <AgendaCard
            key={agenda.id}
            agenda={agenda}
            busy={busy}
            expanded={expanded}
            mode={mode}
            mutate={mutate}
          />
        ))}
      </div>
      <div className="agenda-section-controls">
        <button
          className="ghost-button agenda-expand-toggle"
          type="button"
          aria-controls="agenda-list"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
        >
          <TokenIcon type={expanded ? "minus" : "plus"} />
          {expanded ? "접기" : "자세히"}
        </button>
      </div>
    </section>
  );
}

function AgendaCard({ agenda, busy, expanded, mode = "choose", mutate }) {
  const detailId = `agenda-detail-${agenda.id}`;
  const discardMode = mode === "discard";
  const choose = () => {
    const confirmed = window.confirm(
      discardMode
        ? "이 비밀 의제를 폐기할까요? 폐기 후에는 되돌릴 수 없습니다."
        : "이 비밀 의제를 채택할까요? 채택 후에는 되돌릴 수 없습니다.",
    );

    if (confirmed) {
      mutate({ action: discardMode ? "discard" : "choose", agendaId: agenda.id });
    }
  };

  return (
    <article className={`agenda-card${expanded ? " expanded" : ""}`}>
      <div className="agenda-card-top">
        <span className="agenda-sigil" aria-hidden="true">
          <TokenIcon type="scroll" />
        </span>
        <div className="agenda-card-title">
          <div className="agenda-card-label-row">
            <div className="agenda-card-label-actions">
              <p className="section-label">비밀 의제</p>
            </div>
            <button className="primary-button" type="button" onClick={choose} disabled={busy}>
              <TokenIcon type={discardMode ? "flame" : "key"} />
              {discardMode ? "폐기" : "채택"}
            </button>
          </div>
          <h3>
            <AgendaTitle agenda={agenda} />
          </h3>
        </div>
      </div>
      <div className="agenda-card-detail" hidden={!expanded} id={detailId}>
        <AgendaScoringBoard agenda={agenda} />
      </div>
    </article>
  );
}

function SecretAgendaScoreHelpButton({ onClick }) {
  if (!onClick) {
    return null;
  }

  return (
    <button
      className="agenda-score-help-button"
      type="button"
      aria-label="비밀 의제 점수 산정 방식 자세히 보기"
      onClick={onClick}
    >
      <TokenIcon type="help" />
      비밀 의제 점수
    </button>
  );
}

function AgendaScoringBoard({ agenda }) {
  return (
    <div className="agenda-score-board" aria-label={`${formatAgendaTitle(agenda)} 점수 구간`}>
      <AgendaResourceZoneStrip agenda={agenda} />
      <AgendaScoreTrack
        title="자원 구간"
        items={agenda.resourceScoring.map((item) => ({
          label: item.label,
          vp: item.vp,
        }))}
      />
      <AgendaScoreTrack
        title="재화 순위"
        items={agenda.coinRanking.map((item) => ({
          label: String(item.rank) + "위",
          vp: item.vp,
        }))}
      />
    </div>
  );
}

function AgendaResourceZoneStrip({ agenda }) {
  const zones = agendaScoringZones[agenda.id] ?? [];
  const hasDistanceMode = zones.some((zone) => zone.mode === "distance");
  const isActiveRow = (row) => zones.some((zone) => row >= zone.from && row <= zone.to);

  return (
    <div className={`agenda-zone-strip${hasDistanceMode ? " distance" : ""}`}>
      <div className="agenda-score-title">{hasDistanceMode ? "거리 산정" : "보드 구간"}</div>
      <div className="agenda-zone-cells" aria-label="점수 구간">
        {boardRows.map((row) => {
          const active = isActiveRow(row);
          const showLabel = active || row === 1 || row === 5 || row === 9 || row === 13 || row === 17;

          return (
            <span
              className={`agenda-zone-cell${row === 9 ? " center" : ""}${active ? " active" : ""}`}
              key={row}
              aria-label={row + "번 줄" + (active ? " 점수 구간" : "")}
            >
              {showLabel ? row : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function AgendaScoreTrack({ title, items }) {
  const maxVp = items.length ? Math.max(...items.map((item) => item.vp)) : 0;

  return (
    <div className="agenda-score-track">
      <div className="agenda-score-title">{title}</div>
      <div className="agenda-score-segments">
        {items.map((item) => {
          const intensity = maxVp > 0 ? item.vp / maxVp : 0;
          const isBest = item.vp === maxVp && maxVp > 0;
          const className = [
            "agenda-score-segment",
            item.vp > 0 ? "scoring" : "",
            isBest ? "best" : "",
          ]
            .filter(Boolean)
            .join(" ");
          const fillPercent = `${Math.round(intensity * 100)}%`;

          return (
            <div
              className={className}
              key={title + "-" + item.label}
              style={{ "--score-fill": fillPercent }}
              aria-label={item.label + ": " + item.vp + "점"}
            >
              <span>{item.label}</span>
              <strong>+{item.vp}</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;

