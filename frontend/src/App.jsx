import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { apiService } from './api/apiService'; // Import the API service

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [error, setError] = useState(null); // Add error state

  // Check if token is valid on load (Optional but recommended)
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) setToken(storedToken);
  }, []);

  const handleLogin = async (username, password) => {
    try {
      // 1. Call the Backend to verify credentials
      const data = await apiService.login(username, password);
      
      // 2. If successful, backend returns { access_token: "..." }
      const newToken = data.access_token;
      
      // 3. NOW it is safe to save the token
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setError(null);
      
    } catch (err) {
      console.error("Login failed:", err);
      // Display error message from backend or default text
      setError(err.response?.data?.detail || "Invalid credentials. Please try again.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {!token ? (
        // Pass the error state to Login so the user sees why it failed
        <Login onLogin={handleLogin} error={error} />
      ) : (
        <Dashboard token={token} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;