"use server";

import { auth } from "@/lib/auth";
import {
  verifyMfaCode as verifyMfaCodeUtil,
  sendMfaCode,
} from "@/lib/auth/mfa";

export async function verifyMfaCodeAction(
  code: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  if (code.length !== 6 || !/^\d{6}$/.test(code)) {
    return { success: false, error: "Code must be 6 digits" };
  }

  const valid = await verifyMfaCodeUtil(session.user.id, code);
  if (!valid) {
    return {
      success: false,
      error: "Invalid or expired code. Please try again or request a new code.",
    };
  }

  return { success: true };
}

export async function resendMfaCodeAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.tenantId) {
    return { success: false, error: "Not authenticated" };
  }

  const result = await sendMfaCode(
    session.user.id,
    session.user.tenantId,
    session.user.email
  );

  return result;
}
