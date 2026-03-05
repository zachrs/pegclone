import { relations } from "drizzle-orm";
import {
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
} from "./schema";

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  recipients: many(recipients),
  contentItems: many(contentItems),
  messages: many(messages),
  bulkSends: many(bulkSends),
  folders: many(folders),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.tenantId],
    references: [organizations.id],
  }),
  sentMessages: many(messages),
  folders: many(folders),
  bulkSends: many(bulkSends),
  mfaCodes: many(mfaCodes),
}));

export const recipientsRelations = relations(recipients, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [recipients.tenantId],
    references: [organizations.id],
  }),
  messages: many(messages),
}));

export const contentItemsRelations = relations(
  contentItems,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [contentItems.tenantId],
      references: [organizations.id],
    }),
    creator: one(users, {
      fields: [contentItems.createdBy],
      references: [users.id],
    }),
    folderItems: many(folderItems),
  })
);

export const messagesRelations = relations(messages, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [messages.tenantId],
    references: [organizations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  recipient: one(recipients, {
    fields: [messages.recipientId],
    references: [recipients.id],
  }),
  bulkSend: one(bulkSends, {
    fields: [messages.bulkSendId],
    references: [bulkSends.id],
  }),
  events: many(messageEvents),
}));

export const messageEventsRelations = relations(messageEvents, ({ one }) => ({
  organization: one(organizations, {
    fields: [messageEvents.tenantId],
    references: [organizations.id],
  }),
  message: one(messages, {
    fields: [messageEvents.messageId],
    references: [messages.id],
  }),
}));

export const bulkSendsRelations = relations(bulkSends, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [bulkSends.tenantId],
    references: [organizations.id],
  }),
  createdByUser: one(users, {
    fields: [bulkSends.createdBy],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const foldersRelations = relations(folders, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [folders.tenantId],
    references: [organizations.id],
  }),
  owner: one(users, {
    fields: [folders.ownerId],
    references: [users.id],
  }),
  items: many(folderItems),
}));

export const folderItemsRelations = relations(folderItems, ({ one }) => ({
  organization: one(organizations, {
    fields: [folderItems.tenantId],
    references: [organizations.id],
  }),
  folder: one(folders, {
    fields: [folderItems.folderId],
    references: [folders.id],
  }),
  contentItem: one(contentItems, {
    fields: [folderItems.contentItemId],
    references: [contentItems.id],
  }),
  addedByUser: one(users, {
    fields: [folderItems.addedBy],
    references: [users.id],
  }),
}));

export const mfaCodesRelations = relations(mfaCodes, ({ one }) => ({
  user: one(users, {
    fields: [mfaCodes.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [mfaCodes.tenantId],
    references: [organizations.id],
  }),
}));
