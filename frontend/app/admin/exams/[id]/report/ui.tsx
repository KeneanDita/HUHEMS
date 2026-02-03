"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

type Report = {
  attemptsTotal: number;
  submittedTotal: number;
  averageScore: number;
  minScore: number;
  maxScore: number;
  questionsTotal: number;
  answersTotal: number;
  correctTotal: number;
  questionReports: Array<{
    questionId: string;
    text: string;
    type: string;
    answersTotal: number;
    correctTotal: number;
    choiceCounts: Array<{ choiceId: string; text: string; count: number; correct: boolean; order: number }>;
  }>;
};

type ExamDetail = {
  exam: {
    id: string;
    title: string;
    description?: string;
  };
};

export function AdminExamReportClient({ examId }: { examId: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [title, setTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadReport() {
    const res = await fetch(`/api/admin/exams/${examId}/report`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { message?: string })?.message ?? "Failed to load report");
    setReport(data as Report);
  }

  async function loadExamTitle() {
    const res = await fetch(`/api/admin/exams/${examId}`, { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (res.ok && data && typeof data === "object") {
      const d = data as ExamDetail;
      if (d?.exam?.title) setTitle(String(d.exam.title));
    }
  }

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadExamTitle(), loadReport()]);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to load report"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  const hasQuestions = useMemo(() => (report?.questionReports?.length ?? 0) > 0, [report]);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-2">
            <span>{title ? `Report: ${title}` : "Report"}</span>
            <Button variant="outline" onClick={() => void loadAll()} disabled={loading}>
              {loading ? "Loading..." : "Refresh"}
            </Button>
          </CardTitle>
          <CardDescription>Uses submitted attempts (draft exams may show 0s).</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}

          {report ? (
            <div className="grid gap-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Attempts: {report.attemptsTotal}</Badge>
                <Badge variant="secondary">Submitted: {report.submittedTotal}</Badge>
                <Badge variant="secondary">Avg: {Number(report.averageScore).toFixed(2)}</Badge>
                <Badge variant="secondary">Min: {Number(report.minScore).toFixed(2)}</Badge>
                <Badge variant="secondary">Max: {Number(report.maxScore).toFixed(2)}</Badge>
              </div>

              {hasQuestions ? (
                <div className="grid gap-3">
                  {report.questionReports.map((qr) => (
                    <div key={qr.questionId} className="rounded-md border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{qr.text}</p>
                        <Badge variant="secondary">
                          {qr.correctTotal}/{qr.answersTotal} correct
                        </Badge>
                      </div>
                      <ul className="mt-3 grid gap-2 text-sm">
                        {qr.choiceCounts
                          .slice()
                          .sort((a, b) => a.order - b.order)
                          .map((cc) => (
                            <li
                              key={cc.choiceId}
                              className="flex items-center justify-between gap-2 rounded bg-muted/40 px-3 py-2"
                            >
                              <span>{cc.text}</span>
                              <span className="flex items-center gap-2">
                                {cc.correct ? <Badge>Correct</Badge> : null}
                                <Badge variant="secondary">{cc.count}</Badge>
                              </span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No questions in report yet.</p>
              )}
            </div>
          ) : loading ? (
            <p className="text-sm text-muted-foreground">Loading report…</p>
          ) : (
            <p className="text-sm text-muted-foreground">No report loaded.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
