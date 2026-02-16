// frontend/src/components/ProjectsPanel.jsx 
import React, { useState } from 'react';

const ProjectsPanel = ({
  projects = [], 
  onCreateProject, 
  loading,
  startTraining,
  stopTraining,
  trainingStatus,
  trainingProjectId
 }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    target_column: 'Outcome',
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
    
    // 🔥 FIX #2: Calculate expected_features from csv_schema
    const schemaArray = formData.csv_schema
      .split(',')
      .map(col => col.trim())
      .filter(col => col.length > 0);
    
    // Remove target column from feature count
    const expectedFeatures = schemaArray.filter(
      col => col !== formData.target_column.trim()
    ).length;
    
    // Validate that target column exists in schema
    if (!schemaArray.includes(formData.target_column.trim())) {
      setError(`Target column "${formData.target_column}" not found in CSV schema`);
      return;
    }

    // Ensure numeric fields are actually numbers
    const payload = {
      ...formData,
      expected_features: expectedFeatures, // 🔥 NEW: Auto-calculated
      num_rounds: parseInt(formData.num_rounds),
      min_clients: parseInt(formData.min_clients),
      local_epochs: parseInt(formData.local_epochs),
      batch_size: parseInt(formData.batch_size),
    };

    console.log('📤 Submitting project with payload:', payload);

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
                <label className="block text-xs font-medium text-gray-500 mb-1">Project Name *</label>
                <input 
                  name="name"
                  className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" 
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Diabetes Prediction Study"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Target Column *</label>
                <input 
                  name="target_column"
                  className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" 
                  value={formData.target_column}
                  onChange={handleChange}
                  placeholder="e.g., Outcome"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                 <label className="block text-xs font-medium text-gray-500 mb-1">Rounds</label>
                 <input type="number" name="num_rounds" value={formData.num_rounds} onChange={handleChange} className="w-full border p-2 rounded" min="1" />
              </div>
              <div>
                 <label className="block text-xs font-medium text-gray-500 mb-1">Min Clients</label>
                 <input type="number" name="min_clients" value={formData.min_clients} onChange={handleChange} className="w-full border p-2 rounded" min="1" />
              </div>
              <div>
                 <label className="block text-xs font-medium text-gray-500 mb-1">Local Epochs</label>
                 <input type="number" name="local_epochs" value={formData.local_epochs} onChange={handleChange} className="w-full border p-2 rounded" min="1" />
              </div>
              <div>
                 <label className="block text-xs font-medium text-gray-500 mb-1">Batch Size</label>
                 <input type="number" name="batch_size" value={formData.batch_size} onChange={handleChange} className="w-full border p-2 rounded" min="1" />
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
                placeholder="Brief description of this federated learning project..."
              />
            </div>

            {/* 🔥 CSV Schema with helpful hint */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                CSV Schema (Comma-separated column names) *
              </label>
              <input 
                name="csv_schema"
                className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                value={formData.csv_schema}
                onChange={handleChange}
                placeholder="Age,BMI,Glucose,Outcome"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                ℹ️ Must include the target column. Feature count will be calculated automatically.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Model Code (Python) *</label>
              <textarea 
                name="model_code"
                placeholder={`def create_model(input_shape):
    import tensorflow as tf
    model = tf.keras.Sequential([
        tf.keras.layers.Dense(64, activation='relu', input_shape=input_shape),
        tf.keras.layers.Dense(1, activation='sigmoid')
    ])
    return model`}
                className="w-full border border-gray-300 p-3 rounded font-mono text-sm h-48 bg-gray-50 focus:bg-white transition-colors"
                value={formData.model_code}
                onChange={handleChange}
                required
              />
              <p className="text-xs text-gray-400 mt-1">Must include a `create_model(input_shape)` function.</p>
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
        projects.map((proj) => {
          const isThisProjectRunning = trainingStatus === 'training' && trainingProjectId === proj.id;
          const isOtherProjectRunning = trainingStatus === 'training' && trainingProjectId !== proj.id;

          return (
            <div
              key={proj.id}
              className={`bg-white p-6 rounded-xl shadow-sm border transition-all ${
                isThisProjectRunning
                  ? 'border-green-400 ring-2 ring-green-100'
                  : 'border-gray-200 hover:shadow-md hover:-translate-y-1'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <h3
                  className="font-bold text-lg text-gray-800 truncate pr-2"
                  title={proj.name}
                >
                  {proj.name}
                </h3>
                <span
                  className={`px-2 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
                    proj.status === 'active' || proj.status === 'training'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {proj.status || 'DRAFT'}
                </span>
              </div>

              <p className="text-gray-500 text-sm mb-4 h-10 line-clamp-2">
                {proj.description || 'No description provided.'}
              </p>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Clients Required</span>
                  <span className="font-medium text-gray-900">{proj.min_clients || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Rounds</span>
                  <span className="font-medium text-gray-900">
                    {proj.current_round || 0} / {proj.num_rounds}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4 flex justify-between items-center text-xs text-gray-400">
                <span className="font-mono">ID: {proj.id}</span>
                <span>
                  {proj.created_at ? new Date(proj.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>

              {/* 🔥 ACTION BUTTON AREA */}
              <div className="mt-4 pt-4 border-t">
                {isThisProjectRunning ? (
                  <button
                    onClick={stopTraining}
                    className="w-full bg-red-50 text-red-600 py-2 rounded-lg font-bold border border-red-200 hover:bg-red-100 flex items-center justify-center gap-2"
                  >
                    <span className="animate-pulse">●</span> Stop Training
                  </button>
                ) : (
                  <button
                    onClick={() => startTraining(proj.id)}
                    disabled={isOtherProjectRunning}
                    className={`w-full py-2 rounded-lg font-bold transition-all ${
                      isOtherProjectRunning
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg'
                    }`}
                  >
                    {isOtherProjectRunning ? 'System Busy' : 'Start Federated Training'}
                  </button>
                )}
              </div>
            </div>
          );
        })
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
