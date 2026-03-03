"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { can } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/db/types";
import { UserMenu } from "./user-menu";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    permission: "library.view" as const,
  },
  {
    label: "Library",
    href: "/library",
    permission: "library.view" as const,
  },
  {
    label: "Send",
    href: "/send",
    permission: "send.create" as const,
  },
  {
    label: "Recipients",
    href: "/recipients",
    permission: "recipients.view" as const,
  },
  {
    label: "Analytics",
    href: "/analytics",
    permission: "analytics.personal" as const,
  },
];

const ADMIN_ITEMS = [
  { label: "Users", href: "/admin/users" },
  { label: "Branding", href: "/admin/branding" },
  { label: "Reminders", href: "/admin/reminders" },
  { label: "Settings", href: "/admin/settings" },
];

export function AppSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (!session?.user) return null;

  const { role, isAdmin } = session.user;
  const userRole = role as UserRole;

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/library" className="text-lg font-semibold">
          PEG
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <nav aria-label="Main navigation">
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.filter((item) =>
                  can(userRole, isAdmin, item.permission)
                ).map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link
                          href={item.href}
                          aria-current={isActive ? "page" : undefined}
                        >
                          {item.label}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {(isAdmin || userRole === "super_admin") && (
            <SidebarGroup>
              <SidebarGroupLabel>Administration</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {ADMIN_ITEMS.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link
                            href={item.href}
                            aria-current={isActive ? "page" : undefined}
                          >
                            {item.label}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {userRole === "super_admin" && (
            <SidebarGroup>
              <SidebarGroupLabel>Platform</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith("/super-admin")}
                    >
                      <Link
                        href="/super-admin/orgs"
                        aria-current={
                          pathname.startsWith("/super-admin")
                            ? "page"
                            : undefined
                        }
                      >
                        Organizations
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </nav>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
