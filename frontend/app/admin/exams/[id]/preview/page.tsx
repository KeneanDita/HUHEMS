import { cookies } from "next/headers";
import Link from "next/link";

import { getApiBaseUrl } from "@/lib/env";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";

import { AdminExamPreviewClient } from "./ui";

type Choice = {
  id: string;
  text: string;
  isCorrect?: boolean;
  order: number;
};

type Question = {
  id: string;
  text: string;
  type: "single_choice" | "multi_choice" | string;
  choices: Choice[];
};

type Exam = {
  id: string;
  title: string;
  description?: string;
  questionsPerPage?: number;
  durationMinutes?: number;
};

type ExamDetail = {
  exam: Exam;
  questions: Question[];
};

export default async function AdminExamPreviewPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  if (!isUuid) {
    return (
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Admin</Badge>
            <Badge variant="destructive">Invalid</Badge>
          </div>
          <div className="flex items-center gap-2">
            <BackButton fallbackHref="/admin/exams" size="sm">Back</BackButton>
            <Button asChild variant="outline" size="sm"><Link href="/admin/exams">Exams</Link></Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Invalid exam id in URL: {id}</p>
      </div>
    );
  }

  const token = (await cookies()).get("huhems_token")?.value;
  const apiBase = getApiBaseUrl();

  const res = await fetch(`${apiBase}/admin/exams/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: "no-store",
  });

  const rawText = await res.text();
  const data = (() => {
    try {
      return JSON.parse(rawText) as ExamDetail;
    } catch {
      return null;
    }
  })();

  if (!res.ok || !data) {
    return (
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Admin</Badge>
            <Badge variant="destructive">Error</Badge>
          </div>
          <div className="flex items-center gap-2">
            <BackButton fallbackHref="/admin/exams" size="sm">Back</BackButton>
            <Button asChild variant="outline" size="sm"><Link href="/admin/exams">Exams</Link></Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Failed to load exam preview: {res.status}</p>
        {rawText ? <pre className="overflow-auto rounded-md border bg-muted/40 p-3 text-xs">{rawText}</pre> : null}
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Admin</Badge>
            <Badge>Preview</Badge>
          </div>
          <div className="flex items-center gap-2">
            <BackButton fallbackHref={`/admin/exams/${id}`} size="sm">Back</BackButton>
            <Button asChild variant="outline" size="sm"><Link href={`/admin/exams/${id}`}>Edit</Link></Button>
          </div>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{data.exam.title}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">Student-style preview (read-only).</p>
      </div>

      <AdminExamPreviewClient initial={data} />
    </div>
  );
}
