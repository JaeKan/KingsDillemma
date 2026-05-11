import { MYSTERY_STICKER_ENTRIES, getMysteryStickerEntry } from "../../shared/mystery-stickers.mts";
import { ko } from "../resources/gameResources";
import { getMysteryStickerLabel } from "../utils/mystery-sticker-labels";
import { MysteryStickerImage } from "./MysteryStickerImage";

interface MysteryStickerPickerProps {
  value: string;
  disabled?: boolean;
  onChange: (id: string) => void;
}

const SELECT_ID = "mystery-sticker-select";

/** 딜레마 편집 — 룰북 보드 카드 배치(미스터리 스티커 1–6, 네이티브 선택 + 미리보기). */
export function MysteryStickerPicker({ value, disabled = false, onChange }: MysteryStickerPickerProps) {
  const resolvedId =
    value && MYSTERY_STICKER_ENTRIES.some((e) => e.id === value) ? value : "";
  const entry = getMysteryStickerEntry(resolvedId);

  return (
    <section className="mystery-sticker-picker" aria-labelledby="mystery-sticker-title">
      <div className="mystery-sticker-picker-head">
        <h3 id="mystery-sticker-title">{ko.mysteryStickers.sectionTitle}</h3>
      </div>
      <div className={`mystery-sticker-picker-row${disabled ? " disabled" : ""}`}>
        <div className="mystery-sticker-picker-preview" title={ko.mysteryStickers.previewLabel} aria-hidden="true">
          {entry ? (
            <MysteryStickerImage
              stickerId={entry.id}
              publicPath={entry.publicPath}
              presentation="decorative"
            />
          ) : (
            <span className="mystery-sticker-picker-preview-placeholder">—</span>
          )}
        </div>
        <div className="mystery-sticker-picker-select-wrap">
          <label className="visually-hidden" htmlFor={SELECT_ID}>
            {ko.mysteryStickers.ariaGroup}
          </label>
          <select
            id={SELECT_ID}
            disabled={disabled}
            value={resolvedId}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">{ko.mysteryStickers.none}</option>
            {MYSTERY_STICKER_ENTRIES.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {getMysteryStickerLabel(opt.id)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
