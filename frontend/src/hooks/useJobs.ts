import useSWR from 'swr'
import type { AxiosError } from 'axios'
import type { PaginatedJobResponse } from '../types'

export interface JobFilters {
  status?: string
  output_format?: string
  preset?: string
  created_after?: string
  created_before?: string
}

interface UseJobsOptions {
  filters: JobFilters
  page: number
  pageSize: number
}

export function useJobs({ filters, page, pageSize }: UseJobsOptions) {
  const params = new URLSearchParams()

  if (filters.status) params.set('status', filters.status)
  if (filters.output_format) params.set('output_format', filters.output_format)
  if (filters.preset) params.set('preset', filters.preset)
  if (filters.created_after) params.set('created_after', filters.created_after)
  if (filters.created_before) params.set('created_before', filters.created_before)

  params.set('limit', String(pageSize))
  params.set('offset', String((page - 1) * pageSize))

  const qs = params.toString()
  const key = `/dashboard/jobs${qs ? `?${qs}` : ''}`

  const { data, error, isLoading, mutate } = useSWR<PaginatedJobResponse, AxiosError>(
    key,
    {
      errorRetryCount: 2,
      revalidateOnFocus: false,
    },
  )

  return {
    jobs: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    mutate,
  }
}
