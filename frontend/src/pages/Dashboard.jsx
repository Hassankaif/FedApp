// frontend/src/pages/Dashboard.jsx
import React, { useState } from 'react';
import { useTraining } from '../hooks/useTraining';
import Charts from '../components/Charts';
import ClientList from '../components/ClientList';
import ConfigPanel from '../components/ConfigPanel';
import ComparisonPanel from '../components/ComparisonPanel';

const Dashboard = ({ token, onLogout }) => {
  // 1. Get all data from the updated Hook
  const { 
    metrics, status, clients, savedModels, datasets, 
    startTraining 
  } = useTraining(token);
  
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-md z-20 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-8">
              <span className="text-xl font-bold text-indigo-600">
                🚀 Federated Dashboard
              </span>
              
              {/* Tab Buttons */}
              <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
                {['dashboard', 'config', 'comparison'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab 
                        ? 'bg-white text-indigo-600 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                status === 'training' 
                  ? 'bg-green-100 text-green-700 border border-green-200 animate-pulse' 
                  : 'bg-gray-100 text-gray-600 border border-gray-200'
              }`}>
                {status}
              </span>
              <button 
                onClick={onLogout}
                className="text-sm font-medium text-red-500 hover:text-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-800">Network Overview</h1>
              <button
                onClick={startTraining}
                disabled={status === 'training'}
                className={`px-6 py-2 rounded-lg font-bold text-white shadow-md transition-all ${
                  status === 'training'
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg'
                }`}
              >
                {status === 'training' ? 'Training in Progress...' : 'Start Federated Training'}
              </button>
            </div>
            
            <ClientList clients={clients} />
            <Charts metrics={metrics} />
          </div>
        )}

        {activeTab === 'config' && (
          <ConfigPanel 
            savedModels={savedModels} 
            datasets={datasets} 
          />
        )}

        {activeTab === 'comparison' && (
          <ComparisonPanel token={token} />
        )}
      </main>
    </div>
  );
};

export default Dashboard;