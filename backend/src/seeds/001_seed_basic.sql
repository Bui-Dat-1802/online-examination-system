-- seed roles
INSERT INTO auth_role (id, name)
VALUES (uuid_generate_v4(), 'student'),
       (uuid_generate_v4(), 'teacher'),
       (uuid_generate_v4(), 'admin')
ON CONFLICT (name) DO NOTHING;

-- sample teacher & student
INSERT INTO "user" (id, email, name, password_hash, role_id)
VALUES 
  (uuid_generate_v4(), 'teacher1@example.edu', 'Teacher One', '$2a$12$wxyIThNrqhdNwnK1QNLto.25/qyNccvV8tp1EhM6q1nlvGGQm32GS', (SELECT id FROM auth_role WHERE name='teacher')),
  (uuid_generate_v4(), 'student1@example.edu', 'Student One', '$2a$12$wxyIThNrqhdNwnK1QNLto.25/qyNccvV8tp1EhM6q1nlvGGQm32GS', (SELECT id FROM auth_role WHERE name='student'));

-- sample class
INSERT INTO class (id, teacher_id, name, code, description)
VALUES (uuid_generate_v4(), (SELECT id FROM "user" WHERE email='teacher1@example.edu'), 'Lập trình Web - K59', 'LPW-K59', 'Class demo');

-- sample exam + question + choices
INSERT INTO exam_template (id, class_id, title, description, duration_seconds, shuffle_questions, created_by)
VALUES (uuid_generate_v4(), (SELECT id FROM class WHERE code='LPW-K59'), 'Giữa kỳ - Lập trình Web', 'Demo exam', 3600, TRUE, (SELECT id FROM "user" WHERE email='teacher1@example.edu'));

-- create an instance (starts_at/ends_at null -> teacher can schedule later)
INSERT INTO exam_instance (id, template_id, starts_at, ends_at, published, created_by)
VALUES (uuid_generate_v4(), (SELECT id FROM exam_template WHERE title='Giữa kỳ - Lập trình Web'), NULL, NULL, false, (SELECT id FROM "user" WHERE email='teacher1@example.edu'));
