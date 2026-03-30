"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ResultListItem = {
  attemptId: string;
  examId: string;
  examTitle: string;
  score: number;
  startTime: string;
  endTime: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

function normalizeResult(raw: unknown): ResultListItem {
  const r = asRecord(raw);
  return {
    attemptId: String(r?.attemptId ?? r?.AttemptID ?? r?.attemptID ?? ""),
    examId: String(r?.examId ?? r?.ExamID ?? ""),
    examTitle: String(r?.examTitle ?? r?.ExamTitle ?? ""),
    score: Number(r?.score ?? r?.Score ?? 0),
    startTime: String(r?.startTime ?? r?.StartTime ?? ""),
    endTime: (r?.endTime ?? r?.EndTime) ? String(r?.endTime ?? r?.EndTime) : null,
  };
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export function StudentResultsClient() {
  const [items, setItems] = useState<ResultListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/student/results", { cache: "no-store" });
      const text = await res.text();
      const data = (() => {
        try {
          return JSON.parse(text) as unknown;
        } catch {
          return null;
        }
      })();

      if (!res.ok) {
        const r = asRecord(data);
        const msg = r && typeof r.message === "string" ? r.message : text;
        throw new Error(msg || "Failed to load results");
      }

      setItems(Array.isArray(data) ? data.map(normalizeResult).filter((x) => Boolean(x.attemptId)) : []);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to load results"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const count = useMemo(() => items.length, [items.length]);

  return (
    <div className="grid gap-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <p className="text-sm text-muted-foreground">
          {loading ? "Loading results…" : `${count} submitted attempt${count !== 1 ? "s" : ""}`}
        </p>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          Refresh
        </Button>
      </div>

      {/* Error */}
      {error ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive text-base">Couldn&apos;t load results</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {/* Results list */}
      <div className="grid gap-4">
        {items.map((r) => (
          <Card key={r.attemptId} className="overflow-hidden transition-all duration-200 hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle className="text-lg leading-snug">{r.examTitle || "Exam"}</CardTitle>
                <Badge
                  variant={Number.isFinite(r.score) && r.score >= 50 ? "default" : "secondary"}
                  className="shrink-0 text-sm tabular-nums"
                >
                  {Number.isFinite(r.score) ? `${r.score.toFixed(1)}%` : "0%"}
                </Badge>
              </div>
              <CardDescription className="mt-1 text-xs">
                Submitted: <span className="text-foreground">{formatDateTime(r.endTime)}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="mb-3 text-xs text-muted-foreground">
                Started: <span className="text-foreground">{formatDateTime(r.startTime)}</span>
              </div>
              <div className="flex justify-end">
                <Button asChild size="sm" className="shadow-sm hover:shadow-md transition-shadow">
                  <Link href={`/student/attempts/${r.attemptId}/result`}>View Details</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {!loading && !error && items.length === 0 ? (
          <Card className="border-dashed">
            <CardHeader className="py-10 text-center">
              <CardTitle className="text-base text-muted-foreground">No results yet</CardTitle>
              <CardDescription>Submit an exam attempt and it will appear here.</CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
