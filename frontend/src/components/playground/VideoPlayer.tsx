import React, { useRef, useEffect, useState, useCallback } from "react";
import Hls from "hls.js";
import type { Level } from "hls.js";
import { useAuthStore } from "../../store/authStore";

const API_BASE =
  import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

interface VideoPlayerProps {
  jobId: string;
  outputFormat: "mp4" | "hls";
  subtitleUrl?: string | null;
}

function buildStreamUrl(jobId: string, filePath: string): string {
  const tokens = useAuthStore.getState().tokens;
  const token = tokens?.access_token ?? "";
  return `${API_BASE}/playground/stream/${jobId}/${filePath}?token=${encodeURIComponent(token)}`;
}

function VideoPlayer({
  jobId,
  outputFormat,
  subtitleUrl,
}: VideoPlayerProps): React.ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [levels, setLevels] = useState<Level[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1);

  const handleLevelChange = useCallback((level: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level;
      setCurrentLevel(level);
    }
    setShowQualityMenu(false);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (outputFormat === "hls") {
      const manifestUrl = buildStreamUrl(jobId, "master.m3u8");
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
        });
        hlsRef.current = hls;
        hls.loadSource(manifestUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
          setLevels(data.levels);
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, () => {
          setCurrentLevel(hls.currentLevel);
        });

        return () => {
          hls.destroy();
          hlsRef.current = null;
        };
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = manifestUrl;
      }
    } else {
      video.src = buildStreamUrl(jobId, "output.mp4");
    }
  }, [jobId, outputFormat]);

  const subtitleProxyUrl =
    subtitleUrl && jobId ? buildStreamUrl(jobId, "subtitles.vtt") : null;

  return (
    <div className="relative">
      <div className="bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full rounded-lg"
          controls
          crossOrigin="anonymous"
        >
          {subtitleProxyUrl && (
            <track
              kind="subtitles"
              src={subtitleProxyUrl}
              srcLang="en"
              label="English"
              default
            />
          )}
        </video>
      </div>

      {outputFormat === "hls" && levels.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowQualityMenu(!showQualityMenu)}
            className="absolute top-2 right-2 px-2 py-1 text-xs font-medium bg-black/70 text-white rounded hover:bg-black/90 transition-colors cursor-pointer z-10"
          >
            {currentLevel === -1
              ? "Auto"
              : `${levels[currentLevel]?.height ?? "Auto"}p`}
          </button>

          {showQualityMenu && (
            <div className="absolute top-8 right-2 bg-black/90 rounded-lg p-1.5 min-w-[100px] shadow-lg z-20">
              <button
                type="button"
                onClick={() => handleLevelChange(-1)}
                className={`w-full text-left px-3 py-1.5 text-xs rounded transition-colors cursor-pointer ${
                  currentLevel === -1
                    ? "text-accent font-semibold bg-white/10"
                    : "text-white hover:bg-white/10"
                }`}
              >
                Auto
              </button>
              {levels.map((level, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleLevelChange(index)}
                  className={`w-full text-left px-3 py-1.5 text-xs rounded transition-colors cursor-pointer ${
                    currentLevel === index
                      ? "text-accent font-semibold bg-white/10"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  {level.height}p
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default VideoPlayer;
