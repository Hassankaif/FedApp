import React, { useEffect, useState } from 'react';
import { apiService } from '../api/apiService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

const AnalyticsPanel = ({ token }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ peakAcc: 0, finalLoss: 0, rounds: 0 });

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await apiService.metrics.getLatest(token);
        const metrics = response.metrics || [];
        
        setData(metrics);
        
        // Calculate Summary
        if (metrics.length > 0) {
          const peakAcc = Math.max(...metrics.map(m => m.accuracy));
          const finalLoss = metrics[metrics.length - 1].loss;
          setSummary({
            peakAcc: (peakAcc * 100).toFixed(2),
            finalLoss: finalLoss.toFixed(4),
            rounds: metrics.length
          });
        }
      } catch (err) {
        console.error("Failed to load analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token]);

  if (loading) return <div className="p-10 text-center text-gray-500">Loading Analytics...</div>;
  if (data.length === 0) return <div className="p-10 text-center text-gray-500">No training data found. Run a session first.</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* 1. Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-100">
          <p className="text-gray-500 text-sm font-semibold uppercase">Peak Accuracy</p>
          <h3 className="text-3xl font-bold text-indigo-600">{summary.peakAcc}%</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-100">
          <p className="text-gray-500 text-sm font-semibold uppercase">Final Loss</p>
          <h3 className="text-3xl font-bold text-gray-700">{summary.finalLoss}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-100">
          <p className="text-gray-500 text-sm font-semibold uppercase">Total Rounds</p>
          <h3 className="text-3xl font-bold text-gray-700">{summary.rounds}</h3>
        </div>
      </div>

      {/* 2. Main Evolution Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Model Convergence (Accuracy vs Loss)</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
              <XAxis dataKey="round" label={{ value: 'Round', position: 'insideBottom', offset: -5 }} />
              <YAxis yAxisId="left" domain={[0, 1]} label={{ value: 'Accuracy', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="right" orientation="right" label={{ value: 'Loss', angle: 90, position: 'insideRight' }} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                labelStyle={{ fontWeight: 'bold', color: '#333' }}
              />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="accuracy" stroke="#4F46E5" strokeWidth={3} name="Accuracy" dot={{ r: 4 }} activeDot={{ r: 8 }} />
              <Line yAxisId="right" type="monotone" dataKey="loss" stroke="#EF4444" strokeWidth={3} name="Loss" dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Client Stability Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Client Participation Stability</h3>
        <p className="text-sm text-gray-500 mb-4">Ensures all clients are contributing to every round.</p>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="round" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="num_clients" fill="#10B981" name="Active Clients" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPanel;