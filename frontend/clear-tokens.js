// Clear old JWT tokens script
// Run this in browser console to clear old tokens after JWT secret change

// Clear all authentication data
localStorage.removeItem('token');
localStorage.removeItem('user');
localStorage.removeItem('role');

// Clear any other app-specific data if needed
localStorage.clear();

// Reload the page to start fresh
window.location.reload();

console.log('✅ All authentication data cleared. Please log in again.');