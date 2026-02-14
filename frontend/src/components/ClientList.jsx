// frontend/src/components/ClientList.jsx
import React from 'react';

const ClientList = ({ clients = [] }) => {
  return (
    <div className="mb-8 animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          🏥 Connected Nodes
        </h3>
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded ${
          clients.length > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
        }`}>
          {clients.length} Online
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.length === 0 ? (
           <div className="col-span-full bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
             <div className="text-4xl mb-2">🔌</div>
             <p className="text-gray-500 font-medium">Waiting for hospitals to connect...</p>
             <p className="text-xs text-gray-400 mt-2">
               Launch the Electron Client to join the network.
             </p>
           </div>
        ) : (
          clients.map((client, index) => (
            <div key={index} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500 flex justify-between items-center transition hover:shadow-md transform hover:-translate-y-0.5">
              <div>
                <div className="font-bold text-gray-900 text-sm">{client.client_id}</div>
                <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  Ready to train
                </div>
              </div>
              <div className="text-2xl opacity-80">🏥</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ClientList;