"use client";

import { useState } from "react";
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
import { useAdminStore, type OrgUser } from "@/lib/hooks/use-admin-store";
import type { UserRole } from "@/lib/db/types";

export default function AdminUsersPage() {
  const { users, addUser, updateUser, deactivateUser, reactivateUser } =
    useAdminStore();
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<OrgUser | null>(null);
  const [search, setSearch] = useState("");

  const filtered = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = users.filter((u) => u.isActive).length;
  const adminCount = users.filter((u) => u.isAdmin && u.isActive).length;
  const providerCount = users.filter(
    (u) => u.role === "provider" && u.isActive
  ).length;

  const handleExportCSV = () => {
    const rows = [
      ["Name", "Email", "Role", "Admin", "Status", "Activated", "Deactivated"],
      ...users.map((u) => [
        u.fullName,
        u.email,
        u.role,
        u.isAdmin ? "Yes" : "No",
        u.isActive ? "Active" : "Deactivated",
        u.activatedAt
          ? new Date(u.activatedAt).toLocaleDateString()
          : "",
        u.deactivatedAt
          ? new Date(u.deactivatedAt).toLocaleDateString()
          : "",
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

  return (
    <>
      <Header title="User Management" />
      <main className="flex-1 overflow-auto p-6">
        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-lg border bg-white p-4">
            <p className="text-2xl font-bold">{activeCount}</p>
            <p className="text-xs text-muted-foreground">Active Users</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-2xl font-bold text-purple-700">{providerCount}</p>
            <p className="text-xs text-muted-foreground">Providers</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-2xl font-bold text-blue-600">{adminCount}</p>
            <p className="text-xs text-muted-foreground">Admins</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-4 flex items-center justify-between gap-4">
          <Input
            placeholder="Search users…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              Export CSV
            </Button>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              Create User
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Since</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id} className={!u.isActive ? "opacity-50" : ""}>
                  <TableCell className="font-medium">
                    <div>
                      {u.fullName}
                      {u.title && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {u.title}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {u.email}
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={u.role} />
                  </TableCell>
                  <TableCell>
                    {u.isAdmin && (
                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                        Admin
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.isActive ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-red-600">
                        Deactivated
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.activatedAt
                      ? new Date(u.activatedAt).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditUser(u)}
                      >
                        Edit
                      </Button>
                      {u.isActive ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => deactivateUser(u.id)}
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-600 hover:text-green-700"
                          onClick={() => reactivateUser(u.id)}
                        >
                          Reactivate
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      {/* Create dialog */}
      <CreateUserDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={addUser}
      />

      {/* Edit dialog */}
      {editUser && (
        <EditUserDialog
          user={editUser}
          onClose={() => setEditUser(null)}
          onSave={(updates) => {
            updateUser(editUser.id, updates);
            setEditUser(null);
          }}
        />
      )}
    </>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  const styles: Record<string, string> = {
    provider: "bg-purple-100 text-purple-700",
    org_user: "bg-gray-100 text-gray-700",
    cs_rep: "bg-yellow-100 text-yellow-700",
    super_admin: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = {
    provider: "Provider",
    org_user: "Org User",
    cs_rep: "CS Rep",
    super_admin: "Super Admin",
  };
  return (
    <Badge className={`${styles[role] ?? "bg-gray-100 text-gray-700"} hover:${styles[role]}`}>
      {labels[role] ?? role}
    </Badge>
  );
}

function CreateUserDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (params: {
    fullName: string;
    email: string;
    role: UserRole;
    isAdmin: boolean;
    title?: string;
  }) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("org_user");
  const [isAdmin, setIsAdmin] = useState(false);
  const [title, setTitle] = useState("");

  const handleSubmit = () => {
    if (!fullName.trim() || !email.trim()) return;
    onCreate({
      fullName: fullName.trim(),
      email: email.trim(),
      role,
      isAdmin,
      title: title.trim() || undefined,
    });
    setFullName("");
    setEmail("");
    setRole("org_user");
    setIsAdmin(false);
    setTitle("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Full Name</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Dr. Jane Smith"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane.smith@org.com"
            />
          </div>
          <div>
            <Label>Title (optional)</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="OB/GYN, MD"
            />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="org_user">Org User</SelectItem>
                <SelectItem value="provider">Provider</SelectItem>
                <SelectItem value="cs_rep">CS Rep</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="create-admin"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="create-admin" className="text-sm">
              Grant admin privileges
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!fullName.trim() || !email.trim()}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({
  user,
  onClose,
  onSave,
}: {
  user: OrgUser;
  onClose: () => void;
  onSave: (updates: Partial<Pick<OrgUser, "role" | "isAdmin" | "title">>) => void;
}) {
  const [role, setRole] = useState<UserRole>(user.role);
  const [isAdmin, setIsAdmin] = useState(user.isAdmin);
  const [title, setTitle] = useState(user.title ?? "");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User — {user.fullName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-muted-foreground">Email</Label>
            <p className="font-mono text-sm">{user.email}</p>
          </div>
          <div>
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="OB/GYN, MD"
            />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="org_user">Org User</SelectItem>
                <SelectItem value="provider">Provider</SelectItem>
                <SelectItem value="cs_rep">CS Rep</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edit-admin"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="edit-admin" className="text-sm">
              Grant admin privileges
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSave({
                role,
                isAdmin,
                title: title.trim() || null,
              })
            }
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
