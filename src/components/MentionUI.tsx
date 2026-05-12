import React, { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { 
  valueMentionItems, 
  achievementEffectSelectableOptions,
  achievementEffectAmountMax,
  ko,
} from "../resources/gameResources";
import { 
  normalizeCounter, 
  normalizeAchievementEffectAmount 
} from "../utils/normalizers";
import { 
  parseMentionText,
  formatValueMention,
  formatEffectMention,
  mentionItemRequiresAmount,
  shouldAppendMentionSeparator,
  getTextareaCaretPosition,
  normalizeMentionAmount,
  formatMentionDisplayAmount
} from "../utils/mention-helpers";
import { TokenIcon, AchievementEffectOptionIcon } from "./GameIcons";
import { Tooltip } from "./Tooltip";

export interface MentionPart {
  type: "text" | "mention";
  text?: string;
  kind?: "value" | "effect";
  start?: number;
  end?: number;
  amount?: number;
  tone?: string;
  item?: any;
}

interface MentionTokenViewProps {
  className?: string;
  emptyText?: string;
  onTokenClick?: (mention: MentionPart) => void;
  text: string;
}

export function MentionTokenView({ className = "", emptyText = "", onTokenClick, text }: MentionTokenViewProps) {
  const parts = parseMentionText(text) as MentionPart[];
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
            onClick={onTokenClick ? () => onTokenClick!(part) : undefined}
          />
        );
      })}
    </span>
  );
}

export function hasMentionToken(text: string) {
  return parseMentionText(text).some((part) => part.type === "mention");
}

interface MentionRenderedPreviewProps {
  text: string;
  /** Classes merged onto `MentionTokenView` (after `mention-token-preview`). */
  tokenViewClassName?: string;
  /** Classes on the outer preview wrapper (layout, grid placement). */
  wrapperClassName?: string;
  onTokenClick?: (mention: MentionPart) => void;
}

/** Live rendered preview for `@` / `!` mention fields; hidden when text is empty/whitespace-only. */
export function MentionRenderedPreview({
  text,
  tokenViewClassName = "",
  wrapperClassName = "",
  onTokenClick,
}: MentionRenderedPreviewProps) {
  const raw = typeof text === "string" ? text : "";

  if (!raw.trim()) {
    return null;
  }

  return (
    <div className={`mention-rendered-preview ${wrapperClassName}`.trim()}>
      <MentionTokenView
        className={`mention-token-preview ${tokenViewClassName}`.trim()}
        onTokenClick={onTokenClick}
        text={raw}
      />
    </div>
  );
}

interface MentionTokenChipProps {
  mention: MentionPart;
  onClick?: () => void;
}

function MentionTokenChip({ mention, onClick }: MentionTokenChipProps) {
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
      <Tooltip label={label}>
        <button className="mention-token-chip editable" type="button" aria-label={label} onClick={onClick}>
          {content}
        </button>
      </Tooltip>
    );
  }

  return (
    <Tooltip label={label}>
      <span className="mention-token-chip" aria-label={label}>
        {content}
      </span>
    </Tooltip>
  );
}

interface MentionState {
  type: "value" | "effect";
  triggerIndex: number;
  replaceEnd: number;
  query: string;
  item: any | null;
}

interface ValueMentionTextareaProps {
  value: string;
  onChange?: (event: any) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  multiline?: boolean;
  enableEffectMentions?: boolean;
  onEffectMention?: (effect: { icon: string; amount: number }) => void;
}

