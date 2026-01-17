import { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// const API_BASE = 'http://localhost:8000';
// const WS_URL = 'ws://localhost:8000/ws';

const API_BASE = 'http://172.30.240.1:8000';
const WS_URL = 'ws://172.30.240.1:8000/ws';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [clients, setClients] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isTraining, setIsTraining] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(20);
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [ws, setWs] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

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

  // Logout Handler
  const handleLogout = () => {
    setIsAuthenticated(false);
    setToken(null);
    localStorage.removeItem('token');
    if (ws) ws.close();
  };

  // Fetch Clients with force refresh
  const fetchClients = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/clients?t=${Date.now()}`);
      const data = await response.json();
      setClients(data.clients);
      console.log('Clients updated:', data.clients);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  }, []);

  // Fetch Current Training Session
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
      
      console.log('Training status:', data);
    } catch (error) {
      console.error('Error fetching training status:', error);
    }
  }, []);

  // Fetch Metrics for Current Session Only
  const fetchMetrics = useCallback(async () => {
    try {
      const url = currentSessionId 
        ? `${API_BASE}/api/metrics?session_id=${currentSessionId}&t=${Date.now()}`
        : `${API_BASE}/api/metrics/latest?t=${Date.now()}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      // Only update if we have new data
      if (data.metrics && data.metrics.length > 0) {
        setMetrics(data.metrics);
        const lastMetric = data.metrics[data.metrics.length - 1];
        setCurrentRound(lastMetric.round);
        console.log(`Metrics updated: ${data.metrics.length} rounds`);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  }, [currentSessionId]);

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
      console.log('WebSocket message:', message);
      
      if (message.type === 'training_started') {
        setIsTraining(true);
        setCurrentSessionId(message.session_id);
        setCurrentRound(0);
        setMetrics([]); // Clear old metrics
        fetchTrainingStatus();
        fetchClients();
      } else if (message.type === 'training_completed') {
        setIsTraining(false);
        fetchTrainingStatus();
      } else if (message.type === 'metrics_update') {
        setCurrentRound(message.data.round);
        setLastUpdate(Date.now());
        // Fetch fresh metrics from backend
        setTimeout(fetchMetrics, 500);
      } else if (message.type === 'client_registered') {
        fetchClients();
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
        setMetrics([]); // Clear old metrics for new session
        alert('Training started! Monitor the charts below.');
      }
    } catch (error) {
      alert('Error starting training. Is the FL server running?');
    }
  };

  // Aggressive polling for real-time updates
  useEffect(() => {
    if (isAuthenticated) {
      // Initial fetch
      fetchClients();
      fetchTrainingStatus();
      fetchMetrics();
      
      // Poll every 2 seconds during training, 5 seconds when idle
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
            
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
            >
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
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Control Panel */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 mb-8 text-white">
          <h2 className="text-2xl font-bold mb-4">Training Control Center</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
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
                  isOnline 
                    ? 'border-green-400 shadow-green-100' 
                    : 'border-gray-200'
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
        {metrics.length > 0 ? (
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
              {/* Accuracy Chart */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  📈 Accuracy Progress
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={metrics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis 
                      dataKey="round" 
                      label={{ value: 'Round', position: 'insideBottom', offset: -5 }}
                      stroke="#666"
                    />
                    <YAxis 
                      domain={[0, 1]} 
                      label={{ value: 'Accuracy', angle: -90, position: 'insideLeft' }}
                      stroke="#666"
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                      formatter={(value) => [`${(value * 100).toFixed(2)}%`, 'Accuracy']}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="accuracy" 
                      stroke="#4F46E5" 
                      strokeWidth={3} 
                      dot={{ r: 5, fill: '#4F46E5' }}
                      activeDot={{ r: 7 }}
                      name="Accuracy"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Loss Chart */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  📉 Loss Convergence
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={metrics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis 
                      dataKey="round" 
                      label={{ value: 'Round', position: 'insideBottom', offset: -5 }}
                      stroke="#666"
                    />
                    <YAxis 
                      label={{ value: 'Loss', angle: -90, position: 'insideLeft' }}
                      stroke="#666"
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                      formatter={(value) => [value.toFixed(4), 'Loss']}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="loss" 
                      stroke="#EF4444" 
                      strokeWidth={3} 
                      dot={{ r: 5, fill: '#EF4444' }}
                      activeDot={{ r: 7 }}
                      name="Loss"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Client Participation Chart */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                👥 Client Participation per Round
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="round" stroke="#666" />
                  <YAxis domain={[0, 3]} stroke="#666" />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }} />
                  <Legend />
                  <Bar 
                    dataKey="num_clients" 
                    fill="#10B981" 
                    name="Clients Participated"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">No Training Data Yet</h3>
            <p className="text-gray-600 mb-6">
              {onlineClientsCount < 3 
                ? `Waiting for ${3 - onlineClientsCount} more client(s) to connect...`
                : 'All clients ready! Start a training session to see real-time metrics'}
            </p>
            {onlineClientsCount >= 3 && (
              <button
                onClick={startTraining}
                className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
              >
                🚀 Start First Training Session
              </button>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-600 text-sm">
          Privacy-Preserving Federated Learning System | MySQL Backend | Real-time Updates via WebSocket
        </div>
      </footer>
    </div>
  );
}

export default App;