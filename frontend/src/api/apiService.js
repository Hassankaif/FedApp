import axios from "axios";

 // API Configuration
 // Automatically switches between local development and production server
// const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
// const API_BASE_URL = isLocal 
//   ? "http://127.0.0.1:8000"       
//   : "http://139.59.87.244:8000";  

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: { "Content-Type": "application/json" },
});

// --- Interceptors ---

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// --- API Service Implementation ---

export const apiService = {
  
  // === AUTHENTICATION (auth.py) ===
  auth: {
    login: async (email, password) => {
      const res = await api.post("/auth/login", {
        username: email,
        password: password
      });
      return res.data;
    },
    // login: async (email, password) => {
    //   // Uses URLSearchParams for OAuth2 compatibility
    //   const formData = new URLSearchParams();
    //   formData.append('username', email);
    //   formData.append('password', password);
    //   const res = await api.post("/auth/login", formData, {
    //     headers: { "Content-Type": "application/x-www-form-urlencoded" },
    //   });
    //   return res.data;
    // },
    register: async (userData) => {
      // userData must match UserCreate: { email, password, full_name, role }
      const res = await api.post("/auth/register", userData);
      return res.data;
    },
    logout: () => {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
  },

  // === PROJECTS (projects.py) ===
  projects: {
    create: async (projectData) => {  // saves a new project to the database, returns the created project with its ID
      // projectData must match ProjectCreate. 
      // Ensure projectData.csv_schema is a string
      const res = await api.post("/projects/", projectData);
      return res.data;
    },
    list: async () => {
      const res = await api.get("/projects/");
      return res.data;
    },
    getDetails: async (projectId) => {
      const res = await api.get(`/projects/${projectId}`);
      return res.data;
    },
    getModelCode: async (projectId) => {
      const res = await api.get(`/projects/${projectId}/model-code`);
      return res.data;
    }
  },

  // === TRAINING CONTROL & VOTING (training.py) ===
  training: {
    start: async (projectId = 1) => {
      const res = await api.post(`/training/start?project_id=${projectId}`);
      return res.data;
    },
    getStatus: async () => { // used by server to know when to wake up and run the training loop, and also by frontend to display current status to users
      const res = await api.get("/training/status");
      return res.data;
    },
    complete: async () => {
      const res = await api.post("/training/complete");
      return res.data;
    },
    vote: async (projectId, clientId, strategy) => {
      // Matches VoteRequest: { project_id, client_id, strategy }
      const res = await api.post("/training/vote", { 
        project_id: projectId, 
        client_id: clientId, 
        strategy: strategy 
      });
      return res.data;
    },
    getFinalStrategy: async (projectId) => {
      const res = await api.get(`/training/strategy/final/${projectId}`);
      return res.data;
    },
    setMode: async (mode, datasetFile = null) => {
      // Matches TrainingMode: { mode, dataset_file }
      const res = await api.post("/training/mode", { 
        mode: mode, 
        dataset_file: datasetFile 
      });
      return res.data;
    },
    getMode: async () => {
      const res = await api.get("/training/mode");
      return res.data;
    },
    runCentralized: async (file) => {
      const formData = new FormData();
      formData.append("dataset_file", file);
      const res = await api.post("/training/centralized", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      return res.data;
    },
    getComparison: async () => {
      const res = await api.get("/training/comparison");
      return res.data;
    }
  },

  // === METRICS (metrics.py) ===
  metrics: {
    report: async (metricsData) => {
      const res = await api.post("/training/metrics", metricsData);
      return res.data;
    },
    getHistory: async (sessionId = null) => {
      const url = sessionId ? `/metrics?session_id=${sessionId}` : "/metrics";
      const res = await api.get(url);
      return res.data;
    },
    getLatest: async () => {
      const res = await api.get("/metrics/latest");
      return res.data;
    }
  },

  // === MODELS & DATASETS (models.py) ===
  models: {
    saveGlobal: async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/model/save", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      return res.data;
    },
    list: async () => {
      const res = await api.get("/models/list");
      return res.data;
    },
    downloadGlobal: () => {
      window.open(`${api.defaults.baseURL}/model/download/global`, "_blank");
    },
    downloadCentralized: () => {
      window.open(`${api.defaults.baseURL}/model/download/centralized`, "_blank");
    },
    saveConfig: async (modelCode, datasetPath) => {
      // Matches ModelConfig: { model_code, dataset_path }
      const res = await api.post("/api/config/model", { 
        model_code: modelCode, 
        dataset_path: datasetPath 
      });
      return res.data;
    },
    getConfig: async () => {
      const res = await api.get("/config/model");
      return res.data;
    },
    getCurrentRuntimeConfig: async () => {
      const res = await api.get("/config/current");
      return res.data;
    },
    uploadDataset: async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/config/dataset", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      return res.data;
    },
    listDatasets: async () => {
      const res = await api.get("/datasets/list");
      return res.data;
    }
  },

  // === CLIENTS (clients.py) ===
  clients: {
    register: async (clientData) => {
      const res = await api.post("/clients/register", clientData);
      return res.data;
    },
    list: async () => {
      const res = await api.get("/clients/");
      return res.data;
    }
  }
};

export default apiService;