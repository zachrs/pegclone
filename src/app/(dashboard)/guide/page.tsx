"use client";

import { Header } from "@/components/layout/header";
import {
  BookOpen,
  Search,
  Heart,
  FolderOpen,
  Send,
  Mail,
  MessageSquare,
  QrCode,
  Upload,
  BarChart3,
  Activity,
  UserCog,
  Palette,
  Bell,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

interface GuideSection {
  id: string;
  icon: React.ReactNode;
  title: string;
  content: React.ReactNode;
}

function Collapsible({ title, icon, children, defaultOpen }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 p-5 text-left transition-colors hover:bg-muted/30"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <span className="flex-1 font-semibold">{title}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="border-t px-5 pb-5 pt-4 text-sm leading-relaxed text-muted-foreground">{children}</div>}
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 mt-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {n}
      </span>
      <p className="pt-0.5">{children}</p>
    </div>
  );
}

export default function GuidePage() {
  return (
    <>
      <Header title="How-To Guide" />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl animate-fade-in-up">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight">
              How to Use Patient Education Genius
            </h2>
            <p className="mt-1 text-muted-foreground">
              Everything you need to know to find, organize, and send patient education materials.
            </p>
          </div>

          <div className="space-y-3">
            {/* Getting Started */}
            <Collapsible
              title="Getting Started"
              icon={<BookOpen className="h-4 w-4" />}
              defaultOpen
            >
              <p>
                Patient Education Genius (PEG) helps you send patient education materials via
                <strong> email</strong>, <strong>SMS</strong>, or <strong>QR code</strong>.
                Here&apos;s the typical workflow:
              </p>
              <Step n={1}>
                <strong>Browse</strong> the Content Library to find relevant education materials.
              </Step>
              <Step n={2}>
                <strong>Add items to your cart</strong> by clicking the &quot;+&quot; button on any content card.
              </Step>
              <Step n={3}>
                <strong>Send</strong> the selected content to patients through your preferred delivery channel.
              </Step>
              <Step n={4}>
                <strong>Track</strong> delivery status, opens, and engagement on the Tracking and Analytics pages.
              </Step>
            </Collapsible>

            {/* Content Library */}
            <Collapsible
              title="Browsing the Content Library"
              icon={<Search className="h-4 w-4" />}
            >
              <p>
                The <strong>Library</strong> page is your central hub for finding patient education content.
                It has two main tabs:
              </p>
              <div className="mt-3 space-y-2">
                <p>
                  <strong>My Materials</strong> — Content uploaded by your organization, plus any items you&apos;ve
                  favorited from the PEG Library. This is your default view.
                </p>
                <p>
                  <strong>PEG Library</strong> — Search over 40,000 curated patient education resources
                  from trusted sources. Type a topic in the search bar to find materials.
                </p>
              </div>
              <p className="mt-3">
                Toggle between <strong>grid</strong> and <strong>list</strong> views using the icons
                in the top-right corner. Click any content card to preview the material.
              </p>
            </Collapsible>

            {/* Favorites & Folders */}
            <Collapsible
              title="Favorites & Folders"
              icon={<Heart className="h-4 w-4" />}
            >
              <p>
                Keep your most-used materials organized and easy to find.
              </p>
              <Step n={1}>
                <strong>Favorite</strong> any item by clicking the heart icon. Favorited items from both
                your organization&apos;s uploads and the PEG Library appear together in My Materials.
              </Step>
              <Step n={2}>
                <strong>Create folders</strong> using the folder sidebar on the left side of the Library
                page. Folders help you group content by topic, department, or any system that works for you.
              </Step>
              <Step n={3}>
                <strong>Add items to folders</strong> to quickly access curated sets of content
                when you need them.
              </Step>
            </Collapsible>

            {/* Uploading Content */}
            <Collapsible
              title="Uploading Your Own Content"
              icon={<Upload className="h-4 w-4" />}
            >
              <p>
                Your organization can upload custom education materials to share with your team.
              </p>
              <Step n={1}>
                Go to the <strong>Library</strong> page and make sure you&apos;re on the
                <strong> My Materials</strong> tab with no folder selected.
              </Step>
              <Step n={2}>
                Click the <strong>&quot;Add Content&quot;</strong> button in the top-right corner.
              </Step>
              <Step n={3}>
                Choose to upload a <strong>PDF file</strong> or add a <strong>link</strong> to
                an external resource. Give it a descriptive title.
              </Step>
              <p className="mt-3">
                Uploaded content is available to everyone in your organization.
              </p>
            </Collapsible>

            {/* Sending Content */}
            <Collapsible
              title="Sending Content to Patients"
              icon={<Send className="h-4 w-4" />}
            >
              <p>
                The Send Wizard walks you through a 4-step process to deliver education materials.
              </p>
              <Step n={1}>
                <strong>Review Content</strong> — Confirm the items in your cart. Reorder them by
                dragging, remove unwanted items, and optionally add a personal note.
              </Step>
              <Step n={2}>
                <strong>Add Recipients</strong> — Enter a patient&apos;s contact info directly,
                search your recipient roster, or upload a spreadsheet for bulk sends.
              </Step>
              <Step n={3}>
                <strong>Configure Delivery</strong> — Choose your delivery channel:
              </Step>
              <div className="ml-9 mt-2 space-y-1.5">
                <p className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-primary" />
                  <strong>Email</strong> — Sends a branded email with links to the content.
                </p>
                <p className="flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-green-600" />
                  <strong>SMS</strong> — Sends a text message with a link to view the content.
                </p>
                <p className="flex items-center gap-2">
                  <QrCode className="h-3.5 w-3.5 text-amber-600" />
                  <strong>QR Code</strong> — Generates a scannable QR code that opens the content. Great for in-office use.
                </p>
              </div>
              <p className="mt-3 ml-9">
                You can also schedule sends for later and configure automatic reminders.
              </p>
              <Step n={4}>
                <strong>Preview & Send</strong> — Review everything one final time, then hit send.
              </Step>
            </Collapsible>

            {/* Tracking */}
            <Collapsible
              title="Tracking Deliveries"
              icon={<Activity className="h-4 w-4" />}
            >
              <p>
                The <strong>Tracking</strong> page gives you real-time visibility into your sent messages.
              </p>
              <div className="mt-3 space-y-2">
                <p>
                  <strong>Recipients tab</strong> — View individual message status (sent, delivered, opened, failed),
                  filter by date range, and see recipient details.
                </p>
                <p>
                  <strong>Campaigns tab</strong> — Track bulk sends as campaigns. See delivery rates and
                  open rates at a glance.
                </p>
              </div>
              <p className="mt-3">
                Click on any campaign to drill into its individual recipient-level details.
              </p>
            </Collapsible>

            {/* Analytics */}
            <Collapsible
              title="Understanding Analytics"
              icon={<BarChart3 className="h-4 w-4" />}
            >
              <p>
                The <strong>Analytics</strong> page provides insights into your engagement metrics.
              </p>
              <div className="mt-3 space-y-2">
                <p>
                  <strong>Key metrics</strong> — Total messages sent, delivery rate, open rate, and
                  click-through rate at a glance.
                </p>
                <p>
                  <strong>Date filtering</strong> — View data for the last 7 days, 30 days, 90 days, or all time.
                </p>
                <p>
                  <strong>Top content</strong> — See which education materials are most frequently sent
                  and have the highest engagement.
                </p>
              </div>
            </Collapsible>

            {/* Admin Features */}
            <Collapsible
              title="Admin: Managing Users"
              icon={<UserCog className="h-4 w-4" />}
            >
              <p>
                Organization admins can manage team members from the <strong>Admin &gt; Users</strong> page.
              </p>
              <Step n={1}>
                <strong>Invite users</strong> — Click &quot;Invite User&quot; to send an email invitation.
                Set their role (provider, staff, or admin) during invite.
              </Step>
              <Step n={2}>
                <strong>Manage roles</strong> — Adjust user roles and admin privileges as needed.
                Admins can access the Admin section; providers and staff cannot.
              </Step>
              <Step n={3}>
                <strong>Deactivate users</strong> — Disable accounts for users who have left without
                deleting their data.
              </Step>
            </Collapsible>

            {/* Admin Branding */}
            <Collapsible
              title="Admin: Branding & Settings"
              icon={<Palette className="h-4 w-4" />}
            >
              <div className="space-y-3">
                <p>
                  <strong>Branding</strong> — Customize the look of patient-facing emails and viewer
                  pages. Upload your organization&apos;s logo and set your brand color so patients see
                  a consistent, professional experience.
                </p>
                <p>
                  <strong>Reminders</strong> — Configure default reminder settings for your organization.
                  Set how many reminders to send and the interval between them. Individual sends can
                  override these defaults.
                </p>
                <p>
                  <strong>Settings</strong> — Manage organization-level configuration, including your
                  organization name and other preferences.
                </p>
              </div>
            </Collapsible>

            {/* Tips */}
            <Collapsible
              title="Tips & Best Practices"
              icon={<Bell className="h-4 w-4" />}
            >
              <ul className="list-disc pl-5 space-y-2 mt-1">
                <li>
                  <strong>Use folders for common workflows</strong> — Create folders like
                  &quot;Post-Op Instructions&quot; or &quot;New Patient Welcome&quot; to quickly
                  access frequently-sent bundles.
                </li>
                <li>
                  <strong>Favorite your go-to items</strong> — Favorited items from the PEG Library
                  appear in My Materials, so you don&apos;t have to search each time.
                </li>
                <li>
                  <strong>Add personal notes</strong> — When sending content, include a brief
                  personal note to increase patient engagement.
                </li>
                <li>
                  <strong>Use QR codes in-office</strong> — Generate a QR code and display it
                  on a screen or print it. Patients scan with their phone for instant access.
                </li>
                <li>
                  <strong>Monitor your open rates</strong> — Check Analytics regularly.
                  If open rates are low, consider switching delivery channels or sending at
                  different times.
                </li>
                <li>
                  <strong>Enable reminders</strong> — Automatic reminders significantly improve
                  open rates for email and SMS sends.
                </li>
              </ul>
            </Collapsible>
          </div>
        </div>
      </main>
    </>
  );
}
