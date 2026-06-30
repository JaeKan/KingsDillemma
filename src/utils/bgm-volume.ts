export function clampBgmVolumeValue(value: unknown, fallback: number): number {
  const volume = Number(value);

  return Number.isFinite(volume) ? Math.min(Math.max(volume, 0), 1) : fallback;
}

export function getBgmDisplayVolumePercent(volume: unknown, muted: boolean): number {
  return muted ? 0 : Math.round(clampBgmVolumeValue(volume, 1) * 100);
}

export function getBgmUnmutedVolume(volume: unknown, fallback: number): number {
  const currentVolume = clampBgmVolumeValue(volume, fallback);

  return currentVolume === 0 ? clampBgmVolumeValue(fallback, 1) : currentVolume;
}
