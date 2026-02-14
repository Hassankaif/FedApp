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
      // Use namespaced API call
      const data = await apiService.projects.list();
      setProjects(data.projects || []); // Handle { projects: [...] } response format
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
      // Ensure csv_schema is a string as expected by ProjectCreate schema
      const payload = {
        ...projectData,
        csv_schema: Array.isArray(projectData.csv_schema) 
          ? projectData.csv_schema.join(",") 
          : projectData.csv_schema
      };
      await apiService.projects.create(payload);
      await fetchProjects(); // Refresh list immediately
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