ALTER TABLE users
    ADD COLUMN username VARCHAR(32),
    ADD CONSTRAINT chk_users_username_format CHECK (username ~ '^[a-z0-9][a-z0-9_.-]{2,31}$');

CREATE UNIQUE INDEX users_username_key ON users (username);
