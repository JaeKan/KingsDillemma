import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  agendaEventsPathWithSession,
  agendaRequest,
  parseAgendaRealtimeVersion,
  shouldForceRefreshAfterAdminModeToggle,
  shouldSkipAgendaRealtimeRefresh,
  useAgendaMutations,
  useAgendaRefresh,
  useAgendaStateQuery,
} from "./app/agendaClient";
import { HouseIcon, TokenIcon } from "./components/GameIcons";
import { Tooltip } from "./components/Tooltip";

// Lazy loaded components for modular features
const SessionEndDialog = React.lazy(() => import("./components/SessionEndDialog"));
const OpenAgendaScoreDialog = React.lazy(() => import("./components/ScoreGuides").then(m => ({ default: m.OpenAgendaScoreDialog })));
const ScoreGuideDialog = React.lazy(() => import("./components/ScoreGuides").then(m => ({ default: m.ScoreGuideDialog })));
const AchievementEditDialog = React.lazy(() => import("./components/AchievementEditDialog"));
const SpecialAbilityLegendDialog = React.lazy(() => import("./components/SpecialAbilityLegendDialog"));
const SecretAgendaScoreDialog = React.lazy(() => import("./components/ScoreGuides").then(m => ({ default: m.SecretAgendaScoreDialog })));
const BoardProcessingGuideDialog = React.lazy(() => import("./components/BoardProcessingGuideDialog"));
const BoardProcessingHistoryMenu = React.lazy(() => import("./components/BoardProcessingHistoryMenu"));
const BoardProcessingTypeHistoryDialog = React.lazy(() => import("./components/BoardProcessingTypeHistoryDialog"));
const BoardProcessingPanel = React.lazy(() => import("./components/BoardProcessingPanel"));
const KickHouseDialog = React.lazy(() => import("./components/KickHouseDialog"));

import { MentionTokenView } from "./components/MentionUI";
import { AchievementEffectMemo } from "./components/AchievementUI";
import { isAgendaWindowFocused, useAgendaWindowFocus } from "./app/agendaFocus";

// Feature components
const CouncilStatusStack = React.lazy(() => import("./components/CouncilStatusUI").then(m => ({ default: m.CouncilStatusStack })));
const GameMessage = React.lazy(() => import("./components/CouncilStatusUI").then(m => ({ default: m.GameMessage })));
const TurnTrack = React.lazy(() => import("./components/CouncilStatusUI").then(m => ({ default: m.TurnTrack as any })));
const TurnTrackAny = TurnTrack as any;

