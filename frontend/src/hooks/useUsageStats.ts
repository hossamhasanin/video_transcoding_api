import useSWR from 'swr'
import type { AxiosError } from 'axios'
import type { UsageStats } from '../types'

export function useUsageStats() {
  const { data, error, isLoading } = useSWR<UsageStats, AxiosError>('/usage', {
    errorRetryCount: 2,
    revalidateOnFocus: false,
  })
  return { stats: data, error, isLoading }
}
