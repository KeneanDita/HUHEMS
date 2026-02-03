import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/back-button";

import { AdminExamsClient } from "./ui";

export default function AdminExamsPage() {
  return (
    <div className="grid gap-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Admin</Badge>
            <Badge>Exams</Badge>
          </div>
          <div className="flex items-center gap-2">
            <BackButton fallbackHref="/admin" size="sm">Back</BackButton>
          </div>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Exam Manager</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Create and manage exams, add questions, set correct answers, publish, and view reports.
        </p>
      </div>

      <AdminExamsClient />
    </div>
  );
}
