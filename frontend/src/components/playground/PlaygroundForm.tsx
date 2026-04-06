import React from "react";
import type {
  PlaygroundFormState,
  HlsConfigState,
  CodecPreset,
} from "../../types/index";
import HlsRenditionEditor from "./HlsRenditionEditor";

interface PlaygroundFormProps {
  state: PlaygroundFormState;
  setField: <K extends keyof Omit<PlaygroundFormState, "hls_config">>(
    field: K,
    value: PlaygroundFormState[K],
  ) => void;
  setHlsField: <K extends keyof Omit<HlsConfigState, "renditions">>(
    field: K,
    value: HlsConfigState[K],
  ) => void;
  addRendition: (rendition: PlaygroundFormState["hls_config"]["renditions"][number]) => void;
  editRendition: (
    id: string,
    updates: Partial<Omit<PlaygroundFormState["hls_config"]["renditions"][number], "id">>,
  ) => void;
  removeRendition: (id: string) => void;
  onSubmit: () => void;
  submitting: boolean;
}

const PRESETS = [
  { value: null, label: "None" },
  { value: "tiktok" as const, label: "TikTok" },
  { value: "youtube" as const, label: "YouTube" },
  { value: "instagram" as const, label: "Instagram" },
];

const CODEC_PRESETS: CodecPreset[] = [
  "ultrafast",
  "superfast",
  "veryfast",
  "faster",
  "fast",
  "medium",
  "slow",
  "slower",
  "veryslow",
];

const VIDEO_PROFILES = ["baseline", "main", "high"] as const;

