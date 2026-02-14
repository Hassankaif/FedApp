import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'; // 👈 Import Routes & Route
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home';
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

  const handleLogin = async (email, password) => {
    try {
      const data = await apiService.auth.login(email, password);
      const newToken = data.access_token;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setError(null);
      navigate('/dashboard'); // Redirect to dashboard
    } catch (err) {
      console.error("Login failed:", err);
      setError(err.response?.data?.detail || "Invalid credentials. Please try again.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setError(null);
    navigate('/'); // Redirect to home page after logout
  };

  return (
    <Routes>
      {/* Public landing page */}
      <Route path="/" element={<Home />} />

      {/* Public Routes redirect to dashboard if authenticated otherwise redirect to login */}
      <Route path="/login" element={
        !token ? <Login onLogin={handleLogin} error={error} /> : <Navigate to="/dashboard" />
      } />
      {/* Public Routes redirect to dashboard if authenticated otherwise redirect to signup */}
      <Route path="/signup" element={
        !token ? <Signup /> : <Navigate to="/dashboard" />
      } />

      {/* Private Routes redirect to login if not authenticated otherwise redirect to dashboard */}
      <Route path="/dashboard" element={
        token ? <Dashboard token={token} onLogout={handleLogout} /> : <Navigate to="/login" />
      } />
    </Routes>
  );
}

export default App;