// electron-client/src/App.jsx - FIXED VERSION WITH AUTHENTICATION
import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: 'http://localhost:8000/api'
});

function App() {
  // ==================== AUTHENTICATION STATE ====================
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  
  // Login Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // ==================== PROJECT SELECTION STATE ====================
  const [showProjectBrowser, setShowProjectBrowser] = useState(true);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(false);
  
  // ==================== TRAINING CONFIGURATION STATE ====================
  const [config, setConfig] = useState({
    apiUrl: 'http://localhost:8000',
    flServerUrl: 'localhost:8080',
    projectId: null,
    clientId: ''
  });
  
  const [csvPath, setCsvPath] = useState('');
  const [logs, setLogs] = useState([]);
  const [isTraining, setIsTraining] = useState(false);
  const logEndRef = useRef(null);

  // ==================== EFFECTS ====================
  
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

  // Attach token to all API requests
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Update clientId when user changes
  useEffect(() => {
    if (user) {
      setConfig(prev => ({ 
        ...prev, 
        clientId: user.email || `Client_${user.id}` 
      }));
    }
  }, [user]);

  // Check for existing session on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('fedapp_token');
    const storedUser = localStorage.getItem('fedapp_user');
    
    if (storedToken && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(userData);
        setIsAuthenticated(true);
      } catch (err) {
        console.error('Failed to restore session:', err);
        localStorage.removeItem('fedapp_token');
        localStorage.removeItem('fedapp_user');
      }
    }
  }, []);

  // Fetch projects after authentication
  useEffect(() => {
    if (isAuthenticated && token && showProjectBrowser) {
      fetchProjects();
    }
  }, [isAuthenticated, token, showProjectBrowser]);

  // ==================== API FUNCTIONS ====================
  
  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const response = await api.get('/projects/');
      setProjects(response.data.projects || []);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      setLogs(prev => [...prev, `❌ Failed to load projects: ${err.message}`]);
    } finally {
      setLoadingProjects(false);
    }
  };

  // ==================== HANDLERS ====================
  
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    
    try {
      const response = await api.post('/auth/login', {
        username: email,
        password: password
      });
      
      const { access_token, user: userData } = response.data;
      
      setToken(access_token);
      setUser(userData);
      setIsAuthenticated(true);
      
      // Store in localStorage for persistence
      localStorage.setItem('fedapp_token', access_token);
      localStorage.setItem('fedapp_user', JSON.stringify(userData));
      
      setLogs([`✅ Logged in as ${userData.email}`]);
      
    } catch (err) {
      console.error('Login failed:', err);
      setLoginError(err.response?.data?.detail || 'Login failed. Check your credentials.');
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setSelectedProject(null);
    setShowProjectBrowser(true);
    setCsvPath('');
    setLogs([]);
    localStorage.removeItem('fedapp_token');
    localStorage.removeItem('fedapp_user');
  };

  const handleSelectProject = async (project) => {
    setSelectedProject(project);
    setConfig(prev => ({ 
      ...prev, 
      projectId: project.id.toString() 
    }));
    setShowProjectBrowser(false);
    
    // Fetch project schema for validation
    try {
      const response = await api.get(`/projects/${project.id}/model-code`);
      setLogs([
        `✅ Joined Project: ${project.name}`,
        `📋 Required columns: ${response.data.csv_schema.join(', ')}`,
        `🎯 Target column: ${response.data.target_column}`
      ]);
    } catch (err) {
      setLogs(prev => [...prev, `⚠️ Could not fetch project schema: ${err.message}`]);
    }
  };

  const handleBrowse = async () => {
    const path = await window.electron.selectCsv();
    if (path) {
      setCsvPath(path);
      setLogs(prev => [...prev, `📁 Selected: ${path}`]);
    }
  };

  const handleStart = async () => {
    if (!csvPath) {
      alert("Please select a dataset first!");
      return;
    }
    
    if (!selectedProject) {
      alert("No project selected!");
      return;
    }
    
    setIsTraining(true);
    setLogs(prev => [...prev, "🚀 Initializing FL Client..."]);
    
    await window.electron.startTraining({ 
      ...config, 
      dataPath: csvPath 
    });
  };

  const handleStop = async () => {
    await window.electron.stopTraining();
    setIsTraining(false);
    setLogs(prev => [...prev, "🛑 Training Stopped by User"]);
  };

  const handleBackToProjects = () => {
    if (!isTraining) {
      setShowProjectBrowser(true);
      setSelectedProject(null);
      setCsvPath('');
      setLogs([]);
    }
  };

  // ==================== RENDER: LOGIN SCREEN ====================
  
  if (!isAuthenticated) {
    return (
      <div className="container login-container">
        <div className="login-card">
          <div className="login-header">
            <span className="login-icon">🏥</span>
            <h1>Federated Client</h1>
            <p className="subtitle">Please login to continue</p>
          </div>
          
          {loginError && (
            <div className="error-message">
              <span>⚠️</span>
              <span>{loginError}</span>
            </div>
          )}
          
          <form onSubmit={handleLogin} className="login-form">
            <div className="input-group">
              <label>Email</label>
              <input 
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your.email@hospital.com"
                autoComplete="email"
                required
              />
            </div>
            
            <div className="input-group">
              <label>Password</label>
              <input 
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
            
            <button type="submit" className="btn-primary btn-login">
              Sign In
            </button>
          </form>
          
          <div className="login-footer">
            <p className="text-muted">
              Don't have an account? Contact your administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==================== RENDER: PROJECT BROWSER ====================
  
  if (showProjectBrowser) {
    return (
      <div className="container">
        <header className="header">
          <div>
            <h1>🗂️ Select Project</h1>
            <p className="user-info">Logged in as: {user?.full_name || user?.email}</p>
          </div>
          <button onClick={handleLogout} className="btn-logout">
            Logout
          </button>
        </header>

        <div className="project-browser">
          {loadingProjects ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading available projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📂</span>
              <h3>No Projects Available</h3>
              <p>There are no active federated learning projects at the moment.</p>
              <p className="text-muted">Contact your project coordinator for access.</p>
            </div>
          ) : (
            <div className="project-grid">
              {projects.map(proj => (
                <div 
                  key={proj.id} 
                  className="project-card"
                  onClick={() => handleSelectProject(proj)}
                >
                  <div className="project-header">
                    <h3>{proj.name}</h3>
                    <span className={`status-badge status-${proj.status}`}>
                      {proj.status || 'draft'}
                    </span>
                  </div>
                  
                  <p className="project-description">
                    {proj.description || 'No description provided'}
                  </p>
                  
                  <div className="project-meta">
                    <div className="meta-item">
                      <span className="meta-label">Project ID</span>
                      <span className="meta-value">{proj.id}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Rounds</span>
                      <span className="meta-value">{proj.num_rounds || 0}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Min Clients</span>
                      <span className="meta-value">{proj.min_clients || 0}</span>
                    </div>
                  </div>
                  
                  <button className="btn-select">Join Project →</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==================== RENDER: MAIN TRAINING INTERFACE ====================
  
  return (
    <div className="container">
      <header className="header">
        <div>
          <h1>🏥 Federated Client</h1>
          <p className="user-info">
            {user?.full_name || user?.email} • Project: {selectedProject?.name}
          </p>
        </div>
        <div className="header-right">
          <div className={`status-badge ${isTraining ? 'active' : ''}`}>
            {isTraining ? 'Training' : 'Idle'}
          </div>
          <button onClick={handleBackToProjects} className="btn-secondary" disabled={isTraining}>
            ← Projects
          </button>
          <button onClick={handleLogout} className="btn-logout">
            Logout
          </button>
        </div>
      </header>

      <div className="grid-layout">
        {/* Left Panel: Configuration */}
        <div className="card config-panel">
          <h3>Connection Settings</h3>
          <div className="input-group">
            <label>API URL (Backend)</label>
            <input 
              value={config.apiUrl} 
              onChange={e => setConfig({...config, apiUrl: e.target.value})}
              disabled={isTraining}
            />
          </div>
          <div className="input-group">
            <label>FL Server URL (Flower)</label>
            <input 
              value={config.flServerUrl} 
              onChange={e => setConfig({...config, flServerUrl: e.target.value})}
              disabled={isTraining}
            />
          </div>

          <h3>Identity</h3>
          <div className="input-group">
            <label>Client ID</label>
            <input 
              value={config.clientId} 
              disabled
              title="Auto-set from logged-in user"
            />
          </div>
          <div className="input-group">
            <label>Project ID</label>
            <input 
              value={config.projectId || 'N/A'} 
              disabled
            />
          </div>

          <h3>Dataset</h3>
          <div className="file-picker">
            <input 
              value={csvPath || "No file selected"} 
              readOnly 
              placeholder="Select your CSV dataset"
            />
            <button onClick={handleBrowse} disabled={isTraining}>
              Browse
            </button>
          </div>

          <div className="actions">
            {!isTraining ? (
              <button 
                className="btn-primary" 
                onClick={handleStart}
                disabled={!csvPath}
              >
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
            {logs.length === 0 ? (
              <div className="log-empty">
                <span>💬</span>
                <p>No logs yet. Start training to see activity.</p>
              </div>
            ) : (
              <>
                {logs.map((log, i) => (
                  <div key={i} className="log-line">{log}</div>
                ))}
                <div ref={logEndRef} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;