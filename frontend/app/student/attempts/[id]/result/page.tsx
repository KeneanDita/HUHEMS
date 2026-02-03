import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/back-button";
import { StudentResultClient } from "./ui";

export default async function StudentAttemptResultPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Student</Badge>
          <Badge>Result</Badge>
        </div>
        <div className="flex items-center gap-2">
          <BackButton fallbackHref="/student/results" size="sm">Back to Results</BackButton>
        </div>
      </div>
      <StudentResultClient attemptId={id} />
    </div>
  );
}
