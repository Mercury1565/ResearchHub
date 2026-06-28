-- 005_users.down.sql
ALTER TABLE projects DROP COLUMN user_id;
DROP TABLE users;
