import React, { useState } from 'react';
import Papa from 'papaparse';

export default function UserManagement({ users = [] }){
  const [filter, setFilter] = useState('');

  const exportCSV = () => {
    const csv = Papa.unparse(users);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'users.csv'; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium">User Management</h3>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="px-3 py-1 bg-indigo-600 text-white rounded">Export CSV</button>
        </div>
      </div>
      <div className="mb-2">
        <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search by name or dept" className="w-full p-2 border rounded" />
      </div>
      <div className="overflow-auto max-h-64">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-600">
            <tr><th className="pb-2">Name</th><th className="pb-2">Role</th><th className="pb-2">Dept</th></tr>
          </thead>
          <tbody>
            {users.filter(u=>u.name.toLowerCase().includes(filter.toLowerCase())||u.department?.toLowerCase().includes(filter.toLowerCase())).map(u=> (
              <tr key={u.id} className="border-t"><td className="py-2">{u.name}</td><td className="py-2">{u.role}</td><td className="py-2">{u.department}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
