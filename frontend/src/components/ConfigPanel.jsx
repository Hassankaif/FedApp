// frontend/src/components/ConfigPanel.jsx
import React from 'react';

const ConfigPanel = ({ savedModels, datasets }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Saved Models List (Restored Feature) */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">💾 Saved Models</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {savedModels.length === 0 ? (
              <p className="text-gray-500 text-sm">No models saved yet.</p>
            ) : (
              savedModels.map((model, idx) => (
                <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-gray-700 truncate w-48" title={model.filename}>
                      {model.filename}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(model.created).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      model.type === 'global' ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {model.type}
                    </span>
                    <span className="text-xs text-gray-400">
                      {(model.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Datasets List */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📂 Available Datasets</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {datasets.map((ds, idx) => (
              <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="font-semibold text-gray-700">{ds.filename}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {ds.rows} rows • {ds.columns} columns
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigPanel;