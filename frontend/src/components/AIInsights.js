import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';

export default function AIInsights() {
  const { user } = useAuth();
  
  const [insights, setInsights] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAIInsights = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch AI insights from backend
      const data = await apiClient.get('/ai/insights');
      setInsights(data.insights || []);

      // Fetch predictions
      const predData = await apiClient.get('/ai/predictions');
      setPredictions(predData.predictions || []);
    } catch (err) {
      console.error('Error fetching AI insights:', err);
      setError('Failed to load AI insights');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAIInsights();
  }, [user, fetchAIInsights]);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-blue-200 rounded w-1/3"></div>
          <div className="h-3 bg-blue-200 rounded w-2/3"></div>
          <div className="h-3 bg-blue-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Insights Section */}
      {insights.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center space-x-3 mb-4">
            <span className="text-3xl">🤖</span>
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI-Powered Insights</h2>
              <p className="text-sm text-gray-600">Smart recommendations based on your data</p>
            </div>
          </div>
          <div className="space-y-3">
            {insights.slice(0, 3).map((insight, idx) => (
              <div key={idx} className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">💡</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                    <p className="text-sm text-gray-700 mt-1">{insight.description}</p>
                    {insight.action && (
                      <a href={insight.actionUrl} className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-2 inline-block">
                        {insight.action} →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Predictions Section */}
      {predictions.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center space-x-3 mb-4">
            <span className="text-3xl">🔮</span>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Predictive Analytics</h2>
              <p className="text-sm text-gray-600">ML-powered forecasts and recommendations</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {predictions.slice(0, 4).map((pred, idx) => (
              <div key={idx} className="bg-white rounded-lg p-4 border border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{pred.metric}</h3>
                  <span className={`text-sm font-bold ${
                    pred.trend === 'up' ? 'text-green-600' :
                    pred.trend === 'down' ? 'text-red-600' :
                    'text-yellow-600'
                  }`}>
                    {pred.value}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      pred.confidence > 0.8 ? 'bg-green-500' :
                      pred.confidence > 0.6 ? 'bg-yellow-500' :
                      'bg-orange-500'
                    }`}
                    style={{ width: `${pred.confidence * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Confidence: {(pred.confidence * 100).toFixed(0)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No insights state */}
      {insights.length === 0 && predictions.length === 0 && !error && (
        <div className="bg-gray-50 rounded-xl p-8 border border-gray-200 text-center">
          <p className="text-gray-600">AI insights will appear as data is collected</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 rounded-xl p-4 border border-red-200 text-red-700">
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
