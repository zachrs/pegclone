"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getOrgUsers,
  inviteUser,
  updateUser as updateUserAction,
  deactivateUser as deactivateUserAction,
  reactivateUser as reactivateUserAction,
  resetUserPassword as resetUserPasswordAction,
  resendInvite as resendInviteAction,
} from "@/lib/actions/admin";
import type { UserRole } from "@/lib/db/types";
import { toast } from "sonner";
import {
  UserPlus,
  Search,
  Download,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  MailPlus,
} from "lucide-react";

interface OrgUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isAdmin: boolean;
  isActive: boolean;
  title: string | null;
  activatedAt: Date | string | null;
  deactivatedAt: Date | string | null;
  inviteTokenHash: string | null;
  inviteExpiresAt: Date | string | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<OrgUser | null>(null);
  const [resetUser, setResetUser] = useState<OrgUser | null>(null);
  const [search, setSearch] = useState("");

  const loadUsers = useCallback(() => {
    getOrgUsers()
      .then((data) => setUsers(data as OrgUser[]))
      .catch(() => {});
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const filtered = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = users.filter((u) => u.isActive).length;
  const adminCount = users.filter((u) => u.isAdmin && u.isActive).length;
  const pendingCount = users.filter((u) => !u.isActive && u.inviteTokenHash).length;

  const handleExportCSV = () => {
    const rows = [
      ["Name", "Email", "Role", "Admin", "Status", "Activated", "Deactivated"],
      ...users.map((u) => [
        u.fullName,
        u.email,
        u.role,
        u.isAdmin ? "Yes" : "No",
        getUserStatus(u),
        u.activatedAt ? new Date(u.activatedAt).toLocaleDateString() : "",
        u.deactivatedAt ? new Date(u.deactivatedAt).toLocaleDateString() : "",
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeactivate = async (u: OrgUser) => {
    try {
      await deactivateUserAction(u.id);
      toast.success(`${u.fullName} deactivated`);
      loadUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to deactivate user");
    }
  };

  const handleReactivate = async (u: OrgUser) => {
    try {
      await reactivateUserAction(u.id);
      toast.success(`${u.fullName} reactivated`);
      loadUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to reactivate user");
    }
  };

  const handleResendInvite = async (u: OrgUser) => {
    try {
      const result = await resendInviteAction(u.id);
      if (result.success) {
        toast.success(`Invitation resent to ${u.email}`);
        loadUsers();
      } else {
        toast.error(result.error ?? "Failed to resend invite");
      }
    } catch {
      toast.error("Failed to resend invite");
    }
  };

  return (
    <>
      <Header title="User Management" />
      <main className="flex-1 overflow-auto p-6">
        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Active Users</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <UserPlus className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{adminCount}</p>
                <p className="text-xs text-muted-foreground">Admins</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pending Invites</p>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search users"
              className="max-w-xs pl-8"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportCSV}>
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
              <Send className="h-3.5 w-3.5" />
              Invite User
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-24">Role</TableHead>
                <TableHead className="w-20">Admin</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-28">Since</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id} className={!u.isActive && !u.inviteTokenHash ? "opacity-50" : ""}>
                  <TableCell className="font-medium">
                    <div>
                      {u.fullName}
                      {u.title && <span className="ml-2 text-xs text-muted-foreground">{u.title}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{u.email}</TableCell>
                  <TableCell><RoleBadge role={u.role} /></TableCell>
                  <TableCell>
                    {u.isAdmin && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Admin</Badge>}
                  </TableCell>
                  <TableCell>
                    <UserStatusBadge user={u} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.activatedAt ? new Date(u.activatedAt).toLocaleDateString() : "\u2014"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {u.inviteTokenHash && !u.isActive ? (
                        <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => handleResendInvite(u)}>
                          <MailPlus className="h-3.5 w-3.5" />
                          Resend
                        </Button>
                      ) : (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => setEditUser(u)}>Edit</Button>
                          <Button variant="ghost" size="sm" onClick={() => setResetUser(u)}>Reset PW</Button>
                          {u.isActive ? (
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDeactivate(u)}>
                              Deactivate
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700" onClick={() => handleReactivate(u)}>
                              Reactivate
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No users found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      <InviteUserDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onInvite={async (params) => {
          const result = await inviteUser(params);
          if (result.success) {
            toast.success(`Invitation sent to ${params.email}`);
            loadUsers();
          } else {
            toast.error(result.error ?? "Failed to invite user");
          }
        }}
      />

      {editUser && (
        <EditUserDialog
          user={editUser}
          onClose={() => setEditUser(null)}
          onSave={async (updates) => {
            try {
              await updateUserAction(editUser.id, updates);
              setEditUser(null);
              toast.success(`User ${editUser.fullName} updated`);
              loadUsers();
            } catch (err: unknown) {
              toast.error(err instanceof Error ? err.message : "Failed to update user");
            }
          }}
        />
      )}

      {resetUser && (
        <ResetPasswordDialog
          user={resetUser}
          onClose={() => setResetUser(null)}
          onReset={async (newPassword) => {
            try {
              await resetUserPasswordAction(resetUser.id, newPassword);
              setResetUser(null);
              toast.success(`Password reset for ${resetUser.fullName}`);
            } catch (err: unknown) {
              toast.error(err instanceof Error ? err.message : "Failed to reset password");
            }
          }}
        />
      )}
    </>
  );
}

function getUserStatus(u: OrgUser): string {
  if (u.inviteTokenHash && !u.isActive) return "Invited";
  if (u.isActive) return "Active";
  return "Deactivated";
}

function UserStatusBadge({ user }: { user: OrgUser }) {
  if (user.inviteTokenHash && !user.isActive) {
    const expired = user.inviteExpiresAt && new Date(user.inviteExpiresAt) < new Date();
    if (expired) {
      return (
        <Badge variant="outline" className="gap-1 border-red-200 bg-red-50 text-red-700">
          <XCircle className="h-3 w-3" />
          Expired
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 border-amber-200 bg-amber-50 text-amber-700">
        <Clock className="h-3 w-3" />
        Invited
      </Badge>
    );
  }
  if (user.isActive) {
    return (
      <Badge className="gap-1 bg-green-100 text-green-700 hover:bg-green-100">
        <CheckCircle2 className="h-3 w-3" />
        Active
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-red-600">
      <XCircle className="h-3 w-3" />
      Deactivated
    </Badge>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  const styles: Record<string, string> = {
    provider: "bg-teal-100 text-teal-700",
    org_user: "bg-gray-100 text-gray-700",
    cs_rep: "bg-yellow-100 text-yellow-700",
    super_admin: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = { provider: "Provider", org_user: "Org User", cs_rep: "CS Rep", super_admin: "Super Admin" };
  return <Badge className={`${styles[role] ?? "bg-gray-100 text-gray-700"} hover:${styles[role]}`}>{labels[role] ?? role}</Badge>;
}

function InviteUserDialog({ open, onClose, onInvite }: {
  open: boolean;
  onClose: () => void;
  onInvite: (p: { fullName: string; email: string; role: UserRole; isAdmin: boolean; title?: string }) => Promise<void>;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("org_user");
  const [isAdmin, setIsAdmin] = useState(false);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!fullName.trim() || !email.trim()) return;
    setSubmitting(true);
    try {
      await onInvite({ fullName: fullName.trim(), email: email.trim(), role, isAdmin, title: title.trim() || undefined });
      setFullName(""); setEmail(""); setRole("org_user"); setIsAdmin(false); setTitle("");
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            Invite User
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          An email invitation will be sent with a link to set their password.
        </p>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="invite-fullname">Full Name</Label>
            <Input id="invite-fullname" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Dr. Jane Smith" />
          </div>
          <div>
            <Label htmlFor="invite-email">Email</Label>
            <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane.smith@org.com" />
          </div>
          <div>
            <Label htmlFor="invite-title">Title (optional)</Label>
            <Input id="invite-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="OB/GYN, MD" />
          </div>
          <div>
            <Label htmlFor="invite-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="org_user">Org User</SelectItem>
                <SelectItem value="provider">Provider</SelectItem>
                <SelectItem value="cs_rep">CS Rep</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="invite-admin" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
            <Label htmlFor="invite-admin" className="text-sm">Grant admin privileges</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!fullName.trim() || !email.trim() || submitting} className="gap-1.5">
            <Send className="h-3.5 w-3.5" />
            {submitting ? "Sending..." : "Send Invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({ user, onClose, onSave }: { user: OrgUser; onClose: () => void; onSave: (u: { role?: UserRole; isAdmin?: boolean; title?: string | null }) => Promise<void> }) {
  const [role, setRole] = useState<UserRole>(user.role);
  const [isAdmin, setIsAdmin] = useState(user.isAdmin);
  const [title, setTitle] = useState(user.title ?? "");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit User \u2014 {user.fullName}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div><Label className="text-muted-foreground">Email</Label><p className="font-mono text-sm">{user.email}</p></div>
          <div><Label htmlFor="edit-title">Title</Label><Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="OB/GYN, MD" /></div>
          <div>
            <Label htmlFor="edit-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="org_user">Org User</SelectItem>
                <SelectItem value="provider">Provider</SelectItem>
                <SelectItem value="cs_rep">CS Rep</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="edit-admin" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
            <Label htmlFor="edit-admin" className="text-sm">Grant admin privileges</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ role, isAdmin, title: title.trim() || null })}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ user, onClose, onReset }: { user: OrgUser; onClose: () => void; onReset: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (password.length < 8) return;
    setLoading(true);
    try {
      await onReset(password);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Reset Password \u2014 {user.fullName}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Set a new password for <span className="font-medium text-foreground">{user.email}</span>.
            The user will need to use this new password on their next login.
          </p>
          <div>
            <Label htmlFor="reset-password">New Password</Label>
            <Input
              id="reset-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
            />
            {password.length > 0 && password.length < 8 && (
              <p className="mt-1 text-xs text-red-500">Password must be at least 8 characters</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={password.length < 8 || loading}>
            {loading ? "Resetting..." : "Reset Password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
