-- Add optional lowercase unique username to users for username-based sign-in.
ALTER TABLE "users"
    ADD COLUMN "username" VARCHAR(50);

ALTER TABLE "users"
    ADD CONSTRAINT "chk_users_username_format"
    CHECK ("username" IS NULL OR ("username" ~ '^[a-z0-9._-]{3,50}$' AND "username" ~ '[a-z0-9]'));

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
