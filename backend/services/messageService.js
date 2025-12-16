/**
 * Message Service
 * Handles messaging between users and admins
 */

class MessageService {
  constructor() {
    this.messages = new Map(); // In-memory storage for demo
  }

  async sendMessage(payload) {
    const { studentId, senderId, senderType, message } = payload;
    
    const messageData = {
      id: `msg_${Date.now()}`,
      studentId,
      senderId,
      senderType,
      message,
      timestamp: new Date().toISOString(),
      read: false
    };

    // Store message (in production, this would be in database)
    if (!this.messages.has(studentId)) {
      this.messages.set(studentId, []);
    }
    this.messages.get(studentId).push(messageData);

    return messageData;
  }

  async getMessagesByStudentId(studentId) {
    return this.messages.get(studentId) || [];
  }

  async getConversations() {
    const conversations = [];
    for (const [studentId, messages] of this.messages.entries()) {
      const lastMessage = messages[messages.length - 1];
      const unreadCount = messages.filter(m => !m.read && m.senderType === 'student').length;
      
      conversations.push({
        studentId,
        lastMessage,
        unreadCount,
        totalMessages: messages.length
      });
    }
    return conversations;
  }

  async getCommunicationStats() {
    const totalMessages = Array.from(this.messages.values()).reduce((sum, msgs) => sum + msgs.length, 0);
    const totalConversations = this.messages.size;
    
    return {
      totalMessages,
      totalConversations,
      averageMessagesPerConversation: totalConversations > 0 ? Math.round(totalMessages / totalConversations) : 0
    };
  }

  async markAsRead(messageIds, userId) {
    // Mark messages as read (simplified implementation)
    for (const [studentId, messages] of this.messages.entries()) {
      messages.forEach(msg => {
        if (messageIds.includes(msg.id)) {
          msg.read = true;
        }
      });
    }
    return { success: true, markedCount: messageIds.length };
  }

  async markAsUnread(messageIds, userId) {
    // Mark messages as unread (simplified implementation)
    for (const [studentId, messages] of this.messages.entries()) {
      messages.forEach(msg => {
        if (messageIds.includes(msg.id)) {
          msg.read = false;
        }
      });
    }
    return { success: true, markedCount: messageIds.length };
  }

  async deleteNotification(notificationId, userId) {
    // Delete notification (simplified implementation)
    for (const [studentId, messages] of this.messages.entries()) {
      const index = messages.findIndex(msg => msg.id === notificationId);
      if (index !== -1) {
        messages.splice(index, 1);
        return { success: true };
      }
    }
    return { success: false, message: 'Notification not found' };
  }

  async clearAllNotifications(userId) {
    // Clear all notifications for user
    this.messages.delete(userId);
    return { success: true };
  }
}

module.exports = new MessageService();