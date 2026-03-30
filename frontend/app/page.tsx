import Link from "next/link";

import { cookies } from "next/headers";

import { ArrowRightIcon, ArrowDownIcon, ClockIcon, ShieldCheckIcon, ListChecksIcon, DatabaseIcon } from "lucide-react";

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
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-48 left-1/2 h-120 w-225 -translate-x-1/2 rounded-full bg-linear-to-r from-blue-200/60 via-indigo-100/40 to-transparent blur-3xl dark:from-blue-900/30 dark:via-indigo-900/20" />
        <div className="absolute -bottom-48 right-0 h-105 w-130 rounded-full bg-linear-to-tr from-indigo-200/50 to-transparent blur-3xl dark:from-indigo-900/25" />
      </div>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-3xl py-20 sm:py-32 text-center animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex items-center justify-center gap-2">
          <Badge variant="secondary" className="shadow-sm">Haramaya University</Badge>
          <Badge className="shadow-sm">Holistic Exams</Badge>
        </div>

        <h1 className="mt-10 bg-linear-to-r from-foreground via-primary to-foreground bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-6xl lg:text-7xl">
          HUHEMS
        </h1>
        <p className="mt-5 text-base font-medium text-muted-foreground sm:text-lg">
          Haramaya University Holistic Exam Management System
        </p>

        <p className="mx-auto mt-6 max-w-lg text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
          A secure, modern platform for creating, managing, and taking exams with
          real-time grading and analytics.
        </p>

        <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {!isLoggedIn ? (
            <>
              <Button asChild size="lg" className="shadow-md hover:shadow-lg transition-shadow">
                <Link href="/auth/login?role=student">
                  Student Login <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="shadow-sm hover:shadow-md transition-shadow">
                <Link href="/auth/admin-login">
                  Admin Login <ArrowRightIcon className="size-4" />
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
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            target="_blank"
            rel="noreferrer"
          >
            API Health
          </a>
        </div>

        {/* Scroll-to-features hint */}
        <a
          href="#features"
          className="mt-20 inline-flex flex-col items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Scroll to features"
        >
          <span className="tracking-wide uppercase">Explore features</span>
          <ArrowDownIcon className="size-4 animate-bounce" />
        </a>
      </section>

      {/* ── Features ── */}
      <section
        id="features"
        className="scroll-mt-20 border-t pt-16 pb-8"
      >
        <p className="mb-10 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Platform Features
        </p>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <ClockIcon className="size-4 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-base">Timed Exams</CardTitle>
              <CardDescription>Start/end windows and attempt tracking.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Configure scheduled exams with server-side enforcement.
            </CardContent>
          </Card>

          <Card className="transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <ListChecksIcon className="size-4 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-base">MCQs</CardTitle>
              <CardDescription>Single-choice and multi-choice grading.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Model answers as choice sets, stored per attempt.
            </CardContent>
          </Card>

          <Card className="transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <ShieldCheckIcon className="size-4 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="text-base">Attempt Limits</CardTitle>
              <CardDescription>Reduce cheating via max attempts.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Enforce a strict attempt cap per exam per student.
            </CardContent>
          </Card>

          <Card className="transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <DatabaseIcon className="size-4 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle className="text-base">PostgreSQL</CardTitle>
              <CardDescription>Database expected on port 5432.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Local dev uses <span className="font-medium text-foreground">localhost:5432</span>.
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
