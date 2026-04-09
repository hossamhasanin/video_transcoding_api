import React, { useState } from 'react'
import { Key, AlertCircle, CheckCircle2, X, Plus, Loader2 } from 'lucide-react'
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from '../hooks/useApiKeys'
import { getErrorMessage } from '../utils/http'

function ApiKeyManager(): React.ReactElement {
  const [newKeyName, setNewKeyName] = useState<string>('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)

  const { keys, error: fetchError, isLoading } = useApiKeys()
  const { trigger: triggerCreate, isMutating: isCreating, error: createError } = useCreateApiKey()
  const { trigger: triggerRevoke, isMutating: isRevoking, error: revokeError } = useRevokeApiKey()

  const error = fetchError ?? createError ?? revokeError

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    if (!newKeyName) return

    const data = await triggerCreate({ name: newKeyName })
    if (data) {
      setCreatedKey(data.key_value)
      setNewKeyName('')
    }
  }

  const handleRevoke = (id: string): void => {
    if (window.confirm('Are you sure you want to revoke this key?')) {
      triggerRevoke(id)
    }
  }

  const isMutating = isCreating || isRevoking

  return (
    <div className="bg-surface-raised rounded-xl border border-border p-6">
      {error && (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-5">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{getErrorMessage(error, 'Something went wrong while loading API keys.')}</span>
        </div>
      )}

      {createdKey && (
        <div className="bg-accent-soft border border-accent/20 text-accent p-4 rounded-lg mb-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4" />
            <strong>New API Key Created!</strong>
          </div>
          <p className="text-sm text-text-secondary mb-2">
            Please copy it now — you won&apos;t be able to see it again:
          </p>
          <code className="block break-all bg-white/70 p-2.5 rounded text-sm font-mono text-text-primary">
            {createdKey}
          </code>
          <button
            className="flex items-center gap-1 mt-3 text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            onClick={() => setCreatedKey(null)}
          >
            <X className="w-3.5 h-3.5" />
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleCreate} className="flex gap-2.5 mb-6">
        <input
          type="text"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          placeholder="New Key Name (e.g., Production, Staging)"
          required
          className="p-2.5 border border-border rounded-lg flex-1 text-sm
                     focus:ring-2 focus:ring-accent focus:border-accent outline-none
                     placeholder:text-text-tertiary"
        />
        <button
          type="submit"
          disabled={isMutating}
          className={`flex items-center gap-1.5 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white
                      rounded-lg text-sm font-medium transition-colors
                      ${isMutating ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Create Key
            </>
          )}
        </button>
      </form>

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-text-secondary">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading API keys...
        </div>
      ) : (
        <div className="divide-y divide-border-subtle">
          {keys.map((k) => (
            <div
              key={k.id}
              className="flex items-center justify-between py-3.5 first:pt-0 last:border-b-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-accent-soft flex items-center justify-center shrink-0">
                  <Key className="w-4 h-4 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{k.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs bg-accent-soft text-accent rounded px-2 py-0.5">
                      {k.key_prefix}...
                    </span>
                    <span className="text-xs text-text-tertiary">
                      Created {new Date(k.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleRevoke(k.id)}
                disabled={isMutating}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors
                           bg-red-50 text-red-600 hover:bg-red-100 border border-red-200
                           ${isMutating ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {isRevoking ? 'Revoking...' : 'Revoke'}
              </button>
            </div>
          ))}
          {keys.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-text-tertiary">
              <Key className="w-8 h-8 mb-2" />
              <p className="text-sm">No API keys yet. Create one to get started.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ApiKeyManager
