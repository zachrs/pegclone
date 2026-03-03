import type {
  organizations,
  users,
  recipients,
  contentItems,
  messages,
  messageEvents,
  bulkSends,
  folders,
  folderItems,
  mfaCodes,
} from "@/drizzle/schema";

// Inferred select types (what you get back from queries)
export type Organization = typeof organizations.$inferSelect;
export type User = typeof users.$inferSelect;
export type Recipient = typeof recipients.$inferSelect;
export type ContentItem = typeof contentItems.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type MessageEvent = typeof messageEvents.$inferSelect;
export type BulkSend = typeof bulkSends.$inferSelect;
export type Folder = typeof folders.$inferSelect;
export type FolderItem = typeof folderItems.$inferSelect;

// Inferred insert types (what you pass to inserts)
export type NewOrganization = typeof organizations.$inferInsert;
export type NewUser = typeof users.$inferInsert;
export type NewRecipient = typeof recipients.$inferInsert;
export type NewContentItem = typeof contentItems.$inferInsert;
export type NewMessage = typeof messages.$inferInsert;
export type NewMessageEvent = typeof messageEvents.$inferInsert;
export type NewBulkSend = typeof bulkSends.$inferInsert;
export type NewFolder = typeof folders.$inferInsert;
export type NewFolderItem = typeof folderItems.$inferInsert;
export type MfaCode = typeof mfaCodes.$inferSelect;
export type NewMfaCode = typeof mfaCodes.$inferInsert;

// User roles
export type UserRole = "super_admin" | "cs_rep" | "org_user" | "provider";

// Delivery channels
export type DeliveryChannel = "sms" | "email" | "qr_code" | "sms_and_email";

// Message statuses
export type MessageStatus =
  | "draft"
  | "queued"
  | "sent"
  | "delivered"
  | "failed";
