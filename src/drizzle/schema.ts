import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ── Enums ──────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "super_admin",
  "cs_rep",
  "org_user",
  "provider",
]);

export const deliveryChannelEnum = pgEnum("delivery_channel", [
  "sms",
  "email",
  "qr_code",
  "sms_and_email",
]);

export const messageStatusEnum = pgEnum("message_status", [
  "draft",
  "queued",
  "sent",
  "delivered",
  "failed",
]);

export const eventTypeEnum = pgEnum("event_type", [
  "queued",
  "sent",
  "delivered",
  "failed",
  "opened",
  "item_viewed",
  "reminder_sent",
]);

export const contentSourceEnum = pgEnum("content_source", [
  "org_upload",
  "system_library",
]);

export const contentTypeEnum = pgEnum("content_type", ["pdf", "link"]);

export const folderTypeEnum = pgEnum("folder_type", [
  "personal",
  "team",
  "favorites",
]);

export const contactTypeEnum = pgEnum("contact_type", ["email", "phone"]);

export const bulkSendStatusEnum = pgEnum("bulk_send_status", [
  "pending",
  "sending",
  "completed",
  "failed",
]);

// ── Organizations ──────────────────────────────────────────────────────────

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").default("#2563EB"),
  secondaryColor: text("secondary_color"),
  settings: jsonb("settings").default({}).$type<{
    reminders?: {
      enabled: boolean;
      default_max: number;
      default_interval_hours: number;
    };
    message_templates?: {
      sms: string;
      email_subject: string;
      email_body: string;
    };
    mfa?: {
      required: boolean;
    };
    contact?: {
      phone: string;
      address: string;
      website: string;
    };
    delivery?: {
      link_expiration_days: number;
      opt_out_footer: boolean;
    };
  }>(),
  smsSendCountMonth: integer("sms_send_count_month").default(0).notNull(),
  smsThrottled: boolean("sms_throttled").default(false).notNull(),
  smsThrottleOverriddenBy: uuid("sms_throttle_overridden_by"),
  smsThrottleOverriddenAt: timestamp("sms_throttle_overridden_at", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ── Users ──────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .references(() => organizations.id)
      .notNull(),
    passwordHash: text("password_hash").notNull(),
    email: text("email").notNull(),
    fullName: text("full_name").notNull(),
    role: userRoleEnum("role").default("org_user").notNull(),
    isAdmin: boolean("is_admin").default(false).notNull(),
    photoUrl: text("photo_url"),
    title: text("title"),
    department: text("department"),
    isActive: boolean("is_active").default(true).notNull(),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    settings: jsonb("settings").default({}),
    mfaEnabled: boolean("mfa_enabled").default(false).notNull(),
    inviteTokenHash: text("invite_token_hash"),
    inviteExpiresAt: timestamp("invite_expires_at", { withTimezone: true }),
    resetTokenHash: text("reset_token_hash"),
    resetExpiresAt: timestamp("reset_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("users_tenant_email_idx").on(table.tenantId, table.email),
    uniqueIndex("users_email_idx").on(table.email),
    index("users_tenant_id_idx").on(table.tenantId),
  ]
);

// ── Recipients ─────────────────────────────────────────────────────────────

export const recipients = pgTable(
  "recipients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .references(() => organizations.id)
      .notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    contact: text("contact").notNull(),
    contactType: contactTypeEnum("contact_type").notNull(),
    optedOut: boolean("opted_out").default(false).notNull(),
    optedOutAt: timestamp("opted_out_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastMessagedAt: timestamp("last_messaged_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("recipients_tenant_contact_idx").on(
      table.tenantId,
      table.contact
    ),
    index("recipients_tenant_id_idx").on(table.tenantId),
  ]
);

// ── Content Items ──────────────────────────────────────────────────────────

export const contentItems = pgTable(
  "content_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").references(() => organizations.id),
    createdBy: uuid("created_by").references(() => users.id),
    algoliaObjectId: text("algolia_object_id"),
    source: contentSourceEnum("source").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    type: contentTypeEnum("type").notNull(),
    url: text("url"),
    storagePath: text("storage_path"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("content_items_tenant_algolia_idx").on(
      table.tenantId,
      table.algoliaObjectId
    ),
    index("content_items_tenant_id_idx").on(table.tenantId),
  ]
);

// ── Messages ───────────────────────────────────────────────────────────────

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .references(() => organizations.id)
      .notNull(),
    senderId: uuid("sender_id")
      .references(() => users.id)
      .notNull(),
    recipientId: uuid("recipient_id")
      .references(() => recipients.id)
      .notNull(),
    bulkSendId: uuid("bulk_send_id"),
    subject: text("subject"),
    contentBlocks: jsonb("content_blocks")
      .notNull()
      .$type<
        Array<{ type: "content_item"; content_item_id: string; order: number }>
      >(),
    deliveryChannel: deliveryChannelEnum("delivery_channel").notNull(),
    status: messageStatusEnum("status").default("queued").notNull(),
    deliveryError: text("delivery_error"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    accessTokenHash: text("access_token_hash").notNull(),
    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("messages_access_token_hash_idx").on(table.accessTokenHash),
    index("messages_tenant_recipient_idx").on(
      table.tenantId,
      table.recipientId
    ),
    index("messages_tenant_sender_idx").on(table.tenantId, table.senderId),
    index("messages_tenant_status_idx").on(table.tenantId, table.status),
    index("messages_bulk_send_id_idx").on(table.bulkSendId),
  ]
);

