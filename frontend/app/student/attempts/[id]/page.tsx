import { Badge } from "@/components/ui/badge";
import { StudentAttemptClient } from "./ui";

export default async function StudentAttemptPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  return (
    <div className="grid gap-6">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">Student</Badge>
        <Badge>Attempt</Badge>
      </div>
      <StudentAttemptClient attemptId={id} />
    </div>
  );
}
