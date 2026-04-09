export type ErrorWithDetail = {
  response?: {
    data?: unknown
  }
  message?: string
}

const getResponseDetail = (data: unknown): string | undefined => {
  if (typeof data !== 'object' || data === null || !('detail' in data)) {
    return undefined
  }

  const { detail } = data as { detail?: unknown }

  return typeof detail === 'string' ? detail : undefined
}

export const getErrorMessage = (error: ErrorWithDetail, fallback: string): string => {
  return getResponseDetail(error.response?.data) ?? error.message ?? fallback
}
