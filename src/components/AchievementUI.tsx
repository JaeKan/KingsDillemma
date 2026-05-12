import { ko } from "../resources/gameResources";
import { getAchievementEffectOption, normalizeAchievementEffectEntries, normalizeAchievementEffectIcon } from "../utils/normalizers";
import { AchievementEffectOptionIcon } from "./GameIcons";
import { MentionTokenView } from "./MentionUI";

interface AchievementEffectEntry {
  icon: string;
  text: string;
}

function AchievementEffectMemo({ detail }: { detail: any }) {
  const entries = normalizeAchievementEffectEntries(
    detail?.effectEntries,
    detail?.effects,
    detail?.effectText,
    detail?.effectIcon,
    detail?.effectAmount,
  );

  if (!entries.length) {
    return <span className="achievement-effect-memo muted">{ko.achievementUi.noMemo}</span>;
  }

  return (
    <span className="achievement-effect-memo">
      {entries.map((entry, index) => (
        <AchievementEffectEntrySummary entry={entry} key={`${entry.icon}-${entry.text}-${index}`} />
      ))}
    </span>
  );
}

function AchievementEffectEntrySummary({ entry }: { entry: AchievementEffectEntry }) {
  const option = getAchievementEffectOption(entry?.icon);
  const hasText = Boolean(entry?.text);

  return (
    <span className="achievement-effect-entry-summary">
      {entry?.icon ? <AchievementEffectBadge effect={entry} /> : null}
      <span className="achievement-effect-entry-label">{option.label} :</span>
      {hasText ? (
        <MentionTokenView text={entry.text} />
      ) : (
        <span className="achievement-effect-entry-empty">{ko.achievementUi.emptyEntry}</span>
      )}
    </span>
  );
}

function AchievementEffectBadge({ effect }: { effect: any }) {
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

export {
  AchievementEffectMemo,
};
