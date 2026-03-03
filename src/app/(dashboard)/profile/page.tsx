"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { changePassword, getMfaStatus, toggleMfa } from "@/lib/actions/auth";
import { toast } from "sonner";

export default function ProfilePage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [orgRequiresMfa, setOrgRequiresMfa] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);

  useEffect(() => {
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

  const handleSubmit = async (e: React.FormEvent) => {
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

  const mfaActive = mfaEnabled || orgRequiresMfa;

  return (
    <>
      <Header title="Profile" />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-md space-y-6">
          {/* Change Password */}
          <section className="rounded-lg border bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Change Password
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
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
          <section className="rounded-lg border bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
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
