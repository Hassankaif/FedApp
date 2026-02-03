import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ComparisonPanel = ({ token }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL;

  const fetchComparison = async () => {
    try {
      const res = await fetch(`${API_URL}/training/comparison`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error("Failed to fetch comparison", err);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, []);

  const handleRunCentralized = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('dataset_file', file);

    try {
      const res = await fetch(`${API_URL}/training/centralized`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Training failed');
      
      await fetchComparison(); // Refresh results
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Safe check to see if we have valid comparison data
  const hasData = results && results.federated && results.centralized;

  const chartData = hasData ? [
    {
      name: 'Accuracy',
      Federated: results.federated.accuracy,
      Centralized: results.centralized.accuracy
    },
    {
      name: 'Loss',
      Federated: results.federated.loss,
      Centralized: results.centralized.loss
    }
  ] : [];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">⚖️ Model Comparison</h2>
        
        {/* Upload & Train Section */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100">
          <h3 className="font-semibold text-blue-800 mb-2">Run Centralized Baseline</h3>
          <div className="flex gap-4 items-center">
            <input 
              type="file" 
              accept=".csv"
              onChange={(e) => setFile(e.target.files[0])}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-100 file:text-blue-700
                hover:file:bg-blue-200"
            />
            <button
              onClick={handleRunCentralized}
              disabled={loading || !file}
              className={`px-6 py-2 rounded-lg font-semibold text-white transition-all ${
                loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? 'Training...' : 'Run Training'}
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        {/* Results View - Protected by hasData check */}
        {hasData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Federated" fill="#4F46E5" />
                  <Bar dataKey="Centralized" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">Performance Gap (Accuracy)</div>
                <div className={`text-2xl font-bold ${
                  results.comparison.accuracy_diff > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {(results.comparison.accuracy_diff * 100).toFixed(2)}%
                </div>
                <div className="text-xs text-gray-400">
                  {results.comparison.accuracy_diff > 0 ? 'Centralized is better' : 'Federated is better'}
                </div>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-500">Training Time Difference</div>
                <div className="text-2xl font-bold text-gray-800">
                  {results.centralized.training_time.toFixed(2)}s
                </div>
                <div className="text-xs text-gray-400">Centralized training duration</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <p className="text-gray-500 text-lg mb-2">Comparison Data Unavailable</p>
            <p className="text-sm text-gray-400">
              {results?.error || "Please run both Federated and Centralized training to see results."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComparisonPanel;