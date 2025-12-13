import React, { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';

const Reports = () => {
  const [insights, setInsights] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        // Fetch AI insights
        const insightsRes = await fetch(`${API_URL}/ai/insights`, { headers });
        if (insightsRes.ok) {
          const insightsData = await insightsRes.json();
          setInsights(insightsData.data);
        }

        // Fetch dashboard summary (assuming there's an endpoint)
        const summaryRes = await fetch(`${API_URL}/admin/dashboard`, { headers });
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          setSummary(summaryData.data);
        }
      } catch (err) {
        console.error('Error fetching reports data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Reports & Analytics</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded p-4">
          <h2 className="font-semibold mb-2">Attendance Trends</h2>
          <p>Attendance trend data visualization coming soon.</p>
        </div>
        
        <div className="border rounded p-4">
          <h2 className="font-semibold mb-2">AI Insights</h2>
          {insights ? (
            <div>
              <p>{insights.summary || 'AI insights data available.'}</p>
            </div>
          ) : (
            <p>AI insights not available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
