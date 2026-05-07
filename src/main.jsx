import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import AgricultureOutlinedIcon from "@mui/icons-material/AgricultureOutlined";
import AnchorOutlinedIcon from "@mui/icons-material/AnchorOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import AutorenewOutlinedIcon from "@mui/icons-material/AutorenewOutlined";
import BalanceOutlinedIcon from "@mui/icons-material/BalanceOutlined";
import CastleOutlinedIcon from "@mui/icons-material/CastleOutlined";
import CoronavirusOutlinedIcon from "@mui/icons-material/CoronavirusOutlined";
import CrueltyFreeOutlinedIcon from "@mui/icons-material/CrueltyFreeOutlined";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import ForestOutlinedIcon from "@mui/icons-material/ForestOutlined";
import HomeWorkOutlinedIcon from "@mui/icons-material/HomeWorkOutlined";
import KeyOutlinedIcon from "@mui/icons-material/KeyOutlined";
import LocalFireDepartmentOutlinedIcon from "@mui/icons-material/LocalFireDepartmentOutlined";
import LocalFloristOutlinedIcon from "@mui/icons-material/LocalFloristOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import MilitaryTechOutlinedIcon from "@mui/icons-material/MilitaryTechOutlined";
import PaidOutlinedIcon from "@mui/icons-material/PaidOutlined";
import PetsOutlinedIcon from "@mui/icons-material/PetsOutlined";
import PestControlRodentOutlinedIcon from "@mui/icons-material/PestControlRodentOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import RemoveOutlinedIcon from "@mui/icons-material/RemoveOutlined";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import SailingOutlinedIcon from "@mui/icons-material/SailingOutlined";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import UndoOutlinedIcon from "@mui/icons-material/UndoOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VolumeOffOutlinedIcon from "@mui/icons-material/VolumeOffOutlined";
import VolumeUpOutlinedIcon from "@mui/icons-material/VolumeUpOutlined";
import VpnKeyOutlinedIcon from "@mui/icons-material/VpnKeyOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import { HOUSE_CATALOG, REQUIRED_HOUSE_COUNT } from "../shared/houses.mjs";
import { Carrot as shakeCarrot } from "./Carrot";
import "./styles.css";

const phaseLabels = {
  "house-select": "가문 선택",
  discard: "폐기 의식",
  choose: "의제 선택",
  complete: "의제 배정 완료",
};

const phaseCopy = {
  "house-select": "이번 의회에 참여할 5개 가문을 정합니다.",
  discard: "첫 차례 가문이 봉인 의제 1장을 폐기하고 드래프트를 시작합니다.",
  choose: "차례가 온 가문만 남은 비밀 의제를 확인합니다.",
  complete: "게임이 끝나면 장부를 저장하고 설정 메뉴에서 이번 회기를 마감합니다.",
};

const defaultNamePattern = /^player\s*[1-5]$/i;
const unsavedExitMessage = "저장하지 않은 변경사항이 있습니다. 정말 창을 종료하겠습니까?";
const gameStartDefaultsConfirmMessage =
  "장부를 게임 시작 기본값(토큰·승리 점수·공개 의제·업적)으로 맞출까요?";
const sessionEndUnavailableMessage = "비밀 의제 배정이 끝난 뒤 회기를 종료할 수 있습니다.";
const sessionEndChecklistItems = [
  { id: "inventories", label: "모든 가문이 개인 장부를 저장함" },
  { id: "scores", label: "최종 점수와 명망/갈망 반영을 확인함" },
  { id: "progress", label: "공개 의제와 업적/성향 업적 표시를 확인함" },
  { id: "board", label: "공용 보드와 물리/외부 저장 정리를 완료함" },
];
const inventoryDraftPrefix = "kd-personal-inventory-draft:";
const progressDraftPrefix = "kd-house-progress-draft:";
const sharedBoardSheetUrl =
  "https://docs.google.com/spreadsheets/d/1hJw0gYAeIafIFUJOBTDaC_2QR87CXyXABrOKvu3QG2M/edit?usp=sharing";
