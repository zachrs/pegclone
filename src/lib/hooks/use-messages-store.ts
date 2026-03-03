"use client";

import { create } from "zustand";

export type DeliveryChannel = "sms" | "email" | "qr_code" | "sms_and_email";
export type MessageStatus = "queued" | "sent" | "delivered" | "failed";

export interface ContentBlock {
  type: "content_item";
  contentItemId: string;
  title: string;
  order: number;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  recipientContact: string;
  bulkSendId: string | null;
  contentBlocks: ContentBlock[];
  deliveryChannel: DeliveryChannel;
  status: MessageStatus;
  accessToken: string;
  sentAt: string;
  deliveredAt: string | null;
  openedAt: string | null;
  createdAt: string;
}

export interface BulkSend {
  id: string;
  name: string;
  contentBlocks: ContentBlock[];
  deliveryChannel: DeliveryChannel;
  totalRecipients: number;
  status: "pending" | "sending" | "completed" | "failed";
  sentAt: string | null;
  createdAt: string;
}

interface MessagesState {
  messages: Message[];
  bulkSends: BulkSend[];

  sendMessage: (params: {
    recipientId: string;
    recipientName: string;
    recipientContact: string;
    contentBlocks: ContentBlock[];
    deliveryChannel: DeliveryChannel;
  }) => Message;

  sendBulk: (params: {
    name: string;
    recipients: Array<{
      id: string;
      name: string;
      contact: string;
    }>;
    contentBlocks: ContentBlock[];
    deliveryChannel: DeliveryChannel;
  }) => BulkSend;

  getMessagesForRecipient: (recipientId: string) => Message[];
}

function generateToken(): string {
  return "xxxx-xxxx-xxxx".replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
}

// Mock messages for demo
const MOCK_MESSAGES: Message[] = [
  {
    id: "msg-001",
    senderId: "user-001",
    senderName: "Dr. Smith",
    recipientId: "recip-001",
    recipientName: "Maria Garcia",
    recipientContact: "maria.garcia@email.com",
    bulkSendId: null,
    contentBlocks: [
      { type: "content_item", contentItemId: "org-001", title: "Achilles Tendonitis", order: 1 },
    ],
    deliveryChannel: "email",
    status: "delivered",
    accessToken: "a1b2-c3d4-e5f6",
    sentAt: "2025-12-01T10:30:00Z",
    deliveredAt: "2025-12-01T10:31:00Z",
    openedAt: "2025-12-01T14:22:00Z",
    createdAt: "2025-12-01T10:30:00Z",
  },
  {
    id: "msg-002",
    senderId: "user-001",
    senderName: "Dr. Smith",
    recipientId: "recip-002",
    recipientName: "James Wilson",
    recipientContact: "+15551234567",
    bulkSendId: null,
    contentBlocks: [
      { type: "content_item", contentItemId: "sys-001", title: "Understanding Type 2 Diabetes", order: 1 },
      { type: "content_item", contentItemId: "sys-005", title: "Heart-Healthy Eating", order: 2 },
    ],
    deliveryChannel: "sms",
    status: "delivered",
    accessToken: "g7h8-i9j0-k1l2",
    sentAt: "2025-11-28T09:15:00Z",
    deliveredAt: "2025-11-28T09:15:30Z",
    openedAt: null,
    createdAt: "2025-11-28T09:15:00Z",
  },
  {
    id: "msg-003",
    senderId: "user-001",
    senderName: "Dr. Smith",
    recipientId: "recip-003",
    recipientName: "Sarah Chen",
    recipientContact: "sarah.chen@email.com",
    bulkSendId: null,
    contentBlocks: [
      { type: "content_item", contentItemId: "org-006", title: "Post-Op Knee Exercises", order: 1 },
    ],
    deliveryChannel: "email",
    status: "delivered",
    accessToken: "m3n4-o5p6-q7r8",
    sentAt: "2025-12-05T14:00:00Z",
    deliveredAt: "2025-12-05T14:01:00Z",
    openedAt: "2025-12-05T16:45:00Z",
    createdAt: "2025-12-05T14:00:00Z",
  },
  {
    id: "msg-004",
    senderId: "user-001",
    senderName: "Dr. Smith",
    recipientId: "recip-005",
    recipientName: "Emily Davis",
    recipientContact: "emily.davis@email.com",
    bulkSendId: null,
    contentBlocks: [
      { type: "content_item", contentItemId: "sys-003", title: "Asthma Overview", order: 1 },
    ],
    deliveryChannel: "email",
    status: "sent",
    accessToken: "s9t0-u1v2-w3x4",
    sentAt: "2025-12-08T11:20:00Z",
    deliveredAt: null,
    openedAt: null,
    createdAt: "2025-12-08T11:20:00Z",
  },
  {
    id: "msg-005",
    senderId: "user-001",
    senderName: "Dr. Smith",
    recipientId: "recip-007",
    recipientName: "Lisa Martinez",
    recipientContact: "lisa.martinez@email.com",
    bulkSendId: null,
    contentBlocks: [
      { type: "content_item", contentItemId: "sys-007", title: "Childhood Immunization Schedule", order: 1 },
      { type: "content_item", contentItemId: "sys-008", title: "Newborn Care Basics", order: 2 },
    ],
    deliveryChannel: "sms_and_email",
    status: "delivered",
    accessToken: "y5z6-a7b8-c9d0",
    sentAt: "2025-12-10T08:45:00Z",
    deliveredAt: "2025-12-10T08:46:00Z",
    openedAt: "2025-12-10T12:30:00Z",
    createdAt: "2025-12-10T08:45:00Z",
  },
  {
    id: "msg-006",
    senderId: "user-001",
    senderName: "Dr. Smith",
    recipientId: "recip-008",
    recipientName: "David Lee",
    recipientContact: "+15553456789",
    bulkSendId: null,
    contentBlocks: [
      { type: "content_item", contentItemId: "sys-010", title: "Managing High Blood Pressure", order: 1 },
    ],
    deliveryChannel: "sms",
    status: "failed",
    accessToken: "e1f2-g3h4-i5j6",
    sentAt: "2025-12-12T15:30:00Z",
    deliveredAt: null,
    openedAt: null,
    createdAt: "2025-12-12T15:30:00Z",
  },
];

