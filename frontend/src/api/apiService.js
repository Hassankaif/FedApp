import axios from "axios";

// 🚀 SMART URL DETECTION
// If the browser is on "localhost", point to Local Backend (127.0.0.1:8000)
// Otherwise (on DigitalOcean), point to the Production Server IP
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

const API_BASE_URL = isLocal 
  ? "http://127.0.0.1:8000"       // Local Development
  : "http://139.59.87.244:8000";  // Production Server

const API_URL = `${API_BASE_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Request Interceptor (Adds Token)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => Promise.reject(error));

// Response Interceptor (Handles Errors)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If 401 Unauthorized, clear token and redirect to login
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export const apiService = {
  // --- Auth ---
  login: async (username, password) => {
    const res = await api.post("/auth/login", { username, password });
    return res.data;
  },

  register: async (userData) => {
    const res = await api.post("/auth/register", userData);
    return res.data;
  },

  // --- Projects ---
  createProject: async (data) => {
    const res = await api.post("/projects/", data);
    return res.data;
  },

  getProjects: async (ownerId = 1) => {
    const res = await api.get(`/projects/?owner_id=${ownerId}`);
    return res.data.projects; 
  },

  getProjectDetails: async (projectId) => {
    const res = await api.get(`/projects/${projectId}`);
    return res.data.project;
  },

  // --- Training ---
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
  
  // --- Data & Models ---
  getMetrics: async () => {
    const res = await api.get("/metrics/latest");
    return res.data;
  },
  
  getClients: async () => {
    const res = await api.get("/clients/");
    return res.data;
  }
};

export default api;