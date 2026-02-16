// frontend/src/hooks/useProjects.js
import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../api/apiService';

export const useProjects = (token) => {
  // State
  const [projects, setProjects] = useState([]);
  const [templates, setTemplates] = useState([]); // 🔥 Ensure this is exposed
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch Logic
  const fetchProjects = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      // 1. Fetch Projects (Updated to pass token)
      const data = await apiService.projects.list(token);
      setProjects(data.projects || []); 
      setError(null);
      
      // 2. Fetch Templates (Integrated from Bug Fix)
      const tmplData = await apiService.models.listTemplates(token);
      setTemplates(tmplData.templates || []);
      
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Could not load projects");
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initial Load
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Create Project Handler
  const createNewProject = async (projectData) => {
    try {
      // Preserve existing safety check for csv_schema
      const payload = {
        ...projectData,
        csv_schema: Array.isArray(projectData.csv_schema) 
          ? projectData.csv_schema.join(",") 
          : projectData.csv_schema
      };

      // Updated to match Bug Fix signature: create(token, payload)
      await apiService.projects.create(payload);
      
      await fetchProjects(); // Refresh list immediately
      return { success: true };
    } catch (err) {
      console.error("Create project error:", err);
      return { success: false, error: err.response?.data?.detail || "Failed to create" };
    }
  };

  // 🔥 New Handler: Save Custom Template
  const saveCustomTemplate = async (name, code) => {
    try {
      await apiService.models.saveTemplate(token, { 
        name, 
        model_code: code, 
        description: "Custom User Model" 
      });
      await fetchProjects(); // Refresh templates list
      return true;
    } catch (err) {
      console.error("Save template error:", err);
      return false;
    }
  };

  return { 
    projects, 
    templates,          // Exposed
    loading, 
    error, 
    refreshProjects: fetchProjects, 
    createNewProject, 
    saveCustomTemplate  // Exposed
  };
};