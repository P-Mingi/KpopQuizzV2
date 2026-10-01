// The YouTube IFrame API global (loaded with a script tag), used by the admin song
// editor and components/game/blind-test-player.tsx. This declaration lived in the
// legacy /blindtest/<mode> player until that player moved to Deezer previews
// (R1, F6); it is unchanged.
export {};

interface YouTubeIframePlayer {
  loadVideoById: (c: { videoId: string; startSeconds: number; endSeconds: number }) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  getCurrentTime: () => number;
  setSize: (w: number, h: number) => void;
  destroy: () => void;
}

declare global {
  interface Window {
    YT: {
      Player: new (id: string, config: Record<string, unknown>) => YouTubeIframePlayer;
      PlayerState: { PLAYING: number; ENDED: number; PAUSED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}
