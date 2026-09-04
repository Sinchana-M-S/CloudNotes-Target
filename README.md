# CloudNotes

A lightweight, full-stack note-taking application built with Node.js, Express, and SQLite. Designed as a **target repository for DevSecOps pipeline testing**.

## Tech Stack

- **Backend:** Node.js + Express
- **Database:** In-memory SQLite (via `better-sqlite3`)
- **Auth:** JWT-based authentication
- **Frontend:** Vanilla HTML/CSS/JS
- **Testing:** Jest + Supertest

## Quick Start

```bash
npm install
npm start
# Open http://localhost:3000
# Demo credentials: demo / password123
```

## Run Tests

```bash
npm test
```

## Docker

```bash
docker build -t cloudnotes .
docker run -p 3000:3000 cloudnotes
```

## ⚠️ Intentional Vulnerabilities (For DevSecOps Testing)

This repository intentionally contains the following vulnerabilities:

| # | Type | Details |
|---|------|---------|
| 1 | **Reachable Vulnerable Dependency** | `jsonwebtoken@8.5.1` (CVE-2022-23529) — actively used in `routes/auth.js` |
| 2 | **Unreachable Vulnerable Dependency** | `lodash@4.17.15` (prototype pollution CVEs) — listed in `package.json` but **never imported** |
| 3 | **SQL Injection (SAST)** | `/api/notes/search?q=` endpoint in `routes/notes.js` uses string concatenation in SQL |

**Do NOT deploy this application to production.**
