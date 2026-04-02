# Feature Specification: Video Transcoding API

**Feature Branch**: `001-video-transcoding`
**Created**: 2026-04-01
**Status**: Draft
**Input**: User description: "Video Transcoding API — Project Specification..."

## Clarifications

### Session 2026-04-01

- Q: Where will output transcoded files be stored for the user to retrieve? → A: Outputs are uploaded temporarily to Cloudflare R2 for 24 hours for customer download, unless the customer provides their own S3 or R2 credentials for direct upload.
- Q: Is there a maximum concurrency limit allowed per customer account? → A: Queued limit; excess jobs are accepted but remain "pending" until capacity is available.
- Q: What is the default maximum file size limit for input videos? → A: Medium (up to 5GB) - Standard web delivery.
- Q: What is the expected behavior if a processing node fails or crashes mid-transcode? → A: Auto-retry: Re-queue the job automatically (e.g., up to 3 times) before marking it as permanently failed.
- Q: How will the system authenticate outbound webhooks for developers? → A: HMAC Signatures: We cryptographically sign the webhook payload and include a signature header for verification.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Submit and Transcode Video (Priority: P1)
As a developer, I want to submit a video file and specify its desired output format, resolution, and quality so that I can prepare media for my application without managing complex tools.

**Why this priority**: Core value proposition. Without this, the system does nothing.

**Independent Test**: Send a video URL and output parameters; verify the resulting file matches requested configuration.

**Acceptance Scenarios**:

1. **Given** a valid video URL, **When** the developer requests an MP4 1080p output, **Then** the system queues the processing job and returns a tracking ID.
2. **Given** an invalid input format, **When** requested, **Then** the system rejects the task with a clear error.

---

### User Story 2 - Social Media Smart Presets (Priority: P2)
As a developer building creator tools, I want to use smart presets (like "tiktok" or "youtube") so I can instantly get optimized videos without understanding bitrates or codecs.

**Why this priority**: Simplifies integration and reduces friction for the target audience.

**Independent Test**: Request a transcode using the 'tiktok' preset; verify the output is a 9:16 format video.

**Acceptance Scenarios**:

1. **Given** a landscape video, **When** transcoded with the 'tiktok' preset, **Then** the system outputs a fully optimized portrait video.

---

### User Story 3 - Adaptive Streaming Generation (Priority: P3)
As an educational or streaming platform developer, I want to request HLS output so I can deliver adaptive quality playback that adjusts to my user's internet speed.

**Why this priority**: Essential for modern video platforms serving diverse audiences.

**Independent Test**: Request HLS format; verify the output is a master playlist and valid segment files.

**Acceptance Scenarios**:

1. **Given** a high-quality video, **When** requested to convert to HLS, **Then** the system produces a master playlist and multi-bitrate segmented streams.

---

### User Story 4 - Asynchronous Webhooks and Job Tracking (Priority: P4)
As a system integrator, I want my application to receive a webhook when a job completes or fails, so I do not have to continuously poll for status.

**Why this priority**: Ensures scalable architecture on the client side.

**Independent Test**: Trigger a job with a webhook URL; verify the endpoint receives a valid JSON payload when the transcode finishes.

**Acceptance Scenarios**:

1. **Given** a queued job, **When** it completes successfully, **Then** the system sends a payload containing the final URL and metadata to the registered webhook.
2. **Given** a failing delivery, **When** the developer's webhook is unreachable, **Then** the system retries delivery with exponential backoff up to 3 times.

---

### User Story 5 - Automated Subtitles (Priority: P5)
As a content app builder, I want to automatically generate subtitles from transcoded videos so they are accessible by default.

**Why this priority**: A highly sought-after capability that provides immense edge value.

**Independent Test**: Request subtitle generation; verify the system returns accurate captions.

**Acceptance Scenarios**:

1. **Given** a video with spoken language, **When** requested, **Then** the system detects the language and generates a synchronized caption file.

---

### User Story 6 - Developer Dashboard & API Keys (Priority: P6)
As a customer, I want to manage my API keys and track my processing usage via a dashboard so I can monitor costs and active plans.

**Why this priority**: Needed for onboarding, usage management, and billing.

**Independent Test**: Log into the web dashboard; verify ability to create, revoke keys, and see usage stats.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they visit the dashboard, **Then** they see their monthly transcoded minutes, job count, and active API keys.

### Edge Cases

- What happens if the input URL points to a file exceeding the 5GB limit? The system must preemptively check file sizes before download and reject safely.
- How does the system handle video files that are corrupt or contain unsupported patterns? The system must mark the job as failed with a descriptive error.
- What if the customer's webhook server is constantly returning 500 errors? The system aborts after defined retry attempts.
- What if a user attempts a transcode with an expired or revoked API key? The request must be rejected instantly with a 401 Unauthorized status.
- What if a user submits more concurrent jobs than their plan allows? Excess jobs are accepted but remain in a "pending" queue until concurrency capacity becomes available.
- What happens if a processing node fails or crashes mid-task? The system will automatically re-queue and retry the job up to 3 times before failing the job permanently.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow developers to trigger transcoding jobs with custom parameters via API.
- **FR-002**: System MUST process jobs asynchronously, providing job tracking IDs immediately.
- **FR-003**: System MUST offer pre-configured smart presets for social media platforms.
- **FR-004**: System MUST support creating multi-bitrate HLS streams.
- **FR-005**: System MUST allow securely uploading source videos via pre-signed direct upload URLs.
- **FR-006**: System MUST deliver POST webhooks informing clients of job success or failure.
- **FR-007**: System MUST cryptographically sign outbound webhooks using HMAC so that clients can securely verify origin.
- **FR-008**: System MUST be able to extract periodic or specific timestamps as thumbnails.
- **FR-009**: System MUST support automatic subtitle generation and language detection.
- **FR-010**: System MUST meter usage (duration processed, storage used) per user account.
- **FR-011**: System MUST provide a secure dashboard for users to view usage and manage API credentials.
- **FR-012**: System MUST store output files temporarily in Cloudflare R2 with a 24-hour retention period and provide temporary download links, OR directly upload final outputs to customer-provided S3/R2 buckets.

### Key Entities

- **Customer/User**: Represents the account owner, their billing tier, and usage metrics.
- **API Key**: Represents a secure token mapped to a Customer, used to authenticate requests.
- **Job**: Represents an asynchronous media processing task, tracking its state, final assets, and error details.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of API requests to create new jobs return a success code and tracking ID in under 200ms.
- **SC-002**: Transcode speeds average at least 1x real-time (1 minute video processed in ~1 minute).
- **SC-003**: System handles payload errors gracefully without leaking environment infrastructure limits.
- **SC-004**: Non-technical stakeholders can understand the dashboard usage metrics without assistance.

## Assumptions

- Target users are developers who understand how to handle async tasks and webhooks.
- Only standard, modern input video formats are supported in the MVP.
- All interactions with the API are served over secure connections exclusively.
