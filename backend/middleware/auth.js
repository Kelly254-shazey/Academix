const authMiddleware = (req, res, next) => {
  // Simple auth middleware - checks for authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }
  
  // Extract token (Bearer token)
  const token = authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Invalid token format' });
  }
  
  // For now, just attach a mock user ID
  req.user = { id: 1, role: 'student' };
  next();
};

module.exports = authMiddleware;
