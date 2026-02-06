// frontend/src/api/apiService.js
import axios from "axios";

// 🚀 PRODUCTION SERVER IP (DigitalOcean)
const API_BASE_URL = import.meta.env.VITE_API_URL;
const API_URL = `${API_BASE_URL}/api`;

// Create the Axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// 1. REQUEST INTERCEPTOR (Attaches Token Automatically)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. RESPONSE INTERCEPTOR (Handles Errors Globally)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If token expires, kick user out
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const apiService = {
  // ---------- Auth ----------
  login: async (username, password) => {
    const res = await api.post("/auth/login", { username, password });
    return res.data;
  },

    // --- Projects (UPDATED) ---
  createProject: async (data) => {
    const res = await api.post("/projects/", data);
    return res.data;
  },

  getProjects: async (ownerId = 1) => {
    // Backend expects owner_id query param
    const res = await api.get(`/projects/?owner_id=${ownerId}`);
    return res.data.projects; 
  },

  getProjectDetails: async (projectId) => {
    const res = await api.get(`/projects/${projectId}`);
    return res.data.project;
  },

  // ---------- Training ----------
  startTraining: async () => {
    const res = await api.post("/training/start");
    return res.data;
  },

  getStatus: async () => {
    const res = await api.get("/training/status");
    return res.data;
  },

  setTrainingMode: async (mode) => {
    const res = await api.post("/training/mode", { mode });
    return res.data;
  },

  getComparison: async () => {
    const res = await api.get("/training/comparison");
    return res.data;
  },

  runCentralized: async (file) => {
    const formData = new FormData();
    formData.append("dataset_file", file);

    const res = await api.post("/training/centralized", formData, {
      headers: { "Content-Type": undefined }, // Axios handles FormData headers
    });
    return res.data;
  },

  // ---------- Data & Models ----------
  getMetrics: async () => {
    const res = await api.get("/metrics/latest");
    return res.data;
  },

  getSavedModels: async () => {
    const res = await api.get("/models/list");
    return res.data;
  },

  getDatasets: async () => {
    const res = await api.get("/datasets/list");
    return res.data;
  },

  // ---------- Clients ----------
  getClients: async () => {
    const res = await api.get("/clients/");
    return res.data;
  },
};

export default apiService;

