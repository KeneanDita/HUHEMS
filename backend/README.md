# HUHEMS Backend (Go)

Gin + GORM + PostgreSQL API for HUHEMS (exam management system).

## What this service does

- Serves a JSON HTTP API for admins and students.
- Authenticates users via JWT (Bearer tokens).
- Persists data in PostgreSQL via GORM.
- Runs DB auto-migrations at startup (see `internal/db/migrate.go`).

## Tech stack

- HTTP framework: Gin
- ORM: GORM
- DB: PostgreSQL (requires `pgcrypto` extension)
- Auth: JWT (HS256) + bcrypt password hashing

## Configuration

The backend loads environment variables from `backend/.env` (via `godotenv`).

Required variables:

- `DB_URL` (Postgres connection string)
- `JWT_SECRET` (used to sign/verify JWTs)
- `PORT` (defaults to `8080`)

Example (`backend/.env` in this repo):

```dotenv
DB_URL=postgres://postgres:newpassword123@localhost:5432/huhems?sslmode=disable
JWT_SECRET=yourstrongsecret
PORT=8080
```

Notes:

- When using Docker Compose from the repo root, `DB_URL` is overridden to use the Compose network host `db` (see root `docker-compose.yml`).

## Running

### Option A: Docker Compose (from repo root)

```bash
docker compose up -d --build
```

Useful URLs:

- Backend health: http://localhost:8080/health
- Postgres: `localhost:5432`

### Option B: Local Go dev

1) Start Postgres (example using Compose):

```bash
docker compose up -d db
```

2) Run migrations (optional; `cmd/api` also migrates on startup):

```bash
cd backend
go run ./cmd/migrate
```

3) Start the API server:

```bash
cd backend
go run ./cmd/api
```

### Makefile shortcuts

From `backend/`:

- `make run` → `go run ./cmd/api`
- `make migrate` → `go run ./cmd/migrate`
- `make tidy` → `go mod tidy`

### Seeding demo users

This repo includes a seed command that upserts demo users/roles and prints credentials:

```bash
cd backend
go run ./cmd/seed
```

It creates (or updates) these accounts:

- Admin: `admin` / `Admin123!`
- Student: `student` / `Student123!`

## Database & migrations

- The backend uses GORM `AutoMigrate(...)` (see `internal/db/migrate.go`).
- On startup, `cmd/api` connects to Postgres and runs migrations automatically.
- The migration step also ensures the Postgres extension `pgcrypto` exists (needed for `gen_random_uuid()` defaults).

There is also a manual schema reference at `backend/sql/schema.sql`. Treat it as informational: the running application’s schema is primarily driven by the GORM models.

## Authentication

### Login

- `POST /auth/login`
- Body:

```json
{"usernameOrEmail":"admin","password":"Admin123!"}
```

- Response includes:
  - `token` (JWT)
  - `role` (`admin` or `student`)
  - `firstLogin` (true when `last_login_at` was previously unset)

### Using the token

Pass the JWT in the `Authorization` header:

```text
Authorization: Bearer <token>
```

JWT details (from `internal/auth/jwt.go` + middleware):

- Signing algorithm: HS256
- `sub` (subject) is the user UUID
- Custom claim: `role`
- Token TTL is currently 24 hours (set in `controllers.AuthLogin`)

## HTTP API (routes)

Routes are registered in `internal/routes/routes.go`.

### Public

- `GET /health`
- `POST /auth/login`

### Authenticated (any role)

- `GET /auth/me`
- `PUT /auth/password`

### Admin (`role=admin`)

- Exams
  - `GET /admin/exams`
  - `POST /admin/exams`
  - `GET /admin/exams/:id`
  - `PUT /admin/exams/:id`
  - `DELETE /admin/exams/:id`
  - `POST /admin/exams/:id/publish`
  - `GET /admin/exams/:id/report`
- Students
  - `GET /admin/students`
  - `POST /admin/students`
  - `POST /admin/students/import` (multipart form-data `file`)
  - `PUT /admin/students/:id`
  - `DELETE /admin/students/:id`
- Questions
  - `POST /admin/exams/:id/questions`
  - `POST /admin/exams/:id/questions/import` (multipart form-data `file`)
  - `PUT /admin/questions/:id`
  - `DELETE /admin/questions/:id`

### Student (`role=student`)

- `GET /student/exams`
- `POST /student/exams/:id/start`
- `GET /student/attempts/:id`
- `POST /student/attempts/:id/answer`
- `POST /student/attempts/:id/flag`
- `POST /student/attempts/:id/submit`
- `GET /student/attempts/:id/result`
- `GET /student/results`

## CSV imports

Two endpoints accept CSV uploads:

- `POST /admin/students/import`
- `POST /admin/exams/:id/questions/import`

Both expect multipart form-data with field name `file`.

For the detailed CSV column formats and examples, see the root README.

## Project layout

- `cmd/api` — main HTTP server (loads config, connects DB, migrates, registers routes)
- `cmd/migrate` — run migrations only
- `cmd/seed` — seed demo roles/users
- `internal/config` — env loading
- `internal/db` — DB connection + migration helpers
- `internal/models` — GORM models
- `internal/controllers` — Gin handlers (request/response shaping)
- `internal/middleware` — auth/role middleware

## Troubleshooting

- `failed to load config: DB_URL is required`
  - Ensure `backend/.env` exists and has `DB_URL`, or set env vars in your shell/container.
- `failed to connect database` / connection refused
  - Confirm Postgres is running and reachable at the host in `DB_URL`.
  - For Compose, use the provided `DB_URL` that targets `db:5432`.
- Migration errors mentioning `pgcrypto`
  - The backend attempts `CREATE EXTENSION IF NOT EXISTS pgcrypto;` on startup. Your DB user must have permission to create extensions.
