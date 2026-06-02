import React, { useRef, useEffect } from "react";
import { TokenIcon, AchievementEffectOptionIcon } from "./GameIcons";
import { 
  houseAchievementMarkMax,
  achievementEffectOptions,
  achievementEffectEntryMax,
  achievementDetailTextMaxLength,
  ko,
} from "../resources/gameResources";
import { 
  AchievementEffectMemo,
} from "./AchievementUI";
import { hasMentionToken, ValueMentionTextarea, MentionRenderedPreview } from "./MentionUI";
import { normalizeAchievementEffectEntries, getAchievementEffectOption } from "../utils/normalizers";

interface AchievementEditDialogProps {
  busy: boolean;
  editor: any;
  houses?: any[];
  legendButtonRef: React.RefObject<HTMLButtonElement>;
  legendOpen: boolean;
  open: boolean;
  restoreFocusRef: React.RefObject<HTMLElement>;
  onCancel: () => void;
  onChange: (field: string, value: any) => void;
  onOpenLegend: () => void;
  onSave: () => void;
}

function AchievementEditDialog({
  busy,
  editor,
  houses = [],
  legendButtonRef,
  legendOpen,
  open,
  restoreFocusRef,
  onCancel,
  onChange,
  onOpenLegend,
  onSave,
}: AchievementEditDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const firstFieldRef = useRef<any>(null);
  const effectEntryRefs = useRef(new Map<number, any>());

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const focusRestoreEl = restoreFocusRef?.current ?? null;

    const focusFirstField = window.setTimeout(() => {
      firstFieldRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusFirstField);
      window.setTimeout(() => {
        focusRestoreEl?.focus();
      }, 0);
    };
  }, [open, restoreFocusRef]);

  useEffect(() => {
    if (!open || legendOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(
        (dialogRef.current as HTMLElement).querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element instanceof HTMLElement && element.getClientRects().length > 0);

      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0] as HTMLElement;
      const last = focusable[focusable.length - 1] as HTMLElement;

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

  const submit = (event: React.FormEvent) => {
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
  const showRequiredCountField = editor.kind !== "narrative";
  const setEffectEntryRef = (index: number) => (node: any) => {
    if (node) {
      effectEntryRefs.current.set(index, node);
    } else {
      effectEntryRefs.current.delete(index);
    }
  };
  const focusEffectEntryToken = (index: number, token: any) => {
    const field = effectEntryRefs.current.get(index);

    if (!field) {
      return;
    }

    field.focus();
    field.setSelectionRange(token.start, token.end);
  };

  const conditionTextRaw = typeof editor.draft.conditionText === "string" ? editor.draft.conditionText : "";

  const focusConditionToken = (token: any) => {
    const field = firstFieldRef.current as HTMLTextAreaElement | HTMLInputElement | null;

    if (!field || typeof field.setSelectionRange !== "function") {
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
            <p className="section-label">{ko.achievementEdit.section}</p>
            <div className="achievement-dialog-title-row">
              <h2 id="achievement-dialog-title">
                {editor.title}
                {ko.achievementEdit.titleEditSuffix}
              </h2>
              {onOpenLegend ? (
                <button
                  ref={legendButtonRef}
                  className="achievement-help-button"
                  type="button"
                  aria-haspopup="dialog"
                  aria-label={ko.achievementEdit.legendAria}
                  onClick={onOpenLegend}
                >
                  <TokenIcon type="help" />
                  {ko.achievementEdit.legendButton}
                </button>
              ) : null}
            </div>
          </div>
        </div>
        <form className="achievement-edit-form" onSubmit={submit}>
          <label className="form-field achievement-condition-field">
            <span>{ko.achievementEdit.conditionLabel}</span>
            <ValueMentionTextarea
              ref={firstFieldRef}
              value={editor.draft.conditionText}
              houses={houses}
              maxLength={achievementDetailTextMaxLength}
              onChange={(event) => onChange("conditionText", (event.target as HTMLTextAreaElement).value)}
              placeholder={ko.achievementEdit.conditionPlaceholder}
            />
            <MentionRenderedPreview
              text={conditionTextRaw}
              houses={houses}
              tokenViewClassName="achievement-condition-preview"
              onTokenClick={
                hasMentionToken(conditionTextRaw) ? (token) => focusConditionToken(token) : undefined
              }
            />
          </label>
          {showRequiredCountField ? (
            <label className="form-field achievement-required-field">
              <span>{ko.achievementEdit.requiredCountLabel}</span>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max={houseAchievementMarkMax}
                value={editor.draft.requiredCount}
                onChange={(event) => onChange("requiredCount", event.target.valueAsNumber)}
              />
            </label>
          ) : null}
          <fieldset className="achievement-effect-fieldset">
            <legend>{ko.achievementEdit.effectMemoLegend}</legend>
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
                        <span>{ko.achievementEdit.applyTimingLabel}</span>
                        <select
                          value={entry.icon}
                          onChange={(event) =>
                            onChange("effectEntryUpdate", { index, icon: event.target.value })
                          }
                        >
                          {achievementEffectOptions.map((effectOption: any) => (
                            <option key={effectOption.id} value={effectOption.id}>
                              {effectOption.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="achievement-effect-text-field">
                        <span>{ko.achievementEdit.contentLabel}</span>
                        <ValueMentionTextarea
                          ref={setEffectEntryRef(index)}
                          multiline={false}
                          value={entry.text}
                          houses={houses}
                          maxLength={achievementDetailTextMaxLength}
                          onChange={(event) =>
                            onChange("effectEntryUpdate", { index, text: (event.target as any).value })
                          }
                          placeholder={ko.achievementEdit.memoPlaceholder}
                        />
                      </label>
                      <button
                        className="achievement-effect-remove-button"
                        type="button"
                        aria-label={ko.achievementEdit.removeMemoAria(option.label)}
                        onClick={() => onChange("effectEntryRemove", index)}
                      >
                        <TokenIcon type="trash" />
                      </button>
                      <MentionRenderedPreview
                        text={entry.text}
                        houses={houses}
                        wrapperClassName="achievement-effect-row-preview"
                        onTokenClick={(token) => focusEffectEntryToken(index, token)}
                      />
                    </div>
                  );
                })
                : null}
            </div>
            <button
              className="ghost-button compact achievement-effect-add-button"
              type="button"
              disabled={!canAddEffectEntry}
              onClick={() => onChange("effectEntryAdd", undefined)}
            >
              <TokenIcon type="plus" />
              {ko.achievementEdit.addMemo}
            </button>
          </fieldset>
          <AchievementEffectMemo detail={editor.draft} houses={houses} />
          <div className="session-end-actions">
            <button className="ghost-button" type="button" onClick={onCancel} disabled={busy}>
              {ko.common.cancel}
            </button>
            <button className="primary-button" type="submit" disabled={busy}>
              <TokenIcon type="save" />
              {ko.common.save}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
export default AchievementEditDialog;
