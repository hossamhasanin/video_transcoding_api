/**
 * Types for the multi-step API flow shown in the playground.
 * These represent the real production API flow a developer would integrate with.
 */

export type FlowStepStatus = "pending" | "active" | "completed" | "error";

export type FlowPhase =
  | "idle"
  | "uploading"
  | "upload_complete"
  | "submitting"
  | "polling_job"
  | "completed"
  | "failed";

export interface FlowStep {
  stepNumber: number;
  title: string;
  description: string;
  method: "POST" | "PUT" | "GET";
  endpoint: string;
  authHeader: string | null; // e.g. "X-API-Key: $API_KEY" or null
  requestBody: object | null;
  responseBody: object | null;
  curlCommand: string;
  status: FlowStepStatus;
  note?: string;
}
