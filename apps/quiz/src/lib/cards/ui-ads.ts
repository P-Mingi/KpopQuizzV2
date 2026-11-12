// Bunnyverse Cards, lane U: the seam to lane B's rewarded-ad layer (NET_CARDS_ADS). The Packs page shows "Watch an ad" only when a layer
// has registered itself here AND says an ad can play now; with none (flag off, no consent, no fill) nothing is rendered.
// Lane B registers with registerRewardedAd() from its own client module; show() resolves true only when the ad played to the end.
export interface RewardedAd {
  /** True while an ad can play right now. */
  available(): boolean;
  /** Plays the ad; true when it was watched to the end. */
  show(): Promise<boolean>;
}

let layer: RewardedAd | null = null;
const listeners = new Set<() => void>();

export function registerRewardedAd(ad: RewardedAd | null): void {
  layer = ad;
  listeners.forEach((l) => l());
}
export function getRewardedAd(): RewardedAd | null {
  return layer;
}
export function onRewardedAdChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
