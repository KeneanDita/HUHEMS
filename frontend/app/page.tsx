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
        <div className="absolute -top-48 left-1/2 h-120 w-225 -translate-x-1/2 rounded-full bg-linear-to-r from-zinc-200/70 via-zinc-100/40 to-transparent blur-3xl dark:from-zinc-800/40 dark:via-zinc-900/20" />
        <div className="absolute -bottom-48 right-0 h-105 w-130 rounded-full bg-linear-to-tr from-zinc-200/60 to-transparent blur-3xl dark:from-zinc-800/30" />
      </div>

      <section className="mx-auto max-w-3xl text-center">
        <div className="flex items-center justify-center gap-2">
          <Badge variant="secondary">Haramaya University</Badge>
          <Badge>Holistic Exams</Badge>
        </div>

        <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          HUHEMS - Haramaya University Holistic Exam Management System
        </h1>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {!isLoggedIn ? (
            <>
              <Button asChild size="lg">
                <Link href="/auth/login?role=student">
                  Login (Student) <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/auth/admin-login">
                  Login (Admin) <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
            </>
          ) : null}

          {canGoStudent ? (
            <Button asChild size="lg">
              <Link href="/student">
                Go to Student Dashboard <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
          ) : null}

          {canGoAdmin ? (
            <Button asChild size="lg" variant="outline">
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClockIcon className="size-4" /> Timed Exams
            </CardTitle>
            <CardDescription>Start/end windows and attempt tracking.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Configure scheduled exams with server-side enforcement.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecksIcon className="size-4" /> MCQs
            </CardTitle>
            <CardDescription>Single-choice and multi-choice grading.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Model answers as choice sets, stored per attempt.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheckIcon className="size-4" /> Attempt Limits
            </CardTitle>
            <CardDescription>Reduce cheating via max attempts.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Enforce a strict attempt cap per exam per student.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">PostgreSQL</CardTitle>
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
