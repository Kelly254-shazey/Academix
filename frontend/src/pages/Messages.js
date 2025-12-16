import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import './Messages.css';

function Messages({ setUnreadMessages }) {
  const { user } = useAuth();
  const [selectedChat, setSelectedChat] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);


  const fetchConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await apiClient.get('/messages', { userId: user.id });
      setConversations(data.conversations || data || []);
    } catch (err) {
      console.error('Error loading conversations:', err);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    // Mark as read on backend if supported
    (async () => {
      try {
        await apiClient.put(`/messages/${chat.id}/mark-read`, {});
      } catch (err) {
        // ignore
      }
    })();
    if (chat.unread) {
      setConversations(conversations.map(c => 
        c.id === chat.id ? { ...c, unread: false } : c
      ));
      const unreadCount = conversations.filter(c => c.unread).length - 1;
      setUnreadMessages(Math.max(0, unreadCount));
    }
  };

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedChat) return;
    (async () => {
      try {
        const data = await apiClient.post('/messages/send', { to: selectedChat.id, text: messageText });
        // If backend returns updated conversation, replace it; otherwise append locally
        if (data.conversation) {
          setConversations(prev => prev.map(c => c.id === data.conversation.id ? data.conversation : c));
          setSelectedChat(data.conversation);
        } else {
          setConversations(prev => prev.map(conv => {
            if (conv.id === selectedChat.id) {
              const msgs = conv.messages ? [...conv.messages] : [];
              msgs.push({ id: msgs.length + 1, sender: user.name, text: messageText, time: 'now', own: true });
              return { ...conv, messages: msgs, lastMessage: messageText };
            }
            return conv;
          }));
          setSelectedChat(prev => ({ ...prev, messages: [...(prev.messages||[]), { id: (prev.messages||[]).length+1, sender: user.name, text: messageText, time: 'now', own: true }], lastMessage: messageText }));
        }
        setMessageText('');
      } catch (err) {
        console.error('Send message error:', err);
      }
    })();
    
  };

  const unreadCount = conversations.filter(c => c.unread).length;

  return (
    <div className="messages-container">
      <div className="messages-sidebar">
        <div className="sidebar-header">
          <h2>💬 Messages</h2>
          {unreadCount > 0 && <span className="badge-count">{unreadCount}</span>}
        </div>
        <div className="search-messages">
          <input type="text" placeholder="Search conversations..." />
        </div>
        <div className="conversations-list">
          {loading && <div className="muted">Loading conversations...</div>}
          {!loading && conversations.length === 0 && <div className="muted">No conversations yet.</div>}
          {!loading && conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conversation-item ${selectedChat?.id === conv.id ? 'active' : ''} ${conv.unread ? 'unread' : ''}`}
              onClick={() => handleSelectChat(conv)}
            >
              <div className="conv-avatar">{conv.avatar || conv.name?.charAt(0) || '👤'}</div>
              <div className="conv-info">
                <h3>{conv.name || conv.title || `Conversation ${conv.id}`}</h3>
                <p>{conv.lastMessage || ''}</p>
              </div>
              <div className="conv-meta">
                <span className="conv-time">{conv.time || ''}</span>
                {conv.unread && <div className="conv-dot"></div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="messages-main">
        {selectedChat ? (
          <>
            <div className="chat-header">
              <div className="chat-header-info">
                <span className="chat-avatar">{selectedChat.avatar}</span>
                <div>
                  <h2>{selectedChat.name}</h2>
                  <p>Online • Active now</p>
                </div>
              </div>
              <div className="chat-actions">
                <button className="action-icon">📞</button>
                <button className="action-icon">📹</button>
                <button className="action-icon">ℹ️</button>
              </div>
            </div>

            <div className="messages-list">
              {selectedChat.messages.map((msg) => (
                <div key={msg.id} className={`message ${msg.own ? 'own' : ''}`}>
                  <div className="message-bubble">
                    <p>{msg.text}</p>
                    <span className="message-time">{msg.time}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="chat-input-area">
              <div className="input-actions">
                <button className="input-action">➕</button>
              </div>
              <div className="message-input">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
              </div>
              <div className="input-actions">
                <button className="input-action">😊</button>
                <button className="send-btn" onClick={handleSendMessage}>
                  📤
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <h2>Select a conversation to start messaging</h2>
            <p>Choose from your conversations or start a new one</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Messages;
