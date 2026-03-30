import { Badge } from "@/components/ui/badge";
import { StudentAttemptClient } from "./ui";

export default async function StudentAttemptPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  return (
    <div className="grid gap-6">
      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-500 border-b pb-4">
        <Badge variant="secondary" className="shadow-sm">Student</Badge>
        <Badge className="shadow-sm">Attempt</Badge>
      </div>
      <StudentAttemptClient attemptId={id} />
    </div>
  );
}
