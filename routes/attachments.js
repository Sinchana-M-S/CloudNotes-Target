const express = require('express');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');

// VULNERABILITY #7: Server-Side Request Forgery (CVE-2021-3749)
// axios@0.21.1 does not properly handle user-controlled URLs,
// allowing SSRF attacks to internal services.
const axios = require('axios@1.15.1'); // or require('axios@0.31.1') - update the version of axios to a fixed version
// VULNERABILITY #6 (cont.): ReDoS via moment date parsing
const moment = require('moment');

const router = express.Router();

// POST /api/attachments/upload - Upload a file attachment
// Uses vulnerable express-fileupload (path traversal)
router.post('/upload', authenticateToken, (req, res) => {
  try {
    if (!req.files || !req.files.attachment) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.files.attachment;
    // VULNERABLE: No sanitization of file.name — path traversal possible
    const uploadPath = path.join(__dirname, '..', 'uploads', file.name);

    file.mv(uploadPath, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Upload failed' });
      }

      // Uses vulnerable moment to format the upload timestamp
      const uploadTime = moment().format('YYYY-MM-DD HH:mm:ss');

      res.json({
        message: 'File uploaded',
        filename: file.name,
        size: file.size,
        uploaded_at: uploadTime
      });
    });
  } catch (err) {
    console.error('Upload error:', err.message);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// POST /api/attachments/fetch-url - Fetch content from a URL
// VULNERABLE: User-controlled URL passed directly to axios (SSRF)
router.post('/fetch-url', authenticateToken, async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // VULNERABLE: No URL validation — an attacker can pass internal
    // URLs like http://169.254.169.254/latest/meta-data/ (AWS metadata)
    // or http://localhost:8080/admin to access internal services.
    const response = await axios.get(url);

    res.json({
      fetched_url: url,
      status: response.status,
      content_length: response.data.length,
      fetched_at: moment().toISOString(),
      preview: typeof response.data === 'string'
        ? response.data.substring(0, 500)
        : JSON.stringify(response.data).substring(0, 500)
    });
  } catch (err) {
    console.error('Fetch URL error:', err.message);
    res.status(500).json({ error: `Failed to fetch URL: ${err.message}` });
  }
});

// GET /api/attachments/parse-date - Parse a user-supplied date string
// VULNERABLE: moment.js ReDoS — malicious date strings can hang the server
router.get('/parse-date', authenticateToken, (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date query parameter is required' });
    }

    // VULNERABLE: User-supplied date string parsed by moment@2.29.1
    // A carefully crafted string can trigger catastrophic backtracking.
    const parsed = moment(date);

    res.json({
      input: date,
      valid: parsed.isValid(),
      formatted: parsed.isValid() ? parsed.format('LLLL') : null,
      relative: parsed.isValid() ? parsed.fromNow() : null
    });
  } catch (err) {
    console.error('Date parse error:', err.message);
    res.status(500).json({ error: 'Failed to parse date' });
  }
});

module.exports = router;
