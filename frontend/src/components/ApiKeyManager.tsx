import React, { useState } from 'react'
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from '../hooks/useApiKeys'

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
    <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      {error && (
        <div style={{ background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '4px', marginBottom: '20px' }}>
          {(error as any).response?.data?.detail ?? error.message}
        </div>
      )}

      {createdKey && (
        <div style={{ background: '#d4edda', color: '#155724', padding: '10px', borderRadius: '4px', marginBottom: '20px' }}>
          <strong>New API Key Created!</strong> Please copy it now — you won&apos;t be able to see it again:
          <br />
          <code style={{ wordBreak: 'break-all' }}>{createdKey}</code>
          <button style={{ marginLeft: '10px' }} onClick={() => setCreatedKey(null)}>Dismiss</button>
        </div>
      )}

      <form onSubmit={handleCreate} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          placeholder="New Key Name (e.g., Production, Staging)"
          required
          style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', flex: 1 }}
        />
        <button
          type="submit"
          disabled={isMutating}
          style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: isMutating ? 'not-allowed' : 'pointer' }}
        >
          {isCreating ? 'Creating...' : 'Create Key'}
        </button>
      </form>

      {isLoading ? (
        <p>Loading API keys...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', textAlign: 'left' }}>
              <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>Name</th>
              <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>Prefix</th>
              <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>Created</th>
              <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id}>
                <td style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>{k.name}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #ddd' }}><code>{k.key_prefix}...</code></td>
                <td style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>{new Date(k.created_at).toLocaleDateString()}</td>
                <td style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>
                  <button
                    onClick={() => handleRevoke(k.id)}
                    disabled={isMutating}
                    style={{ padding: '6px 12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: isMutating ? 'not-allowed' : 'pointer' }}
                  >
                    {isRevoking ? 'Revoking...' : 'Revoke'}
                  </button>
                </td>
              </tr>
            ))}
            {keys.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '12px', textAlign: 'center', color: '#666' }}>No API keys yet. Create one to get started.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default ApiKeyManager
