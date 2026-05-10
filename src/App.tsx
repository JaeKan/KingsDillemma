import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { agendaRequest, useAgendaMutations, useAgendaRefresh, useAgendaStateQuery } from "./app/agendaClient";
import { HouseIcon, TokenIcon } from "./components/GameIcons";
import { Tooltip } from "./components/Tooltip";

// Lazy loaded components for modular features
const SessionEndDialog = React.lazy(() => import("./components/SessionEndDialog"));
const VoteOrderDialog = React.lazy(() => import("./components/VoteOrderDialog"));
const OpenAgendaScoreDialog = React.lazy(() => import("./components/ScoreGuides").then(m => ({ default: m.OpenAgendaScoreDialog })));
const DilemmaHistoryDialog = React.lazy(() => import("./components/DilemmaHistoryDialog"));
const ScoreGuideDialog = React.lazy(() => import("./components/ScoreGuides").then(m => ({ default: m.ScoreGuideDialog })));
const AchievementEditDialog = React.lazy(() => import("./components/AchievementEditDialog"));
const SpecialAbilityLegendDialog = React.lazy(() => import("./components/SpecialAbilityLegendDialog"));
const DilemmaEditDialog = React.lazy(() => import("./components/DilemmaEditDialog"));
const DilemmaRoleDialog = React.lazy(() => import("./components/DilemmaRoleDialog"));
const SecretAgendaScoreDialog = React.lazy(() => import("./components/ScoreGuides").then(m => ({ default: m.SecretAgendaScoreDialog })));

import { MentionTokenView } from "./components/MentionUI";
import { AchievementEffectMemo } from "./components/AchievementUI";

// Feature components
const StatusItem = React.lazy(() => import("./components/DilemmaUI").then(m => ({ default: m.StatusItem })));
const VoteOrderTrack = React.lazy(() => import("./components/DilemmaUI").then(m => ({ default: m.VoteOrderTrack })));
const GameMessage = React.lazy(() => import("./components/DilemmaUI").then(m => ({ default: m.GameMessage })));
const DilemmaVotingPanel = React.lazy(() => import("./components/DilemmaUI").then(m => ({ default: m.DilemmaVotingPanel })));
const DilemmaSummaryCard = React.lazy(() => import("./components/DilemmaUI").then(m => ({ default: m.DilemmaSummaryCard })));
const TurnTrack = React.lazy(() => import("./components/DilemmaUI").then(m => ({ default: m.TurnTrack as any })));
const TurnTrackAny = TurnTrack as any;

import {
  achievementDetailTextMaxLength,
  achievementEffectAmountMax,
  achievementEffectAmountOptionIds,
  achievementEffectEntryMax,
  achievementEffectOptionById,
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
  dilemmaPhotoAllowedTypes,
  dilemmaPhotoLimit,
  dilemmaPhotoMaxDataUrlLength,
  dilemmaPhotoMaxDimension,
  dilemmaPhotoMaxInputBytes,
  dilemmaPhotoQuality,
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
  REQUIRED_HOUSE_COUNT,
  resourceCounters,
  rulebookPdfUrl,
  scoreTrackCounters,
  sessionEndChecklistItems,
  sessionEndUnavailableMessage,
  sharedBoardSheetUrl,
  tokenCounters,
  ko,
} from "./resources/gameResources";

import {
  isCustomNameReady,
  getHouses,
  getHouseKoreanName,
  getHouseStatus,
  getHouseTone,
  getCurrentHouse,
  getHouseDisplayName,
  getCouncilStageLabel,
  getCouncilProcedureTitle,
  getDilemmaProgressLabel,
  getDilemmaVoteParticipants,
  getVoteOrderHouses,
  isVoteOrderSettingLocked,
} from "./utils/house-helpers";

import {
  isDilemmaVoteCompleteForPublish,
  isDilemmaBlank,
  normalizeDilemmaRecord,
  createDilemmaDraft,
  createDilemmaPayload,
  createClientId,
} from "./utils/dilemma-helpers";
function CarrotWaitAction() {
  const shakeRef = useRef<(() => void) | null>(null);
  const loadRef = useRef<Promise<void> | null>(null);

  const handleClick = useCallback(async () => {
    try {
      if (!shakeRef.current) {
        loadRef.current ??= import("./Carrot").then((module) => {
          shakeRef.current = module.Carrot;
        });
        await loadRef.current;
      }
      shakeRef.current?.();
    } catch {
      /* matter-js / 캔버스 초기화 실패 등 */
    }
  }, []);

  return (
    <div className="carrot-wait-action">
      <button
        className="carrot-button"
        type="button"
        onClick={() => void handleClick()}
        aria-label={ko.carrot.triggerAriaLabel}
      >
        <span className="carrot-button-icon" aria-hidden="true">
          🥕
        </span>
        <span className="carrot-button-label">{ko.carrot.triggerLabel}</span>
      </button>
    </div>
  );
}

function createFinalBoardDraft() {
  return Object.fromEntries(resourceCounters.map((resource) => [resource.id, ""]));
}

function createSessionEndChecklistState() {
  return Object.fromEntries(sessionEndChecklistItems.map((item) => [item.id, false]));
}

function clampBgmVolume(value: any) {
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

function writeStoredBgmMuted(muted: any) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(bgmMutedStorageKey, muted ? "true" : "false");
  } catch {
    // Ignore storage failures; audio state still works for the current page.
  }
}

