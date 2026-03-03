"use client";

import { create } from "zustand";

export type DeliveryChannel = "sms" | "email" | "qr_code";
export type MessageStatus = "queued" | "sent" | "delivered" | "failed";

export interface ContentBlock {
  type: "content_item";
  contentItemId: string;
  title: string;
  order: number;
}

export interface Message {
  id: string;
  recipientContact: string;
  deliveryChannel: DeliveryChannel;
  contentBlocks: ContentBlock[];
  status: MessageStatus;
  accessToken: string;
  sentAt: string;
  deliveredAt: string | null;
  openedAt: string | null;
}

interface MessagesState {
  messages: Message[];

  sendMessage: (params: {
    recipientContact: string;
    contentBlocks: ContentBlock[];
    deliveryChannel: DeliveryChannel;
  }) => Message;

  getMessagesForContact: (contact: string) => Message[];
}

function generateToken(): string {
  return "xxxx-xxxx-xxxx".replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
}

const MOCK_MESSAGES: Message[] = [
  {
    id: "msg-001",
    recipientContact: "maria.garcia@email.com",
    deliveryChannel: "email",
    contentBlocks: [
      { type: "content_item", contentItemId: "org-001", title: "Achilles Tendonitis", order: 1 },
    ],
    status: "delivered",
    accessToken: "a1b2-c3d4-e5f6",
    sentAt: "2025-12-01T10:30:00Z",
    deliveredAt: "2025-12-01T10:31:00Z",
    openedAt: "2025-12-01T14:22:00Z",
  },
  {
    id: "msg-002",
    recipientContact: "+15551234567",
    deliveryChannel: "sms",
    contentBlocks: [
      { type: "content_item", contentItemId: "sys-001", title: "Understanding Type 2 Diabetes", order: 1 },
      { type: "content_item", contentItemId: "sys-005", title: "Heart-Healthy Eating", order: 2 },
    ],
    status: "delivered",
    accessToken: "g7h8-i9j0-k1l2",
    sentAt: "2025-11-28T09:15:00Z",
    deliveredAt: "2025-11-28T09:15:30Z",
    openedAt: null,
  },
  {
    id: "msg-003",
    recipientContact: "sarah.chen@email.com",
    deliveryChannel: "email",
    contentBlocks: [
      { type: "content_item", contentItemId: "org-006", title: "Post-Op Knee Exercises", order: 1 },
    ],
    status: "delivered",
    accessToken: "m3n4-o5p6-q7r8",
    sentAt: "2025-12-05T14:00:00Z",
    deliveredAt: "2025-12-05T14:01:00Z",
    openedAt: "2025-12-05T16:45:00Z",
  },
  {
    id: "msg-004",
    recipientContact: "maria.garcia@email.com",
    deliveryChannel: "email",
    contentBlocks: [
      { type: "content_item", contentItemId: "sys-003", title: "Asthma Overview", order: 1 },
    ],
    status: "delivered",
    accessToken: "s9t0-u1v2-w3x4",
    sentAt: "2025-12-08T11:20:00Z",
    deliveredAt: "2025-12-08T11:21:00Z",
    openedAt: null,
  },
  {
    id: "msg-005",
    recipientContact: "+15559876543",
    deliveryChannel: "sms",
    contentBlocks: [
      { type: "content_item", contentItemId: "sys-007", title: "Childhood Immunization Schedule", order: 1 },
    ],
    status: "failed",
    accessToken: "e1f2-g3h4-i5j6",
    sentAt: "2025-12-12T15:30:00Z",
    deliveredAt: null,
    openedAt: null,
  },
];

let nextMsgId = 100;

export const useMessagesStore = create<MessagesState>((set, get) => ({
  messages: MOCK_MESSAGES,

  sendMessage: (params) => {
    const now = new Date().toISOString();
    const message: Message = {
      id: `msg-${nextMsgId++}`,
      recipientContact: params.recipientContact,
      deliveryChannel: params.deliveryChannel,
      contentBlocks: params.contentBlocks,
      status: "queued",
      accessToken: generateToken(),
      sentAt: now,
      deliveredAt: null,
      openedAt: null,
    };
    set((state) => ({ messages: [message, ...state.messages] }));

    // Simulate delivery after a short delay
    setTimeout(() => {
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === message.id
            ? { ...m, status: "delivered" as MessageStatus, deliveredAt: new Date().toISOString() }
            : m
        ),
      }));
    }, 2000);

    return message;
  },

  getMessagesForContact: (contact) => {
    return get().messages.filter((m) => m.recipientContact === contact);
  },
}));
