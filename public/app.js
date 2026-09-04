// ── CloudNotes Frontend ──────────────────────────────────────
const API_BASE = '/api';

let token = localStorage.getItem('cloudnotes_token');
let currentUser = JSON.parse(localStorage.getItem('cloudnotes_user') || 'null');
let notes = [];
let currentNoteId = null;
let searchTimeout = null;

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (token && currentUser) {
    showApp();
    fetchNotes();
  }
});

// ── Auth ─────────────────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  document.getElementById(`${tab}-form`).classList.add('active');
  hideError();
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    token = data.token;
    currentUser = data.user;
    localStorage.setItem('cloudnotes_token', token);
    localStorage.setItem('cloudnotes_user', JSON.stringify(currentUser));
    showApp();
    fetchNotes();
    showToast('Welcome back!', 'success');
  } catch (err) {
    showError(err.message);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('register-username').value;
  const password = document.getElementById('register-password').value;
  const email = document.getElementById('register-email').value;

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    token = data.token;
    currentUser = data.user;
    localStorage.setItem('cloudnotes_token', token);
    localStorage.setItem('cloudnotes_user', JSON.stringify(currentUser));
    showApp();
    fetchNotes();
    showToast('Account created!', 'success');
  } catch (err) {
    showError(err.message);
  }
}

function handleLogout() {
  token = null;
  currentUser = null;
  currentNoteId = null;
  notes = [];
  localStorage.removeItem('cloudnotes_token');
  localStorage.removeItem('cloudnotes_user');
  document.getElementById('auth-screen').classList.add('active');
  document.getElementById('app-screen').classList.remove('active');
  showToast('Signed out', 'info');
}

// ── Screen Management ────────────────────────────────────────
function showApp() {
  document.getElementById('auth-screen').classList.remove('active');
  document.getElementById('app-screen').classList.add('active');
  document.getElementById('user-display').textContent = currentUser.username;
}

// ── Notes CRUD ───────────────────────────────────────────────
async function fetchNotes() {
  try {
    const res = await fetch(`${API_BASE}/notes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 401 || res.status === 403) return handleLogout();
    const data = await res.json();
    notes = data.notes || [];
    renderNotesList();
  } catch (err) {
    showToast('Failed to load notes', 'error');
  }
}

function renderNotesList() {
  const list = document.getElementById('notes-list');
  if (notes.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-muted);">No notes yet. Create one!</div>';
    return;
  }
  list.innerHTML = notes.map(n => `
    <div class="note-item ${n.id === currentNoteId ? 'active' : ''}" onclick="selectNote(${n.id})">
      <div class="note-item-title">${escapeHtml(n.title)}</div>
      <div class="note-item-preview">${escapeHtml(n.content || '').substring(0, 60)}</div>
      <div class="note-item-date">${formatDate(n.updated_at || n.created_at)}</div>
    </div>
  `).join('');
}

function selectNote(id) {
  currentNoteId = id;
  const note = notes.find(n => n.id === id);
  if (!note) return;

  document.getElementById('editor-empty').style.display = 'none';
  document.getElementById('editor-active').style.display = 'flex';
  document.getElementById('note-title').value = note.title;
  document.getElementById('note-content').value = note.content || '';
  document.getElementById('note-date').textContent = `Last updated: ${formatDate(note.updated_at || note.created_at)}`;
  renderNotesList();
}

async function createNewNote() {
  try {
    const res = await fetch(`${API_BASE}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ title: 'Untitled Note', content: '' })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    await fetchNotes();
    selectNote(data.note.id);
    showToast('Note created', 'success');
    document.getElementById('note-title').focus();
    document.getElementById('note-title').select();
  } catch (err) {
    showToast('Failed to create note', 'error');
  }
}

async function saveCurrentNote() {
  if (!currentNoteId) return;
  const title = document.getElementById('note-title').value;
  const content = document.getElementById('note-content').value;

  try {
    const res = await fetch(`${API_BASE}/notes/${currentNoteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ title, content })
    });
    if (!res.ok) throw new Error('Failed to save');
    await fetchNotes();
    selectNote(currentNoteId);
    showToast('Note saved', 'success');
  } catch (err) {
    showToast('Failed to save note', 'error');
  }
}

async function deleteCurrentNote() {
  if (!currentNoteId) return;
  if (!confirm('Delete this note?')) return;

  try {
    await fetch(`${API_BASE}/notes/${currentNoteId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    currentNoteId = null;
    document.getElementById('editor-empty').style.display = 'flex';
    document.getElementById('editor-active').style.display = 'none';
    await fetchNotes();
    showToast('Note deleted', 'info');
  } catch (err) {
    showToast('Failed to delete note', 'error');
  }
}

// ── Search ───────────────────────────────────────────────────
function handleSearch(e) {
  clearTimeout(searchTimeout);
  const q = e.target.value.trim();
  if (!q) { fetchNotes(); return; }
  searchTimeout = setTimeout(async () => {
    try {
      const res = await fetch(`${API_BASE}/notes/search?q=${encodeURIComponent(q)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      notes = data.notes || [];
      renderNotesList();
    } catch (err) {
      showToast('Search failed', 'error');
    }
  }, 300);
}

// ── Utilities ────────────────────────────────────────────────
function handleNoteChange() { /* auto-save indicator could go here */ }

function showError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.style.display = 'block';
}

function hideError() {
  document.getElementById('auth-error').style.display = 'none';
}

function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
