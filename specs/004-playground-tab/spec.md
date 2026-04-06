# Feature Specification: Playground Tab

**Feature Branch**: `004-playground-tab`  
**Created**: 2026-04-06  
**Status**: Draft  
**Input**: User description: "Create a new playground tab in the dashboard where developers can interactively test all transcoding platform features through a visual UI, configure jobs, and see the corresponding API request shape in real time."

## Clarifications

### Session 2026-04-06

- Q: How should the playground authenticate test job submission — session auth (backend auto-selects API key), API key dropdown, or bearer token to existing endpoint? → A: Use session auth; backend auto-selects an API key behind the scenes. The request preview UI always shows the canonical `POST /api/v1/jobs` with `X-API-Key: $API_KEY` header placeholder so developers learn the real integration pattern.
- Q: How should the Playground page layout be organized — side-by-side, stacked vertical, or tabbed? → A: Side-by-side split pane: configuration form on the left (~55% width), live request preview on the right (~45% width), both panels independently scrollable.
- Q: What base URL should the request preview and cURL command display? → A: Dynamic — use the environment's actual API URL from `VITE_API_URL` so the generated cURL command works out of the box in the developer's current environment.
- Q: Should the JSON preview include syntax highlighting, and should copy support additional language snippets beyond cURL? → A: Syntax-highlighted JSON preview; copy as cURL + raw JSON only. Additional language snippets (Python, Node.js) deferred to future enhancement.
- Q: Where should the server response appear after submitting a test job? → A: Response replaces request preview in the right panel, with a Request/Response tab toggle to switch between views.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure and Preview a Transcoding Job (Priority: P1)

A developer navigates to the "Playground" tab in the dashboard sidebar. They are presented with an intuitive form that lets them configure a transcoding job — choosing output format (MP4 or HLS), selecting a social-media preset (TikTok, YouTube, Instagram), toggling subtitle generation, and optionally entering a source video URL and webhook URL. As they adjust each option, a live "API Request Preview" panel updates instantly, showing the exact JSON payload that would be sent to `POST /api/v1/jobs`. This lets the developer understand the API contract before writing any integration code.

**Why this priority**: This is the core value proposition — developers can visually explore every configuration option and understand exactly how to structure their API calls, reducing onboarding friction and support load.

**Independent Test**: Can be fully tested by navigating to the Playground tab, adjusting form controls, and verifying the live request preview updates correctly with every change.

**Acceptance Scenarios**:

1. **Given** the developer is authenticated and on the dashboard, **When** they click the "Playground" navigation link, **Then** they see the Playground page with a job configuration form and a live request preview panel.
2. **Given** the developer is on the Playground page, **When** they select "HLS" as the output format, **Then** the request preview JSON updates to show `"output_format": "hls"` and additional HLS configuration options appear in the form.
3. **Given** the developer selects a preset (e.g., "tiktok"), **When** they look at the request preview, **Then** `"preset": "tiktok"` is reflected in the JSON.
4. **Given** the developer toggles "Generate Subtitles" on, **When** they look at the request preview, **Then** `"generate_subtitles": true` appears in the JSON payload.
5. **Given** the developer has not entered a source URL, **When** they look at the request preview, **Then** a placeholder value (e.g., `"https://example.com/video.mp4"`) is shown to demonstrate the field.

---

### User Story 2 - Configure HLS-Specific Options (Priority: P2)

When a developer selects "HLS" as the output format, additional HLS configuration controls appear: segment duration (slider or input, 2–30 seconds), video codec preset dropdown (ultrafast through veryslow), CRF quality slider (0–51), video profile selection (baseline, main, high), and the ability to add/remove custom renditions (name, width, height, video bitrate, audio bitrate). The request preview dynamically reflects the full `hls_config` object including any custom renditions.

**Why this priority**: HLS is the most complex configuration surface and the area where developers benefit most from visual guidance.

**Independent Test**: Can be tested by selecting HLS output format, adjusting each HLS sub-option, adding/removing renditions, and verifying the nested `hls_config` object in the request preview updates correctly.

**Acceptance Scenarios**:

