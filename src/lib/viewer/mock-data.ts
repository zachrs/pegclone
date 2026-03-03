/** Mock data for the patient viewer — simulates what a DB lookup would return */

export interface ViewerMessage {
  id: string;
  accessToken: string;
  expired: boolean;
  org: {
    name: string;
    logoUrl: string | null;
    primaryColor: string;
    phone: string | null;
    website: string | null;
  };
  provider: {
    name: string;
    title: string | null;
    photoUrl: string | null;
  };
  contentItems: Array<{
    id: string;
    title: string;
    type: "pdf" | "link";
    url: string;
  }>;
  sentAt: string;
}

/** Hardcoded demo messages keyed by access token */
const MESSAGES: Record<string, ViewerMessage> = {
  "demo-token-1": {
    id: "msg-v001",
    accessToken: "demo-token-1",
    expired: false,
    org: {
      name: "Acme Women's Health",
      logoUrl: null,
      primaryColor: "#7c3aed",
      phone: "(555) 123-4567",
      website: "https://acmewomenshealth.example.com",
    },
    provider: {
      name: "Dr. Sarah Mitchell",
      title: "OB/GYN, MD",
      photoUrl: null,
    },
    contentItems: [
      {
        id: "ci-001",
        title: "Understanding Type 2 Diabetes",
        type: "link",
        url: "https://www.cdc.gov/diabetes/basics/type2.html",
      },
      {
        id: "ci-002",
        title: "Heart-Healthy Eating",
        type: "link",
        url: "https://www.heart.org/en/healthy-living/healthy-eating",
      },
      {
        id: "ci-003",
        title: "Post-Op Knee Exercises",
        type: "pdf",
        url: "/api/viewer/content/ci-003",
      },
    ],
    sentAt: "2025-12-10T08:45:00Z",
  },
  "demo-token-2": {
    id: "msg-v002",
    accessToken: "demo-token-2",
    expired: false,
    org: {
      name: "Metro Family Practice",
      logoUrl: null,
      primaryColor: "#059669",
      phone: "(555) 987-6543",
      website: null,
    },
    provider: {
      name: "Dr. James Lee",
      title: "Family Medicine, DO",
      photoUrl: null,
    },
    contentItems: [
      {
        id: "ci-004",
        title: "Childhood Immunization Schedule",
        type: "link",
        url: "https://www.aap.org/immunization",
      },
    ],
    sentAt: "2025-12-12T15:30:00Z",
  },
  "expired-token": {
    id: "msg-v003",
    accessToken: "expired-token",
    expired: true,
    org: {
      name: "Acme Women's Health",
      logoUrl: null,
      primaryColor: "#7c3aed",
      phone: "(555) 123-4567",
      website: null,
    },
    provider: {
      name: "Dr. Sarah Mitchell",
      title: "OB/GYN, MD",
      photoUrl: null,
    },
    contentItems: [],
    sentAt: "2025-06-01T10:00:00Z",
  },
};

export function lookupMessage(token: string): ViewerMessage | null {
  return MESSAGES[token] ?? null;
}
