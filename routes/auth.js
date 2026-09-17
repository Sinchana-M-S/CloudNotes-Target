const express = require('express');
const bcrypt = require('bcryptjs');

// VULNERABILITY #1: Reachable Vulnerable Dependency
// jsonwebtoken@8.5.1 has known CVEs (e.g., CVE-2022-23529)
// It is actively imported and used here to sign tokens.
const jwt = require('jsonwebtoken');

const { queryGet, runStmt } = require('../db');

const router = express.Router();

const JWT_SECRET = 'cloudnotes-super-secret-key-2024';

// POST /api/auth/register - Register a new user
router.post('/register', (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = queryGet('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const result = runStmt(
      'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
      [username, hashedPassword, email || null]
    );

    // Sign JWT using the vulnerable jsonwebtoken@8.5.1
    const token = jwt.sign(
      { userId: result.lastInsertRowid, username: username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: result.lastInsertRowid, username }
    });
  } catch (err) {
    console.error('Registration error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login - Authenticate a user
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = queryGet('SELECT * FROM users WHERE username = ?', [username]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = bcrypt.compareSync(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Sign JWT using the vulnerable jsonwebtoken@8.5.1
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
