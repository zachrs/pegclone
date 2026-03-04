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
  {
    label: "Profile",
    href: "/profile",
    permission: "library.view" as const,
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
  const isAdminRoute = pathname.startsWith("/admin");
  const isSuperAdminRoute = pathname.startsWith("/super-admin");

  // Admin-specific sidebar
  if (isAdminRoute) {
    return (
      <Sidebar>
        <SidebarHeader className="p-4">
          <Link href="/library" className="text-lg font-semibold">
            PEG
          </Link>
        </SidebarHeader>

        <SidebarContent>
          <nav aria-label="Admin navigation">
            {/* Back link */}
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link
                        href="/library"
                        className="gap-2 text-muted-foreground"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M10 12L6 8l4-4" />
                        </svg>
                        Back to App
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

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

            {userRole === "super_admin" && (
              <SidebarGroup>
                <SidebarGroupLabel>Platform</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link href="/super-admin/orgs">Organizations</Link>
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

  // Default app sidebar
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
                  const isActive =
                    pathname.startsWith(item.href) &&
                    !isAdminRoute &&
                    !isSuperAdminRoute;
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

          {userRole === "super_admin" && (
            <SidebarGroup>
              <SidebarGroupLabel>Platform</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isSuperAdminRoute}
                    >
                      <Link
                        href="/super-admin/orgs"
                        aria-current={
                          isSuperAdminRoute ? "page" : undefined
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
