import { 
  valueMentionItems, 
  achievementEffectSelectableOptions,
  valueMentionAmountMax
} from "../resources/gameResources";
import { normalizeAchievementEffectAmount } from "./normalizers";

// ── 멘션 파싱 ────────────────────────────────────────────────

interface MentionLabel {
  kind: "value" | "effect";
  item: any;
  label: string;
}

let sortedValueMentionLabelsCache: MentionLabel[] | null = null;
let sortedEffectMentionLabelsCache: MentionLabel[] | null = null;

function getSortedValueMentionLabels(): MentionLabel[] {
  if (!sortedValueMentionLabelsCache) {
    sortedValueMentionLabelsCache = valueMentionItems
      .map((item) => ({ kind: "value" as const, item, label: item.label }))
      .sort((left, right) => right.label.length - left.label.length);
  }

  return sortedValueMentionLabelsCache;
}

function getSortedEffectMentionLabels(): MentionLabel[] {
  if (!sortedEffectMentionLabelsCache) {
    sortedEffectMentionLabelsCache = achievementEffectSelectableOptions
      .map((item) => ({ kind: "effect" as const, item, label: item.label }))
      .sort((left, right) => right.label.length - left.label.length);
  }

  return sortedEffectMentionLabelsCache;
}

function findNextMentionTrigger(text: string, start: number): number {
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

export function mentionItemRequiresAmount(type: string, item: any): boolean {
  if (!item) {
    return false;
  }

  if (type === "effect") {
    return Boolean(item.amount);
  }

  return item.requiresAmount !== false;
}

export function parseMentionText(value: any): any[] {
  const text = typeof value === "string" ? value : "";
  const valueLabels = getSortedValueMentionLabels();
  const effectLabels = getSortedEffectMentionLabels();
  const parts: any[] = [];

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

// ── 멘션 포맷 ────────────────────────────────────────────────

export function normalizeMentionAmount(value: any): number {
  const number = Number.isFinite(value) ? Math.trunc(value) : 1;
  const clamped = Math.max(-valueMentionAmountMax, Math.min(valueMentionAmountMax, number));

  return clamped === 0 ? 1 : clamped;
}

export function formatValueMention(item: any, amount: any): string {
  if (!mentionItemRequiresAmount("value", item)) {
    return `@${item.label}`;
  }

  const normalizedAmount = normalizeMentionAmount(amount);
  const sign = normalizedAmount > 0 ? "+" : "";

  return `@${item.label} ${sign}${normalizedAmount}`;
}

export function formatEffectMention(item: any, amount: any): string {
  if (!item?.id) {
    return "";
  }

  if (!item.amount) {
    return `!${item.label}`;
  }

  const normalizedAmount = normalizeAchievementEffectAmount(amount, item.id);
  return normalizedAmount > 0 ? `!${item.label} +${normalizedAmount}` : `!${item.label}`;
}

export function shouldAppendMentionSeparator(text: string, replaceEnd: number): boolean {
  const nextCharacter = text[replaceEnd] || "";
  return !nextCharacter || !/[\s\n.,;:!?)]/.test(nextCharacter);
}

export function formatMentionDisplayAmount(amount: any): string {
  if (!Number.isFinite(amount)) {
    return "";
  }

  return amount > 0 ? `+${amount}` : `${amount}`;
}

// ── UI 헬퍼 ──────────────────────────────────────────────────

export function getTextareaCaretPosition(textarea: HTMLTextAreaElement, caretIndex: number): { left: number, top: number, height: number } {
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
  ] as const;

  mirrorProperties.forEach((property) => {
    (mirror.style as any)[property] = style[property as any];
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
  const styleLineHeight = style.lineHeight;
  const lineHeight = Number.parseFloat(styleLineHeight);
  const markerHeight = Number.isFinite(lineHeight) ? lineHeight : marker.offsetHeight || 18;
  document.body.removeChild(mirror);

  return {
    left: Math.max(0, markerLeft),
    top: Math.max(0, markerTop),
    height: markerHeight,
  };
}
