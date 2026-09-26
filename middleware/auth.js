const jwt = require('jsonwebtoken@9.0.0'); // Update the package version to the fixed version
function authenticateToken(req, res, next) {
  const JWT_SECRET = 'cloudnotes-super-secret-key-2024';
  const token = req.headers.authorization.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).send({ message: 'Invalid token' });
    req.user = decoded; // Assuming the token contains the user data
    next();
  });
}
const JWT_SECRET = 'cloudnotes-super-secret-key-2024';

/**
 * Middleware to authenticate JWT tokens from the Authorization header.
 * Expects: Authorization: Bearer <token>
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { authenticateToken, JWT_SECRET };
