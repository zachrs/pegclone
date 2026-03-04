import twilio from "twilio";

interface SendSmsParams {
  to: string;
  body: string;
  statusCallbackUrl?: string;
}

export async function sendSms(
  params: SendSmsParams
): Promise<{ success: boolean; sid?: string; error?: string }> {
  // Development: log to console
  if (
    process.env.NODE_ENV === "development" ||
    process.env.TWILIO_ACCOUNT_SID === "stub"
  ) {
    console.log("=== DEV SMS ===");
    console.log(`To: ${params.to}`);
    console.log(`Body: ${params.body}`);
    console.log("===============");
    return { success: true, sid: `dev-sms-${Date.now()}` };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, error: "Twilio not configured" };
  }

  try {
    const client = twilio(accountSid, authToken);

    const message = await client.messages.create({
      to: params.to,
      from: fromNumber,
      body: params.body,
      ...(params.statusCallbackUrl
        ? { statusCallback: params.statusCallbackUrl }
        : {}),
    });

    return { success: true, sid: message.sid };
  } catch (err) {
    return {
      success: false,
      error: `SMS send failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Validate a Twilio webhook signature.
 */
export function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return false;

  const { validateRequest } = twilio;
  return validateRequest(authToken, signature, url, params);
}
