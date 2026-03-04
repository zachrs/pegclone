import { getQueue } from "./queue";
import {
  QUEUE,
  type SendMessageJob,
  type SendReminderJob,
} from "./types";

/**
 * Enqueue a message for async delivery via pg-boss.
 */
export async function enqueueDelivery(params: {
  messageId: string;
  tenantId: string;
  recipientContact: string;
  deliveryChannel: "email" | "sms";
  accessToken: string;
  viewerBaseUrl?: string;
  scheduledAt?: Date;
  reminders?: {
    enabled: boolean;
    maxReminders: number;
    intervalHours: number;
  };
}) {
  const baseUrl =
    params.viewerBaseUrl ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";
  const viewerUrl = `${baseUrl}/m/${params.accessToken}`;

  const boss = await getQueue();

  const jobOptions: Record<string, unknown> = {};
  if (params.scheduledAt) {
    jobOptions.startAfter = params.scheduledAt;
  }

  await boss.send(
    QUEUE.SEND_MESSAGE,
    {
      messageId: params.messageId,
      tenantId: params.tenantId,
      recipientContact: params.recipientContact,
      deliveryChannel: params.deliveryChannel,
      accessToken: params.accessToken,
      viewerUrl,
    } satisfies SendMessageJob,
    {
      retryLimit: 3,
      retryDelay: 60, // 1 min between retries
      retryBackoff: true,
      expireInSeconds: 30 * 60,
      ...jobOptions,
    }
  );

  // Schedule first reminder if enabled
  if (
    params.reminders?.enabled &&
    params.reminders.maxReminders > 0
  ) {
    await boss.send(
      QUEUE.SEND_REMINDER,
      {
        messageId: params.messageId,
        tenantId: params.tenantId,
        reminderNumber: 1,
        maxReminders: params.reminders.maxReminders,
        intervalHours: params.reminders.intervalHours,
      } satisfies SendReminderJob,
      {
        startAfter: params.reminders.intervalHours * 60 * 60, // seconds
        retryLimit: 2,
      }
    );
  }
}
