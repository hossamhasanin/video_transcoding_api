// ---------------------------------------------------------------------------
// Domain entities (mirrors backend response shapes)
// ---------------------------------------------------------------------------

export interface User {
  id: string
  email: string
  full_name: string | null
  email_verified: boolean
}

export interface Tokens {
  access_token: string
  refresh_token: string
}

export interface ApiKey {
  id: string
  name: string
  key_prefix: string
  created_at: string        // ISO 8601
}

export interface CreateApiKeyResponse {
  key_value: string         // shown once at creation; not stored
}

export interface UsageStats {
  total_jobs: number
  completed_jobs: number
  failed_jobs: number
  storage_used_bytes: number
  processed_minutes: number
}

// ---------------------------------------------------------------------------
// Auth store interface (also exported from authStore.ts; imported from types
// when needed outside the store module to avoid circular imports)
// ---------------------------------------------------------------------------

export interface AuthState {
  user: User | null
  tokens: Tokens | null
  loading: boolean
  _hasHydrated: boolean
  setHasHydrated: (value: boolean) => void
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName?: string) => Promise<void>
  logout: () => void
  refreshProfile: () => Promise<User | undefined>
  forgotPassword: (email: string) => Promise<unknown>
  resetPassword: (token: string, newPassword: string) => Promise<unknown>
  changePassword: (currentPassword: string, newPassword: string) => Promise<unknown>
  verifyEmail: (token: string) => Promise<unknown>
  resendVerification: () => Promise<unknown>
}

// ---------------------------------------------------------------------------
// Playground entities
// ---------------------------------------------------------------------------

export type SourceMode = "url" | "file"

export interface UploadResponse {
  source_url: string
  filename: string
  size_bytes: number
  content_type: string
}

export type CodecPreset =
  | "ultrafast"
  | "superfast"
  | "veryfast"
  | "faster"
  | "fast"
  | "medium"
  | "slow"
  | "slower"
  | "veryslow"

export interface RenditionState {
  id: string
  name: string
  width: number
  height: number
  video_bitrate: string
  audio_bitrate: string
}

export interface HlsConfigState {
  segment_duration: number
  video_codec_preset: CodecPreset
  video_crf: number
  video_profile: "baseline" | "main" | "high"
  renditions: RenditionState[]
}

export interface PlaygroundFormState {
  source_url: string
  source_mode: SourceMode
  output_format: "mp4" | "hls"
  preset: "tiktok" | "youtube" | "instagram" | null
  generate_subtitles: boolean
  webhook_url: string
  hls_config: HlsConfigState
}

export interface RenditionPayload {
  name: string
  width: number
  height: number
  video_bitrate: string
  audio_bitrate?: string
}

export interface RequestPreviewPayload {
  source_url: string
  output_format?: "mp4" | "hls"
  preset?: "tiktok" | "youtube" | "instagram"
  generate_subtitles?: boolean
  webhook_url?: string
  hls_config?: {
    segment_duration?: number
    video_codec_preset?: string
    video_crf?: number
    video_profile?: string
    renditions?: RenditionPayload[]
  }
}

export interface TestJobResponse {
  id: string
  status: string
  source_url: string
  output_format: string
  output_url: string | null
  error_message: string | null
  preset: string | null
  generate_subtitles: boolean
  webhook_url: string | null
  hls_config: object | null
  subtitle_url: string | null
  source_size_bytes: number | null
  output_size_bytes: number | null
  processing_duration_seconds: number | null
  created_at: string
  updated_at: string
}
