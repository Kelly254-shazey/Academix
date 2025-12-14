import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import apiClient from '../../utils/apiClient';

export default function MessagesPanel() {
  const { user } = useAuth();
  const { socket, connected } = useNotifications();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const data = await apiClient.get('/messages/student');
        setMessages(data.messages || []);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, []);

  // Real-time message updates
  useEffect(() => {
    if (!socket || !connected) return;

    const handleNewMessage = (message) => {
      if (message.recipientId === user.id || message.senderId === user.id) {
        setMessages(prev => [message, ...prev]);
      }
    };

    socket.on('new-message', handleNewMessage);

    return () => {
      socket.off('new-message', handleNewMessage);
    };
  }, [socket, connected, user]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    try {
      setSending(true);
      const result = await apiClient.post('/messages/send', {
        recipientId: selectedChat.id,
        message: newMessage.trim()
      });

      if (result.success) {
        setNewMessage('');
        // Message will be added via real-time update
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const groupedMessages = messages.reduce((acc, msg) => {
    const otherUser = msg.senderId === user.id ? msg.recipientName : msg.senderName;
    if (!acc[otherUser]) acc[otherUser] = [];
    acc[otherUser].push(msg);
    return acc;
  }, {});

  if (loading) return <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
    <div className="text-center py-8">
      <div className="text-4xl mb-4">⏳</div>
      <p className="text-gray-600">Loading messages...</p>
    </div>
  </div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">💬 Messages</h2>
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
      </div>

      {!selectedChat ? (
        <div className="space-y-3">
          {Object.keys(groupedMessages).length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No messages yet.</p>
            </div>
          ) : (
            Object.entries(groupedMessages).map(([userName, userMessages]) => (
              <div
                key={userName}
                onClick={() => setSelectedChat({ name: userName, messages: userMessages })}
                className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{userName}</p>
                    <p className="text-sm text-gray-600 truncate">
                      {userMessages[0]?.message}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(userMessages[0]?.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="flex flex-col h-96">
          <div className="flex items-center justify-between mb-4 pb-2 border-b">
            <h3 className="font-semibold text-gray-900">{selectedChat.name}</h3>
            <button
              onClick={() => setSelectedChat(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto mb-4 space-y-3">
            {selectedChat.messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg ${
                    msg.senderId === user.id
                      ? 'bg-indigo-500 text-white'
                      : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{msg.message}</p>
                  <p className={`text-xs mt-1 ${
                    msg.senderId === user.id ? 'text-indigo-200' : 'text-gray-500'
                  }`}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? '...' : 'Send'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}