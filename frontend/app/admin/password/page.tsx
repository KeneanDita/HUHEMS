import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { ChangePasswordCard } from "@/components/auth/change-password-card";

export default function AdminChangePasswordPage() {
  return (
    <div className="grid gap-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Admin</Badge>
            <Badge>Password</Badge>
          </div>
          <div className="flex items-center gap-2">
            <BackButton fallbackHref="/admin" size="sm">
              Back
            </BackButton>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin">Dashboard</Link>
            </Button>
          </div>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Change Password</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">Update your admin account password.</p>
      </div>

      <ChangePasswordCard />
    </div>
  );
}
