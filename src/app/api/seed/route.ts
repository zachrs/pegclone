import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/drizzle/schema";
import crypto from "crypto";
import bcrypt from "bcryptjs";

function uuid() {
  return crypto.randomUUID();
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function GET() {
  try {
    // ── Organizations ─────────────────────────────────────────────────────
    const acmeId = uuid();
    const metroId = uuid();

    await db.insert(schema.organizations).values([
      {
        id: acmeId,
        name: "Acme Women's Health",
        slug: "acme-womens",
        primaryColor: "#7c3aed",
        secondaryColor: "#059669",
        settings: {
          reminders: { enabled: true, default_max: 3, default_interval_hours: 24 },
          message_templates: {
            sms: "[Organization Name] has sent you a message: [link]",
            email_subject: "[Organization Name] has sent you a message",
            email_body: "[Organization Name] has sent you a message. Click the link below to view it: [link]",
          },
        },
      },
      {
        id: metroId,
        name: "Metro Family Practice",
        slug: "metro-family",
        primaryColor: "#059669",
      },
    ]);

    // ── Users ─────────────────────────────────────────────────────────────
    const devPasswordHash = await bcrypt.hash("password123", 10);

    const superAdminId = uuid();
    const providerSarahId = uuid();
    const adminJaneId = uuid();
    const providerJamesId = uuid();
    const orgUserMariaId = uuid();

    await db.insert(schema.users).values([
      {
        id: superAdminId,
        tenantId: acmeId,
        passwordHash: devPasswordHash,
        email: "superadmin@peg.test",
        fullName: "Super Admin",
        role: "super_admin",
        isAdmin: true,
        isActive: true,
        activatedAt: new Date("2025-06-01"),
      },
      {
        id: providerSarahId,
        tenantId: acmeId,
        passwordHash: devPasswordHash,
        email: "provider@acme.test",
        fullName: "Dr. Sarah Chen",
        role: "provider",
        isAdmin: true,
        title: "OB/GYN, MD",
        isActive: true,
        activatedAt: new Date("2025-06-15"),
      },
      {
        id: adminJaneId,
        tenantId: acmeId,
        passwordHash: devPasswordHash,
        email: "admin@acme.test",
        fullName: "Jane Smith",
        role: "org_user",
        isAdmin: true,
        title: "Office Manager",
        isActive: true,
        activatedAt: new Date("2025-06-20"),
      },
      {
        id: providerJamesId,
        tenantId: acmeId,
        passwordHash: devPasswordHash,
        email: "james.lee@acme.test",
        fullName: "Dr. James Lee",
        role: "provider",
        isAdmin: false,
        title: "Family Medicine, DO",
        isActive: true,
        activatedAt: new Date("2025-07-01"),
      },
      {
        id: orgUserMariaId,
        tenantId: acmeId,
        passwordHash: devPasswordHash,
        email: "maria.johnson@acme.test",
        fullName: "Maria Johnson",
        role: "org_user",
        isAdmin: false,
        title: "Medical Assistant",
        isActive: true,
        activatedAt: new Date("2025-08-10"),
      },
    ]);

    // ── Content Items ─────────────────────────────────────────────────────
    const contentIds: string[] = [];
    const contentData = [
      { title: "Achilles Tendonitis", type: "link" as const, source: "org_upload" as const, url: "https://example.com/achilles" },
      { title: "Missed Birth Control", type: "link" as const, source: "org_upload" as const, url: "https://example.com/birth-control" },
      { title: "Post-Op Knee Exercises", type: "pdf" as const, source: "org_upload" as const, storagePath: "/uploads/knee-exercises.pdf" },
      { title: "Understanding Type 2 Diabetes", type: "link" as const, source: "system_library" as const, url: "https://peg.library/diabetes-type2" },
      { title: "Heart-Healthy Eating", type: "link" as const, source: "system_library" as const, url: "https://peg.library/heart-healthy" },
      { title: "Asthma Overview", type: "link" as const, source: "system_library" as const, url: "https://peg.library/asthma" },
      { title: "Childhood Immunization Schedule", type: "pdf" as const, source: "system_library" as const, url: "https://peg.library/immunizations" },
      { title: "Prenatal Care Basics", type: "link" as const, source: "system_library" as const, url: "https://peg.library/prenatal" },
    ];

    for (const item of contentData) {
      const id = uuid();
      contentIds.push(id);
      await db.insert(schema.contentItems).values({
        id,
        tenantId: item.source === "org_upload" ? acmeId : null,
        source: item.source,
        title: item.title,
        type: item.type,
        url: item.url,
        storagePath: item.storagePath,
      });
    }

    // ── Folders ───────────────────────────────────────────────────────────
    const favoritesId = uuid();
    const myUploadsId = uuid();
    const teamMaterialsId = uuid();
    const speechTherapyId = uuid();

    await db.insert(schema.folders).values([
      { id: favoritesId, tenantId: acmeId, ownerId: providerSarahId, name: "Favorites", type: "favorites" },
      { id: myUploadsId, tenantId: acmeId, ownerId: providerSarahId, name: "My Uploads", type: "personal" },
      { id: teamMaterialsId, tenantId: acmeId, ownerId: adminJaneId, name: "Team Materials", type: "team", isPublished: true, publishedBy: adminJaneId, publishedAt: new Date("2025-07-01") },
      { id: speechTherapyId, tenantId: acmeId, ownerId: providerSarahId, name: "Speech Therapy", type: "personal" },
    ]);

    await db.insert(schema.folderItems).values([
      { tenantId: acmeId, folderId: myUploadsId, contentItemId: contentIds[0]!, addedBy: providerSarahId, order: 0 },
      { tenantId: acmeId, folderId: myUploadsId, contentItemId: contentIds[2]!, addedBy: providerSarahId, order: 1 },
      { tenantId: acmeId, folderId: teamMaterialsId, contentItemId: contentIds[1]!, addedBy: adminJaneId, order: 0 },
      { tenantId: acmeId, folderId: favoritesId, contentItemId: contentIds[2]!, addedBy: providerSarahId, order: 0 },
    ]);

    // ── Recipients ────────────────────────────────────────────────────────
    const recipientIds: string[] = [];
    const recipientData = [
      { firstName: "", lastName: "", contact: "maria.garcia@email.com", contactType: "email" as const },
      { firstName: "", lastName: "", contact: "+15551234567", contactType: "phone" as const },
      { firstName: "", lastName: "", contact: "sarah.chen.patient@email.com", contactType: "email" as const },
      { firstName: "", lastName: "", contact: "+15559876543", contactType: "phone" as const },
      { firstName: "", lastName: "", contact: "john.doe@email.com", contactType: "email" as const },
      { firstName: "", lastName: "", contact: "+15554567890", contactType: "phone" as const },
      { firstName: "", lastName: "", contact: "pat.williams@email.com", contactType: "email" as const },
      { firstName: "", lastName: "", contact: "lisa.m@email.com", contactType: "email" as const },
    ];

    for (const r of recipientData) {
      const id = uuid();
      recipientIds.push(id);
      await db.insert(schema.recipients).values({
        id,
        tenantId: acmeId,
        firstName: r.firstName,
        lastName: r.lastName,
        contact: r.contact,
        contactType: r.contactType,
      });
    }

    // ── Messages ──────────────────────────────────────────────────────────
    const messageData = [
      { recipientIdx: 0, contentIdx: 0, channel: "email" as const, status: "delivered" as const, sentAt: "2025-12-01T10:30:00Z", openedAt: "2025-12-01T14:22:00Z" },
      { recipientIdx: 1, contentIdx: 3, channel: "sms" as const, status: "delivered" as const, sentAt: "2025-11-28T09:15:00Z", openedAt: null },
      { recipientIdx: 2, contentIdx: 2, channel: "email" as const, status: "delivered" as const, sentAt: "2025-12-05T14:00:00Z", openedAt: "2025-12-05T16:45:00Z" },
      { recipientIdx: 0, contentIdx: 5, channel: "email" as const, status: "delivered" as const, sentAt: "2025-12-08T11:20:00Z", openedAt: null },
      { recipientIdx: 3, contentIdx: 6, channel: "sms" as const, status: "failed" as const, sentAt: "2025-12-12T15:30:00Z", openedAt: null },
      { recipientIdx: 4, contentIdx: 3, channel: "email" as const, status: "delivered" as const, sentAt: "2025-12-10T09:00:00Z", openedAt: "2025-12-10T11:30:00Z" },
      { recipientIdx: 5, contentIdx: 2, channel: "sms" as const, status: "delivered" as const, sentAt: "2025-12-11T14:30:00Z", openedAt: "2025-12-11T18:00:00Z" },
      { recipientIdx: 6, contentIdx: 5, channel: "email" as const, status: "delivered" as const, sentAt: "2025-12-14T10:00:00Z", openedAt: "2025-12-14T13:20:00Z" },
      { recipientIdx: 7, contentIdx: 0, channel: "email" as const, status: "delivered" as const, sentAt: "2025-12-16T11:00:00Z", openedAt: "2025-12-17T09:15:00Z" },
    ];

    for (const m of messageData) {
      const token = crypto.randomBytes(16).toString("hex");
      const sentAt = new Date(m.sentAt);
      const expiresAt = new Date(sentAt);
      expiresAt.setDate(expiresAt.getDate() + 30);

      await db.insert(schema.messages).values({
        tenantId: acmeId,
        senderId: providerSarahId,
        recipientId: recipientIds[m.recipientIdx]!,
        contentBlocks: [{ type: "content_item", content_item_id: contentIds[m.contentIdx]!, order: 1 }],
        deliveryChannel: m.channel,
        status: m.status,
        sentAt,
        deliveredAt: m.status === "delivered" ? new Date(new Date(m.sentAt).getTime() + 30000) : null,
        openedAt: m.openedAt ? new Date(m.openedAt) : null,
        accessTokenHash: hashToken(token),
        accessTokenExpiresAt: expiresAt,
      });
    }

    return NextResponse.json({ success: true, message: "Database seeded successfully!" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
