"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ResultQuestion = {
  questionId: string;
  text: string;
  type: string;
  selectedChoiceIds: string[];
  correctChoiceIds: string[];
  isCorrect: boolean;
  flagged: boolean;
};

type ResultResponse = {
  attemptId: string;
  examId: string;
  score: number;
  correctTotal: number;
  questionsTotal: number;
  questions: ResultQuestion[];
};

type Choice = { id: string; text: string; order: number };

type AttemptQuestion = {
  id: string;
  choices: Choice[];
};

type AttemptDetailResponse = {
  questions: AttemptQuestion[];
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

export function StudentResultClient({ attemptId }: { attemptId: string }) {
  const router = useRouter();

  const [data, setData] = useState<ResultResponse | null>(null);
  const [attempt, setAttempt] = useState<AttemptDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [resResult, resAttempt] = await Promise.all([
        fetch(`/api/student/attempts/${attemptId}/result`, { cache: "no-store" }),
        fetch(`/api/student/attempts/${attemptId}`, { cache: "no-store" }),
      ]);

      const [textResult, textAttempt] = await Promise.all([resResult.text(), resAttempt.text()]);

      const jResult = (() => {
        try {
          return JSON.parse(textResult) as unknown;
        } catch {
          return null;
        }
      })();

      const jAttempt = (() => {
        try {
          return JSON.parse(textAttempt) as unknown;
        } catch {
          return null;
        }
      })();

      if (!resResult.ok || !jResult || typeof jResult !== "object") {
        const msg =
          jResult && typeof jResult === "object" && "message" in jResult && typeof (jResult as any).message === "string"
            ? String((jResult as any).message)
            : textResult;
        throw new Error(msg || `Failed to load result (${resResult.status})`);
      }

      setData(jResult as ResultResponse);

      if (resAttempt.ok && jAttempt && typeof jAttempt === "object") {
        setAttempt(jAttempt as AttemptDetailResponse);
      } else {
        setAttempt(null);
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to load result"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  const scoreLabel = useMemo(() => {
    if (!data) return "";
    return `${data.score.toFixed(2)}%`;
  }, [data]);

  const questionMap = useMemo(() => {
    const m = new Map<string, AttemptQuestion>();
    for (const q of attempt?.questions ?? []) m.set(q.id, q);
    return m;
  }, [attempt]);

  function formatChoices(questionId: string, choiceIds: string[]): string {
    if (!choiceIds.length) return "None";
    const q = questionMap.get(questionId);
    if (!q || !Array.isArray(q.choices) || q.choices.length === 0) return choiceIds.map(() => "Answer").join(", ");

    const byId = new Map<string, Choice>();
    for (const c of q.choices) byId.set(c.id, c);

    return choiceIds
      .map((id) => {
        const c = byId.get(id);
        if (!c) return "Answer";
        const text = typeof c.text === "string" && c.text.trim() ? c.text.trim() : "Answer";
        return text;
      })
      .join(", ");
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading result…</CardTitle>
          <CardDescription>Please wait.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Result not available</CardTitle>
          <CardDescription>{error ?? "Try again."}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={() => router.push("/student")}>Back to Dashboard</Button>
          <Button variant="outline" onClick={() => void load()}>
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Your Score</CardTitle>
          <CardDescription>
            {data.correctTotal}/{data.questionsTotal} correct
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-3xl font-semibold tracking-tight">{scoreLabel}</div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.push(`/student/attempts/${attemptId}`)}>
              View Attempt
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Review</CardTitle>
          <CardDescription>Selected and correct choices are shown as option text.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-3 pl-6">
            {data.questions.map((q) => (
            <li key={q.questionId} className="rounded-md border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {q.flagged ? <Badge variant="destructive">Flagged</Badge> : null}
                  {q.isCorrect ? <Badge>Correct</Badge> : <Badge variant="secondary">Incorrect</Badge>}
                </div>
                <Badge variant="secondary">{q.type}</Badge>
              </div>
              <p className="mt-2 font-medium">{q.text}</p>
              <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
                <div>Selected: {formatChoices(q.questionId, q.selectedChoiceIds)}</div>
                <div>Correct: {formatChoices(q.questionId, q.correctChoiceIds)}</div>
              </div>
            </li>
          ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