const bgmSource = "/Morrowind.mp3";
const bgmMutedStorageKey = "kd-bgm-muted";
const bgmVolume = 0.34;
const tokenCounters = [
  { id: "coins", label: "재화", max: 99, icon: "coin", tone: "coin" },
  { id: "powerTokens", label: "권력", max: 99, icon: "power", tone: "power" },
];
const scoreTrackCounters = [
  { id: "prestige", label: "명망", max: 100, icon: "prestige", tone: "prestige" },
  { id: "crave", label: "갈망", max: 50, icon: "crave", tone: "crave" },
];
const inventoryCounters = [...tokenCounters, ...scoreTrackCounters];
const inventoryCounterMax = Object.fromEntries(inventoryCounters.map((counter) => [counter.id, counter.max]));
const houseAlignmentRows = [
  { id: "Extremist", agendaId: "extremist", label: "Extremist", koreanLabel: "극단주의자" },
  { id: "Opulent", agendaId: "opulent", label: "Opulent", koreanLabel: "재력가" },
  { id: "Moderate", agendaId: "moderate", label: "Moderate", koreanLabel: "중도주의자" },
  { id: "Rebel", agendaId: "rebel", label: "Rebel", koreanLabel: "반역자" },
  { id: "Opportunist", agendaId: "opportunist", label: "Opportunist", koreanLabel: "기회주의자" },
  { id: "Greedy", agendaId: "greedy", label: "Greedy", koreanLabel: "탐욕가" },
];
const houseAlignmentLabelById = Object.fromEntries(
  houseAlignmentRows.map((alignment) => [alignment.id, alignment.koreanLabel]),
);
const resourceCounters = [
  { id: "influence", label: "영향력", max: 17, icon: "influence", tone: "influence" },
  { id: "wealth", label: "부", max: 17, icon: "wealth", tone: "wealth" },
  { id: "morale", label: "사기", max: 17, icon: "morale", tone: "morale" },
  { id: "welfare", label: "복지", max: 17, icon: "welfare", tone: "welfare" },
  { id: "knowledge", label: "지식", max: 17, icon: "knowledge", tone: "knowledge" },
];
const openAgendaTokenTypes = [
  { id: "positive", label: "긍정 공개 의제", shortLabel: "긍정", tone: "positive" },
  { id: "negative", label: "부정 공개 의제", shortLabel: "부정", tone: "negative" },
];
const openAgendaTokenLimit = 2;
const houseAchievementRows = [
  { id: 0, label: "도전 과제 1" },
  { id: 1, label: "도전 과제 2" },
  { id: 2, label: "도전 과제 3" },
];
const houseAchievementMarkMax = 5;
const houseAlignmentMarkMax = 4;
const boardRows = Array.from({ length: 17 }, (_, index) => index + 1);
const agendaScoringZones = {
  extremist: [{ from: 1, to: 17, mode: "distance" }],
  opulent: [{ from: 9, to: 17 }],
  moderate: [{ from: 5, to: 13 }],
  rebel: [
    { from: 1, to: 5 },
    { from: 13, to: 17 },
  ],
  opportunist: [{ from: 1, to: 9 }],
  greedy: [
    { from: 1, to: 5 },
    { from: 13, to: 17 },
  ],
};

function createFinalBoardDraft() {
  return Object.fromEntries(resourceCounters.map((resource) => [resource.id, ""]));
}

function createSessionEndChecklistState() {
  return Object.fromEntries(sessionEndChecklistItems.map((item) => [item.id, false]));
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

function App() {
  const [state, setState] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [sessionStatus, setSessionStatus] = useState("checking");
  const [houseInput, setHouseInput] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [seatPassword, setSeatPassword] = useState("");
  const [seatPasswordConfirm, setSeatPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hasUnsavedInventoryChanges, setHasUnsavedInventoryChanges] = useState(false);
  const [sessionEndDialogOpen, setSessionEndDialogOpen] = useState(false);
  const [sessionEndChecklist, setSessionEndChecklist] = useState(createSessionEndChecklistState);
  const [finalBoardDraft, setFinalBoardDraft] = useState(createFinalBoardDraft);
  const [finalScoring, setFinalScoring] = useState(null);
  const [finalScoringBusy, setFinalScoringBusy] = useState(false);
  const [bgmMuted, setBgmMuted] = useState(readStoredBgmMuted);
  const refreshInFlight = useRef(null);
  const mutationInFlight = useRef(false);
  const finalScoringRequest = useRef(0);
  const bgmAudioRef = useRef(null);
  const finalBoardComplete = useMemo(() => isFinalBoardDraftComplete(finalBoardDraft), [finalBoardDraft]);
  const sessionEndChecklistComplete = useMemo(
    () => sessionEndChecklistItems.every((item) => sessionEndChecklist[item.id]),
    [sessionEndChecklist],
  );

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
          setSessionStatus("ready");
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
    const audio = bgmAudioRef.current;

    if (!audio) {
      return undefined;
    }

    audio.loop = true;
    audio.muted = bgmMuted;
    audio.volume = bgmVolume;
    writeStoredBgmMuted(bgmMuted);

    if (bgmMuted) {
      audio.pause();
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
    const selectedHouse = getHouses(state).find((house) => house.id === houseInput);
    const needsDisplayName = Boolean(selectedHouse) && (!selectedHouse.hasPassword || !selectedHouse.hasCustomName);

    if (!selectedHouse?.hasPassword && seatPassword !== seatPasswordConfirm) {
      setError("새 가문 비밀번호가 서로 다릅니다.");
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
    if (!confirmUnsavedExit()) {
      return;
    }

    const result = await mutate({ action: "logout" });

    if (result) {
      setHasUnsavedInventoryChanges(false);
      setHouseInput("");
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

    if (hasUnsavedInventoryChanges) {
      setError("장부 변경사항을 저장한 뒤 회기를 종료하세요.");
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

    if (hasUnsavedInventoryChanges) {
      setSessionEndDialogOpen(false);
      setError("장부 변경사항을 저장한 뒤 회기를 종료하세요.");
      return;
    }

    const result = await mutate({ action: "endSession" });

    if (!result) {
      return;
    }

    setHasUnsavedInventoryChanges(false);
    setAuthenticated(false);
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

  const handleToggleBgmMuted = useCallback(() => {
    const nextMuted = !bgmMuted;
    const audio = bgmAudioRef.current;

    setBgmMuted(nextMuted);

    if (!audio) {
      return;
    }

    audio.muted = nextMuted;
    audio.volume = bgmVolume;

    if (nextMuted) {
      audio.pause();
      return;
    }

    void audio.play().catch(() => undefined);
  }, [bgmMuted]);

  const sessionChecking = sessionStatus === "checking";
  const isCouncilRoute = Boolean(authenticated && state);
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
          busy={busy}
          canEndSession={Boolean(authenticated && state?.phase === "complete")}
          open={settingsOpen}
          onEndSession={handleSettingsEndSession}
          onLogout={handleSettingsLogout}
          onRefresh={refresh}
          onReset={handleSettingsReset}
          onToggleBgmMuted={handleToggleBgmMuted}
          onToggle={() => setSettingsOpen((current) => !current)}
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
          onDirtyChange={setHasUnsavedInventoryChanges}
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
        <h2>의회 출입 기록을 확인 중입니다</h2>
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
          공용 보드의 최종 위치를 기준으로 비밀 의제, 공개 의제, 재화 순위, 권력 보너스를 계산합니다. 명망/갈망과
          가문 기록은 유지되고, 재화/권력은 다음 회기 기본값으로 돌아갑니다.
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
            <th scope="col">재화</th>
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
  busy,
  canEndSession,
  open,
  onEndSession,
  onLogout,
  onRefresh,
  onReset,
  onToggle,
  onToggleBgmMuted,
}) {
  return (
    <div className="settings-float">
      <div className="settings-float-actions">
        {authenticated ? (
          <button className="settings-refresh-button" type="button" onClick={onRefresh} disabled={busy}>
            <span className="settings-refresh-icon" aria-hidden="true">
              <TokenIcon type="refresh" />
            </span>
            <span>상태 새로고침</span>
          </button>
        ) : null}
        <button
          className="settings-toggle"
          type="button"
          aria-controls="settings-menu"
          aria-expanded={open}
          aria-label="설정 메뉴"
          onClick={onToggle}
        >
          <TokenIcon type="menu" />
        </button>
      </div>
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
          <a className="settings-link" href={sharedBoardSheetUrl} target="_blank" rel="noreferrer">
            <TokenIcon type="sheet" />
            공용 보드 시트
            <TokenIcon type="external" />
          </a>
          {authenticated ? (
            <>
              <button
                className="ghost-button wide session-end-button"
                type="button"
                onClick={onEndSession}
                disabled={busy || !canEndSession}
                title={canEndSession ? "이번 회기를 마감하고 다음 드래프트를 준비합니다." : sessionEndUnavailableMessage}
              >
                <TokenIcon type="seal" />
                이번 회기 종료
              </button>
              <button className="ghost-button wide" type="button" onClick={onLogout} disabled={busy}>
                <TokenIcon type="exit" />
                의회 퇴장
              </button>
            </>
          ) : null}
          <button className="ghost-button wide" type="button" onClick={onReset} disabled={busy}>
            <TokenIcon type="reset" />
            왕국 초기화
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
        <p className="brand-title">왕의 딜레마</p>
        <h1>King's Dilemma Deck</h1>
        <p className="brand-subtitle">가문 장부와 비밀 의제를 한 화면에서 관리합니다.</p>
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
            이번 회의에 참여할 5개 가문을 고릅니다. 명망이 낮은 가문부터, 동률이면 가문 번호순으로 비밀 의제를 선택합니다.
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
          <p className="entry-house-placeholder">가문을 선택하면 이곳에 해당 가문의 설명이 표시됩니다.</p>
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
                      {house.hasCustomName ? house.name : selectionClosed ? "회의 불참" : "아직 선택되지 않음"}
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
          {busy ? "선택 중" : "가문 선택 / 입장"}
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
        placeholder="예: 핀체이 가문"
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

function GamePanel({ state, busy, mutate, onDirtyChange }) {
  const currentHouseName = getHouseDisplayName(state, state.currentHouseId);
  const draftTurnName = state.turn ? getHouseDisplayName(state, state.turn) : "시작 전";
  const currentHouse = getCurrentHouse(state);
  const currentHouseChosenName =
    currentHouse?.hasCustomName && typeof currentHouse.name === "string"
      ? currentHouse.name.trim()
      : "";
  const availableAgendas = state.availableAgendas || [];
  const hasAgendaDraft = availableAgendas.length > 0;
  const hasCouncilContext = state.canDiscard;

  return (
    <section className="council-layout">
      <aside className="council-sidebar" aria-live="polite">
        <div className="sidebar-heading">
          <div className="sidebar-heading-row">
            <div className="sidebar-seal" aria-hidden="true">
              <TokenIcon type="crown" />
            </div>
            <div className="sidebar-heading-copy">
              <p className="section-label">의회 현황</p>
              <h2>{phaseLabels[state.phase] || state.phase}</h2>
            </div>
          </div>
          <p>{phaseCopy[state.phase] || "의회 기록을 갱신하고 있습니다."}</p>
        </div>
        <HouseProfileCard house={currentHouse} displayName={currentHouseName} />
        <section className={`dilemma-stage phase-${state.phase}`} aria-labelledby="stage-title">
          <div className="stage-copy">
            <p className="section-label">의회 절차</p>
            <h2 id="stage-title">드래프트 상태</h2>
            <GameMessage state={state} />
            {isWaitingForDraft(state) ? <CarrotWaitAction /> : null}
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
          <StatusItem icon="turn" label="차례" value={draftTurnName} />
          <StatusItem icon="scroll" label="현재 단계" value={phaseLabels[state.phase] || state.phase} />
          <StatusItem
            icon="seal"
            label={state.phase === "house-select" ? "가문 선택" : "의제 선택"}
            value={
              state.phase === "house-select"
                ? `${state.claimedHouseCount} / ${state.requiredHouseCount}`
                : `${state.selectedCount} / ${state.draftOrder.length || REQUIRED_HOUSE_COUNT}`
            }
          />
        </div>
        <TurnTrack houses={state.houses} draftOrder={state.draftOrder} turn={state.turn} phase={state.phase} />
        <p className="privacy-note">남은 의제는 자기 차례가 오기 전까지 봉인됩니다.</p>
      </aside>

      <section className={`council-main${hasAgendaDraft ? " has-agenda" : ""}${hasCouncilContext ? " has-context" : " no-context"}`}>
        {hasCouncilContext ? (
          <aside className="council-context" aria-label="드래프트 보조 정보">
            <ActionPanel state={state} busy={busy} mutate={mutate} />
          </aside>
        ) : null}
        <AgendaList agendas={availableAgendas} busy={busy} mutate={mutate} />
        <PersonalInventoryPanel
          inventory={state.ownInventory}
          progress={state.ownHouseProgress}
          ownChoice={state.ownChoice}
          houseId={state.currentHouseId}
          busy={busy}
          mutate={mutate}
          onDirtyChange={onDirtyChange}
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
  const customName = house?.hasCustomName && typeof house.name === "string" ? house.name.trim() : "";

  if (!customName || customName === houseName || customName === house?.koreanTitle || customName === house?.title) {
    return houseName;
  }

  return `${houseName} (${customName})`;
}

function HouseProfileCard({ house, displayName }) {
  if (!house) {
    return null;
  }

  return (
    <section className="house-profile-card" aria-labelledby="house-profile-title">
      <div className="house-profile-crest" aria-hidden="true">
        <HouseIcon motif={house.motif} />
      </div>
      <div className="house-profile-main">
        <div className="house-profile-heading">
          <div>
            <p className="section-label">가문 상세</p>
            <h2 id="house-profile-title">{getHouseKoreanName(house)}</h2>
          </div>
          <span className="house-profile-number">#{String(house.number).padStart(2, "0")}</span>
        </div>
        <div className="house-profile-grid">
          <HouseProfileField label="선호 의제 성향" value={getAlignmentKoreanLabels(house.alignments).join(" / ")} />
          <HouseProfileField label="서사 목표" value={house.goal} />
        </div>
        <HouseAlignmentTrack alignments={house.alignments || []} />
      </div>
    </section>
  );
}

function HouseAlignmentTrack({ alignments }) {
  const favoriteAlignments = new Set(alignments);

  return (
    <div className="house-alignment-track" aria-label="가문 선호 비밀 의제">
      {houseAlignmentRows.map((alignment) => {
        const preferred = favoriteAlignments.has(alignment.id);

        return (
          <div className={`house-alignment-row${preferred ? " preferred" : ""}`} key={alignment.id}>
            <span>
              {alignment.koreanLabel}
            </span>
          </div>
        );
      })}
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

function StatusItem({ icon, label, value }) {
  return (
    <div className="status-item">
      <span className="status-icon" aria-hidden="true">
        <TokenIcon type={icon} />
      </span>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
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

        return (
          <span
            className={`turn-node${selected ? " current" : ""}${done ? " done" : ""}${phase === "house-select" ? " claimed" : ""}`}
            key={house.id}
            title={house.koreanTitle}
          >
            {house.number}
          </span>
        );
      })}
    </div>
  );
}

function GameMessage({ state }) {
  const text = useMemo(() => {
    if (state.phase === "house-select") {
      const remaining = Math.max((state.requiredHouseCount || REQUIRED_HOUSE_COUNT) - (state.claimedHouseCount || 0), 0);
      return remaining
        ? `${remaining}개 가문이 더 선택되면 명망이 낮은 가문부터 비밀 의제 드래프트를 시작합니다. 동률이면 가문 번호순입니다.`
        : "의석이 모두 찼습니다. 첫 가문이 폐기 의식을 시작합니다.";
    }

    if (state.phase === "complete") {
      return "비밀 의제 배정 완료. 게임 종료 후 명망과 갈망까지 저장한 뒤 이번 회기를 마감하세요.";
    }

    if (state.canDiscard) {
      return `${getHouseDisplayName(state, state.currentHouseId)} 차례입니다. 봉인된 6장 중 1장을 폐기하고 남은 의제를 펼칩니다.`;
    }

    if (state.canChoose) {
      return `${getHouseDisplayName(state, state.currentHouseId)} 차례입니다. 남은 비밀 의제 중 하나를 고르세요.`;
    }

    if (state.ownChoice) {
      return "선택 완료. 다른 가문의 차례에는 남은 의제가 봉인됩니다.";
    }

    return `${getHouseDisplayName(state, state.currentHouseId)} 대기 중. 지금은 ${getHouseDisplayName(state, state.turn)} 차례라 남은 의제는 봉인되어 있습니다.`;
  }, [state]);

  return <p className="message">{text}</p>;
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
          🥕
        </span>
        <span className="carrot-button-label">당근이나 흔들고 있으세요</span>
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

function PersonalInventoryPanel({ inventory, progress, ownChoice, houseId, busy, mutate, onDirtyChange }) {
  const storageKey = houseId ? `${inventoryDraftPrefix}${houseId}` : "";
  const progressStorageKey = houseId ? `${progressDraftPrefix}${houseId}` : "";
  const serverInventory = useMemo(() => normalizeInventory(inventory), [inventory]);
  const serverProgress = useMemo(() => normalizeHouseProgress(progress), [progress]);
  const [draft, setDraft] = useState(serverInventory);
  const [progressDraft, setProgressDraft] = useState(serverProgress);
  const inventoryDirty = useMemo(() => !inventoriesMatch(draft, serverInventory), [draft, serverInventory]);
  const progressDirty = useMemo(() => !progressMatches(progressDraft, serverProgress), [progressDraft, serverProgress]);
  const isDirty = inventoryDirty || progressDirty;

  useEffect(() => {
    const storedDraft = storageKey ? readStoredInventoryDraft(storageKey) : null;
    setDraft(storedDraft && !inventoriesMatch(storedDraft, serverInventory) ? storedDraft : serverInventory);
  }, [storageKey]);

  useEffect(() => {
    const storedDraft = progressStorageKey ? readStoredProgressDraft(progressStorageKey) : null;
    setProgressDraft(storedDraft && !progressMatches(storedDraft, serverProgress) ? storedDraft : serverProgress);
  }, [progressStorageKey]);

  useEffect(() => {
    if (!inventoryDirty) {
      setDraft(serverInventory);
    }
  }, [inventoryDirty, serverInventory]);

  useEffect(() => {
    if (!progressDirty) {
      setProgressDraft(serverProgress);
    }
  }, [progressDirty, serverProgress]);

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

    if (inventoryDirty) {
      window.sessionStorage.setItem(storageKey, JSON.stringify(draft));
    } else {
      window.sessionStorage.removeItem(storageKey);
    }
  }, [draft, inventoryDirty, storageKey]);

  useEffect(() => {
    if (!progressStorageKey) {
      return;
    }

    if (progressDirty) {
      window.sessionStorage.setItem(progressStorageKey, JSON.stringify(progressDraft));
    } else {
      window.sessionStorage.removeItem(progressStorageKey);
    }
  }, [progressDraft, progressDirty, progressStorageKey]);

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
    setProgressDraft((current) => ({
      ...current,
      narrativeAchievement: !current.narrativeAchievement,
    }));
  };

  const adjustHouseAchievement = (index, delta) => {
    setProgressDraft((current) => ({
      ...current,
      houseAchievements: current.houseAchievements.map((value, itemIndex) =>
        itemIndex === index ? clampCounter(value + delta, houseAchievementMarkMax) : value,
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

  const resetDraft = () => {
    if (isDirty && !window.confirm("저장하지 않은 가문 장부 변경사항을 되돌릴까요?")) {
      return;
    }

    setDraft(serverInventory);
    setProgressDraft(serverProgress);
    if (storageKey) {
      window.sessionStorage.removeItem(storageKey);
    }
    if (progressStorageKey) {
      window.sessionStorage.removeItem(progressStorageKey);
    }
  };

  const applyGameStartDefaults = () => {
    if (!window.confirm(gameStartDefaultsConfirmMessage)) {
      return;
    }

    setDraft(normalizeInventory(createDefaultInventory()));
    setProgressDraft(normalizeHouseProgress(createDefaultHouseProgress()));
    if (storageKey) {
      window.sessionStorage.removeItem(storageKey);
    }
    if (progressStorageKey) {
      window.sessionStorage.removeItem(progressStorageKey);
    }
  };

  const saveDraft = async () => {
    if (inventoryDirty) {
      const inventoryResult = await mutate({ action: "saveInventory", inventory: draft });

      if (!inventoryResult) {
        return;
      }
    }

    if (progressDirty) {
      const progressResult = await mutate({ action: "saveHouseProgress", progress: progressDraft });

      if (!progressResult) {
        return;
      }
    }

    if (storageKey) {
      window.sessionStorage.removeItem(storageKey);
    }
    if (progressStorageKey) {
      window.sessionStorage.removeItem(progressStorageKey);
    }
  };

  return (
    <section className="inventory-panel" aria-labelledby="inventory-title">
      <div className="inventory-header">
        <div>
          <p className="section-label">가문 기록</p>
          <h2 id="inventory-title">가문 장부</h2>
        </div>
        {isDirty ? <span className="dirty-pill">저장 필요</span> : <span className="saved-pill">저장 완료</span>}
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
          <div className="inventory-resource-grid">
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
              <OwnChoice agenda={ownChoice} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="inventory-section progress-section">
        <div className="achievement-progress-panel">
          <h3>업적</h3>
          <div className="achievement-ledger">
            <div className="achievement-primary-list">
              <button
                className={`achievement-toggle${progressDraft.narrativeAchievement ? " complete" : ""}`}
                type="button"
                aria-pressed={progressDraft.narrativeAchievement}
                onClick={toggleNarrativeAchievement}
                disabled={busy}
              >
                <span className="achievement-toggle-icon" aria-hidden="true">
                  <TokenIcon type="seal" />
                </span>
                <span>
                  <strong>서사 목표</strong>
                  <small>{progressDraft.narrativeAchievement ? "달성" : "미달성"}</small>
                </span>
              </button>
              <div className="achievement-track-list">
                {houseAchievementRows.map((row) => (
                  <AchievementProgressRow
                    key={row.id}
                    label={row.label}
                    value={progressDraft.houseAchievements[row.id] || 0}
                    max={houseAchievementMarkMax}
                    challengeComplete={progressDraft.houseAchievementComplete[row.id] === true}
                    disabled={busy}
                    onDecrease={() => adjustHouseAchievement(row.id, -1)}
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
        <span>{isDirty ? "변경사항은 아직 이 브라우저에만 저장되어 있습니다." : "의회 기록에 반영된 값입니다."}</span>
        <div>
          <button className="ghost-button" type="button" onClick={resetDraft} disabled={busy || !isDirty}>
            <TokenIcon type="undo" />
            초안 폐기
          </button>
          <button className="ghost-button" type="button" onClick={applyGameStartDefaults} disabled={busy}>
            <TokenIcon type="reset" />
            기본값
          </button>
          <button className="primary-button" type="button" onClick={saveDraft} disabled={busy || !isDirty}>
            <TokenIcon type="save" />
            {busy ? "저장 중" : "장부 저장"}
          </button>
        </div>
      </div>
    </section>
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

function AchievementProgressRow({
  label,
  value,
  max,
  disabled,
  onDecrease,
  onIncrease,
  challengeComplete = false,
  onToggleChallengeComplete,
}) {
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
          aria-label={`${label} 도전과제 ${challengeComplete ? "달성" : "미달성"}`}
          disabled={disabled}
          onClick={onToggleChallengeComplete}
        >
          <span className="achievement-challenge-icon" aria-hidden="true">
            <TokenIcon type="seal" />
          </span>
          <strong className="achievement-challenge-title">{label}</strong>
        </button>
      ) : (
        <span className="achievement-progress-label">{label}</span>
      )}
      <ProgressPips value={value} max={max} label={label} />
      <div className="counter-controls">
        <button
          className="stepper-button compact"
          type="button"
          aria-label={`${label} 표시 줄이기`}
          onClick={onDecrease}
          disabled={disabled || value <= 0}
        >
          <TokenIcon type="minus" />
        </button>
        <output aria-label={`${label} 표시 수`}>
          {value}/{max}
        </output>
        <button
          className="stepper-button compact"
          type="button"
          aria-label={`${label} 표시 늘리기`}
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
          <small>{challengeComplete ? "달성" : "미달성"}</small>
        </button>
      ) : null}
    </div>
  );
}

function AlignmentProgressRow({ alignment, value, max, disabled, onDecrease, onIncrease }) {
  return (
    <div className="alignment-progress-row">
      <span>
        <strong>{alignment.koreanLabel}</strong>
        <small>{alignment.label}</small>
      </span>
      <ProgressPips value={value} max={max} label={`${alignment.koreanLabel} 성향 업적`} />
      <div className="counter-controls">
        <button
          className="stepper-button compact"
          type="button"
          aria-label={`${alignment.koreanLabel} 성향 업적 표시 줄이기`}
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
          aria-label={`${alignment.koreanLabel} 성향 업적 표시 늘리기`}
          onClick={onIncrease}
          disabled={disabled || value >= max}
        >
          <TokenIcon type="plus" />
        </button>
      </div>
    </div>
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
  const houseAchievements = Array.isArray(candidate.houseAchievements) ? candidate.houseAchievements : [];
  const houseAchievementComplete = Array.isArray(candidate.houseAchievementComplete)
    ? candidate.houseAchievementComplete
    : [];

  return {
    openAgendaTokens: {
      positive: normalizeOpenAgendaTokens(openAgendaTokens.positive),
      negative: normalizeOpenAgendaTokens(openAgendaTokens.negative),
    },
    narrativeAchievement: candidate.narrativeAchievement === true,
    houseAchievements: houseAchievementRows.map((row) =>
      normalizeCounter(houseAchievements[row.id], houseAchievementMarkMax, defaults.houseAchievements[row.id]),
    ),
    houseAchievementComplete: houseAchievementRows.map((row) =>
      houseAchievementComplete[row.id] === true,
    ),
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
    houseAchievements: houseAchievementRows.map(() => 0),
    houseAchievementComplete: houseAchievementRows.map(() => false),
    alignmentAchievements: Object.fromEntries(houseAlignmentRows.map((alignment) => [alignment.agendaId, 0])),
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
  return inventoryCounters.every((counter) => left[counter.id] === right[counter.id]);
}

function progressMatches(left, right) {
  return (
    left.narrativeAchievement === right.narrativeAchievement &&
    arraysMatch(left.openAgendaTokens.positive, right.openAgendaTokens.positive) &&
    arraysMatch(left.openAgendaTokens.negative, right.openAgendaTokens.negative) &&
    arraysMatch(left.houseAchievements, right.houseAchievements) &&
    arraysMatch(left.houseAchievementComplete, right.houseAchievementComplete) &&
    houseAlignmentRows.every(
      (alignment) => left.alignmentAchievements[alignment.agendaId] === right.alignmentAchievements[alignment.agendaId],
    )
  );
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

function readStoredInventoryDraft(storageKey) {
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    return raw ? normalizeInventory(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function readStoredProgressDraft(storageKey) {
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    return raw ? normalizeHouseProgress(JSON.parse(raw)) : null;
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
      <span className="choice-seal" aria-hidden="true">
        <TokenIcon type="seal" />
      </span>
      <div>
        <h3>
          <AgendaTitle agenda={agenda} />
        </h3>
        <AgendaScoringBoard agenda={agenda} />
      </div>
    </div>
  );
}

function ActionPanel({ state, busy, mutate }) {
  if (!state.canDiscard) {
    return null;
  }

  return (
    <div className="action-card">
      <div>
        <p className="section-label">봉인 의제 폐기</p>
        <h3>봉인 의제 1장을 폐기하고 시작</h3>
        <p>폐기된 의제는 공개하지 않습니다.</p>
      </div>
      <button className="primary-button" type="button" onClick={() => mutate({ action: "discard" })} disabled={busy}>
        <TokenIcon type="flame" />
        의제 폐기
      </button>
    </div>
  );
}

function AgendaList({ agendas, busy, mutate }) {
  const [expanded, setExpanded] = useState(false);

  if (!agendas.length) {
    return null;
  }

  return (
    <section className="agenda-section" aria-labelledby="agenda-title">
      <div className="agenda-section-heading">
        <div>
          <p className="section-label">드래프트</p>
          <h2 id="agenda-title">선택 가능한 비밀 의제</h2>
        </div>
        <span>{agendas.length}장 남음</span>
      </div>
      <div className="agenda-list" id="agenda-list">
        {agendas.map((agenda) => (
          <AgendaCard key={agenda.id} agenda={agenda} busy={busy} expanded={expanded} mutate={mutate} />
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
          {expanded ? "전체 접기" : "전체 펼치기"}
        </button>
      </div>
    </section>
  );
}

function AgendaCard({ agenda, busy, expanded, mutate }) {
  const detailId = `agenda-detail-${agenda.id}`;
  const choose = () => {
    const confirmed = window.confirm("이 비밀 의제를 채택할까요? 채택 후에는 되돌릴 수 없습니다.");

    if (confirmed) {
      mutate({ action: "choose", agendaId: agenda.id });
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
            <p className="section-label">비밀 의제</p>
            <button className="primary-button" type="button" onClick={choose} disabled={busy}>
              <TokenIcon type="key" />
              채택
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
          label: `${item.rank}위`,
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
      <div className="agenda-zone-cells" aria-label="공용 보드 줄">
        {boardRows.map((row) => {
          const active = isActiveRow(row);
          const showLabel = active || row === 1 || row === 5 || row === 9 || row === 13 || row === 17;

          return (
            <span
              className={`agenda-zone-cell${row === 9 ? " center" : ""}${active ? " active" : ""}`}
              key={row}
              aria-label={`${row}번 줄${active ? " 점수 구간" : ""}`}
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

          return (
            <div
              className={`agenda-score-segment${item.vp > 0 ? " scoring" : ""}${isBest ? " best" : ""}`}
              key={`${title}-${item.label}`}
              style={{ "--score-fill": `${Math.round(intensity * 100)}%` }}
              aria-label={`${item.label}: ${item.vp}점`}
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

function TokenIcon({ type }) {
  const Icon = {
    balance: BalanceOutlinedIcon,
    coin: PaidOutlinedIcon,
    crown: EmojiEventsOutlinedIcon,
    crave: LocalFireDepartmentOutlinedIcon,
    exit: LogoutOutlinedIcon,
    external: OpenInNewOutlinedIcon,
    flame: LocalFireDepartmentOutlinedIcon,
    gear: MenuOutlinedIcon,
    house: HomeWorkOutlinedIcon,
    influence: VisibilityOutlinedIcon,
    key: VpnKeyOutlinedIcon,
    knowledge: MenuBookOutlinedIcon,
    menu: MenuOutlinedIcon,
    minus: RemoveOutlinedIcon,
    morale: MilitaryTechOutlinedIcon,
    plus: AddOutlinedIcon,
    power: ShieldOutlinedIcon,
    prestige: EmojiEventsOutlinedIcon,
    refresh: RefreshOutlinedIcon,
    reset: RestartAltOutlinedIcon,
    save: SaveOutlinedIcon,
    scroll: ArticleOutlinedIcon,
    seal: WorkspacePremiumOutlinedIcon,
    sheet: TableChartOutlinedIcon,
    soundOff: VolumeOffOutlinedIcon,
    soundOn: VolumeUpOutlinedIcon,
    turn: AutorenewOutlinedIcon,
    undo: UndoOutlinedIcon,
    warning: WarningAmberOutlinedIcon,
    wealth: PaidOutlinedIcon,
    welfare: FavoriteBorderOutlinedIcon,
  }[type] || AddOutlinedIcon;

  return <Icon aria-hidden="true" focusable="false" />;
}

function HouseIcon({ motif }) {
  const Icon = {
    boar: PetsOutlinedIcon,
    keys: KeyOutlinedIcon,
    lobster: AnchorOutlinedIcon,
    porcupine: PestControlRodentOutlinedIcon,
    rooster: AgricultureOutlinedIcon,
    rose: LocalFloristOutlinedIcon,
    ship: SailingOutlinedIcon,
    skull: CoronavirusOutlinedIcon,
    snake: ScienceOutlinedIcon,
    sword: MilitaryTechOutlinedIcon,
    tree: ForestOutlinedIcon,
    turtle: CrueltyFreeOutlinedIcon,
  }[motif] || CastleOutlinedIcon;

  return <Icon aria-hidden="true" focusable="false" />;
}

createRoot(document.querySelector("#root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
