import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import type { UserRole } from "@/lib/db/types";
import { isMfaRequired, sendMfaCode, hasRecentVerification } from "./mfa";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      isAdmin: boolean;
      tenantId: string;
      image?: string | null;
      mfaPending: boolean;
    };
  }
}

declare module "next-auth" {
  interface JWT {
    pegUserId?: string;
    pegRole?: UserRole;
    pegIsAdmin?: boolean;
    pegTenantId?: string;
    pegMfaPending?: boolean;
    pegEmail?: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const [user] = await db
          .select({
            id: users.id,
            email: users.email,
            fullName: users.fullName,
            passwordHash: users.passwordHash,
            role: users.role,
            isAdmin: users.isAdmin,
            isActive: users.isActive,
            activatedAt: users.activatedAt,
            tenantId: users.tenantId,
          })
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        // Activate on first login if not yet activated
        if (!user.activatedAt) {
          await db
            .update(users)
            .set({ activatedAt: new Date(), updatedAt: new Date() })
            .where(eq(users.id, user.id));
        }

        // Check if MFA is required
        const mfaNeeded = await isMfaRequired(user.id, user.tenantId);

        if (mfaNeeded) {
          await sendMfaCode(user.id, user.tenantId, user.email);
        }

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          pegRole: user.role,
          pegIsAdmin: user.isAdmin,
          pegTenantId: user.tenantId,
          pegMfaPending: mfaNeeded,
          pegEmail: user.email,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // On sign-in, persist PEG fields into the JWT
      if (user) {
        token.pegUserId = user.id;
        token.pegRole = (user as Record<string, unknown>).pegRole as UserRole;
        token.pegIsAdmin = (user as Record<string, unknown>)
          .pegIsAdmin as boolean;
        token.pegTenantId = (user as Record<string, unknown>)
          .pegTenantId as string;
        token.pegMfaPending = (user as Record<string, unknown>)
          .pegMfaPending as boolean;
        token.pegEmail = (user as Record<string, unknown>)
          .pegEmail as string;
      }

      // On session update (after MFA verification), verify against DB
      if (trigger === "update" && token.pegMfaPending) {
        // Check if MFA is still required (org may have disabled it)
        const stillRequired = await isMfaRequired(
          token.pegUserId as string,
          token.pegTenantId as string
        );

        if (!stillRequired) {
          token.pegMfaPending = false;
        } else {
          // Check for a recently verified code in the DB
          const verified = await hasRecentVerification(
            token.pegUserId as string
          );
          if (verified) {
            token.pegMfaPending = false;
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token.pegUserId && token.pegTenantId) {
        session.user.id = token.pegUserId as string;
        session.user.role = (token.pegRole as UserRole) ?? "org_user";
        session.user.isAdmin = (token.pegIsAdmin as boolean) ?? false;
        session.user.tenantId = token.pegTenantId as string;
        session.user.mfaPending = (token.pegMfaPending as boolean) ?? false;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/auth-error",
  },
  session: {
    strategy: "jwt",
    maxAge: 15 * 60, // 15-minute session timeout for HIPAA compliance
  },
});
