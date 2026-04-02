import React, { useEffect, useState } from 'react';
import axios from 'axios';

function ApiKeyManager({ apiKey }) {
  const [keys, setKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState(null);

  const fetchKeys = () => {
    if (!apiKey) return;
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    axios.get(`${API_URL}/keys`, {
      headers: { 'X-API-Key': apiKey }
    }).then(res => setKeys(res.data)).catch(console.error);
  };

  useEffect(() => {
    fetchKeys();
  }, [apiKey]);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!apiKey || !newKeyName) return;

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    axios.post(`${API_URL}/keys`, { name: newKeyName }, {
      headers: { 'X-API-Key': apiKey }
    }).then(res => {
      setCreatedKey(res.data.key_value);
      setNewKeyName('');
      fetchKeys();
    }).catch(console.error);
  };

  const handleRevoke = (id) => {
    if (!apiKey) return;
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    if (window.confirm("Are you sure you want to revoke this key?")) {
      axios.delete(`${API_URL}/keys/${id}`, {
        headers: { 'X-API-Key': apiKey }
      }).then(() => {
        fetchKeys();
      }).catch(console.error);
    }
  };

  if (!apiKey) return <p>Please authenticate to manage keys.</p>;

  return (
    <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      {createdKey && (
        <div style={{ background: '#d4edda', color: '#155724', padding: '10px', borderRadius: '4px', marginBottom: '20px' }}>
          <strong>New API Key Created!</strong> Please copy it now as you won't be able to see it again: 
          <br />
          <code>{createdKey}</code>
          <button style={{marginLeft:'10px'}} onClick={() => setCreatedKey(null)}>Dismiss</button>
        </div>
      )}

      <form onSubmit={handleCreate} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input 
          type="text" 
          value={newKeyName}
          onChange={e => setNewKeyName(e.target.value)}
          placeholder="New Key Name"
          required
          style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
        />
        <button type="submit" style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Create Key
        </button>
      </form>

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
          {keys.map(k => (
            <tr key={k.id}>
              <td style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>{k.name}</td>
              <td style={{ padding: '12px', borderBottom: '1px solid #ddd' }}><code>{k.key_prefix}...</code></td>
              <td style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>{new Date(k.created_at).toLocaleDateString()}</td>
              <td style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>
                 <button onClick={() => handleRevoke(k.id)} style={{ padding: '6px 12px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    Revoke
                 </button>
              </td>
            </tr>
          ))}
          {keys.length === 0 && (
            <tr>
              <td colSpan="4" style={{ padding: '12px', textAlign: 'center', color: '#666' }}>No API keys found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ApiKeyManager;
