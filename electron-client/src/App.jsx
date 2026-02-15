// App.jsx 

import React, { useState, useEffect, useRef } from 'react';
import './App.css'; // Assume basic CSS exists

function App() {
  // Configuration State
  const [config, setConfig] = useState({
    apiUrl: 'http://localhost:8000',
    flServerUrl: 'localhost:8080',
    projectId: '1',
    clientId: 'Hospital_A'
  });
  
  const [csvPath, setCsvPath] = useState('');
  const [logs, setLogs] = useState([]);
  const [isTraining, setIsTraining] = useState(false);
  const logEndRef = useRef(null);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Listen for Electron logs
  useEffect(() => {
    if (window.electron) {
      window.electron.onLog((msg) => {
        setLogs(prev => [...prev, msg]);
      });
    }
  }, []);

  const handleBrowse = async () => {
    const path = await window.electron.selectCsv();
    if (path) setCsvPath(path);
  };

  const handleStart = async () => {
    if (!csvPath) return alert("Please select a dataset first!");
    
    setIsTraining(true);
    setLogs(["🚀 Initializing Client Engine..."]);
    
    await window.electron.startTraining({ 
      ...config, 
      dataPath: csvPath 
    });
  };

  const handleStop = async () => {
    await window.electron.stopTraining();
    setIsTraining(false);
    setLogs(prev => [...prev, "🛑 Training Stopped by User."]);
  };

  return (
    <div className="container">
      <header className="header">
        <h1>🏥 Federated Client</h1>
        <div className={`status-badge ${isTraining ? 'active' : ''}`}>
          {isTraining ? 'Running' : 'Idle'}
        </div>
      </header>

      <div className="grid-layout">
        {/* Left Panel: Configuration */}
        <div className="card config-panel">
          <h3>1. Connection Settings</h3>
          <div className="input-group">
            <label>API URL (FastAPI)</label>
            <input 
              value={config.apiUrl} 
              onChange={e => setConfig({...config, apiUrl: e.target.value})} 
            />
          </div>
          <div className="input-group">
            <label>FL Server URL (Flower)</label>
            <input 
              value={config.flServerUrl} 
              onChange={e => setConfig({...config, flServerUrl: e.target.value})} 
            />
          </div>

          <h3>2. Identity</h3>
          <div className="input-group">
            <label>Client ID</label>
            <input 
              value={config.clientId} 
              onChange={e => setConfig({...config, clientId: e.target.value})} 
            />
          </div>
          <div className="input-group">
            <label>Project ID to Join</label>
            <input 
              type="number"
              value={config.projectId} 
              onChange={e => setConfig({...config, projectId: e.target.value})} 
            />
          </div>

          <h3>3. Data Source</h3>
          <div className="file-picker">
            <input value={csvPath || "No file selected"} readOnly />
            <button onClick={handleBrowse}>Browse CSV</button>
          </div>

          <div className="actions">
            {!isTraining ? (
              <button className="btn-primary" onClick={handleStart}>
                Start Training
              </button>
            ) : (
              <button className="btn-danger" onClick={handleStop}>
                Stop Training
              </button>
            )}
          </div>
        </div>

        {/* Right Panel: Logs */}
        <div className="card log-panel">
          <h3>📜 Execution Logs</h3>
          <div className="log-window">
            {logs.map((log, i) => (
              <div key={i} className="log-line">{log}</div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;