export const ValueMentionTextarea = React.forwardRef<HTMLTextAreaElement | HTMLInputElement, ValueMentionTextareaProps>(function ValueMentionTextarea(
  { value, onChange, placeholder, disabled = false, maxLength, multiline = true, enableEffectMentions = false, onEffectMention },
  forwardedRef,
) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const pendingSelectionRef = useRef<number | null>(null);
  const [mention, setMention] = useState<MentionState | null>(null);
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

    return (mentionItems as any[]).filter((item) => {
      return item.label.toLowerCase().includes(query) || item.id.toLowerCase().includes(query);
    });
  }, [mentionItems, query]);

  const setTextareaNode = useCallback(
    (node: HTMLTextAreaElement | HTMLInputElement | null) => {
      textareaRef.current = node;

      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<HTMLTextAreaElement | HTMLInputElement | null>).current = node;
      }
    },
    [forwardedRef],
  );

  useEffect(() => {
    if (pendingSelectionRef.current === null || !textareaRef.current) {
      return;
    }

    const nextPosition = pendingSelectionRef.current;
    pendingSelectionRef.current = null;
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(nextPosition, nextPosition);
  });

  const updateMentionPosition = useCallback((caretIndex: number) => {
    if (!textareaRef.current || !fieldRef.current) {
      return;
    }

    const caret = getTextareaCaretPosition(textareaRef.current as HTMLTextAreaElement, caretIndex);
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

  const emitChange = (nextValue: string) => {
    const limitedValue = typeof maxLength === "number" ? nextValue.slice(0, maxLength) : nextValue;
    onChange?.({ target: { value: limitedValue }, currentTarget: { value: limitedValue } });
    return limitedValue;
  };

  const closeMention = () => {
    setMention(null);
    setAmount(1);
    setActiveMentionIndex(0);
  };

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
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

  const handleKeyDown = (event: React.KeyboardEvent) => {
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
      queueMicrotask(() => setActiveMentionIndex(0));
      return;
    }

    queueMicrotask(() =>
      setActiveMentionIndex((current) => Math.min(current, filteredItems.length - 1)),
    );
  }, [mention, filteredItems.length]);

  const normalizeActiveMentionAmount = (value: number) => {
    if (mention?.type === "effect") {
      return normalizeCounter(value, achievementEffectAmountMax, 0);
    }

    return normalizeMentionAmount(value);
  };

  const adjustAmount = (delta: number) => {
    setAmount((current) => normalizeActiveMentionAmount(current + delta));
  };

  const updateAmount = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(normalizeActiveMentionAmount(event.target.valueAsNumber));
  };

  const insertMentionItem = (activeMention: MentionState, item: any, activeAmount = amount) => {
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

  const selectMentionItem = (item: any) => {
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
    if (!mention) return;
    insertMentionItem(mention, mention.item, amount);
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
      } as React.CSSProperties}
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
            <small>{mention.type === "effect" ? ko.mentionUi.categoryEffect : mention.item.category}</small>
          </span>
          {mentionItemRequiresAmount(mention.type, mention.item) ? (
            <span className="value-mention-amount">
              <button type="button" className="stepper-button compact" onClick={() => adjustAmount(-1)}>
                <TokenIcon type="minus" />
              </button>
              <input
                type="number"
                inputMode="numeric"
                min={mention.type === "effect" ? 0 : -30}
                max={30}
                value={amount}
                onChange={updateAmount}
                aria-label={`${mention.item.label} ${ko.mentionUi.amountAria}`}
              />
              <button type="button" className="stepper-button compact" onClick={() => adjustAmount(1)}>
                <TokenIcon type="plus" />
              </button>
            </span>
          ) : null}
          <span className="value-mention-actions">
            <button type="button" className="ghost-button compact" onClick={() => setMention((current) => current && { ...current, item: null })}>
              {ko.mentionUi.reselect}
            </button>
            <button type="button" className="primary-button compact" onClick={insertMention}>
              {ko.mentionUi.insert}
            </button>
          </span>
        </>
      ) : (
        <>
          <span className="value-mention-title">{mention.type === "effect" ? ko.mentionUi.effectSelectTitle : ko.mentionUi.valueSelectTitle}</span>
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
                    <small>{mention.type === "effect" ? ko.mentionUi.categoryEffect : item.category}</small>
                  </span>
                </button>
              ))
            ) : (
              <span className="value-mention-empty">{ko.mentionUi.noMatch}</span>
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
          ref={setTextareaNode as React.Ref<HTMLTextAreaElement>}
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
          ref={setTextareaNode as React.Ref<HTMLInputElement>}
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
