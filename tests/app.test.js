const request = require('supertest');
const app = require('../app');

describe('CloudNotes API Tests', () => {

  let authToken;

  // Wait for DB to initialize before running tests
  beforeAll(async () => {
    await app.dbReady;
  });

  // ─── Auth Endpoint Tests ────────────────────────────────────────

  describe('POST /api/auth/register', () => {
    it('should register a new user and return a JWT token', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: 'testpass123', email: 'test@test.com' });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.username).toBe('testuser');
    });

    it('should reject registration with missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'nopass' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject duplicate usernames', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'demo', password: 'password123' });

      expect(res.statusCode).toBe(409);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials and return a JWT token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'demo', password: 'password123' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.message).toBe('Login successful');

      // Store token for subsequent tests
      authToken = res.body.token;
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'demo', password: 'wrongpassword' });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should reject login with non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'ghostuser', password: 'password123' });

      expect(res.statusCode).toBe(401);
    });

    it('should reject login with missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.statusCode).toBe(400);
    });
  });

  // ─── Notes Endpoint Tests ──────────────────────────────────────

  describe('GET /api/notes', () => {
    it('should return 401 without a token', async () => {
      const res = await request(app).get('/api/notes');
      expect(res.statusCode).toBe(401);
    });

    it('should return notes for authenticated user', async () => {
      const res = await request(app)
        .get('/api/notes')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('notes');
      expect(Array.isArray(res.body.notes)).toBe(true);
    });
  });

  describe('POST /api/notes', () => {
    it('should create a new note', async () => {
      const res = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Test Note', content: 'This is a test note.' });

      expect(res.statusCode).toBe(201);
      expect(res.body.note.title).toBe('Test Note');
    });

    it('should reject note without title', async () => {
      const res = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'No title here' });

      expect(res.statusCode).toBe(400);
    });
  });

  // ─── Search Endpoint Tests (SQL Injection Vulnerable) ──────────

  describe('GET /api/notes/search', () => {
    it('should search notes by title query', async () => {
      const res = await request(app)
        .get('/api/notes/search?q=Welcome')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('notes');
      expect(res.body).toHaveProperty('query', 'Welcome');
    });

    it('should return empty results for non-matching query', async () => {
      const res = await request(app)
        .get('/api/notes/search?q=nonexistentnote12345')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.notes).toHaveLength(0);
    });

    it('should return 400 when no query parameter is provided', async () => {
      const res = await request(app)
        .get('/api/notes/search')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .get('/api/notes/search?q=test');

      expect(res.statusCode).toBe(401);
    });
  });

  // ─── Health Check ──────────────────────────────────────────────

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/api/health');

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.app).toBe('CloudNotes');
    });
  });
});
