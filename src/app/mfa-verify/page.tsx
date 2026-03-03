"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { verifyMfaCodeAction, resendMfaCodeAction } from "@/lib/actions/mfa";

export default function MfaVerifyPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // If session is not MFA pending, redirect away
  useEffect(() => {
    if (session && !session.user?.mfaPending) {
      router.replace("/library");
    }
  }, [session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await verifyMfaCodeAction(code.trim());
      if (result.success) {
        await update();
        router.push("/library");
      } else {
        setError(result.error ?? "Invalid or expired code");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    try {
      const result = await resendMfaCodeAction();
      if (result.success) {
        setResendCooldown(60);
      } else {
        setError(result.error ?? "Failed to resend code");
      }
    } catch {
      setError("Failed to resend code");
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Verify Your Identity</CardTitle>
          <CardDescription>
            We sent a 6-digit code to your email. Enter it below to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="mfa-code">Verification Code</Label>
              <Input
                id="mfa-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                required
                autoComplete="one-time-code"
                className="mt-1 text-center text-2xl tracking-[0.5em] font-mono"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={loading || code.length !== 6}
            >
              {loading ? "Verifying..." : "Verify"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResend}
              disabled={resending || resendCooldown > 0}
            >
              {resendCooldown > 0
                ? `Resend code (${resendCooldown}s)`
                : resending
                  ? "Sending..."
                  : "Resend code"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
