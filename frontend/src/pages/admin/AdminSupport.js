import React, { useEffect, useState } from 'react';
import {
  HelpCircle,
  MessageSquare,
  Phone,
  Mail,
  FileText,
  Search,
  AlertCircle,
  User,
  Send,
  Plus
} from 'lucide-react';
import apiClient from '../../services/apiClient';

export default function AdminSupport() {
  const [activeTab, setActiveTab] = useState('tickets');
  const [tickets, setTickets] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    category: 'technical',
    priority: 'medium',
    description: ''
  });
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    if (activeTab === 'tickets') {
      fetchTickets();
    } else if (activeTab === 'faq') {
      fetchFAQs();
    }
  }, [activeTab]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/admin/support/tickets');
      if (response.success) {
        setTickets(response.data || []);
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError('Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchFAQs = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/admin/support/faqs');
      if (response.success) {
        setFaqs(response.data || []);
      }
    } catch (err) {
      console.error('Error fetching FAQs:', err);
      setError('Failed to load FAQs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async () => {
    try {
      const response = await apiClient.post('/admin/support/tickets', newTicket);
      if (response.success) {
        setShowNewTicketModal(false);
        setNewTicket({
          subject: '',
          category: 'technical',
          priority: 'medium',
          description: ''
        });
        fetchTickets();
      } else {
        throw new Error(response.message || 'Failed to create ticket');
      }
    } catch (err) {
      console.error('Error creating ticket:', err);
      setError(err.message);
    }
  };

  const handleReplyToTicket = async (ticketId) => {
    if (!replyText.trim()) return;

    try {
      const response = await apiClient.post(`/admin/support/tickets/${ticketId}/reply`, {
        message: replyText
      });
      if (response.success) {
        setReplyText('');
        fetchTickets();
        // Refresh selected ticket details
        if (selectedTicket && selectedTicket.id === ticketId) {
          const updatedTicket = tickets.find(t => t.id === ticketId);
          setSelectedTicket(updatedTicket);
        }
      } else {
        throw new Error(response.message || 'Failed to send reply');
      }
    } catch (err) {
      console.error('Error sending reply:', err);
      setError(err.message);
    }
  };

  const updateTicketStatus = async (ticketId, status) => {
    try {
      const response = await apiClient.put(`/admin/support/tickets/${ticketId}/status`, { status });
      if (response.success) {
        fetchTickets();
      } else {
        throw new Error(response.message || 'Failed to update ticket status');
      }
    } catch (err) {
      console.error('Error updating ticket status:', err);
      setError(err.message);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'text-blue-700 bg-blue-50';
      case 'in_progress':
        return 'text-yellow-700 bg-yellow-50';
      case 'resolved':
        return 'text-green-700 bg-green-50';
      case 'closed':
        return 'text-gray-700 bg-gray-50';
      default:
        return 'text-gray-700 bg-gray-50';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low':
        return 'text-green-600';
      case 'medium':
        return 'text-yellow-600';
      case 'high':
        return 'text-orange-600';
      case 'urgent':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const tabs = [
    { id: 'tickets', label: 'Support Tickets', icon: MessageSquare },
    { id: 'faq', label: 'FAQ', icon: HelpCircle },
    { id: 'contact', label: 'Contact Info', icon: Phone }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🆘 Admin Support</h1>
          <p className="text-gray-600 mt-1">Help desk and support resources for administrators</p>
        </div>
        {activeTab === 'tickets' && (
          <button
            onClick={() => setShowNewTicketModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Ticket
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200">
          <nav className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Tickets Tab */}
          {activeTab === 'tickets' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search tickets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Status</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              {/* Tickets List */}
              <div className="space-y-4">
                {loading ? (
                  <div className="animate-pulse space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
                    ))}
                  </div>
                ) : filteredTickets.length > 0 ? (
                  filteredTickets.map((ticket) => (
                    <div key={ticket.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{ticket.subject}</h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                              {ticket.status.replace('_', ' ')}
                            </span>
                            <span className={`text-sm font-medium ${getPriorityColor(ticket.priority)}`}>
                              {ticket.priority.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-gray-600 mb-3">{ticket.description}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>Category: {ticket.category}</span>
                            <span>Created: {new Date(ticket.created_at).toLocaleDateString()}</span>
                            <span>By: {ticket.created_by_name}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedTicket(ticket)}
                            className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 text-sm"
                          >
                            View Details
                          </button>
                          {ticket.status !== 'closed' && (
                            <select
                              value={ticket.status}
                              onChange={(e) => updateTicketStatus(ticket.id, e.target.value)}
                              className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                            >
                              <option value="open">Open</option>
                              <option value="in_progress">In Progress</option>
                              <option value="resolved">Resolved</option>
                              <option value="closed">Closed</option>
                            </select>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No support tickets found</h3>
                    <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FAQ Tab */}
          {activeTab === 'faq' && (
            <div className="space-y-4">
              {loading ? (
                <div className="animate-pulse space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-20 bg-gray-200 rounded-xl"></div>
                  ))}
                </div>
              ) : faqs.length > 0 ? (
                faqs.map((faq) => (
                  <div key={faq.id} className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{faq.question}</h3>
                    <p className="text-gray-600">{faq.answer}</p>
                    <div className="mt-3 text-sm text-gray-500">
                      Category: {faq.category} • Last updated: {new Date(faq.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No FAQs available</h3>
                  <p className="text-gray-500">Frequently asked questions will appear here.</p>
                </div>
              )}
            </div>
          )}

          {/* Contact Info Tab */}
          {activeTab === 'contact' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
                <Phone className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Phone Support</h3>
                <p className="text-gray-600 mb-4">Call our technical support team</p>
                <p className="text-2xl font-bold text-blue-600">+1 (555) 123-4567</p>
                <p className="text-sm text-gray-500 mt-2">Mon-Fri, 9AM-6PM EST</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
                <Mail className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Support</h3>
                <p className="text-gray-600 mb-4">Send us an email for detailed assistance</p>
                <p className="text-lg font-bold text-green-600">support@university.edu</p>
                <p className="text-sm text-gray-500 mt-2">Response within 24 hours</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
                <FileText className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Documentation</h3>
                <p className="text-gray-600 mb-4">Access our comprehensive help guides</p>
                <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                  View Docs
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {showNewTicketModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Support Ticket</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Brief description of the issue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={newTicket.category}
                  onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="technical">Technical Issue</option>
                  <option value="feature">Feature Request</option>
                  <option value="billing">Billing</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Detailed description of your issue or request"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewTicketModal(false)}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTicket}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Create Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{selectedTicket.subject}</h3>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700">{selectedTicket.description}</p>
                <div className="mt-3 text-sm text-gray-500">
                  Submitted by {selectedTicket.created_by_name} on {new Date(selectedTicket.created_at).toLocaleString()}
                </div>
              </div>

              {/* Replies would go here */}
              <div className="space-y-3">
                {/* Mock replies - in real app, these would come from API */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Support Team</span>
                    <span className="text-xs text-blue-600">2 hours ago</span>
                  </div>
                  <p className="text-blue-800">Thank you for your report. We're looking into this issue and will get back to you shortly.</p>
                </div>
              </div>

              {/* Reply Form */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Add Reply</label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Type your reply here..."
                />
                <div className="flex justify-end mt-3">
                  <button
                    onClick={() => handleReplyToTicket(selectedTicket.id)}
                    disabled={!replyText.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Send Reply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}