import {
  achievementDetailTextMaxLength,
  achievementEffectAmountMax,
  achievementEffectAmountOptionIds,
  achievementEffectEntryMax,
  achievementEffectOptionById,
  agendaScoringZones,
  alignmentRewardCountMax,
  alignmentRewardTypes,
  bgmMutedStorageKey,
  bgmSource,
  bgmVolumeStorageKey,
  boardRows,
  defaultBgmVolume,
  defaultHouseAlignmentOrder,
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
} from "./utils/house-helpers";
import { clampBgmVolumeValue, getBgmDisplayVolumePercent, getBgmUnmutedVolume } from "./utils/bgm-volume";
import { resolvePublicAssetPath } from "./utils/public-assets";
import type { BoardProcessingItem, BoardProcessingItemType } from "./types/game";
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
  return clampBgmVolumeValue(value, defaultBgmVolume);
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
  const [sessionEndCause, setSessionEndCause] = useState("");
  const [scoreGuideOpen, setScoreGuideOpen] = useState(false);
  const [openAgendaGuideOpen, setOpenAgendaGuideOpen] = useState(false);
  const [secretAgendaGuideOpen, setSecretAgendaGuideOpen] = useState(false);
  const [specialAbilityLegendOpen, setSpecialAbilityLegendOpen] = useState(false);
  const [boardProcessingGuideOpen, setBoardProcessingGuideOpen] = useState(false);
  const [boardProcessingHistoryOpen, setBoardProcessingHistoryOpen] = useState(false);
  const [selectedBoardProcessingHistoryType, setSelectedBoardProcessingHistoryType] = useState<BoardProcessingItemType | null>(null);
  const [kickHouseDialogOpen, setKickHouseDialogOpen] = useState(false);
  const [bgmMuted, setBgmMuted] = useState(readStoredBgmMuted);
  const [bgmVolume, setBgmVolume] = useState(readStoredBgmVolume);
  const finalScoringRequest = useRef(0);
  const bgmAudioRef = useRef(null);
  const settingsToggleRef = useRef(null);
  const tipsToggleRef = useRef(null);
  const openAgendaGuideToggleRef = useRef(null);
  const secretAgendaGuideToggleRef = useRef(null);
  const specialAbilityLegendButtonRef = useRef(null);
  const boardProcessingGuideToggleRef = useRef(null);
  const boardProcessingHistoryToggleRef = useRef(null);
  const boardProcessingHistoryTypeRef = useRef<HTMLButtonElement | null>(null);
  const kickHouseToggleRef = useRef(null);
  const latestAgendaVersionRef = useRef(0);
  const finalBoardComplete = useMemo(() => isFinalBoardDraftComplete(finalBoardDraft), [finalBoardDraft]);
  const sessionEndChecklistComplete = useMemo(
    () => sessionEndChecklistItems.every((item) => sessionEndChecklist[item.id]),
    [sessionEndChecklist],
  );
  const agendaWindowFocused = useAgendaWindowFocus();
  const agendaQuery = useAgendaStateQuery(setError, agendaWindowFocused);
  const { busy, mutate, mutationInFlight } = useAgendaMutations(setError);
  const refresh = useAgendaRefresh(setError, mutationInFlight);
  const apiRequest = useCallback((options = {}) => agendaRequest(options), []);
  const state = agendaQuery.data?.state ?? null;
  const authenticated = Boolean(agendaQuery.data?.authenticated);
  const admin = Boolean(agendaQuery.data?.admin || state?.isAdmin);
  const spectator = Boolean(agendaQuery.data?.spectator);
  const realtimeEnabled = Boolean(agendaQuery.data?.realtimeEnabled);
  const canManageBoardProcessingHistory = Boolean(state?.phase === "complete" && state.isAdmin);
  const canDeleteBoardProcessingHistoryItem = Boolean(canManageBoardProcessingHistory && state?.currentHouseId);
  const sessionStatus = agendaQuery.isPending ? "checking" : "ready";
  const parallelAgendaSessionParam =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("session") ?? "" : "";

  useEffect(() => {
    latestAgendaVersionRef.current = Number(state?.version) || 0;
  }, [state?.version]);

  useEffect(() => {
    if (
      !realtimeEnabled ||
      !agendaWindowFocused ||
      (!authenticated && !admin && state?.phase === "house-select") ||
      sessionStatus === "checking" ||
      sessionEndDialogOpen
    ) {
      return undefined;
    }

    const realtimeRefreshDelayMs = 260;
    let refreshTimer: number | null = null;
    let mutationRetryTimer: number | null = null;
    let pendingVersion = 0;

    const clearRefreshTimer = () => {
      if (refreshTimer !== null) {
        window.clearTimeout(refreshTimer);
        refreshTimer = null;
      }
    };

    const clearMutationRetryTimer = () => {
      if (mutationRetryTimer !== null) {
        window.clearTimeout(mutationRetryTimer);
        mutationRetryTimer = null;
      }
    };

    const runRefresh = () => {
      clearRefreshTimer();

      if (!isAgendaWindowFocused()) {
        return;
      }

      if (mutationInFlight.current) {
        clearMutationRetryTimer();
        mutationRetryTimer = window.setTimeout(runRefresh, realtimeRefreshDelayMs);
        return;
      }

      const refreshTargetVersion = pendingVersion;
      pendingVersion = 0;
      if (shouldSkipAgendaRealtimeRefresh(refreshTargetVersion, latestAgendaVersionRef.current)) {
        return;
      }

      void refresh().then(() => {
        if (pendingVersion > Math.max(latestAgendaVersionRef.current, refreshTargetVersion)) {
          runRefresh();
        }
      });
    };

    const scheduleRefresh = (version = 0) => {
      if (shouldSkipAgendaRealtimeRefresh(version, latestAgendaVersionRef.current)) {
        return;
      }

      pendingVersion = Math.max(pendingVersion, version);

      if (!isAgendaWindowFocused()) {
        return;
      }

      clearRefreshTimer();
      refreshTimer = window.setTimeout(runRefresh, realtimeRefreshDelayMs);
    };

    const refreshFromStateEvent = (event: MessageEvent) => {
      scheduleRefresh(parseAgendaRealtimeVersion(event.data));
    };

    const refreshFromConnectionEvent = (event?: Event) => {
      scheduleRefresh(event instanceof MessageEvent ? parseAgendaRealtimeVersion(event.data) : 0);
    };

    const events = new EventSource(agendaEventsPathWithSession());
    events.addEventListener("connected", refreshFromConnectionEvent);
    events.addEventListener("state", refreshFromStateEvent);
    window.addEventListener("focus", refreshFromConnectionEvent);
    document.addEventListener("visibilitychange", refreshFromConnectionEvent);

    return () => {
      events.close();
      events.removeEventListener("connected", refreshFromConnectionEvent);
      events.removeEventListener("state", refreshFromStateEvent);
      window.removeEventListener("focus", refreshFromConnectionEvent);
      document.removeEventListener("visibilitychange", refreshFromConnectionEvent);
      clearRefreshTimer();
      clearMutationRetryTimer();
    };
  }, [
    authenticated,
    admin,
    agendaWindowFocused,
    mutationInFlight,
    parallelAgendaSessionParam,
    realtimeEnabled,
    refresh,
    sessionEndDialogOpen,
    sessionStatus,
    state?.phase,
  ]);

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

    if ((result as any)?.authenticated || (result as any)?.admin || (result as any)?.spectator) {
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
    const savedEndCause =
      state?.sessionEndCause === "king_death" ||
      state?.sessionEndCause === "abdication_top" ||
      state?.sessionEndCause === "abdication_bottom"
        ? state.sessionEndCause
        : "";
    setSessionEndCause(savedEndCause);
    setSessionEndDialogOpen(true);
  };

  const handleKickSession = useCallback(
    async (houseId: string) => mutate({ action: "kickSession", houseId }),
    [mutate],
  );

  const handleOpenKickHouseDialog = useCallback(() => {
    setKickHouseDialogOpen(true);
    setSettingsOpen(false);
  }, []);

  const handleCloseKickHouseDialog = useCallback(() => {
    setKickHouseDialogOpen(false);
  }, []);

  const handleConfirmKickHouse = useCallback(
    async (houseId: string) => {
      const result = await handleKickSession(houseId);

      if (result) {
        setKickHouseDialogOpen(false);
      }
    },
    [handleKickSession],
  );

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

  const handleApplySessionEndRewards = async () => {
    if (!sessionEndCause) {
      setError(ko.app.errors.sessionEndCauseRequired);
      return;
    }

    if (!finalBoardComplete || !finalScoring) {
      setError(ko.app.errors.sessionEndScoreRequired);
      return;
    }

    const result = await mutate({
      action: "applySessionEndRewards",
      cause: sessionEndCause,
      board: createFinalBoardPayload(finalBoardDraft),
    });

    if (!result) {
      return;
    }

    setSessionEndChecklist((current) => ({
      ...current,
      scores: true,
      progress: true,
    }));
    setError("");
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
    setBoardProcessingHistoryOpen(false);
    setSettingsOpen((current) => !current);
  }, []);

  const handleToggleTips = useCallback(() => {
    setSettingsOpen(false);
    setBoardProcessingHistoryOpen(false);
    setTipsOpen((current) => !current);
  }, []);

  const closeFloatingMenus = useCallback(() => {
    setSettingsOpen(false);
    setTipsOpen(false);
    setBoardProcessingHistoryOpen(false);
  }, []);

  const handleOpenScoreGuide = useCallback((event?: any) => {
    closeFloatingMenus();
    void event;
    setScoreGuideOpen(true);
  }, [closeFloatingMenus]);

  const handleCloseScoreGuide = useCallback(() => {
    setScoreGuideOpen(false);
  }, []);

  const handleOpenOpenAgendaGuide = useCallback((event: any) => {
    closeFloatingMenus();
    if (event?.currentTarget) {
      openAgendaGuideToggleRef.current = event.currentTarget;
    }
    setOpenAgendaGuideOpen(true);
  }, [closeFloatingMenus]);

  const handleCloseOpenAgendaGuide = useCallback(() => {
    setOpenAgendaGuideOpen(false);
  }, []);

  const handleOpenSecretAgendaGuide = useCallback((event: any) => {
    void handleOpenScoreGuide(event);
  }, [handleOpenScoreGuide]);

  const handleCloseSecretAgendaGuide = useCallback(() => {
    setSecretAgendaGuideOpen(false);
  }, []);

  const handleOpenSpecialAbilityLegend = useCallback((event: any) => {
    specialAbilityLegendButtonRef.current = event?.currentTarget || tipsToggleRef.current;
    closeFloatingMenus();
    setSpecialAbilityLegendOpen(true);
  }, [closeFloatingMenus]);

  const handleCloseSpecialAbilityLegend = useCallback(() => {
    setSpecialAbilityLegendOpen(false);
  }, []);

  const handleOpenBoardProcessingGuide = useCallback((event: any) => {
    const trigger = event?.currentTarget || null;
    boardProcessingGuideToggleRef.current = tipsOpen ? tipsToggleRef.current : trigger || tipsToggleRef.current;
    closeFloatingMenus();
    setBoardProcessingGuideOpen(true);
  }, [closeFloatingMenus, tipsOpen]);

  const handleCloseBoardProcessingGuide = useCallback(() => {
    setBoardProcessingGuideOpen(false);
  }, []);

  const handleOpenBoardProcessingHistory = useCallback((event?: any) => {
    boardProcessingHistoryToggleRef.current = event?.currentTarget || settingsToggleRef.current;
    setSettingsOpen(false);
    setTipsOpen(false);
    setBoardProcessingHistoryOpen((current) => !current);
  }, []);

  const handleOpenBoardProcessingHistoryType = useCallback((type: BoardProcessingItemType, trigger: HTMLButtonElement) => {
    boardProcessingHistoryTypeRef.current = boardProcessingHistoryToggleRef.current || trigger;
    closeFloatingMenus();
    setSelectedBoardProcessingHistoryType(type);
  }, [closeFloatingMenus]);

  const handleCloseBoardProcessingHistoryType = useCallback(() => {
    setSelectedBoardProcessingHistoryType(null);
  }, []);

  const handleDeleteBoardProcessingHistoryItem = useCallback(async (item: BoardProcessingItem) => {
    if (!canDeleteBoardProcessingHistoryItem) {
      setError(ko.boardProcessing.adminOnly);
      return false;
    }

    if (!window.confirm(ko.boardProcessing.confirmDelete)) {
      return false;
    }

    const result = (await mutate({ action: "deleteBoardProcessingItem", itemId: item.id })) as {
      error?: string;
      ok?: boolean;
    } | null;

    if (result?.ok === false) {
      setError(result.error || ko.boardProcessing.deleteFail);
      return false;
    }

    return true;
  }, [canDeleteBoardProcessingHistoryItem, mutate]);

  const handleToggleBgmMuted = useCallback(() => {
    const nextMuted = !bgmMuted;
    const nextVolume = nextMuted ? bgmVolume : getBgmUnmutedVolume(bgmVolume, defaultBgmVolume);
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
    if (!state || state.phase !== "house-select") {
      return;
    }

    void mutate({
      action: "setRandomDiscardEnabled",
      enabled: !(state.randomDiscardEnabled ?? true),
    });
  }, [mutate, state]);

  const handleToggleAdminMode = useCallback(async () => {
    if (!authenticated || !state?.currentHouseId) {
      return;
    }

    const expectedAdmin = !admin;
    const result = await mutate({
      action: "setAdminMode",
      enabled: expectedAdmin,
    });

    if (shouldForceRefreshAfterAdminModeToggle(result, expectedAdmin)) {
      void refresh({ force: true });
    }
  }, [admin, authenticated, mutate, refresh, state?.currentHouseId]);

  const sessionChecking = sessionStatus === "checking";
  const isCouncilRoute = Boolean(state && (authenticated || admin || spectator));
  const routeClass = sessionChecking ? "is-session-checking" : isCouncilRoute ? "is-council" : "is-entry";

  return (
    <main className={`app-shell ${routeClass}`}>
      <DecorativeBackdrop />
      <audio ref={bgmAudioRef} src={resolvePublicAssetPath(bgmSource)} loop preload="auto" aria-hidden="true" />
      <header className="app-header" aria-label={ko.app.header.game}>
        <BrandLockup />
      </header>
      {!sessionChecking ? (
        <FloatingSettings
          admin={admin}
          authenticated={authenticated}
          spectator={spectator}
          bgmMuted={bgmMuted}
          bgmVolume={bgmVolume}
          busy={busy}
          canEndSession={Boolean(admin && state?.phase === "complete")}
          canOpenBoardProcessingHistory={canManageBoardProcessingHistory}
          canToggleRandomDiscard={Boolean(admin && state?.phase === "house-select")}
          boardProcessingHistoryOpen={boardProcessingHistoryOpen}
          boardProcessingHistoryToggleRef={boardProcessingHistoryToggleRef}
          kickHouseToggleRef={kickHouseToggleRef}
          open={settingsOpen}
          randomDiscardEnabled={state?.randomDiscardEnabled ?? true}
          state={state}
          tipsOpen={tipsOpen}
          onEndSession={handleSettingsEndSession}
          onLogout={handleSettingsLogout}
          onOpenKickHouseDialog={handleOpenKickHouseDialog}
          onOpenScoreGuide={handleOpenScoreGuide}
          onOpenSecretAgendaGuide={handleOpenSecretAgendaGuide}
          onOpenOpenAgendaGuide={handleOpenOpenAgendaGuide}
          onOpenSpecialAbilityLegend={handleOpenSpecialAbilityLegend}
          onOpenBoardProcessingGuide={handleOpenBoardProcessingGuide}
          onOpenBoardProcessingHistory={handleOpenBoardProcessingHistory}
          onOpenBoardProcessingHistoryType={handleOpenBoardProcessingHistoryType}
          onReset={handleSettingsReset}
          onBgmVolumeChange={handleBgmVolumeChange}
          onToggleRandomDiscard={handleToggleRandomDiscard}
          onToggleBgmMuted={handleToggleBgmMuted}
          onToggleAdminMode={handleToggleAdminMode}
          onClose={closeFloatingMenus}
          onToggle={handleToggleSettings}
          onToggleTips={handleToggleTips}
          tipsToggleRef={tipsToggleRef}
          toggleRef={settingsToggleRef}
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
          refresh={refresh}
        />
      )}
      <Suspense fallback={null}>
        <SessionEndDialog
          boardComplete={finalBoardComplete}
          boardDraft={finalBoardDraft}
          busy={busy}
          checks={sessionEndChecklist}
          endCause={sessionEndCause}
          rewardsApplied={Boolean(state?.sessionEndRewardsAppliedAt)}
          scoring={finalScoring}
          scoringBusy={finalScoringBusy}
          open={sessionEndDialogOpen}
          ready={sessionEndChecklistComplete}
          onBoardChange={handleFinalBoardChange}
          onApplyRewards={handleApplySessionEndRewards}
          onCancel={handleCancelSessionEnd}
          onConfirm={handleConfirmSessionEnd}
          onEndCauseChange={setSessionEndCause}
          onToggle={handleToggleSessionEndCheck}
        />
        <ScoreGuideDialog open={scoreGuideOpen} onClose={handleCloseScoreGuide} restoreFocusRef={tipsToggleRef as any} />
        <SpecialAbilityLegendDialog
          open={specialAbilityLegendOpen}
          restoreFocusRef={specialAbilityLegendButtonRef as any}
          onClose={handleCloseSpecialAbilityLegend}
        />
        <BoardProcessingGuideDialog
          open={boardProcessingGuideOpen}
          onClose={handleCloseBoardProcessingGuide}
          restoreFocusRef={boardProcessingGuideToggleRef as any}
        />
        <BoardProcessingTypeHistoryDialog
          busy={busy}
          canDelete={canManageBoardProcessingHistory}
          houses={state?.houses || []}
          history={state?.boardProcessingHistory}
          items={state?.boardProcessingItems || []}
          onClose={handleCloseBoardProcessingHistoryType}
          onDelete={handleDeleteBoardProcessingHistoryItem}
          restoreFocusRef={boardProcessingHistoryTypeRef}
          selectedType={canManageBoardProcessingHistory ? selectedBoardProcessingHistoryType : null}
        />
        <KickHouseDialog
          key={kickHouseDialogOpen ? "kick-house-open" : "kick-house-closed"}
          busy={busy}
          houses={state?.houses || []}
          open={Boolean(kickHouseDialogOpen && admin)}
          restoreFocusRef={kickHouseToggleRef as any}
          onClose={handleCloseKickHouseDialog}
          onConfirm={handleConfirmKickHouse}
        />
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
  admin,
  authenticated,
  spectator,
  bgmMuted,
  bgmVolume,
  boardProcessingHistoryOpen,
  boardProcessingHistoryToggleRef,
  busy,
  canEndSession,
  canOpenBoardProcessingHistory,
  canToggleRandomDiscard,
  kickHouseToggleRef,
  open,
  randomDiscardEnabled,
  state,
  tipsOpen,
  onEndSession,
  onLogout,
  onOpenKickHouseDialog,
  onOpenScoreGuide,
  onOpenSecretAgendaGuide,
  onOpenOpenAgendaGuide,
  onOpenSpecialAbilityLegend,
  onOpenBoardProcessingGuide,
  onOpenBoardProcessingHistory,
  onOpenBoardProcessingHistoryType,
  onReset,
  onBgmVolumeChange,
  onToggle,
  onToggleAdminMode,
  onToggleBgmMuted,
  onToggleRandomDiscard,
  onToggleTips,
  onClose,
  tipsToggleRef,
  toggleRef,
}: any) {
  const bgmVolumePercent = getBgmDisplayVolumePercent(bgmVolume, bgmMuted);
  const floatRef = React.useRef<HTMLDivElement>(null);
  const currentHouseId = state?.currentHouseId || "";
  const activeAdminHouseId = state?.adminHouseId || "";
  const activeAdminHouse = (state?.houses || []).find((house: any) => house.id === activeAdminHouseId);
  const activeSessionHouses = (state?.houses || []).filter((house: any) => house.hasSession);
  const adminModeBlocked = Boolean(authenticated && activeAdminHouseId && activeAdminHouseId !== currentHouseId);
  const adminModeTooltip = adminModeBlocked
    ? ko.app.settings.adminModeTaken(getHouseKoreanName(activeAdminHouse))
    : ko.app.settings.adminModeHint;
  const floatingMenuOpen = Boolean(open || tipsOpen || boardProcessingHistoryOpen);

  const handleFloatingMenuScrimPointerDown = React.useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    onClose?.();
  }, [onClose]);

  React.useEffect(() => {
    if (!floatingMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const root = floatRef.current;
      const target = event.target;

      if (!root || !(target instanceof Node) || root.contains(target)) {
        return;
      }

      onClose?.();
    };

    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [floatingMenuOpen, onClose]);

  return (
    <>
      {floatingMenuOpen ? (
        <button
          aria-label={ko.common.close}
          className="settings-menu-scrim"
          onPointerDown={handleFloatingMenuScrimPointerDown}
          type="button"
        />
      ) : null}
      <div ref={floatRef} className="settings-float">
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
        {canOpenBoardProcessingHistory ? (
          <button
            ref={boardProcessingHistoryToggleRef}
            className="settings-toggle"
            type="button"
            aria-controls="board-processing-history-menu"
            aria-expanded={boardProcessingHistoryOpen}
            aria-label={ko.app.settings.boardProcessingHistory}
            onClick={onOpenBoardProcessingHistory}
          >
            <TokenIcon type="history" />
          </button>
        ) : null}
      </div>
      {tipsOpen ? (
        <div className="settings-menu tips-menu" id="tips-menu">
          <p className="section-label">{ko.app.settings.referencesSection}</p>
          <button className="ghost-button wide" type="button" onClick={onOpenOpenAgendaGuide}>
            <TokenIcon type="balance" />
            {ko.app.inventory.openScoreBtn}
          </button>
          <button className="ghost-button wide" type="button" onClick={onOpenSecretAgendaGuide || onOpenScoreGuide}>
            <TokenIcon type="balance" />
            {ko.app.settings.secretScoreLink}
          </button>
          <button className="ghost-button wide" type="button" onClick={onOpenSpecialAbilityLegend}>
            <TokenIcon type="help" />
            {ko.app.settings.specialAbilityLegend}
          </button>
          <button className="ghost-button wide" type="button" onClick={onOpenBoardProcessingGuide}>
            <TokenIcon type="help" />
            {ko.app.settings.boardProcessingGuide}
          </button>
          <a className="settings-link" href={resolvePublicAssetPath(rulebookPdfUrl)} target="_blank" rel="noreferrer">
            <TokenIcon type="scroll" />
            {ko.app.settings.rulebookPdf}
            <TokenIcon type="external" />
          </a>
        </div>
      ) : null}
      {boardProcessingHistoryOpen ? (
        <Suspense fallback={null}>
          <BoardProcessingHistoryMenu
            busy={busy}
            canManageBoardProcessing={canOpenBoardProcessingHistory}
            history={state?.boardProcessingHistory}
            items={state?.boardProcessingItems || []}
            onOpenType={onOpenBoardProcessingHistoryType}
            open={boardProcessingHistoryOpen}
          />
        </Suspense>
      ) : null}
        {open ? (
          <div className="settings-menu" id="settings-menu">
          {authenticated || admin ? (
            <>
              <p className="section-label">{ko.app.settings.adminSection}</p>
              {authenticated ? (
                <Tooltip className="settings-tooltip-anchor" label={adminModeTooltip}>
                  <button
                    className={`settings-switch-control${adminModeBlocked ? " disabled" : ""}`}
                    type="button"
                    aria-pressed={admin}
                    aria-label={ko.app.settings.adminModeAria(admin)}
                    onClick={onToggleAdminMode}
                    disabled={busy || adminModeBlocked}
                  >
                    <span>
                      <strong>{ko.app.settings.adminMode}</strong>
                    </span>
                    <span className="settings-state-segment" aria-hidden="true">
                      <span className={admin ? "active" : ""}>ON</span>
                      <span className={!admin ? "active" : ""}>OFF</span>
                    </span>
                  </button>
                </Tooltip>
              ) : null}
              {admin ? (
                <>
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
                      <TokenIcon type="seal" />
                      {ko.app.settings.sessionEndPrep}
                    </button>
                  </Tooltip>
                  <button
                    ref={kickHouseToggleRef}
                    className="ghost-button wide"
                    type="button"
                    onClick={onOpenKickHouseDialog}
                    disabled={busy || !activeSessionHouses.length}
                  >
                    <TokenIcon type="exit" />
                    {ko.app.settings.kickHouseMenu}
                  </button>
                  {!activeSessionHouses.length ? <p className="settings-empty">{ko.app.settings.noActiveSessions}</p> : null}
                </>
              ) : null}
            </>
          ) : null}
          <p className="section-label">{ko.app.settings.appSection}</p>
          <div className="settings-volume-control">
            <div className="settings-volume-heading">
              <div className="settings-volume-label-group">
                <label htmlFor="bgm-volume">{ko.app.settings.bgmVolume}</label>
                <button
                  className="settings-volume-mute-button"
                  type="button"
                  aria-pressed={bgmMuted}
                  aria-label={ko.app.settings.bgmToggle}
                  title={bgmMuted ? ko.app.settings.bgmUnmute : ko.app.settings.bgmMute}
                  onClick={onToggleBgmMuted}
                >
                  <TokenIcon type={bgmMuted ? "soundOff" : "soundOn"} />
                </button>
              </div>
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
          {authenticated || spectator ? (
            <button className="ghost-button wide" type="button" onClick={onLogout} disabled={busy}>
              <TokenIcon type="exit" />
              {ko.app.settings.leaveCouncil}
            </button>
          ) : null}
          <button className="ghost-button wide" type="button" onClick={onReset} disabled={busy}>
            <TokenIcon type="reset" />
            {ko.app.settings.resetKingdom}
          </button>
          </div>
        ) : null}
      </div>
    </>
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
      <div className="password-panel">
        <p className="password-hint">
          <TokenIcon type="seal" />
          {ko.app.login.passwordHint}
        </p>
      </div>
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

export function GamePanel({
  state,
  busy,
  mutate,
  refresh,
}: any) {
  const draftTurnName = state.turn ? getHouseDisplayName(state, state.turn) : ko.app.gamePanel.beforeStart;
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
  const showStatusCard = state.phase !== "complete";
  const showDraftStatusDetails = showStatusCard;
  const showCouncilProcedure = showStatusCard;
  const showBoardProcessingInputPanel = Boolean(state.phase === "complete" && state.isAdmin);
  const handleSaveAlignmentReward = useCallback(
    (agendaId: any, reward: any) => mutate({ action: "saveAlignmentReward", agendaId, reward }),
    [mutate],
  );

  return (
    <section className="council-layout">
      <PersonalInventoryPanel
        inventory={state.ownInventory}
        progress={state.ownHouseProgress}
        house={currentHouse}
        ownChoice={state.ownChoice}
        houses={state.houses || []}
        houseId={state.currentHouseId}
        busy={busy}
        mutate={mutate}
        refresh={refresh}
        onSaveAlignmentReward={handleSaveAlignmentReward}
        renderLayout={({ prioritySections, mainPanel }: any) => (
          <>
      <div className="council-sidebar-column">
        {showStatusCard ? (
          <aside className="council-sidebar" aria-live="polite">
            <section className="sidebar-status-section" aria-labelledby="sidebar-status-title">
              <div className="sidebar-title-row compact">
                <span className="sidebar-title-icon" aria-hidden="true">
                  <TokenIcon type="status" />
                </span>
                <h2 id="sidebar-status-title">{ko.app.gamePanel.statusTitle}</h2>
              </div>
              {showCouncilProcedure ? (
                <section className={`game-stage phase-${state.phase}`} aria-labelledby="stage-title">
                  <div className="stage-copy">
                    <p className="section-label">{ko.app.gamePanel.councilProcedure}</p>
                    <h2 id="stage-title">{councilProcedureTitle}</h2>
                    <Suspense fallback={null}>
                      <GameMessage state={state} />
                    </Suspense>
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
              ) : null}
              <Suspense fallback={null}>
                <CouncilStatusStack
                  claimedHouseCount={state.claimedHouseCount}
                  councilStageLabel={councilStageLabel}
                  currentHouseName={currentHouseChosenName || ko.app.gamePanel.spectator}
                  draftOrderCount={state.draftOrder.length}
                  draftTurnName={draftTurnName}
                  phase={state.phase}
                  requiredHouseCount={state.requiredHouseCount}
                  selectedCount={state.selectedCount}
                />
              </Suspense>
              {showDraftStatusDetails ? (
                <Suspense fallback={null}>
                  <TurnTrackAny houses={state.houses} draftOrder={state.draftOrder} turn={state.turn} phase={state.phase} />
                </Suspense>
              ) : null}
              {showDraftStatusDetails ? <p className="privacy-note">{ko.app.gamePanel.privacyNote}</p> : null}
            </section>
          </aside>
        ) : null}
        {prioritySections}
        {showBoardProcessingInputPanel ? (
          <Suspense fallback={null}>
            <BoardProcessingPanel
              busy={busy}
              canManageBoardProcessing={state.isAdmin}
              currentHouseId={state.currentHouseId}
              history={state.boardProcessingHistory}
              houses={state.houses || []}
              items={state.boardProcessingItems || []}
              mode="input"
              mutate={mutate}
            />
          </Suspense>
        ) : null}
        <CarrotWaitAction />
      </div>

      <section
        className={`council-main${showAgendaList ? " has-agenda" : ""}${
          hasCouncilContext ? " has-context" : " no-context"
        }`}
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
        {mainPanel}
      </section>
          </>
        )}
      />
    </section>
  );
}

function HouseProfileCard({
  house,
  showCrest = true,
  showSectionLabel = true,
}: any) {
  if (!house) {
    return null;
  }

  const houseProfileTitle = getHouseProfileTitle(house);

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
              <h2 id="house-profile-title">{houseProfileTitle}</h2>
            </div>
          </div>
          <span className="house-profile-number">#{String(house.number).padStart(2, "0")}</span>
        </div>
        {house.profile ? <p className="house-profile-story">{house.profile}</p> : null}
        <div className="house-profile-grid">
          <HouseProfileField label={ko.app.gamePanel.narrativeGoal} value={house.goal} />
          <HouseProfileField label={ko.app.gamePanel.preferredAgenda} value={getAlignmentKoreanLabels(house.alignments).join(" / ")} />
        </div>
      </div>
    </div>
  );
}

function getHouseProfileTitle(house: any) {
  const officialName = getHouseKoreanName(house);
  const customName = house?.hasCustomName && typeof house.name === "string" ? house.name.trim() : "";

  return customName ? `${officialName}(${customName})` : officialName;
}

function AlignmentRewardInlineEditor({ alignment, busy, reward, onSaveAlignmentReward }: any) {
  const normalizedReward = normalizeAlignmentReward(reward);
  const agendaWindowFocused = useAgendaWindowFocus();
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
    if (busy || !onSaveAlignmentReward || !agendaWindowFocused) {
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
    agendaWindowFocused,
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
  houses,
  houseId,
  busy,
  mutate,
  onSaveAlignmentReward,
  renderLayout,
}: any) {
  const serverInventory = useMemo(() => normalizeInventory(inventory), [inventory]);
  const serverProgress = useMemo(() => normalizeHouseProgress(progress), [progress]);
  const [draft, setDraft] = useState(serverInventory);
  const [progressDraft, setProgressDraft] = useState(serverProgress);
  const [ledgerSaveStatus, setLedgerSaveStatus] = useState("saved");
  const agendaWindowFocused = useAgendaWindowFocus();
  const [achievementEditor, setAchievementEditor] = useState<any>(null);
  const [achievementLegendOpen, setAchievementLegendOpen] = useState(false);
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

    if (!agendaWindowFocused || !isAgendaWindowFocused()) {
      setLedgerSaveStatus("pending");
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
  }, [agendaWindowFocused, houseId, mutate]);

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

    if (!agendaWindowFocused) {
      return undefined;
    }

    ledgerAutosaveTimerRef.current = window.setTimeout(runLedgerAutosave, ledgerAutosaveDelayMs) as any;

    return () => window.clearTimeout(ledgerAutosaveTimerRef.current as any);
  }, [agendaWindowFocused, draft, isDirty, progressDraft, runLedgerAutosave]);

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

  const tokenSection = (
    <div className="inventory-section resource-section sidebar-ledger-section sidebar-ledger-tokens">
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
    </div>
  );

  const agendaSection = ownChoice ? (
    <div className={`inventory-section inventory-agenda-section sidebar-ledger-section sidebar-ledger-agenda${ownChoice ? " has-secret-agenda" : ""}`}>
      <div className="agenda-section-header">
        <h3 className="agenda-section-title">
          <span className="agenda-section-title-lead">
            <span className="agenda-section-title-main">
              <span>{ko.app.inventory.agendaTitle}</span>
            </span>
            {ownChoice ? (
              <span className="agenda-type-legend" aria-hidden="true">
                <span>
                  <i className="agenda-type-dot common" />
                  {ko.app.inventory.agendaCommon}
                </span>
                <span>
                  <i className="agenda-type-dot secret" />
                  {ko.app.inventory.agendaSecret}
                </span>
              </span>
            ) : null}
          </span>
        </h3>
      </div>
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
  ) : null;

  const prioritySections = (
    <div className="sidebar-ledger-stack" aria-label={ko.app.inventory.title}>
      {tokenSection}
      {agendaSection}
    </div>
  );

  const mainPanel = (
    <section className={`inventory-panel${house ? " has-house-profile" : ""}`} aria-labelledby="inventory-title">
      <div className="inventory-toolbar">
        <div className="inventory-toolbar-title">
          <div className="panel-title-row">
            <span className="panel-title-icon" aria-hidden="true">
              <TokenIcon type="castle" />
            </span>
            <h2 id="inventory-title">{ko.app.inventory.title}</h2>
          </div>
          <span className={ledgerStatusClassName} aria-live="polite">{ledgerStatusText}</span>
        </div>
        <div className="inventory-toolbar-actions">
          <span className="visually-hidden">{ledgerStatusDescription}</span>
          <button className="ghost-button" type="button" onClick={applyGameStartDefaults} disabled={busy}>
            <TokenIcon type="reset" />
            {ko.app.inventory.defaultsButton}
          </button>
        </div>
      </div>

      <div className="inventory-section resource-section">
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
            house={house}
            showCrest={false}
            showSectionLabel={false}
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
              houses={houses || []}
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
                  houses={houses || []}
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
                  onSaveAlignmentReward={onSaveAlignmentReward}
                />
              ))}
            </div>
          </section>
        </div>
      </div>

      <Suspense fallback={null}>
        <AchievementEditDialog
          busy={busy}
          editor={achievementEditor}
          houses={houses || []}
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
  );

  return renderLayout ? renderLayout({ prioritySections, mainPanel }) : mainPanel;
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
            <Tooltip
              key={resource.id}
              className="open-agenda-resource-tooltip"
              label={resource.label}
              ariaLabel={ko.app.inventory.openAgendaTokenChipAria(type.shortLabel, resource.label)}
            >
              <button
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
            </Tooltip>
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
  houses = [],
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
        houses={houses}
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
          <AchievementDetailPreview detail={normalizedDetail} houses={houses} />
        </span>
      </button>
      <div className="achievement-card-action-rail">
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
    </div>
  );
}

