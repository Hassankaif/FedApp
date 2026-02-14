// frontend/src/components/ProjectsPanel.jsx
import React, { useState } from 'react';

const ProjectsPanel = ({ projects = [], onCreateProject, loading }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    target_column: 'Outcome',
    // Default schema matches the Pima Indians Diabetes dataset often used in examples
    csv_schema: 'Pregnancies,Glucose,BloodPressure,SkinThickness,Insulin,BMI,DiabetesPedigreeFunction,Age,Outcome',
    model_code: '',
    num_rounds: 5,
    min_clients: 1,
    local_epochs: 5, 
    batch_size: 32   
  });
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    // Ensure numeric fields are actually numbers
    const payload = {
      ...formData,
      num_rounds: parseInt(formData.num_rounds),
      min_clients: parseInt(formData.min_clients),
      local_epochs: parseInt(formData.local_epochs),
      batch_size: parseInt(formData.batch_size),
    };

    const result = await onCreateProject(payload);
    
    if (result.success) {
      setShowForm(false);
      // Reset only user-entry fields, keep sensible defaults
      setFormData(prev => ({ ...prev, name: '', description: '', model_code: '' }));
    } else {
      setError(typeof result.error === 'string' ? result.error : JSON.stringify(result.error));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-2"></div>
        Loading projects...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Your Projects</h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className={`px-4 py-2 rounded-lg transition-colors ${
            showForm ? 'bg-gray-200 text-gray-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {showForm ? 'Cancel' : '+ New Project'}
        </button>
      </div>

      {/* Create Project Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-md border border-indigo-100 animate-fadeIn">
          <h3 className="text-lg font-semibold mb-4 text-indigo-900">Create New Project</h3>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm">
              🚨 {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Project Name</label>
                <input 
                  name="name"
                  className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" 
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Target Column</label>
                <input 
                  name="target_column"
                  className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" 
                  value={formData.target_column}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                 <label className="block text-xs font-medium text-gray-500 mb-1">Rounds</label>
                 <input type="number" name="num_rounds" value={formData.num_rounds} onChange={handleChange} className="w-full border p-2 rounded" />
              </div>
              <div>
                 <label className="block text-xs font-medium text-gray-500 mb-1">Min Clients</label>
                 <input type="number" name="min_clients" value={formData.min_clients} onChange={handleChange} className="w-full border p-2 rounded" />
              </div>
              <div>
                 <label className="block text-xs font-medium text-gray-500 mb-1">Local Epochs</label>
                 <input type="number" name="local_epochs" value={formData.local_epochs} onChange={handleChange} className="w-full border p-2 rounded" />
              </div>
              <div>
                 <label className="block text-xs font-medium text-gray-500 mb-1">Batch Size</label>
                 <input type="number" name="batch_size" value={formData.batch_size} onChange={handleChange} className="w-full border p-2 rounded" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
              <textarea 
                name="description"
                className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                rows="2"
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Model Code (Python)</label>
              <textarea 
                name="model_code"
                placeholder="def create_model(input_shape): ..."
                className="w-full border border-gray-300 p-3 rounded font-mono text-sm h-48 bg-gray-50 focus:bg-white transition-colors"
                value={formData.model_code}
                onChange={handleChange}
                required
              />
              <p className="text-xs text-gray-400 mt-1">Must include a `create_model` function.</p>
            </div>

            <div className="flex justify-end">
              <button 
                type="submit" 
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-2 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 shadow-md transform hover:scale-105 transition-all"
              >
                Create Project
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Project Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects && projects.length > 0 ? (
          projects.map((proj) => (
            <div key={proj.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all hover:-translate-y-1">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-lg text-gray-800 truncate pr-2" title={proj.name}>{proj.name}</h3>
                <span className={`px-2 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
                  proj.status === 'active' || proj.status === 'training'
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {proj.status || 'DRAFT'}
                </span>
              </div>
              
              <p className="text-gray-500 text-sm mb-4 h-10 line-clamp-2">
                {proj.description || "No description provided."}
              </p>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Clients Required</span>
                  <span className="font-medium text-gray-900">{proj.min_clients || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Rounds</span>
                  <span className="font-medium text-gray-900">{proj.current_round || 0} / {proj.num_rounds}</span>
                </div>
              </div>
              
              <div className="border-t pt-4 flex justify-between items-center text-xs text-gray-400">
                <span className="font-mono">ID: {proj.id}</span>
                <span>{proj.created_at ? new Date(proj.created_at).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>
          ))
        ) : (
          !showForm && (
            <div className="col-span-full py-16 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <div className="text-4xl mb-3">📂</div>
              <p className="text-lg font-medium">No projects found</p>
              <p className="text-sm">Create your first federated learning project above.</p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default ProjectsPanel;