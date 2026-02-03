import Link from "next/link";

import { cookies } from "next/headers";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FirstLoginChangePasswordDialog } from "@/components/auth/first-login-change-password-dialog";
import { AlertTriangleIcon } from "lucide-react";

const FIRST_LOGIN_COOKIE = "huhems_first_login";
const TOKEN_COOKIE = "huhems_token";

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const showFirstLogin = Boolean(cookieStore.get(FIRST_LOGIN_COOKIE)?.value);

  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  let passwordNeverChanged = false;
  if (token) {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
    const res = await fetch(`${apiBase}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const me = await res.json().catch(() => null);
    passwordNeverChanged = Boolean(me && typeof me === "object" && (me as any).passwordNeverChanged);
  }

  return (
    <div className="grid gap-6">
		<FirstLoginChangePasswordDialog show={showFirstLogin} role="admin" />
    {passwordNeverChanged ? (
      <div className="flex items-start gap-3 rounded-md border border-yellow-200 bg-yellow-50 p-4 text-yellow-950">
        <AlertTriangleIcon className="mt-0.5 h-5 w-5 text-yellow-600" aria-hidden="true" />
        <div className="grid gap-1">
          <div className="text-sm font-medium">You haven’t changed your password yet.</div>
          <div className="text-sm text-yellow-900/80">
            For security, please change your password.
            {" "}
            <Button asChild variant="link" className="h-auto p-0 align-baseline text-yellow-900">
              <Link href="/admin/password">Change password</Link>
            </Button>
          </div>
        </div>
      </div>
    ) : null}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Admin</Badge>
            <Badge>Dashboard</Badge>
          </div>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Admin Dashboard</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Manage exams, questions, publication windows, and results.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage Exams</CardTitle>
          <CardDescription>
            Create new exams, configure duration and availability, add or bulk-import questions, and publish when ready. Use this area to manage the full exam lifecycle—from drafting to releasing and reviewing submitted attempts.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/admin/exams">Open Exam Manager</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage Students</CardTitle>
          <CardDescription>
            Create, edit, and remove student accounts, and keep enrollment details (name, year, department) up to date. You can also bulk-import students from CSV to onboard an entire class quickly.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/admin/students">Open Student Manager</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
          <CardDescription>
            Review performance trends across exams, including scores, completion stats, and question-level insights. Use these reports to identify difficult topics, validate question quality, and monitor student outcomes over time.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/admin/analytics">Open Analytics</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
