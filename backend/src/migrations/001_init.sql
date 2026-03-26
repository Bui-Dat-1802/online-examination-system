
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 00. Roles (simple lookup)
CREATE TABLE auth_role (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE -- e.g. 'student','teacher','proctor','admin'
);

-- 01. Users
CREATE TABLE "user" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  bio  TEXT,
  password_hash TEXT NOT NULL,
  role_id UUID NOT NULL REFERENCES auth_role(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_login_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_user_role ON "user"(role_id);

CREATE TABLE refresh_token (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  ip INET,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX idx_refresh_token_user ON refresh_token(user_id);
CREATE INDEX idx_refresh_token_expires ON refresh_token(expires_at);

-- 02. Classes (course)
CREATE TABLE class (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL, -- human readable code
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, code)
);
CREATE INDEX idx_class_teacher ON class(teacher_id);

-- 03. Enrollment Requests
CREATE TYPE enrollment_status AS ENUM ('pending','approved','rejected','cancelled');

CREATE TABLE enrollment_request (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES class(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  status enrollment_status NOT NULL DEFAULT 'pending',
  note TEXT,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES "user"(id), -- teacher/admin who reviewed
  UNIQUE (class_id, student_id) -- one request per student per class
);
CREATE INDEX idx_enrollment_class ON enrollment_request(class_id);
CREATE INDEX idx_enrollment_student ON enrollment_request(student_id);

-- 04. Question bank
CREATE TYPE difficulty_level AS ENUM ('easy','medium','hard');

CREATE TABLE question (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES "user"(id) ON DELETE SET NULL, -- teacher who created
  text TEXT NOT NULL,
  explanation TEXT, -- optional teacher-only explanation
  tags TEXT[] DEFAULT ARRAY[]::TEXT[], -- topics
  difficulty difficulty_level DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_question_owner ON question(owner_id);
CREATE INDEX idx_question_tags ON question USING GIN (tags);

-- 05. Choices (multiple choice options)
CREATE TABLE question_choice (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES question(id) ON DELETE CASCADE,
  label TEXT, -- 'A','B', or null (order used instead)
  "order" INTEGER NOT NULL DEFAULT 0,
  text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE -- server-only visibility
);
CREATE INDEX idx_choice_question ON question_choice(question_id);

-- 06. Exam templates (master)
CREATE TABLE exam_template (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES class(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  show_answers BOOLEAN NOT NULL DEFAULT FALSE,
  duration_seconds INTEGER NOT NULL, -- total seconds allowed
  shuffle_questions BOOLEAN NOT NULL DEFAULT FALSE,
  passing_score NUMERIC(5,2), -- optional
  created_by UUID REFERENCES "user"(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_exam_template_class ON exam_template(class_id);

-- 07. Exam instances (scheduled/published exam)
CREATE TABLE exam_instance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES exam_template(id) ON DELETE CASCADE,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES "user"(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_exam_instance_starts ON exam_instance(starts_at);
CREATE INDEX idx_exam_instance_template ON exam_instance(template_id);

-- 08. Mapping questions → exam_instance (explicit fixed list)
CREATE TABLE exam_question (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_instance_id UUID NOT NULL REFERENCES exam_instance(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES question(id) ON DELETE RESTRICT,
  ordinal INTEGER NOT NULL DEFAULT 0, -- ordering within exam (if not shuffled)
  points NUMERIC(6,2) NOT NULL DEFAULT 1.00,
  UNIQUE (exam_instance_id, question_id)
);
CREATE INDEX idx_exam_question_exam ON exam_question(exam_instance_id);

-- 09. Question pools (for random selection)
CREATE TABLE question_pool (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_instance_id UUID NOT NULL REFERENCES exam_instance(id) ON DELETE CASCADE,
  tag_filter TEXT[] DEFAULT ARRAY[]::TEXT[], -- choose by tags
  difficulty_filter difficulty_level,
  total_to_pick INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_qpool_exam ON question_pool(exam_instance_id);

-- 10. ExamSession (a student's live/started session)
CREATE TYPE session_state AS ENUM ('pending','started','submitted','expired','locked');

CREATE TABLE exam_session (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_instance_id UUID NOT NULL REFERENCES exam_instance(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE, -- opaque token or short JWT
  started_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  state session_state NOT NULL DEFAULT 'pending',
  ip_binding INET, -- optional
  ua_hash TEXT, -- hashed user-agent
  allowed_tab_id UUID, -- tab enforcement UUID provided by client
  focus_lost_count INTEGER NOT NULL DEFAULT 0,
  last_heartbeat_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (exam_instance_id, user_id) -- one session per user per instance
);
CREATE INDEX idx_exam_session_exam ON exam_session(exam_instance_id);
CREATE INDEX idx_exam_session_user ON exam_session(user_id);
CREATE INDEX idx_exam_session_token ON exam_session(token);

-- 11. Answers (upsert per question per session)
CREATE TABLE answer (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_session_id UUID NOT NULL REFERENCES exam_session(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES question(id) ON DELETE RESTRICT,
  choice_id UUID REFERENCES question_choice(id),
  answered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  selected_choice_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  UNIQUE (exam_session_id, question_id)
);
CREATE INDEX idx_answer_session ON answer(exam_session_id);

-- 12. Submissions (graded result)
CREATE TABLE submission (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_session_id UUID NOT NULL REFERENCES exam_session(id) ON DELETE CASCADE,
  score NUMERIC(8,2) NOT NULL DEFAULT 0,
  max_score NUMERIC(8,2) NOT NULL DEFAULT 0,
  graded_at TIMESTAMP WITH TIME ZONE,
  graded_by UUID REFERENCES "user"(id), -- null if auto-graded
  details JSONB, -- detailed per-question results: [{question_id, correct, points}]
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_submission_session ON submission(exam_session_id);

-- 13. Audit log (append-only)
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  exam_session_id UUID REFERENCES exam_session(id),
  user_id UUID REFERENCES "user"(id),
  payload JSONB,
  source_ip INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_session ON audit_log(exam_session_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_event ON audit_log(event_type);

-- 14. Roster import (CSV imports)
CREATE TABLE roster_import (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES class(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES "user"(id),
  file_path TEXT,
  status TEXT NOT NULL DEFAULT 'processing', -- processing/finished/failed
  rows_total INTEGER DEFAULT 0,
  rows_success INTEGER DEFAULT 0,
  rows_failed INTEGER DEFAULT 0,
  error_summary JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_roster_import_class ON roster_import(class_id);

-- 15. Accommodations (extended time, etc.)
CREATE TABLE accommodation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  exam_instance_id UUID NOT NULL REFERENCES exam_instance(id) ON DELETE CASCADE,
  extra_seconds INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_accom_user_exam ON accommodation(user_id, exam_instance_id);

-- 16. Notifications
CREATE TABLE notification (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- e.g. enrollment_approved, exam_start, result_released
  payload JSONB,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_notification_user ON notification(user_id);

-- 17. Grade overrides (teacher manual changes)
CREATE TABLE grade_override (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES submission(id) ON DELETE CASCADE,
  overridden_by UUID REFERENCES "user"(id),
  new_score NUMERIC(8,2) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_grade_override_submission ON grade_override(submission_id);

-- 18. Optional: session flags / alerts
CREATE TABLE session_flag (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_session_id UUID NOT NULL REFERENCES exam_session(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL, -- e.g. 'multi_ip', 'multiple_tabs', 'focus_lost_threshold'
  details JSONB,
  flagged_by UUID REFERENCES "user"(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_session_flag_session ON session_flag(exam_session_id);
