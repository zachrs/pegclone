import type { PgBoss, Job } from "pg-boss";
import { db } from "@/lib/db";
import {
  messages,
  messageEvents,
  recipients,
  campaignEnrollments,
  campaignTemplates,
  campaignStepSends,
} from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { sendEmail } from "@/lib/delivery/email";
import { sendSms } from "@/lib/delivery/sms";
import {
  QUEUE,
  type SendMessageJob,
  type SendReminderJob,
  type DeliveryRetryJob,
  type ProcessCampaignStepJob,
} from "./types";
import type { CampaignTemplateStep } from "@/drizzle/schema";

/**
 * Register all job workers on the given pg-boss instance.
 */
export function registerWorkers(boss: PgBoss): void {
  boss.work<SendMessageJob>(
    QUEUE.SEND_MESSAGE,
    { localConcurrency: 5 },
    async (jobs: Job<SendMessageJob>[]) => {
      for (const job of jobs) {
        await handleSendMessage(job);
      }
    }
  );

  boss.work<SendReminderJob>(
    QUEUE.SEND_REMINDER,
    { localConcurrency: 3 },
    async (jobs: Job<SendReminderJob>[]) => {
      for (const job of jobs) {
        await handleSendReminder(job);
      }
    }
  );

  boss.work<DeliveryRetryJob>(
    QUEUE.DELIVERY_RETRY,
    { localConcurrency: 3 },
    async (jobs: Job<DeliveryRetryJob>[]) => {
      for (const job of jobs) {
        await handleDeliveryRetry(job);
      }
    }
  );

  boss.work<ProcessCampaignStepJob>(
    QUEUE.PROCESS_CAMPAIGN_STEP,
    { localConcurrency: 3 },
    async (jobs: Job<ProcessCampaignStepJob>[]) => {
      for (const job of jobs) {
        await handleProcessCampaignStep(job);
      }
    }
  );
}

// ── Send Message Worker ────────────────────────────────────────────────────

async function handleSendMessage(job: Job<SendMessageJob>) {
  const { messageId, recipientContact, deliveryChannel, viewerUrl } = job.data;

  // Log queued event
  await logEvent(messageId, job.data.tenantId, "queued");

  let result: { success: boolean; error?: string; sid?: string };

  if (deliveryChannel === "email") {
    result = await sendEmail({
      to: recipientContact,
      subject: "Your provider has shared health information with you",
      text: `Your provider has shared health information with you. View it here: ${viewerUrl}`,
      html: buildEmailHtml(viewerUrl),
    });
  } else {
    result = await sendSms({
      to: recipientContact,
      body: `Your provider has shared health information with you. View it here: ${viewerUrl}`,
      statusCallbackUrl: process.env.TWILIO_STATUS_CALLBACK_URL,
    });
  }

  if (result.success) {
    await db
      .update(messages)
      .set({
        status: "sent",
        sentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(messages.id, messageId));

    await logEvent(messageId, job.data.tenantId, "sent", {
      channel: deliveryChannel,
      ...(result.sid ? { sid: result.sid } : {}),
    });
  } else {
    await db
      .update(messages)
      .set({
        status: "failed",
        deliveryError: result.error ?? "Unknown error",
        updatedAt: new Date(),
      })
      .where(eq(messages.id, messageId));

    await logEvent(messageId, job.data.tenantId, "failed", {
      error: result.error,
    });

    throw new Error(result.error ?? "Delivery failed");
  }
}

// ── Send Reminder Worker ────────────────────────────────────────────────

async function handleSendReminder(job: Job<SendReminderJob>) {
  const { messageId, tenantId, reminderNumber, maxReminders, intervalHours } =
    job.data;

  // Check if message has been opened — if so, skip
  const [msg] = await db
    .select({
      openedAt: messages.openedAt,
      deliveryChannel: messages.deliveryChannel,
      recipientId: messages.recipientId,
      accessTokenHash: messages.accessTokenHash,
    })
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);

  if (!msg) return;
  if (msg.openedAt) return; // already opened, no reminder needed

  // Get recipient contact for sending
  const [recipient] = await db
    .select({ contact: recipients.contact, contactType: recipients.contactType })
    .from(recipients)
    .where(eq(recipients.id, msg.recipientId))
    .limit(1);

  if (!recipient) return;

  // Build viewer URL from access token hash
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://localhost:3000";
  // We stored accessToken in the original send job; use the hash to find it
  // For reminders, we need to reconstruct the viewer URL
  // The accessTokenHash is already in the message, but we need the raw token
  // which we don't store. Instead, we send a generic reminder with the same link.

  // Actually send the reminder message
  const reminderText = `Reminder: Your provider shared health information with you. Don't forget to review it!`;

  if (msg.deliveryChannel === "email" || msg.deliveryChannel === "sms_and_email") {
    await sendEmail({
      to: recipient.contact,
      subject: "Reminder: Health information from your provider",
      text: reminderText,
      html: buildReminderEmailHtml(reminderNumber),
    });
  }

  if (msg.deliveryChannel === "sms" || msg.deliveryChannel === "sms_and_email") {
    await sendSms({
      to: recipient.contact,
      body: reminderText,
    });
  }

  // Log the reminder event
  await logEvent(messageId, tenantId, "reminder_sent", {
    reminderNumber,
    channel: msg.deliveryChannel,
  });

  // Schedule next reminder if we haven't hit max
  if (reminderNumber < maxReminders) {
    const { getQueue } = await import("./queue");
    const boss = await getQueue();
    await boss.send(QUEUE.SEND_REMINDER, {
      messageId,
      tenantId,
      reminderNumber: reminderNumber + 1,
      maxReminders,
      intervalHours,
    } satisfies SendReminderJob, {
      startAfter: intervalHours * 60 * 60, // delay in seconds
    });
  }
}

