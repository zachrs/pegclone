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
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Library,
  BarChart3,
  ArrowLeft,
  Palette,
  Bell,
  Settings,
  Building2,
  UserCog,
  Activity,
  HelpCircle,
  CalendarClock,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", permission: "library.view" as const, icon: LayoutDashboard },
  { label: "Library", href: "/library", permission: "library.view" as const, icon: Library },
  { label: "Campaigns", href: "/campaigns/templates", permission: "send.create" as const, icon: CalendarClock },
  { label: "Tracking", href: "/tracking", permission: "send.create" as const, icon: Activity },
  { label: "Analytics", href: "/analytics", permission: "analytics.personal" as const, icon: BarChart3 },
  { label: "How-To Guide", href: "/guide", permission: "library.view" as const, icon: HelpCircle },
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

  // Super-admin platform sidebar
  if (isSuperAdminRoute) {
    return (
      <Sidebar>
        <SidebarHeader className="p-4">
          <Link href="/super-admin/orgs" className="flex items-center gap-2">
            <img src="/PEG transparent.png" alt="Patient Education Genius" className="h-8" />
          </Link>
        </SidebarHeader>

        <SidebarContent>
          <nav aria-label="Platform navigation">
            <SidebarGroup>
              <SidebarGroupLabel>Platform</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem className="relative">
                    {pathname.startsWith("/super-admin/orgs") && (
                      <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary animate-fade-in-scale" />
                    )}
                    <SidebarMenuButton asChild isActive={pathname.startsWith("/super-admin/orgs")}>
                      <Link href="/super-admin/orgs" className={cn("gap-2.5 transition-all duration-150", pathname.startsWith("/super-admin/orgs") && "font-semibold")}>
                        <Building2 className={cn("h-4 w-4 transition-colors", pathname.startsWith("/super-admin/orgs") && "text-primary")} />
                        Organizations
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>My Organization</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href="/library" className="gap-2.5 text-muted-foreground">
                        <Library className="h-4 w-4" />
                        Library
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href="/admin/users" className="gap-2.5 text-muted-foreground">
                        <Settings className="h-4 w-4" />
                        Admin Settings
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </nav>
        </SidebarContent>

        <SidebarFooter className="p-4">
          <UserMenu />
        </SidebarFooter>
      </Sidebar>
    );
  }

  // Admin-specific sidebar
  if (isAdminRoute) {
    return (
      <Sidebar>
        <SidebarHeader className="p-4">
          <Link href="/library" className="flex items-center gap-2">
            <img src="/PEG transparent.png" alt="Patient Education Genius" className="h-8" />
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
                      <SidebarMenuItem key={item.href} className="relative">
                        {isActive && (
                          <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary animate-fade-in-scale" />
                        )}
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link
                            href={item.href}
                            aria-current={isActive ? "page" : undefined}
                            className={cn(
                              "gap-2.5 transition-all duration-150",
                              isActive && "font-semibold"
                            )}
                          >
                            <item.icon className={cn("h-4 w-4 transition-colors", isActive && "text-primary")} />
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
          <img src="/PEG transparent.png" alt="Patient Education Genius" className="h-8" />
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
                    <SidebarMenuItem key={item.href} className="relative">
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary animate-fade-in-scale" />
                      )}
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link
                          href={item.href}
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "gap-2.5 transition-all duration-150",
                            isActive && "font-semibold"
                          )}
                        >
                          <item.icon className={cn("h-4 w-4 transition-colors", isActive && "text-primary")} />
                          {item.label}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

        </nav>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