1. **Given** the developer selects "HLS" output format, **When** they adjust the segment duration to 6 seconds, **Then** the preview shows `"segment_duration": 6` inside the `hls_config` object.
2. **Given** the developer is configuring HLS, **When** they add a rendition with name "720p", width 1280, height 720, video bitrate "2500k", **Then** the rendition appears in the `hls_config.renditions` array in the preview.
3. **Given** the developer has added two renditions, **When** they remove one, **Then** the preview array updates to show only the remaining rendition.
4. **Given** the developer changes CRF to 18 and preset to "slow", **When** they look at the preview, **Then** `"video_crf": 18` and `"video_codec_preset": "slow"` appear in the `hls_config`.

---

### User Story 3 - Copy Request as cURL or Code Snippet (Priority: P3)

The developer clicks a "Copy" button on the request preview panel to copy the full API request as a ready-to-use cURL command or raw JSON payload to their clipboard. This lets them immediately paste and execute the request from their terminal or integrate the snippet into their application code.

**Why this priority**: Adds high convenience value by bridging the gap between visual exploration and actual API usage, but the core visual preview (P1) must work first.

**Independent Test**: Can be tested by configuring options, clicking "Copy as cURL," pasting into a terminal, and verifying the command is valid and matches the configuration.

**Acceptance Scenarios**:

1. **Given** the developer has configured a job in the Playground, **When** they click "Copy as cURL", **Then** a valid cURL command (including the correct endpoint, headers, and JSON body) is copied to their clipboard.
2. **Given** the developer clicks "Copy JSON", **When** they paste it, **Then** the raw JSON body matches what was displayed in the preview panel.
3. **Given** the clipboard copy succeeds, **When** the button is clicked, **Then** a brief visual confirmation (e.g., "Copied!") appears.

---

### User Story 4 - Submit a Test Job from the Playground (Priority: P4)

The developer fills in a real source video URL and clicks a "Submit Test Job" button. The playground sends the job to the actual transcoding API using one of their existing API keys, and displays the server response (job ID, status) directly in the playground. For safety, the playground clearly labels this as a live request against their account.

**Why this priority**: Running real jobs from the UI is the ultimate validation experience, but it requires a valid source URL and an API key, so it builds on the earlier stories.

**Independent Test**: Can be tested by entering a valid source URL, submitting the job, and verifying the response shows the new job ID and "pending" status.

**Acceptance Scenarios**:

1. **Given** the developer has entered a valid source URL and configured job options, **When** they click "Submit Test Job", **Then** the request is sent to the backend and the right panel switches to a "Response" tab displaying the server response (job ID, status).
2. **Given** the developer has no API keys, **When** they try to submit a test job, **Then** a message prompts them to create an API key first.
3. **Given** the submission fails (e.g., invalid URL, rate limited), **When** the server responds with an error, **Then** the error message is displayed clearly in the response panel.
4. **Given** a test job is submitted successfully, **When** the developer views the response, **Then** a callout reminds them that this is a live job counted against their account usage.

---

### Edge Cases

