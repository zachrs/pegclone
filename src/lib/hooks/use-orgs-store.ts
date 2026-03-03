"use client";

import { create } from "zustand";

export interface SuperAdminOrg {
  id: string;
  name: string;
  slug: string;
  primaryColor: string;
  userCount: number;
  messageCount: number;
  smsSendCountMonth: number;
  smsThrottled: boolean;
  smsThrottleOverriddenBy: string | null;
  smsThrottleOverriddenAt: string | null;
  createdAt: string;
  isActive: boolean;
}

interface OrgsState {
  orgs: SuperAdminOrg[];
  createOrg: (params: { name: string; slug: string; primaryColor: string }) => void;
  overrideSmsThrottle: (orgId: string) => void;
}

const MOCK_ORGS: SuperAdminOrg[] = [
  {
    id: "org-001",
    name: "Acme Women's Health",
    slug: "acme-womens",
    primaryColor: "#7c3aed",
    userCount: 5,
    messageCount: 142,
    smsSendCountMonth: 3_240,
    smsThrottled: false,
    smsThrottleOverriddenBy: null,
    smsThrottleOverriddenAt: null,
    createdAt: "2025-06-01T10:00:00Z",
    isActive: true,
  },
  {
    id: "org-002",
    name: "Metro Family Practice",
    slug: "metro-family",
    primaryColor: "#059669",
    userCount: 12,
    messageCount: 1_830,
    smsSendCountMonth: 19_800,
    smsThrottled: false,
    smsThrottleOverriddenBy: null,
    smsThrottleOverriddenAt: null,
    createdAt: "2025-04-15T08:00:00Z",
    isActive: true,
  },
  {
    id: "org-003",
    name: "Sunrise Pediatrics",
    slug: "sunrise-peds",
    primaryColor: "#d97706",
    userCount: 3,
    messageCount: 567,
    smsSendCountMonth: 20_000,
    smsThrottled: true,
    smsThrottleOverriddenBy: null,
    smsThrottleOverriddenAt: null,
    createdAt: "2025-08-20T12:00:00Z",
    isActive: true,
  },
  {
    id: "org-004",
    name: "Valley Orthopedics",
    slug: "valley-ortho",
    primaryColor: "#2563eb",
    userCount: 8,
    messageCount: 945,
    smsSendCountMonth: 7_120,
    smsThrottled: false,
    smsThrottleOverriddenBy: null,
    smsThrottleOverriddenAt: null,
    createdAt: "2025-05-10T09:00:00Z",
    isActive: true,
  },
];

let nextOrgId = 100;

export const useOrgsStore = create<OrgsState>((set) => ({
  orgs: MOCK_ORGS,

  createOrg: (params) =>
    set((state) => ({
      orgs: [
        ...state.orgs,
        {
          id: `org-${nextOrgId++}`,
          name: params.name,
          slug: params.slug,
          primaryColor: params.primaryColor,
          userCount: 0,
          messageCount: 0,
          smsSendCountMonth: 0,
          smsThrottled: false,
          smsThrottleOverriddenBy: null,
          smsThrottleOverriddenAt: null,
          createdAt: new Date().toISOString(),
          isActive: true,
        },
      ],
    })),

  overrideSmsThrottle: (orgId) =>
    set((state) => ({
      orgs: state.orgs.map((o) =>
        o.id === orgId
          ? {
              ...o,
              smsThrottled: false,
              smsSendCountMonth: 0,
              smsThrottleOverriddenBy: "super-admin",
              smsThrottleOverriddenAt: new Date().toISOString(),
            }
          : o
      ),
    })),
}));