function writeStoredBgmVolume(volume: any) {
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
  const [openAgendaGuideOpen, setOpenAgendaGuideOpen] = useState(false);
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
  const openAgendaGuideToggleRef = useRef(null);
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
  }, [authenticated, mutationInFlight, realtimeEnabled, refresh, sessionEndDialogOpen, sessionStatus]);

  useEffect(() => {
    const audio = bgmAudioRef.current as any;

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
    const audio = bgmAudioRef.current as any;

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
      queueMicrotask(() => {
        setFinalScoring(null);
        setFinalScoringBusy(false);
        setSessionEndChecklist((current) => (current.scores ? { ...current, scores: false } : current));
      });
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
        } catch (requestError: any) {
          if (finalScoringRequest.current === requestId) {
            setFinalScoring(null);
            setSessionEndChecklist((current: any) => (current.scores ? { ...current, scores: false } : current));
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

  const handleLogin = async (event: any) => {
    event.preventDefault();
    const selectedHouse = getHouses(state).find((house: any) => house.id === houseInput);
    const needsDisplayName =
      selectedHouse != null && (!selectedHouse.hasPassword || !selectedHouse.hasCustomName);

    if (!selectedHouse?.hasPassword && seatPassword !== seatPasswordConfirm) {
      setError(ko.app.errors.passwordMismatch);
      return;
    }

    if (needsDisplayName && !isCustomNameReady(displayName)) {
      setError(ko.app.errors.displayNameInvalid);
      return;
    }

    const result = await mutate({
      action: "login",
      houseId: houseInput,
      password: seatPassword,
      displayName: needsDisplayName ? displayName.trim() : undefined,
    });

    if ((result as any)?.authenticated) {
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
    const code = window.prompt(ko.app.errors.resetCodePrompt);

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

  const handleFinalBoardChange = (resourceId: any, value: any) => {
    setFinalBoardDraft((current) => ({
      ...current,
      [resourceId]: normalizeFinalBoardInput(value),
    }));
    setFinalScoring(null);
    setSessionEndChecklist((current) => (current.scores ? { ...current, scores: false } : current));
  };

  const handleToggleSessionEndCheck = (itemId: any) => {
    if (itemId === "scores" && !finalScoring) {
      return;
    }

    setSessionEndChecklist((current) => ({
      ...current,
      [itemId]: !(current as any)[itemId],
    }));
  };

  const handleCancelSessionEnd = () => {
    setSessionEndDialogOpen(false);
  };

  const handleConfirmSessionEnd = async () => {
    if (!sessionEndChecklistComplete) {
      setError(ko.app.errors.checklistIncomplete);
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

  const handleOpenVoteOrderDialog = useCallback((eventOrOptions: any) => {
    setSettingsOpen(false);
    setTipsOpen(false);

    const restoreFocusTarget = eventOrOptions?.restoreFocusTarget || eventOrOptions?.currentTarget;

    if (restoreFocusTarget) {
      voteOrderToggleRef.current = restoreFocusTarget;
    }

    setVoteOrderDialogOpen(true);
  }, []);

  const handleCloseVoteOrderDialog = useCallback(() => {
    setVoteOrderDialogOpen(false);
  }, []);

  const handleSaveVoteOrder = useCallback(
    async ({ voteOrder }: { voteOrder: any }) => (await mutate({ action: "saveDilemmaVoteOrder", voteOrder })) as boolean,
    [mutate],
  );

  const handleDeleteDilemmaHistory = useCallback(
    async (historyId: any) => {
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

  const handleOpenOpenAgendaGuide = useCallback((event: any) => {
    if (event?.currentTarget) {
      openAgendaGuideToggleRef.current = event.currentTarget;
    }
    setOpenAgendaGuideOpen(true);
  }, []);

  const handleCloseOpenAgendaGuide = useCallback(() => {
    setOpenAgendaGuideOpen(false);
  }, []);

  const handleOpenSecretAgendaGuide = useCallback((event: any) => {
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
    const nextVolume = !nextMuted && bgmVolume === 0 ? defaultBgmVolume : bgmVolume;
    const audio = bgmAudioRef.current as any;

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

  const handleBgmVolumeChange = useCallback((event: any) => {
    const nextVolume = clampBgmVolume(event.target.valueAsNumber / 100);
    const nextMuted = nextVolume === 0;
    const audio = bgmAudioRef.current as any;

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
      <header className="app-header" aria-label={ko.app.header.game}>
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
          onOpenVoteOrderDialog={handleOpenVoteOrderDialog}
          onOpenOpenAgendaGuide={handleOpenOpenAgendaGuide}
          onOpenSecretAgendaGuide={handleOpenSecretAgendaGuide}
        />
      )}
      <Suspense fallback={null}>
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
        <ScoreGuideDialog open={scoreGuideOpen} onClose={handleCloseScoreGuide} restoreFocusRef={tipsToggleRef as any} />
        <OpenAgendaScoreDialog
          open={openAgendaGuideOpen}
          onClose={handleCloseOpenAgendaGuide}
          restoreFocusRef={openAgendaGuideToggleRef as any}
        />
        <SecretAgendaScoreDialog
          open={secretAgendaGuideOpen}
          onClose={handleCloseSecretAgendaGuide}
          restoreFocusRef={secretAgendaGuideToggleRef as any}
        />
        <DilemmaHistoryDialog
          busy={busy}
          currentHouseId={state?.currentHouseId || null}
          history={state?.dilemmaHistory || []}
          open={dilemmaHistoryOpen}
          onClose={handleCloseDilemmaHistory}
          onDelete={handleDeleteDilemmaHistory}
          restoreFocusRef={dilemmaHistoryToggleRef as any}
        />
        <VoteOrderDialog
          busy={busy}
          open={voteOrderDialogOpen}
          state={state}
          onClose={handleCloseVoteOrderDialog}
          onSave={handleSaveVoteOrder}
          restoreFocusRef={voteOrderToggleRef as any}
        />
      </Suspense>
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
        <p className="section-label">{ko.app.sessionCheck.section}</p>
        <h2>{ko.app.sessionCheck.title}</h2>
        <p>{ko.app.sessionCheck.body}</p>
      </div>
    </section>
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
}: any) {
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
          aria-label={ko.app.settings.openSettings}
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
          aria-label={ko.app.settings.openTips}
          onClick={onToggleTips}
        >
          <TokenIcon type="tip" />
        </button>
        <button
          ref={historyToggleRef}
          className="settings-toggle"
          type="button"
          aria-haspopup="dialog"
          aria-label={ko.app.settings.dilemmaHistoryCount(historyCount)}
          onClick={onOpenDilemmaHistory}
        >
          <TokenIcon type="history" />
        </button>
      </div>
      {tipsOpen ? (
        <div className="settings-menu tips-menu" id="tips-menu">
          <button className="ghost-button wide" type="button" onClick={onOpenScoreGuide}>
            <TokenIcon type="balance" />
            {ko.app.settings.secretScoreLink}
          </button>
          <a className="settings-link" href={rulebookPdfUrl} target="_blank" rel="noreferrer">
            <TokenIcon type="scroll" />
            {ko.app.settings.rulebookPdf}
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
            {bgmMuted ? ko.app.settings.bgmUnmute : ko.app.settings.bgmMute}
          </button>
          <div className="settings-volume-control">
            <div className="settings-volume-heading">
              <label htmlFor="bgm-volume">{ko.app.settings.bgmVolume}</label>
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
            aria-label={ko.app.settings.randomDiscardAria(randomDiscardEnabled)}
            onClick={onToggleRandomDiscard}
            disabled={busy || !canToggleRandomDiscard}
          >
            <span>
              <strong>{ko.app.settings.randomDiscard}</strong>
            </span>
            <span className="settings-state-segment" aria-hidden="true">
              <span className={randomDiscardEnabled ? "active" : ""}>ON</span>
              <span className={!randomDiscardEnabled ? "active" : ""}>OFF</span>
            </span>
          </button>
          <a className="settings-link" href={sharedBoardSheetUrl} target="_blank" rel="noreferrer">
            <TokenIcon type="sheet" />
            {ko.app.settings.sharedSheet}
            <TokenIcon type="external" />
          </a>
          {authenticated ? (
            <>
              <Tooltip
                className="settings-tooltip-anchor"
                label={
                  voteOrderLocked
                    ? ko.app.settings.voteOrderLocked
                    : canEditVoteOrder
                      ? ko.app.settings.voteOrderHint
                      : ko.app.settings.voteOrderNeedFive
                }
              >
                <button
                  ref={voteOrderToggleRef}
                  className="ghost-button wide"
                  type="button"
                  onClick={onOpenVoteOrderDialog}
                  disabled={busy || !canEditVoteOrder}
                >
                  <TokenIcon type="turn" />
                  {ko.app.settings.voteOrderButton}
                </button>
              </Tooltip>
              <Tooltip
                className="settings-tooltip-anchor"
                label={canEndSession ? ko.app.settings.sessionEndReady : sessionEndUnavailableMessage}
              >
                <button
                  className="ghost-button wide session-end-button"
                  type="button"
                  onClick={onEndSession}
                  disabled={busy || !canEndSession}
                >
                  {ko.app.settings.sessionEndPrep}
                </button>
              </Tooltip>
              <button className="ghost-button wide" type="button" onClick={onLogout} disabled={busy}>
                <TokenIcon type="exit" />
                {ko.app.settings.leaveCouncil}
              </button>
            </>
          ) : null}
          <button className="ghost-button wide" type="button" onClick={onReset} disabled={busy}>
            <TokenIcon type="reset" />
            {ko.app.settings.resetKingdom}
          </button>
        </div>
      ) : null}
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
        <p className="brand-title">{ko.app.brand.title}</p>
        <h1>King's Dilemma Deck</h1>
        <p className="brand-subtitle">{ko.app.brand.subtitle}</p>
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
}: any) {
  const houses = getHouses(state);
  const selectedHouse = houses.find((house: any) => house.id === houseInput);
  const selectionClosed =
    (state?.claimedHouseCount || 0) >= (state?.requiredHouseCount || REQUIRED_HOUSE_COUNT);
  const needsDisplayName = selectedHouse != null && (!selectedHouse.hasPassword || !selectedHouse.hasCustomName);
  const passwordReady =
    selectedHouse != null &&
    seatPassword.length >= 4 &&
    (!needsDisplayName || isCustomNameReady(displayName)) &&
    (selectedHouse.hasPassword || seatPassword === seatPasswordConfirm);
  const selectHouse = (houseId: any) => {
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
          <p className="section-label">{ko.app.login.kingdomRound}</p>
          <h2 id="login-title">{ko.app.login.pickHouseH2}</h2>
          <p>{ko.app.login.pickHouseBlurb}</p>
        </div>
        {selectedHouse ? (
          <section className="entry-house-profile" aria-live="polite">
            <div className="entry-house-profile-heading">
              <div>
                <p className="section-label">{ko.app.login.houseExplain}</p>
                <h3>{getHouseKoreanName(selectedHouse)}</h3>
              </div>
              <span>#{String(selectedHouse.number).padStart(2, "0")}</span>
            </div>
            <p className="entry-house-motto">{selectedHouse.motto}</p>
            <p>{selectedHouse.profile}</p>
          </section>
        ) : (
          <p className="entry-house-placeholder">{ko.app.login.housePlaceholder}</p>
        )}
      </div>

      <form className="seat-ledger" onSubmit={onSubmit} aria-busy={busy}>
        <div className="ledger-heading">
          <div>
            <p className="section-label">{ko.app.login.rosterLabel}</p>
            <h3>{selectedHouse ? getHouseKoreanName(selectedHouse) : ko.app.login.pickHouseH3}</h3>
          </div>
          <span className="ledger-status">
            {state?.claimedHouseCount || 0} / {state?.requiredHouseCount || REQUIRED_HOUSE_COUNT} {ko.app.login.countSuffix}
          </span>
        </div>
        <fieldset className="seat-fieldset">
          <legend>{ko.app.login.seatLegend}</legend>
          <div className="seat-grid">
            {houses.map((house: any) => {
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
                      {house.hasCustomName ? house.name : selectionClosed ? ko.app.login.absentFromMeeting : ko.app.login.notChosenYet}
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
              {busy ? ko.common.saving : ko.common.save}
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
}: any) {
  if (!selectedHouse) {
    return (
      <p className="password-hint">
        <TokenIcon type="seal" />
        {ko.app.login.passwordHint}
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
          <span className="field-label">{ko.app.login.fieldPassword}</span>
          <input
            value={seatPassword}
            onChange={(event) => setSeatPassword(event.target.value)}
            type="password"
            minLength={4}
            maxLength={64}
            autoComplete="current-password"
            aria-label={ko.app.login.fieldPassword}
            placeholder={ko.app.login.fieldPassword}
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
        <span className="field-label">{ko.app.login.fieldNewPassword}</span>
        <input
          value={seatPassword}
          onChange={(event) => setSeatPassword(event.target.value)}
          type="password"
          minLength={4}
          maxLength={64}
          autoComplete="new-password"
          aria-label={ko.app.login.fieldNewPassword}
          placeholder={ko.app.login.fieldNewPassword}
          required
        />
      </label>
      <label className="credential-field">
        <span className="field-label">{ko.app.login.fieldPasswordConfirm}</span>
        <input
          value={seatPasswordConfirm}
          onChange={(event) => setSeatPasswordConfirm(event.target.value)}
          type="password"
          minLength={4}
          maxLength={64}
          autoComplete="new-password"
          aria-label={ko.app.login.fieldPasswordConfirm}
          placeholder={ko.app.login.fieldPasswordConfirm}
          required
        />
      </label>
    </div>
  );
}

function NameField({ displayName, setDisplayName }: any) {
  return (
    <label className="credential-field">
      <span className="field-label">{ko.app.login.fieldDisplayName}</span>
      <input
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        type="text"
        minLength={2}
        maxLength={32}
        autoComplete="nickname"
        aria-label={ko.app.login.fieldDisplayName}
        placeholder={ko.app.login.displayNamePlaceholder}
        required
      />
    </label>
  );
}

function GamePanel({
  state,
  busy,
  mutate,
  onOpenVoteOrderDialog,
  onOpenOpenAgendaGuide,
  onOpenSecretAgendaGuide,
}: any) {
  const voteOrderHouses = getDilemmaVoteParticipants(state);
  const currentVoteName = state.dilemmaVoteTurn ? getHouseDisplayName(state, state.dilemmaVoteTurn) : "";
  const draftTurnName = state.turn ? getHouseDisplayName(state, state.turn) : ko.app.gamePanel.beforeStart;
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
    (agendaId: any, reward: any) => mutate({ action: "saveAlignmentReward", agendaId, reward }),
    [mutate],
  );

  return (
    <section className="council-layout">
      <div className="council-sidebar-column">
        <aside className="council-sidebar" aria-live="polite">
          <section className="sidebar-status-section" aria-labelledby="sidebar-status-title">
            <div className="sidebar-title-row compact">
              <span className="sidebar-title-icon" aria-hidden="true">
                <TokenIcon type="status" />
              </span>
              <h2 id="sidebar-status-title">{ko.app.gamePanel.statusTitle}</h2>
            </div>
            <section className={`dilemma-stage phase-${state.phase}`} aria-labelledby="stage-title">
              <div className="stage-copy">
                <p className="section-label">{ko.app.gamePanel.councilProcedure}</p>
                <h2 id="stage-title">{councilProcedureTitle}</h2>
                <Suspense fallback={null}>
                  <GameMessage state={state} />
                </Suspense>
                {state.phase === "complete" && !isDilemmaBlank(state.dilemma) ? (
                  <Suspense fallback={<div className="dilemma-vote-panel-placeholder" />}>
                    <DilemmaVotingPanel state={state} busy={busy} mutate={mutate} />
                  </Suspense>
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
            <Suspense fallback={null}>
              <div className="status-stack">
                <StatusItem icon="house" label={ko.app.gamePanel.myHouse} value={currentHouseChosenName || "-"} />
                <StatusItem
                  icon="turn"
                  label={state.phase === "complete" ? ko.app.gamePanel.voteTurn : ko.app.gamePanel.turn}
                  value={state.phase === "complete" ? currentVoteName || ko.app.gamePanel.wait : draftTurnName}
                  splitParenthetical
                />
                <StatusItem icon="scroll" label={ko.app.gamePanel.currentPhase} value={councilStageLabel} />
                {state.phase === "complete" ? (
                  <>
                    <StatusItem icon="leader" label={ko.app.gamePanel.leader} value={leaderName || ko.common.notSpecified} splitParenthetical />
                    <StatusItem icon="moderator" label={ko.app.gamePanel.moderator} value={moderatorName || ko.common.notSpecified} splitParenthetical />
                    <StatusItem icon="seal" label={ko.app.gamePanel.dilemma} value={dilemmaProgressLabel} />
                  </>
                ) : (
                  <StatusItem
                    icon="seal"
                    label={state.phase === "house-select" ? ko.app.gamePanel.housePick : ko.app.gamePanel.agendaPick}
                    value={
                      state.phase === "house-select"
                        ? `${state.claimedHouseCount} / ${state.requiredHouseCount}`
                        : `${state.selectedCount} / ${state.draftOrder.length || REQUIRED_HOUSE_COUNT}`
                    }
                  />
                )}
              </div>
            </Suspense>
            <Suspense fallback={null}>
              {state.phase === "complete" ? (
                <VoteOrderTrack houses={voteOrderHouses} leaderHouseId={state.dilemmaLeader} moderatorHouseId={state.dilemmaModerator} turn={state.dilemmaVoteTurn} />
              ) : (
                <TurnTrackAny houses={state.houses} draftOrder={state.draftOrder} turn={state.turn} phase={state.phase} />
              )}
            </Suspense>
            <p className="privacy-note">{ko.app.gamePanel.privacyNote}</p>
          </section>
        </aside>
        <CarrotWaitAction />
      </div>

      <section
        className={`council-main${showAgendaList ? " has-agenda" : ""}${
          hasCouncilContext ? " has-context" : " no-context"
        }${state.phase === "complete" ? " has-dilemma" : ""}`}
      >
        {hasCouncilContext ? (
          <aside className="council-context" aria-label={ko.app.gamePanel.draftAssistAria}>
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
          onOpenVoteOrderDialog={onOpenVoteOrderDialog}
          onOpenOpenAgendaGuide={onOpenOpenAgendaGuide}
          onOpenSecretAgendaGuide={onOpenSecretAgendaGuide}
        />
      </section>
    </section>
  );
}

function HouseProfileCard({
  busy,
  house,
  progress,
  showCrest = true,
  showSectionLabel = true,
  onSaveAlignmentReward,
}: any) {
  const normalizedProgress = useMemo(() => normalizeHouseProgress(progress), [progress]);

  if (!house) {
    return null;
  }

  return (
    <div className={`house-profile-card${showCrest ? "" : " no-crest"}`} aria-labelledby="house-profile-title">
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
              {showSectionLabel ? <p className="section-label">{ko.app.gamePanel.houseDetail}</p> : null}
              <h2 id="house-profile-title">{getHouseKoreanName(house)}</h2>
            </div>
          </div>
          <span className="house-profile-number">#{String(house.number).padStart(2, "0")}</span>
        </div>
        {house.profile ? <p className="house-profile-story">{house.profile}</p> : null}
        <div className="house-profile-grid">
          <HouseProfileField label={ko.app.gamePanel.narrativeGoal} value={house.goal} />
          <HouseProfileField label={ko.app.gamePanel.preferredAgenda} value={getAlignmentKoreanLabels(house.alignments).join(" / ")} />
        </div>
        <HouseAlignmentTrack
          alignments={house.alignments || []}
          busy={busy}
          progress={normalizedProgress}
          onSaveAlignmentReward={onSaveAlignmentReward}
        />
      </div>
    </div>
  );
}

function HouseAlignmentTrack({ alignments, busy, progress, onSaveAlignmentReward }: any) {
  const favoriteAlignments = new Set(alignments);
  const alignmentByAgendaId = useMemo(
    () => new Map(houseAlignmentRows.map((alignment) => [alignment.agendaId, alignment])),
    [],
  );
  const rows = defaultHouseAlignmentOrder.map((agendaId) => alignmentByAgendaId.get(agendaId)).filter(Boolean);

  return (
    <div className="house-alignment-panel">
      <div className="house-alignment-heading">
        <span>{ko.app.gamePanel.alignmentSpan}</span>
      </div>
      <div className="house-alignment-track" aria-label={ko.app.gamePanel.alignmentTrackAria}>
        {rows.map((alignment) => (
          <HouseAlignmentRewardRow
            alignment={alignment}
            busy={busy}
            key={(alignment as any).agendaId}
            preferred={favoriteAlignments.has((alignment as any).id)}
            reward={progress?.alignmentRewards?.[(alignment as any).agendaId]}
            onSaveAlignmentReward={onSaveAlignmentReward}
          />
        ))}
      </div>
    </div>
  );
}

function HouseAlignmentRewardRow({
  alignment,
  busy,
  preferred,
  reward,
  onSaveAlignmentReward,
}: any) {
  return (
    <div
      className={`house-alignment-row${preferred ? " preferred" : ""}`}
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

function AlignmentRewardInlineEditor({ alignment, busy, reward, onSaveAlignmentReward }: any) {
  const normalizedReward = normalizeAlignmentReward(reward);
  const [draft, setDraft] = useState(() => ({
    crownType: normalizedReward.crownType || "prestige",
    count: normalizedReward.count || 0,
  }));

  useEffect(() => {
    queueMicrotask(() => {
      setDraft({
        crownType: normalizedReward.crownType || "prestige",
        count: normalizedReward.count || 0,
      });
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

function HouseAlignmentRewardControls({ alignment, busy, draft, setDraft }: any) {
  return (
    <div className="house-alignment-reward-controls" aria-label={ko.app.gamePanel.crownRewardGroupAria(alignment.koreanLabel)}>
      <div className="alignment-crown-toggle" role="group" aria-label={ko.app.gamePanel.crownTypeGroupAria(alignment.koreanLabel)}>
        {alignmentRewardTypes.map((rewardType) => (
          <Tooltip
            key={rewardType.id}
            label={rewardType.label}
          >
            <button
              className={`alignment-crown-button tone-${rewardType.tone}${
                draft.crownType === rewardType.id ? " selected" : ""
              }`}
              type="button"
              aria-label={rewardType.label}
              aria-pressed={draft.crownType === rewardType.id}
              onClick={() =>
                setDraft((current: any) => ({
                  ...current,
                  crownType: rewardType.id,
                }))
              }
              disabled={busy}
            >
              <TokenIcon type={rewardType.icon} />
            </button>
          </Tooltip>
        ))}
      </div>
      <input
        className="alignment-reward-count"
        min="0"
        max={alignmentRewardCountMax}
        type="number"
        value={draft.count}
        aria-label={ko.app.gamePanel.crownCountAria(alignment.koreanLabel)}
        onChange={(event) =>
          setDraft((current: any) => ({
            ...current,
            count: clampCounter(event.target.valueAsNumber, alignmentRewardCountMax),
          }))
        }
        disabled={busy}
      />
    </div>
  );
}

function HouseProfileField({ label, value }: any) {
  return (
    <div className="house-profile-field">
      <span className="house-profile-field-label">{label}</span>
      <div className="house-profile-value-chip">
        <strong>{value || "-"}</strong>
      </div>
    </div>
  );
}

function formatAgendaTitle(agenda: any) {
  return agenda?.name || "";
}

function formatAgendaEnglishTitle(agenda: any) {
  return agenda?.englishName || "";
}

function AgendaTitle({ agenda }: any) {
  const title = formatAgendaTitle(agenda);
  const englishTitle = formatAgendaEnglishTitle(agenda);

  return (
    <>
      <span className="agenda-title-korean">{title}</span>
      {englishTitle && englishTitle !== title ? <span className="agenda-title-english">{englishTitle}</span> : null}
    </>
  );
}

const challengeAchievementTooltip = ko.app.achievements.challengeTooltip;

const alignmentAchievementTooltip = ko.app.achievements.alignmentTooltip;

function AchievementSectionHeading({ id, label, tooltip }: any) {
  return (
    <div className="achievement-section-heading">
      <h3 id={id}>{label}</h3>
      <Tooltip label={tooltip}>
        <button className="icon-help-button achievement-heading-help-button" type="button" aria-label={ko.app.inventory.headingHelpAria(label)}>
          <TokenIcon type="help" />
        </button>
      </Tooltip>
    </div>
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
  onOpenVoteOrderDialog,
  onOpenOpenAgendaGuide,
  onOpenSecretAgendaGuide,
}: any) {
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
  const [achievementEditor, setAchievementEditor] = useState<any>(null);
  const [achievementLegendOpen, setAchievementLegendOpen] = useState(false);
  const dilemmaEditButtonRef = useRef<any>(null);
  const dilemmaRoleButtonRef = useRef<any>(null);
  const achievementEditButtonRef = useRef<any>(null);
  const achievementLegendButtonRef = useRef<any>(null);
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
  const orderedAlignmentRows = useMemo(() => {
    const alignmentByAgendaId = new Map(houseAlignmentRows.map((alignment) => [alignment.agendaId, alignment]));

    return normalizeHouseAlignmentOrder(progressDraft.alignmentOrder)
      .map((agendaId) => alignmentByAgendaId.get(agendaId))
      .filter(Boolean);
  }, [progressDraft.alignmentOrder]);

  useEffect(() => {
    if (!inventoryDirty) {
      queueMicrotask(() => setDraft(serverInventory));
    }
  }, [inventoryDirty, serverInventory]);

  useEffect(() => {
    if (!progressDirty || progressMatchesExceptAlignmentRewards(progressDraft, serverProgress)) {
      queueMicrotask(() => setProgressDraft(serverProgress));
    }
  }, [progressDirty, progressDraft, serverProgress]);

  useEffect(() => {
    if (!dilemmaDialogOpen) {
      queueMicrotask(() => {
        setDilemmaDraft(createDilemmaDraft(serverDilemma));
        setDilemmaPhotoError("");
        setDilemmaPhotoBusy(false);
      });
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

  const runLedgerAutosaveImplRef = useRef<(() => Promise<void>) | null>(null);
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
      window.clearTimeout((ledgerAutosaveTimerRef.current as any));
      ledgerAutosaveTimerRef.current = window.setTimeout(() => {
        void runLedgerAutosaveImplRef.current?.();
      }, ledgerAutosaveRetryDelayMs) as any;
      return;
    }

    setLedgerSaveStatus("saved");

    if (ledgerAutosaveQueuedRef.current) {
      ledgerAutosaveQueuedRef.current = false;
      window.clearTimeout((ledgerAutosaveTimerRef.current as any));
      ledgerAutosaveTimerRef.current = window.setTimeout(() => {
        void runLedgerAutosaveImplRef.current?.();
      }, 0) as any;
    }
  }, [houseId, mutate]);

  useEffect(() => {
    runLedgerAutosaveImplRef.current = runLedgerAutosave;
  }, [runLedgerAutosave]);

  useEffect(() => {
    window.clearTimeout(ledgerAutosaveTimerRef.current as any);

    if (!isDirty) {
      queueMicrotask(() => setLedgerSaveStatus("saved"));
      return undefined;
    }

    queueMicrotask(() =>
      setLedgerSaveStatus((current) => (current === "error" ? current : "pending")),
    );
    ledgerAutosaveTimerRef.current = window.setTimeout(runLedgerAutosave, ledgerAutosaveDelayMs) as any;

    return () => window.clearTimeout(ledgerAutosaveTimerRef.current as any);
  }, [draft, isDirty, progressDraft, runLedgerAutosave]);

  useEffect(() => {
    return () => window.clearTimeout(ledgerAutosaveTimerRef.current as any);
  }, []);

  const adjustCounter = (counter: any, delta: any) => {
    setDraft((current) => ({
      ...current,
      [counter.id]: clampCounter((current as any)[counter.id] + delta, counter.max),
    }));
  };

  const toggleOpenAgendaToken = (polarity: any, resourceId: any) => {
    setProgressDraft((current) => {
      const currentTokens = (current as any).openAgendaTokens[polarity] || [];
      const hasToken = currentTokens.includes(resourceId);
      const nextTokens = hasToken
        ? currentTokens.filter((token: any) => token !== resourceId)
        : currentTokens.length < openAgendaTokenLimit
          ? [...currentTokens, resourceId]
          : currentTokens;

      return {
        ...(current as any),
        openAgendaTokens: {
          ...(current as any).openAgendaTokens,
          [polarity]: nextTokens,
        },
      };
    });
  };

  const toggleNarrativeAchievement = () => {
    setProgressDraft((current: any) => {
      const max = getAchievementRequiredCount(current.narrativeAchievementDetail);
      const complete = !current.narrativeAchievement;

      return {
        ...current,
        narrativeAchievement: complete,
        narrativeAchievementCount: complete ? max : 0,
      };
    });
  };

  const adjustNarrativeAchievement = (delta: any) => {
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

  const adjustHouseAchievement = (index: any, delta: any) => {
    setProgressDraft((current) => ({
      ...current,
      houseAchievements: current.houseAchievements.map((value, itemIndex) =>
        itemIndex === index
          ? clampCounter(value + delta, getAchievementRequiredCount(current.houseAchievementDetails[itemIndex]))
          : value,
      ),
    }));
  };

  const toggleHouseAchievementComplete = (index: any) => {
    setProgressDraft((current) => ({
      ...current,
      houseAchievementComplete: current.houseAchievementComplete.map((value, itemIndex) =>
        itemIndex === index ? !value : value,
      ),
    }));
  };

  const adjustAlignmentAchievement = (agendaId: any, delta: any) => {
    setProgressDraft((current) => ({
      ...current,
      alignmentAchievements: {
        ...current.alignmentAchievements,
        [agendaId]: clampCounter((current.alignmentAchievements[agendaId] || 0) + delta, houseAlignmentMarkMax),
      },
    }));
  };

  const openAchievementEditor = (event: any, kind: any, index: any = -1) => {
    const detail =
      kind === "narrative"
        ? progressDraft.narrativeAchievementDetail
        : progressDraft.houseAchievementDetails[index];

    achievementEditButtonRef.current = event.currentTarget;
    setAchievementEditor({
      kind,
      index,
      title:
        kind === "narrative"
          ? ko.app.inventory.achievementEditorTitleNarrative
          : houseAchievementRows[index]?.label || ko.app.inventory.achievementEditorTitleFallback,
      draft:
        kind === "narrative"
          ? normalizeNarrativeAchievementDetail(detail)
          : normalizeAchievementDetail(detail, houseAchievementMarkMax),
    });
  };

  const updateAchievementEditorDraft = (field: any, value: any) => {
    setAchievementEditor((current: any) =>
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

    const nextDetail =
      (achievementEditor as any).kind === "narrative"
        ? normalizeNarrativeAchievementDetail((achievementEditor as any).draft)
        : normalizeAchievementDetail((achievementEditor as any).draft, houseAchievementMarkMax);

    setProgressDraft((current: any) => {
      if ((achievementEditor as any).kind === "narrative") {
        const nextCount = current.narrativeAchievement || current.narrativeAchievementCount > 0 ? 1 : 0;

        return {
          ...current,
          narrativeAchievement: nextCount >= nextDetail.requiredCount,
          narrativeAchievementCount: nextCount,
          narrativeAchievementDetail: nextDetail,
        };
      }

      return {
        ...current,
        houseAchievements: current.houseAchievements.map((value: any, itemIndex: any) =>
          itemIndex === achievementEditor.index ? clampCounter(value, nextDetail.requiredCount) : value,
        ),
        houseAchievementDetails: current.houseAchievementDetails.map((detail: any, itemIndex: any) =>
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
    async (roles: any) => await mutate({ action: "saveDilemmaRoles", roles }),
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

  const updateDilemmaField = useCallback((field: any, value: any) => {
    setDilemmaDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }, []);

  const updateDilemmaOutcome = useCallback((side: any, field: any, value: any) => {
    setDilemmaDraft((current) => ({
      ...current,
      [side]: {
        ...(current as any)[side],
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

  const addDilemmaPhotos = useCallback(async (files: any) => {
    const fileList = Array.from(files || []);

    if (!fileList.length) {
      return;
    }

    const remainingSlots = Math.max(dilemmaPhotoLimit - dilemmaDraft.photos.length, 0);

    if (remainingSlots <= 0) {
      setDilemmaPhotoError(ko.app.inventory.photoSlotLimit(dilemmaPhotoLimit));
      return;
    }

    setDilemmaPhotoBusy(true);
    setDilemmaPhotoError("");

    try {
      const nextPhotos: any[] = [];

      for (const file of fileList.slice(0, remainingSlots)) {
        nextPhotos.push(await createDilemmaPhotoAttachment(file));
      }

      setDilemmaDraft((current) => ({
        ...current,
        photos: [...current.photos, ...nextPhotos].slice(0, dilemmaPhotoLimit),
      }));
    } catch (photoError: any) {
      setDilemmaPhotoError(photoError.message || ko.app.inventory.photoAttachFail);
    } finally {
      setDilemmaPhotoBusy(false);
    }
  }, [dilemmaDraft.photos.length]);

  const removeDilemmaPhoto = useCallback((photoId: any) => {
    setDilemmaDraft((current) => ({
      ...current,
      photos: current.photos.filter((photo) => photo.id !== photoId),
    }));
    setDilemmaPhotoError("");
  }, []);

  const resetDilemma = useCallback(async () => {
    if (!window.confirm(ko.app.inventory.dilemmaResetConfirm)) {
      return;
    }

    setDilemmaDialogOpen(false);
    setDilemmaEditToken("");
    setDilemmaDraft(createDilemmaDraft());
    setDilemmaPhotoError("");
    setDilemmaPhotoBusy(false);

    await mutate({ action: "resetDilemma" });
  }, [mutate]);

  const saveDilemma = useCallback(async () => {
    if (!dilemmaEditToken) {
      return;
    }

    if (dilemmaPhotoBusy) {
      setDilemmaPhotoError(ko.app.inventory.photoProcessing);
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
  }, [dilemmaDraft, dilemmaEditToken, dilemmaPhotoBusy, dilemmaVotingComplete, mutate]);

  const publishDilemma = useCallback(async () => {
    if (!houseId || !serverDilemma || isDilemmaBlank(serverDilemma)) {
      return;
    }

    await mutate({ action: "publishDilemma" });
  }, [houseId, mutate, serverDilemma]);

  const ledgerSaving = ledgerSaveStatus === "saving" || ledgerSaveStatus === "pending" || isDirty;
  const ledgerStatusText =
    ledgerSaveStatus === "error"
      ? ko.app.inventory.ledgerSaveFail
      : ledgerSaving
        ? ko.common.saving
        : ko.app.inventory.ledgerSaveOk;
  const ledgerStatusClassName = ledgerSaveStatus === "error" ? "error-pill" : ledgerSaving ? "dirty-pill" : "saved-pill";
  const ledgerStatusDescription =
    ledgerSaveStatus === "error"
      ? ko.app.inventory.ledgerErrorDesc
      : ledgerSaving
        ? ko.app.inventory.ledgerSavingDesc
        : ko.app.inventory.ledgerSavedDesc;
  const narrativeAchievementMax = getAchievementRequiredCount(progressDraft.narrativeAchievementDetail);
  const narrativeAchievementCount = clampCounter(
    progressDraft.narrativeAchievementCount || 0,
    narrativeAchievementMax,
  );
  const narrativeAchievementComplete = progressDraft.narrativeAchievement || narrativeAchievementCount >= narrativeAchievementMax;

  return (
    <>
      {dilemma ? (
        <Suspense fallback={<div className="dilemma-summary-placeholder" />}>
          <DilemmaSummaryCard
            busy={busy}
            currentHouseId={houseId}
            dilemma={serverDilemma}
            leaderHouseId={dilemmaLeader}
            moderatorHouseId={dilemmaModerator}
            history={dilemmaHistory || []}
            houses={houses || []}
            editButtonRef={dilemmaEditButtonRef as any}
            roleButtonRef={dilemmaRoleButtonRef as any}
            onEdit={beginDilemmaEdit}
            onOpenRoleDialog={openDilemmaRoleDialog}
            onPublish={publishDilemma}
            onReset={resetDilemma}
          />
        </Suspense>
      ) : null}

      <section className={`inventory-panel${house ? " has-house-profile" : ""}`} aria-labelledby="inventory-title">
      <div className="inventory-header">
        <div className="panel-title-row">
          <span className="panel-title-icon" aria-hidden="true">
            <TokenIcon type="castle" />
          </span>
          <h2 id="inventory-title">{ko.app.inventory.title}</h2>
        </div>
        <span className={ledgerStatusClassName} aria-live="polite">{ledgerStatusText}</span>
      </div>

      <div className="inventory-section resource-section">
        <div className="inventory-counter-group">
          <h3>{ko.app.inventory.tokens}</h3>
          <div className="inventory-resource-grid">
            {tokenCounters.map((counter) => (
              <CounterRow
                key={counter.id}
                label={counter.label}
                value={(draft as any)[counter.id]}
                max={counter.max}
                icon={counter.icon}
                tone={counter.tone}
                showMax={false}
                disabled={busy}
                onDecrease={() => adjustCounter(counter, -1)}
                onIncrease={() => adjustCounter(counter, 1)}
              />
            ))}
          </div>
        </div>
        <div className="inventory-counter-group">
          <h3>{ko.app.inventory.victoryPoints}</h3>
          <div className="inventory-resource-grid score-ledger-grid">
            {scoreTrackCounters.map((counter) => (
              <ScoreTrackRow
                key={counter.id}
                label={counter.label}
                value={(draft as any)[counter.id]}
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
            <h3>{ko.app.inventory.detail}</h3>
          </div>
          <HouseProfileCard
            busy={busy}
            house={house}
            progress={serverProgress}
            showCrest={false}
            showSectionLabel={false}
            onSaveAlignmentReward={onSaveAlignmentReward}
          />
        </div>
      ) : null}

      <div className="inventory-section inventory-challenge-section">
        <section
          className="achievement-primary-panel"
          aria-labelledby="challenge-achievements-title"
        >
          <AchievementSectionHeading
            id="challenge-achievements-title"
            label={ko.app.inventory.challengeHeading}
            tooltip={challengeAchievementTooltip}
          />
          <div className="achievement-primary-list">
            <NarrativeAchievementRow
              complete={narrativeAchievementComplete}
              count={narrativeAchievementCount}
              detail={progressDraft.narrativeAchievementDetail}
              disabled={busy}
              max={narrativeAchievementMax}
              onDecrease={() => adjustNarrativeAchievement(-1)}
              onEdit={(event: any) => openAchievementEditor(event, "narrative")}
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
                  onEdit={(event: any) => openAchievementEditor(event, "challenge", row.id)}
                  onIncrease={() => adjustHouseAchievement(row.id, 1)}
                  onToggleChallengeComplete={() => toggleHouseAchievementComplete(row.id)}
                />
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className={`inventory-section inventory-agenda-section${ownChoice ? " has-secret-agenda" : ""}`}>
        <h3 className="agenda-section-title">
          <span className="agenda-section-title-lead">
            <span className="agenda-section-title-main">
              <span>{ko.app.inventory.agendaTitle}</span>
            </span>
            <span className="agenda-type-legend" aria-hidden="true">
              <span>
                <i className="agenda-type-dot common" />
                {ko.app.inventory.agendaCommon}
              </span>
              {ownChoice ? (
                <span>
                  <i className="agenda-type-dot secret" />
                  {ko.app.inventory.agendaSecret}
                </span>
              ) : null}
            </span>
          </span>
          <span className="agenda-section-title-actions">
            <AgendaScoreGuideButton
              label={ko.app.inventory.openScoreBtn}
              ariaLabel={ko.app.inventory.openScoreAria}
              onClick={onOpenOpenAgendaGuide}
            />
            {ownChoice ? (
              <AgendaScoreGuideButton
                label={ko.app.inventory.secretScoreBtn}
                ariaLabel={ko.app.inventory.secretScoreAria}
                onClick={onOpenSecretAgendaGuide}
              />
            ) : null}
          </span>
        </h3>
        <div className="agenda-progress-grid">
          <div className="agenda-progress-group open-agenda-group" aria-label={ko.app.inventory.openAgendaAria}>
            <div className="open-agenda-ledger">
              {openAgendaTokenTypes.map((type) => (
                <OpenAgendaTokenRow
                  key={type.id}
                  type={type}
                  selectedTokens={(progressDraft as any).openAgendaTokens[type.id] || []}
                  disabled={busy}
                  onToggle={(resourceId: any) => toggleOpenAgendaToken(type.id, resourceId)}
                />
              ))}
            </div>
          </div>
          {ownChoice ? (
            <div className="agenda-progress-group inventory-secret-agenda" aria-label={ko.app.inventory.secretAgendaAria}>
              <OwnChoice agenda={ownChoice} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="inventory-section progress-section">
        <div className="achievement-progress-panel achievement-alignment-only">
          <section className="alignment-achievement-panel" aria-labelledby="alignment-achievements-title">
            <AchievementSectionHeading
              id="alignment-achievements-title"
              label={ko.app.inventory.alignmentHeading}
              tooltip={alignmentAchievementTooltip}
            />
            <div className="alignment-achievement-list" aria-label={ko.app.inventory.alignmentListAria}>
              {orderedAlignmentRows.map((alignment: any) => (
                <AlignmentProgressRow
                  key={alignment?.agendaId}
                  alignment={alignment}
                  value={(progressDraft as any).alignmentAchievements[alignment?.agendaId] || 0}
                  max={houseAlignmentMarkMax}
                  reward={(progressDraft as any).alignmentRewards[alignment?.agendaId]}
                  disabled={busy}
                  onDecrease={() => adjustAlignmentAchievement(alignment?.agendaId, -1)}
                  onIncrease={() => adjustAlignmentAchievement(alignment?.agendaId, 1)}
                />
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="inventory-actions">
        <span>{ledgerStatusDescription}</span>
        <div>
          <button className="ghost-button" type="button" onClick={applyGameStartDefaults} disabled={busy}>
            <TokenIcon type="reset" />
            {ko.app.inventory.defaultsButton}
          </button>
        </div>
      </div>
      <Suspense fallback={null}>
        <DilemmaRoleDialog
          busy={busy}
          houses={houses || []}
          leaderHouseId={dilemmaLeader}
          moderatorHouseId={dilemmaModerator}
          open={dilemmaRoleDialogOpen}
          restoreFocusRef={dilemmaRoleButtonRef as any}
          onClose={closeDilemmaRoleDialog}
          onOpenVoteOrderDialog={onOpenVoteOrderDialog}
          onSave={saveDilemmaRoles}
        />
        <DilemmaEditDialog
          busy={busy}
          draft={dilemmaDraft}
          isNewDilemma={dilemmaIsBlank}
          open={dilemmaDialogOpen}
          resolutionDisabled={!dilemmaVotingComplete}
          restoreFocusRef={dilemmaEditButtonRef as any}
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
          restoreFocusRef={achievementEditButtonRef as any}
          onCancel={cancelAchievementEditor}
          onChange={updateAchievementEditorDraft}
          onOpenLegend={() => setAchievementLegendOpen(true)}
          onSave={saveAchievementEditor}
        />
        <SpecialAbilityLegendDialog
          open={achievementLegendOpen}
          restoreFocusRef={achievementLegendButtonRef as any}
          onClose={() => setAchievementLegendOpen(false)}
        />
      </Suspense>
      </section>
    </>
  );
}

function ScoreTrackRow({ label, value, max, icon, tone, disabled, onDecrease, onIncrease }: any) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;
  const groups = max === 100 ? [50, 50] : [25, 25];
  let offset = 0;

  return (
    <div className={`score-track-row tone-${tone}`} style={{ "--track-progress": `${percent}%` } as any}>
      <div className="score-track-summary">
        <Tooltip label={label} className="counter-icon" ariaLabel={label}>
          <TokenIcon type={icon} />
        </Tooltip>
        <span className="counter-label">{label}</span>
        <output className="score-track-value" aria-label={ko.app.inventory.scoreTrackValueAria(label)}>
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
              aria-label={ko.app.inventory.counterDecreaseAria(label)}
              onClick={onDecrease}
              disabled={disabled || value <= 0}
            >
              <TokenIcon type="minus" />
            </button>
            <button
              className="stepper-button"
              type="button"
              aria-label={ko.app.inventory.counterIncreaseAria(label)}
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

function CounterRow({
  label,
  value,
  max,
  icon,
  tone,
  disabled,
  onDecrease,
  onIncrease,
  showMax = true,
}: any) {
  return (
    <div className={`counter-row tone-${tone}`}>
      <Tooltip label={label} className="counter-icon" ariaLabel={label}>
        <TokenIcon type={icon} />
      </Tooltip>
      <span className="counter-label">{label}</span>
      <div className="counter-controls">
        <button
          className="stepper-button"
          type="button"
          aria-label={ko.app.inventory.counterDecreaseAria(label)}
          onClick={onDecrease}
          disabled={disabled || value <= 0}
        >
          <TokenIcon type="minus" />
        </button>
        <output
          aria-label={showMax ? ko.app.inventory.counterValueAria(label) : `${label}: ${value}`}
        >
          {showMax ? `${value}/${max}` : value}
        </output>
        <button
          className="stepper-button"
          type="button"
          aria-label={ko.app.inventory.counterIncreaseAria(label)}
          onClick={onIncrease}
          disabled={disabled || value >= max}
        >
          <TokenIcon type="plus" />
        </button>
      </div>
    </div>
  );
}
function OpenAgendaTokenRow({ type, selectedTokens, disabled, onToggle }: any) {
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
              key={resource.id}
              className={`resource-token-chip tone-${resource.tone}${isSelected ? " selected" : ""}`}
              type="button"
              aria-pressed={isSelected}
              aria-label={ko.app.inventory.openAgendaTokenChipAria(type.shortLabel, resource.label)}
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
}: any) {
  const normalizedDetail = normalizeAchievementDetail(detail, 1);
  const requiredCount = max || normalizedDetail.requiredCount;

  if (requiredCount > 1) {
    return (
      <AchievementProgressRow
        label={ko.app.inventory.narrativeChallenge}
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
            <strong>{ko.app.inventory.narrativeChallenge}</strong>
          </span>
          <AchievementDetailPreview detail={normalizedDetail} />
        </span>
      </button>
      {complete ? (
        <button
          className="achievement-challenge-status complete"
          type="button"
          disabled={disabled}
          onClick={onToggle}
          aria-label={ko.app.inventory.achieveCancelAria}
        >
          <small>{ko.app.inventory.achieveSmall}</small>
        </button>
      ) : (
        <Tooltip label={ko.app.inventory.achieveEditTooltip}>
          <button
            className="achievement-edit-button"
            type="button"
            onClick={onEdit}
            disabled={disabled}
            aria-label={ko.app.inventory.achieveEditAria}
          >
            <TokenIcon type="edit" />
          </button>
        </Tooltip>
      )}
    </div>
  );
}

function AchievementDetailPreview({ detail }: { detail: any }) {
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
    return <span className="achievement-detail-preview muted">{ko.app.inventory.conditionEffectEmpty}</span>;
  }

  return (
    <span className="achievement-detail-preview">
      {hasCondition ? <MentionTokenView className="achievement-detail-condition" text={detail.conditionText} /> : null}
      {hasEffect ? (
        <span className="achievement-detail-segment">
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
}: any) {
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
          aria-label={ko.app.inventory.challengeToggleAria(label, challengeComplete)}
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
          aria-label={ko.app.inventory.counterDecreaseAria(label)}
          onClick={onDecrease}
          disabled={disabled || value <= 0}
        >
          <TokenIcon type="minus" />
        </button>
        <output aria-label={ko.app.inventory.counterValueAria(label)}>
          {value}/{max}
        </output>
        <button
          className="stepper-button compact"
          type="button"
          aria-label={ko.app.inventory.counterIncreaseAria(label)}
          onClick={onIncrease}
          disabled={disabled || value >= max}
        >
          <TokenIcon type="plus" />
        </button>
      </div>
      {challengeComplete && onToggleChallengeComplete ? (
        <button
          className="achievement-challenge-status complete"
          type="button"
          disabled={disabled}
          onClick={onToggleChallengeComplete}
          aria-label={ko.app.inventory.challengeCancelAria(label)}
        >
          <small>{ko.app.inventory.achieveSmall}</small>
        </button>
      ) : onEdit ? (
        <Tooltip label={ko.app.inventory.challengeEditTooltip(label)}>
          <button
            className="achievement-edit-button"
            type="button"
            onClick={onEdit}
            disabled={disabled}
            aria-label={ko.app.inventory.challengeEditAria(label)}
          >
            <TokenIcon type="edit" />
          </button>
        </Tooltip>
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
}: any) {
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
        <ProgressPips value={value} max={max} label={ko.app.inventory.alignmentAchievementAria(alignment.koreanLabel)} />
      )}
      <div className="counter-controls">
        <button
          className="stepper-button compact"
          type="button"
          aria-label={ko.app.inventory.alignmentDecreaseAria(alignment.koreanLabel)}
          onClick={onDecrease}
          disabled={disabled || value <= 0}
        >
          <TokenIcon type="minus" />
        </button>
        <output aria-label={ko.app.inventory.alignmentCountAria(alignment.koreanLabel)}>
          {value}/{max}
        </output>
        <button
          className="stepper-button compact"
          type="button"
          aria-label={ko.app.inventory.alignmentIncreaseAria(alignment.koreanLabel)}
          onClick={onIncrease}
          disabled={disabled || value >= max}
        >
          <TokenIcon type="plus" />
        </button>
      </div>
    </div>
  );
}

function AlignmentRewardCrowns({ crownType, count, label }: any) {
  const rewardLabel = alignmentRewardTypeLabels[crownType] || ko.app.inventory.rewardFallback;

  return (
    <span
      className={`alignment-reward-crowns tone-${crownType}`}
      aria-label={ko.app.inventory.rewardCrownsAria(label, rewardLabel, count)}
    >
      {Array.from({ length: count }, (_, index) => (
        <TokenIcon type={crownType} key={index} />
      ))}
    </span>
  );
}
function ProgressPips({ value, max, label }: any) {
  return (
    <span className="progress-pips" aria-label={`${label} ${value}/${max}`}>
      {Array.from({ length: max }, (_, index) => (
        <span className={index < value ? "checked" : ""} key={index} aria-hidden="true" />
      ))}
    </span>
  );
}

function normalizeFinalBoardInput(value: any) {
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

function isFinalBoardDraftComplete(draft: any) {
  return resourceCounters.every((resource) => {
    const value = Number(draft[resource.id]);
    return Number.isInteger(value) && value >= 1 && value <= 17;
  });
}

function createFinalBoardPayload(draft: any) {
  return Object.fromEntries(resourceCounters.map((resource) => [resource.id, Number(draft[resource.id])]));
}

async function createDilemmaPhotoAttachment(file: any) {
  if (!dilemmaPhotoAllowedTypes.has(file?.type)) {
    throw new Error(ko.dilemmaHelpers.photoErrors.imageOnly);
  }

  if (file.size > dilemmaPhotoMaxInputBytes) {
    throw new Error(ko.dilemmaHelpers.photoErrors.maxSize);
  }

  const dataUrl = await resizeDilemmaPhoto(file);

  if (dataUrl.length > dilemmaPhotoMaxDataUrlLength) {
    throw new Error(ko.dilemmaHelpers.photoErrors.tooLarge);
  }

  const mimeType = dataUrl.startsWith("data:image/png") ? "image/png" : "image/jpeg";

  return {
    id: createClientId(),
    name: file.name || ko.dilemmaEdit.photoAlt,
    mimeType,
    dataUrl,
    size: file.size,
    addedAt: new Date().toISOString(),
    addedBy: null,
    addedByName: "",
  };
}

async function resizeDilemmaPhoto(file: any) {
  const inputDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(inputDataUrl);
  const scale = Math.min(1, dilemmaPhotoMaxDimension / Math.max((image as any).naturalWidth, (image as any).naturalHeight));
  const width = Math.max(1, Math.round((image as any).naturalWidth * scale));
  const height = Math.max(1, Math.round((image as any).naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error(ko.dilemmaHelpers.photoErrors.processFail);
  }

  context.drawImage(image as any, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", dilemmaPhotoQuality);
}

function readFileAsDataUrl(file: any) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error(ko.dilemmaHelpers.photoErrors.readFail));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: any) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(ko.dilemmaHelpers.photoErrors.loadFail));
    image.src = src;
  });
}

function normalizeInventory(value: any) {
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

function normalizeHouseProgress(value: any) {
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
    ? (candidate.houseAchievementDetails as any[]).map((detail: any) => normalizeAchievementDetail(detail, houseAchievementMarkMax))
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

function getAlignmentKoreanLabels(alignments: any[] = []) {
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

function normalizeHouseAlignmentOrder(_value: any) {
  return [...defaultHouseAlignmentOrder];
}

function createGameStartDefaultsConfirmMessage() {
  const inventoryDefaults = createDefaultInventory();
  const progressDefaults = createDefaultHouseProgress();
  const resourceDefaultText = resourceCounters
    .map((counter) => `${counter.label} ${inventoryDefaults.resources[counter.id]}`)
    .join(", ");
  const openAgendaDefaultText = openAgendaTokenTypes
    .map((type: any) => `${type.shortLabel} ${(progressDefaults.openAgendaTokens as any)[type.id].length}/${openAgendaTokenLimit}`)
    .join(", ");
  const narrativeRequiredCount = getAchievementRequiredCount(progressDefaults.narrativeAchievementDetail);
  const challengeRequiredCounts = progressDefaults.houseAchievementDetails.map((detail) =>
    getAchievementRequiredCount(detail),
  );
  const sameChallengeCount = challengeRequiredCounts.every((count) => count === challengeRequiredCounts[0]);
  const challengeDefaultText = sameChallengeCount
    ? ko.app.gameStartConfirm.allSame(progressDefaults.houseAchievements.length, challengeRequiredCounts[0])
    : progressDefaults.houseAchievements
        .map((count, index) => {
          const label = houseAchievementRows[index]?.label || ko.app.gameStartConfirm.challengeLabelFallback(index + 1);
          return ko.app.gameStartConfirm.challengeRow(label, count, challengeRequiredCounts[index]);
        })
        .join(", ");

  return [
    ko.app.gameStartConfirm.title,
    "",
    ko.app.gameStartConfirm.header,
    ko.app.gameStartConfirm.coinsPower(inventoryDefaults.coins, inventoryDefaults.powerTokens),
    ko.app.gameStartConfirm.prestigeCrave(inventoryDefaults.prestige, inventoryDefaults.crave),
    ko.app.gameStartConfirm.resources(resourceCounters.length, resourceDefaultText),
    ko.app.gameStartConfirm.openAgenda(openAgendaDefaultText),
    ko.app.gameStartConfirm.narrative(progressDefaults.narrativeAchievementCount, narrativeRequiredCount),
    ko.app.gameStartConfirm.challenges(challengeDefaultText),
    ko.app.gameStartConfirm.alignAll(houseAlignmentRows.length, houseAlignmentMarkMax),
    ko.app.gameStartConfirm.rewardsNone(houseAlignmentRows.length),
  ].join("\n");
}

function createDefaultAlignmentReward() {
  return {
    crownType: "",
    count: 0,
  };
}

function normalizeAlignmentReward(value: any, fallback = createDefaultAlignmentReward()) {
  const candidate = value && typeof value === "object" ? value : {};
  const crownType = candidate.crownType === "prestige" || candidate.crownType === "crave" ? candidate.crownType : "";
  const count = normalizeCounter(candidate.count, alignmentRewardCountMax, fallback.count);

  return {
    crownType: count > 0 ? crownType : "",
    count: crownType ? count : 0,
  };
}

function createDefaultAchievementDetail(requiredCount: any) {
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

function normalizeAchievementDetail(value: any, fallbackRequiredCount: any) {
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

function normalizeNarrativeAchievementDetail(value: any) {
  return {
    ...normalizeAchievementDetail(value, 1),
    requiredCount: 1,
  };
}

function createDefaultAchievementEffectEntry() {
  return {
    icon: "instant",
    amount: 0,
    text: "",
  };
}

function applyAchievementEffectEntries(detail: any, entries: any) {
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

function addAchievementEffectEntry(entries: any) {
  const normalizedEntries = normalizeAchievementEffectEntries(entries);
  return normalizedEntries.length >= achievementEffectEntryMax
    ? normalizedEntries
    : [...normalizedEntries, createDefaultAchievementEffectEntry()];
}

function removeAchievementEffectEntryAt(entries: any, index: number) {
  return normalizeAchievementEffectEntries(entries).filter((_, entryIndex) => entryIndex !== index);
}

function updateAchievementEffectEntryAt(entries: any, index: number, patch: any) {
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

function normalizeLegacyAchievementDetailUpdate(detail: any) {
  return normalizeAchievementDetail(detail, detail?.requiredCount || houseAchievementMarkMax);
}

function updateAchievementDetailDraft(detail: any, field: string, value: any) {
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

function normalizeAchievementEffectIcon(value: any) {
  return typeof value === "string" && achievementEffectOptionById[value]?.id ? value : "";
}

function normalizeAchievementEffectAmount(value: any, effectIcon: any) {
  if (!achievementEffectAmountOptionIds.has(effectIcon)) {
    return 0;
  }

  return normalizeCounter(value, achievementEffectAmountMax, 0);
}

function normalizeAchievementEffectEntries(value: any, legacyEffects?: any, legacyEffectText?: any, legacyEffectIcon?: any, legacyEffectAmount?: any) {
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

function normalizeAchievementEffectsFromEntries(entries: any) {
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

function normalizeAchievementEffects(value: any, legacyEffectIcon?: any, legacyEffectAmount?: any) {
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

function formatAchievementEffectEntriesText(entries: any) {
  return normalizeAchievementEffectEntries(entries)
    .map((entry) => entry.text)
    .filter(Boolean)
    .join(" · ")
    .slice(0, achievementDetailTextMaxLength);
}

function normalizeAchievementText(value: any) {
  return typeof value === "string"
    ? value.replace(/\r\n?/g, "\n").trim().slice(0, achievementDetailTextMaxLength)
    : "";
}

function normalizeRequiredCount(value: any, fallback = houseAchievementMarkMax) {
  const fallbackValue = getAchievementRequiredCount({ requiredCount: fallback });
  const number = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(number)) {
    return fallbackValue;
  }

  return Math.max(1, Math.min(houseAchievementMarkMax, Math.trunc(number)));
}

function getAchievementRequiredCount(detail: any) {
  const number = Number(detail?.requiredCount);

  if (!Number.isFinite(number)) {
    return houseAchievementMarkMax;
  }

  return Math.max(1, Math.min(houseAchievementMarkMax, Math.trunc(number)));
}

function normalizeCounter(value: any, max: any, fallback: any) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return clampCounter(value, max);
}

function clampCounter(value: any, max: any) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(max, Math.trunc(value)));
}

function inventoriesMatch(left: any, right: any) {
  return inventoryCounters.every((counter) => left[counter.id] === right[counter.id]);
}

function progressMatches(left: any, right: any) {
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

function progressMatchesExceptAlignmentRewards(left: any, right: any) {
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

function achievementDetailsMatch(left: any, right: any) {
  const leftDetail = normalizeAchievementDetail(left, houseAchievementMarkMax);
  const rightDetail = normalizeAchievementDetail(right, houseAchievementMarkMax);

  return (
    leftDetail.conditionText === rightDetail.conditionText &&
    leftDetail.requiredCount === rightDetail.requiredCount &&
    achievementEffectEntriesMatch(leftDetail.effectEntries, rightDetail.effectEntries)
  );
}

function achievementEffectEntriesMatch(left: any, right: any) {
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

function alignmentRewardsMatch(left: any, right: any) {
  const leftReward = normalizeAlignmentReward(left);
  const rightReward = normalizeAlignmentReward(right);

  return leftReward.crownType === rightReward.crownType && leftReward.count === rightReward.count;
}

function normalizeOpenAgendaTokens(value: any) {
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

function OwnChoice({ agenda }: { agenda: any }) {
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
        </div>
        <AgendaScoringBoard agenda={agenda} />
      </div>
    </div>
  );
}

function ActionPanel({ state, busy, mutate }: { state: any; busy: boolean; mutate: any }) {
  if (!state.canDiscard) {
    return null;
  }

  if (!state.randomDiscardEnabled) {
    return (
      <div className="action-card">
        <div>
          <p className="section-label">{ko.app.agendaUi.visibleDiscardSection}</p>
          <h3>{ko.app.agendaUi.pickVisibleDiscardTitle}</h3>
          <p>{ko.app.agendaUi.pickVisibleDiscardBody}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="action-card">
      <div>
        <p className="section-label">{ko.app.agendaUi.visibleDiscardSection}</p>
        <h3>{ko.app.agendaUi.randomVisibleDiscardTitle}</h3>
        <p>{ko.app.agendaUi.randomVisibleDiscardBody}</p>
      </div>
      <button className="primary-button" type="button" onClick={() => mutate({ action: "discard" })} disabled={busy}>
        <TokenIcon type="flame" />
        {ko.app.agendaUi.randomDiscardExecute}
      </button>
    </div>
  );
}

function AgendaList({ agendas, busy, mode = "choose", mutate }: { agendas: any[]; busy: boolean; mode?: string; mutate: any }) {
  const [expanded, setExpanded] = useState(false);
  const discardMode = mode === "discard";

  if (!agendas.length) {
    return null;
  }

  return (
    <section className="agenda-section" aria-labelledby="agenda-title">
      <div className="agenda-section-heading">
        <div>
          <p className="section-label">{ko.app.agendaUi.discardOrDraft(discardMode)}</p>
          <h2 id="agenda-title">{discardMode ? ko.app.agendaUi.titleDiscard : ko.app.agendaUi.titleDraft}</h2>
        </div>
        <span>{ko.app.agendaUi.agendasRemaining(agendas.length)}</span>
      </div>
      <div className="agenda-list" id="agenda-list">
        {agendas.map((agenda: any) => (
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
          {ko.app.agendaUi.expand(expanded)}
        </button>
      </div>
    </section>
  );
}

function AgendaCard({ agenda, busy, expanded, mode = "choose", mutate }: { agenda: any; busy: boolean; expanded: boolean; mode?: string; mutate: any }) {
  const detailId = `agenda-detail-${agenda.id}`;
  const discardMode = mode === "discard";
  const choose = () => {
    const confirmed = window.confirm(
      discardMode
        ? ko.app.agendaUi.confirmDiscard
        : ko.app.agendaUi.confirmPick,
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
              <p className="section-label">{ko.app.agendaUi.secretAgendaSection}</p>
            </div>
            <button className="primary-button" type="button" onClick={choose} disabled={busy}>
              <TokenIcon type={discardMode ? "flame" : "key"} />
              {discardMode ? ko.app.agendaUi.actionDiscard : ko.app.agendaUi.actionPick}
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

function AgendaScoreGuideButton({ label, ariaLabel, onClick }: { label: string; ariaLabel: string; onClick: any }) {
  if (!onClick) {
    return null;
  }

  return (
    <button
      className="agenda-score-help-button"
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
    >
      <TokenIcon type="help" />
      {label}
    </button>
  );
}

function AgendaScoringBoard({ agenda }: { agenda: any }) {
  return (
    <div className="agenda-score-board" aria-label={ko.app.agendaUi.agendaScoreBoardAria(formatAgendaTitle(agenda))}>
      <AgendaResourceZoneStrip agenda={agenda} />
      <AgendaScoreTrack
        title={ko.app.agendaUi.resourceZonesTitle}
        items={agenda.resourceScoring.map((item: any) => ({
          label: item.label,
          vp: item.vp,
        }))}
      />
      <AgendaScoreTrack
        title={ko.app.agendaUi.wealthRankTitle}
        items={agenda.coinRanking.map((item: any) => ({
          label: ko.app.agendaUi.rankLabel(item.rank),
          vp: item.vp,
        }))}
      />
    </div>
  );
}

function AgendaResourceZoneStrip({ agenda }: { agenda: any }) {
  const zones = (agendaScoringZones as any)[agenda.id] ?? [];
  const hasDistanceMode = zones.some((zone: any) => zone.mode === "distance");
  const isActiveRow = (row: any) => zones.some((zone: any) => row >= zone.from && row <= zone.to);

  return (
    <div className={`agenda-zone-strip${hasDistanceMode ? " distance" : ""}`}>
      <div className="agenda-score-title">{hasDistanceMode ? ko.app.agendaUi.scoreTitleDistance : ko.app.agendaUi.scoreTitleBoard}</div>
      <div className="agenda-zone-cells" aria-label={ko.app.agendaUi.zoneAria}>
        {boardRows.map((row) => {
          const active = isActiveRow(row);
          const showLabel = active || row === 1 || row === 5 || row === 9 || row === 13 || row === 17;

          return (
            <span
              className={`agenda-zone-cell${row === 9 ? " center" : ""}${active ? " active" : ""}`}
              key={row}
              aria-label={ko.app.agendaUi.rowZoneAria(row, active)}
            >
              {showLabel ? row : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function AgendaScoreTrack({ title, items }: { title: string; items: any[] }) {
  const maxVp = items.length ? Math.max(...items.map((item: any) => item.vp)) : 0;

  return (
    <div className="agenda-score-track">
      <div className="agenda-score-title">{title}</div>
      <div className="agenda-score-segments">
        {items.map((item: any) => {
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
              style={{ "--score-fill": fillPercent } as any}
              aria-label={ko.app.agendaUi.rowScoreAria(item.label, item.vp)}
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

