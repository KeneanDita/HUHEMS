-- HUHEMS PostgreSQL schema (manual SQL)
-- Notes:
-- - Uses pgcrypto's gen_random_uuid() for UUID PK defaults.
-- - Mirrors the initial GORM models and refined relational schema.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Roles
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,

  name text NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_roles_deleted_at ON roles (deleted_at);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,

  username text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role_id uuid NOT NULL REFERENCES roles(id)
);

CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users (deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users (role_id);

-- Students
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,

  user_id uuid NOT NULL UNIQUE REFERENCES users(id),
  full_name text NOT NULL,
  year int NOT NULL,
  department text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_students_deleted_at ON students (deleted_at);

-- Exams
CREATE TABLE IF NOT EXISTS exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,

  title text NOT NULL,
  description text NULL,
  created_by_id uuid NOT NULL REFERENCES users(id),
  published boolean NOT NULL DEFAULT false,
  start_time timestamptz NULL,
  end_time timestamptz NULL,
  max_attempts int NOT NULL DEFAULT 1,
  questions_per_page int NOT NULL DEFAULT 5
);

CREATE INDEX IF NOT EXISTS idx_exams_deleted_at ON exams (deleted_at);
CREATE INDEX IF NOT EXISTS idx_exams_created_by_id ON exams (created_by_id);

-- Questions
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,

  exam_id uuid NOT NULL REFERENCES exams(id),
  text text NOT NULL,
  type text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_questions_deleted_at ON questions (deleted_at);
CREATE INDEX IF NOT EXISTS idx_questions_exam_id ON questions (exam_id);

-- Choices
CREATE TABLE IF NOT EXISTS choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,

  question_id uuid NOT NULL REFERENCES questions(id),
  text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  "order" int NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_choices_deleted_at ON choices (deleted_at);
CREATE INDEX IF NOT EXISTS idx_choices_question_id ON choices (question_id);

-- Exam attempts
CREATE TABLE IF NOT EXISTS exam_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,

  student_id uuid NOT NULL REFERENCES students(id),
  exam_id uuid NOT NULL REFERENCES exams(id),
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz NULL,
  score double precision NOT NULL DEFAULT 0,
  submitted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_exam_attempts_deleted_at ON exam_attempts (deleted_at);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_student_id ON exam_attempts (student_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam_id ON exam_attempts (exam_id);

-- Student answers
CREATE TABLE IF NOT EXISTS student_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,

  attempt_id uuid NOT NULL REFERENCES exam_attempts(id),
  question_id uuid NOT NULL REFERENCES questions(id),
  selected_choice_ids text[] NULL,
  flagged boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_student_answers_deleted_at ON student_answers (deleted_at);
CREATE INDEX IF NOT EXISTS idx_student_answers_attempt_id ON student_answers (attempt_id);
CREATE INDEX IF NOT EXISTS idx_student_answers_question_id ON student_answers (question_id);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,

  user_id uuid NOT NULL REFERENCES users(id),
  action text NOT NULL,
  entity_id uuid NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_deleted_at ON audit_logs (deleted_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs (entity_id);
