/**
 * Export Helpers
 * Functions to export data as CSV, JSON, or PDF
 */

export const exportToCSV = (data, filename = 'export.csv') => {
  if (!data || data.length === 0) {
    console.error('No data to export');
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  let csv = headers.join(',') + '\n';
  
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      // Escape commas and quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value || '';
    });
    csv += values.join(',') + '\n';
  });

  // Download file
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

export const exportToJSON = (data, filename = 'export.json') => {
  if (!data) {
    console.error('No data to export');
    return;
  }

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

export const printData = (data, title = 'Report') => {
  const printWindow = window.open('', '', 'height=400,width=600');
  
  let html = `<html><head><title>${title}</title>`;
  html += `<style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
  </style></head><body>`;
  
  html += `<h1>${title}</h1>`;
  
  if (Array.isArray(data)) {
    html += '<table>';
    const headers = Object.keys(data[0]);
    html += '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
    data.forEach(row => {
      html += '<tr>' + headers.map(h => `<td>${row[h]}</td>`).join('') + '</tr>';
    });
    html += '</table>';
  } else {
    html += '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
  }
  
  html += '</body></html>';
  
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();
};
