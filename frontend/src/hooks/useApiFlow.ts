import { useMemo } from "react";
import type {
  PlaygroundFormState,
  RequestPreviewPayload,
  TestJobResponse,
  UploadResponse,
} from "../types/index";
import type { FlowStep, FlowPhase } from "../types/apiFlow";
import { buildRealApiJobPayload } from "./usePlaygroundForm";
import {
  buildPresignCurl,
  buildUploadToR2Curl,
  buildPollUploadCurl,
  buildCreateJobCurl,
  buildPollJobCurl,
} from "../utils/apiFlowCurlBuilder";

interface FileInfo {
  name: string;
  size: number;
  type: string;
}

function stepStatus(stepActive: boolean, stepDone: boolean): FlowStep["status"] {
  if (stepDone) return "completed";
  if (stepActive) return "active";
  return "pending";
}

export function useApiFlow(
  formState: PlaygroundFormState,
  previewPayload: RequestPreviewPayload,
  uploadMetadata: UploadResponse | null,
  fileInfo: FileInfo | null,
  flowPhase: FlowPhase,
  jobResponse: TestJobResponse | null,
  polledJob: TestJobResponse | null,
): { steps: FlowStep[]; activeStep: number } {
  return useMemo(() => {
    const effectiveJob = polledJob ?? jobResponse;
    const isFileMode = formState.source_mode === "file";

    if (!isFileMode) {
      // URL mode — 2 steps
      const createDone = flowPhase === "polling_job" || flowPhase === "completed" || flowPhase === "failed";
      const pollDone = flowPhase === "completed" || flowPhase === "failed";

      const jobBody = { ...previewPayload };
      const createJobCurl = buildCreateJobCurl(jobBody);

      const steps: FlowStep[] = [
        {
          stepNumber: 1,
          title: "Create Transcoding Job",
          description: "Submit a transcoding job with your video URL.",
          method: "POST",
          endpoint: "/api/v1/jobs/",
          authHeader: "X-API-Key: $API_KEY",
          requestBody: jobBody,
          responseBody: effectiveJob
            ? { id: effectiveJob.id, status: effectiveJob.status, output_format: effectiveJob.output_format }
            : null,
          curlCommand: createJobCurl,
          status: stepStatus(flowPhase === "submitting", createDone),
        },
        {
          stepNumber: 2,
          title: "Poll Job Status",
          description: "Poll until the job is completed or failed.",
          method: "GET",
          endpoint: `/api/v1/jobs/${effectiveJob?.id ?? "{job_id}"}`,
          authHeader: "X-API-Key: $API_KEY",
          requestBody: null,
          responseBody: effectiveJob && (pollDone || flowPhase === "polling_job")
            ? {
                id: effectiveJob.id,
                status: effectiveJob.status,
                output_url: effectiveJob.output_url,
                output_size_bytes: effectiveJob.output_size_bytes,
                processing_duration_seconds: effectiveJob.processing_duration_seconds,
              }
            : null,
          curlCommand: buildPollJobCurl(effectiveJob?.id ?? ""),
          status: stepStatus(flowPhase === "polling_job", pollDone),
        },
      ];

      const activeStep = steps.findIndex((s) => s.status === "active");
      return { steps, activeStep: activeStep >= 0 ? activeStep : steps.length - 1 };
    }

    // File mode — 5 steps
    const fname = fileInfo?.name ?? "video.mp4";
    const fsize = fileInfo?.size ?? 0;
    const ftype = fileInfo?.type ?? "video/mp4";

    // Generate a representative upload_id (use part of source_url if available)
    const uploadId = uploadMetadata?.source_url
      ?.split("/")
      .slice(-2, -1)[0] ?? "{upload_id}";

    const phaseIndex: Record<FlowPhase, number> = {
      idle: 0,
      uploading: 1,
      upload_complete: 3,
      submitting: 3,
      polling_job: 4,
      completed: 5,
      failed: 5,
    };
    const currentPhaseIdx = phaseIndex[flowPhase];

    // Step 1: Presign Upload
    const presignRequest = {
      filename: fname,
      file_size_bytes: fsize,
      content_type: ftype,
    };
    const presignDone = currentPhaseIdx > 0;

    // Step 2: Upload to R2
    const uploadDone = currentPhaseIdx > 1;

    // Step 3: Poll Upload Status
    const pollUploadDone = currentPhaseIdx > 2;

    // Step 4: Create Job
    const jobBody = buildRealApiJobPayload(formState, uploadId);
    const createDone = currentPhaseIdx > 3;

    // Step 5: Poll Job Status
    const pollDone = currentPhaseIdx > 4;

    const steps: FlowStep[] = [
      {
        stepNumber: 1,
        title: "Presign Upload",
        description: "Request a presigned URL to upload your video directly to storage.",
        method: "POST",
        endpoint: "/api/v1/uploads/presign",
        authHeader: "X-API-Key: $API_KEY",
        requestBody: presignRequest,
        responseBody: presignDone
          ? { upload_id: uploadId, upload_url: "{presigned_url}", expires_at: "2026-04-08T16:00:00Z" }
          : null,
        curlCommand: buildPresignCurl(fname, fsize, ftype),
        status: stepStatus(currentPhaseIdx === 0 && flowPhase === "uploading", presignDone),
        note: "The playground handles upload internally. This shows the equivalent API step.",
      },
      {
        stepNumber: 2,
        title: "Upload File to Storage",
        description: "Upload your video file directly to R2 using the presigned URL.",
        method: "PUT",
        endpoint: "{presigned_url}",
        authHeader: null,
        requestBody: null,
        responseBody: null,
        curlCommand: buildUploadToR2Curl(ftype),
        status: stepStatus(currentPhaseIdx === 1, uploadDone),
        note: "Binary file upload — the Content-Type must match the presign request.",
      },
      {
        stepNumber: 3,
        title: "Confirm Upload Status",
        description: "Poll until the upload is confirmed as completed.",
        method: "GET",
        endpoint: `/api/v1/uploads/${uploadId}/status`,
        authHeader: "X-API-Key: $API_KEY",
        requestBody: null,
        responseBody: pollUploadDone
          ? { upload_id: uploadId, status: "completed", source_url: uploadMetadata?.source_url ?? "..." }
          : null,
        curlCommand: buildPollUploadCurl(uploadId),
        status: stepStatus(currentPhaseIdx === 2, pollUploadDone),
      },
      {
        stepNumber: 4,
        title: "Create Transcoding Job",
        description: "Create a job using the upload_id from the previous step.",
        method: "POST",
        endpoint: "/api/v1/jobs/",
        authHeader: "X-API-Key: $API_KEY",
        requestBody: jobBody,
        responseBody: effectiveJob
          ? { id: effectiveJob.id, status: effectiveJob.status, output_format: effectiveJob.output_format }
          : null,
        curlCommand: buildCreateJobCurl(jobBody),
        status: stepStatus(flowPhase === "submitting", createDone),
        note: "Use upload_id instead of source_url when you went through the upload flow.",
      },
      {
        stepNumber: 5,
        title: "Poll Job Status",
        description: "Poll until transcoding is completed or failed.",
        method: "GET",
        endpoint: `/api/v1/jobs/${effectiveJob?.id ?? "{job_id}"}`,
        authHeader: "X-API-Key: $API_KEY",
        requestBody: null,
        responseBody: effectiveJob && (pollDone || flowPhase === "polling_job")
          ? {
              id: effectiveJob.id,
              status: effectiveJob.status,
              output_url: effectiveJob.output_url,
              output_size_bytes: effectiveJob.output_size_bytes,
              processing_duration_seconds: effectiveJob.processing_duration_seconds,
            }
          : null,
        curlCommand: buildPollJobCurl(effectiveJob?.id ?? ""),
        status: stepStatus(flowPhase === "polling_job", pollDone),
      },
    ];

    const activeStep = steps.findIndex((s) => s.status === "active");
    return { steps, activeStep: activeStep >= 0 ? activeStep : 0 };
  }, [formState, previewPayload, uploadMetadata, fileInfo, flowPhase, jobResponse, polledJob]);
}
