import { useState } from "react";
import { getMysteryStickerSlotNumber } from "../../shared/mystery-stickers.mts";
import { ko } from "../resources/gameResources";

type MysteryStickerImageProps = {
  stickerId: string;
  publicPath: string | undefined;
  /** 피커·요약 등: 장식용(빈 alt) / 의미 있는 미리보기: alt 필요 */
  presentation: "decorative" | "meaningful";
  meaningfulAlt?: string;
};

/** 보드 배치 아이콘 로드 실패 시 배치 번호만 표시(대체 일러스트 없음). */
export function MysteryStickerImage({ stickerId, publicPath, presentation, meaningfulAlt }: MysteryStickerImageProps) {
  const [broken, setBroken] = useState(false);
  const slot = getMysteryStickerSlotNumber(stickerId);
  const fallbackTitle = slot ? ko.mysteryStickers.missingFileHint(slot) : ko.mysteryStickers.missingFileHintUnknown;

  if (!publicPath || broken) {
    return (
      <span
        className="mystery-sticker-thumb-fallback"
        title={fallbackTitle}
        aria-hidden={presentation === "decorative"}
      >
        {slot ?? "?"}
      </span>
    );
  }

  return (
    <img
      src={publicPath}
      alt={presentation === "decorative" ? "" : meaningfulAlt ?? ""}
      role={presentation === "decorative" ? "presentation" : undefined}
      onError={() => setBroken(true)}
    />
  );
}
