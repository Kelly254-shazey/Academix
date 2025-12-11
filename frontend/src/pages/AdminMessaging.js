import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import './AdminMessaging.css';

function AdminMessaging() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalStudents: 0, totalMessages: 0, unreadMessages: 0 });
  const messagesEndRef = useRef(null);
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch conversations on load
  useEffect(() => {
    if (user?.role === 'admin') {
      fetchConversations();
      fetchStats();
      const interval = setInterval(fetchConversations, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    } else if (user?.role === 'student') {
      // Initialize empty chat with admin for student
      loadMessages(user.id);
    }
  }, [user]);

  const fetchConversations = async () => {
    try {
      if (user?.role !== 'admin') return;
      const response = await fetch(`${apiUrl}/admin/messages/all`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setConversations(data.conversations || []);
      } else {
        console.warn('Conversations fetch returned success: false');
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setConversations([]);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${apiUrl}/admin/communication/stats`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats(null);
    }
  };

  const loadMessages = async (studentId) => {
    try {
      setLoading(true);
      if (!studentId) {
        setMessages([]);
        return;
      }
      
      const response = await fetch(`${apiUrl}/admin/messages/student/${studentId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.messages || []);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStudent = (conversation) => {
    setSelectedStudent({
      studentId: conversation.studentId,
      studentName: conversation.studentName
    });
    loadMessages(conversation.studentId);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!messageText.trim()) return;

    try {
      let endpoint, payload;

      if (user?.role === 'admin' && selectedStudent) {
        // Admin sending to student
        endpoint = '/admin/messages/send';
        payload = {
          studentId: selectedStudent.studentId,
          studentName: selectedStudent.studentName,
          message: messageText,
          senderId: user.id,
          senderType: 'admin'
        };
      } else if (user?.role === 'student') {
        // Student sending to admin
        endpoint = '/admin/messages/student-send';
        payload = {
          studentId: user.id,
          studentName: user.name,
          message: messageText
        };
      } else {
        return;
      }

      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        setMessageText('');
        
        if (user?.role === 'admin' && selectedStudent) {
          loadMessages(selectedStudent.studentId);
        } else {
          // Reload messages for student to ensure sync
          loadMessages(user.id);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };

  // Admin view
  if (user?.role === 'admin') {
    return (
      <div className="admin-messaging">
        <div className="messaging-container">
          {/* Sidebar - Conversations */}
          <div className="conversations-sidebar">
            <div className="sidebar-header">
              <h2>📬 Student Messages</h2>
              {stats && (
                <div className="stats-badge">
                  <span className="stat-item">📊 {stats.totalStudents} Students</span>
                  <span className="stat-item">💬 {stats.totalMessages} Messages</span>
                  <span className="stat-item">🔔 {stats.unreadMessages} Unread</span>
                </div>
              )}
            </div>

            <div className="conversations-list">
              {conversations.length === 0 ? (
                <div className="no-conversations">No student messages yet</div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.studentId}
                    className={`conversation-item ${selectedStudent?.studentId === conv.studentId ? 'active' : ''}`}
                    onClick={() => handleSelectStudent(conv)}
                  >
                    <div className="conv-avatar">👨‍🎓</div>
                    <div className="conv-content">
                      <div className="conv-header">
                        <h4>{conv.studentName}</h4>
                        {conv.unreadCount > 0 && (
                          <span className="unread-badge">{conv.unreadCount}</span>
                        )}
                      </div>
                      <p className="conv-preview">{conv.lastMessage}</p>
                      <small className="conv-time">{new Date(conv.lastMessageTime).toLocaleTimeString()}</small>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="chat-main">
            {selectedStudent ? (
              <>
                <div className="chat-header">
                  <h3>💬 Chat with {selectedStudent.studentName}</h3>
                  <button className="view-profile-btn">📋 View Profile</button>
                </div>

                <div className="messages-area">
                  {loading ? (
                    <div className="loading">Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div className="no-messages">No messages yet. Start the conversation!</div>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} className={`message ${msg.senderType === 'admin' ? 'own' : 'other'}`}>
                        <div className="message-avatar">
                          {msg.senderType === 'admin' ? '👨‍💼' : '👨‍🎓'}
                        </div>
                        <div className="message-bubble">
                          <p className="message-sender">
                            {msg.senderType === 'admin' ? 'Admin' : selectedStudent.studentName}
                          </p>
                          <p className="message-text">{msg.message}</p>
                          <small className="message-time">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </small>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form className="message-input-form" onSubmit={handleSendMessage}>
                  <input
                    type="text"
                    placeholder="Type your message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="message-input"
                  />
                  <button type="submit" className="send-btn">📤 Send</button>
                </form>
              </>
            ) : (
              <div className="no-selection">
                <div className="placeholder-icon">💬</div>
                <p>Select a student conversation to start messaging</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Student view
  if (user?.role === 'student') {
    return (
      <div className="student-admin-chat">
        <div className="chat-container">
          <div className="chat-header">
            <h2>💬 Message Admin</h2>
            <p>Get help and communicate with the administration</p>
          </div>

          <div className="messages-area">
            {loading ? (<div className="loading">Loading messages...</div>) : messages.length === 0 ? (
              <div className="no-messages">
                <div className="placeholder-icon">👋</div>
                <p>Start a conversation with the admin</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`message ${msg.senderType === 'student' ? 'own' : 'other'}`}>
                  <div className="message-avatar">
                    {msg.senderType === 'student' ? '👨‍🎓' : '👨‍💼'}
                  </div>
                  <div className="message-bubble">
                    <p className="message-sender">
                      {msg.senderType === 'student' ? 'You' : 'Admin'}
                    </p>
                    <p className="message-text">{msg.message}</p>
                    <small className="message-time">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </small>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="message-input-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              placeholder="Type your message to admin..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="message-input"
              disabled={loading}
            />
            <button type="submit" className="send-btn" disabled={loading}>
              {loading ? '⏳' : '📤'} Send
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="unauthorized">
      <p>You don't have permission to access this page</p>
    </div>
  );
}

export default AdminMessaging;
