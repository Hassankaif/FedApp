import React, { useState, useEffect } from 'react';

const containerStyle = { padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' };
const inputStyle = { display: 'block', width: '100%', padding: '10px', marginBottom: '10px' };
const logStyle = { background: '#222', color: '#0f0', padding: '15px', height: '300px', overflowY: 'scroll', borderRadius: '5px', fontFamily: 'monospace' };

function App() {
  const [projectId, setProjectId] = useState('');
  const [clientId, setClientId] = useState('');
  const [csvPath, setCsvPath] = useState('');
  const [logs, setLogs] = useState([]);
  const [isTraining, setIsTraining] = useState(false);

  useEffect(() => {
    // Listen for logs from Python
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
    if (!projectId || !clientId || !csvPath) return alert("Please fill all fields!");
    setIsTraining(true);
    setLogs(["🚀 Initializing Client Engine..."]);
    await window.electron.startTraining({ projectId, clientId, dataPath: csvPath });
  };

  const handleStop = async () => {
    await window.electron.stopTraining();
    setIsTraining(false);
    setLogs(prev => [...prev, "🛑 Training Stopped."]);
  };

  return (
    <div style={containerStyle}>
      <h1>FedApp Client</h1>
      
      <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>1. Configuration</h3>
        <input style={inputStyle} placeholder="Project ID (e.g., 1)" value={projectId} onChange={e => setProjectId(e.target.value)} />
        <input style={inputStyle} placeholder="Client ID (e.g., hospital_a)" value={clientId} onChange={e => setClientId(e.target.value)} />
        
        <h3>2. Dataset</h3>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <input style={{ ...inputStyle, marginBottom: 0 }} value={csvPath} readOnly placeholder="No file selected..." />
          <button onClick={handleBrowse} style={{ padding: '10px 20px', cursor: 'pointer' }}>Browse</button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        {!isTraining ? (
          <button onClick={handleStart} style={{ padding: '15px 30px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', cursor: 'pointer' }}>
            Start Training
          </button>
        ) : (
          <button onClick={handleStop} style={{ padding: '15px 30px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', cursor: 'pointer' }}>
            Stop Training
          </button>
        )}
      </div>

      <h3>Live Logs</h3>
      <div style={logStyle}>
        {logs.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}

export default App;