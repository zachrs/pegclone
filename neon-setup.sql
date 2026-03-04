-- ============================================================
-- PART 1: CREATE SCHEMA
-- Paste this into Neon SQL Editor first
-- ============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('super_admin', 'cs_rep', 'org_user', 'provider');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE delivery_channel AS ENUM ('sms', 'email', 'qr_code', 'sms_and_email');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE message_status AS ENUM ('draft', 'queued', 'sent', 'delivered', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE event_type AS ENUM ('queued', 'sent', 'delivered', 'failed', 'opened', 'item_viewed', 'reminder_sent');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE content_source AS ENUM ('org_upload', 'system_library');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE content_type AS ENUM ('pdf', 'link');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE folder_type AS ENUM ('personal', 'team', 'favorites');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE contact_type AS ENUM ('email', 'phone');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE bulk_send_status AS ENUM ('pending', 'sending', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#2563EB',
  secondary_color TEXT,
  settings JSONB DEFAULT '{}',
  sms_send_count_month INTEGER NOT NULL DEFAULT 0,
  sms_throttled BOOLEAN NOT NULL DEFAULT false,
  sms_throttle_overridden_by UUID,
  sms_throttle_overridden_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  password_hash TEXT NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'org_user',
  is_admin BOOLEAN NOT NULL DEFAULT false,
  photo_url TEXT,
  title TEXT,
  department TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  activated_at TIMESTAMPTZ,
  deactivated_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{}',
  mfa_enabled BOOLEAN NOT NULL DEFAULT false,
  invite_token_hash TEXT,
  invite_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_tenant_email_idx ON users(tenant_id, email);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_tenant_id_idx ON users(tenant_id);

-- Recipients
CREATE TABLE IF NOT EXISTS recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  contact TEXT NOT NULL,
  contact_type contact_type NOT NULL,
  opted_out BOOLEAN NOT NULL DEFAULT false,
  opted_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_messaged_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS recipients_tenant_contact_idx ON recipients(tenant_id, contact);
CREATE INDEX IF NOT EXISTS recipients_tenant_id_idx ON recipients(tenant_id);

-- Content Items
CREATE TABLE IF NOT EXISTS content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES organizations(id),
  algolia_object_id TEXT,
  source content_source NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type content_type NOT NULL,
  url TEXT,
  storage_path TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS content_items_tenant_algolia_idx ON content_items(tenant_id, algolia_object_id);
CREATE INDEX IF NOT EXISTS content_items_tenant_id_idx ON content_items(tenant_id);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  sender_id UUID NOT NULL REFERENCES users(id),
  recipient_id UUID NOT NULL REFERENCES recipients(id),
  bulk_send_id UUID,
  subject TEXT,
  content_blocks JSONB NOT NULL,
  delivery_channel delivery_channel NOT NULL,
  status message_status NOT NULL DEFAULT 'queued',
  delivery_error TEXT,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  access_token_hash TEXT NOT NULL,
  last_accessed_at TIMESTAMPTZ,
  access_token_expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS messages_access_token_hash_idx ON messages(access_token_hash);
CREATE INDEX IF NOT EXISTS messages_tenant_recipient_idx ON messages(tenant_id, recipient_id);
CREATE INDEX IF NOT EXISTS messages_tenant_sender_idx ON messages(tenant_id, sender_id);
CREATE INDEX IF NOT EXISTS messages_tenant_status_idx ON messages(tenant_id, status);
CREATE INDEX IF NOT EXISTS messages_bulk_send_id_idx ON messages(bulk_send_id);

-- Message Events
CREATE TABLE IF NOT EXISTS message_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  message_id UUID NOT NULL REFERENCES messages(id),
  event_type event_type NOT NULL,
  content_item_id UUID,
  payload JSONB DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS message_events_message_type_idx ON message_events(message_id, event_type);
CREATE INDEX IF NOT EXISTS message_events_tenant_id_idx ON message_events(tenant_id);

-- Bulk Sends
CREATE TABLE IF NOT EXISTS bulk_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  created_by UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  content_blocks JSONB NOT NULL,
  delivery_channel delivery_channel NOT NULL,
  total_recipients INTEGER NOT NULL,
  status bulk_send_status NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS bulk_sends_tenant_id_idx ON bulk_sends(tenant_id);

-- Folders
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  owner_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  type folder_type NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_by UUID,
  published_at TIMESTAMPTZ,
  parent_folder_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS folders_tenant_id_idx ON folders(tenant_id);
CREATE INDEX IF NOT EXISTS folders_owner_type_idx ON folders(tenant_id, owner_id, type);

-- Folder Items
CREATE TABLE IF NOT EXISTS folder_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  folder_id UUID NOT NULL REFERENCES folders(id),
  content_item_id UUID NOT NULL REFERENCES content_items(id),
  added_by UUID NOT NULL REFERENCES users(id),
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS folder_items_folder_content_idx ON folder_items(folder_id, content_item_id);
CREATE INDEX IF NOT EXISTS folder_items_tenant_id_idx ON folder_items(tenant_id);

-- MFA Codes
CREATE TABLE IF NOT EXISTS mfa_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS mfa_codes_user_id_idx ON mfa_codes(user_id);
CREATE INDEX IF NOT EXISTS mfa_codes_user_expires_idx ON mfa_codes(user_id, expires_at);
