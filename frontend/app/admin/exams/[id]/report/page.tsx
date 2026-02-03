import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/back-button";

import { AdminExamReportClient } from "./ui";

export default async function AdminExamReportPage(props: { params: Promise<{ id: string }> }) {
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
            <BackButton fallbackHref="/admin/exams" size="sm">
              Back
            </BackButton>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/exams">Exams</Link>
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Invalid exam id in URL: {id}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Admin</Badge>
            <Badge>Report</Badge>
          </div>
          <div className="flex items-center gap-2">
            <BackButton fallbackHref="/admin/exams" size="sm">
              Back
            </BackButton>
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/exams/${id}`}>Edit</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/exams">Exams</Link>
            </Button>
          </div>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Exam Report</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">Analytics from submitted attempts.</p>
      </div>

      <AdminExamReportClient examId={id} />
    </div>
  );
}
