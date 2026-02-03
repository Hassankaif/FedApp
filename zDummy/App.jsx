import { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_BASE = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000/ws';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Dashboard state
  const [clients, setClients] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isTraining, setIsTraining] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(20);
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [ws, setWs] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  
  // New features state
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, config, comparison
  const [trainingMode, setTrainingMode] = useState('federated'); // federated, comparison
  const [comparisonDataset, setComparisonDataset] = useState(null);
  const [centralizedResults, setCentralizedResults] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [modelCode, setModelCode] = useState('');
  const [datasetFile, setDatasetFile] = useState(null);
  const [savedModels, setSavedModels] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [isRunningCentralized, setIsRunningCentralized] = useState(false);

  // Login Handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (response.ok) {
        const data = await response.json();
        setToken(data.access_token);
        setIsAuthenticated(true);
        localStorage.setItem('token', data.access_token);
      } else {
        setLoginError('Invalid credentials');
      }
    } catch (error) {
      setLoginError('Connection error');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setToken(null);
    localStorage.removeItem('token');
    if (ws) ws.close();
  };

  // Fetch functions
  const fetchClients = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/clients?t=${Date.now()}`);
      const data = await response.json();
      setClients(data.clients);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  }, []);

  const fetchTrainingStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/training/status?t=${Date.now()}`);
      const data = await response.json();
      
      if (data.is_training) {
        setIsTraining(true);
        setCurrentSessionId(data.session_id);
        setCurrentRound(data.current_round || 0);
        setTotalRounds(data.total_rounds || 20);
      } else {
        setIsTraining(false);
        setCurrentSessionId(null);
      }
    } catch (error) {
      console.error('Error fetching training status:', error);
    }
  }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      const url = currentSessionId 
        ? `${API_BASE}/api/metrics?session_id=${currentSessionId}&t=${Date.now()}`
        : `${API_BASE}/api/metrics/latest?t=${Date.now()}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.metrics && data.metrics.length > 0) {
        setMetrics(data.metrics);
        const lastMetric = data.metrics[data.metrics.length - 1];
        setCurrentRound(lastMetric.round);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  }, [currentSessionId]);

  const fetchSavedModels = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/models/list`);
      const data = await response.json();
      setSavedModels(data.models);
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  };

  const fetchDatasets = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/datasets/list`);
      const data = await response.json();
      setDatasets(data.datasets);
    } catch (error) {
      console.error('Error fetching datasets:', error);
    }
  };

  const fetchComparison = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/training/comparison`);
      const data = await response.json();
      if (!data.error) {
        setComparisonData(data);
      }
    } catch (error) {
      console.error('Error fetching comparison:', error);
    }
  };

  // WebSocket Connection
  useEffect(() => {
    if (!isAuthenticated) return;

    const websocket = new WebSocket(WS_URL);
    
    websocket.onopen = () => {
      console.log('WebSocket Connected');
      setWsStatus('connected');
    };
    
    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'training_started') {
        setIsTraining(true);
        setCurrentSessionId(message.session_id);
        setCurrentRound(0);
        setMetrics([]);
        fetchTrainingStatus();
        fetchClients();
      } else if (message.type === 'training_completed') {
        setIsTraining(false);
        fetchTrainingStatus();
        fetchSavedModels();
      } else if (message.type === 'metrics_update') {
        setCurrentRound(message.data.round);
        setLastUpdate(Date.now());
        setTimeout(fetchMetrics, 500);
      } else if (message.type === 'client_registered') {
        fetchClients();
      } else if (message.type === 'centralized_complete') {
        setCentralizedResults(message.data);
        setIsRunningCentralized(false);
        fetchComparison();
      }
    };
    
    websocket.onerror = () => setWsStatus('error');
    websocket.onclose = () => setWsStatus('disconnected');
    
    setWs(websocket);
    
    return () => websocket.close();
  }, [isAuthenticated, fetchMetrics, fetchClients, fetchTrainingStatus]);

  // Start Training
  const startTraining = async () => {
    const onlineClients = clients.filter(c => c.status === 'online').length;
    
    if (onlineClients < 3) {
      alert(`Only ${onlineClients} clients online. Need 3 clients to start training.`);
      return;
    }

    // Set training mode
    await fetch(`${API_BASE}/api/training/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: trainingMode })
    });

    try {
      const response = await fetch(`${API_BASE}/api/training/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsTraining(true);
        setCurrentSessionId(data.session_id);
        setCurrentRound(0);
        setMetrics([]);
        alert(`${trainingMode === 'federated' ? 'Federated' : 'Comparison'} training started!`);
      }
    } catch (error) {
      alert('Error starting training. Is the FL server running?');
    }
  };

  // Run Centralized Training
  const runCentralizedTraining = async () => {
    if (!comparisonDataset) {
      alert('Please upload a dataset for centralized training');
      return;
    }

    setIsRunningCentralized(true);
    const formData = new FormData();
    formData.append('dataset_file', comparisonDataset);

    try {
      const response = await fetch(`${API_BASE}/api/training/centralized`, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        setCentralizedResults(data);
        setIsRunningCentralized(false);
        fetchComparison();
        alert('Centralized training complete!');
      }
    } catch (error) {
      setIsRunningCentralized(false);
      alert('Error running centralized training');
    }
  };

  // Save Model Configuration
  const saveModelConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/config/model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_code: modelCode,
          dataset_path: 'custom_dataset.csv'
        })
      });
      
      if (response.ok) {
        alert('Model configuration saved!');
      }
    } catch (error) {
      alert('Error saving configuration');
    }
  };

  // Upload Dataset
  const uploadDataset = async () => {
    if (!datasetFile) return;

    const formData = new FormData();
    formData.append('file', datasetFile);

    try {
      const response = await fetch(`${API_BASE}/api/config/dataset`, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`Dataset uploaded: ${data.rows} rows, ${data.columns} columns`);
        fetchDatasets();
      }
    } catch (error) {
      alert('Error uploading dataset');
    }
  };

  // Download Model
  const downloadModel = (type) => {
    window.open(`${API_BASE}/api/model/download/${type}`, '_blank');
  };

  // Polling
  useEffect(() => {
    if (isAuthenticated) {
      fetchClients();
      fetchTrainingStatus();
      fetchMetrics();
      fetchSavedModels();
      fetchDatasets();
      
      const interval = setInterval(() => {
        fetchClients();
        fetchTrainingStatus();
        if (isTraining) {
          fetchMetrics();
        }
      }, isTraining ? 2000 : 5000);
      
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, isTraining, fetchClients, fetchTrainingStatus, fetchMetrics]);

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">🏥 Federated Learning</h1>
            <p className="text-gray-600">Privacy-Preserving Healthcare AI</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="admin"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="admin123"
              />
            </div>
            
            {loginError && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
                {loginError}
              </div>
            )}
            
            <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition">
              Login
            </button>
          </form>
          
          <div className="mt-6 text-center text-sm text-gray-500">
            Default: admin / admin123
          </div>
        </div>
      </div>
    );
  }

  const onlineClientsCount = clients.filter(c => c.status === 'online').length;

  // Main Dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-gray-800">🏥 FL Dashboard</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              wsStatus === 'connected' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {wsStatus === 'connected' ? '● Live' : '● Offline'}
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Last update: {new Date(lastUpdate).toLocaleTimeString()}
            </span>
            <button onClick={handleLogout} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition">
              Logout
            </button>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-1 border-b">
            {['dashboard', 'comparison', 'config', 'models'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-medium transition ${
                  activeTab === tab
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <>
            {/* Control Panel */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 mb-8 text-white">
              <h2 className="text-2xl font-bold mb-4">Training Control Center</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-indigo-100">Training Mode:</span>
                    <select
                      value={trainingMode}
                      onChange={(e) => setTrainingMode(e.target.value)}
                      disabled={isTraining}
                      className="px-4 py-2 rounded-lg text-gray-800 font-semibold"
                    >
                      <option value="federated">Federated Only</option>
                      <option value="comparison">Federated + Comparison</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className="text-indigo-100">Training Status:</span>
                    <span className={`px-4 py-2 rounded-lg font-bold ${
                      isTraining 
                        ? 'bg-green-400 text-green-900 animate-pulse' 
                        : 'bg-white text-gray-700'
                    }`}>
                      {isTraining ? `🔥 ACTIVE - Round ${currentRound}/${totalRounds}` : '⏸️ IDLE'}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className="text-indigo-100">Connected Clients:</span>
                    <span className={`px-4 py-2 rounded-lg font-bold ${
                      onlineClientsCount >= 3 
                        ? 'bg-green-400 text-green-900' 
                        : 'bg-yellow-400 text-yellow-900'
                    }`}>
                      {onlineClientsCount} / 3
                      {onlineClientsCount >= 3 ? ' ✓' : ' ⚠️'}
                    </span>
                  </div>

                  {isTraining && (
                    <div className="bg-white bg-opacity-20 rounded-lg p-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span>{Math.round((currentRound / totalRounds) * 100)}%</span>
                      </div>
                      <div className="w-full bg-white bg-opacity-30 rounded-full h-2">
                        <div 
                          className="bg-green-400 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(currentRound / totalRounds) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-end">
                  <button
                    onClick={startTraining}
                    disabled={isTraining || onlineClientsCount < 3}
                    className={`px-8 py-4 rounded-lg font-bold text-lg transition-all ${
                      isTraining || onlineClientsCount < 3
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                        : 'bg-white text-indigo-600 hover:bg-indigo-50 hover:scale-105 shadow-lg'
                    }`}
                  >
                    {isTraining 
                      ? '🔄 Training in Progress...' 
                      : onlineClientsCount < 3
                        ? '⚠️ Need 3 Clients'
                        : '🚀 Start Training'}
                  </button>
                </div>
              </div>
            </div>

            {/* Client Status Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {['hospital_a', 'hospital_b', 'hospital_c'].map((id, idx) => {
                const client = clients.find(c => c.client_id === id);
                const isOnline = client && client.status === 'online';
                const samples = client ? client.total_samples : 0;
                
                return (
                  <div 
                    key={id} 
                    className={`bg-white rounded-xl shadow-md p-6 border-2 transition-all ${
                      isOnline ? 'border-green-400 shadow-green-100' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-800">
                        Hospital {['A', 'B', 'C'][idx]}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className={`w-4 h-4 rounded-full ${
                          isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
                        }`} />
                        <span className={`text-xs font-bold ${
                          isOnline ? 'text-green-600' : 'text-gray-400'
                        }`}>
                          {isOnline ? 'ONLINE' : 'OFFLINE'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500 mb-1">Client ID</div>
                        <div className="font-mono text-sm text-gray-700">{id}</div>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500 mb-1">Training Samples</div>
                        <div className="text-2xl font-bold text-indigo-600">{samples}</div>
                      </div>
                      
                      {client && client.last_seen && (
                        <div className="text-xs text-gray-500">
                          Last seen: {new Date(client.last_seen).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Metrics Visualization */}
            {metrics.length > 0 && (
              <>
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800">
                      📊 Training Metrics - Current Session
                    </h3>
                    <span className="text-sm text-gray-500">
                      Showing {metrics.length} rounds
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                      <div className="text-sm text-blue-600 font-medium">Latest Accuracy</div>
                      <div className="text-3xl font-bold text-blue-700">
                        {(metrics[metrics.length - 1]?.accuracy * 100).toFixed(2)}%
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4">
                      <div className="text-sm text-red-600 font-medium">Latest Loss</div>
                      <div className="text-3xl font-bold text-red-700">
                        {metrics[metrics.length - 1]?.loss.toFixed(4)}
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                      <div className="text-sm text-green-600 font-medium">Improvement</div>
                      <div className="text-3xl font-bold text-green-700">
                        {metrics.length > 1 
                          ? `${((metrics[metrics.length - 1].accuracy - metrics[0].accuracy) * 100).toFixed(2)}%`
                          : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">📈 Accuracy Progress</h3>
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={metrics}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="round" stroke="#666" />
                        <YAxis domain={[0, 1]} stroke="#666" />
                        <Tooltip formatter={(value) => [`${(value * 100).toFixed(2)}%`, 'Accuracy']} />
                        <Legend />
                        <Line type="monotone" dataKey="accuracy" stroke="#4F46E5" strokeWidth={3} dot={{ r: 5 }} name="Accuracy" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">📉 Loss Convergence</h3>
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={metrics}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="round" stroke="#666" />
                        <YAxis stroke="#666" />
                        <Tooltip formatter={(value) => [value.toFixed(4), 'Loss']} />
                        <Legend />
                        <Line type="monotone" dataKey="loss" stroke="#EF4444" strokeWidth={3} dot={{ r: 5 }} name="Loss" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Comparison Tab */}
        {activeTab === 'comparison' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">🔬 Centralized Training</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Complete Dataset (All Hospital Data Combined)
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setComparisonDataset(e.target.files[0])}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                
                <button
                  onClick={runCentralizedTraining}
                  disabled={!comparisonDataset || isRunningCentralized}
                  className={`px-6 py-3 rounded-lg font-semibold ${
                    !comparisonDataset || isRunningCentralized
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  {isRunningCentralized ? '⏳ Training...' : '🚀 Run Centralized Training'}
                </button>
              </div>
            </div>

            {comparisonData && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">📊 Comparison Results</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Federated Results Card */}
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-indigo-800 mb-4">Federated Learning</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Accuracy:</span>
                        <span className="font-bold text-indigo-700">
                          {(comparisonData.federated.accuracy * 100).toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Loss:</span>
                        <span className="font-bold text-indigo-700">
                          {comparisonData.federated.loss.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Centralized Results Card */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-purple-800 mb-4">Centralized Learning</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Accuracy:</span>
                        <span className="font-bold text-purple-700">
                          {(comparisonData.centralized.accuracy * 100).toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Loss:</span>
                        <span className="font-bold text-purple-700">
                          {comparisonData.centralized.loss.toFixed(4)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Training Time:</span>
                        <span className="font-bold text-purple-700">
                          {comparisonData.centralized.training_time.toFixed(2)}s
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-green-800 mb-4">Performance Difference</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-600">Accuracy Difference:</span>
                      <div className={`text-2xl font-bold ${
                        comparisonData.comparison.accuracy_diff > 0 ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {comparisonData.comparison.accuracy_diff > 0 ? '+' : ''}
                        {(comparisonData.comparison.accuracy_diff * 100).toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Loss Difference:</span>
                      <div className={`text-2xl font-bold ${
                        comparisonData.comparison.loss_diff < 0 ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {comparisonData.comparison.loss_diff > 0 ? '+' : ''}
                        {comparisonData.comparison.loss_diff.toFixed(4)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Configuration Tab */}
        {activeTab === 'config' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">⚙️ Model Configuration</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Model Architecture Code (Python/TensorFlow)
                  </label>
                  <textarea
                    value={modelCode}
                    onChange={(e) => setModelCode(e.target.value)}
                    placeholder="Enter your model architecture code here..."
                    className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm"
                  />
                </div>
                
                <button
                  onClick={saveModelConfig}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
                >
                  💾 Save Model Configuration
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">📂 Dataset Management</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload New Dataset
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setDatasetFile(e.target.files[0])}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                
                <button
                  onClick={uploadDataset}
                  disabled={!datasetFile}
                  className={`px-6 py-3 rounded-lg font-semibold ${
                    !datasetFile
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  📤 Upload Dataset
                </button>
              </div>
              
              {datasets.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-3">Available Datasets</h3>
                  <div className="space-y-2">
                    {datasets.map((ds, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-semibold text-gray-800">{ds.filename}</div>
                            <div className="text-sm text-gray-600">
                              {ds.rows} rows × {ds.columns} columns
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {(ds.size / 1024).toFixed(2)} KB
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Models Tab */}
        {activeTab === 'models' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">📦 Saved Models</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => downloadModel('global')}
                  className="px-6 py-4 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
                >
                  ⬇️ Download Global Model (Federated)
                </button>
                
                <button
                  onClick={() => downloadModel('centralized')}
                  className="px-6 py-4 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition"
                >
                  ⬇️ Download Centralized Model
                </button>
              </div>

              {savedModels.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Model History</h3>
                  <div className="space-y-3">
                    {savedModels.map((model, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-semibold text-gray-800">{model.filename}</div>
                            <div className="text-sm text-gray-600">
                              Created: {new Date(model.created).toLocaleString()}
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              model.type === 'global' 
                                ? 'bg-indigo-100 text-indigo-700' 
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {model.type}
                            </span>
                            <span className="text-sm text-gray-500">
                              {(model.size / 1024).toFixed(2)} KB
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
