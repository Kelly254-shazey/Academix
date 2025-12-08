import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Messages.css';

function Messages({ setUnreadMessages }) {
  const { user } = useAuth();
  const [selectedChat, setSelectedChat] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [conversations, setConversations] = useState([
    {
      id: 1,
      name: 'Dr. Smith',
      avatar: '👨‍🏫',
      lastMessage: 'Great work on the assignment!',
      time: '2 mins ago',
      unread: true,
      messages: [
        { id: 1, sender: 'Dr. Smith', text: 'Hi, how are you doing?', time: '10:30 AM', own: false },
        { id: 2, sender: user.name, text: 'I\'m doing well, thanks for asking!', time: '10:35 AM', own: true },
        { id: 3, sender: 'Dr. Smith', text: 'Great work on the assignment!', time: '2 mins ago', own: false }
      ]
    },
    {
      id: 2,
      name: 'Prof. Johnson',
      avatar: '👩‍🏫',
      lastMessage: 'See you in class tomorrow',
      time: '1 hour ago',
      unread: true,
      messages: [
        { id: 1, sender: 'Prof. Johnson', text: 'Don\'t forget the homework!', time: '1 hour ago', own: false }
      ]
    },
    {
      id: 3,
      name: 'Study Group',
      avatar: '👥',
      lastMessage: 'Meet at library tomorrow',
      time: '3 hours ago',
      unread: true,
      messages: [
        { id: 1, sender: 'Alex', text: 'Let\'s meet at the library', time: '3 hours ago', own: false }
      ]
    },
    {
      id: 4,
      name: 'Dr. Patel',
      avatar: '👨‍💼',
      lastMessage: 'Your project looks great',
      time: '1 day ago',
      unread: false,
      messages: [
        { id: 1, sender: 'Dr. Patel', text: 'Your project looks great', time: '1 day ago', own: false }
      ]
    }
  ]);

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    if (chat.unread) {
      setConversations(conversations.map(c => 
        c.id === chat.id ? { ...c, unread: false } : c
      ));
      const unreadCount = conversations.filter(c => c.unread).length - 1;
      setUnreadMessages(Math.max(0, unreadCount));
    }
  };

  const handleSendMessage = () => {
    if (messageText.trim() && selectedChat) {
      const updatedConversations = conversations.map(conv => {
        if (conv.id === selectedChat.id) {
          return {
            ...conv,
            messages: [
              ...conv.messages,
              {
                id: conv.messages.length + 1,
                sender: user.name,
                text: messageText,
                time: 'now',
                own: true
              }
            ],
            lastMessage: messageText
          };
        }
        return conv;
      });
      
      setConversations(updatedConversations);
      setSelectedChat(updatedConversations.find(c => c.id === selectedChat.id));
      setMessageText('');
    }
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
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conversation-item ${selectedChat?.id === conv.id ? 'active' : ''} ${conv.unread ? 'unread' : ''}`}
              onClick={() => handleSelectChat(conv)}
            >
              <div className="conv-avatar">{conv.avatar}</div>
              <div className="conv-info">
                <h3>{conv.name}</h3>
                <p>{conv.lastMessage}</p>
              </div>
              <div className="conv-meta">
                <span className="conv-time">{conv.time}</span>
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
