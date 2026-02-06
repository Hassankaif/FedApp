// frontend/src/hooks/useProjects.js
import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../api/apiService';

export const useProjects = (token) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProjects = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      // Defaulting to owner_id=1 (Admin)
      const data = await apiService.getProjects(1);
      setProjects(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
      setError("Could not load projects");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const createNewProject = async (projectData) => {
    try {
      await apiService.createProject({
        ...projectData,
        owner_id: 1, // Hardcoded to Admin
        csv_schema: projectData.csv_schema.split(",").map(s => s.trim()) // Convert string to list
      });
      await fetchProjects(); // Refresh list
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || "Failed to create" };
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return { projects, loading, error, refreshProjects: fetchProjects, createNewProject };
};