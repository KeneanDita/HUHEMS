import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/back-button";
import { StudentResultClient } from "./ui";

export default async function StudentAttemptResultPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  return (
    <div className="grid gap-8">
      <div className="animate-in fade-in slide-in-from-top-4 duration-500 border-b pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="shadow-sm">Student</Badge>
            <Badge className="shadow-sm">Result</Badge>
          </div>
          <div className="flex items-center gap-2">
            <BackButton fallbackHref="/student/results" size="sm">Back to Results</BackButton>
          </div>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Attempt Result</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Your score and answer breakdown for this exam attempt.
        </p>
      </div>
      <StudentResultClient attemptId={id} />
    </div>
  );
}
