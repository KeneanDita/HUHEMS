"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FlagIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BackButton } from "@/components/back-button";
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

type Attempt = {
  id: string;
  examId: string;
  startTime: string;
  endTime: string | null;
  score: number;
  submitted: boolean;
};

type Exam = {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  questionsPerPage: number;
};

type Choice = { id: string; text: string; order: number };

type Question = {
  id: string;
  text: string;
  type: "single_choice" | "multi_choice";
  choices: Choice[];
  selectedChoiceIds: string[];
  flagged: boolean;
};

type AttemptDetailResponse = {
  attempt: Attempt;
  exam: Exam;
  questions: Question[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  if (hours <= 0) return `${mm}:${ss}`;
  const hh = String(hours).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function StudentAttemptClient({ attemptId }: { attemptId: string }) {
  const router = useRouter();

  const [data, setData] = useState<AttemptDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [submitOpen, setSubmitOpen] = useState(false);

  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const autoSubmittedRef = useRef(false);

  const [index, setIndex] = useState(0);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/student/attempts/${attemptId}`, { cache: "no-store" });
      const text = await res.text();
      const j = (() => {
        try {
          return JSON.parse(text) as unknown;
        } catch {
          return null;
        }
      })();

      if (!res.ok || !j || typeof j !== "object") {
        const r = asRecord(j);
        const msg = r && typeof r.message === "string" ? r.message : text;
        throw new Error(msg || `Failed to load attempt (${res.status})`);
      }

      const next = j as AttemptDetailResponse;
      setData(next);
      setIndex((prev) => {
        const max = Math.max(0, (next.questions?.length ?? 1) - 1);
        return Math.min(prev, max);
      });
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to load attempt"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  const total = data?.questions.length ?? 0;
  const question = data?.questions[index] ?? null;

  const deadlineMs = useMemo(() => {
    if (!data) return null;
    if (data.exam.durationMinutes <= 0) return null;
    const start = Date.parse(data.attempt.startTime);
    if (Number.isNaN(start)) return null;
    return start + data.exam.durationMinutes * 60 * 1000;
  }, [data]);

  const timeUp = remainingMs !== null && remainingMs <= 0;

  const answeredCount = useMemo(
    () => (data ? data.questions.filter((q) => (q.selectedChoiceIds?.length ?? 0) > 0).length : 0),
    [data],
  );

  const allAnswered = total > 0 && answeredCount === total;

  const flaggedCount = useMemo(() => (data ? data.questions.filter((q) => q.flagged).length : 0), [data]);

  useEffect(() => {
    autoSubmittedRef.current = false;
  }, [attemptId]);

  useEffect(() => {
    if (!deadlineMs || data?.attempt.submitted) {
      setRemainingMs(null);
      return;
    }

    const tick = () => {
      const next = Math.max(0, deadlineMs - Date.now());
      setRemainingMs(next);
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [deadlineMs, data?.attempt.submitted]);

  async function submitAttemptRequest() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/student/attempts/${attemptId}/submit`, { method: "POST" });
      const j = (await res.json().catch(() => ({}))) as unknown;
      if (!res.ok) {
        const r = asRecord(j);
        const msg = r && typeof r.message === "string" ? r.message : "Failed to submit";
        throw new Error(msg);
      }
      router.push(`/student/attempts/${attemptId}/result`);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to submit"));
      autoSubmittedRef.current = false;
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!deadlineMs || !data || data.attempt.submitted) return;
    if (!timeUp) return;
    if (autoSubmittedRef.current) return;

    autoSubmittedRef.current = true;
    setSubmitOpen(false);
    setError("Time is up. Submitting your exam...");
    void submitAttemptRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp, deadlineMs, data?.attempt.submitted]);

  async function saveAnswer(questionId: string, selectedChoiceIds: string[]) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/student/attempts/${attemptId}/answer`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questionId, selectedChoiceIds }),
      });
      const j = (await res.json().catch(() => ({}))) as unknown;
      if (!res.ok) {
        const r = asRecord(j);
        const msg = r && typeof r.message === "string" ? r.message : "Failed to save answer";
        throw new Error(msg);
      }

      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          questions: prev.questions.map((q) => (q.id === questionId ? { ...q, selectedChoiceIds } : q)),
        };
      });
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to save answer"));
    } finally {
      setBusy(false);
    }
  }

  async function setFlag(questionId: string, flagged: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/student/attempts/${attemptId}/flag`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questionId, flagged }),
      });
      const j = (await res.json().catch(() => ({}))) as unknown;
      if (!res.ok) {
        const r = asRecord(j);
        const msg = r && typeof r.message === "string" ? r.message : "Failed to update flag";
        throw new Error(msg);
      }

      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          questions: prev.questions.map((q) => (q.id === questionId ? { ...q, flagged } : q)),
        };
      });
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to update flag"));
    } finally {
      setBusy(false);
    }
  }

  async function submitAttempt() {
    if (!allAnswered) {
      setError("Please answer every question before submitting.");
      const firstUnanswered = data?.questions.findIndex((q) => (q.selectedChoiceIds?.length ?? 0) === 0) ?? -1;
      if (firstUnanswered >= 0) setIndex(firstUnanswered);
      return;
    }

    setSubmitOpen(true);
  }

  async function submitAttemptConfirmed() {
    await submitAttemptRequest();
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading attempt…</CardTitle>
          <CardDescription>Please wait.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!data || !question) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attempt not available</CardTitle>
          <CardDescription>{error ?? "Try going back to the dashboard."}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push("/student")}>Back to Dashboard</Button>
        </CardContent>
      </Card>
    );
  }

  if (data.attempt.submitted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Already submitted</CardTitle>
          <CardDescription>You can view your result.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={() => router.push(`/student/attempts/${attemptId}/result`)}>View Result</Button>
          <Button variant="outline" onClick={() => router.push("/student")}>
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  const lockInteractions = busy || timeUp;

  const countdownBadgeVariant: "default" | "secondary" | "destructive" = (() => {
    if (remainingMs === null) return "secondary";
    if (remainingMs <= 5 * 60 * 1000) return "destructive";
    return "default";
  })();

  return (
    <div className="grid gap-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Student</Badge>
          <Badge>Take Exam</Badge>
          {flaggedCount > 0 ? <Badge variant="destructive">{flaggedCount} flagged</Badge> : null}
          <div className="ml-auto">
            <BackButton fallbackHref="/student" size="sm">Back</BackButton>
          </div>
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{data.exam.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{data.exam.description}</p>
        <div className="mt-2 text-sm text-muted-foreground">
          Time allowed:{" "}
          <span className="text-foreground">
            {data.exam.durationMinutes > 0 ? `${data.exam.durationMinutes} minutes` : "No time limit"}
          </span>
          {deadlineMs ? (
            <>
              {" "}· Time left:{" "}
              <Badge variant={countdownBadgeVariant} className="align-middle">
                {remainingMs === null ? "—" : formatRemaining(remainingMs)}
              </Badge>
            </>
          ) : null}
          {" "}· Answered:{" "}
          <span className="text-foreground">
            {answeredCount}/{total}
          </span>
        </div>
      </div>

      {error ? (
        <p className="text-sm font-medium text-destructive">{error}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Questions</CardTitle>
            <CardDescription>
              {index + 1} / {total}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid grid-cols-6 gap-2">
              {data.questions.map((q, i) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={
                    "rounded-md border px-2 py-1 text-sm " +
                    (i === index ? "border-primary bg-primary/10" : "bg-background")
                  }
                  aria-label={`Question ${i + 1}`}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>{i + 1}</span>
                    {(q.selectedChoiceIds?.length ?? 0) > 0 ? <span className="text-emerald-600">●</span> : null}
                    {q.flagged ? <FlagIcon className="h-3.5 w-3.5 text-destructive" aria-hidden="true" /> : null}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={index <= 0} onClick={() => setIndex((v) => Math.max(0, v - 1))}>
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={index >= total - 1}
                onClick={() => setIndex((v) => Math.min(total - 1, v + 1))}
              >
                Next
              </Button>
            </div>

            <AlertDialog open={submitOpen} onOpenChange={setSubmitOpen}>
              <Button disabled={lockInteractions || !allAnswered} onClick={submitAttempt}>
                {timeUp ? "Submitting..." : "Submit Exam"}
              </Button>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Submit exam now?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You won’t be able to change your answers after submitting.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel asChild>
                    <Button type="button" variant="outline" disabled={busy}>
                      Cancel
                    </Button>
                  </AlertDialogCancel>
                  <AlertDialogAction asChild>
                    <Button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        setSubmitOpen(false);
                        await submitAttemptConfirmed();
                      }}
                    >
                      {busy ? "Submitting..." : "Submit"}
                    </Button>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {!allAnswered ? (
              <div className="text-xs text-muted-foreground">You must answer every question before submitting.</div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Question {index + 1}</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant={question.flagged ? "destructive" : "outline"}
                  disabled={lockInteractions}
                  onClick={() => void setFlag(question.id, !question.flagged)}
                >
                  <FlagIcon className={"mr-2 h-4 w-4 " + (question.flagged ? "text-destructive-foreground" : "text-muted-foreground")} aria-hidden="true" />
                  {question.flagged ? "Unflag" : "Flag"}
                </Button>
              </div>
            </div>
            <CardDescription>{question.type === "single_choice" ? "Single choice" : "Multiple choice"}</CardDescription>
            <div className="mt-2 text-xs text-muted-foreground">
              {(question.selectedChoiceIds?.length ?? 0) > 0 ? (
                <span className="text-foreground">Answered</span>
              ) : (
                <span>Not answered</span>
              )}
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-base font-medium">{question.text}</p>

            <div className="grid gap-2">
              {question.choices
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((choice) => {
                  const checked = question.selectedChoiceIds.includes(choice.id);

                  return (
                    <label key={choice.id} className="flex cursor-pointer items-center gap-3 rounded-md border p-3">
                      <input
                        type={question.type === "single_choice" ? "radio" : "checkbox"}
                        name={question.id}
                        checked={checked}
                        disabled={lockInteractions}
                        onChange={(e) => {
                          const current = question.selectedChoiceIds.slice();
                          if (question.type === "single_choice") {
                            void saveAnswer(question.id, e.target.checked ? [choice.id] : []);
                            return;
                          }
                          if (e.target.checked) {
                            void saveAnswer(question.id, [...current, choice.id]);
                            return;
                          }
                          void saveAnswer(
                            question.id,
                            current.filter((id) => id !== choice.id),
                          );
                        }}
                      />
                      <span className="text-sm">{choice.text}</span>
                    </label>
                  );
                })}
            </div>

            <div className="text-xs text-muted-foreground">
              Answers save immediately. You can navigate freely.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
