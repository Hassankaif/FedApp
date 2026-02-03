import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
console.log('API BASE URL:', API_BASE);

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [error, setError] = useState('');

  const login = async (username, password) => {
    setError('');
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
        return true;
      } else {
        setError('Invalid credentials');
        return false;
      }
    } catch (err) {
      setError('Connection error');
      return false;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setToken(null);
    localStorage.removeItem('token');
  };

  return { isAuthenticated, token, login, logout, error };
};