// ── Message Events ─────────────────────────────────────────────────────────

export const messageEvents = pgTable(
  "message_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .references(() => organizations.id)
      .notNull(),
    messageId: uuid("message_id")
      .references(() => messages.id)
      .notNull(),
    eventType: eventTypeEnum("event_type").notNull(),
    contentItemId: uuid("content_item_id"),
    payload: jsonb("payload").default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("message_events_message_type_idx").on(
      table.messageId,
      table.eventType
    ),
    index("message_events_tenant_id_idx").on(table.tenantId),
  ]
);

// ── Bulk Sends ─────────────────────────────────────────────────────────────

export const bulkSends = pgTable(
  "bulk_sends",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .references(() => organizations.id)
      .notNull(),
    createdBy: uuid("created_by")
      .references(() => users.id)
      .notNull(),
    name: text("name").notNull(),
    contentBlocks: jsonb("content_blocks")
      .notNull()
      .$type<
        Array<{ type: "content_item"; content_item_id: string; order: number }>
      >(),
    deliveryChannel: deliveryChannelEnum("delivery_channel").notNull(),
    totalRecipients: integer("total_recipients").notNull(),
    status: bulkSendStatusEnum("status").default("pending").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("bulk_sends_tenant_id_idx").on(table.tenantId)]
);

// ── Folders ────────────────────────────────────────────────────────────────

export const folders = pgTable(
  "folders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .references(() => organizations.id)
      .notNull(),
    ownerId: uuid("owner_id")
      .references(() => users.id)
      .notNull(),
    name: text("name").notNull(),
    type: folderTypeEnum("type").notNull(),
    isPublished: boolean("is_published").default(false).notNull(),
    publishedBy: uuid("published_by"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    sortOrder: integer("sort_order").default(0).notNull(),
    parentFolderId: uuid("parent_folder_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("folders_tenant_id_idx").on(table.tenantId),
    index("folders_owner_type_idx").on(
      table.tenantId,
      table.ownerId,
      table.type
    ),
  ]
);

// ── Folder Shares ─────────────────────────────────────────────────────────

export const folderShares = pgTable(
  "folder_shares",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .references(() => organizations.id)
      .notNull(),
    folderId: uuid("folder_id")
      .references(() => folders.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    sharedBy: uuid("shared_by")
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("folder_shares_folder_user_idx").on(
      table.folderId,
      table.userId
    ),
    index("folder_shares_user_id_idx").on(table.userId),
    index("folder_shares_tenant_id_idx").on(table.tenantId),
  ]
);

// ── Folder Items ───────────────────────────────────────────────────────────

export const folderItems = pgTable(
  "folder_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .references(() => organizations.id)
      .notNull(),
    folderId: uuid("folder_id")
      .references(() => folders.id)
      .notNull(),
    contentItemId: uuid("content_item_id")
      .references(() => contentItems.id)
      .notNull(),
    addedBy: uuid("added_by")
      .references(() => users.id)
      .notNull(),
    order: integer("order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("folder_items_folder_content_idx").on(
      table.folderId,
      table.contentItemId
    ),
    index("folder_items_tenant_id_idx").on(table.tenantId),
  ]
);

// ── Audit Logs ─────────────────────────────────────────────────────────────

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").references(() => organizations.id),
    userId: uuid("user_id").references(() => users.id),
    action: text("action").notNull(), // e.g., "user.invite", "message.send", "admin.branding.update"
    resourceType: text("resource_type"), // e.g., "user", "message", "organization"
    resourceId: text("resource_id"), // ID of the affected resource
    details: jsonb("details").default({}),
    ipAddress: text("ip_address"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("audit_logs_tenant_id_idx").on(table.tenantId),
    index("audit_logs_user_id_idx").on(table.userId),
    index("audit_logs_action_idx").on(table.action),
    index("audit_logs_occurred_at_idx").on(table.occurredAt),
  ]
);

// ── Login Attempts (database-backed rate limiting) ────────────────────────

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ipAddress: text("ip_address").notNull(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("login_attempts_ip_attempted_idx").on(
      table.ipAddress,
      table.attemptedAt
    ),
  ]
);

// ── MFA Codes ─────────────────────────────────────────────────────────────

export const mfaCodes = pgTable(
  "mfa_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    tenantId: uuid("tenant_id")
      .references(() => organizations.id)
      .notNull(),
    codeHash: text("code_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("mfa_codes_user_id_idx").on(table.userId),
    index("mfa_codes_user_expires_idx").on(table.userId, table.expiresAt),
  ]
);
