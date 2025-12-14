import React, { useEffect, useState } from 'react';
import { Send, Phone, Mail, Clock, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import apiClient from '../../utils/apiClient';

export default function Support() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    category: 'technical',
    description: '',
    priority: 'medium'
  });

  useEffect(() => {
    fetchSupportTickets();
  }, []);

  const fetchSupportTickets = async () => {
    try {
      setLoading(true);
      const result = await apiClient.get('/api/lecturer/support');
      if (result.success) {
        setTickets(result.data || []);
      } else {
        throw new Error(result.message || 'Failed to fetch support tickets');
      }
    } catch (err) {
      console.error('Error fetching support tickets:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.description.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      const result = await apiClient.post('/api/lecturer/support', formData);
      if (result.success) {
        setFormData({ subject: '', category: 'technical', description: '', priority: 'medium' });
        setShowForm(false);
        await fetchSupportTickets();
        alert('Support ticket created successfully');
      } else {
        throw new Error(result.message || 'Failed to create ticket');
      }
    } catch (err) {
      console.error('Error creating support ticket:', err);
      alert('Failed to create support ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'text-yellow-600 bg-yellow-50';
      case 'in_progress': return 'text-blue-600 bg-blue-50';
      case 'resolved': return 'text-green-600 bg-green-50';
      case 'closed': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open': return <AlertCircle className="h-5 w-5" />;
      case 'in_progress': return <Loader className="h-5 w-5 animate-spin" />;
      case 'resolved': return <CheckCircle className="h-5 w-5" />;
      case 'closed': return <CheckCircle className="h-5 w-5" />;
      default: return null;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">🆘 Support & Help</h1>
            <p className="text-purple-100 mt-1">Get help with issues and submit support tickets</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-purple-600 font-semibold rounded-lg hover:bg-purple-50 transition-colors"
          >
            <Send className="h-5 w-5" />
            New Ticket
          </button>
        </div>
      </div>

      {/* Quick Support Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4">
            <Phone className="h-6 w-6 text-purple-600 mt-1" />
            <div>
              <h3 className="font-semibold text-gray-800">Phone Support</h3>
              <p className="text-sm text-gray-600 mt-1">Available Mon-Fri 9AM-5PM</p>
              <p className="text-purple-600 font-semibold mt-2">+1 (555) 123-4567</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4">
            <Mail className="h-6 w-6 text-purple-600 mt-1" />
            <div>
              <h3 className="font-semibold text-gray-800">Email Support</h3>
              <p className="text-sm text-gray-600 mt-1">Response within 24 hours</p>
              <p className="text-purple-600 font-semibold mt-2">support@academix.edu</p>
            </div>
          </div>
        </div>
      </div>

      {/* New Ticket Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Create New Support Ticket</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Subject *</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                placeholder="Brief description of your issue"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="technical">Technical Issue</option>
                  <option value="account">Account Issue</option>
                  <option value="feature">Feature Request</option>
                  <option value="general">General Inquiry</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Provide detailed information about your issue"
                rows="4"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                required
              ></textarea>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Ticket'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Support Tickets */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Support Tickets</h2>
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 mb-4">
            <p className="font-semibold">Error loading tickets</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {tickets.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <p className="text-gray-500 text-lg">No support tickets yet</p>
            <p className="text-gray-400 text-sm mt-2">Create a new ticket if you need assistance</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-800">{ticket.subject}</h3>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(ticket.status)}`}>
                        {getStatusIcon(ticket.status)}
                        {ticket.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{ticket.description}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                      <span>Category: <span className="font-semibold text-gray-700">{ticket.category}</span></span>
                      <span className={`font-semibold ${getPriorityColor(ticket.priority)}`}>
                        Priority: {ticket.priority.toUpperCase()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAQ Section */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <details className="cursor-pointer">
            <summary className="font-semibold text-gray-700 hover:text-indigo-600">How do I reset my password?</summary>
            <p className="text-gray-600 text-sm mt-2 ml-4">Visit the login page and click "Forgot Password" to reset your password via email.</p>
          </details>
          <details className="cursor-pointer">
            <summary className="font-semibold text-gray-700 hover:text-indigo-600">How do I generate QR codes for my class?</summary>
            <p className="text-gray-600 text-sm mt-2 ml-4">Navigate to the QR Code section in the dashboard and select your class to generate a new QR code.</p>
          </details>
          <details className="cursor-pointer">
            <summary className="font-semibold text-gray-700 hover:text-indigo-600">How long are QR codes valid?</summary>
            <p className="text-gray-600 text-sm mt-2 ml-4">QR codes are valid for 30-40 seconds to ensure secure attendance marking.</p>
          </details>
        </div>
      </div>
    </div>
  );
}
