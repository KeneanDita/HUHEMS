"use client";

import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

export function ChangePasswordCard() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
        <CardDescription>Use your current password to set a new one.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setSuccess(null);

            if (!oldPassword || !newPassword) {
              setError("Please fill in all fields.");
              return;
            }
            if (newPassword.length < 8) {
              setError("New password must be at least 8 characters.");
              return;
            }
            if (newPassword !== confirmNewPassword) {
              setError("New passwords do not match.");
              return;
            }

            setBusy(true);
            try {
              const res = await fetch("/api/auth/password", {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ oldPassword, newPassword }),
              });

              const text = await res.text();
              const data = (() => {
                try {
                  return JSON.parse(text) as { message?: string };
                } catch {
                  return null;
                }
              })();

              if (!res.ok) {
                throw new Error(data?.message ?? text ?? "Failed to update password");
              }

              setOldPassword("");
              setNewPassword("");
              setConfirmNewPassword("");
              setSuccess("Password updated.");
            } catch (e2: unknown) {
              setError(getErrorMessage(e2, "Failed to update password"));
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="oldPassword">Old password</Label>
            <Input
              id="oldPassword"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirmNewPassword">Confirm new password</Label>
            <Input
              id="confirmNewPassword"
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
          {success ? <p className="text-sm font-medium text-emerald-600">{success}</p> : null}

          <Button type="submit" disabled={busy}>
            {busy ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
