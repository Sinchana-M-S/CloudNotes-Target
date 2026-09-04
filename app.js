const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Database initialization promise (used by tests & server)
const dbReady = initializeDatabase().then(() => {
  // Register routes AFTER db is ready
  const authRoutes = require('./routes/auth');
  const notesRoutes = require('./routes/notes');

  app.use('/api/auth', authRoutes);
  app.use('/api/notes', notesRoutes);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'CloudNotes', version: '1.0.0' });
  });

  // Serve frontend for all other routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
});

app.dbReady = dbReady;

module.exports = app;
