"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminStore } from "@/lib/hooks/use-admin-store";

export default function AdminBrandingPage() {
  const { branding, updateBranding } = useAdminStore();
  const [name, setName] = useState(branding.name);
  const [primaryColor, setPrimaryColor] = useState(branding.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(
    branding.secondaryColor ?? ""
  );
  const [phone, setPhone] = useState(branding.phone ?? "");
  const [address, setAddress] = useState(branding.address ?? "");
  const [website, setWebsite] = useState(branding.website ?? "");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    updateBranding({
      name: name.trim(),
      primaryColor,
      secondaryColor: secondaryColor.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      website: website.trim() || null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      <Header title="Branding" />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl space-y-8">
          {/* Logo upload placeholder */}
          <section className="rounded-lg border bg-white p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Organization Logo
            </h3>
            <div className="flex items-center gap-6">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-lg text-2xl font-bold text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {branding.logoUrl ? (
                  <img
                    src={branding.logoUrl}
                    alt="Logo"
                    className="h-full w-full rounded-lg object-contain"
                  />
                ) : (
                  name.charAt(0)
                )}
              </div>
              <div>
                <Button variant="outline" size="sm" disabled>
                  Upload Logo
                </Button>
                <p className="mt-1 text-xs text-muted-foreground">
                  Recommended: 200×200px, PNG or SVG.
                  <br />
                  Logo upload requires GCP Cloud Storage (coming soon).
                </p>
              </div>
            </div>
          </section>

          {/* Colors */}
          <section className="rounded-lg border bg-white p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Brand Colors
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Primary Color</Label>
                <div className="mt-1 flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded border p-1"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="font-mono"
                    maxLength={7}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Used in patient viewer header and accents
                </p>
              </div>
              <div>
                <Label>Secondary Color (optional)</Label>
                <div className="mt-1 flex items-center gap-3">
                  <input
                    type="color"
                    value={secondaryColor || "#ffffff"}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded border p-1"
                  />
                  <Input
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    placeholder="#059669"
                    className="font-mono"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Organization info */}
          <section className="rounded-lg border bg-white p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Organization Information
            </h3>
            <div className="space-y-4">
              <div>
                <Label>Organization Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Acme Women's Health"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Health Ave, Suite 200"
                />
              </div>
              <div>
                <Label>Website</Label>
                <Input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourorg.com"
                />
              </div>
            </div>
          </section>

          {/* Preview */}
          <section className="rounded-lg border bg-white p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Patient Viewer Preview
            </h3>
            <div className="overflow-hidden rounded-lg border">
              <div
                className="px-5 py-4 text-white"
                style={{ backgroundColor: primaryColor }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 text-lg font-bold">
                    {name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold">{name || "Org Name"}</p>
                    {phone && (
                      <p className="text-sm text-white/80">{phone}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-4">
                <div className="rounded-xl bg-white p-4 shadow-sm">
                  <p className="text-sm font-medium text-gray-900">
                    Sample Content Item
                  </p>
                  <p className="text-xs text-gray-400">Web Link</p>
                </div>
              </div>
              <div className="border-t bg-white px-5 py-3 text-center text-xs text-gray-400">
                Sent by <span className="font-medium text-gray-500">{name}</span>
                {website && (
                  <span className="ml-2" style={{ color: primaryColor }}>
                    {website.replace(/^https?:\/\//, "")}
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Save */}
          <div className="flex items-center justify-end gap-3">
            {saved && (
              <span className="text-sm text-green-600">Settings saved!</span>
            )}
            <Button onClick={handleSave} disabled={!name.trim()}>
              Save Branding
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
