import React from 'react';

const ClientList = ({ clients }) => {
  // Default placeholders if no clients connected yet
  const displayClients = clients.length > 0 ? clients : [];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800">Connected Hospitals</h3>
        <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
          {displayClients.length} Active
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {displayClients.length === 0 ? (
           <div className="col-span-3 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-6 text-center text-gray-500">
             Waiting for clients (hospitals) to connect...
             <br/>
             <span className="text-xs text-gray-400">Run python client.py in your terminal</span>
           </div>
        ) : (
          displayClients.map((client, index) => (
            <div key={index} className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500 flex justify-between items-center transition hover:shadow-md">
              <div>
                <div className="font-bold text-gray-900">{client.client_id}</div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Online
                </div>
              </div>
              <div className="text-2xl">🏥</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ClientList;