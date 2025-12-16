import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../../services/apiClient';

export default function SupportPanel() {
  const [activeTab, setActiveTab] = useState('ai-assistant');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState([
    { id: 1, text: "Hello! I'm your AI academic assistant. How can I help you today?", sender: 'ai', timestamp: new Date() }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: 'technical',
    priority: 'medium',
    message: ''
  });
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (activeTab === 'tickets') {
      fetchTickets();
    }
  }, [activeTab]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  const fetchTickets = async () => {
    try {
      const data = await apiClient.get('/support/tickets');
      setTickets(data.tickets || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  const handleAiSubmit = async (e) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    const userMessage = {
      id: aiMessages.length + 1,
      text: aiInput,
      sender: 'user',
      timestamp: new Date()
    };

    setAiMessages(prev => [...prev, userMessage]);
    setAiInput('');
    setLoading(true);

    try {
      const response = await apiClient.post('/support/ai-chat', { message: aiInput });
      const aiResponse = {
        id: aiMessages.length + 2,
        text: response.response || "I'm here to help! Could you please provide more details about your question?",
        sender: 'ai',
        timestamp: new Date()
      };
      setAiMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error with AI chat:', error);
      const errorResponse = {
        id: aiMessages.length + 2,
        text: "I'm sorry, I'm having trouble connecting right now. Please try again or contact human support.",
        sender: 'ai',
        timestamp: new Date()
      };
      setAiMessages(prev => [...prev, errorResponse]);
    } finally {
      setLoading(false);
    }
  };

  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiClient.post('/support/ticket', ticketForm);
      setTicketForm({ subject: '', category: 'technical', priority: 'medium', message: '' });
      alert('Support ticket created successfully!');
      if (activeTab === 'tickets') fetchTickets();
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Failed to create support ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const faqs = [
    {
      question: "How do I mark my attendance?",
      answer: "Use the QR scanner in the Attendance tab to scan the QR code provided by your lecturer at the start of class."
    },
    {
      question: "I missed a class, how do I catch up?",
      answer: "Contact your lecturer directly or check the course materials in your dashboard. You can also view recorded sessions if available."
    },
    {
      question: "How do I enroll in a new course?",
      answer: "Go to the Enrollment tab in your dashboard, browse available courses, and click 'Enroll' on the courses you're interested in."
    },
    {
      question: "My attendance isn't showing up correctly",
      answer: "Try refreshing your dashboard or contact support. Make sure you're scanning the correct QR code during class time."
    },
    {
      question: "How do I change my profile information?",
      answer: "Go to the Profile tab, click 'Edit Profile', make your changes, and save. Some information may require admin approval."
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">🆘 Support & Help Center</h2>
      </div>

      {/* Support Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {[
            { id: 'ai-assistant', label: 'AI Assistant', icon: '🤖' },
            { id: 'faq', label: 'FAQ', icon: '❓' },
            { id: 'tickets', label: 'Support Tickets', icon: '🎫' },
            { id: 'contact', label: 'Contact Us', icon: '📞' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'ai-assistant' && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">AI Academic Assistant</h3>
            <p className="text-sm text-gray-600 mb-4">
              Ask me anything about your courses, attendance, grades, or general academic questions!
            </p>

            {/* Chat Messages */}
            <div className="bg-white rounded-lg border h-80 overflow-y-auto p-4 mb-4">
              {aiMessages.map(message => (
                <div key={message.id} className={`mb-3 ${message.sender === 'user' ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block max-w-xs px-3 py-2 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-indigo-500 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}>
                    <p className="text-sm">{message.text}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="text-left mb-3">
                  <div className="inline-block bg-gray-200 text-gray-800 px-3 py-2 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm">AI is typing...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleAiSubmit} className="flex space-x-2">
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="Ask me anything about your studies..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !aiInput.trim()}
                className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'faq' && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Frequently Asked Questions</h3>
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <details key={index} className="bg-gray-50 rounded-lg p-4">
                <summary className="font-medium text-gray-900 cursor-pointer">
                  {faq.question}
                </summary>
                <p className="text-gray-700 mt-2 text-sm">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'tickets' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Your Support Tickets</h3>
            <button
              onClick={() => setActiveTab('contact')}
              className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 text-sm"
            >
              Create New Ticket
            </button>
          </div>

          <div className="space-y-3">
            {tickets.length > 0 ? tickets.map(ticket => (
              <div key={ticket.id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900">{ticket.subject}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    ticket.status === 'open' ? 'bg-green-100 text-green-800' :
                    ticket.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {ticket.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{ticket.message}</p>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>Category: {ticket.category}</span>
                  <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            )) : (
              <p className="text-gray-600 text-center py-8">No support tickets found.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'contact' && (
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Create Support Ticket</h3>
            <form onSubmit={handleTicketSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <input
                    type="text"
                    value={ticketForm.subject}
                    onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={ticketForm.category}
                    onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="technical">Technical Issue</option>
                    <option value="attendance">Attendance Problem</option>
                    <option value="academic">Academic Question</option>
                    <option value="account">Account Issue</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={ticketForm.priority}
                    onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={ticketForm.message}
                  onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                  rows="6"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Describe your issue in detail..."
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50"
              >
                {loading ? 'Creating Ticket...' : 'Create Support Ticket'}
              </button>
            </form>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Emergency Contact</h4>
            <p className="text-sm text-blue-800">
              For urgent technical issues that prevent you from accessing the system,
              please call our emergency support line at <strong>(555) 123-HELP</strong> or
              email <strong>emergency@academix.edu</strong>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}