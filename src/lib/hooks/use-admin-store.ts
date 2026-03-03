"use client";

import { create } from "zustand";
import type { UserRole } from "@/lib/db/types";

// ── Org User ──────────────────────────────────────────────────────────────

export interface OrgUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isAdmin: boolean;
  isActive: boolean;
  title: string | null;
  photoUrl: string | null;
  activatedAt: string | null;
  deactivatedAt: string | null;
  createdAt: string;
}

// ── Org Settings ──────────────────────────────────────────────────────────

export interface OrgBranding {
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
}

export interface ReminderSettings {
  enabled: boolean;
  defaultMax: number;
  defaultIntervalHours: number;
}

export interface MessageTemplates {
  sms: string;
  emailSubject: string;
  emailBody: string;
}

export interface DeliverySettings {
  linkExpirationDays: number;
  optOutFooter: boolean;
}

// ── Store ─────────────────────────────────────────────────────────────────

interface AdminState {
  // Users
  users: OrgUser[];
  addUser: (params: { fullName: string; email: string; role: UserRole; isAdmin: boolean; title?: string }) => void;
  updateUser: (id: string, updates: Partial<Pick<OrgUser, "role" | "isAdmin" | "title">>) => void;
  deactivateUser: (id: string) => void;
  reactivateUser: (id: string) => void;

  // Branding
  branding: OrgBranding;
  updateBranding: (updates: Partial<OrgBranding>) => void;

  // Reminders
  reminders: ReminderSettings;
  updateReminders: (updates: Partial<ReminderSettings>) => void;

  // Message templates
  messageTemplates: MessageTemplates;
  updateMessageTemplates: (updates: Partial<MessageTemplates>) => void;

  // Delivery settings
  deliverySettings: DeliverySettings;
  updateDeliverySettings: (updates: Partial<DeliverySettings>) => void;

  // Team folders
  publishFolder: (folderId: string) => void;
  unpublishFolder: (folderId: string) => void;
  publishedFolderIds: Set<string>;
}

const MOCK_USERS: OrgUser[] = [
  {
    id: "user-001",
    fullName: "Dr. Sarah Mitchell",
    email: "sarah.mitchell@acmewomens.com",
    role: "provider",
    isAdmin: true,
    isActive: true,
    title: "OB/GYN, MD",
    photoUrl: null,
    activatedAt: "2025-06-15T10:00:00Z",
    deactivatedAt: null,
    createdAt: "2025-06-15T10:00:00Z",
  },
  {
    id: "user-002",
    fullName: "Dr. James Lee",
    email: "james.lee@acmewomens.com",
    role: "provider",
    isAdmin: false,
    isActive: true,
    title: "Family Medicine, DO",
    photoUrl: null,
    activatedAt: "2025-07-01T09:00:00Z",
    deactivatedAt: null,
    createdAt: "2025-07-01T09:00:00Z",
  },
  {
    id: "user-003",
    fullName: "Maria Johnson",
    email: "maria.johnson@acmewomens.com",
    role: "org_user",
    isAdmin: false,
    isActive: true,
    title: "Medical Assistant",
    photoUrl: null,
    activatedAt: "2025-08-10T14:00:00Z",
    deactivatedAt: null,
    createdAt: "2025-08-10T14:00:00Z",
  },
  {
    id: "user-004",
    fullName: "Rebecca Torres",
    email: "rebecca.torres@acmewomens.com",
    role: "org_user",
    isAdmin: true,
    isActive: true,
    title: "Office Manager",
    photoUrl: null,
    activatedAt: "2025-06-20T11:00:00Z",
    deactivatedAt: null,
    createdAt: "2025-06-20T11:00:00Z",
  },
  {
    id: "user-005",
    fullName: "Tom Bradley",
    email: "tom.bradley@acmewomens.com",
    role: "cs_rep",
    isAdmin: false,
    isActive: false,
    title: null,
    photoUrl: null,
    activatedAt: "2025-07-15T08:00:00Z",
    deactivatedAt: "2025-11-01T17:00:00Z",
    createdAt: "2025-07-15T08:00:00Z",
  },
];

let nextUserId = 100;

export const useAdminStore = create<AdminState>((set) => ({
  // ── Users ─────────────────────────────────────────────────────────────
  users: MOCK_USERS,

  addUser: (params) =>
    set((state) => ({
      users: [
        ...state.users,
        {
          id: `user-${nextUserId++}`,
          fullName: params.fullName,
          email: params.email,
          role: params.role,
          isAdmin: params.isAdmin,
          isActive: true,
          title: params.title ?? null,
          photoUrl: null,
          activatedAt: new Date().toISOString(),
          deactivatedAt: null,
          createdAt: new Date().toISOString(),
        },
      ],
    })),

  updateUser: (id, updates) =>
    set((state) => ({
      users: state.users.map((u) => (u.id === id ? { ...u, ...updates } : u)),
    })),

  deactivateUser: (id) =>
    set((state) => ({
      users: state.users.map((u) =>
        u.id === id
          ? { ...u, isActive: false, deactivatedAt: new Date().toISOString() }
          : u
      ),
    })),

  reactivateUser: (id) =>
    set((state) => ({
      users: state.users.map((u) =>
        u.id === id
          ? { ...u, isActive: true, deactivatedAt: null, activatedAt: new Date().toISOString() }
          : u
      ),
    })),

  // ── Branding ──────────────────────────────────────────────────────────
  branding: {
    name: "Acme Women's Health",
    logoUrl: null,
    primaryColor: "#7c3aed",
    secondaryColor: null,
    phone: "(555) 123-4567",
    address: "123 Health Ave, Suite 200, Anytown, US 12345",
    website: "https://acmewomenshealth.example.com",
  },

  updateBranding: (updates) =>
    set((state) => ({
      branding: { ...state.branding, ...updates },
    })),

  // ── Reminders ─────────────────────────────────────────────────────────
  reminders: {
    enabled: true,
    defaultMax: 3,
    defaultIntervalHours: 24,
  },

  updateReminders: (updates) =>
    set((state) => ({
      reminders: { ...state.reminders, ...updates },
    })),

  // ── Message Templates ─────────────────────────────────────────────────
  messageTemplates: {
    sms: "[Organization Name] has sent you a message: [link]",
    emailSubject: "[Organization Name] has sent you a message",
    emailBody:
      "[Organization Name] has sent you a message. Click the link below to view it: [link]",
  },

  updateMessageTemplates: (updates) =>
    set((state) => ({
      messageTemplates: { ...state.messageTemplates, ...updates },
    })),

  // ── Delivery Settings ─────────────────────────────────────────────────
  deliverySettings: {
    linkExpirationDays: 30,
    optOutFooter: true,
  },

  updateDeliverySettings: (updates) =>
    set((state) => ({
      deliverySettings: { ...state.deliverySettings, ...updates },
    })),

  // ── Team Folders ──────────────────────────────────────────────────────
  publishedFolderIds: new Set<string>(["team-materials", "fpm-info", "fpm-pelvic", "fpm-habits", "gyn-onc"]),

  publishFolder: (folderId) =>
    set((state) => ({
      publishedFolderIds: new Set(state.publishedFolderIds).add(folderId),
    })),

  unpublishFolder: (folderId) =>
    set((state) => {
      const next = new Set(state.publishedFolderIds);
      next.delete(folderId);
      return { publishedFolderIds: next };
    }),
}));
