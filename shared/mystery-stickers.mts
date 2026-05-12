/**
 * 보드 위 딜레마 카드 놓는 위치 — 룰북 미스터리 스티커 도형 6곳(p.42–43) 순서.
 * 저장·API 호환을 위해 카탈로그 `id` 는 `rulebook-42-n` 유지, 실제 PNG 는 `1.png`…`6.png`.
 * 클라이언트·서버 공통.
 */
export const MYSTERY_STICKER_ENTRIES = [
  { id: "rulebook-42-1", publicPath: "/mystery-stickers/1.png" },
  { id: "rulebook-42-2", publicPath: "/mystery-stickers/2.png" },
  { id: "rulebook-42-3", publicPath: "/mystery-stickers/3.png" },
  { id: "rulebook-42-4", publicPath: "/mystery-stickers/4.png" },
  { id: "rulebook-42-5", publicPath: "/mystery-stickers/5.png" },
  { id: "rulebook-42-6", publicPath: "/mystery-stickers/6.png" },
] as const;

const ALLOWED_IDS = new Set<string>(MYSTERY_STICKER_ENTRIES.map((e) => e.id));

/** 옛 `placeholder-*` ID는 규칙서 아이콘과 1:1 대응이 없어 항상 미선택으로 정리합니다. */
function isLegacyPlaceholderId(id: string): boolean {
  return id.startsWith("placeholder-");
}

/** 1-based 배치 번호(룰북 미스터리 스티커 1–6 순서). 카탈로그에 없으면 null. */
export function getMysteryStickerSlotNumber(id: string): number | null {
  const idx = MYSTERY_STICKER_ENTRIES.findIndex((e) => e.id === id.trim());
  return idx >= 0 ? idx + 1 : null;
}

/** 저장·전송 가능한 값: 허용 ID 또는 빈 문자열(미선택). */
export function sanitizeMysteryStickerId(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (isLegacyPlaceholderId(trimmed)) {
    return "";
  }

  return ALLOWED_IDS.has(trimmed) ? trimmed : "";
}

export function getMysteryStickerEntry(id: string) {
  return MYSTERY_STICKER_ENTRIES.find((e) => e.id === id);
}
