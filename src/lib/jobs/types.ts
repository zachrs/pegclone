/** Job payload for delivering a single message (email or SMS). */
export interface SendMessageJob {
  messageId: string;
  tenantId: string;
  recipientContact: string;
  deliveryChannel: "email" | "sms";
  accessToken: string;
  /** Viewer URL for the recipient, e.g. https://app.peg.com/m/<token> */
  viewerUrl: string;
}

/** Job payload for processing an entire bulk send. */
export interface ProcessBulkSendJob {
  bulkSendId: string;
  tenantId: string;
}

/** Job payload for sending a follow-up reminder. */
export interface SendReminderJob {
  messageId: string;
  tenantId: string;
  reminderNumber: number;
  maxReminders: number;
  intervalHours: number;
}

/** Job payload for retrying a failed delivery. */
export interface DeliveryRetryJob {
  messageId: string;
  tenantId: string;
  attempt: number;
  maxAttempts: number;
}

/** Job payload for processing a campaign template step for an enrolled recipient. */
export interface ProcessCampaignStepJob {
  enrollmentId: string;
  stepNumber: number;
  tenantId: string;
}

// Queue names
export const QUEUE = {
  SEND_MESSAGE: "send-message",
  PROCESS_BULK_SEND: "process-bulk-send",
  SEND_REMINDER: "send-reminder",
  DELIVERY_RETRY: "delivery-retry",
  PROCESS_CAMPAIGN_STEP: "process-campaign-step",
} as const;
