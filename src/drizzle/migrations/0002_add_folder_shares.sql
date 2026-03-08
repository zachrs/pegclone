CREATE TABLE IF NOT EXISTS "folder_shares" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "folder_id" uuid NOT NULL REFERENCES "folders"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "shared_by" uuid NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "folder_shares_folder_user_idx" ON "folder_shares" ("folder_id", "user_id");
CREATE INDEX IF NOT EXISTS "folder_shares_user_id_idx" ON "folder_shares" ("user_id");
CREATE INDEX IF NOT EXISTS "folder_shares_tenant_id_idx" ON "folder_shares" ("tenant_id");
