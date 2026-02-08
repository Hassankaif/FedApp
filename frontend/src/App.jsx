import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'; // 👈 Import Routes & Route
import Login from './pages/Login';
import Signup from './pages/Signup'; // 👈 Import Signup
import Dashboard from './pages/Dashboard';
import { apiService } from './api/apiService';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) setToken(storedToken);
  }, []);

  const handleLogin = async (username, password) => {
    try {
      const data = await apiService.login(username, password);
      const newToken = data.access_token;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setError(null);
      navigate('/'); // Redirect to dashboard
    } catch (err) {
      console.error("Login failed:", err);
      setError(err.response?.data?.detail || "Invalid credentials. Please try again.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setError(null);
    navigate('/login');
  };

  // 🚀 UPDATED RETURN STRUCTURE WITH ROUTING
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={
        !token ? <Login onLogin={handleLogin} error={error} /> : <Navigate to="/" />
      } />
      
      <Route path="/signup" element={
        !token ? <Signup /> : <Navigate to="/" />
      } />

      {/* Private Routes */}
      <Route path="/" element={
        token ? <Dashboard token={token} onLogout={handleLogout} /> : <Navigate to="/login" />
      } />
    </Routes>
  );
}

export default App;