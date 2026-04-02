# Data Model: Video Transcoding API

## Entities & Relationships

### `User` (Customer)
Represents the account owner, billing tier, and usage metrics.
- **Fields**:
  - `id` (UUID, PK)
  - `name` (String)
  - `email` (String, Unique)
  - `password` (String)
  - `subscription_tier_id` (UUID, FK -> valid tier with concurrency/storage limits)
  - `minutes_used_this_month` (Integer)
  - `storage_used_bytes` (BigInt)
  - `created_at`, `updated_at` (Timestamp)
- **Relationships**:
  - Has many `ApiKeys`
  - Has many `Jobs`

### `ApiKey`
Represents a secure token used to authenticate API requests via the developer dashboard.
- **Fields**:
  - `id` (UUID, PK)
  - `user_id` (UUID, FK)
  - `name` (String)
  - `key` (String, Unique, Hashed/Securely stored like passwords, returning plain once upon creation)
  - `last_used_at` (Timestamp, nullable)
  - `revoked_at` (Timestamp, nullable)
  - `created_at`, `updated_at` (Timestamp)
- **Relationships**:
  - Belongs to `User`

### `Job`
Represents an asynchronous media processing task, tracking its parameters, execution state, and output.
- **Fields**:
  - `id` (UUID, PK)
  - `tracking_id` (String, Indexed) - external facing ID returned upon task submission.
  - `user_id` (UUID, FK)
  - `status` (Enum: `pending`, `processing`, `completed`, `failed`)
  - `input_url` (String, nullable if direct upload used)
  - `input_type` (Enum: `url`, `upload`)
  - `file_size_bytes` (BigInt, nullable initially, checked <= 5GB limit)
  - `preset` (String, nullable: e.g. `tiktok`, `youtube`)
  - `output_format` (String, nullable: `mp4`, `hls`)
  - `parameters` (JSON) - e.g. resolution, bitrates, generate_subtitles.
  - `webhook_url` (String, nullable) - Where to send the final result payload.
  - `output_url_temp` (String, nullable) - Temporary Cloudflare R2 link, valid for 24 hours.
  - `error_message` (Text, nullable)
  - `started_at` (Timestamp, nullable)
  - `completed_at` (Timestamp, nullable)
  - `created_at`, `updated_at` (Timestamp)
- **Relationships**:
  - Belongs to `User`
- **State Transitions**:
  - `pending` -> `processing`
  - `processing` -> `completed`
  - `processing` -> `failed`

## Validation Rules & Constants
- `MAX_FILE_SIZE_BYTES`: 5,368,709,120 (5GB)
- Maximum retry attempts per job: 3
- Output file retention period: 24 hours (implemented via Cloudflare R2 bucket lifecycle rules).
