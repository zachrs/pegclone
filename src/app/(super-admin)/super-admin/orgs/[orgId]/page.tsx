"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getOrganization,
  updateOrganization,
  getOrgUsersForSuperAdmin,
  createUserForOrg,
  overrideSmsThrottle,
} from "@/lib/actions/admin";
import { toast } from "sonner";
import type { UserRole } from "@/lib/db/types";

interface OrgData {
  id: string;
  name: string;
  slug: string;
  primaryColor: string | null;
  smsSendCountMonth: number | null;
  smsThrottled: boolean | null;
  createdAt: Date;
}

interface UserRow {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isAdmin: boolean | null;
  isActive: boolean | null;
  title: string | null;
  activatedAt: Date | null;
  deactivatedAt: Date | null;
}

export default function OrgDetailPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  const [org, setOrg] = useState<OrgData | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editColor, setEditColor] = useState("#2563eb");

  const loadOrg = useCallback(() => {
    getOrganization(orgId)
      .then((data) => {
        if (data) {
          setOrg(data as OrgData);
          setEditName(data.name);
          setEditSlug(data.slug);
          setEditColor(data.primaryColor ?? "#2563eb");
        }
      })
      .catch(() => {});
  }, [orgId]);

  const loadUsers = useCallback(() => {
    getOrgUsersForSuperAdmin(orgId)
      .then((data) => setUsers(data as UserRow[]))
      .catch(() => {});
  }, [orgId]);

  useEffect(() => { loadOrg(); loadUsers(); }, [loadOrg, loadUsers]);

  const handleSaveOrg = async () => {
    await updateOrganization(orgId, {
      name: editName.trim(),
      slug: editSlug.trim(),
      primaryColor: editColor,
    });
    toast.success("Organization updated");
    setEditing(false);
    loadOrg();
  };

  const handleUnlockSms = async () => {
    await overrideSmsThrottle(orgId);
    toast.success("SMS throttle unlocked");
    loadOrg();
  };

  if (!org) {
    return (
      <>
        <Header title="Organization Details" />
        <main className="flex-1 p-6">
          <p className="text-muted-foreground">Loading...</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Header title={org.name} />
      <main className="flex-1 overflow-auto p-6">
        <div className="mb-2">
          <a href="/super-admin/orgs" className="text-sm text-blue-600 hover:underline">&larr; Back to Organizations</a>
        </div>

        {/* Org details */}
        <div className="mb-8 rounded-lg border bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Organization Details</h2>
            {!editing && <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>}
          </div>

          {editing ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="edit-slug">Slug</Label>
                <Input id="edit-slug" value={editSlug} onChange={(e) => setEditSlug(e.target.value)} className="mt-1 font-mono" />
              </div>
              <div>
                <Label htmlFor="edit-color">Primary Color</Label>
                <div className="mt-1 flex items-center gap-3">
                  <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} className="h-10 w-14 cursor-pointer rounded border p-1" />
                  <Input id="edit-color" value={editColor} onChange={(e) => setEditColor(e.target.value)} className="font-mono" maxLength={7} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveOrg}>Save</Button>
                <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-xs text-muted-foreground">Name</dt>
                <dd className="font-medium">{org.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Slug</dt>
                <dd className="font-mono text-sm">{org.slug}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Primary Color</dt>
                <dd className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded" style={{ backgroundColor: org.primaryColor ?? "#888" }} />
                  <span className="font-mono text-sm">{org.primaryColor ?? "—"}</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Created</dt>
                <dd className="text-sm">{new Date(org.createdAt).toLocaleDateString()}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">SMS This Month</dt>
                <dd className="flex items-center gap-2">
                  <span className={(org.smsSendCountMonth ?? 0) >= 18000 ? "font-medium text-red-600" : ""}>
                    {(org.smsSendCountMonth ?? 0).toLocaleString()} / 20,000
                  </span>
                  {org.smsThrottled && <Badge className="bg-red-100 text-red-700">Throttled</Badge>}
                </dd>
              </div>
              {org.smsThrottled && (
                <div>
                  <Button variant="outline" size="sm" className="text-blue-600" onClick={handleUnlockSms}>
                    Unlock SMS
                  </Button>
                </div>
              )}
            </dl>
          )}
        </div>

        {/* Users */}
        <div className="rounded-lg border bg-white">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Users ({users.length})
            </h2>
            <Button size="sm" onClick={() => setShowCreateUser(true)}>Add User</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Activated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.fullName}</TableCell>
                  <TableCell className="font-mono text-sm">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.isAdmin && (
                      <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">Admin</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={user.isActive ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-red-100 text-red-700 hover:bg-red-100"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{user.title ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.activatedAt ? new Date(user.activatedAt).toLocaleDateString() : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No users in this organization yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      <CreateUserDialog
        open={showCreateUser}
        onClose={() => setShowCreateUser(false)}
        onCreate={async (params) => {
          await createUserForOrg(orgId, params);
          toast.success(`User "${params.fullName}" created`);
          loadUsers();
        }}
      />
    </>
  );
}

function CreateUserDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (p: { fullName: string; email: string; password: string; role: UserRole; isAdmin: boolean; title?: string }) => Promise<void>;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("org_user");
  const [isAdmin, setIsAdmin] = useState(false);
  const [title, setTitle] = useState("");

  const handleSubmit = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) return;
    await onCreate({
      fullName: fullName.trim(),
      email: email.trim(),
      password,
      role,
      isAdmin,
      title: title.trim() || undefined,
    });
    setFullName("");
    setEmail("");
    setPassword("");
    setRole("org_user");
    setIsAdmin(false);
    setTitle("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Create User</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="cu-name">Full Name</Label>
            <Input id="cu-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Dr. Jane Doe" />
          </div>
          <div>
            <Label htmlFor="cu-email">Email</Label>
            <Input id="cu-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane.doe@org.com" />
          </div>
          <div>
            <Label htmlFor="cu-password">Temporary Password</Label>
            <Input id="cu-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div>
            <Label htmlFor="cu-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="org_user">Org User</SelectItem>
                <SelectItem value="provider">Provider</SelectItem>
                <SelectItem value="cs_rep">CS Rep</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="cu-title">Title (optional)</Label>
            <Input id="cu-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="MD, RN, DO" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="cu-admin" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
            <Label htmlFor="cu-admin" className="text-sm">Org Admin</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!fullName.trim() || !email.trim() || !password.trim()}>Create User</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
