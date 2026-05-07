import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import AgricultureOutlinedIcon from "@mui/icons-material/AgricultureOutlined";
import AnchorOutlinedIcon from "@mui/icons-material/AnchorOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import AutorenewOutlinedIcon from "@mui/icons-material/AutorenewOutlined";
import BalanceOutlinedIcon from "@mui/icons-material/BalanceOutlined";
import CastleOutlinedIcon from "@mui/icons-material/CastleOutlined";
import CoronavirusOutlinedIcon from "@mui/icons-material/CoronavirusOutlined";
import CrueltyFreeOutlinedIcon from "@mui/icons-material/CrueltyFreeOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import ForestOutlinedIcon from "@mui/icons-material/ForestOutlined";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
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
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import RemoveOutlinedIcon from "@mui/icons-material/RemoveOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
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
  complete: "게임이 끝나면 최종 점수를 확인하고 설정 메뉴에서 이번 회기를 마감합니다.",
};

const defaultNamePattern = /^player\s*[1-5]$/i;
const gameStartDefaultsConfirmMessage =
  "장부를 게임 시작 기본값(토큰·승리 점수·공개 의제·업적)으로 맞출까요?";
const sessionEndUnavailableMessage = "비밀 의제 배정이 끝난 뒤 회기를 종료할 수 있습니다.";
const sessionEndChecklistItems = [
  { id: "inventories", label: "모든 가문 장부가 자동 저장됨" },
  { id: "scores", label: "최종 점수와 명망/갈망 반영을 확인함" },
  { id: "progress", label: "공개 의제와 업적/성향 업적 표시를 확인함" },
  { id: "board", label: "공용 보드와 물리/외부 저장 정리를 완료함" },
];
const ledgerAutosaveDelayMs = 500;
const ledgerAutosaveRetryDelayMs = 1800;
const sharedBoardSheetUrl =
  "https://docs.google.com/spreadsheets/d/1hJw0gYAeIafIFUJOBTDaC_2QR87CXyXABrOKvu3QG2M/edit?usp=sharing";
