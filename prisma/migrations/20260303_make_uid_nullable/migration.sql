-- Make uid nullable to support users created only via Cognito
-- Firebase UID users will retain their uid, Cognito-only users will have uid = NULL
ALTER TABLE "users" ALTER COLUMN "uid" DROP NOT NULL;

-- Ensure cognito_sub is unique for all new lookups
CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_cognito_sub_unique" ON "users"("cognito_sub") WHERE "cognito_sub" IS NOT NULL;

-- Add index on email for fallback lookups
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users"("email") WHERE "email" IS NOT NULL;

-- Add composite index for user lookups
CREATE INDEX IF NOT EXISTS "idx_users_cognito_sub_email" ON "users"("cognito_sub", "email");
