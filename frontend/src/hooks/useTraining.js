// frontend/src/hooks/useTraining.js
import { useState, useEffect, useRef , useCallback} from 'react';
import { apiService } from '../api/apiService';

export const useTraining = (token) => {
  const [metrics, setMetrics] = useState([]);
  const [status, setStatus] = useState('idle'); // 'idle' | 'training' | 'completed'
  const [clients, setClients] = useState([]);
  const [savedModels, setSavedModels] = useState([]);
  const [datasets, setDatasets] = useState([]);
  
  const ws = useRef(null);

  // Define fetch function
  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [modelsData, datasetsData, statusData, clientsData] = await Promise.all([
        apiService.models.list(token),
        apiService.models.listDatasets(token),
        apiService.training.getStatus(token),
        apiService.clients.list(token)
      ]);
      setSavedModels(modelsData.models || []);
      setDatasets(datasetsData.datasets || []);
      setClients(clientsData.clients || []);

      if (statusData.status === 'training'){
        setStatus('training');
      } 
    } catch (err) {
      console.error("Failed to fetch training data:", err);
    }
  }, [token]);

  // Initial Fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // WebSocket Connection
  useEffect(() => {
    if (!token) return;
    // Determine WS URL based on current window location
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    // const wsUrl = isLocal 
    //   ? "ws://127.0.0.1:8000/ws" 
    //   : "ws://139.59.87.244:8000/ws";
    const wsUrl = import.meta.env.VITE_WS_URL ;

    // WebSocket Connection
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log("Connected to Training WebSocket");
    };

    ws.current.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'metrics_update':
            //check if msg.data exists and is an object with expected properties,otherwise use msg directly if format differs 
            setMetrics(prev => [...prev, msg.data]);
            break;

          case 'training_started':
            setStatus('training');
            setMetrics([]); // Clear old metrics for new session
            break;

          case 'training_completed':
            setStatus('completed');
            fetchData(); // Refresh models list to show new global model
            break;

          case 'client_registered':
            // add new client to clients list with status 'online' or update existing client's status to 'online'
            setClients(prev => {
              const exists = prev.find(c => c.client_id === msg.client_id);
              if (exists) return prev; // Already in list (could update status here)
              return [...prev, { client_id: msg.client_id, status: 'online', last_seen: new Date().toISOString() }];
            });
            break;

          case 'centralized_complete':
            fetchData(); // Refresh models
            break;

          default:
            console.warn("Unknown WebSocket message type:", msg.type);
            break;
        }
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
      }
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket Error:", error);
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [token, fetchData]);

  const startTraining = async (projectId = 1) => {
    try {
      await apiService.training.start(projectId);
      setStatus('training');
      setMetrics([]); // Reset metrics UI immediately
    } catch (err) {
      console.error("Failed to start training:", err);
      alert("Failed to start training. Check console.");
    }
  };

  const runCentralized = async (file) => {
    try {
      const res = await apiService.training.runCentralized(file);
      return res;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  return { 
    metrics, 
    status, 
    clients, 
    savedModels, 
    datasets, 
    startTraining,
    runCentralized,
    refresh: fetchData
  };
};

// This custom hook encapsulates all logic related to training, including fetching data, managing WebSocket connections, and providing functions to start training and run centralized experiments. It can be imported and used in React components to easily access training-related functionality and state.