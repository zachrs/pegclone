"use server";

import { db } from "@/lib/db";
import {
  campaignTemplates,
  campaignEnrollments,
  campaignStepSends,
  recipients,
  messages,
  organizations,
  contentItems,
  type CampaignTemplateStep,
} from "@/drizzle/schema";
import { eq, and, desc, sql, isNull } from "drizzle-orm";
import { requireSession, requireCompletedMfa } from "./auth";
import { withTenant } from "@/lib/tenancy";
import { logAudit } from "@/lib/audit";
import { enqueueDelivery } from "@/lib/jobs/enqueue";
import crypto from "crypto";

// ── Types ──────────────────────────────────────────────────────────────────

export interface CampaignTemplateSummary {
  id: string;
  name: string;
  description: string | null;
  stepCount: number;
  totalDurationDays: number;
  isActive: boolean;
  enrolledCount: number;
  createdAt: string;
}

export interface CampaignTemplateDetail {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  steps: CampaignTemplateStep[];
  createdAt: string;
  updatedAt: string;
}

export interface EnrollmentSummary {
  id: string;
  recipientName: string;
  recipientContact: string;
  contactType: string;
  status: string;
  currentStep: number;
  totalSteps: number;
  enrolledAt: string;
  completedAt: string | null;
}

export interface EnrollmentDetail {
  id: string;
  recipientName: string;
  recipientContact: string;
  status: string;
  currentStep: number;
  enrolledAt: string;
  completedAt: string | null;
  pausedAt: string | null;
  cancelledAt: string | null;
  templateName: string;
  steps: Array<{
    stepNumber: number;
    stepName: string;
    scheduledFor: string | null;
    sentAt: string | null;
    messageId: string | null;
    messageStatus: string | null;
    openedAt: string | null;
  }>;
}

// ── Template CRUD ──────────────────────────────────────────────────────────

export async function getCampaignTemplates(): Promise<CampaignTemplateSummary[]> {
  const session = await requireSession();
  const tenantId = session.user.tenantId;

  const rows = await db.execute(sql`
    select
      ct.id, ct.name, ct.description, ct.is_active, ct.steps, ct.created_at,
      coalesce(e.enrolled_count, 0)::int as enrolled_count
    from campaign_templates ct
    left join lateral (
      select count(*) as enrolled_count
      from campaign_enrollments ce
      where ce.template_id = ct.id and ce.tenant_id = ${tenantId}
    ) e on true
    where ct.tenant_id = ${tenantId} and ct.is_active = true
    order by ct.created_at desc
  `);

  return (rows as unknown as Array<Record<string, unknown>>).map((r) => {
    const steps = r.steps as CampaignTemplateStep[];
    const maxDelay = steps.length > 0 ? Math.max(...steps.map((s) => s.delayDays)) : 0;
    return {
      id: String(r.id),
      name: String(r.name),
      description: r.description as string | null,
      stepCount: steps.length,
      totalDurationDays: maxDelay,
      isActive: Boolean(r.is_active),
      enrolledCount: Number(r.enrolled_count),
      createdAt: new Date(r.created_at as string).toISOString(),
    };
  });
}

