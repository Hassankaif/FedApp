// frontend/src/components/ProjectsPanel.jsx 
import React, { useState } from 'react';

const ProjectsPanel = ({
  projects = [],
  templates = [],
  onCreateProject,
  onSaveTemplate,
  loading,
  startTraining,
  stopTraining,
  trainingStatus,
  trainingProjectId
}) => {
  const [showForm, setShowForm] = useState(false);
  
  // Selection State
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [customModelName, setCustomModelName] = useState(""); 

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

  // 🔥 FIXED: Robust Template Handler
  const handleTemplateChange = (e) => {
    const val = e.target.value;
    setSelectedTemplateId(val);
    
    if (val === "custom") {
      setFormData(prev => ({ ...prev, model_code: "" }));
    } else {
      const tmpl = templates.find(t => t.id === parseInt(val));
      if (tmpl) {
        console.log("Selected Template:", tmpl); // Debug log
        // Handle both 'code' (frontend snippet) and 'model_code' (database column name)
        const code = tmpl.code || tmpl.model_code || ""; 
        setFormData(prev => ({ ...prev, model_code: code }));
      }
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // 🔥 FIXED: Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    // 1. Save Custom Model Logic (Preserved Feature)
    if (selectedTemplateId === "custom" && customModelName.trim()) {
      if (!formData.model_code || !formData.model_code.trim()) {
        setError("Please enter valid python code for your custom model.");
        return;
      }
      if (onSaveTemplate) {
          const saved = await onSaveTemplate(customModelName, formData.model_code);
          if (!saved) {
            setError("Failed to save custom model template.");
            return;
          }
      }
    }

    // 2. Safety Check: Validation (New Bug Fix)
    if (!formData.model_code || typeof formData.model_code !== 'string' || formData.model_code.trim() === "") {
        setError("❌ Model code is missing! Please select a template or choose 'Custom' and paste your code.");
        return;
    }

    // 3. Prepare Payload
    const schemaArray = formData.csv_schema.split(',').map(c => c.trim()).filter(c => c);
    
    if (!schemaArray.includes(formData.target_column.trim())) {
      setError(`Target column "${formData.target_column}" not found in CSV schema`);
      return;
    }

    const expectedFeatures = schemaArray.filter(c => c !== formData.target_column.trim()).length;

    const payload = {
      ...formData,
      // Ensure model_code is explicitly a string, never undefined
      model_code: formData.model_code || "", 
      expected_features: expectedFeatures,
      // Robust integer parsing with defaults
      num_rounds: parseInt(formData.num_rounds) || 10,
      min_clients: parseInt(formData.min_clients) || 1,
      local_epochs: parseInt(formData.local_epochs) || 5,
      batch_size: parseInt(formData.batch_size) || 32,
    };

    console.log("📤 Submitting Payload:", payload); 

    const result = await onCreateProject(payload);
    
    if (result.success) {
      setShowForm(false);
      setFormData(prev => ({ ...prev, name: '', description: '', model_code: '' }));
      setSelectedTemplateId(""); 
      setCustomModelName("");
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
              <input 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                placeholder="Project Name" 
                className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" 
                required 
              />
              <input 
                name="target_column" 
                value={formData.target_column} 
                onChange={handleChange} 
                placeholder="Target Column" 
                className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" 
                required 
              />
            </div>

            {/* Model Selection Dropdown */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <label className="block text-sm font-bold text-gray-700 mb-2">Machine Learning Model</label>
              
              <select 
                value={selectedTemplateId} 
                onChange={handleTemplateChange}
                className="w-full border p-2 rounded mb-3 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              >
                <option value="" disabled>-- Select a Model --</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name} (Template)</option>
                ))}
                <option value="custom">✨ Custom Model Code</option>
              </select>

              {/* Logic: Only show text area if "Custom" is selected */}
              {selectedTemplateId === "custom" && (
                <div className="animate-in fade-in slide-in-from-top-2 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-indigo-600 block mb-1">Name for your new Custom Model:</label>
                    <input 
                      value={customModelName} 
                      onChange={(e) => setCustomModelName(e.target.value)} 
                      placeholder="e.g. My Experimental CNN" 
                      className="w-full border border-indigo-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Custom Model Code (Python)</label>
                    <textarea 
                      name="model_code"
                      value={formData.model_code}
                      onChange={handleChange}
                      placeholder="def create_model(input_shape): ..."
                      className="w-full border p-3 rounded font-mono text-sm h-48 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      required
                    />
                  </div>
                </div>
              )}
              
              {/* Logic: Show Info Box if Template is selected */}
              {selectedTemplateId && selectedTemplateId !== "custom" && (
                <div className="text-sm text-green-600 bg-green-50 p-3 rounded border border-green-200 flex items-start gap-2">
                   <span>✓</span>
                   <div>
                      <b>Template Selected:</b> {templates.find(t => t.id === parseInt(selectedTemplateId))?.name}
                      <p className="text-xs text-green-800 mt-1 opacity-80">
                        The model code is hidden and will be applied automatically.
                      </p>
                   </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <div>
                 <label className="block text-xs font-medium text-gray-500 mb-1">Rounds</label>
                 <input type="number" name="num_rounds" value={formData.num_rounds} onChange={handleChange} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" />
               </div>
               <div>
                 <label className="block text-xs font-medium text-gray-500 mb-1">Clients</label>
                 <input type="number" name="min_clients" value={formData.min_clients} onChange={handleChange} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" />
               </div>
               <div>
                 <label className="block text-xs font-medium text-gray-500 mb-1">Epochs</label>
                 <input type="number" name="local_epochs" value={formData.local_epochs} onChange={handleChange} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" />
               </div>
               <div>
                 <label className="block text-xs font-medium text-gray-500 mb-1">Batch</label>
                 <input type="number" name="batch_size" value={formData.batch_size} onChange={handleChange} className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none" />
               </div>
            </div>

            <div>
               <label className="block text-xs font-medium text-gray-500 mb-1">CSV Schema</label>
               <input 
                 name="csv_schema" 
                 value={formData.csv_schema} 
                 onChange={handleChange} 
                 placeholder="CSV Schema (col1, col2, target)" 
                 className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm" 
                 required 
               />
               <p className="text-xs text-gray-400 mt-1">
                 ℹ️ Must include the target column.
               </p>
            </div>

            <div className="flex justify-end">
              <button 
                type="submit" 
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-2 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 shadow-md transform hover:scale-105 transition-all"
              >
                {selectedTemplateId === "custom" ? "Save & Create Project" : "Create Project"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Project Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(p => {
            const isThisProjectRunning = trainingStatus === 'training' && trainingProjectId === p.id;
            const isOtherProjectRunning = trainingStatus === 'training' && trainingProjectId !== p.id;

            return (
              <div key={p.id} className={`bg-white p-6 rounded-xl shadow-sm border transition-all ${
                  isThisProjectRunning ? 'border-green-400 ring-2 ring-green-100' : 'border-gray-200 hover:shadow-md'
              }`}>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-lg text-gray-800 truncate pr-2" title={p.name}>{p.name}</h3>
                  <span className={`px-2 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
                      p.status === 'active' || p.status === 'training' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {p.status || 'DRAFT'}
                  </span>
                </div>

                <p className="text-gray-500 text-sm mb-4 h-10 line-clamp-2">{p.description || 'No description provided.'}</p>

                <div className="border-t pt-4 flex justify-between items-center text-xs text-gray-400">
                  <span className="font-mono">ID: {p.id}</span>
                  <span>{p.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A'}</span>
                </div>

                {/* ACTION BUTTON AREA */}
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
                      onClick={() => startTraining(p.id)}
                      disabled={isOtherProjectRunning}
                      className={`w-full py-2 rounded-lg font-bold transition-all ${
                        isOtherProjectRunning
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
                      }`}
                    >
                      {isOtherProjectRunning ? 'System Busy' : 'Start Federated Training'}
                    </button>
                  )}
                </div>
              </div>
            );
        })}
      </div>
    </div>
  );
};

export default ProjectsPanel;