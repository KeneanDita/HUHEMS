"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Role = "admin" | "student";

export function FirstLoginChangePasswordDialog({
  show,
  role,
}: {
  show: boolean;
  role: Role;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(show);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setOpen(show);
  }, [show]);

  async function ack() {
    try {
      await fetch("/api/auth/first-login", { method: "POST" });
    } catch {
      // Best-effort; even if this fails, it only affects whether the dialog shows again.
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (busy) return;
        setOpen(nextOpen);
        if (!nextOpen) void ack();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change your password</AlertDialogTitle>
          <AlertDialogDescription>
            For security, please change your password after your first login.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button type="button" variant="outline" disabled={busy}>
              Later
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              type="button"
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                setBusy(true);
                (async () => {
                  await ack();
                  router.push(role === "admin" ? "/admin/password" : "/student/password");
                  router.refresh();
                })().finally(() => setBusy(false));
              }}
            >
              Change Password
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
