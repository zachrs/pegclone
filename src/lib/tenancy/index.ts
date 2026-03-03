import { eq, type SQL, type Column } from "drizzle-orm";

/**
 * Creates a tenant-scoped query helper.
 *
 * Usage:
 *   const tenant = withTenant(tenantId);
 *   const items = await db.select().from(contentItems).where(tenant.eq(contentItems.tenantId));
 *   await db.insert(contentItems).values(tenant.insert({ title: "..." }));
 */
export function withTenant(tenantId: string) {
  return {
    /** Returns a SQL condition: `column = tenantId` */
    eq(column: Column): SQL {
      return eq(column, tenantId);
    },

    /** Merges tenantId into insert values */
    insert<T extends Record<string, unknown>>(
      values: T
    ): T & { tenantId: string } {
      return { ...values, tenantId: tenantId };
    },

    /** Returns the raw tenant ID */
    id: tenantId,
  };
}

/**
 * Validates that a tenant ID is present and returns it.
 * Throws if the tenant ID is missing.
 */
export function requireTenantId(tenantId: string | null | undefined): string {
  if (!tenantId) {
    throw new Error("Tenant ID is required but was not provided");
  }
  return tenantId;
}
