"use client";

import { useEffect, useState, useRef } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  changePassword,
  getMfaStatus,
  toggleMfa,
  getProfile,
  updateProfilePhoto,
  updateShowPhotoOnMessages,
} from "@/lib/actions/auth";
import { toast } from "sonner";
import {
  Camera,
  Trash2,
  Shield,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

export default function ProfilePage() {
  // Profile state
  const [profile, setProfile] = useState<{
    fullName: string;
    email: string;
    role: string;
    title: string | null;
    photoUrl: string | null;
    showPhotoOnMessages: boolean;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // MFA state
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [orgRequiresMfa, setOrgRequiresMfa] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);

  useEffect(() => {
    getProfile()
      .then(setProfile)
      .catch(() => {});
    getMfaStatus()
      .then((s) => {
        setMfaEnabled(s.mfaEnabled);
        setOrgRequiresMfa(s.orgRequiresMfa);
      })
      .catch(() => {});
  }, []);

  const passwordsMatch = newPassword === confirmPassword;
  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    passwordsMatch &&
    !loading;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    try {
      const result = await changePassword(currentPassword, newPassword);
      if (result.success) {
        toast.success("Password changed successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(result.error ?? "Failed to change password");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMfa = async () => {
    setMfaLoading(true);
    try {
      const result = await toggleMfa(!mfaEnabled);
      if (result.success) {
        setMfaEnabled(!mfaEnabled);
        toast.success(
          !mfaEnabled
            ? "Two-factor authentication enabled"
            : "Two-factor authentication disabled"
        );
      } else {
        toast.error(result.error ?? "Failed to update MFA setting");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setMfaLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploading(true);
    try {
      const res = await fetch(
        `/api/upload?filename=${encodeURIComponent(file.name)}&folder=photos`,
        { method: "POST", body: file }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await updateProfilePhoto(data.url);
      setProfile((p) => p ? { ...p, photoUrl: data.url } : p);
      toast.success("Photo updated");
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    try {
      await updateProfilePhoto(null);
      setProfile((p) => p ? { ...p, photoUrl: null } : p);
      toast.success("Photo removed");
    } catch {
      toast.error("Failed to remove photo");
    }
  };

  const handleTogglePhotoVisibility = async () => {
    if (!profile) return;
    const newVal = !profile.showPhotoOnMessages;
    try {
      await updateShowPhotoOnMessages(newVal);
      setProfile((p) => p ? { ...p, showPhotoOnMessages: newVal } : p);
      toast.success(newVal ? "Photo will appear on patient messages" : "Photo hidden from patient messages");
    } catch {
      toast.error("Failed to update setting");
    }
  };

  const mfaActive = mfaEnabled || orgRequiresMfa;
  const initials = profile?.fullName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const roleLabels: Record<string, string> = {
    provider: "Provider",
    org_user: "Org User",
    cs_rep: "CS Rep",
    super_admin: "Super Admin",
  };

  return (
    <>
      <Header title="Profile" />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-md space-y-6">
          {/* Profile Info & Photo */}
          <section className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <User className="h-4 w-4" />
              Profile
            </h2>

            {profile ? (
              <div className="space-y-5">
                {/* Avatar & Upload */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={profile.photoUrl ?? undefined} />
                      <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                    </Avatar>
                    {uploading && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Camera className="h-3.5 w-3.5" />
                      {profile.photoUrl ? "Change Photo" : "Upload Photo"}
                    </Button>
                    {profile.photoUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-red-600 hover:text-red-700"
                        onClick={handleRemovePhoto}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>

                {/* User Info */}
                <div className="space-y-2 rounded-lg bg-muted/30 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Name</span>
                    <span className="text-sm font-medium">{profile.fullName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Email</span>
                    <span className="font-mono text-sm">{profile.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Role</span>
                    <Badge variant="secondary">{roleLabels[profile.role] ?? profile.role}</Badge>
                  </div>
                  {profile.title && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Title</span>
                      <span className="text-sm">{profile.title}</span>
                    </div>
                  )}
                </div>

                {/* Photo on messages toggle */}
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Show photo on patient messages</p>
                    <p className="text-xs text-muted-foreground">
                      Your photo will appear alongside your name when patients view shared content.
                    </p>
                  </div>
                  <Button
                    variant={profile.showPhotoOnMessages ? "default" : "outline"}
                    size="sm"
                    className="gap-1.5 shrink-0"
                    onClick={handleTogglePhotoVisibility}
                  >
                    {profile.showPhotoOnMessages ? (
                      <><Eye className="h-3.5 w-3.5" />Visible</>
                    ) : (
                      <><EyeOff className="h-3.5 w-3.5" />Hidden</>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 animate-pulse rounded-full bg-muted" />
                  <div className="space-y-2">
                    <div className="h-8 w-28 animate-pulse rounded bg-muted" />
                  </div>
                </div>
                <div className="h-28 animate-pulse rounded-lg bg-muted/30" />
              </div>
            )}
          </section>

          {/* Change Password */}
          <section className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Lock className="h-4 w-4" />
              Change Password
            </h2>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  className="mt-1"
                />
                {newPassword.length > 0 && newPassword.length < 8 && (
                  <p className="mt-1 text-xs text-red-500">
                    Password must be at least 8 characters
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="mt-1"
                />
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="mt-1 text-xs text-red-500">
                    Passwords do not match
                  </p>
                )}
              </div>
              <Button type="submit" disabled={!canSubmit} className="w-full">
                {loading ? "Changing..." : "Change Password"}
              </Button>
            </form>
          </section>

          {/* Two-Factor Authentication */}
          <section className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Shield className="h-4 w-4" />
              Two-Factor Authentication
            </h2>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    Email verification code
                  </span>
                  {mfaActive ? (
                    <Badge
                      variant="outline"
                      className="border-green-200 bg-green-50 text-green-700"
                    >
                      Enabled
                    </Badge>
                  ) : (
                    <Badge variant="outline">Disabled</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  A 6-digit code will be sent to your email each time you sign
                  in.
                </p>
                {orgRequiresMfa && (
                  <p className="text-xs font-medium text-amber-600">
                    Required by your organization
                  </p>
                )}
              </div>
              <Button
                variant={mfaActive ? "destructive" : "default"}
                size="sm"
                disabled={mfaLoading || (orgRequiresMfa && mfaActive)}
                onClick={handleToggleMfa}
              >
                {mfaLoading
                  ? "Updating..."
                  : mfaActive
                    ? "Disable"
                    : "Enable"}
              </Button>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
