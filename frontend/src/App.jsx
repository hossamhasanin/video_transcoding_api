import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import './index.css';

function App() {
  const [apiKey, setApiKey] = useState('');

  return (
    <Router>
      <div className="layout">
        <nav className="sidebar">
          <h2>TranscodeFlow</h2>
          <div className="auth-section">
            <label>API Key (for auth)</label>
            <input 
              type="password" 
              value={apiKey} 
              onChange={e => setApiKey(e.target.value)} 
              placeholder="Enter your API Key"
            />
          </div>
          <ul>
            <li><Link to="/">Dashboard</Link></li>
          </ul>
        </nav>
        <main className="content">
          <Routes>
            <Route path="/" element={<Dashboard apiKey={apiKey} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
