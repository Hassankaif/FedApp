// frontend/src/components/ConfigPanel.jsx
import React from 'react';

const ConfigPanel = ({ savedModels = [], datasets = [] }) => {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Saved Models List */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">💾 Global Models</h2>
            <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded">
              {savedModels.length} Saved
            </span>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            {savedModels.length === 0 ? (
              <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg border border-dashed">
                No models saved yet.<br/>
                <span className="text-xs">Complete a training session to see models here.</span>
              </div>
            ) : (
              savedModels.map((model, idx) => (
                <div key={idx} className="group bg-white hover:bg-gray-50 p-3 rounded-lg border border-gray-200 transition-colors flex justify-between items-center cursor-default">
                  <div className="overflow-hidden">
                    <div className="font-semibold text-gray-700 truncate w-full" title={model.filename}>
                      {model.filename}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                      <span>📅 {new Date(model.created).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-4 min-w-[80px]">
                    <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-full ${
                      model.type === 'global' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {model.type}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">
                      {(model.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Datasets List */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">📂 Datasets</h2>
            <button className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
              + Upload
            </button>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            {datasets.length === 0 ? (
               <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg border border-dashed">
                No datasets found.
              </div>
            ) : (
              datasets.map((ds, idx) => (
                <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-100 p-2 rounded text-xl">📊</div>
                    <div>
                      <div className="font-semibold text-gray-700">{ds.filename}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        <span className="font-medium text-gray-700">{ds.rows}</span> rows • 
                        <span className="font-medium text-gray-700 mx-1">{ds.columns}</span> columns
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigPanel;