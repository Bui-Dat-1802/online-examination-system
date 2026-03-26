-- CreateEnum
CREATE TYPE "difficulty_level" AS ENUM ('easy', 'medium', 'hard');

-- CreateEnum
CREATE TYPE "enrollment_status" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "session_state" AS ENUM ('pending', 'started', 'submitted', 'expired', 'locked');

-- CreateTable
CREATE TABLE "accommodation" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "exam_instance_id" UUID NOT NULL,
    "extra_seconds" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accommodation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "exam_session_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "choice_id" UUID,
    "selected_choice_ids" UUID[],
    "answered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "event_type" TEXT NOT NULL,
    "exam_session_id" UUID,
    "user_id" UUID,
    "payload" JSONB,
    "source_ip" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_role" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,

    CONSTRAINT "auth_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "teacher_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollment_request" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "class_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "status" "enrollment_status" NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ(6),
    "reviewed_by" UUID,

    CONSTRAINT "enrollment_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_instance" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "template_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "show_answers" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_instance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_question" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "exam_instance_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "ordinal" INTEGER NOT NULL DEFAULT 0,
    "points" DECIMAL(6,2) NOT NULL DEFAULT 1.00,

    CONSTRAINT "exam_question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_session" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "exam_instance_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "started_at" TIMESTAMPTZ(6),
    "ends_at" TIMESTAMPTZ(6),
    "state" "session_state" NOT NULL DEFAULT 'pending',
    "ip_binding" INET,
    "ua_hash" TEXT,
    "allowed_tab_id" UUID,
    "focus_lost_count" INTEGER NOT NULL DEFAULT 0,
    "last_heartbeat_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_template" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "class_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "duration_seconds" INTEGER NOT NULL,
    "shuffle_questions" BOOLEAN NOT NULL DEFAULT false,
    "passing_score" DECIMAL(5,2),
    "created_by" UUID,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "owner_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "explanation" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "difficulty" "difficulty_level" DEFAULT 'medium',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_choice" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "question_id" UUID NOT NULL,
    "label" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "question_choice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_flag" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "exam_session_id" UUID NOT NULL,
    "flag_type" TEXT NOT NULL,
    "details" JSONB,
    "flagged_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_flag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "exam_session_id" UUID NOT NULL,
    "score" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "max_score" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "graded_at" TIMESTAMPTZ(6),
    "graded_by" UUID,
    "details" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMPTZ(6),
    "bio" TEXT,
    "reset_otp_hash" TEXT,
    "reset_otp_expires" TIMESTAMPTZ(6),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_token" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "ip" INET,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_user" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "otp_hash" TEXT NOT NULL,
    "otp_expires_at" TIMESTAMP(3) NOT NULL,
    "otp_used" BOOLEAN NOT NULL DEFAULT false,
    "otp_attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_action" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "admin_id" UUID NOT NULL,
    "action_type" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" UUID,
    "description" TEXT,
    "metadata" JSONB,
    "ip_address" INET,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_action_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "idx_accom_user_exam" ON "accommodation"("user_id", "exam_instance_id");

-- CreateIndex
CREATE INDEX "idx_answer_session" ON "answer"("exam_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "answer_exam_session_id_question_id_key" ON "answer"("exam_session_id", "question_id");

-- CreateIndex
CREATE INDEX "idx_audit_event" ON "audit_log"("event_type");

-- CreateIndex
CREATE INDEX "idx_audit_session" ON "audit_log"("exam_session_id");

-- CreateIndex
CREATE INDEX "idx_audit_user" ON "audit_log"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_role_name_key" ON "auth_role"("name");

-- CreateIndex
CREATE INDEX "idx_class_teacher" ON "class"("teacher_id");

-- CreateIndex
CREATE INDEX "idx_class_deleted" ON "class"("is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "class_teacher_id_code_key" ON "class"("teacher_id", "code");

-- CreateIndex
CREATE INDEX "idx_enrollment_class" ON "enrollment_request"("class_id");

-- CreateIndex
CREATE INDEX "idx_enrollment_student" ON "enrollment_request"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "enrollment_request_class_id_student_id_key" ON "enrollment_request"("class_id", "student_id");

-- CreateIndex
CREATE INDEX "idx_exam_instance_starts" ON "exam_instance"("starts_at");

-- CreateIndex
CREATE INDEX "idx_exam_instance_template" ON "exam_instance"("template_id");

-- CreateIndex
CREATE INDEX "idx_exam_instance_deleted" ON "exam_instance"("is_deleted");

-- CreateIndex
CREATE INDEX "idx_exam_question_exam" ON "exam_question"("exam_instance_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_question_exam_instance_id_question_id_key" ON "exam_question"("exam_instance_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_session_token_key" ON "exam_session"("token");

-- CreateIndex
CREATE INDEX "idx_exam_session_exam" ON "exam_session"("exam_instance_id");

-- CreateIndex
CREATE INDEX "idx_exam_session_token" ON "exam_session"("token");

-- CreateIndex
CREATE INDEX "idx_exam_session_user" ON "exam_session"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_session_exam_instance_id_user_id_key" ON "exam_session"("exam_instance_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_exam_template_class" ON "exam_template"("class_id");

-- CreateIndex
CREATE INDEX "idx_exam_template_deleted" ON "exam_template"("is_deleted");

-- CreateIndex
CREATE INDEX "idx_question_owner" ON "question"("owner_id");

-- CreateIndex
CREATE INDEX "idx_question_tags" ON "question" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "idx_question_deleted" ON "question"("is_deleted");

-- CreateIndex
CREATE INDEX "idx_choice_question" ON "question_choice"("question_id");

-- CreateIndex
CREATE INDEX "idx_session_flag_session" ON "session_flag"("exam_session_id");

-- CreateIndex
CREATE INDEX "idx_submission_session" ON "submission"("exam_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "idx_user_role" ON "user"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_token_hash_key" ON "refresh_token"("token_hash");

-- CreateIndex
CREATE INDEX "idx_refresh_token_expires" ON "refresh_token"("expires_at");

-- CreateIndex
CREATE INDEX "idx_refresh_token_user" ON "refresh_token"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "pending_user_email_key" ON "pending_user"("email");

-- CreateIndex
CREATE INDEX "idx_admin_action_admin" ON "admin_action"("admin_id");

-- CreateIndex
CREATE INDEX "idx_admin_action_type" ON "admin_action"("action_type");

-- CreateIndex
CREATE INDEX "idx_admin_action_created" ON "admin_action"("created_at");

-- AddForeignKey
ALTER TABLE "accommodation" ADD CONSTRAINT "accommodation_exam_instance_id_fkey" FOREIGN KEY ("exam_instance_id") REFERENCES "exam_instance"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "accommodation" ADD CONSTRAINT "accommodation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "answer" ADD CONSTRAINT "answer_choice_id_fkey" FOREIGN KEY ("choice_id") REFERENCES "question_choice"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "answer" ADD CONSTRAINT "answer_exam_session_id_fkey" FOREIGN KEY ("exam_session_id") REFERENCES "exam_session"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "answer" ADD CONSTRAINT "answer_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "question"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_exam_session_id_fkey" FOREIGN KEY ("exam_session_id") REFERENCES "exam_session"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "class" ADD CONSTRAINT "class_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "enrollment_request" ADD CONSTRAINT "enrollment_request_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "enrollment_request" ADD CONSTRAINT "enrollment_request_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "enrollment_request" ADD CONSTRAINT "enrollment_request_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "exam_instance" ADD CONSTRAINT "exam_instance_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "exam_instance" ADD CONSTRAINT "exam_instance_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "exam_template"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "exam_question" ADD CONSTRAINT "exam_question_exam_instance_id_fkey" FOREIGN KEY ("exam_instance_id") REFERENCES "exam_instance"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "exam_question" ADD CONSTRAINT "exam_question_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "question"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "exam_session" ADD CONSTRAINT "exam_session_exam_instance_id_fkey" FOREIGN KEY ("exam_instance_id") REFERENCES "exam_instance"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "exam_session" ADD CONSTRAINT "exam_session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "exam_template" ADD CONSTRAINT "exam_template_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "exam_template" ADD CONSTRAINT "exam_template_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "question" ADD CONSTRAINT "question_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "question_choice" ADD CONSTRAINT "question_choice_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "question"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "session_flag" ADD CONSTRAINT "session_flag_exam_session_id_fkey" FOREIGN KEY ("exam_session_id") REFERENCES "exam_session"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "session_flag" ADD CONSTRAINT "session_flag_flagged_by_fkey" FOREIGN KEY ("flagged_by") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "submission" ADD CONSTRAINT "submission_exam_session_id_fkey" FOREIGN KEY ("exam_session_id") REFERENCES "exam_session"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "submission" ADD CONSTRAINT "submission_graded_by_fkey" FOREIGN KEY ("graded_by") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "auth_role"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admin_action" ADD CONSTRAINT "admin_action_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
