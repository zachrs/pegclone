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
import {
  LayoutDashboard,
  Library,
  Send,
  Users,
  BarChart3,
  ArrowLeft,
  Palette,
  Bell,
  Settings,
  Building2,
  UserCog,
  Megaphone,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", permission: "library.view" as const, icon: LayoutDashboard },
  { label: "Library", href: "/library", permission: "library.view" as const, icon: Library },
  { label: "Send", href: "/send", permission: "send.create" as const, icon: Send },
  { label: "Campaigns", href: "/campaigns", permission: "send.create" as const, icon: Megaphone },
  { label: "Recipients", href: "/recipients", permission: "recipients.view" as const, icon: Users },
  { label: "Analytics", href: "/analytics", permission: "analytics.personal" as const, icon: BarChart3 },
];

const ADMIN_ITEMS = [
  { label: "Users", href: "/admin/users", icon: UserCog },
  { label: "Branding", href: "/admin/branding", icon: Palette },
  { label: "Reminders", href: "/admin/reminders", icon: Bell },
  { label: "Settings", href: "/admin/settings", icon: Settings },
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
          <Link href="/library" className="flex items-center gap-2">
            <img src="/logo.svg" alt="Patient Education Genius" className="h-8" />
          </Link>
        </SidebarHeader>

        <SidebarContent>
          <nav aria-label="Admin navigation">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href="/library" className="gap-2.5 text-muted-foreground">
                        <ArrowLeft className="h-4 w-4" />
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
                          <Link href={item.href} aria-current={isActive ? "page" : undefined} className="gap-2.5">
                            <item.icon className="h-4 w-4" />
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
                        <Link href="/super-admin/orgs" className="gap-2.5">
                          <Building2 className="h-4 w-4" />
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

  // Default app sidebar
  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/library" className="flex items-center gap-2">
          <img src="/logo.svg" alt="Patient Education Genius" className="h-8" />
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
                        <Link href={item.href} aria-current={isActive ? "page" : undefined} className="gap-2.5">
                          <item.icon className="h-4 w-4" />
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
                    <SidebarMenuButton asChild isActive={isSuperAdminRoute}>
                      <Link href="/super-admin/orgs" aria-current={isSuperAdminRoute ? "page" : undefined} className="gap-2.5">
                        <Building2 className="h-4 w-4" />
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
