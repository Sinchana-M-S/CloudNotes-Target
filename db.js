const initSqlJs = require('sql.js');

let db = null;

async function initializeDatabase() {
  const SQL = await initSqlJs();
  db = new SQL.Database(); // in-memory

  // Create users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create notes table
  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Seed demo data
  const bcrypt = require('bcryptjs');
  const hashedPassword = bcrypt.hashSync('password123', 10);

  // Insert demo users (ignore if already exist)
  try {
    db.run('INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
      ['demo', hashedPassword, 'demo@cloudnotes.io']);
  } catch (e) { /* already exists */ }

  try {
    db.run('INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
      ['admin', bcrypt.hashSync('admin123', 10), 'admin@cloudnotes.io']);
  } catch (e) { /* already exists */ }

  // Get demo user ID
  const demoResult = db.exec('SELECT id FROM users WHERE username = ?', ['demo']);
  if (demoResult.length > 0 && demoResult[0].values.length > 0) {
    const demoId = demoResult[0].values[0][0];
    const countResult = db.exec('SELECT COUNT(*) FROM notes WHERE user_id = ?', [demoId]);
    const count = countResult[0].values[0][0];

    if (count === 0) {
      db.run('INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)',
        [demoId, 'Welcome to CloudNotes', 'This is your first note. Start writing!']);
      db.run('INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)',
        [demoId, 'Meeting Notes', 'Discuss Q3 roadmap with the team on Friday.']);
      db.run('INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)',
        [demoId, 'Shopping List', 'Milk, eggs, bread, coffee beans.']);
    }
  }

  console.log('Database initialized with tables and seed data.');
}

/**
 * Helper: Run a SELECT query and return results as array of objects.
 */
function queryAll(sql, params = []) {
  const result = db.exec(sql, params);
  if (result.length === 0) return [];
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

/**
 * Helper: Run a SELECT query and return the first result as object or undefined.
 */
function queryGet(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : undefined;
}

/**
 * Helper: Run an INSERT/UPDATE/DELETE and return lastInsertRowid info.
 */
function runStmt(sql, params = []) {
  db.run(sql, params);
  const lastId = db.exec('SELECT last_insert_rowid() as id');
  return {
    lastInsertRowid: lastId[0].values[0][0],
    changes: db.getRowsModified()
  };
}

/**
 * Helper: Execute a raw SQL string (for the vulnerable search endpoint).
 * This deliberately does NOT use parameterization.
 */
function execRaw(sql) {
  const result = db.exec(sql);
  if (result.length === 0) return [];
  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

function getDb() {
  return db;
}

module.exports = { initializeDatabase, getDb, queryAll, queryGet, runStmt, execRaw };
