import Link from "next/link";

import { cookies } from "next/headers";

import { ArrowRightIcon, ClockIcon, ShieldCheckIcon, ListChecksIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { parseJwtPayload } from "@/lib/jwt";

export default async function Home() {
  const token = (await cookies()).get("huhems_token")?.value;
  const role = token ? parseJwtPayload(token)?.role : null;
  const isLoggedIn = Boolean(token);
  const canGoAdmin = role === "admin";
  const canGoStudent = role === "student";

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-48 left-1/2 h-120 w-225 -translate-x-1/2 rounded-full bg-linear-to-r from-blue-200/60 via-indigo-100/40 to-transparent blur-3xl dark:from-blue-900/30 dark:via-indigo-900/20" />
        <div className="absolute -bottom-48 right-0 h-105 w-130 rounded-full bg-linear-to-tr from-indigo-200/50 to-transparent blur-3xl dark:from-indigo-900/25" />
      </div>

      <section className="mx-auto max-w-3xl text-center">
        <div className="flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-4 duration-700">
          <Badge variant="secondary" className="shadow-sm">Haramaya University</Badge>
          <Badge className="shadow-sm">Holistic Exams</Badge>
        </div>

        <h1 className="mt-6 bg-linear-to-r from-foreground via-primary to-foreground bg-clip-text text-balance text-4xl font-semibold tracking-tight text-transparent sm:text-5xl">
          HUHEMS - Haramaya University Holistic Exam Management System
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-balance text-muted-foreground">
          A secure, modern platform for creating, managing, and taking exams with real-time grading and analytics.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {!isLoggedIn ? (
            <>
              <Button asChild size="lg" className="shadow-md hover:shadow-lg transition-shadow">
                <Link href="/auth/login?role=student">
                  Login (Student) <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="shadow-sm hover:shadow-md transition-shadow">
                <Link href="/auth/admin-login">
                  Login (Admin) <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
            </>
          ) : null}

          {canGoStudent ? (
            <Button asChild size="lg" className="shadow-md hover:shadow-lg transition-shadow">
              <Link href="/student">
                Go to Student Dashboard <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
          ) : null}

          {canGoAdmin ? (
            <Button asChild size="lg" variant="outline" className="shadow-sm hover:shadow-md transition-shadow">
              <Link href="/admin">Go to Admin Dashboard</Link>
            </Button>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          {isLoggedIn ? (
            <>
              <span className="text-sm font-medium text-muted-foreground">
                Signed in as <span className="text-foreground">{role ?? "user"}</span>
              </span>
              <Separator orientation="vertical" className="h-4" />
            </>
          ) : null}
          <a
            href={`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080"}/health`}
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
            target="_blank"
            rel="noreferrer"
          >
            API Health
          </a>
        </div>
      </section>

      <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="transition-all duration-200 hover:-translate-y-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClockIcon className="size-4 text-primary" /> Timed Exams
            </CardTitle>
            <CardDescription>Start/end windows and attempt tracking.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Configure scheduled exams with server-side enforcement.
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:-translate-y-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecksIcon className="size-4 text-primary" /> MCQs
            </CardTitle>
            <CardDescription>Single-choice and multi-choice grading.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Model answers as choice sets, stored per attempt.
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:-translate-y-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheckIcon className="size-4 text-primary" /> Attempt Limits
            </CardTitle>
            <CardDescription>Reduce cheating via max attempts.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Enforce a strict attempt cap per exam per student.
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:-translate-y-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <span className="text-sm font-bold text-orange-600 dark:text-orange-400">DB</span>
              </div>
              PostgreSQL
            </CardTitle>
            <CardDescription>Database expected on port 5432.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Local dev uses <span className="font-medium text-foreground">localhost:5432</span>.
          </CardContent>
        </Card>
      </section>

    </div>
  );
}
