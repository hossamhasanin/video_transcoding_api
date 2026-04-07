import useSWR from "swr";
import api from "../api";
import type { TestJobResponse } from "../types/index";

function fetcher(url: string): Promise<TestJobResponse> {
  return api.get<TestJobResponse>(url).then((res) => res.data);
}

export function useJobPolling(jobId: string | null): {
  job: TestJobResponse | null;
  polling: boolean;
  error: string | null;
} {
  const { data, error } = useSWR<TestJobResponse>(
    jobId ? `/playground/test-job/${jobId}` : null,
    fetcher,
    {
      refreshInterval: (data) => {
        if (!data) return 3000;
        if (data.status === "completed" || data.status === "failed") return 0;
        return 3000;
      },
      errorRetryCount: 3,
      revalidateOnFocus: false,
    },
  );

  const polling =
    data !== null &&
    data !== undefined &&
    data.status !== "completed" &&
    data.status !== "failed";

  return { job: data ?? null, polling, error: error?.message ?? null };
}
