import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { apiService } from '../api/apiService'; // 👈 Use the service

const ComparisonPanel = ({ token }) => { // Token prop is still here to trigger useEffect, but API service handles the header
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const fetchComparison = useCallback(async () => {
    try {
      // FIX: Use apiService instead of raw fetch
      const data = await apiService.training.getComparison();
      
      // Handle case where backend returns { error: "..." }
      if (data.error) {
         setResults(null); 
      } else {
         setResults(data);
      }
    } catch (err) {
      console.error("Failed to fetch comparison", err);
    }
  }, []);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  const handleRunCentralized = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    
    try {
      // FIX: Use apiService for file upload
      await apiService.training.runCentralized(file);
      await fetchComparison(); // Refresh results on success
    } catch (err) {
      setError(err.response?.data?.detail || 'Training failed');
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
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">⚖️ Benchmark Comparison</h2>
        
        {/* Upload & Train Section */}
        <div className="bg-blue-50 p-6 rounded-xl mb-8 border border-blue-100">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            📊 Run Centralized Baseline
          </h3>
          <p className="text-sm text-blue-700 mb-4">
            Upload a local CSV dataset to train a model centrally. This allows you to compare Federated Learning performance against a standard centralized approach.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <input 
              type="file" 
              accept=".csv"
              onChange={(e) => setFile(e.target.files[0])}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2.5 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-white file:text-blue-600
                hover:file:bg-blue-50 transition-all cursor-pointer"
            />
            <button
              onClick={handleRunCentralized}
              disabled={loading || !file}
              className={`px-6 py-2.5 rounded-lg font-bold text-white shadow-sm transition-all whitespace-nowrap ${
                loading || !file
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md transform hover:-translate-y-0.5'
              }`}
            >
              {loading ? 'Training Model...' : 'Run Training'}
            </button>
          </div>
          {error && (
            <div className="mt-3 p-2 bg-red-100 text-red-700 text-sm rounded border border-red-200">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Results View */}
        {hasData ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-80 w-full bg-white p-2 rounded-lg">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Legend iconType="circle" />
                  <Bar name="Federated (Privacy)" dataKey="Federated" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                  <Bar name="Centralized (Standard)" dataKey="Centralized" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-4">
              <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Accuracy Gap</div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={`text-3xl font-bold ${
                    results.comparison.accuracy_diff > 0 ? 'text-green-600' : 'text-indigo-600'
                  }`}>
                    {Math.abs(results.comparison.accuracy_diff * 100).toFixed(2)}%
                  </span>
                  <span className="text-sm text-gray-500">
                    difference
                  </span>
                </div>
                <div className="text-xs font-medium text-gray-400 mt-2">
                  {results.comparison.accuracy_diff > 0 
                    ? 'Centralized model performed slightly better.' 
                    : 'Federated model outperformed centralized!'}
                </div>
              </div>
              
              <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">Training Time</div>
                <div className="text-3xl font-bold text-gray-800 mt-1">
                  {results.centralized.training_time.toFixed(2)}s
                </div>
                <div className="text-xs text-gray-400 mt-2">Duration of centralized training session</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <div className="text-4xl mb-3 opacity-50">⚖️</div>
            <p className="text-gray-600 text-lg font-medium mb-1">No Comparison Data Available</p>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              {results?.error || "Run a Federated Training session first, then run a Centralized Baseline above to compare performance."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComparisonPanel;