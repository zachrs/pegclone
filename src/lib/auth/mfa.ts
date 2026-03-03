import { db } from "@/lib/db";
import { mfaCodes, users, organizations } from "@/drizzle/schema";
import { eq, and, gt, isNull, isNotNull, desc } from "drizzle-orm";
import { sendEmail } from "@/lib/delivery/email";

/** Generate a 6-digit OTP string, zero-padded. Uses Web Crypto API. */
export function generateOtpCode(): string {
  const arr = new Uint32Array(1);
  globalThis.crypto.getRandomValues(arr);
  const code = arr[0]! % 1_000_000;
  return code.toString().padStart(6, "0");
}

/** SHA-256 hash a code for storage. Uses Web Crypto API. */
export async function hashCode(code: string): Promise<string> {
  const encoded = new TextEncoder().encode(code);
  const buf = await globalThis.crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Check if MFA is required for a given user+org combination. */
export async function isMfaRequired(
  userId: string,
  tenantId: string
): Promise<boolean> {
  const [user] = await db
    .select({ mfaEnabled: users.mfaEnabled })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user?.mfaEnabled) return true;

  const [org] = await db
    .select({ settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, tenantId))
    .limit(1);

  return org?.settings?.mfa?.required === true;
}

/** Create and send an MFA code. Deletes all prior unverified codes for the user. */
export async function sendMfaCode(
  userId: string,
  tenantId: string,
  email: string
): Promise<{ success: boolean; error?: string }> {
  // Delete all existing unverified codes for this user
  await db
    .delete(mfaCodes)
    .where(and(eq(mfaCodes.userId, userId), isNull(mfaCodes.verifiedAt)));

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await db.insert(mfaCodes).values({
    userId,
    tenantId,
    codeHash: await hashCode(code),
    expiresAt,
  });

  const result = await sendEmail({
    to: email,
    subject: "Your verification code",
    text: `Your Patient Education Genius verification code is: ${code}\n\nThis code expires in 10 minutes. If you did not request this, please ignore this email.`,
    html: `<p>Your Patient Education Genius verification code is:</p><h1 style="font-size:36px;letter-spacing:8px;font-family:monospace">${code}</h1><p>This code expires in 10 minutes.</p><p style="color:#666">If you did not request this, please ignore this email.</p>`,
  });

  return result;
}

/** Verify an MFA code. Returns true if valid, false otherwise. */
export async function verifyMfaCode(
  userId: string,
  code: string
): Promise<boolean> {
  const codeHashValue = await hashCode(code);
  const now = new Date();

  const [match] = await db
    .select()
    .from(mfaCodes)
    .where(
      and(
        eq(mfaCodes.userId, userId),
        eq(mfaCodes.codeHash, codeHashValue),
        isNull(mfaCodes.verifiedAt),
        gt(mfaCodes.expiresAt, now)
      )
    )
    .orderBy(desc(mfaCodes.createdAt))
    .limit(1);

  if (!match) return false;

  await db
    .update(mfaCodes)
    .set({ verifiedAt: now })
    .where(eq(mfaCodes.id, match.id));

  return true;
}

/** Check if the user has a recently verified MFA code (within last 5 minutes). */
export async function hasRecentVerification(userId: string): Promise<boolean> {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

  const [verified] = await db
    .select({ id: mfaCodes.id })
    .from(mfaCodes)
    .where(
      and(
        eq(mfaCodes.userId, userId),
        isNotNull(mfaCodes.verifiedAt),
        gt(mfaCodes.verifiedAt, fiveMinAgo)
      )
    )
    .orderBy(desc(mfaCodes.createdAt))
    .limit(1);

  return !!verified;
}
