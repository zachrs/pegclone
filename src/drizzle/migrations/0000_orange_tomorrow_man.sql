CREATE TYPE "public"."bulk_send_status" AS ENUM('pending', 'sending', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."contact_type" AS ENUM('email', 'phone');--> statement-breakpoint
CREATE TYPE "public"."content_source" AS ENUM('org_upload', 'system_library');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('pdf', 'link');--> statement-breakpoint
CREATE TYPE "public"."delivery_channel" AS ENUM('sms', 'email', 'qr_code', 'sms_and_email');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('queued', 'sent', 'delivered', 'failed', 'opened', 'item_viewed', 'reminder_sent');--> statement-breakpoint
CREATE TYPE "public"."folder_type" AS ENUM('personal', 'team', 'favorites');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('draft', 'queued', 'sent', 'delivered', 'failed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('super_admin', 'cs_rep', 'org_user', 'provider');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"user_id" uuid,
	"action" text NOT NULL,
	"resource_type" text,
	"resource_id" text,
	"details" jsonb DEFAULT '{}'::jsonb,
	"ip_address" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bulk_sends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"name" text NOT NULL,
	"content_blocks" jsonb NOT NULL,
	"delivery_channel" "delivery_channel" NOT NULL,
	"total_recipients" integer NOT NULL,
	"status" "bulk_send_status" DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"created_by" uuid,
	"algolia_object_id" text,
	"source" "content_source" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" "content_type" NOT NULL,
	"url" text,
	"storage_path" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "folder_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"folder_id" uuid NOT NULL,
	"content_item_id" uuid NOT NULL,
	"added_by" uuid NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "folder_type" NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_by" uuid,
	"published_at" timestamp with time zone,
	"parent_folder_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip_address" text NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"event_type" "event_type" NOT NULL,
	"content_item_id" uuid,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"bulk_send_id" uuid,
	"subject" text,
	"content_blocks" jsonb NOT NULL,
	"delivery_channel" "delivery_channel" NOT NULL,
	"status" "message_status" DEFAULT 'queued' NOT NULL,
	"delivery_error" text,
	"scheduled_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"opened_at" timestamp with time zone,
	"access_token_hash" text NOT NULL,
	"last_accessed_at" timestamp with time zone,
	"access_token_expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mfa_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo_url" text,
	"primary_color" text DEFAULT '#2563EB',
	"secondary_color" text,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"sms_send_count_month" integer DEFAULT 0 NOT NULL,
	"sms_throttled" boolean DEFAULT false NOT NULL,
	"sms_throttle_overridden_by" uuid,
	"sms_throttle_overridden_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"contact" text NOT NULL,
	"contact_type" "contact_type" NOT NULL,
	"opted_out" boolean DEFAULT false NOT NULL,
	"opted_out_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_messaged_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"password_hash" text NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"role" "user_role" DEFAULT 'org_user' NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"photo_url" text,
	"title" text,
	"department" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"activated_at" timestamp with time zone,
	"deactivated_at" timestamp with time zone,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"mfa_enabled" boolean DEFAULT false NOT NULL,
	"invite_token_hash" text,
	"invite_expires_at" timestamp with time zone,
	"reset_token_hash" text,
	"reset_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_organizations_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_sends" ADD CONSTRAINT "bulk_sends_tenant_id_organizations_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_sends" ADD CONSTRAINT "bulk_sends_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_tenant_id_organizations_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folder_items" ADD CONSTRAINT "folder_items_tenant_id_organizations_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folder_items" ADD CONSTRAINT "folder_items_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folder_items" ADD CONSTRAINT "folder_items_content_item_id_content_items_id_fk" FOREIGN KEY ("content_item_id") REFERENCES "public"."content_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folder_items" ADD CONSTRAINT "folder_items_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_tenant_id_organizations_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_events" ADD CONSTRAINT "message_events_tenant_id_organizations_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_events" ADD CONSTRAINT "message_events_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_tenant_id_organizations_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_id_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."recipients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mfa_codes" ADD CONSTRAINT "mfa_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mfa_codes" ADD CONSTRAINT "mfa_codes_tenant_id_organizations_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipients" ADD CONSTRAINT "recipients_tenant_id_organizations_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_organizations_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_occurred_at_idx" ON "audit_logs" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "bulk_sends_tenant_id_idx" ON "bulk_sends" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_items_tenant_algolia_idx" ON "content_items" USING btree ("tenant_id","algolia_object_id");--> statement-breakpoint
CREATE INDEX "content_items_tenant_id_idx" ON "content_items" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "folder_items_folder_content_idx" ON "folder_items" USING btree ("folder_id","content_item_id");--> statement-breakpoint
CREATE INDEX "folder_items_tenant_id_idx" ON "folder_items" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "folders_tenant_id_idx" ON "folders" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "folders_owner_type_idx" ON "folders" USING btree ("tenant_id","owner_id","type");--> statement-breakpoint
CREATE INDEX "login_attempts_ip_attempted_idx" ON "login_attempts" USING btree ("ip_address","attempted_at");--> statement-breakpoint
CREATE INDEX "message_events_message_type_idx" ON "message_events" USING btree ("message_id","event_type");--> statement-breakpoint
CREATE INDEX "message_events_tenant_id_idx" ON "message_events" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "messages_access_token_hash_idx" ON "messages" USING btree ("access_token_hash");--> statement-breakpoint
CREATE INDEX "messages_tenant_recipient_idx" ON "messages" USING btree ("tenant_id","recipient_id");--> statement-breakpoint
CREATE INDEX "messages_tenant_sender_idx" ON "messages" USING btree ("tenant_id","sender_id");--> statement-breakpoint
CREATE INDEX "messages_tenant_status_idx" ON "messages" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "messages_bulk_send_id_idx" ON "messages" USING btree ("bulk_send_id");--> statement-breakpoint
CREATE INDEX "mfa_codes_user_id_idx" ON "mfa_codes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mfa_codes_user_expires_idx" ON "mfa_codes" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "recipients_tenant_contact_idx" ON "recipients" USING btree ("tenant_id","contact");--> statement-breakpoint
CREATE INDEX "recipients_tenant_id_idx" ON "recipients" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_tenant_email_idx" ON "users" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_tenant_id_idx" ON "users" USING btree ("tenant_id");