let nextMsgId = 100;
let nextBulkId = 100;

export const useMessagesStore = create<MessagesState>((set, get) => ({
  messages: MOCK_MESSAGES,
  bulkSends: [],

  sendMessage: (params) => {
    const now = new Date().toISOString();
    const message: Message = {
      id: `msg-${nextMsgId++}`,
      senderId: "user-001",
      senderName: "Dr. Smith",
      recipientId: params.recipientId,
      recipientName: params.recipientName,
      recipientContact: params.recipientContact,
      bulkSendId: null,
      contentBlocks: params.contentBlocks,
      deliveryChannel: params.deliveryChannel,
      status: "queued",
      accessToken: generateToken(),
      sentAt: now,
      deliveredAt: null,
      openedAt: null,
      createdAt: now,
    };
    set((state) => ({ messages: [message, ...state.messages] }));

    // Simulate delivery after a short delay
    setTimeout(() => {
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === message.id ? { ...m, status: "delivered" as MessageStatus, deliveredAt: new Date().toISOString() } : m
        ),
      }));
    }, 2000);

    return message;
  },

  sendBulk: (params) => {
    const now = new Date().toISOString();
    const bulkSend: BulkSend = {
      id: `bulk-${nextBulkId++}`,
      name: params.name,
      contentBlocks: params.contentBlocks,
      deliveryChannel: params.deliveryChannel,
      totalRecipients: params.recipients.length,
      status: "sending",
      sentAt: now,
      createdAt: now,
    };

    // Create individual messages for each recipient
    const newMessages: Message[] = params.recipients.map((r, i) => ({
      id: `msg-${nextMsgId++}`,
      senderId: "user-001",
      senderName: "Dr. Smith",
      recipientId: r.id,
      recipientName: r.name,
      recipientContact: r.contact,
      bulkSendId: bulkSend.id,
      contentBlocks: params.contentBlocks,
      deliveryChannel: params.deliveryChannel,
      status: "queued" as MessageStatus,
      accessToken: generateToken(),
      sentAt: now,
      deliveredAt: null,
      openedAt: null,
      createdAt: now,
    }));

    set((state) => ({
      messages: [...newMessages, ...state.messages],
      bulkSends: [bulkSend, ...state.bulkSends],
    }));

    // Simulate delivery
    setTimeout(() => {
      set((state) => ({
        messages: state.messages.map((m) =>
          m.bulkSendId === bulkSend.id
            ? { ...m, status: "delivered" as MessageStatus, deliveredAt: new Date().toISOString() }
            : m
        ),
        bulkSends: state.bulkSends.map((b) =>
          b.id === bulkSend.id ? { ...b, status: "completed" as const } : b
        ),
      }));
    }, 3000);

    return bulkSend;
  },

  getMessagesForRecipient: (recipientId) => {
    return get().messages.filter((m) => m.recipientId === recipientId);
  },
}));
