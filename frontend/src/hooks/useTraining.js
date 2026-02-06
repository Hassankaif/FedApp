// frontend/src/hooks/useTraining.js
import { useState, useEffect, useRef } from 'react';
import { apiService } from '../api/apiService';

export const useTraining = (token) => {
  const [metrics, setMetrics] = useState([]);
  const [status, setStatus] = useState('idle');
  const [clients, setClients] = useState([]);
  const [savedModels, setSavedModels] = useState([]);
  const [datasets, setDatasets] = useState([]);
  
  const ws = useRef(null);

  const fetchData = async () => {
    try {
      const [modelsData, datasetsData, statusData] = await Promise.all([
        apiService.getSavedModels(token),
        apiService.getDatasets(token),
        apiService.getStatus(token)
      ]);
      setSavedModels(modelsData.models || []);
      setDatasets(datasetsData.datasets || []);
      if (statusData.is_training) setStatus('training');
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchData();

    // WebSocket Connection
    ws.current = new WebSocket(import.meta.env.VITE_WS_URL || "ws://139.59.87.244:8000/ws");
    ws.current.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'metrics_update') {
        setMetrics(prev => [...prev, msg.data]);
      } else if (msg.type === 'training_started') {
        setStatus('training');
        setMetrics([]); // Clear old metrics
      } else if (msg.type === 'training_completed') {
        setStatus('completed');
        fetchData(); // Refresh models list
      } else if (msg.type === 'client_registered') {
        setClients(prev => [...prev, { client_id: msg.client_id, status: 'online' }]);
      } else if (msg.type === 'centralized_complete') {
        fetchData(); // Refresh models
      }
    };

    return () => ws.current?.close();
  }, [token]);

  const startTraining = async () => {
    await apiService.startTraining(token);
    setStatus('training');
  };

  const runCentralized = async (file) => {
    return apiService.runCentralized(token, file);
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