// frontend/src/api/apiService.js
const API_URL = import.meta.env.VITE_API_URL;

const getHeaders = (token) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
});

export const apiService = {
  // Auth
  login: async (username, password) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) throw new Error('Login failed');
    return res.json();
  },

  // Training Control
  startTraining: async (token) => {
    return fetch(`${API_URL}/training/start`, {
      method: 'POST',
      headers: getHeaders(token)
    }).then(res => res.json());
  },

  getStatus: async (token) => {
    return fetch(`${API_URL}/training/status`, {
      headers: getHeaders(token)
    }).then(res => res.json());
  },

  setTrainingMode: async (token, mode) => {
    return fetch(`${API_URL}/training/mode`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ mode })
    }).then(res => res.json());
  },

  // Data & Models
  getMetrics: async (token) => {
    return fetch(`${API_URL}/metrics/latest`, {
      headers: getHeaders(token)
    }).then(res => res.json());
  },

  getSavedModels: async (token) => {
    return fetch(`${API_URL}/models/list`, {
      headers: getHeaders(token)
    }).then(res => res.json());
  },

  getDatasets: async (token) => {
    return fetch(`${API_URL}/datasets/list`, {
      headers: getHeaders(token)
    }).then(res => res.json());
  },

  // Comparison
  getComparison: async (token) => {
    return fetch(`${API_URL}/training/comparison`, {
      headers: getHeaders(token)
    }).then(res => res.json());
  },

  runCentralized: async (token, file) => {
    const formData = new FormData();
    formData.append('dataset_file', file);
    
    return fetch(`${API_URL}/training/centralized`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }, // No Content-Type for FormData
      body: formData
    }).then(res => res.json());
  }
};