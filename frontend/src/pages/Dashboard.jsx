// frontend/src/pages/Dashboard.jsx
import React, { useState } from 'react';
import { useTraining } from '../hooks/useTraining';
import { useProjects } from '../hooks/useProjects'; // <--- Import New Hook
import Charts from '../components/Charts';
import ClientList from '../components/ClientList';
import ConfigPanel from '../components/ConfigPanel';
import ComparisonPanel from '../components/ComparisonPanel';
import ProjectsPanel from '../components/ProjectsPanel'; // <--- Import New Component

const Dashboard = ({ token, onLogout }) => {
  // Existing Training Hook
  const { metrics, status, clients, savedModels, datasets, startTraining } = useTraining(token);
  
  // New Projects Hook
  const { projects, createNewProject, loading: loadingProjects } = useProjects(token);
  
  const [activeTab, setActiveTab] = useState('projects'); // Default to Projects now

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <nav className="bg-white shadow-md z-20 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-8">
              <span className="text-xl font-bold text-indigo-600">🚀 Federated Dashboard</span>
              <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
                {['projects', 'dashboard', 'config', 'comparison'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${status === 'training' ? 'bg-green-100 text-green-700 animate-pulse' : 'bg-gray-100 text-gray-600'}`}>
                {status}
              </span>
              <button onClick={onLogout} className="text-sm font-medium text-red-500 hover:text-red-700">Logout</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {activeTab === 'projects' && (
          <ProjectsPanel 
            projects={projects} 
            onCreateProject={createNewProject}
            loading={loadingProjects}
          />
        )}
        
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
             <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-800">Network Overview</h1>
              <button
                onClick={startTraining}
                disabled={status === 'training'}
                className={`px-6 py-2 rounded-lg font-bold text-white shadow-md transition-all ${
                  status === 'training' ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {status === 'training' ? 'Training in Progress...' : 'Start Federated Training'}
              </button>
            </div>
            <ClientList clients={clients} />
            <Charts metrics={metrics} />
          </div>
        )}

        {activeTab === 'config' && <ConfigPanel savedModels={savedModels} datasets={datasets} />}
        {activeTab === 'comparison' && <ComparisonPanel token={token} />}
      </main>
    </div>
  );
};

export default Dashboard;