const rulebookPdfUrl = "/king_dilemma_rulebook.pdf";
const specialAbilityLegendImageUrl = "/rulebook-special-ability-legend.png";
const specialAbilityIconUrls = {
  instant: "/rulebook-special-ability-instant.png",
  start: "/rulebook-special-ability-start.png",
  condition: "/rulebook-special-ability-condition.png",
  charges: "/rulebook-special-ability-charges.png",
  prestige: "/rulebook-special-ability-prestige.png",
  crave: "/rulebook-special-ability-crave.png",
  coin: "/rulebook-special-ability-coin.png",
  power: "/rulebook-special-ability-power.png",
  harmony: "/rulebook-special-ability-harmony.png",
  discord: "/rulebook-special-ability-discord.png",
};
const bgmSource = "/Morrowind.mp3";
const bgmMutedStorageKey = "kd-bgm-muted";
const bgmVolumeStorageKey = "kd-bgm-volume";
const defaultBgmVolume = 0.34;
const dilemmaPhotoLimit = 3;
const dilemmaPhotoMaxInputBytes = 8 * 1024 * 1024;
const dilemmaPhotoMaxDataUrlLength = 1_200_000;
const dilemmaPhotoMaxDimension = 1280;
const dilemmaPhotoQuality = 0.78;
const dilemmaPhotoAllowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const dilemmaOutcomeLabels = {
  "": "미정",
  aye: "찬성",
  nay: "반대",
};
const dilemmaResourceDeltaLimit = 9;
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
const alignmentRewardTypes = [
  { id: "prestige", label: "명망", icon: "prestige", tone: "prestige" },
  { id: "crave", label: "갈망", icon: "crave", tone: "crave" },
];
const alignmentRewardTypeLabels = Object.fromEntries(alignmentRewardTypes.map((reward) => [reward.id, reward.label]));
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
const achievementDetailTextMaxLength = 300;
const houseAlignmentMarkMax = 4;
const specialAbilityLegendRows = [
  {
    id: "instant",
    icon: "instant",
    label: "즉시",
    timing: "도전과제를 달성했거나 이야기 카드가 보드에 배치되었을 때",
    effect: "즉시 활성화합니다.",
  },
  {
    id: "start",
    icon: "start",
    label: "각 게임 시작",
    timing: "각 게임 시작 시",
    effect: "이야기 카드 더미 맨 위에 놓이지 않은 이야기 카드 능력은 무시합니다.",
  },
  {
    id: "condition",
    icon: "condition",
    label: "조건/종료",
    timing: "게임 중 특정 조건을 만족했거나 게임이 종료될 때",
    effect: "조건이 맞으면 활성화합니다. 맨 위에 없는 이야기 카드 능력은 무시합니다.",
  },
  {
    id: "charges",
    icon: "charges",
    label: "칸 표시",
    timing: "표시할 수 있는 칸이 있는 이야기 카드 능력",
    effect: "사용하거나 효과가 발휘될 때마다 칸 1개를 색칠하고, 모든 칸이 표시되면 더 이상 사용할 수 없습니다.",
  },
  {
    id: "prestige-crave",
    icon: "prestigeCrave",
    label: "명망/갈망",
    timing: "+X 명망 또는 갈망",
    effect: "표시된 수치만큼 해당 점수를 얻습니다. 이야기 카드라면 서명인만 받습니다.",
  },
  {
    id: "coins",
    icon: "coins",
    label: "코인",
    timing: "+X 코인",
    effect: "공용 저장소에서 표시된 수만큼 코인을 가져와 개인 저장소에 더합니다.",
  },
  {
    id: "power",
    icon: "power",
    label: "권력",
    timing: "+X 권력 토큰",
    effect: "공용 저장소에서 표시된 수만큼 권력 토큰을 가져와 개인 저장소에 더합니다.",
  },
  {
    id: "finale",
    icon: "finale",
    label: "화합/불화",
    timing: "결말 카드 전용",
    effect: "표시된 화합/불화 값은 캠페인의 대단원 때 영향을 줍니다.",
  },
];
const achievementEffectAmountMax = 99;
const achievementEffectOptions = [
  { id: "", label: "없음", icon: "seal", memo: "효과 아이콘 없음" },
  { id: "instant", label: "즉시", legendIcon: "instant", memo: "달성 시 즉시 처리" },
  { id: "start", label: "각 게임 시작", legendIcon: "start", memo: "각 게임 시작 시 처리" },
  { id: "condition", label: "조건/종료", legendIcon: "condition", memo: "조건 충족 또는 종료 시 처리" },
  { id: "charges", label: "칸 표시", legendIcon: "charges", memo: "사용할 때마다 칸 표시" },
  { id: "prestige", label: "명망", icon: "prestige", memo: "달성 시 명망 반영", amount: true },
  { id: "crave", label: "갈망", icon: "crave", memo: "달성 시 갈망 반영", amount: true },
  { id: "coins", label: "코인", legendIcon: "coins", memo: "달성 시 코인 반영", amount: true },
  { id: "power", label: "권력", legendIcon: "power", memo: "달성 시 권력 토큰 반영", amount: true },
  { id: "finale", label: "화합/불화", legendIcon: "finale", memo: "대단원 점수 반영", amount: true },
];
const achievementEffectOptionById = Object.fromEntries(achievementEffectOptions.map((option) => [option.id, option]));
const achievementEffectAmountOptionIds = new Set(
  achievementEffectOptions.filter((option) => option.amount).map((option) => option.id),
);
const alignmentRewardCountMax = 3;
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
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const [bgmMuted, setBgmMuted] = useState(readStoredBgmMuted);
  const [bgmVolume, setBgmVolume] = useState(readStoredBgmVolume);
  const refreshInFlight = useRef(null);
  const mutationInFlight = useRef(false);
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
          setRealtimeEnabled(Boolean(result.realtimeEnabled));
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
        setRealtimeEnabled((wasRealtimeEnabled) =>
          typeof result.realtimeEnabled === "boolean" ? result.realtimeEnabled : wasRealtimeEnabled,
        );

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
    if (
      !realtimeEnabled ||
      !authenticated ||
      sessionStatus === "checking" ||
      sessionEndDialogOpen
    ) {
      return undefined;
    }

    const refreshIfVisible = () => {
      if (document.visibilityState !== "visible" || mutationInFlight.current || refreshInFlight.current) {
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
    async (voteOrder) => await mutate({ action: "saveDilemmaVoteOrder", voteOrder }),
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
  const canEditVoteOrder = Boolean(authenticated && state && getVoteOrderHouses(state).length === REQUIRED_HOUSE_COUNT && !voteOrderLocked);
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
          ref={tipsToggleRef}
          className="settings-toggle"
          type="button"
          aria-controls="tips-menu"
          aria-expanded={tipsOpen}
          aria-label="팁 메뉴"
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
        <button
          ref={toggleRef}
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
      {tipsOpen ? (
        <div className="settings-menu tips-menu" id="tips-menu">
          <button className="ghost-button wide" type="button" onClick={onOpenScoreGuide}>
            <TokenIcon type="balance" />
            점수 산정방식
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
              <label htmlFor="bgm-volume">BGM 볼륨</label>
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
              <small>{randomDiscardEnabled ? "ON" : "OFF"}</small>
            </span>
            <span className="settings-state-segment" aria-hidden="true">
              <span className={randomDiscardEnabled ? "active" : ""}>ON</span>
              <span className={!randomDiscardEnabled ? "active" : ""}>OFF</span>
            </span>
          </button>
          <a className="settings-link" href={sharedBoardSheetUrl} target="_blank" rel="noreferrer">
            <TokenIcon type="sheet" />
            공용 보드 시트
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
                    ? "딜레마 투표가 진행 중일 때는 순서를 바꿀 수 없습니다."
                    : canEditVoteOrder
                      ? "딜레마 투표 순서를 미리 지정합니다."
                      : "참여 가문 5개가 정해진 뒤 설정할 수 있습니다."
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

function VoteOrderDialog({ busy, open, state, onClose, onSave, restoreFocusRef }) {
  const dialogRef = useRef(null);
  const houses = useMemo(() => getVoteOrderHouses(state), [state]);
  const initialOrder = useMemo(() => houses.map((house) => house.id), [houses]);
  const [draftOrder, setDraftOrder] = useState(initialOrder);
  const [saveStatus, setSaveStatus] = useState("");
  const locked = Boolean(state && isVoteOrderSettingLocked(state));
  const canSave = !busy && !locked && draftOrder.length === REQUIRED_HOUSE_COUNT;
  const houseById = useMemo(() => new Map(houses.map((house) => [house.id, house])), [houses]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (open) {
      setDraftOrder(initialOrder);
      setSaveStatus("");
    }
  }, [initialOrder, open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.setTimeout(() => {
        restoreFocusRef?.current?.focus();
      }, 0);
    };
  }, [onClose, open, restoreFocusRef]);

  if (!open) {
    return null;
  }

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id || locked) {
      return;
    }

    setDraftOrder((current) => {
      const oldIndex = current.indexOf(active.id);
      const newIndex = current.indexOf(over.id);

      if (oldIndex < 0 || newIndex < 0) {
        return current;
      }

      return arrayMove(current, oldIndex, newIndex);
    });
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!canSave) {
      return;
    }

    setSaveStatus("");
    const result = await onSave(draftOrder);

    if (result) {
      setSaveStatus("투표 순서를 저장했습니다.");
      onClose();
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
              룰북의 투표는 리더 토큰 보유자부터 시계 방향으로 진행됩니다. 이 앱은 실제 좌석과 리더 토큰 이동을
              추적하지 않으므로, 여기서 이번 투표의 순서를 직접 지정합니다.
            </p>
            <p>딜레마 투표가 시작되면 순서를 바꿀 수 없습니다. 새 딜레마를 등록하기 전에 미리 저장하세요.</p>
          </div>
          {locked ? (
            <p className="vote-order-warning" role="status">
              현재 딜레마 투표가 진행 중이라 순서를 수정할 수 없습니다.
            </p>
          ) : null}
          {draftOrder.length === REQUIRED_HOUSE_COUNT ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={draftOrder} strategy={verticalListSortingStrategy}>
                <ol className="vote-order-list" aria-label="투표 순서">
                  {draftOrder.map((houseId, index) => (
                    <SortableVoteOrderItem
                      disabled={busy || locked}
                      house={houseById.get(houseId)}
                      id={houseId}
                      index={index}
                      key={houseId}
                    />
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
          ) : (
            <p className="vote-order-warning">참여 가문 5개가 정해진 뒤 순서를 설정할 수 있습니다.</p>
          )}
          {saveStatus ? <p className="vote-order-status">{saveStatus}</p> : null}
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

function SortableVoteOrderItem({ disabled, house, id, index }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const houseName = getHouseKoreanName(house);
  const displayName = house?.hasCustomName && house.name ? house.name : houseName;

  return (
    <li
      ref={setNodeRef}
      className={`vote-order-item${isDragging ? " dragging" : ""}${disabled ? " disabled" : ""}`}
      style={style}
    >
      <span className="vote-order-rank">{index + 1}</span>
      <span className="vote-order-house">
        <strong>{displayName}</strong>
        <small>{houseName}</small>
      </span>
      <button
        className="vote-order-handle"
        type="button"
        disabled={disabled}
        aria-label={`${displayName} 순서 이동`}
        {...attributes}
        {...listeners}
      >
        <TokenIcon type="menu" />
      </button>
    </li>
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
          비밀 의제 카드는 게임 종료 시 가장 큰 승점 원천입니다. 카드의 자원 목표 점수와 재화 순위 점수(룰북의
          자금/코인 순위 목표)를 각각 계산한 뒤 더해서 비밀 의제 점수로 기록합니다.
        </p>
        <div className="score-guide-formula" aria-label="비밀 의제 점수 공식">
          <span className="score-guide-formula-item">자원 목표 점수</span>
          <span className="score-guide-formula-operator">+</span>
          <span className="score-guide-formula-item">재화 순위 점수</span>
          <strong>= 비밀 의제 점수</strong>
        </div>
        <div className="score-guide-sections">
          <section className="score-guide-section">
            <h3>1. 자원 목표 점수</h3>
            <ul>
              <li>게임이 끝난 순간 공용 보드의 5개 자원 마커 최종 위치를 봅니다.</li>
              <li>자신의 비밀 의제 카드에 표시된 자원 목표 도표에 그 위치들을 대입합니다.</li>
              <li>도표가 요구하는 구역 안에 들어간 자원 마커 수에 따라 카드에 적힌 승점을 받습니다.</li>
            </ul>
          </section>
          <section className="score-guide-section">
            <h3>2. 재화 순위 점수</h3>
            <ul>
              <li>각 가문이 게임 종료 시 가문 스크린 뒤에 남긴 재화 수를 비교합니다.</li>
              <li>비밀 의제 카드 하단의 자금/코인 순위 표에서 1위, 2위, 3위에 해당하는 점수를 받습니다.</li>
              <li>카드마다 재화 순위 점수가 다르므로, 같은 순위라도 비밀 의제에 따라 받는 점수가 달라집니다.</li>
              <li>1위부터 3위 안에 들지 못하면 카드에 표시된 재화 순위 점수가 없으므로 0점으로 처리합니다.</li>
            </ul>
          </section>
          <section className="score-guide-section">
            <h3>3. 동률 처리</h3>
            <ul>
              <li>재화 수가 같으면 동률인 모든 가문이 같은 순위를 공유합니다.</li>
              <li>동률인 가문들은 각자 자기 비밀 의제 카드의 해당 순위 점수를 받습니다.</li>
              <li>자원 위치 동률도 룰북의 일반 동률 규칙처럼 묶인 자원이 같은 위치를 공유합니다.</li>
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
      <DilemmaTextPreview label="해결" value={entry.resolutionNotes} />
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
            <h2 id="score-guide-title">점수 산정방식</h2>
          </div>
        </div>
        <p className="score-guide-copy" id="score-guide-copy">
          왕이 사망하거나 안정도 트랙 끝에서 퇴위해 한 게임이 끝났을 때 계산합니다. 중간 저장으로 세션만 멈춘
          경우에는 점수를 산정하지 않습니다.
        </p>
        <div className="score-guide-formula" aria-label="최종 승점 공식">
          <span className="score-guide-formula-item">비밀 의제: 자원 목표 + 재화 순위</span>
          <span className="score-guide-formula-operator">+</span>
          <span className="score-guide-formula-item">공개 의제</span>
          <span className="score-guide-formula-operator">+</span>
          <span className="score-guide-formula-item">권력 보너스</span>
          <strong>= 합계</strong>
        </div>
        <div className="score-guide-sections">
          <section className="score-guide-section">
            <h3>1. 승점 합산</h3>
            <ul>
              <li>비밀 의제: 자원 목표 점수와 재화 순위 점수를 더해 산정합니다.</li>
              <li>자원 목표: 공용 보드 최종 자원 위치를 비밀 의제 카드의 자원 조건에 대입합니다.</li>
              <li>재화 순위: 남은 재화가 1위, 2위, 3위인지에 따라 비밀 의제 카드 하단의 순위 점수를 받습니다.</li>
              <li>긍정 공개 의제: 해당 자원이 가장 높으면 +3, 두 번째로 높으면 +1입니다.</li>
              <li>부정 공개 의제: 해당 자원이 가장 낮으면 -3, 두 번째로 낮으면 -1입니다.</li>
              <li>권력 보너스: 남은 권력 최다 가문은 +2, 2위 가문은 +1입니다.</li>
            </ul>
          </section>
          <section className="score-guide-section">
            <h3>2. 비밀 의제 점수</h3>
            <ul>
              <li>각 비밀 의제 카드는 자원 목표와 재화 순위 목표 두 가지 점수 조건을 가집니다.</li>
              <li>자원 목표는 게임 종료 시 공용 보드의 자원 마커 위치를 카드의 자원 구간/도표에 대입해 계산합니다.</li>
              <li>
                재화 순위 목표는 남은 재화가 다른 가문과 비교해 몇 위인지 보고 카드 하단의 1위, 2위, 3위 점수를
                받습니다.
              </li>
              <li>재화 순위가 동률이면 동률인 모든 가문이 같은 순위 점수를 받습니다.</li>
            </ul>
          </section>
          <section className="score-guide-section">
            <h3>3. 순위와 동률</h3>
            <ul>
              <li>자원 위치나 재화/권력 수량이 동률이면 묶인 대상이 같은 순위 보너스 또는 페널티를 받습니다.</li>
              <li>승점 합계가 가장 높은 가문이 이번 게임의 승자입니다. 승점 동률이면 승리는 공유됩니다.</li>
              <li>마지막 등수는 항상 존재합니다. 5인 게임에서 4위 동률 뒤에 아무도 없으면 둘 다 Last로 봅니다.</li>
            </ul>
          </section>
          <section className="score-guide-section">
            <h3>4. 명망/갈망 기록</h3>
            <p>
              이 앱은 승점 합계와 순위까지만 자동 계산합니다. 명망/갈망은 승점 순위와 종료 조건을 아래 룰북 표에
              대입해 각 가문 장부에 직접 반영합니다.
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
                    <th scope="row">상단 퇴위</th>
                    <td>명망 3</td>
                    <td>명망 2</td>
                    <td>명망 1</td>
                    <td>명망 1</td>
                    <td>갈망 2</td>
                  </tr>
                  <tr>
                    <th scope="row">하단 퇴위</th>
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
            이번 회의에 참여할 5개 가문을 고릅니다. 명망이 낮은 가문부터, 동률이면 가문 번호가 높은 순서로 비밀 의제를 선택합니다.
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

function GamePanel({ state, busy, mutate, onOpenSecretAgendaGuide }) {
  const currentHouseName = getHouseDisplayName(state, state.currentHouseId);
  const activeTurnId = state.dilemmaVoteTurn || state.turn;
  const draftTurnName = activeTurnId ? getHouseDisplayName(state, activeTurnId) : "시작 전";
  const currentHouse = getCurrentHouse(state);
  const currentHouseChosenName =
    currentHouse?.hasCustomName && typeof currentHouse.name === "string"
      ? currentHouse.name.trim()
      : "";
  const availableAgendas = state.availableAgendas || [];
  const showAgendaList = state.phase !== "complete" && availableAgendas.length > 0;
  const discardSelectionMode = Boolean(state.canDiscard && !state.randomDiscardEnabled);
  const hasCouncilContext = state.canDiscard;
  const councilStageLabel = getCouncilStageLabel(state);
  const councilStageCopy = getCouncilStageCopy(state);
  const councilProcedureTitle = getCouncilProcedureTitle(state);
  const handleSaveAlignmentReward = useCallback(
    (agendaId, reward) => mutate({ action: "saveAlignmentReward", agendaId, reward }),
    [mutate],
  );

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
              <h2>{councilStageLabel}</h2>
            </div>
          </div>
          <p>{councilStageCopy}</p>
        </div>
        <HouseProfileCard
          busy={busy}
          house={currentHouse}
          progress={state.ownHouseProgress}
          onSaveAlignmentReward={handleSaveAlignmentReward}
        />
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
          <StatusItem icon="turn" label="차례" value={draftTurnName} splitParenthetical />
          <StatusItem icon="scroll" label="현재 단계" value={councilStageLabel} />
          <StatusItem
            icon="seal"
            label={state.phase === "house-select" ? "가문 선택" : state.phase === "complete" ? "의제 배정" : "의제 선택"}
            value={
              state.phase === "house-select"
                ? `${state.claimedHouseCount} / ${state.requiredHouseCount}`
                : state.phase === "complete"
                  ? "완료"
                : `${state.selectedCount} / ${state.draftOrder.length || REQUIRED_HOUSE_COUNT}`
            }
          />
        </div>
        <TurnTrack houses={state.houses} draftOrder={state.draftOrder} turn={state.turn} phase={state.phase} />
        <p className="privacy-note">남은 의제는 자기 차례가 오기 전까지 봉인됩니다.</p>
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
            onOpenSecretAgendaGuide={onOpenSecretAgendaGuide}
          />
        ) : null}
        <PersonalInventoryPanel
          inventory={state.ownInventory}
          progress={state.ownHouseProgress}
          ownChoice={state.ownChoice}
          dilemma={state.phase === "complete" ? state.dilemma : null}
          dilemmaHistory={state.dilemmaHistory || []}
          houses={state.houses || []}
          houseId={state.currentHouseId}
          busy={busy}
          mutate={mutate}
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
  const customName = house?.hasCustomName && typeof house.name === "string" ? house.name.trim() : "";

  if (!customName || customName === houseName || customName === house?.koreanTitle || customName === house?.title) {
    return houseName;
  }

  return `${houseName} (${customName})`;
}

function getCouncilStageLabel(state) {
  if (state.phase === "complete" && !isDilemmaBlank(state.dilemma)) {
    const dilemma = normalizeDilemmaRecord(state.dilemma);

    return dilemma.selectedOutcome ? "투표 적용 완료" : "투표 진행 중";
  }

  return phaseLabels[state.phase] || state.phase;
}

function getCouncilStageCopy(state) {
  if (state.phase === "complete" && !isDilemmaBlank(state.dilemma)) {
    const dilemma = normalizeDilemmaRecord(state.dilemma);
    const voteTurnName = getDilemmaVoteTurnName(state);

    return dilemma.selectedOutcome
      ? "딜레마 투표 결과가 적용되었습니다. 후속 처리를 기록하고 게시하세요."
      : voteTurnName
        ? `${voteTurnName} 가문의 투표 차례입니다.`
        : "모든 가문이 투표했습니다. 결과를 적용하세요.";
  }

  return phaseCopy[state.phase] || "의회 기록을 갱신하고 있습니다.";
}

function getCouncilProcedureTitle(state) {
  if (state.phase === "complete" && !isDilemmaBlank(state.dilemma)) {
    const dilemma = normalizeDilemmaRecord(state.dilemma);

    return dilemma.selectedOutcome ? "딜레마 결과" : "딜레마 투표";
  }

  if (state.phase === "complete") {
    return "회기 정리";
  }

  if (state.phase === "discard") {
    return "폐기 의식";
  }

  if (state.phase === "choose") {
    return "비밀 의제 선택";
  }

  return "의회 준비";
}

function getDilemmaVoteTurnName(state) {
  return state.dilemmaVoteTurn ? getHouseDisplayName(state, state.dilemmaVoteTurn) : "";
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
  if (Array.isArray(state?.dilemmaVoteOrder) && state.dilemmaVoteOrder.length) {
    const housesById = new Map(getHouses(state).map((house) => [house.id, house]));
    return state.dilemmaVoteOrder
      .map((houseId) => housesById.get(houseId) || HOUSE_CATALOG.find((house) => house.id === houseId))
      .filter(Boolean)
      .slice(0, REQUIRED_HOUSE_COUNT);
  }

  return getVoteOrderHouses(state);
}

function getVoteOrderHouses(state) {
  if (!state) {
    return [];
  }

  const candidateState = state || {};
  const houses = getHouses(state);
  const housesById = new Map(houses.map((house) => [house.id, house]));
  const orderedIds =
    Array.isArray(candidateState.dilemmaVoteOrder) && candidateState.dilemmaVoteOrder.length
      ? candidateState.dilemmaVoteOrder
      : Array.isArray(candidateState.draftOrder) && candidateState.draftOrder.length
        ? candidateState.draftOrder
      : houses.filter((house) => house.hasPassword).map((house) => house.id);

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

function HouseProfileCard({ busy, house, progress, onSaveAlignmentReward }) {
  const normalizedProgress = useMemo(() => normalizeHouseProgress(progress), [progress]);

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
          <HouseProfileField label="서사 목표" value={house.goal} />
          <HouseProfileField label="선호 의제" value={getAlignmentKoreanLabels(house.alignments).join(" / ")} />
        </div>
        <HouseAlignmentTrack
          alignments={house.alignments || []}
          busy={busy}
          progress={normalizedProgress}
          onSaveAlignmentReward={onSaveAlignmentReward}
        />
      </div>
    </section>
  );
}

function HouseAlignmentTrack({ alignments, busy, progress, onSaveAlignmentReward }) {
  const favoriteAlignments = new Set(alignments);

  return (
    <div className="house-alignment-track" aria-label="비밀 의제 성향별 달성 보상">
      {houseAlignmentRows.map((alignment) => {
        const preferred = favoriteAlignments.has(alignment.id);

        return (
          <HouseAlignmentRewardRow
            alignment={alignment}
            busy={busy}
            key={alignment.id}
            preferred={preferred}
            reward={progress?.alignmentRewards?.[alignment.agendaId]}
            onSaveAlignmentReward={onSaveAlignmentReward}
          />
        );
      })}
    </div>
  );
}

function HouseAlignmentRewardRow({ alignment, busy, preferred, reward, onSaveAlignmentReward }) {
  return (
    <div className={`house-alignment-row${preferred ? " preferred" : ""}`}>
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
        ? `${remaining}개 가문이 더 선택되면 명망이 낮은 가문부터 비밀 의제 드래프트를 시작합니다. 동률이면 가문 번호가 높은 순서입니다.`
        : "의석이 모두 찼습니다. 첫 가문이 폐기 의식을 시작합니다.";
    }

    if (state.phase === "complete") {
      if (!isDilemmaBlank(state.dilemma)) {
        const dilemma = normalizeDilemmaRecord(state.dilemma);
        const voteTurnName = getDilemmaVoteTurnName(state);

        if (dilemma.selectedOutcome) {
          return `${dilemmaOutcomeLabels[dilemma.selectedOutcome]} 결과가 적용되었습니다. 딜레마 후속 처리를 기록하세요.`;
        }

        if (state.canVoteDilemma) {
          return "내 투표 차례입니다. 찬성, 반대, 기권 중 하나를 선택하세요.";
        }

        return voteTurnName
          ? `${voteTurnName} 가문의 투표 차례입니다.`
          : "모든 가문이 투표했습니다. 결과를 적용하세요.";
      }

      return "비밀 의제 배정 완료. 게임 종료 후 명망과 갈망까지 저장한 뒤 이번 회기를 마감하세요.";
    }

    if (state.canDiscard) {
      return state.randomDiscardEnabled
        ? `${getHouseDisplayName(state, state.currentHouseId)} 차례입니다. 봉인된 6장 중 1장을 무작위로 폐기하고 남은 의제를 펼칩니다.`
        : `${getHouseDisplayName(state, state.currentHouseId)} 차례입니다. 봉인된 6장 중 폐기할 의제 1장을 직접 고르세요.`;
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
  const allVoted =
    participants.length === REQUIRED_HOUSE_COUNT && participants.every((house) => Boolean(votes[house.id]?.side));
  const voteTurnName = getDilemmaVoteTurnName(state);
  const votingComplete = !selectedOutcome && !state.dilemmaVoteTurn && allVoted;
  const ayePower = sumDilemmaVotes(votes, participants, "aye");
  const nayPower = sumDilemmaVotes(votes, participants, "nay");
  const passCount = participants.filter((house) => votes[house.id]?.side === "pass").length;
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
    setStatusText(result ? "투표 결과를 적용했습니다." : "투표 결과를 적용하지 못했습니다.");
  };

  return (
    <div className={`dilemma-vote-panel${selectedOutcome ? " applied" : ""}`}>
      <div className="dilemma-vote-summary">
        <span>{selectedOutcome ? `${dilemmaOutcomeLabels[selectedOutcome]} 적용됨` : votingComplete ? "투표 완료" : "투표 진행"}</span>
        <strong>
          {selectedOutcome
            ? `찬성 ${ayePower} · 반대 ${nayPower} · 기권 ${passCount}`
            : votingComplete
              ? "모든 가문이 투표했습니다."
              : voteTurnName
                ? `${voteTurnName} 차례`
                : `${votedCount}/${REQUIRED_HOUSE_COUNT} 투표`}
        </strong>
      </div>
      {!selectedOutcome && !state.canVoteDilemma && !votingComplete ? (
        <p className="dilemma-vote-turn-note">내 차례가 오면 투표 선택지가 표시됩니다.</p>
      ) : null}
      {!selectedOutcome && state.canVoteDilemma ? (
        <>
          <div className="dilemma-vote-options" role="group" aria-label="딜레마 투표 선택">
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
      {votingComplete ? <p className="dilemma-vote-turn-note">찬성/반대 권력 합계를 확인하고 결과를 적용하세요.</p> : null}
      {!selectedOutcome && (state.canVoteDilemma || votingComplete) ? (
        <div className="dilemma-vote-actions">
          {state.canVoteDilemma ? (
            <button className="secondary-button compact" type="button" onClick={saveVote} disabled={!canSaveVote}>
              투표 저장
            </button>
          ) : null}
          {votingComplete ? (
            <button className="primary-button compact" type="button" onClick={applyVotes} disabled={!canApply}>
              적용
            </button>
          ) : null}
        </div>
      ) : null}
      {statusText ? <p className="dilemma-vote-status">{statusText}</p> : null}
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

function PersonalInventoryPanel({
  inventory,
  progress,
  ownChoice,
  dilemma,
  dilemmaHistory,
  houses,
  houseId,
  busy,
  mutate,
  onOpenSecretAgendaGuide,
}) {
  const serverInventory = useMemo(() => normalizeInventory(inventory), [inventory]);
  const serverProgress = useMemo(() => normalizeHouseProgress(progress), [progress]);
  const serverDilemma = useMemo(() => normalizeDilemmaRecord(dilemma), [dilemma]);
  const [draft, setDraft] = useState(serverInventory);
  const [progressDraft, setProgressDraft] = useState(serverProgress);
  const [ledgerSaveStatus, setLedgerSaveStatus] = useState("saved");
  const [dilemmaDialogOpen, setDilemmaDialogOpen] = useState(false);
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
    if (!window.confirm(gameStartDefaultsConfirmMessage)) {
      return;
    }

    setDraft(normalizeInventory(createDefaultInventory()));
    setProgressDraft(normalizeHouseProgress(createDefaultHouseProgress()));
    setLedgerSaveStatus("pending");
  };

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

    const result = await mutate({
      action: "saveDilemma",
      dilemmaEditToken,
      dilemma: createDilemmaPayload(dilemmaDraft),
    });

    if (result) {
      setDilemmaDialogOpen(false);
      setDilemmaEditToken("");
    }
  }, [dilemmaDraft, dilemmaEditToken, mutate]);

  const publishDilemma = useCallback(async () => {
    if (!houseId || !serverDilemma || isDilemmaBlank(serverDilemma)) {
      return;
    }

    await mutate({ action: "publishDilemma" });
  }, [houseId, mutate, serverDilemma]);

  const ledgerStatusText =
    ledgerSaveStatus === "error"
      ? "저장 실패"
      : ledgerSaveStatus === "saving" || ledgerSaveStatus === "pending" || isDirty
        ? "자동 저장 중"
        : "저장 완료";
  const ledgerStatusClassName = ledgerSaveStatus === "error" ? "dirty-pill" : isDirty ? "dirty-pill" : "saved-pill";
  const ledgerStatusDescription =
    ledgerSaveStatus === "error"
      ? "자동 저장에 실패했습니다. 연결이 복구되면 다시 시도합니다."
      : ledgerSaveStatus === "saving" || ledgerSaveStatus === "pending" || isDirty
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
          history={dilemmaHistory || []}
          houses={houses || []}
          editButtonRef={dilemmaEditButtonRef}
          onEdit={beginDilemmaEdit}
          onPublish={publishDilemma}
        />
      ) : null}

      <section className="inventory-panel" aria-labelledby="inventory-title">
      <div className="inventory-header">
        <div>
          <p className="section-label">가문 기록</p>
          <h2 id="inventory-title">가문 장부</h2>
        </div>
        <span className={ledgerStatusClassName}>{ledgerStatusText}</span>
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
                </button>
              ) : null}
            </div>
          </div>
        </div>
        <form className="achievement-edit-form" onSubmit={submit}>
          <label className="dilemma-field">
            <span>조건 텍스트</span>
            <textarea
              ref={firstFieldRef}
              value={editor.draft.conditionText}
              maxLength={achievementDetailTextMaxLength}
              onChange={(event) => onChange("conditionText", event.target.value)}
              placeholder="실제 가문 화면에 적힌 달성 조건을 적습니다."
            />
          </label>
          <label className="dilemma-field achievement-required-field">
            <span>달성에 필요한 카운트 수</span>
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
            <legend>효과 아이콘</legend>
            <div className="achievement-effect-options">
              {achievementEffectOptions.map((option) => {
                const selected = editor.draft.effectIcon === option.id;

                return (
                  <button
                    className={`achievement-effect-option${selected ? " selected" : ""}`}
                    type="button"
                    aria-pressed={selected}
                    key={option.id}
                    onClick={() => onChange("effectIcon", option.id)}
                  >
                    <span className="achievement-effect-option-icon">
                      <AchievementEffectOptionIcon option={option} />
                    </span>
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
          {achievementEffectAmountOptionIds.has(editor.draft.effectIcon) ? (
            <label className="dilemma-field achievement-required-field">
              <span>효과 수치</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max={achievementEffectAmountMax}
                value={editor.draft.effectAmount}
                onChange={(event) => onChange("effectAmount", event.target.valueAsNumber)}
              />
            </label>
          ) : null}
          <label className="dilemma-field">
            <span>효과 메모</span>
            <textarea
              value={editor.draft.effectText}
              maxLength={achievementDetailTextMaxLength}
              onChange={(event) => onChange("effectText", event.target.value)}
              placeholder="해금되는 특수 능력이나 즉시 보상을 적습니다."
            />
            <AchievementEffectMemo detail={editor.draft} />
          </label>
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

function AchievementEffectOptionIcon({ option }) {
  if (option.legendIcon) {
    return <SpecialAbilityLegendIcon type={option.legendIcon} />;
  }

  return <TokenIcon type={option.icon || "seal"} />;
}

function AchievementEffectMemo({ detail }) {
  const memoText = formatAchievementEffectMemo(detail);

  if (!memoText) {
    return <span className="achievement-effect-memo muted">효과 아이콘을 선택하지 않았습니다.</span>;
  }

  return (
    <span className="achievement-effect-memo">
      <AchievementEffectBadge detail={detail} />
      <span>{memoText}</span>
    </span>
  );
}

function AchievementEffectBadge({ detail }) {
  const effectIcon = normalizeAchievementEffectIcon(detail?.effectIcon);
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

function SpecialAbilityLegendIcon({ type }) {
  if (type === "prestigeCrave") {
    return (
      <span className="legend-icon-group" aria-hidden="true">
        <span className="legend-prefix">+X</span>
        <RulebookAbilityImage className="legend-crown light" type="prestige" />
        <span className="legend-divider">/</span>
        <RulebookAbilityImage className="legend-crown dark" type="crave" />
      </span>
    );
  }

  if (type === "coins") {
    return (
      <span className="legend-icon-group" aria-hidden="true">
        <span className="legend-prefix">+X</span>
        <RulebookAbilityImage className="legend-token coin" type="coin" />
      </span>
    );
  }

  if (type === "power") {
    return (
      <span className="legend-icon-group" aria-hidden="true">
        <span className="legend-prefix">+X</span>
        <RulebookAbilityImage className="legend-token power" type="power" />
      </span>
    );
  }

  if (type === "finale") {
    return (
      <span className="legend-icon-group" aria-hidden="true">
        <span className="legend-prefix">+X</span>
        <RulebookAbilityImage className="legend-finale harmony" type="harmony" />
        <span className="legend-divider">/</span>
        <RulebookAbilityImage className="legend-finale discord" type="discord" />
      </span>
    );
  }

  return <RulebookAbilityImage className={`legend-rule-icon ${type}`} type={type} />;
}

function RulebookAbilityImage({ className, type }) {
  const src = specialAbilityIconUrls[type];

  if (!src) {
    return null;
  }

  return (
    <span className={className} aria-hidden="true">
      <img src={src} alt="" draggable="false" />
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
            <p className="section-label">업적 도움말</p>
            <h2 id="achievement-legend-title">특수 능력 범례</h2>
          </div>
        </div>
        <figure className="rulebook-legend-figure">
          <img src={specialAbilityLegendImageUrl} alt="룰북 14쪽 특수 능력 범례 표" />
          <figcaption>룰북 p.14 특수 능력 범례</figcaption>
        </figure>
        <div className="score-guide-table-wrap">
          <table className="score-guide-table achievement-legend-table">
            <thead>
              <tr>
                <th scope="col">표식</th>
                <th scope="col">시점</th>
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

function DilemmaSummaryCard({ busy, currentHouseId, dilemma, history = [], houses = [], editButtonRef, onEdit, onPublish }) {
  const locked = Boolean(dilemma.editLock);
  const lockedByOther = Boolean(dilemma.editLock && dilemma.editLock.houseId !== currentHouseId);
  const isBlank = isDilemmaBlank(dilemma);
  const publishBlockReason = getDilemmaPublishBlockReason(dilemma, houses);
  const publishedEntry = dilemma.historyId ? history.find((entry) => entry.historyId === dilemma.historyId) : null;
  const published = Boolean(publishedEntry && isPublishedDilemmaCurrent(dilemma, publishedEntry));
  const editButtonLabel = isBlank ? "작성" : "편집";
  const statusText = dilemma.editLock
    ? `${dilemma.editLock.houseName} 수정 중`
    : isBlank
      ? "미작성"
      : published
        ? "게시됨"
        : "저장됨";
  const canEdit = Boolean(currentHouseId) && !lockedByOther;
  const canPublish = Boolean(currentHouseId) && !locked && !isBlank && !publishBlockReason;

  return (
    <section className="dilemma-ledger-card" aria-labelledby="dilemma-ledger-title">
      <div className="dilemma-summary-head">
        <div>
          <p className="section-label">공용 딜레마</p>
          <h3 id="dilemma-ledger-title">딜레마</h3>
        </div>
        <div className="dilemma-summary-actions">
          <span className={`dilemma-status-pill${dilemma.editLock ? " locked" : ""}`}>{statusText}</span>
          <button
            ref={editButtonRef}
            className="ghost-button dilemma-summary-button dilemma-edit-button"
            type="button"
            onClick={onEdit}
            disabled={busy || !canEdit}
            title={
              lockedByOther
                ? "다른 가문이 편집을 마칠 때까지 기다려야 합니다."
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
                ? "딜레마 편집을 저장하거나 취소한 뒤 게시할 수 있습니다."
                : isBlank
                  ? "게시할 딜레마 기록이 없습니다."
                  : publishBlockReason || "현재 저장된 딜레마를 지난 딜레마 이력에 게시합니다."
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
          </div>
          <DilemmaVoteBreakdown dilemma={dilemma} houses={houses} />
          <DilemmaTextPreview label="질문" value={dilemma.question || dilemma.context} />
          <DilemmaTextPreview label="메모" value={dilemma.councilNotes} />
          <div className="dilemma-outcome-grid">
            <DilemmaOutcomePreview label="찬성" selected={dilemma.selectedOutcome === "aye"} outcome={dilemma.aye} />
            <DilemmaOutcomePreview label="반대" selected={dilemma.selectedOutcome === "nay"} outcome={dilemma.nay} />
          </div>
          <DilemmaTextPreview label="해결" value={dilemma.resolutionNotes || dilemma.voteNotes} />
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

function getDilemmaPublishBlockReason(dilemma, houses = []) {
  const normalizedDilemma = normalizeDilemmaRecord(dilemma);

  if (isDilemmaBlank(normalizedDilemma)) {
    return "게시할 딜레마 기록이 없습니다.";
  }

  if (!isDilemmaVoteCompleteForPublish(normalizedDilemma, houses)) {
    return "다섯 가문이 모두 투표한 뒤 게시할 수 있습니다.";
  }

  if (!normalizedDilemma.selectedOutcome) {
    return "딜레마 투표 결과를 적용하거나 선택한 뒤 게시할 수 있습니다.";
  }

  if (!normalizedDilemma.resolutionNotes.trim()) {
    return "해결 후속을 입력한 뒤 게시할 수 있습니다.";
  }

  return "";
}

function isDilemmaVoteCompleteForPublish(dilemma, houses = []) {
  const participants = getActiveDilemmaVoteHouses(houses);
  const votes = normalizeDilemmaVotes(dilemma?.votes);

  return participants.length === REQUIRED_HOUSE_COUNT && participants.every((house) => Boolean(votes[house.id]?.side));
}

function getActiveDilemmaVoteHouses(houses = []) {
  return (houses || []).filter((house) => house?.hasPassword).slice(0, REQUIRED_HOUSE_COUNT);
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
            <strong>{group.items.length}</strong>
          </header>
          <div className="dilemma-vote-breakdown-list">
            {group.items.length ? (
              group.items.map((item) => (
                <span className="dilemma-vote-breakdown-chip" key={item.houseId}>
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
      <p>{value || "미입력"}</p>
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
    <div className="dilemma-photo-strip" aria-label="딜레마 사진">
      {photos.map((photo) => (
        <a key={photo.id} href={photo.dataUrl} target="_blank" rel="noreferrer" title={photo.name}>
          <img src={photo.dataUrl} alt={photo.name || "딜레마 사진"} />
        </a>
      ))}
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
              placeholder="카드 전문 대신 요약이나 진행상황을 적습니다."
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
            placeholder="논의 내용, 협상, 주의할 카드 효과"
          />
          <DilemmaOutcomeSelector
            value={draft.selectedOutcome}
            aye={draft.aye}
            nay={draft.nay}
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
            label="해결 후속"
            value={draft.resolutionNotes}
            onChange={(value) => onFieldChange("resolutionNotes", value)}
            placeholder={resolutionDisabled ? "전원 투표 후 입력할 수 있습니다." : "자원/안정도/모멘텀, 스티커, 봉투, 카드 처리"}
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

function DilemmaOutcomeSelector({ value, aye, nay, onChange }) {
  const options = [
    {
      value: "",
      title: "미정",
      meta: "결의 전",
      icon: "turn",
      deltas: {},
    },
    {
      value: "aye",
      title: "찬성 통과",
      meta: "찬성 결과",
      icon: "plus",
      deltas: normalizeDilemmaOutcome(aye).resourceDeltas,
    },
    {
      value: "nay",
      title: "반대 통과",
      meta: "반대 결과",
      icon: "minus",
      deltas: normalizeDilemmaOutcome(nay).resourceDeltas,
    },
  ];

  return (
    <fieldset className="dilemma-outcome-selector">
      <legend>선택 결과</legend>
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
                <span className="dilemma-outcome-choice-empty">{option.value ? "변화 없음" : "대기"}</span>
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
          <p>결과에 한정하지 않고 보드게임 사진을 선택하거나 Ctrl+V로 붙여넣을 수 있습니다.</p>
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

function DilemmaTextarea({ label, value, onChange, placeholder, disabled = false, hint = "" }) {
  return (
    <label className="dilemma-field">
      <span>{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

function DilemmaOutcomeEditor({ label, outcome, selected, onChange }) {
  const normalizedOutcome = normalizeDilemmaOutcome(outcome);

  return (
    <fieldset className={`dilemma-outcome-editor${selected ? " selected" : ""}`}>
      <legend>{label}</legend>
      <DilemmaResourceDeltaEditor
        label={`${label} 적용 변화`}
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
        <span>적용 변화</span>
        <button
          className="stepper-button compact"
          type="button"
          aria-label={`${label} 초기화`}
          title="초기화"
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
        <small>{complete ? "달성" : "미달성"}</small>
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
  const hasEffect = Boolean(detail.effectText);
  const effectMemo = formatAchievementEffectMemo(detail);

  if (!hasCondition && !hasEffect && !effectMemo) {
    return <span className="achievement-detail-preview muted">조건/효과 미입력</span>;
  }

  return (
    <span className="achievement-detail-preview">
      {hasCondition ? <span>조건: {detail.conditionText}</span> : <span>조건 미입력</span>}
      {effectMemo ? (
        <span className="achievement-detail-segment">
          {" · "}
          <AchievementEffectBadge detail={detail} />
          <span>{effectMemo}</span>
        </span>
      ) : null}
      {hasEffect ? <span> · 메모: {detail.effectText}</span> : null}
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
          aria-label={`${label} 도전과제 ${challengeComplete ? "달성" : "미달성"}`}
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

function AlignmentRewardCrowns({ crownType, count, label }) {
  const rewardLabel = alignmentRewardTypeLabels[crownType] || "왕관";

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
        side: normalizedVote.side,
        name: displayName,
        houseName,
        houseNumber: house?.number || 0,
        powerTokens: normalizedVote.powerTokens,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.houseNumber - right.houseNumber || left.name.localeCompare(right.name));

  return groupDefs.map((group) => ({
    ...group,
    items: items.filter((item) => item.side === group.side),
  }));
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
        name: normalizeTextField(candidate.name) || "딜레마 사진",
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
    updatedAt: "",
  };
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
    effectIcon: "",
    effectAmount: 0,
    effectText: "",
  };
}

function normalizeAchievementDetail(value, fallbackRequiredCount) {
  const candidate = value && typeof value === "object" ? value : {};
  const effectIcon = normalizeAchievementEffectIcon(candidate.effectIcon);

  return {
    conditionText: normalizeAchievementText(candidate.conditionText),
    requiredCount: normalizeRequiredCount(candidate.requiredCount, fallbackRequiredCount),
    effectIcon,
    effectAmount: normalizeAchievementEffectAmount(candidate.effectAmount, effectIcon),
    effectText: normalizeAchievementText(candidate.effectText),
  };
}

function updateAchievementDetailDraft(detail, field, value) {
  if (field === "requiredCount") {
    return {
      ...detail,
      requiredCount: normalizeRequiredCount(value),
    };
  }

  if (field === "effectIcon") {
    const effectIcon = normalizeAchievementEffectIcon(value);

    return {
      ...detail,
      effectIcon,
      effectAmount: normalizeAchievementEffectAmount(detail.effectAmount, effectIcon),
    };
  }

  if (field === "effectAmount") {
    return {
      ...detail,
      effectAmount: normalizeAchievementEffectAmount(value, detail.effectIcon),
    };
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
  return typeof value === "string" && achievementEffectOptionById[value] ? value : "";
}

function normalizeAchievementEffectAmount(value, effectIcon) {
  if (!achievementEffectAmountOptionIds.has(effectIcon)) {
    return 0;
  }

  return normalizeCounter(value, achievementEffectAmountMax, 0);
}

function formatAchievementEffectMemo(detail) {
  const effectIcon = normalizeAchievementEffectIcon(detail?.effectIcon);
  const option = getAchievementEffectOption(effectIcon);

  if (!option.id) {
    return "";
  }

  if (!option.amount) {
    return option.memo;
  }

  const amount = normalizeAchievementEffectAmount(detail?.effectAmount, option.id);
  return amount > 0 ? `${option.label} +${amount}` : `${option.label} 수치 미입력`;
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
    leftDetail.effectIcon === rightDetail.effectIcon &&
    leftDetail.effectAmount === rightDetail.effectAmount &&
    leftDetail.effectText === rightDetail.effectText
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
          <p className="section-label">봉인 의제 폐기</p>
          <h3>폐기할 의제 직접 선택</h3>
          <p>아래 목록에서 이번 드래프트에서 제외할 비밀 의제 1장을 고릅니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="action-card">
      <div>
        <p className="section-label">봉인 의제 폐기</p>
        <h3>봉인 의제 1장을 무작위 폐기</h3>
        <p>폐기된 의제는 공개하지 않습니다.</p>
      </div>
      <button className="primary-button" type="button" onClick={() => mutate({ action: "discard" })} disabled={busy}>
        <TokenIcon type="flame" />
        무작위 폐기
      </button>
    </div>
  );
}

function AgendaList({ agendas, busy, mode = "choose", mutate, onOpenSecretAgendaGuide }) {
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
            onOpenSecretAgendaGuide={onOpenSecretAgendaGuide}
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
          {expanded ? "전체 접기" : "전체 펼치기"}
        </button>
      </div>
    </section>
  );
}

function AgendaCard({ agenda, busy, expanded, mode = "choose", mutate, onOpenSecretAgendaGuide }) {
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
              <SecretAgendaScoreHelpButton onClick={onOpenSecretAgendaGuide} />
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
      aria-label="비밀 의제 점수 산정방식 자세히 보기"
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
  if (type === "crown" || type === "prestige" || type === "crave") {
    return <CrownIcon tone={type} />;
  }

  const Icon = {
    balance: BalanceOutlinedIcon,
    coin: PaidOutlinedIcon,
    edit: EditOutlinedIcon,
    exit: LogoutOutlinedIcon,
    external: OpenInNewOutlinedIcon,
    flame: LocalFireDepartmentOutlinedIcon,
    gear: MenuOutlinedIcon,
    help: HelpOutlineOutlinedIcon,
    history: HistoryOutlinedIcon,
    house: HomeWorkOutlinedIcon,
    influence: VisibilityOutlinedIcon,
    key: VpnKeyOutlinedIcon,
    knowledge: MenuBookOutlinedIcon,
    menu: MenuOutlinedIcon,
    minus: RemoveOutlinedIcon,
    morale: MilitaryTechOutlinedIcon,
    plus: AddOutlinedIcon,
    photo: PhotoCameraOutlinedIcon,
    power: ShieldOutlinedIcon,
    reset: RestartAltOutlinedIcon,
    save: SaveOutlinedIcon,
    scroll: ArticleOutlinedIcon,
    seal: WorkspacePremiumOutlinedIcon,
    sheet: TableChartOutlinedIcon,
    soundOff: VolumeOffOutlinedIcon,
    soundOn: VolumeUpOutlinedIcon,
    tip: MenuBookOutlinedIcon,
    turn: AutorenewOutlinedIcon,
    trash: DeleteOutlineOutlinedIcon,
    undo: UndoOutlinedIcon,
    warning: WarningAmberOutlinedIcon,
    wealth: PaidOutlinedIcon,
    welfare: FavoriteBorderOutlinedIcon,
  }[type] || AddOutlinedIcon;

  return <Icon aria-hidden="true" focusable="false" />;
}

function CrownIcon({ tone = "crown" }) {
  const className =
    tone === "prestige"
      ? "crown-icon crown-icon-light"
      : tone === "crave"
        ? "crown-icon crown-icon-dark"
        : "crown-icon";

  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        className="crown-fill"
        d="M4.2 8.1 8.3 12l3.7-6.3 3.7 6.3 4.1-3.9-1.5 9.7H5.7L4.2 8.1Z"
      />
      <path className="crown-rim" d="M6.2 20h11.6" />
    </svg>
  );
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

const rootElement = document.querySelector("#root");
const root = globalThis.__KINGS_DILEMMA_ROOT__ ?? createRoot(rootElement);
globalThis.__KINGS_DILEMMA_ROOT__ = root;

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
