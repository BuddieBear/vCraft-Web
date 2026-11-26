-- Add optional case-insensitive unique username to users for username-based sign-in.
ALTER TABLE "users"
    ADD COLUMN "username" VARCHAR(50);

ALTER TABLE "users"
    ADD CONSTRAINT "chk_users_username_format"
    CHECK ("username" IS NULL OR "username" ~ '^[a-zA-Z0-9._-]{3,50}$');

CREATE UNIQUE INDEX "uq_users_username_lower"
    ON "users" (LOWER("username"))
    WHERE "username" IS NOT NULL;
