import Link from "next/link";

import { cookies } from "next/headers";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FirstLoginChangePasswordDialog } from "@/components/auth/first-login-change-password-dialog";
import { AlertTriangleIcon, FileTextIcon, UsersIcon, BarChartIcon, ArrowRightIcon } from "lucide-react";

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
    <div className="grid gap-8">
      <FirstLoginChangePasswordDialog show={showFirstLogin} role="admin" />

      {passwordNeverChanged ? (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-950 shadow-sm dark:border-yellow-900/50 dark:bg-yellow-900/10 dark:text-yellow-100">
          <AlertTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600 dark:text-yellow-500" aria-hidden="true" />
          <div className="grid gap-1">
            <div className="text-sm font-medium">You haven&apos;t changed your password yet.</div>
            <div className="text-sm text-yellow-900/80 dark:text-yellow-100/80">
              For security, please change your password.{" "}
              <Button asChild variant="link" className="h-auto p-0 align-baseline text-yellow-900 dark:text-yellow-100">
                <Link href="/admin/password">Change password</Link>
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Page header */}
      <div className="animate-in fade-in slide-in-from-top-4 duration-500 border-b pb-6">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="shadow-sm">Admin</Badge>
          <Badge className="shadow-sm">Dashboard</Badge>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Admin Dashboard</h1>
        <p className="mt-2 max-w-xl text-muted-foreground text-sm">
          Manage exams, students, and analytics from one place.
        </p>
      </div>

      {/* Quick-access cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
        <Card className="group border-border/50 shadow-sm hover:shadow-md transition-all hover:border-border duration-300">
          <CardHeader className="pb-3">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <FileTextIcon className="size-5 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-base">Manage Exams</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              Create, configure, and publish exams. Add questions, set duration, and review submitted attempts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" className="shadow-sm hover:shadow-md transition-shadow">
              <Link href="/admin/exams" className="flex items-center gap-1.5">
                Open Exam Manager <ArrowRightIcon className="size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="group border-border/50 shadow-sm hover:shadow-md transition-all hover:border-border duration-300">
          <CardHeader className="pb-3">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
              <UsersIcon className="size-5 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-base">Manage Students</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              Create, edit, and remove student accounts. Bulk-import an entire class from a CSV file.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" className="shadow-sm hover:shadow-md transition-shadow">
              <Link href="/admin/students" className="flex items-center gap-1.5">
                Open Student Manager <ArrowRightIcon className="size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="group border-border/50 shadow-sm hover:shadow-md transition-all hover:border-border duration-300 sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <BarChartIcon className="size-5 text-purple-600 dark:text-purple-400" />
            </div>
            <CardTitle className="text-base">Analytics</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              Review performance trends, score distributions, and question-level insights across all exams.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" className="shadow-sm hover:shadow-md transition-shadow">
              <Link href="/admin/analytics" className="flex items-center gap-1.5">
                Open Analytics <ArrowRightIcon className="size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
