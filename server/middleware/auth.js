const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'stocksense_super_secret_jwt_key_2026_prod';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      error: 'Unauthorized access', 
      message: 'Authentication token required. Please sign in.' 
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        error: 'Forbidden access', 
        message: 'Invalid or expired authentication session. Please sign in again.' 
      });
    }
    req.user = user;
    next();
  });
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access Denied', 
        message: `Your account role (${req.user?.role || 'Guest'}) does not have permission to perform this action.` 
      });
    }
    next();
  };
}

module.exports = {
  JWT_SECRET,
  authenticateToken,
  authorizeRoles
};