export async function getCampaignTemplate(
  templateId: string
): Promise<CampaignTemplateDetail | null> {
  const session = await requireSession();
  const tenant = withTenant(session.user.tenantId);

  const [template] = await db
    .select()
    .from(campaignTemplates)
    .where(
      and(tenant.eq(campaignTemplates.tenantId), eq(campaignTemplates.id, templateId))
    )
    .limit(1);

  if (!template) return null;

  return {
    id: template.id,
    name: template.name,
    description: template.description,
    isActive: template.isActive,
    steps: template.steps,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

export async function createCampaignTemplate(params: {
  name: string;
  description?: string;
  steps: CampaignTemplateStep[];
}): Promise<{ id: string }> {
  const session = await requireCompletedMfa();
  const tenantId = session.user.tenantId;

  // Validate steps
  if (params.steps.length === 0) {
    throw new Error("Template must have at least one step");
  }

  const [template] = await db
    .insert(campaignTemplates)
    .values({
      tenantId,
      createdBy: session.user.id,
      name: params.name,
      description: params.description ?? null,
      steps: params.steps,
    })
    .returning();

  if (!template) throw new Error("Failed to create template");

  await logAudit({
    tenantId,
    userId: session.user.id,
    action: "campaign_template.create",
    resourceType: "campaign_template",
    resourceId: template.id,
    details: { name: params.name, stepCount: params.steps.length },
  });

  return { id: template.id };
}

export async function updateCampaignTemplate(
  templateId: string,
  params: {
    name?: string;
    description?: string;
    steps?: CampaignTemplateStep[];
  }
): Promise<void> {
  const session = await requireCompletedMfa();
  const tenant = withTenant(session.user.tenantId);

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (params.name !== undefined) updates.name = params.name;
  if (params.description !== undefined) updates.description = params.description;
  if (params.steps !== undefined) {
    if (params.steps.length === 0) {
      throw new Error("Template must have at least one step");
    }
    updates.steps = params.steps;
  }

  await db
    .update(campaignTemplates)
    .set(updates)
    .where(
      and(tenant.eq(campaignTemplates.tenantId), eq(campaignTemplates.id, templateId))
    );

  await logAudit({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: "campaign_template.update",
    resourceType: "campaign_template",
    resourceId: templateId,
  });
}

export async function deleteCampaignTemplate(templateId: string): Promise<void> {
  const session = await requireCompletedMfa();
  const tenant = withTenant(session.user.tenantId);

  // Soft delete
  await db
    .update(campaignTemplates)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(tenant.eq(campaignTemplates.tenantId), eq(campaignTemplates.id, templateId))
    );

  await logAudit({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: "campaign_template.delete",
    resourceType: "campaign_template",
    resourceId: templateId,
  });
}

export async function duplicateCampaignTemplate(
  templateId: string
): Promise<{ id: string }> {
  const session = await requireCompletedMfa();
  const tenant = withTenant(session.user.tenantId);

  const [original] = await db
    .select()
    .from(campaignTemplates)
    .where(
      and(tenant.eq(campaignTemplates.tenantId), eq(campaignTemplates.id, templateId))
    )
    .limit(1);

  if (!original) throw new Error("Template not found");

  const [copy] = await db
    .insert(campaignTemplates)
    .values({
      tenantId: session.user.tenantId,
      createdBy: session.user.id,
      name: `${original.name} (Copy)`,
      description: original.description,
      steps: original.steps,
    })
    .returning();

  if (!copy) throw new Error("Failed to duplicate template");

  return { id: copy.id };
}

// ── Enrollment Management ──────────────────────────────────────────────────

export async function enrollRecipients(params: {
  templateId: string;
  recipientIds: string[];
}): Promise<{ enrolled: number; skipped: number }> {
  const session = await requireCompletedMfa();
  const tenantId = session.user.tenantId;
  const tenant = withTenant(tenantId);

  // Load template
  const [template] = await db
    .select()
    .from(campaignTemplates)
    .where(
      and(
        tenant.eq(campaignTemplates.tenantId),
        eq(campaignTemplates.id, params.templateId)
      )
    )
    .limit(1);

  if (!template || !template.isActive) {
    throw new Error("Template not found or inactive");
  }

  const steps = template.steps as CampaignTemplateStep[];
  if (steps.length === 0) throw new Error("Template has no steps");

  let enrolled = 0;
  let skipped = 0;

  for (const recipientId of params.recipientIds) {
    // Check if already enrolled
    const [existing] = await db
      .select({ id: campaignEnrollments.id })
      .from(campaignEnrollments)
      .where(
        and(
          eq(campaignEnrollments.templateId, params.templateId),
          eq(campaignEnrollments.recipientId, recipientId)
        )
      )
      .limit(1);

    if (existing) {
      skipped++;
      continue;
    }

    // Create enrollment
    const [enrollment] = await db
      .insert(campaignEnrollments)
      .values({
        tenantId,
        templateId: params.templateId,
        recipientId,
        enrolledBy: session.user.id,
        status: "active",
        currentStep: 0,
      })
      .returning();

    if (!enrollment) {
      skipped++;
      continue;
    }

    // Schedule first step
    const firstStep = steps.find((s) => s.stepNumber === 1);
    if (firstStep) {
      const delaySecs = Math.max(firstStep.delayDays, 0) * 24 * 60 * 60;

      try {
        const { getQueue } = await import("@/lib/jobs/queue");
        const { QUEUE: Q } = await import("@/lib/jobs/types");
        const boss = await getQueue();
        await boss.send(
          Q.PROCESS_CAMPAIGN_STEP,
          {
            enrollmentId: enrollment.id,
            stepNumber: 1,
            tenantId,
          },
          {
            startAfter: delaySecs > 0 ? delaySecs : undefined,
            retryLimit: 3,
            retryDelay: 60,
            retryBackoff: true,
          }
        );
      } catch (err) {
        console.error("[campaign] Failed to schedule first step:", err);
      }
    }

    enrolled++;
  }

  await logAudit({
    tenantId,
    userId: session.user.id,
    action: "campaign.enroll",
    resourceType: "campaign_template",
    resourceId: params.templateId,
    details: { enrolled, skipped, total: params.recipientIds.length },
  });

  return { enrolled, skipped };
}

export async function getEnrollmentsForTemplate(
  templateId: string
): Promise<EnrollmentSummary[]> {
  const session = await requireSession();
  const tenantId = session.user.tenantId;

  // Get template step count
  const [template] = await db
    .select({ steps: campaignTemplates.steps })
    .from(campaignTemplates)
    .where(eq(campaignTemplates.id, templateId))
    .limit(1);

  const totalSteps = template
    ? (template.steps as CampaignTemplateStep[]).length
    : 0;

  const rows = await db
    .select({
      id: campaignEnrollments.id,
      firstName: recipients.firstName,
      lastName: recipients.lastName,
      contact: recipients.contact,
      contactType: recipients.contactType,
      status: campaignEnrollments.status,
      currentStep: campaignEnrollments.currentStep,
      enrolledAt: campaignEnrollments.enrolledAt,
      completedAt: campaignEnrollments.completedAt,
    })
    .from(campaignEnrollments)
    .innerJoin(recipients, eq(campaignEnrollments.recipientId, recipients.id))
    .where(
      and(
        eq(campaignEnrollments.tenantId, tenantId),
        eq(campaignEnrollments.templateId, templateId)
      )
    )
    .orderBy(desc(campaignEnrollments.enrolledAt));

  return rows.map((r) => ({
    id: r.id,
    recipientName: [r.firstName, r.lastName].filter(Boolean).join(" ") || r.contact,
    recipientContact: r.contact,
    contactType: r.contactType,
    status: r.status,
    currentStep: r.currentStep,
    totalSteps,
    enrolledAt: r.enrolledAt.toISOString(),
    completedAt: r.completedAt?.toISOString() ?? null,
  }));
}

export async function getEnrollmentDetail(
  enrollmentId: string
): Promise<EnrollmentDetail | null> {
  const session = await requireSession();
  const tenantId = session.user.tenantId;

  const [enrollment] = await db
    .select({
      id: campaignEnrollments.id,
      status: campaignEnrollments.status,
      currentStep: campaignEnrollments.currentStep,
      enrolledAt: campaignEnrollments.enrolledAt,
      completedAt: campaignEnrollments.completedAt,
      pausedAt: campaignEnrollments.pausedAt,
      cancelledAt: campaignEnrollments.cancelledAt,
      templateId: campaignEnrollments.templateId,
      firstName: recipients.firstName,
      lastName: recipients.lastName,
      contact: recipients.contact,
    })
    .from(campaignEnrollments)
    .innerJoin(recipients, eq(campaignEnrollments.recipientId, recipients.id))
    .where(
      and(
        eq(campaignEnrollments.tenantId, tenantId),
        eq(campaignEnrollments.id, enrollmentId)
      )
    )
    .limit(1);

  if (!enrollment) return null;

  // Load template for step names
  const [template] = await db
    .select({ name: campaignTemplates.name, steps: campaignTemplates.steps })
    .from(campaignTemplates)
    .where(eq(campaignTemplates.id, enrollment.templateId))
    .limit(1);

  if (!template) return null;

  const templateSteps = template.steps as CampaignTemplateStep[];

  // Load step sends
  const stepSends = await db
    .select({
      stepNumber: campaignStepSends.stepNumber,
      messageId: campaignStepSends.messageId,
      scheduledFor: campaignStepSends.scheduledFor,
      sentAt: campaignStepSends.sentAt,
      messageStatus: messages.status,
      openedAt: messages.openedAt,
    })
    .from(campaignStepSends)
    .leftJoin(messages, eq(campaignStepSends.messageId, messages.id))
    .where(eq(campaignStepSends.enrollmentId, enrollmentId))
    .orderBy(campaignStepSends.stepNumber);

  const stepsWithStatus = templateSteps.map((step) => {
    const send = stepSends.find((s) => s.stepNumber === step.stepNumber);
    return {
      stepNumber: step.stepNumber,
      stepName: step.name,
      scheduledFor: send?.scheduledFor?.toISOString() ?? null,
      sentAt: send?.sentAt?.toISOString() ?? null,
      messageId: send?.messageId ?? null,
      messageStatus: send?.messageStatus ?? null,
      openedAt: send?.openedAt?.toISOString() ?? null,
    };
  });

  return {
    id: enrollment.id,
    recipientName:
      [enrollment.firstName, enrollment.lastName].filter(Boolean).join(" ") ||
      enrollment.contact,
    recipientContact: enrollment.contact,
    status: enrollment.status,
    currentStep: enrollment.currentStep,
    enrolledAt: enrollment.enrolledAt.toISOString(),
    completedAt: enrollment.completedAt?.toISOString() ?? null,
    pausedAt: enrollment.pausedAt?.toISOString() ?? null,
    cancelledAt: enrollment.cancelledAt?.toISOString() ?? null,
    templateName: template.name,
    steps: stepsWithStatus,
  };
}

export async function pauseEnrollment(enrollmentId: string): Promise<void> {
  const session = await requireCompletedMfa();
  const tenant = withTenant(session.user.tenantId);

  await db
    .update(campaignEnrollments)
    .set({
      status: "paused",
      pausedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        tenant.eq(campaignEnrollments.tenantId),
        eq(campaignEnrollments.id, enrollmentId),
        eq(campaignEnrollments.status, "active")
      )
    );
}

export async function resumeEnrollment(enrollmentId: string): Promise<void> {
  const session = await requireCompletedMfa();
  const tenantId = session.user.tenantId;
  const tenant = withTenant(tenantId);

  const [enrollment] = await db
    .select()
    .from(campaignEnrollments)
    .where(
      and(
        tenant.eq(campaignEnrollments.tenantId),
        eq(campaignEnrollments.id, enrollmentId),
        eq(campaignEnrollments.status, "paused")
      )
    )
    .limit(1);

  if (!enrollment) throw new Error("Enrollment not found or not paused");

  // Resume: set status back to active
  await db
    .update(campaignEnrollments)
    .set({
      status: "active",
      pausedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(campaignEnrollments.id, enrollmentId));

  // Re-schedule the next step
  const [template] = await db
    .select({ steps: campaignTemplates.steps })
    .from(campaignTemplates)
    .where(eq(campaignTemplates.id, enrollment.templateId))
    .limit(1);

  if (!template) return;

  const steps = template.steps as CampaignTemplateStep[];
  const nextStepNumber = enrollment.currentStep + 1;
  const nextStep = steps.find((s) => s.stepNumber === nextStepNumber);

  if (nextStep) {
    try {
      const { getQueue } = await import("@/lib/jobs/queue");
      const { QUEUE: Q } = await import("@/lib/jobs/types");
      const boss = await getQueue();
      // Schedule immediately since they were paused
      await boss.send(
        Q.PROCESS_CAMPAIGN_STEP,
        {
          enrollmentId,
          stepNumber: nextStepNumber,
          tenantId,
        },
        {
          retryLimit: 3,
          retryDelay: 60,
          retryBackoff: true,
        }
      );
    } catch (err) {
      console.error("[campaign] Failed to schedule resumed step:", err);
    }
  }
}

export async function cancelEnrollment(enrollmentId: string): Promise<void> {
  const session = await requireCompletedMfa();
  const tenant = withTenant(session.user.tenantId);

  await db
    .update(campaignEnrollments)
    .set({
      status: "cancelled",
      cancelledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        tenant.eq(campaignEnrollments.tenantId),
        eq(campaignEnrollments.id, enrollmentId)
      )
    );
}

// ── Internal: send message on behalf of campaign (called from worker) ─────

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function sendMessageInternal(params: {
  tenantId: string;
  senderId: string;
  recipientId: string;
  recipientContact: string;
  contentBlocks: Array<{ type: "content_item"; content_item_id: string; order: number }>;
  deliveryChannel: "sms" | "email";
  reminders?: {
    enabled: boolean;
    maxReminders: number;
    intervalHours: number;
  };
}): Promise<{ messageId: string }> {
  const accessToken = crypto.randomBytes(24).toString("base64url");

  // Get link expiration from org settings
  const [orgSettings] = await db
    .select({ settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, params.tenantId))
    .limit(1);

  const linkExpirationDays =
    (orgSettings?.settings as Record<string, Record<string, number>> | null)
      ?.delivery?.linkExpirationDays ?? 30;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + linkExpirationDays);

  const [message] = await db
    .insert(messages)
    .values({
      tenantId: params.tenantId,
      senderId: params.senderId,
      recipientId: params.recipientId,
      subject: "Your provider has shared health information with you",
      contentBlocks: params.contentBlocks,
      deliveryChannel: params.deliveryChannel,
      status: "queued",
      accessTokenHash: hashToken(accessToken),
      accessTokenExpiresAt: expiresAt,
    })
    .returning();

  if (!message) throw new Error("Failed to create message");

  // Enqueue delivery
  try {
    await enqueueDelivery({
      messageId: message.id,
      tenantId: params.tenantId,
      recipientContact: params.recipientContact,
      deliveryChannel: params.deliveryChannel,
      accessToken,
      reminders: params.reminders,
    });
  } catch (err) {
    console.warn("[campaign-send] pg-boss unavailable:", err);
  }

  return { messageId: message.id };
}

// ── Active Campaigns overview (for tracking) ──────────────────────────────

export async function getActiveCampaigns(): Promise<
  Array<{
    templateId: string;
    templateName: string;
    totalEnrolled: number;
    activeCount: number;
    completedCount: number;
    pausedCount: number;
  }>
> {
  const session = await requireSession();
  const tenantId = session.user.tenantId;

  const rows = await db.execute(sql`
    select
      ct.id as template_id,
      ct.name as template_name,
      count(ce.id)::int as total_enrolled,
      count(*) filter (where ce.status = 'active')::int as active_count,
      count(*) filter (where ce.status = 'completed')::int as completed_count,
      count(*) filter (where ce.status = 'paused')::int as paused_count
    from campaign_templates ct
    inner join campaign_enrollments ce on ce.template_id = ct.id
    where ct.tenant_id = ${tenantId} and ct.is_active = true
    group by ct.id, ct.name
    order by ct.name
  `);

  return (rows as unknown as Array<Record<string, unknown>>).map((r) => ({
    templateId: String(r.template_id),
    templateName: String(r.template_name),
    totalEnrolled: Number(r.total_enrolled),
    activeCount: Number(r.active_count),
    completedCount: Number(r.completed_count),
    pausedCount: Number(r.paused_count),
  }));
}
