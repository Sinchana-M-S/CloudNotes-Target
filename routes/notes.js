const express = require('express');
const { queryAll, queryGet, runStmt, execRaw } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/notes - Get all notes for the authenticated user
router.get('/', authenticateToken, (req, res) => {
  try {
    const notes = queryAll(
      'SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC',
      [req.user.userId]
    );
    res.json({ notes });
  } catch (err) {
    console.error('Fetch notes error:', err.message);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// POST /api/notes - Create a new note
router.post('/', authenticateToken, (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const result = runStmt(
      'INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)',
      [req.user.userId, title, content || '']
    );

    const note = queryGet('SELECT * FROM notes WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ message: 'Note created', note });
  } catch (err) {
    console.error('Create note error:', err.message);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// PUT /api/notes/:id - Update an existing note
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { title, content } = req.body;
    const noteId = req.params.id;

    const existing = queryGet(
      'SELECT * FROM notes WHERE id = ? AND user_id = ?',
      [noteId, req.user.userId]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Note not found' });
    }

    runStmt(
      'UPDATE notes SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [title || existing.title, content !== undefined ? content : existing.content, noteId, req.user.userId]
    );

    const updated = queryGet('SELECT * FROM notes WHERE id = ?', [noteId]);
    res.json({ message: 'Note updated', note: updated });
  } catch (err) {
    console.error('Update note error:', err.message);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// DELETE /api/notes/:id - Delete a note
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const noteId = req.params.id;

    const existing = queryGet(
      'SELECT * FROM notes WHERE id = ? AND user_id = ?',
      [noteId, req.user.userId]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Note not found' });
    }

    runStmt('DELETE FROM notes WHERE id = ? AND user_id = ?', [noteId, req.user.userId]);
    res.json({ message: 'Note deleted' });
  } catch (err) {
    console.error('Delete note error:', err.message);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// ============================================================
// VULNERABILITY #3: SQL Injection (Code-Level SAST Vulnerability)
// This endpoint concatenates user input directly into a raw SQL
// query WITHOUT parameterization, making it vulnerable to SQLi.
// ============================================================
router.get('/search', authenticateToken, (req, res) => {
  try {
    const query = req.query.q;

    if (!query) {
      return res.status(400).json({ error: 'Search query parameter "q" is required' });
    }

    // VULNERABLE: Direct string concatenation in SQL query
    const sql = `SELECT * FROM notes WHERE title LIKE '%${query}%' AND user_id = ${req.user.userId}`;
    const notes = execRaw(sql);

    res.json({ notes, query });
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
