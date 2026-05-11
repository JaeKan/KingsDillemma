import { ko } from "../resources/gameResources";

export function getMysteryStickerLabel(id: string): string {
  const trimmed = id.trim();

  if (!trimmed) {
    return ko.mysteryStickers.none;
  }

  const labels: Record<string, string> = {
    "rulebook-42-1": ko.mysteryStickers.placement1,
    "rulebook-42-2": ko.mysteryStickers.placement2,
    "rulebook-42-3": ko.mysteryStickers.placement3,
    "rulebook-42-4": ko.mysteryStickers.placement4,
    "rulebook-42-5": ko.mysteryStickers.placement5,
    "rulebook-42-6": ko.mysteryStickers.placement6,
  };

  return labels[trimmed] || trimmed;
}
