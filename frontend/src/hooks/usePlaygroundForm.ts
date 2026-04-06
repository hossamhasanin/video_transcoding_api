import { useReducer, useMemo, useCallback } from "react";
import type {
  PlaygroundFormState,
  HlsConfigState,
  CodecPreset,
  RenditionState,
  RequestPreviewPayload,
  RenditionPayload,
} from "../types/index";

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

const defaultHlsConfig: HlsConfigState = {
  segment_duration: 10,
  video_codec_preset: "fast",
  video_crf: 23,
  video_profile: "high",
  renditions: [],
};

const initialState: PlaygroundFormState = {
  source_url: "",
  output_format: "mp4",
  preset: null,
  generate_subtitles: false,
  webhook_url: "",
  hls_config: defaultHlsConfig,
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type FormAction =
  | { type: "SET_FIELD"; field: keyof Omit<PlaygroundFormState, "hls_config">; value: string | boolean | null }
  | { type: "SET_HLS_FIELD"; field: keyof Omit<HlsConfigState, "renditions">; value: number | string }
  | { type: "ADD_RENDITION"; payload: RenditionState }
  | { type: "EDIT_RENDITION"; id: string; payload: Partial<Omit<RenditionState, "id">> }
  | { type: "REMOVE_RENDITION"; id: string }
  | { type: "RESET" };

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function formReducer(state: PlaygroundFormState, action: FormAction): PlaygroundFormState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };

    case "SET_HLS_FIELD":
      return {
        ...state,
        hls_config: { ...state.hls_config, [action.field]: action.value },
      };

    case "ADD_RENDITION":
      return {
        ...state,
        hls_config: {
          ...state.hls_config,
          renditions: [...state.hls_config.renditions, action.payload],
        },
      };

    case "EDIT_RENDITION":
      return {
        ...state,
        hls_config: {
          ...state.hls_config,
          renditions: state.hls_config.renditions.map((r) =>
            r.id === action.id ? { ...r, ...action.payload } : r,
          ),
        },
      };

    case "REMOVE_RENDITION":
      return {
        ...state,
        hls_config: {
          ...state.hls_config,
          renditions: state.hls_config.renditions.filter((r) => r.id !== action.id),
        },
      };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Default omission helpers
// ---------------------------------------------------------------------------

function buildRenditionPayload(r: RenditionState): RenditionPayload {
  const out: RenditionPayload = {
    name: r.name,
    width: r.width,
    height: r.height,
    video_bitrate: r.video_bitrate,
  };
  if (r.audio_bitrate !== "128k") {
    out.audio_bitrate = r.audio_bitrate;
  }
  return out;
}

function buildPreviewPayload(state: PlaygroundFormState): RequestPreviewPayload {
  const payload: RequestPreviewPayload = {
    source_url: state.source_url || "https://example.com/video.mp4",
  };

  if (state.output_format !== "mp4") {
    payload.output_format = state.output_format;
  }
  if (state.preset !== null) {
    payload.preset = state.preset;
  }
  if (state.generate_subtitles !== false) {
    payload.generate_subtitles = state.generate_subtitles;
  }
  if (state.webhook_url !== "") {
    payload.webhook_url = state.webhook_url;
  }

  if (state.output_format === "hls") {
    const hls = state.hls_config;
    const hlsOut: NonNullable<RequestPreviewPayload["hls_config"]> = {};

    if (hls.segment_duration !== 10) {
      hlsOut.segment_duration = hls.segment_duration;
    }
    if (hls.video_codec_preset !== "fast") {
      hlsOut.video_codec_preset = hls.video_codec_preset;
    }
    if (hls.video_crf !== 23) {
      hlsOut.video_crf = hls.video_crf;
    }
    if (hls.video_profile !== "high") {
      hlsOut.video_profile = hls.video_profile;
    }
    if (hls.renditions.length > 0) {
      hlsOut.renditions = hls.renditions.map(buildRenditionPayload);
    }

    if (Object.keys(hlsOut).length > 0) {
      payload.hls_config = hlsOut;
    }
  }

  return payload;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePlaygroundForm() {
  const [state, dispatch] = useReducer(formReducer, initialState);

  const previewPayload = useMemo(() => buildPreviewPayload(state), [state]);

  const setField = useCallback(
    <K extends keyof Omit<PlaygroundFormState, "hls_config">>(field: K, value: PlaygroundFormState[K]) => {
      dispatch({ type: "SET_FIELD", field, value });
    },
    [],
  );

  const setHlsField = useCallback(
    <K extends keyof Omit<HlsConfigState, "renditions">>(field: K, value: HlsConfigState[K]) => {
      dispatch({ type: "SET_HLS_FIELD", field, value });
    },
    [],
  );

  const addRendition = useCallback((rendition: RenditionState) => {
    dispatch({ type: "ADD_RENDITION", payload: rendition });
  }, []);

  const editRendition = useCallback((id: string, updates: Partial<Omit<RenditionState, "id">>) => {
    dispatch({ type: "EDIT_RENDITION", id, payload: updates });
  }, []);

  const removeRendition = useCallback((id: string) => {
    dispatch({ type: "REMOVE_RENDITION", id });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  return {
    state,
    dispatch,
    previewPayload,
    setField,
    setHlsField,
    addRendition,
    editRendition,
    removeRendition,
    reset,
  };
}

export type { CodecPreset };
