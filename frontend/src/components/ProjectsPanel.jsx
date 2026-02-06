// frontend/src/components/ProjectsPanel.jsx
import React, { useState } from 'react';

const ProjectsPanel = ({ projects, onCreateProject, loading }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    target_column: 'Outcome',
    csv_schema: 'Pregnancies,Glucose,BloodPressure,SkinThickness,Insulin,BMI,DiabetesPedigreeFunction,Age,Outcome',
    model_code: '',
    num_rounds: 5,
    min_clients: 1
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await onCreateProject(formData);
    if (result.success) {
      setShowForm(false);
      setFormData({ ...formData, name: '', description: '' }); // Reset basic fields
    } else {
      alert(`Error: ${JSON.stringify(result.error)}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Your Projects</h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          {showForm ? 'Cancel' : '+ New Project'}
        </button>
      </div>

      {/* Create Project Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md border border-indigo-100">
          <h3 className="text-lg font-semibold mb-4">Create New Project</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input 
                placeholder="Project Name" 
                className="border p-2 rounded" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                required
              />
              <input 
                placeholder="Target Column (e.g. Outcome)" 
                className="border p-2 rounded" 
                value={formData.target_column}
                onChange={e => setFormData({...formData, target_column: e.target.value})}
                required
              />
            </div>
            <textarea 
              placeholder="Description" 
              className="border p-2 rounded w-full"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
            <textarea 
              placeholder="Paste Model Code (Python)" 
              className="border p-2 rounded w-full font-mono text-sm h-32"
              value={formData.model_code}
              onChange={e => setFormData({...formData, model_code: e.target.value})}
              required
            />
            <div className="text-xs text-gray-500">
              * Ensure code has `def create_model(input_shape):`
            </div>
            <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">
              Create Project
            </button>
          </form>
        </div>
      )}

      {/* Project List */}
      {loading ? (
        <p>Loading projects...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((proj) => (
            <div key={proj.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-gray-800">{proj.name}</h3>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  proj.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {proj.status}
                </span>
              </div>
              <p className="text-gray-500 text-sm mb-4 line-clamp-2">{proj.description}</p>
              
              <div className="grid grid-cols-2 gap-y-2 text-sm text-gray-600 mb-4">
                <div>Clients: <span className="font-medium text-gray-900">{proj.total_clients}</span></div>
                <div>Rounds: <span className="font-medium text-gray-900">{proj.current_round}/{proj.num_rounds}</span></div>
              </div>
              
              <div className="border-t pt-4 flex justify-between items-center text-xs text-gray-400">
                <span>ID: {proj.id}</span>
                <span>{new Date(proj.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
          
          {projects.length === 0 && !showForm && (
            <div className="col-span-full text-center py-12 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed">
              No projects found. Create one to get started!
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectsPanel;