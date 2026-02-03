import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/back-button";

import { AdminAnalyticsClient } from "./ui";

export default function AdminAnalyticsPage() {
  return (
    <div className="grid gap-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Admin</Badge>
            <Badge>Analytics</Badge>
          </div>
          <div className="flex items-center gap-2">
            <BackButton fallbackHref="/admin" size="sm">
              Back
            </BackButton>
          </div>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Analytics</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          View each exam's report (attempt totals, score distribution, and per-question stats).
        </p>
      </div>

      <AdminAnalyticsClient />
    </div>
  );
}
