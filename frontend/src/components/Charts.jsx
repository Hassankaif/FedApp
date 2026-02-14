import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Charts = ({ metrics }) => {
  if (!metrics || metrics.length === 0) {
    return (
      <div className="bg-white p-12 rounded-xl shadow-sm text-center border border-gray-100 mb-6 animate-pulse">
        <div className="text-4xl mb-4">📉</div>
        <h3 className="text-lg font-medium text-gray-600">Waiting for metrics...</h3>
        <p className="text-gray-400 text-sm mt-2">Start training to see real-time updates</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 animate-fadeIn">
      {/* Accuracy Chart */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
          Accuracy Progress
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis 
                dataKey="round" 
                label={{ value: 'Round', position: 'insideBottomRight', offset: -5, fontSize: 12 }} 
                tick={{fontSize: 12}}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                domain={[0, 1]} 
                tick={{fontSize: 12}} 
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              />
              <Legend wrapperStyle={{paddingTop: '10px'}} />
              <Line 
                type="monotone" 
                dataKey="accuracy" 
                stroke="#4F46E5" 
                strokeWidth={3} 
                activeDot={{ r: 6 }} 
                dot={{ r: 0 }}
                name="Accuracy"
                animationDuration={500}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Loss Chart */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500"></span>
          Loss Reduction
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis 
                dataKey="round" 
                label={{ value: 'Round', position: 'insideBottomRight', offset: -5, fontSize: 12 }} 
                tick={{fontSize: 12}}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{fontSize: 12}}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              />
              <Legend wrapperStyle={{paddingTop: '10px'}} />
              <Line 
                type="monotone" 
                dataKey="loss" 
                stroke="#EF4444" 
                strokeWidth={3} 
                dot={{ r: 0 }}
                name="Loss"
                animationDuration={500}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Charts;