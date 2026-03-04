"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getOrgInfo } from "@/lib/actions/auth";
import { Building2 } from "lucide-react";
import Link from "next/link";

/**
 * Shows a small banner for super admins reminding them which org they are working in.
 * Only visible on non-super-admin routes (library, admin, etc).
 */
export function OrgContextBanner() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [orgName, setOrgName] = useState<string | null>(null);

  const isSuperAdmin = session?.user?.role === "super_admin";
  const isSuperAdminRoute = pathname.startsWith("/super-admin");

  useEffect(() => {
    if (isSuperAdmin && !isSuperAdminRoute) {
      getOrgInfo()
        .then((info) => setOrgName(info.name))
        .catch(() => {});
    }
  }, [isSuperAdmin, isSuperAdminRoute]);

  if (!isSuperAdmin || isSuperAdminRoute || !orgName) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b bg-indigo-50 px-4 py-1.5 text-xs text-indigo-700">
      <div className="flex items-center gap-1.5">
        <Building2 className="h-3.5 w-3.5" />
        <span>
          Working in: <strong>{orgName}</strong>
        </span>
      </div>
      <Link
        href="/super-admin/orgs"
        className="font-medium underline underline-offset-2 hover:text-indigo-900"
      >
        Switch org
      </Link>
    </div>
  );
}
