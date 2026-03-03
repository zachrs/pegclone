"use client";

import { create } from "zustand";

export interface Recipient {
  id: string;
  firstName: string;
  lastName: string;
  contact: string;
  contactType: "email" | "phone";
  optedOut: boolean;
  optedOutAt: string | null;
  createdAt: string;
  lastMessagedAt: string | null;
}

interface RecipientsState {
  recipients: Recipient[];
  searchQuery: string;

  setSearchQuery: (query: string) => void;
  addRecipient: (recipient: Omit<Recipient, "id" | "createdAt" | "optedOut" | "optedOutAt" | "lastMessagedAt">) => void;
  updateRecipient: (id: string, updates: Partial<Recipient>) => void;
  toggleOptOut: (id: string) => void;
  getOrCreateRecipient: (firstName: string, lastName: string, contact: string, contactType: "email" | "phone") => Recipient;
  updateLastMessaged: (id: string) => void;
}

const MOCK_RECIPIENTS: Recipient[] = [
  {
    id: "recip-001",
    firstName: "Maria",
    lastName: "Garcia",
    contact: "maria.garcia@email.com",
    contactType: "email",
    optedOut: false,
    optedOutAt: null,
    createdAt: "2025-06-15",
    lastMessagedAt: "2025-12-01",
  },
  {
    id: "recip-002",
    firstName: "James",
    lastName: "Wilson",
    contact: "+15551234567",
    contactType: "phone",
    optedOut: false,
    optedOutAt: null,
    createdAt: "2025-07-20",
    lastMessagedAt: "2025-11-28",
  },
  {
    id: "recip-003",
    firstName: "Sarah",
    lastName: "Chen",
    contact: "sarah.chen@email.com",
    contactType: "email",
    optedOut: false,
    optedOutAt: null,
    createdAt: "2025-08-10",
    lastMessagedAt: "2025-12-05",
  },
  {
    id: "recip-004",
    firstName: "Robert",
    lastName: "Johnson",
    contact: "+15559876543",
    contactType: "phone",
    optedOut: true,
    optedOutAt: "2025-10-15",
    createdAt: "2025-05-22",
    lastMessagedAt: "2025-10-10",
  },
  {
    id: "recip-005",
    firstName: "Emily",
    lastName: "Davis",
    contact: "emily.davis@email.com",
    contactType: "email",
    optedOut: false,
    optedOutAt: null,
    createdAt: "2025-09-01",
    lastMessagedAt: "2025-12-08",
  },
  {
    id: "recip-006",
    firstName: "Michael",
    lastName: "Brown",
    contact: "+15552345678",
    contactType: "phone",
    optedOut: false,
    optedOutAt: null,
    createdAt: "2025-10-05",
    lastMessagedAt: null,
  },
  {
    id: "recip-007",
    firstName: "Lisa",
    lastName: "Martinez",
    contact: "lisa.martinez@email.com",
    contactType: "email",
    optedOut: false,
    optedOutAt: null,
    createdAt: "2025-11-12",
    lastMessagedAt: "2025-12-10",
  },
  {
    id: "recip-008",
    firstName: "David",
    lastName: "Lee",
    contact: "+15553456789",
    contactType: "phone",
    optedOut: false,
    optedOutAt: null,
    createdAt: "2025-11-20",
    lastMessagedAt: "2025-12-12",
  },
];

let nextId = 100;

export const useRecipientsStore = create<RecipientsState>((set, get) => ({
  recipients: MOCK_RECIPIENTS,
  searchQuery: "",

  setSearchQuery: (query) => set({ searchQuery: query }),

  addRecipient: (data) =>
    set((state) => ({
      recipients: [
        ...state.recipients,
        {
          ...data,
          id: `recip-${nextId++}`,
          optedOut: false,
          optedOutAt: null,
          createdAt: new Date().toISOString().slice(0, 10),
          lastMessagedAt: null,
        },
      ],
    })),

  updateRecipient: (id, updates) =>
    set((state) => ({
      recipients: state.recipients.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    })),

  toggleOptOut: (id) =>
    set((state) => ({
      recipients: state.recipients.map((r) =>
        r.id === id
          ? {
              ...r,
              optedOut: !r.optedOut,
              optedOutAt: r.optedOut
                ? null
                : new Date().toISOString().slice(0, 10),
            }
          : r
      ),
    })),

  getOrCreateRecipient: (firstName, lastName, contact, contactType) => {
    const state = get();
    const existing = state.recipients.find(
      (r) => r.contact === contact
    );
    if (existing) {
      // Update name if different
      if (existing.firstName !== firstName || existing.lastName !== lastName) {
        get().updateRecipient(existing.id, { firstName, lastName });
      }
      return existing;
    }
    const newRecipient: Recipient = {
      id: `recip-${nextId++}`,
      firstName,
      lastName,
      contact,
      contactType,
      optedOut: false,
      optedOutAt: null,
      createdAt: new Date().toISOString().slice(0, 10),
      lastMessagedAt: null,
    };
    set((state) => ({ recipients: [...state.recipients, newRecipient] }));
    return newRecipient;
  },

  updateLastMessaged: (id) =>
    set((state) => ({
      recipients: state.recipients.map((r) =>
        r.id === id
          ? { ...r, lastMessagedAt: new Date().toISOString().slice(0, 10) }
          : r
      ),
    })),
}));
