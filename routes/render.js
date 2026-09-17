const express = require('express');
const { queryGet } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// VULNERABILITY #8: ReDoS in Markdown Parsing (CVE-2022-21681)
// marked@0.3.9 is vulnerable to Regular Expression Denial of Service.
// Specially crafted markdown input can cause catastrophic backtracking.
const marked = require('marked');

const router = express.Router();

// GET /api/render/:id - Render a note's content as HTML
// VULNERABLE: Uses marked@0.3.9 which has ReDoS via crafted markdown
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const noteId = req.params.id;

    const note = queryGet(
      'SELECT * FROM notes WHERE id = ? AND user_id = ?',
      [noteId, req.user.userId]
    );

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // VULNERABLE: Passing user content through marked@0.3.9
    // A malicious note body like "# " + "a](".repeat(1000) + "a" can hang the parser.
    const htmlContent = marked(note.content || '');

    res.json({
      id: note.id,
      title: note.title,
      original_content: note.content,
      html_content: htmlContent,
      rendered_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Render error:', err.message);
    res.status(500).json({ error: 'Failed to render note' });
  }
});

// POST /api/render/preview - Preview markdown as HTML
// VULNERABLE: Same marked@0.3.9 ReDoS vulnerability
router.post('/preview', authenticateToken, (req, res) => {
  try {
    const { markdown } = req.body;

    if (!markdown) {
      return res.status(400).json({ error: 'Markdown content is required' });
    }

    // VULNERABLE: Direct user input → marked parser
    const htmlContent = marked(markdown);

    res.json({
      html: htmlContent,
      input_length: markdown.length,
      output_length: htmlContent.length
    });
  } catch (err) {
    console.error('Preview error:', err.message);
    res.status(500).json({ error: 'Failed to render preview' });
  }
});

module.exports = router;
