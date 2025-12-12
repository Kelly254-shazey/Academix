import React from 'react';
import { useGetAIInsightsQuery, useGetDashboardSummaryQuery } from '../../features/apiSlice';
import { Bar, Line } from 'react-chartjs-2'; // You'll need to install chart.js and react-chartjs-2

const Reports = () => {
  const { data: insights } = useGetAIInsightsQuery();
  const { data: summary } = useGetDashboardSummaryQuery();

  // Build chart data from backend summary when available
  const attendanceData = summary?.attendanceWeekly ? {
    labels: summary.attendanceWeekly.map(s => s.week || s.label),
    datasets: [{
      label: 'Attendance Rate',
      data: summary.attendanceWeekly.map(s => s.rate || s.percentage || 0),
      backgroundColor: 'rgba(75, 192, 192, 0.6)',
    }]
  } : null;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Reports & Analytics</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded p-4">
          <h2 className="font-semibold mb-2">Attendance Trends</h2>
          {attendanceData ? <Bar data={attendanceData} /> : <p className="muted">Attendance trend data not available.</p>}
        </div>
        
        <div className="border rounded p-4">
          <h2 className="font-semibold mb-2">AI Insights</h2>
          <p>Absenteeism Predictions: {insights?.absenteeism_predictions?.length || 0}</p>
          <p>Anomalies Detected: {insights?.anomalies?.length || 0}</p>
        </div>
      </div>
      
      <div className="mt-6">
        <button className="bg-blue-500 text-white px-4 py-2 rounded">
          Export CSV
        </button>
        <button className="bg-green-500 text-white px-4 py-2 rounded ml-2">
          Export PDF
        </button>
      </div>
    </div>
  );
};

export default Reports;
