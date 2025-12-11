const db = require('../database');

exports.getConversations = async () => {
  // This is a complex query. In a real-world scenario, this would be optimized.
  // It gets the last message for each student conversation.
  const [rows] = await db.query(`
    SELECT 
      u.id AS studentId,
      u.name AS studentName,
      (SELECT message FROM admin_messages WHERE student_id = u.id ORDER BY created_at DESC LIMIT 1) AS lastMessage,
      (SELECT created_at FROM admin_messages WHERE student_id = u.id ORDER BY created_at DESC LIMIT 1) AS lastMessageTime,
      (SELECT COUNT(*) FROM admin_messages WHERE student_id = u.id AND is_read = 0 AND sender_type = 'student') AS unreadCount
    FROM users u
    WHERE u.role = 'student' AND EXISTS (SELECT 1 FROM admin_messages WHERE student_id = u.id)
    ORDER BY lastMessageTime DESC
  `);
  return rows;
};

exports.getMessagesByStudentId = async (studentId) => {
  const [messages] = await db.query(
    'SELECT * FROM admin_messages WHERE student_id = ? ORDER BY created_at ASC',
    [studentId]
  );
  // Mark messages as read
  await db.query(
    "UPDATE admin_messages SET is_read = 1 WHERE student_id = ? AND sender_type = 'student' AND is_read = 0",
    [studentId]
  );
  return messages;
};

exports.sendMessage = async (payload) => {
  const { studentId, message, senderId, senderType } = payload;
  const [result] = await db.query(
    'INSERT INTO admin_messages (student_id, sender_id, sender_type, message) VALUES (?, ?, ?, ?)',
    [studentId, senderId, senderType, message]
  );
  const [rows] = await db.query('SELECT * FROM admin_messages WHERE id = ?', [result.insertId]);
  return rows;
};

exports.getCommunicationStats = async () => {
    const [[stats]] = await db.query(`
        SELECT
            (SELECT COUNT(DISTINCT id) FROM users WHERE role = 'student') AS totalStudents,
            (SELECT COUNT(*) FROM admin_messages) AS totalMessages,
            (SELECT COUNT(*) FROM admin_messages WHERE is_read = 0 AND sender_type = 'student') AS unreadMessages
    `);
    return stats;
};