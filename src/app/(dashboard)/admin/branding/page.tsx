"use client";

import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getOrgBranding, updateBranding } from "@/lib/actions/admin";
import { toast } from "sonner";

export default function AdminBrandingPage() {
  const [name, setName] = useState("Loading...");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#7c3aed");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getOrgBranding()
      .then((org) => {
        if (org) {
          setName(org.name);
          setLogoUrl(org.logoUrl);
          setPrimaryColor(org.primaryColor ?? "#7c3aed");
          setSecondaryColor(org.secondaryColor ?? "");
          const contact = (org.settings as Record<string, Record<string, string>> | null)?.contact;
          if (contact) {
            setPhone(contact.phone ?? "");
            setAddress(contact.address ?? "");
            setWebsite(contact.website ?? "");
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const response = await fetch(
        `/api/upload?filename=${encodeURIComponent(file.name)}&folder=logos`,
        { method: "POST", body: file }
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? "Upload failed");
      }
      const { url } = await response.json();
      setLogoUrl(url);
      // Persist immediately
      await updateBranding({
        name: name.trim(),
        primaryColor,
        secondaryColor: secondaryColor.trim() || null,
        logoUrl: url,
        phone: phone.trim(),
        address: address.trim(),
        website: website.trim(),
      });
      toast.success("Logo uploaded");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    } finally {
      setUploadingLogo(false);
      // Reset input so same file can be re-selected
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    await updateBranding({
      name: name.trim(),
      primaryColor,
      secondaryColor: secondaryColor.trim() || null,
      phone: phone.trim(),
      address: address.trim(),
      website: website.trim(),
    });
    toast.success("Branding settings saved");
  };

  return (
    <>
      <Header title="Branding" />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl space-y-8">
          {/* Logo upload placeholder */}
          <section className="rounded-lg border bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Organization Logo
            </h2>
            <div className="flex items-center gap-6">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-lg text-2xl font-bold text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-full w-full rounded-lg object-contain" />
                ) : (
                  name.charAt(0)
                )}
              </div>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploadingLogo}
                  onClick={() => logoInputRef.current?.click()}
                >
                  {uploadingLogo ? "Uploading..." : "Upload Logo"}
                </Button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.svg,.webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Recommended: 200x200px, PNG or SVG.
                </p>
                {logoUrl && (
                  <button
                    className="mt-1 text-xs text-red-500 hover:text-red-700"
                    onClick={async () => {
                      setLogoUrl(null);
                      await updateBranding({
                        name: name.trim(),
                        primaryColor,
                        secondaryColor: secondaryColor.trim() || null,
                        logoUrl: null,
                        phone: phone.trim(),
                        address: address.trim(),
                        website: website.trim(),
                      });
                      toast.success("Logo removed");
                    }}
                  >
                    Remove logo
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Colors */}
          <section className="rounded-lg border bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Brand Colors
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="brand-primary">Primary Color</Label>
                <div className="mt-1 flex items-center gap-3">
                  <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} aria-label="Pick primary color" className="h-10 w-14 cursor-pointer rounded border p-1" />
                  <Input id="brand-primary" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="font-mono" maxLength={7} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Used in patient viewer header and accents</p>
              </div>
              <div>
                <Label htmlFor="brand-secondary">Secondary Color (optional)</Label>
                <div className="mt-1 flex items-center gap-3">
                  <input type="color" value={secondaryColor || "#ffffff"} onChange={(e) => setSecondaryColor(e.target.value)} aria-label="Pick secondary color" className="h-10 w-14 cursor-pointer rounded border p-1" />
                  <Input id="brand-secondary" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} placeholder="#059669" className="font-mono" maxLength={7} />
                </div>
              </div>
            </div>
          </section>

          {/* Organization info */}
          <section className="rounded-lg border bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Organization Information
            </h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="brand-org-name">Organization Name</Label>
                <Input id="brand-org-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Women's Health" />
              </div>
              <div>
                <Label htmlFor="brand-phone">Phone</Label>
                <Input id="brand-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
              </div>
              <div>
                <Label htmlFor="brand-address">Address</Label>
                <Input id="brand-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Health Ave, Suite 200" />
              </div>
              <div>
                <Label htmlFor="brand-website">Website</Label>
                <Input id="brand-website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourorg.com" />
              </div>
            </div>
          </section>

          {/* Preview */}
          <section className="rounded-lg border bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Patient Viewer Preview
            </h2>
            <div className="overflow-hidden rounded-lg border">
              <div className="px-5 py-4 text-white" style={{ backgroundColor: primaryColor }}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 text-lg font-bold">
                    {name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold">{name || "Org Name"}</p>
                    {phone && <p className="text-sm text-white/80">{phone}</p>}
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-4">
                <div className="rounded-xl bg-white p-4 shadow-sm">
                  <p className="text-sm font-medium text-gray-900">Sample Content Item</p>
                  <p className="text-xs text-gray-500">Web Link</p>
                </div>
              </div>
              <div className="border-t bg-white px-5 py-3 text-center text-xs text-gray-500">
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
          <div className="flex items-center justify-end">
            <Button onClick={handleSave} disabled={!name.trim()}>
              Save Branding
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
