import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Charts = ({ metrics }) => {
  if (!metrics || metrics.length === 0) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-sm text-center text-gray-400 border border-gray-100 mb-6">
        Waiting for training metrics...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Accuracy Chart */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4">📈 Accuracy Progress</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="round" label={{ value: 'Round', position: 'insideBottomRight', offset: -5 }} />
              <YAxis domain={[0, 1]} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="accuracy" 
                stroke="#4F46E5" 
                strokeWidth={3} 
                activeDot={{ r: 6 }} 
                dot={{ r: 0 }}
                name="Accuracy"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Loss Chart */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4">📉 Loss Reduction</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="round" label={{ value: 'Round', position: 'insideBottomRight', offset: -5 }} />
              <YAxis />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="loss" 
                stroke="#EF4444" 
                strokeWidth={3} 
                dot={{ r: 0 }}
                name="Loss"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Charts;