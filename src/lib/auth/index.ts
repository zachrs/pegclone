import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import type { UserRole } from "@/lib/db/types";

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
    };
  }
}

// Augment the JWT type from next-auth
declare module "next-auth" {
  interface JWT {
    pegUserId?: string;
    pegRole?: UserRole;
    pegIsAdmin?: boolean;
    pegTenantId?: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Keycloak({
      clientId: process.env.AUTH_KEYCLOAK_ID!,
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET!,
      issuer: process.env.AUTH_KEYCLOAK_ISSUER!,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // On first sign-in, look up the PEG user by Keycloak sub
      if (account && profile?.sub) {
        const pegUser = await db
          .select()
          .from(users)
          .where(eq(users.keycloakSub, profile.sub))
          .limit(1);

        if (pegUser[0]) {
          token.pegUserId = pegUser[0].id;
          token.pegRole = pegUser[0].role;
          token.pegIsAdmin = pegUser[0].isAdmin;
          token.pegTenantId = pegUser[0].tenantId;

          // Activate user on first login if not yet activated
          if (!pegUser[0].activatedAt) {
            await db
              .update(users)
              .set({ activatedAt: new Date(), updatedAt: new Date() })
              .where(eq(users.id, pegUser[0].id));
          }
        } else {
          token.pegUserId = undefined;
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
      }
      return session;
    },
    async signIn({ profile }) {
      if (!profile?.sub) return false;

      // Check if user exists in PEG
      const pegUser = await db
        .select({ id: users.id, isActive: users.isActive })
        .from(users)
        .where(eq(users.keycloakSub, profile.sub))
        .limit(1);

      // Deny access if user not provisioned or deactivated
      if (!pegUser[0] || !pegUser[0].isActive) {
        return false;
      }

      return true;
    },
  },
  pages: {
    signIn: "/login",
    error: "/auth-error",
  },
  session: {
    strategy: "jwt",
  },
});