function PlaygroundForm({
  state,
  setField,
  setHlsField,
  addRendition,
  editRendition,
  removeRendition,
  onSubmit,
  submitting,
}: PlaygroundFormProps): React.ReactElement {
  const showHls = state.output_format === "hls";
  const hls = state.hls_config;

  const sourceUrlError =
    state.source_url.length > 0 &&
    !/^https?:\/\/.+/.test(state.source_url)
      ? "Enter a valid URL (e.g. https://example.com/video.mp4)"
      : null;

  const canSubmit =
    state.source_url.length > 0 && !sourceUrlError && !submitting;

  return (
    <div className="space-y-6">
      {/* Source URL */}
      <div>
        <label
          htmlFor="source_url"
          className="block text-sm font-semibold mb-1.5 text-[#333]"
        >
          Source URL
        </label>
        <input
          id="source_url"
          type="url"
          value={state.source_url}
          onChange={(e) => setField("source_url", e.target.value)}
          placeholder="https://example.com/video.mp4"
          className={`w-full p-2.5 border rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand ${
            sourceUrlError ? "border-danger" : "border-pg-border"
          }`}
        />
        {sourceUrlError && (
          <p className="mt-1 text-xs text-danger">{sourceUrlError}</p>
        )}
      </div>

      {/* Output Format */}
      <div>
        <label className="block text-sm font-semibold mb-1.5 text-[#333]">
          Output Format
        </label>
        <div className="flex gap-2">
          {(["mp4", "hls"] as const).map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => setField("output_format", fmt)}
              className={`px-4 py-2 rounded text-sm font-medium border transition-colors ${
                state.output_format === fmt
                  ? "bg-brand text-white border-brand"
                  : "bg-white text-[#333] border-pg-border hover:bg-gray-50"
              }`}
            >
              {fmt.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* HLS Configuration — conditionally rendered */}
      {showHls && (
        <div className="space-y-5 border border-pg-border rounded-lg p-4 bg-gray-50/50">
          <h3 className="text-sm font-semibold text-[#333]">HLS Configuration</h3>

          {/* Segment Duration */}
          <div>
            <label
              htmlFor="segment_duration"
              className="block text-sm font-medium mb-1 text-[#333]"
            >
              Segment Duration:{" "}
              <span className="text-brand font-semibold">
                {hls.segment_duration}s
              </span>
            </label>
            <input
              id="segment_duration"
              type="range"
              min={2}
              max={30}
              step={1}
              value={hls.segment_duration}
              onChange={(e) =>
                setHlsField("segment_duration", Number(e.target.value))
              }
              className="w-full accent-brand"
            />
            <div className="flex justify-between text-xs text-muted mt-0.5">
              <span>2s</span>
              <span>30s</span>
            </div>
          </div>

          {/* Codec Preset */}
          <div>
            <label
              htmlFor="codec_preset"
              className="block text-sm font-medium mb-1 text-[#333]"
            >
              Codec Preset
            </label>
            <select
              id="codec_preset"
              value={hls.video_codec_preset}
              onChange={(e) =>
                setHlsField("video_codec_preset", e.target.value as CodecPreset)
              }
              className="w-full p-2.5 border border-pg-border rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            >
              {CODEC_PRESETS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* CRF */}
          <div>
            <label
              htmlFor="video_crf"
              className="block text-sm font-medium mb-1 text-[#333]"
            >
              CRF Quality:{" "}
              <span className="text-brand font-semibold">{hls.video_crf}</span>
            </label>
            <input
              id="video_crf"
              type="range"
              min={0}
              max={51}
              step={1}
              value={hls.video_crf}
              onChange={(e) =>
                setHlsField("video_crf", Number(e.target.value))
              }
              className="w-full accent-brand"
            />
            <div className="flex justify-between text-xs text-muted mt-0.5">
              <span>0 (best)</span>
              <span>51 (smallest)</span>
            </div>
          </div>

          {/* Video Profile */}
          <div>
            <label
              htmlFor="video_profile"
              className="block text-sm font-medium mb-1 text-[#333]"
            >
              Video Profile
            </label>
            <select
              id="video_profile"
              value={hls.video_profile}
              onChange={(e) =>
                setHlsField(
                  "video_profile",
                  e.target.value as HlsConfigState["video_profile"],
                )
              }
              className="w-full p-2.5 border border-pg-border rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            >
              {VIDEO_PROFILES.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Renditions */}
          <HlsRenditionEditor
            renditions={hls.renditions}
            onAdd={addRendition}
            onEdit={editRendition}
            onRemove={removeRendition}
          />
        </div>
      )}

      {/* Preset */}
      <div>
        <label
          htmlFor="preset"
          className="block text-sm font-semibold mb-1.5 text-[#333]"
        >
          Preset
        </label>
        <select
          id="preset"
          value={state.preset ?? ""}
          onChange={(e) =>
            setField(
              "preset",
              (e.target.value || null) as PlaygroundFormState["preset"],
            )
          }
          className="w-full p-2.5 border border-pg-border rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
        >
          {PRESETS.map((p) => (
            <option key={p.label} value={p.value ?? ""}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* Subtitle Toggle */}
      <div className="flex items-center justify-between">
        <label
          htmlFor="generate_subtitles"
          className="text-sm font-semibold text-[#333]"
        >
          Generate Subtitles
        </label>
        <button
          id="generate_subtitles"
          type="button"
          role="switch"
          aria-checked={state.generate_subtitles}
          onClick={() =>
            setField("generate_subtitles", !state.generate_subtitles)
          }
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            state.generate_subtitles ? "bg-brand" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              state.generate_subtitles ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Webhook URL */}
      <div>
        <label
          htmlFor="webhook_url"
          className="block text-sm font-semibold mb-1.5 text-[#333]"
        >
          Webhook URL
          <span className="font-normal text-muted ml-1">(optional)</span>
        </label>
        <input
          id="webhook_url"
          type="url"
          value={state.webhook_url}
          onChange={(e) => setField("webhook_url", e.target.value)}
          placeholder="https://hooks.example.com/done"
          className="w-full p-2.5 border border-pg-border rounded bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
        />
      </div>

      {/* Submit Test Job */}
      <div className="pt-2 border-t border-pg-border">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className={`w-full py-2.5 rounded text-sm font-semibold transition-colors cursor-pointer ${
            canSubmit
              ? "bg-brand text-white hover:bg-brand/90"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          {submitting ? "Submitting..." : "Submit Test Job"}
        </button>
      </div>
    </div>
  );
}

export default PlaygroundForm;