function AchievementDetailPreview({ detail, houses = [] }: { detail: any; houses?: any[] }) {
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
      {hasCondition ? <MentionTokenView className="achievement-detail-condition" houses={houses} text={detail.conditionText} /> : null}
      {hasEffect ? (
        <span className="achievement-detail-segment">
          <AchievementEffectMemo detail={detail} houses={houses} />
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
  houses = [],
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
            <AchievementDetailPreview detail={normalizedDetail} houses={houses} />
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
      <div className="achievement-card-action-rail">
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
  onSaveAlignmentReward,
}: any) {
  const complete = value >= max;
  const normalizedReward = normalizeAlignmentReward(reward);

  return (
    <div className={`alignment-progress-row${complete ? " complete" : ""}`}>
      <span>
        <strong>{alignment.koreanLabel}</strong>
        <small>{alignment.label}</small>
      </span>
      <AlignmentRewardInlineEditor
        alignment={alignment}
        busy={disabled}
        reward={normalizedReward}
        onSaveAlignmentReward={onSaveAlignmentReward}
      />
      <ProgressPips value={value} max={max} label={ko.app.inventory.alignmentAchievementAria(alignment.koreanLabel)} />
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
    ? value.replace(/\r\n?/g, "\n").slice(0, achievementDetailTextMaxLength)
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
    <div className="own-choice secret-agenda-card-frame">
      <div className="secret-agenda-card-inner">
        <div className="own-choice-heading secret-agenda-card-title-row">
          <h3>
            <AgendaTitle agenda={agenda} />
          </h3>
        </div>
        <div className="secret-agenda-card-body">
          <AgendaSecretContent agenda={agenda} />
          <AgendaScoringBoard agenda={agenda} />
        </div>
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
  const [allExpanded, setAllExpanded] = useState(false);
  const discardMode = mode === "discard";

  if (!agendas.length) {
    return null;
  }

  const toggleAllAgendas = () => {
    setAllExpanded(!allExpanded);
  };

  return (
    <section className="agenda-section" aria-label={discardMode ? ko.app.agendaUi.titleDiscard : ko.app.agendaUi.titleDraft}>
      <div className="agenda-section-heading">
        <div className="agenda-section-heading-main">
          <p className="section-label agenda-section-mode-label">
            <span className="agenda-section-mode-icon" aria-hidden="true">
              <TokenIcon type={discardMode ? "flame" : "key"} />
            </span>
            <span>{ko.app.agendaUi.discardOrDraft(discardMode)}</span>
          </p>
          <span className="agenda-remaining-chip">{ko.app.agendaUi.agendasRemaining(agendas.length)}</span>
        </div>
        <div className="agenda-section-heading-actions">
          <button
            className="ghost-button agenda-expand-toggle"
            type="button"
            aria-controls="agenda-list"
            aria-expanded={allExpanded}
            onClick={toggleAllAgendas}
          >
            <TokenIcon type={allExpanded ? "minus" : "plus"} />
            {ko.app.agendaUi.expand(allExpanded)}
          </button>
        </div>
      </div>
      <div className="agenda-list" id="agenda-list">
        {agendas.map((agenda: any, index: number) => (
          <AgendaCard
            key={agenda.id}
            agenda={agenda}
            busy={busy}
            expanded={allExpanded}
            mode={mode}
            mutate={mutate}
            index={index + 1}
          />
        ))}
      </div>
    </section>
  );
}

function AgendaCard({
  agenda,
  busy,
  expanded,
  mode = "choose",
  mutate,
  index,
}: {
  agenda: any;
  busy: boolean;
  expanded: boolean;
  mode?: string;
  mutate: any;
  index: number;
}) {
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
    <article
      className={`agenda-card secret-agenda-card-frame${expanded ? " expanded" : ""}`}
      aria-label={`${ko.app.agendaUi.secretAgendaSection} ${index}`}
    >
      <div className="secret-agenda-card-inner">
        <div className="agenda-card-top">
          <span className="agenda-sigil" aria-hidden="true">
            <TokenIcon type="crown" />
          </span>
          <div className="agenda-card-title">
            <div className="agenda-card-label-row">
              <div className="agenda-card-label-actions">
                <p className="section-label">{ko.app.agendaUi.secretAgendaSection}</p>
                <span className="agenda-card-number-tag">{index}</span>
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
        <div
          className={`agenda-card-detail${expanded ? "" : " agenda-card-detail-collapsed"}`}
          id={detailId}
          aria-hidden={!expanded}
        >
          <div className="secret-agenda-card-body">
            <AgendaSecretContent agenda={agenda} />
            <AgendaScoringBoard agenda={agenda} />
          </div>
        </div>
      </div>
    </article>
  );
}

function AgendaSecretContent({ agenda }: { agenda: any }) {
  const hasNote = Boolean(agenda.note);

  return (
    <div className="agenda-secret-content">
      <div className="agenda-secret-content-block">
        <span>{ko.app.agendaUi.goalTitle}</span>
        <p>{agenda.resourceGoal}</p>
      </div>
      {hasNote ? (
        <div className="agenda-secret-content-block">
          <span>{ko.app.agendaUi.noteTitle}</span>
          <p>{agenda.note}</p>
        </div>
      ) : null}
    </div>
  );
}

function AgendaScoringBoard({ agenda }: { agenda: any }) {
  return (
    <div className="agenda-score-board" aria-label={ko.app.agendaUi.agendaScoreBoardAria(formatAgendaTitle(agenda))}>
      <div className="agenda-score-tables">
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
      <AgendaResourceZoneStrip agenda={agenda} />
    </div>
  );
}

function AgendaResourceZoneStrip({ agenda }: { agenda: any }) {
  const zones = (agendaScoringZones as any)[agenda.id] ?? [];
  const hasDistanceMode = zones.some((zone: any) => zone.mode === "distance");
  const isExtremistAgenda = agenda.id === "extremist";
  const centerRow = Math.ceil(boardRows.length / 2);
  const outermostDistance = Math.max(...boardRows.map((row) => Math.abs(row - centerRow)), 1);
  const isActiveRow = (row: any) => zones.some((zone: any) => row >= zone.from && row <= zone.to);
  const getExtremistZoneCellStyle = (row: number): React.CSSProperties => {
    const ratio = Math.abs(row - centerRow) / outermostDistance;
    const emphasis = Math.pow(ratio, 1.25);
    const mix = (start: number, end: number) => Math.round(start + (end - start) * ratio);
    const background = {
      red: mix(120, 216),
      green: mix(115, 178),
      blue: mix(99, 90),
      alpha: 0.18 + emphasis * 0.54,
    };
    const border = {
      red: mix(120, 216),
      green: mix(115, 178),
      blue: mix(99, 90),
      alpha: 0.34 + emphasis * 0.48,
    };

    return {
      "--agenda-zone-active-bg": `rgba(${background.red}, ${background.green}, ${background.blue}, ${background.alpha.toFixed(2)})`,
      "--agenda-zone-active-border": `rgba(${border.red}, ${border.green}, ${border.blue}, ${border.alpha.toFixed(2)})`,
    } as React.CSSProperties;
  };

  return (
    <div
      className={`agenda-zone-strip secret-agenda-progress-spine${hasDistanceMode ? " distance" : ""}${
        isExtremistAgenda ? " extremist" : ""
      }`}
    >
      <div className="agenda-score-title">{hasDistanceMode ? ko.app.agendaUi.scoreTitleDistance : ko.app.agendaUi.scoreTitleBoard}</div>
      <div className="agenda-zone-cells" aria-label={ko.app.agendaUi.zoneAria}>
        {boardRows.map((row) => {
          const active = isActiveRow(row);
          const showLabel = active || row === 1 || row === 5 || row === 9 || row === 13 || row === 17;
          const style = isExtremistAgenda && active ? getExtremistZoneCellStyle(row) : undefined;

          return (
            <span
              className={`agenda-zone-cell${row === 9 ? " center" : ""}${active ? " active" : ""}`}
              style={style}
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
    <div className="agenda-score-track agenda-score-table">
      <div className="agenda-score-title agenda-score-table-title">
        <span>{title}</span>
        <TokenIcon type="crown" />
      </div>
      <div className="agenda-score-segments agenda-score-table-rows">
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
              <strong>{item.vp > 0 ? `+${item.vp}` : item.vp}</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;