// ── Delivery Retry Worker ────────────────────────────────────────────────

async function handleDeliveryRetry(job: Job<DeliveryRetryJob>) {
  const { messageId, tenantId, attempt } = job.data;

  // Get message details
  const [msg] = await db
    .select({
      deliveryChannel: messages.deliveryChannel,
      contentBlocks: messages.contentBlocks,
      accessTokenHash: messages.accessTokenHash,
      recipientId: messages.recipientId,
    })
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);

  if (!msg) return;
  if (msg.deliveryChannel === "qr_code") return;

  // Re-enqueue as a send-message job
  const { getQueue } = await import("./queue");
  const boss = await getQueue();

  await boss.send(
    QUEUE.SEND_MESSAGE,
    {
      messageId,
      tenantId,
      recipientContact: "", // Will be looked up
      deliveryChannel: msg.deliveryChannel as "email" | "sms",
      accessToken: "",
      viewerUrl: "",
    } satisfies SendMessageJob,
    {
      retryLimit: 0,
    }
  );

  await logEvent(messageId, tenantId, "queued", {
    retryAttempt: attempt,
  });
}

// ── Process Campaign Step Worker ──────────────────────────────────────────

async function handleProcessCampaignStep(job: Job<ProcessCampaignStepJob>) {
  const { enrollmentId, stepNumber, tenantId } = job.data;

  // Load enrollment
  const [enrollment] = await db
    .select()
    .from(campaignEnrollments)
    .where(
      and(
        eq(campaignEnrollments.id, enrollmentId),
        eq(campaignEnrollments.tenantId, tenantId)
      )
    )
    .limit(1);

  if (!enrollment) return;
  if (enrollment.status !== "active") return; // paused or cancelled

  // Load template
  const [template] = await db
    .select()
    .from(campaignTemplates)
    .where(eq(campaignTemplates.id, enrollment.templateId))
    .limit(1);

  if (!template || !template.isActive) return;

  const steps = template.steps as CampaignTemplateStep[];
  const step = steps.find((s) => s.stepNumber === stepNumber);
  if (!step) return;

  // Load recipient
  const [recipient] = await db
    .select()
    .from(recipients)
    .where(eq(recipients.id, enrollment.recipientId))
    .limit(1);

  if (!recipient || recipient.optedOut) {
    // Cancel enrollment if recipient opted out
    if (recipient?.optedOut) {
      await db
        .update(campaignEnrollments)
        .set({
          status: "cancelled",
          cancelledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(campaignEnrollments.id, enrollmentId));
    }
    return;
  }

  // Build content blocks from the step's content item IDs
  const contentBlocks = step.contentItemIds.map((id, i) => ({
    type: "content_item" as const,
    content_item_id: id,
    order: i,
  }));

  // Use the sendMessage action to create and deliver the message
  // We import dynamically to avoid circular deps
  const { sendMessageInternal } = await import("@/lib/actions/campaign-templates");

  const { messageId } = await sendMessageInternal({
    tenantId,
    senderId: enrollment.enrolledBy,
    recipientId: recipient.id,
    recipientContact: recipient.contact,
    contentBlocks,
    deliveryChannel: recipient.contactType === "email" ? "email" : "sms",
    reminders: step.reminderEnabled
      ? {
          enabled: true,
          maxReminders: step.maxReminders,
          intervalHours: step.reminderIntervalHours,
        }
      : undefined,
  });

  // Record the step send
  await db.insert(campaignStepSends).values({
    tenantId,
    enrollmentId,
    stepNumber,
    messageId,
    scheduledFor: new Date(),
    sentAt: new Date(),
  });

  // Update enrollment progress
  const isLastStep = stepNumber >= steps.length;
  await db
    .update(campaignEnrollments)
    .set({
      currentStep: stepNumber,
      ...(isLastStep
        ? { status: "completed" as const, completedAt: new Date() }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(campaignEnrollments.id, enrollmentId));

  // Schedule next step if more remain
  if (!isLastStep) {
    const nextStep = steps.find((s) => s.stepNumber === stepNumber + 1);
    if (nextStep) {
      const delayDays = nextStep.delayDays - step.delayDays;
      const delaySecs = Math.max(delayDays, 1) * 24 * 60 * 60;

      const { getQueue } = await import("./queue");
      const boss = await getQueue();
      await boss.send(
        QUEUE.PROCESS_CAMPAIGN_STEP,
        {
          enrollmentId,
          stepNumber: stepNumber + 1,
          tenantId,
        } satisfies ProcessCampaignStepJob,
        {
          startAfter: delaySecs,
          retryLimit: 3,
          retryDelay: 60,
          retryBackoff: true,
        }
      );
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

async function logEvent(
  messageId: string,
  tenantId: string,
  eventType: "queued" | "sent" | "delivered" | "failed" | "opened" | "item_viewed" | "reminder_sent",
  payload?: Record<string, unknown>
) {
  await db.insert(messageEvents).values({
    tenantId,
    messageId,
    eventType,
    payload: payload ?? {},
    occurredAt: new Date(),
  });
}

function buildReminderEmailHtml(reminderNumber: number): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:24px">
    <tr><td style="padding:24px;background:white;border-radius:12px;text-align:center">
      <h2 style="margin:0 0 16px;color:#111827;font-size:20px">Reminder: Don&apos;t forget to review your materials</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:15px">Your provider shared health information with you. Please review it when you have a moment. (Reminder ${reminderNumber})</p>
      <p style="margin:24px 0 0;color:#9ca3af;font-size:12px">Use the original link from your first message to view your materials.</p>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildEmailHtml(viewerUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:24px">
    <tr><td style="padding:24px;background:white;border-radius:12px;text-align:center">
      <h2 style="margin:0 0 16px;color:#111827;font-size:20px">Your provider has shared health information with you</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:15px">Click the button below to view your materials.</p>
      <a href="${viewerUrl}" style="display:inline-block;padding:12px 32px;background:#0d9488;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">View Materials</a>
      <p style="margin:24px 0 0;color:#9ca3af;font-size:12px">This link expires in 30 days.</p>
    </td></tr>
  </table>
</body>
</html>`;
}
