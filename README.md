# HUHEMS - Hayamaya University Holistic Exam Management  System

HUHEMS is a full-stack exam management system for Haramaya University. It supports admin-managed exams and question banks, student exam attempts with time limits, and reporting/analytics.

Author : [Kenean Dita](https://www.github.com/keneandita)

## Monorepo layout

- `backend/`: Go API (Gin + GORM + PostgreSQL)
- `frontend/`: Next.js web app (React + Tailwind UI)

## Features

### Admin

- Create and manage exams (settings, publish/unpublish, reports)
- Create questions manually or import questions in bulk via CSV
- Manage student accounts (create/edit/delete) and import students in bulk via CSV
- View analytics (exam-level and performance breakdowns)

### Student

- Start exam attempts with a pre-start rules/confirmation gate
- Countdown timer with auto-submit when time is up (client + server enforced)
- Flag/unflag questions during an attempt
- View attempt results with human-readable answer text

## Requirements

- Node.js 18+ (for the frontend)
- Go 1.21+ (for the backend)
- PostgreSQL 16 (or run it via Docker)

## Configuration

### Backend env (`backend/.env`)

Required variables:

- `DB_URL` (Postgres connection string)
- `JWT_SECRET` (used to sign auth tokens)
- `PORT` (defaults to `8080`)

Example (already present in `backend/.env`):

```dotenv
DB_URL=postgres://postgres:newpassword123@localhost:5432/huhems?sslmode=disable
JWT_SECRET=yourstrongsecret
PORT=8080
```

### Frontend env (`frontend/.env`)

- `NEXT_PUBLIC_API_BASE_URL` (the backend base URL)

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

## Running the project

### Option A: Docker Compose (recommended)

From the repo root:

```bash
docker compose up -d --build
```

Services:

- Frontend: <http://localhost:3000>
- Backend health: <http://localhost:8080/health>
- Postgres: `localhost:5432`

If Docker commands fail on Windows, ensure Docker Desktop is installed and running.

### Option B: Local dev (Go + Node)

1) Start Postgres (Docker):

```bash
docker compose up -d db
```

1) Backend:

```bash
cd backend
go run ./cmd/migrate
go run ./cmd/api
```

1) Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Bulk CSV imports

HUHEMS supports two bulk-import flows:

1) **Question import** (inside an exam)
2) **Student import** (in Student Manager)

Both imports accept a `.csv` uploaded as multipart form-data field name: `file`.

### 1) Questions CSV format

Import location:

- Admin → Exams → open an exam → Questions tab → **Import Questions (CSV)**

CSV columns:

| Column | Required | Description |
| --- | ---: | --- |
| `text` | yes | The question text |
| `type` | yes | `single_choice` or `multi_choice` (also accepts `single`, `multi`, `sc`, `mc`) |
| `choices` | yes | Pipe-separated choice list |
| `correct` | yes | Either correct indices **or** exact choice text(s) |

#### `choices` separator

Use a pipe: `|`

- `A|B|C|D`
- `A | B | C | D` (spaces are allowed; they are trimmed)

#### `correct` accepted values

You can provide correct answers in either of these ways:

1) **1-based indices** into the `choices` list:

- Single choice: `3`
- Multi choice: `1|4` (commas also work: `1,4`)

1) **Exact choice text(s)** (case-insensitive match):

- Single choice: `Central Processing Unit`
- Multi choice: `Option A|Option C`

Note: if your correct value is numeric (example `80`), the importer treats it as an index only when it fits within the number of choices; otherwise it is treated as answer text and matched to a choice like `"80"`.

#### Example questions CSV (copy/paste)

```csv
text,type,choices,correct
"What does CPU stand for?",single_choice,"Central Processing Unit|Computer Personal Unit|Central Performance Utility|Control Processing Unit",Central Processing Unit
"Select prime numbers",multi_choice,"2|3|4|5","2|3|5"
"Which HTTP method retrieves data?",single_choice,"POST|PUT|GET|DELETE",3
```

CSV tips:

- If your question text contains commas, wrap it in quotes.
- If you include a header row, columns can be reordered.

### 2) Students (users) CSV format

Import location:

- Admin → Students → **Import Students (CSV)**

CSV columns:

| Column | Required | Description |
| --- | ---: | --- |
| `username` | yes | Student username (must be unique) |
| `email` | yes | Student email (must be unique; must be a valid email) |
| `password` | yes | Initial password (min 8 characters) |
| `fullName` | yes | Student full name |
| `year` | yes | Numeric year/level (must be >= 1) |
| `department` | yes | Department name |

Header row is optional. If present, columns can be reordered.

#### Example students CSV (copy/paste)

```csv
username,email,password,fullName,year,department
student001,student001@huhems.local,Student123!,Jane Doe,1,Computer Science
student002,student002@huhems.local,Student123!,Abel Kebede,2,Information Systems
```

## Troubleshooting

### “Failed to fetch” during CSV import

This usually means the frontend cannot reach the backend URL configured by `NEXT_PUBLIC_API_BASE_URL`.

Checklist:

1) Confirm backend is running:

- <http://localhost:8080/health> should respond.

1) Confirm frontend is configured correctly:

- `frontend/.env` should contain `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080`

1) Restart servers after changes:

- If you change backend routes/controllers, restart the backend process.
- If you change `frontend/.env`, restart the Next.js dev server.

### “404 page not found” when importing

- If it’s from the backend: the backend route is missing or the backend wasn’t restarted.
- If it’s from the frontend: the Next.js API route may not be built/running.

## Security notes

- Change `JWT_SECRET` for real deployments.
- Don’t use demo passwords in production.
- Consider running behind HTTPS and using secure cookies in production.

## License

MIT — see `LICENSE`.
