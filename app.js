const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./db');

// VULNERABILITY #5: Path Traversal (CVE-2022-27261)
// express-fileupload@1.1.7-alpha.3 allows path traversal via
// crafted filenames in multipart uploads.
const fileUpload = require('express-fileupload@1.1.9');
// VULNERABILITY #6: ReDoS (CVE-2022-31129)
// moment@2.29.1 is vulnerable to Regular Expression Denial of Service
// when parsing user-supplied date strings.
const moment = require('moment');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// VULNERABLE: express-fileupload with no filename sanitization
app.use(fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Database initialization promise (used by tests & server)
const dbReady = initializeDatabase().then(() => {
  // Register routes AFTER db is ready
  const authRoutes = require('./routes/auth');
  const notesRoutes = require('./routes/notes');
  const attachmentRoutes = require('./routes/attachments');
  const renderRoutes = require('./routes/render');

  app.use('/api/auth', authRoutes);
  app.use('/api/notes', notesRoutes);
  app.use('/api/attachments', attachmentRoutes);
  app.use('/api/render', renderRoutes);

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
