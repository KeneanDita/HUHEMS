"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ClockIcon, LayersIcon, BookOpenIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";

type ExamListItem = {
  id: string;
  title: string;
  description: string;
  maxAttempts: number;
  durationMinutes: number;
  questionsPerPage: number;
  questionCount: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function normalizeExamListItem(raw: unknown): ExamListItem {
  const r = asRecord(raw);
  return {
    id: String(r?.id ?? r?.ID ?? ""),
    title: String(r?.title ?? r?.Title ?? ""),
    description: String(r?.description ?? r?.Description ?? ""),
    maxAttempts: Number(r?.maxAttempts ?? r?.MaxAttempts ?? 1),
    durationMinutes: Number(r?.durationMinutes ?? r?.DurationMinutes ?? 30),
    questionsPerPage: Number(r?.questionsPerPage ?? r?.QuestionsPerPage ?? 5),
    questionCount: Number(r?.questionCount ?? r?.QuestionCount ?? 0),
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

export function StudentDashboardClient() {
  const router = useRouter();

  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);

  const [rulesOpen, setRulesOpen] = useState(false);
  const [rulesAgreed, setRulesAgreed] = useState(false);
  const [rulesExam, setRulesExam] = useState<ExamListItem | null>(null);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/student/exams", { cache: "no-store" });
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
        throw new Error(msg || "Failed to load exams");
      }

      setExams(Array.isArray(data) ? data.map(normalizeExamListItem).filter((e) => Boolean(e.id)) : []);
    } catch (e: unknown) {
      setLoadError(getErrorMessage(e, "Failed to load exams"));
    } finally {
      setLoading(false);
    }
  }

  async function startExamAttempt(examId: string) {
    setStartingId(examId);
    setStartError(null);
    try {
      const res = await fetch(`/api/student/exams/${examId}/start`, { method: "POST" });
      const j = (await res.json().catch(() => ({}))) as unknown;
      if (!res.ok) {
        const r = asRecord(j);
        const msg = r && typeof r.message === "string" ? r.message : "Failed to start attempt";
        throw new Error(msg);
      }

      const r = asRecord(j);
      const attemptId = r ? String(r.attemptId ?? "") : "";
      if (!attemptId) throw new Error("Missing attemptId");

      setRulesOpen(false);
      router.push(`/student/attempts/${attemptId}`);
    } catch (e: unknown) {
      setStartError(getErrorMessage(e, "Failed to start attempt"));
    } finally {
      setStartingId(null);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const publishedCount = useMemo(() => exams.length, [exams.length]);

  return (
    <div className="grid gap-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <p className="text-sm text-muted-foreground">
          {loading ? "Loading exams…" : `${publishedCount} published exam${publishedCount !== 1 ? "s" : ""}`}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/student/results")}>
            My Results
          </Button>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Error */}
      {loadError ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive text-base">Couldn&apos;t load exams</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {/* Exam list */}
      <div className="grid gap-4">
        {exams.map((exam) => (
          <Card key={exam.id} className="overflow-hidden transition-all duration-200 hover:shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg leading-snug">{exam.title}</CardTitle>
              {exam.description ? (
                <CardDescription className="mt-1 text-sm leading-relaxed">{exam.description}</CardDescription>
              ) : null}
            </CardHeader>

            <CardContent className="pt-0">
              {/* Stats row */}
              <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <BookOpenIcon className="size-3.5 text-primary/70" />
                  <span>{exam.questionCount} questions</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <ClockIcon className="size-3.5 text-primary/70" />
                  <span>{exam.durationMinutes} min</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <LayersIcon className="size-3.5 text-primary/70" />
                  <span>{exam.maxAttempts} attempt{exam.maxAttempts !== 1 ? "s" : ""} allowed</span>
                </span>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {exam.questionsPerPage} per page
                </Badge>
              </div>

              {/* Action */}
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    setRulesExam(exam);
                    setRulesAgreed(false);
                    setStartError(null);
                    setRulesOpen(true);
                  }}
                  disabled={startingId === exam.id}
                  className="shadow-sm hover:shadow-md transition-shadow"
                >
                  {startingId === exam.id ? "Starting…" : "Take Exam"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {!loading && !loadError && exams.length === 0 ? (
          <Card className="border-dashed">
            <CardHeader className="py-10 text-center">
              <CardTitle className="text-base text-muted-foreground">No published exams yet</CardTitle>
              <CardDescription>Ask your admin to publish an exam.</CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </div>

      {/* Rules dialog */}
      <AlertDialog
        open={rulesOpen}
        onOpenChange={(nextOpen) => {
          if (startingId) return;
          if (nextOpen) {
            setStartError(null);
          } else {
            setRulesExam(null);
            setRulesAgreed(false);
          }
          setRulesOpen(nextOpen);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exam Rules &amp; Instructions</AlertDialogTitle>
            <AlertDialogDescription>
              Please read the following rules carefully before starting the exam.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="mt-2 space-y-3 text-sm">
            <div className="rounded-md border p-3">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <span className="font-semibold">Time Limit:</span> The exam is time-bound. Once started, the
                  timer cannot be paused.
                </li>
                <li>
                  <span className="font-semibold">No Tab Switching:</span> Do not refresh, close, or switch browser
                  tabs during the exam.
                </li>
                <li>
                  <span className="font-semibold">No External Help:</span> Use of mobile phones, books, notes, or any
                  external assistance is strictly prohibited.
                </li>
                <li>
                  <span className="font-semibold">Single Attempt:</span> You are allowed only one attempt. Answers
                  cannot be changed after submission.
                </li>
                <li>
                  <span className="font-semibold">Auto-Submission:</span> The exam will be automatically submitted
                  when the time expires.
                </li>
              </ul>
              <p className="mt-3 text-muted-foreground">Click &quot;Start Exam&quot; to agree to the rules and begin.</p>
            </div>

            <div className="flex items-start gap-3 rounded-md border p-3">
              <input
                id="agree_exam_rules"
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-input bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                checked={rulesAgreed}
                onChange={(e) => setRulesAgreed(e.target.checked)}
                disabled={Boolean(startingId)}
              />
              <Label htmlFor="agree_exam_rules" className="leading-snug">
                I have read and agree to the exam rules.
              </Label>
            </div>
          </div>

          {startError ? <p className="mt-3 text-sm font-medium text-destructive">{startError}</p> : null}

          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button type="button" variant="outline" disabled={Boolean(startingId)}>
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                type="button"
                disabled={!rulesExam || !rulesAgreed || Boolean(startingId)}
                onClick={(e) => {
                  e.preventDefault();
                  if (!rulesExam) return;
                  void startExamAttempt(rulesExam.id);
                }}
              >
                {startingId ? "Starting…" : "Start Exam"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
