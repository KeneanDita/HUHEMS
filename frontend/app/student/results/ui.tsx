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
  if (!value) return "";
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Results</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Loading..." : `${count} submitted attempt(s)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/student">Dashboard</Link>
          </Button>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle>Couldn’t load results</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-4">
        {items.map((r) => (
          <Card key={r.attemptId}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-xl">{r.examTitle || "Exam"}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{Number.isFinite(r.score) ? `${r.score.toFixed(1)}%` : "0%"}</Badge>
                </div>
              </div>
              <CardDescription>
                Submitted: <span className="text-foreground">{formatDateTime(r.endTime)}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                Started: <span className="text-foreground">{formatDateTime(r.startTime)}</span>
              </div>
              <Button asChild>
                <Link href={`/student/attempts/${r.attemptId}/result`}>View Details</Link>
              </Button>
            </CardContent>
          </Card>
        ))}

        {!loading && !error && items.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No results yet</CardTitle>
              <CardDescription>Submit an exam attempt and it will appear here.</CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
