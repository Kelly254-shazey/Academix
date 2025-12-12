import React from 'react';

export default function AIInsightsPanel({ insights }){
  const data = insights || {};
  const riskLevel = data.riskLevel || data.risk_level || 'Low';
  const riskColor = riskLevel === 'High' ? 'from-red-500 to-rose-500' : riskLevel === 'Medium' ? 'from-yellow-500 to-orange-500' : 'from-green-500 to-emerald-500';
  const riskBg = riskLevel === 'High' ? 'bg-red-50 border-red-200' : riskLevel === 'Medium' ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200';
  
  return (
    <div className={`p-5 sm:p-6 md:p-7 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900">🤖 AI Insights</h3>
        <span className="text-2xl">✨</span>
      </div>
      
      <div className={`p-4 rounded-lg border ${riskBg} mb-4`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Absenteeism Risk</p>
            <p className="text-xs text-gray-600 mt-1">Your attendance pattern analysis</p>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-bold text-white bg-gradient-to-r ${riskColor}`}>
            {riskLevel}
          </span>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
        <h4 className="text-sm font-semibold text-indigo-900 mb-2">💡 Recommendation</h4>
        <p className="text-sm text-indigo-800 leading-relaxed">
          {data.recommendation || data.recommendations || 'Keep up attendance. Consider attending 2 more classes this week.'}
        </p>
      </div>

      {typeof data.requiredClasses !== 'undefined' && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Classes Needed</p>
              <p className="text-xs text-gray-600 mt-1">To meet attendance threshold</p>
            </div>
            <span className="text-3xl font-bold text-purple-600">{data.requiredClasses}</span>
          </div>
        </div>
      )}
    </div>
  );
}
