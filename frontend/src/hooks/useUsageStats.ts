import useSWR from 'swr'
import type { AxiosError } from 'axios'
import type { UsageStats } from '../types'

export function useUsageStats() {
  const { data, error, isLoading } = useSWR<UsageStats, AxiosError>('/usage')
  return { stats: data, error, isLoading }
}