- What happens when the developer enters an invalid URL format in the source URL field? — The form shows inline validation feedback and the "Submit Test Job" button remains disabled.
- What happens when the developer adds duplicate rendition names? — An inline validation error appears indicating rendition names must be unique.
- What happens when the developer changes output format from HLS back to MP4? — The HLS configuration section collapses and the `hls_config` field is removed from the request preview.
- How does the playground handle very long URLs or large configurations? — The request preview panel scrolls and the JSON is properly formatted regardless of length.
- What happens if the user's session expires while using the playground? — Standard auth refresh flow applies; if refresh fails, user is redirected to login and playground state is lost.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST add a "Playground" navigation item in the authenticated dashboard sidebar, positioned after "Dashboard" and before "Settings".
- **FR-002**: System MUST display a job configuration form with controls for: source URL (text input), output format (MP4/HLS toggle or dropdown), social-media preset (TikTok/YouTube/Instagram/None selector), subtitle generation (toggle switch), and webhook URL (optional text input).
- **FR-003**: System MUST display a live "API Request Preview" panel with syntax-highlighted JSON that updates in real time as the developer changes any configuration option, showing the exact JSON body for `POST /api/v1/jobs`.
- **FR-004**: System MUST conditionally show HLS configuration controls (segment duration, codec preset, CRF, video profile, renditions list) only when "HLS" output format is selected.
- **FR-005**: System MUST allow developers to add, edit, and remove HLS renditions, where each rendition has fields for name, width, height, video bitrate, and audio bitrate.
- **FR-006**: System MUST validate that rendition names are unique and display inline error feedback when duplicates are detected.
- **FR-007**: System MUST provide a "Copy as cURL" button that copies a valid cURL command using the environment's API base URL (from `VITE_API_URL`), `X-API-Key: $API_KEY` authorization header placeholder, content-type header, and JSON body to the clipboard. The placeholder `$API_KEY` educates developers on the canonical authentication method.
- **FR-008**: System MUST provide a "Copy JSON" button that copies the raw request body JSON to the clipboard.
- **FR-009**: System MUST display a brief visual confirmation when content is successfully copied to the clipboard.
- **FR-010**: System MUST submit live test jobs via a dedicated backend endpoint (`POST /api/v1/playground/test-job`) authenticated with the user's session token. The backend auto-selects the user's first active API key to create the job. The request preview UI, however, always displays the canonical `POST /api/v1/jobs` with `X-API-Key: $API_KEY` header so developers see the real integration pattern.
- **FR-011**: System MUST display validation errors for invalid source URLs before allowing job submission.
- **FR-012**: System MUST show the API endpoint (using the environment's base URL from `VITE_API_URL`) and HTTP method (`POST`) above the request preview so developers understand the full request context.
- **FR-013**: The Playground page MUST only be accessible to authenticated users (protected route).
- **FR-014**: System MUST omit optional fields set to their default values from the request preview JSON to keep the payload clean and demonstrate minimal required configuration.
- **FR-015**: The Playground page MUST use a side-by-side split-pane layout: configuration form on the left (~55% width) and live request preview on the right (~45% width). Both panels MUST scroll independently.
- **FR-016**: The request preview panel MUST render JSON with syntax highlighting (color-coded keys, strings, numbers, booleans). Copy functionality is limited to "Copy as cURL" and "Copy JSON" for the initial release.
- **FR-017**: After a test job is submitted, the right panel MUST switch to a "Response" tab showing the server response (with syntax-highlighted JSON). A Request/Response tab toggle MUST allow the developer to switch back to the request preview without losing either view.

### Key Entities

- **Job Configuration**: Represents the in-memory state of the playground form — source URL, output format, preset, subtitle generation, webhook URL, and HLS config. This is a transient client-side entity, not persisted.
- **Request Preview**: A derived JSON representation of the Job Configuration, matching the `POST /api/v1/jobs` request body schema.
- **HLS Rendition**: A sub-entity of HLS configuration with name, width, height, video bitrate, and audio bitrate fields.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can configure all supported transcoding options (output format, preset, subtitles, webhook, HLS settings including custom renditions) and see a correctly formatted API request preview within 1 second of any change.
- **SC-002**: The generated cURL command and JSON payload are valid and correctly reflect 100% of the configured options every time.
- **SC-003**: Developers can complete a full playground exploration (configuring all options, copying the request, submitting a test job) in under 5 minutes without external documentation.
- **SC-004**: Zero new regression errors introduced; all existing dashboard functionality continues to work as before.
- **SC-005**: 100% of newly introduced interactive elements have clear labels, tooltips, or descriptions so developers understand each option without guessing.

## Assumptions

- The existing authenticated dashboard sidebar and routing infrastructure will be reused to add the new Playground tab.
- The Playground page is primarily a frontend feature for configuration and preview. Test job submission requires a new lightweight backend endpoint (`POST /api/v1/playground/test-job`) that proxies to the job creation logic using the user's session auth and auto-selected API key.
- Developers have a basic understanding of what transcoding is; the playground does not need to explain video codec fundamentals.
- The playground does not persist configuration state between sessions — it resets to defaults on page refresh.
- Default form values match the backend defaults: output format "mp4", no preset, subtitles off, no webhook URL.
- The existing auth token refresh mechanism handles session expiry during playground usage.
- Mobile-responsive layout is nice-to-have but the primary audience uses desktop browsers.
