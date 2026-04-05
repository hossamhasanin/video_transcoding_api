import React, { useState } from 'react'
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
    <div className="bg-white p-5 rounded-lg shadow-card">
      {error && (
        <div className="bg-danger-bg text-danger-text p-2.5 rounded mb-5">
          {getErrorMessage(error, 'Something went wrong while loading API keys.')}
        </div>
      )}

      {createdKey && (
        <div className="bg-success-bg text-success-text p-2.5 rounded mb-5">
          <strong>New API Key Created!</strong> Please copy it now — you won&apos;t be able to see it again:
          <br />
          <code className="break-all">{createdKey}</code>
          <button className="ml-2.5" onClick={() => setCreatedKey(null)}>Dismiss</button>
        </div>
      )}

      <form onSubmit={handleCreate} className="flex gap-2.5 mb-5">
        <input
          type="text"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          placeholder="New Key Name (e.g., Production, Staging)"
          required
          className="p-2 border border-[#ddd] rounded flex-1"
        />
        <button
          type="submit"
          disabled={isMutating}
          className={`px-4 py-2 bg-brand text-white border-none rounded ${isMutating ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {isCreating ? 'Creating...' : 'Create Key'}
        </button>
      </form>

      {isLoading ? (
        <p>Loading API keys...</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#f8f9fa] text-left">
              <th className="p-3 border-b border-[#ddd]">Name</th>
              <th className="p-3 border-b border-[#ddd]">Prefix</th>
              <th className="p-3 border-b border-[#ddd]">Created</th>
              <th className="p-3 border-b border-[#ddd]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id}>
                <td className="p-3 border-b border-[#ddd]">{k.name}</td>
                <td className="p-3 border-b border-[#ddd]"><code>{k.key_prefix}...</code></td>
                <td className="p-3 border-b border-[#ddd]">{new Date(k.created_at).toLocaleDateString()}</td>
                <td className="p-3 border-b border-[#ddd]">
                  <button
                    onClick={() => handleRevoke(k.id)}
                    disabled={isMutating}
                    className={`px-3 py-1.5 bg-danger text-white border-none rounded ${isMutating ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {isRevoking ? 'Revoking...' : 'Revoke'}
                  </button>
                </td>
              </tr>
            ))}
            {keys.length === 0 && (
              <tr>
                <td colSpan={4} className="p-3 text-center text-[#666]">No API keys yet. Create one to get started.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default ApiKeyManager
