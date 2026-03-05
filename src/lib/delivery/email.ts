interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(
  params: SendEmailParams
): Promise<{ success: boolean; error?: string }> {
  // Development: log to console
  if (
    process.env.NODE_ENV === "development" ||
    process.env.MAILGUN_API_KEY === "stub"
  ) {
    console.log("[dev-email] Message sent (details redacted for HIPAA compliance)");
    return { success: true };
  }

  // Production: Mailgun HTTP API
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  if (!apiKey || !domain) {
    return { success: false, error: "Mailgun not configured" };
  }

  try {
    const form = new URLSearchParams();
    form.append("from", `Patient Education Genius <noreply@${domain}>`);
    form.append("to", params.to);
    form.append("subject", params.subject);
    form.append("text", params.text);
    if (params.html) form.append("html", params.html);

    const response = await fetch(
      `https://api.mailgun.net/v3/${domain}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
        },
        body: form,
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: "Email delivery failed",
      };
    }
    return { success: true };
  } catch {
    return { success: false, error: "Email delivery failed" };
  }
}
