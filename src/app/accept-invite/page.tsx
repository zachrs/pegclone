"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptInvite, validateInviteToken } from "@/lib/actions/admin";
import { CheckCircle2, AlertCircle, Loader2, KeyRound } from "lucide-react";

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "success" | "error">("loading");
  const [info, setInfo] = useState<{ fullName?: string; email?: string; orgName?: string }>({});
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    validateInviteToken(token)
      .then((res) => {
        if (res.valid) {
          setInfo({ fullName: res.fullName, email: res.email, orgName: res.orgName });
          setStatus("valid");
        } else {
          setStatus("invalid");
        }
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const result = await acceptInvite(token, password);
      if (result.success) {
        setStatus("success");
      } else {
        setErrorMsg(result.error ?? "Something went wrong");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Patient Education Genius</h1>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Validating invitation...</p>
            </div>
          )}

          {status === "invalid" && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <h2 className="text-lg font-semibold">Invalid Invitation</h2>
              <p className="text-sm text-muted-foreground">
                This invitation link is invalid or has expired. Please contact your administrator to send a new one.
              </p>
              <Button variant="outline" asChild className="mt-2">
                <Link href="/login">Go to Login</Link>
              </Button>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <h2 className="text-lg font-semibold">Account Activated</h2>
              <p className="text-sm text-muted-foreground">
                Your password has been set and your account is now active. You can sign in with your credentials.
              </p>
              <Button asChild className="mt-2">
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          )}

          {(status === "valid" || status === "error") && (
            <>
              <div className="mb-6 text-center">
                <h2 className="text-lg font-semibold">Welcome, {info.fullName}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  You&apos;ve been invited to join <span className="font-medium text-foreground">{info.orgName}</span>.
                  Set your password below to activate your account.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="mt-1 font-mono text-sm">{info.email}</p>
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    className="mt-1"
                  />
                </div>

                {errorMsg && (
                  <p className="text-sm text-red-500">{errorMsg}</p>
                )}

                <Button type="submit" className="w-full" disabled={submitting || password.length < 8 || password !== confirmPassword}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Activating...
                    </>
                  ) : (
                    "Set Password & Activate"
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
