import { eq } from "drizzle-orm";
import type { Column } from "drizzle-orm";

/**
 * Tenant-scoping helper.
 * Usage:
 *   const tenant = withTenant(tenantId);
 *   db.select().from(table).where(tenant.eq(table.tenantId));
 */
export function withTenant(tenantId: string) {
  return {
    eq: (column: Column) => eq(column, tenantId),
  };
}
