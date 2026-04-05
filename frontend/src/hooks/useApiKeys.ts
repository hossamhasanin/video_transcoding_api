import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import type { AxiosError } from 'axios'
import type { ApiKey, CreateApiKeyResponse } from '../types'
import api from '../api'

// Cache key — shared between useSWR and useSWRMutation for automatic invalidation
export const API_KEYS_CACHE_KEY = '/keys'

// READ hook
export function useApiKeys() {
  const { data, error, isLoading, mutate } =
    useSWR<ApiKey[], AxiosError>(API_KEYS_CACHE_KEY)
  return { keys: data ?? [], error, isLoading, mutate }
}

// Mutation fetchers
// MutationFetcher: (key, { arg }) => Promise<Data>
const createKeyFetcher = (
  _key: string,
  { arg }: { arg: { name: string } },
) => api.post<CreateApiKeyResponse>('/keys', arg).then((res) => res.data)

const revokeKeyFetcher = (
  _key: string,
  { arg }: { arg: string }, // arg = key id
) => api.delete(`/keys/${arg}`).then((res) => res.data)

// CREATE mutation hook
export function useCreateApiKey() {
  return useSWRMutation<
    CreateApiKeyResponse, // Data returned by mutation
    AxiosError,           // Error type
    string,               // Cache key type
    { name: string }      // Argument type passed to trigger()
  >(API_KEYS_CACHE_KEY, createKeyFetcher)
  // Default revalidate:true → GET /keys cache is re-fetched after trigger() resolves
}

// REVOKE mutation hook
export function useRevokeApiKey() {
  return useSWRMutation<
    void,       // DELETE returns no body
    AxiosError,
    string,
    string      // arg = key id
  >(API_KEYS_CACHE_KEY, revokeKeyFetcher)
}
