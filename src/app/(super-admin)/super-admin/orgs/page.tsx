"use client";

import { useCallback, useEffect, useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getAllOrganizations,
  createOrganization,
  overrideSmsThrottle,
} from "@/lib/actions/admin";
import { toast } from "sonner";

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  primaryColor: string | null;
  userCount: number;
  smsSendCountMonth: number | null;
  smsThrottled: boolean | null;
  smsThrottleOverriddenAt: string | null;
  createdAt: string;
}

export default function SuperAdminOrgsPage() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");

  const loadOrgs = useCallback(() => {
    getAllOrganizations()
      .then((data) => setOrgs(data as OrgRow[]))
      .catch(() => {});
  }, []);

  useEffect(() => { loadOrgs(); }, [loadOrgs]);

  const filtered = orgs.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.slug.toLowerCase().includes(search.toLowerCase())
  );

  const totalOrgs = orgs.length;
  const throttledCount = orgs.filter((o) => o.smsThrottled).length;

  return (
    <>
      <Header title="Organizations" />
      <main className="flex-1 overflow-auto p-6">
        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="rounded-lg border bg-white p-4">
            <p className="text-2xl font-bold">{totalOrgs}</p>
            <p className="text-xs text-muted-foreground">Organizations</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-2xl font-bold text-blue-600">—</p>
            <p className="text-xs text-muted-foreground">Total Messages</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className={`text-2xl font-bold ${throttledCount > 0 ? "text-red-600" : "text-green-600"}`}>
              {throttledCount}
            </p>
            <p className="text-xs text-muted-foreground">SMS Throttled</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-4 flex items-center justify-between gap-4">
          <Input placeholder="Search organizations..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search organizations" className="max-w-xs" />
          <Button size="sm" onClick={() => setShowCreate(true)}>Create Organization</Button>
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>SMS This Month</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" aria-hidden="true" style={{ backgroundColor: org.primaryColor ?? "#888" }} />
                      <a
                        href={`/super-admin/orgs/${org.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {org.name}
                      </a>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{org.slug}</TableCell>
                  <TableCell>{org.userCount}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={(org.smsSendCountMonth ?? 0) >= 18000 ? "font-medium text-red-600" : ""}>
                        {(org.smsSendCountMonth ?? 0).toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground">/ 20,000</span>
                      {org.smsThrottled && (
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Throttled</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(org.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {org.smsThrottled && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700"
                        onClick={async () => {
                          await overrideSmsThrottle(org.id);
                          toast.success(`SMS throttle unlocked for ${org.name}`);
                          loadOrgs();
                        }}
                      >
                        Unlock SMS
                      </Button>
                    )}
                    {org.smsThrottleOverriddenAt && !org.smsThrottled && (
                      <span className="text-xs text-muted-foreground">
                        Unlocked {new Date(org.smsThrottleOverriddenAt).toLocaleDateString()}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No organizations found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      <CreateOrgDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={async (params) => {
          await createOrganization(params);
          toast.success(`Organization "${params.name}" created`);
          loadOrgs();
        }}
      />
    </>
  );
}

function CreateOrgDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (p: { name: string; slug: string; primaryColor: string }) => Promise<void> }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");

  const autoSlug = (input: string) => input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const handleNameChange = (val: string) => { setName(val); setSlug(autoSlug(val)); };

  const handleSubmit = async () => {
    if (!name.trim() || !slug.trim()) return;
    await onCreate({ name: name.trim(), slug: slug.trim(), primaryColor });
    setName(""); setSlug(""); setPrimaryColor("#2563eb");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Create Organization</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div><Label htmlFor="create-org-name">Organization Name</Label><Input id="create-org-name" value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Metro Family Practice" /></div>
          <div>
            <Label htmlFor="create-org-slug">Slug</Label>
            <Input id="create-org-slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="metro-family" className="font-mono" />
            <p className="mt-1 text-xs text-muted-foreground">URL-safe identifier. Auto-generated from name.</p>
          </div>
          <div>
            <Label htmlFor="create-org-color">Primary Color</Label>
            <div className="mt-1 flex items-center gap-3">
              <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} aria-label="Pick primary color" className="h-10 w-14 cursor-pointer rounded border p-1" />
              <Input id="create-org-color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="font-mono" maxLength={7} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || !slug.trim()}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
