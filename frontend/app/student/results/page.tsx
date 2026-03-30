import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";

import { StudentResultsClient } from "./ui";

export default function StudentResultsPage() {
  return (
    <div className="grid gap-8">
      <div className="animate-in fade-in slide-in-from-top-4 duration-500 border-b pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="shadow-sm">Student</Badge>
            <Badge className="shadow-sm">Results</Badge>
          </div>
          <div className="flex items-center gap-2">
            <BackButton fallbackHref="/student" size="sm">Back</BackButton>
            <Button asChild variant="outline" size="sm">
              <Link href="/student">Dashboard</Link>
            </Button>
          </div>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">My Results</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Review your submitted exam attempts and detailed score breakdowns.
        </p>
      </div>

      <StudentResultsClient />
    </div>
  );
}
