import { useId } from "react";
import { MYSTERY_STICKER_ENTRIES } from "../../shared/mystery-stickers.mts";
import { ko } from "../resources/gameResources";
import { getMysteryStickerLabel } from "../utils/mystery-sticker-labels";
import { MysteryStickerImage } from "./MysteryStickerImage";

interface MysteryStickerPickerProps {
  value: string;
  disabled?: boolean;
  label?: string;
  ariaLabel?: string;
  className?: string;
  onChange: (id: string) => void;
}

/** 딜레마 편집 — 룰북 이야기 카드 칸 배치(미스터리 스티커 1–6, 아이콘 타일 선택). */
export function MysteryStickerPicker({
  value,
  disabled = false,
  label = ko.mysteryStickers.sectionTitle,
  ariaLabel = ko.mysteryStickers.ariaGroup,
  className = "",
  onChange,
}: MysteryStickerPickerProps) {
  const titleId = useId();
  const resolvedId =
    value && MYSTERY_STICKER_ENTRIES.some((e) => e.id === value) ? value : "";
  const rootClassName = [
    "mystery-sticker-picker",
    className,
    disabled ? "disabled" : "",
  ].filter(Boolean).join(" ");

  return (
    <section className={rootClassName} aria-labelledby={titleId}>
      <div className="mystery-sticker-picker-head">
        <h3 id={titleId}>{label}</h3>
      </div>
      <div className="mystery-sticker-picker-tiles" role="radiogroup" aria-label={ariaLabel}>
        <button
          type="button"
          role="radio"
          aria-checked={resolvedId === ""}
          aria-label={ko.mysteryStickers.none}
          disabled={disabled}
          className={`mystery-sticker-picker-tile mystery-sticker-picker-tile--none${resolvedId === "" ? " selected" : ""}`}
          title={ko.mysteryStickers.none}
          onClick={() => onChange("")}
        >
          <span className="mystery-sticker-picker-tile-none-mark" aria-hidden="true">
            —
          </span>
        </button>
        {MYSTERY_STICKER_ENTRIES.map((opt) => {
          const selected = resolvedId === opt.id;
          const label = getMysteryStickerLabel(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={label}
              disabled={disabled}
              className={`mystery-sticker-picker-tile${selected ? " selected" : ""}`}
              title={label}
              onClick={() => onChange(opt.id)}
            >
              <MysteryStickerImage stickerId={opt.id} publicPath={opt.publicPath} presentation="decorative" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
