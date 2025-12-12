import React, { useState } from 'react';

export default function RosterManagement({ roster = [] }){
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusBadge = (status) => {
    if (!status) return { bg: 'bg-gray-100', text: 'text-gray-700', icon: '❓' };
    const s = status.toLowerCase();
    if (s.includes('present')) return { bg: 'bg-green-100', text: 'text-green-700', icon: '✅' };
    if (s.includes('absent')) return { bg: 'bg-red-100', text: 'text-red-700', icon: '❌' };
    if (s.includes('late')) return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: '⏱️' };
    return { bg: 'bg-blue-100', text: 'text-blue-700', icon: 'ℹ️' };
  };

  const filteredRoster = roster.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const presentCount = roster.filter(s => s.status?.toLowerCase().includes('present')).length;
  const absentCount = roster.filter(s => s.status?.toLowerCase().includes('absent')).length;

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl md:rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 sm:px-5 md:px-6 py-3 sm:py-4">
        <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
          <span className="text-xl">👥</span>
          Class Roster
        </h3>
        <p className="text-xs sm:text-sm text-emerald-100 mt-1">{roster.length} students • ✅ {presentCount} • ❌ {absentCount}</p>
      </div>

      {/* Search & Content */}
      <div className="p-4 sm:p-5 md:p-6">
        {/* Search Bar */}
        <div className="mb-4 relative">
          <input
            type="text"
            placeholder="🔍 Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Roster Table */}
        <div className="overflow-x-auto max-h-72 rounded-lg border border-gray-200">
          {filteredRoster.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm sm:text-base">😴 No students found</p>
            </div>
          ) : (
            <table className="w-full text-xs sm:text-sm">
              <thead className="sticky top-0 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 sm:px-4 py-3 text-left font-bold text-gray-700">Student</th>
                  <th className="px-3 sm:px-4 py-3 text-left font-bold text-gray-700">Status</th>
                  <th className="px-3 sm:px-4 py-3 text-left font-bold text-gray-700">Device</th>
                  <th className="px-3 sm:px-4 py-3 text-left font-bold text-gray-700">Check-in</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRoster.map((s, idx) => {
                  const statusBadge = getStatusBadge(s.status);
                  return (
                    <tr key={s.id || idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 sm:px-4 py-2 sm:py-3">
                        <p className="font-semibold text-gray-800">{s.name || 'Unknown'}</p>
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">
                        <span className={`px-2 sm:px-3 py-1 rounded-full font-medium inline-flex items-center gap-1 ${statusBadge.bg} ${statusBadge.text}`}>
                          <span>{statusBadge.icon}</span>
                          <span className="hidden sm:inline">{s.status || 'Unknown'}</span>
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-600">
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">{s.device || '—'}</span>
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-600 font-mono text-xs sm:text-sm">{s.time || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
