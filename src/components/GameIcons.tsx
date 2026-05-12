import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import AnchorOutlinedIcon from "@mui/icons-material/AnchorOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import AutorenewOutlinedIcon from "@mui/icons-material/AutorenewOutlined";
import BalanceOutlinedIcon from "@mui/icons-material/BalanceOutlined";
import BiotechOutlinedIcon from "@mui/icons-material/BiotechOutlined";
import CastleOutlinedIcon from "@mui/icons-material/CastleOutlined";
import CurrencyExchangeOutlinedIcon from "@mui/icons-material/CurrencyExchangeOutlined";
import DangerousOutlinedIcon from "@mui/icons-material/DangerousOutlined";
import DiamondOutlinedIcon from "@mui/icons-material/DiamondOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import ForestOutlinedIcon from "@mui/icons-material/ForestOutlined";
import FortOutlinedIcon from "@mui/icons-material/FortOutlined";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import GrassOutlinedIcon from "@mui/icons-material/GrassOutlined";
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
import PestControlRodentOutlinedIcon from "@mui/icons-material/PestControlRodentOutlined";
import PetsOutlinedIcon from "@mui/icons-material/PetsOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import RemoveOutlinedIcon from "@mui/icons-material/RemoveOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import RotateRightOutlinedIcon from "@mui/icons-material/RotateRightOutlined";
import SailingOutlinedIcon from "@mui/icons-material/SailingOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import UndoOutlinedIcon from "@mui/icons-material/UndoOutlined";
import VolumeOffOutlinedIcon from "@mui/icons-material/VolumeOffOutlined";
import VolumeUpOutlinedIcon from "@mui/icons-material/VolumeUpOutlined";
import VpnKeyOutlinedIcon from "@mui/icons-material/VpnKeyOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import WorkspacePremiumOutlinedIcon from "@mui/icons-material/WorkspacePremiumOutlined";
import { specialAbilityIconUrls } from "../resources/gameResources";

/** 리더 토큰 — 유니코드 주먹 (Raised Fist, U+270A) */
const LEADER_FIST_EMOJI = "\u270A";

const ModeratorTokenMuiIcon = GavelOutlinedIcon;

export function AchievementEffectOptionIcon({ option }: { option: any }) {
  if (option.legendIcon) {
    return <SpecialAbilityLegendIcon type={option.legendIcon} />;
  }

  return <TokenIcon type={option.icon || "seal"} />;
}

export function SpecialAbilityLegendIcon({ type }: { type: string }) {
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

function RulebookAbilityImage({ className, type }: { className: string; type: string }) {
  const src = (specialAbilityIconUrls as any)[type];

  if (!src) {
    return null;
  }

  return (
    <span className={className} aria-hidden="true">
      <img src={src} alt="" draggable="false" />
    </span>
  );
}

export function TokenIcon({ type }: { type: string }) {
  if (type === "crown" || type === "prestige" || type === "crave") {
    return <CrownIcon tone={type} />;
  }

  if (type === "leader" || type === "fist") {
    return (
      <span className="leader-token-emoji" aria-hidden="true">
        {LEADER_FIST_EMOJI}
      </span>
    );
  }

  const Icon = ({
    balance: BalanceOutlinedIcon,
    castle: CastleOutlinedIcon,
    coin: PaidOutlinedIcon,
    edit: EditOutlinedIcon,
    exit: LogoutOutlinedIcon,
    external: OpenInNewOutlinedIcon,
    flame: LocalFireDepartmentOutlinedIcon,
    gear: MenuOutlinedIcon,
    hammer: ModeratorTokenMuiIcon,
    help: HelpOutlineOutlinedIcon,
    history: HistoryOutlinedIcon,
    house: HomeWorkOutlinedIcon,
    influence: FortOutlinedIcon,
    key: VpnKeyOutlinedIcon,
    knowledge: ArticleOutlinedIcon,
    menu: MenuOutlinedIcon,
    minus: RemoveOutlinedIcon,
    moderator: ModeratorTokenMuiIcon,
    morale: FlagOutlinedIcon,
    plus: AddOutlinedIcon,
    photo: PhotoCameraOutlinedIcon,
    resolution: AssignmentTurnedInOutlinedIcon,
    power: ShieldOutlinedIcon,
    reset: RestartAltOutlinedIcon,
    rotateRight: RotateRightOutlinedIcon,
    save: SaveOutlinedIcon,
    scroll: ArticleOutlinedIcon,
    seal: WorkspacePremiumOutlinedIcon,
    sheet: TableChartOutlinedIcon,
    soundOff: VolumeOffOutlinedIcon,
    soundOn: VolumeUpOutlinedIcon,
    status: FactCheckOutlinedIcon,
    tip: MenuBookOutlinedIcon,
    turn: AutorenewOutlinedIcon,
    trash: DeleteOutlineOutlinedIcon,
    undo: UndoOutlinedIcon,
    warning: WarningAmberOutlinedIcon,
    wealth: DiamondOutlinedIcon,
    welfare: GrassOutlinedIcon,
  } as any)[type] || AddOutlinedIcon;

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

export function HouseIcon({ motif }: { motif?: string }) {
  const Icon = ({
    boar: PetsOutlinedIcon,
    keys: KeyOutlinedIcon,
    lobster: AnchorOutlinedIcon,
    porcupine: PestControlRodentOutlinedIcon,
    rooster: CurrencyExchangeOutlinedIcon,
    rose: LocalFloristOutlinedIcon,
    ship: SailingOutlinedIcon,
    skull: DangerousOutlinedIcon,
    snake: BiotechOutlinedIcon,
    sword: MilitaryTechOutlinedIcon,
    tree: ForestOutlinedIcon,
    turtle: CastleOutlinedIcon,
  } as any)[motif || ""] || CastleOutlinedIcon;

  return <Icon aria-hidden="true" focusable="false" />;
}
