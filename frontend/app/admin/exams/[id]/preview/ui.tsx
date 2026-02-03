"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Choice = {
  id: string;
  text: string;
  order: number;
};

type Question = {
  id: string;
  text: string;
  type: "single_choice" | "multi_choice" | string;
  choices: Choice[];
};

type Exam = {
  id: string;
  title: string;
  description?: string;
  questionsPerPage?: number;
  durationMinutes?: number;
};

type ExamDetail = {
  exam: Exam;
  questions: Question[];
};

export function AdminExamPreviewClient({ initial }: { initial: ExamDetail }) {
  const [index, setIndex] = useState(0);

  const total = initial.questions.length;
  const q = initial.questions[index] ?? null;

  const sortedChoices = useMemo(() => {
    if (!q) return [] as Choice[];
    return q.choices.slice().sort((a, b) => a.order - b.order);
  }, [q]);

  if (!q) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No questions</CardTitle>
          <CardDescription>Add questions first, then preview.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
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
            {initial.questions.map((qq, i) => (
              <button
                key={qq.id}
                type="button"
                onClick={() => setIndex(i)}
                className={
                  "rounded-md border px-2 py-1 text-sm " +
                  (i === index ? "border-primary bg-primary/10" : "bg-background")
                }
                aria-label={`Question ${i + 1}`}
              >
                <div className="flex items-center justify-center">
                  <span>{i + 1}</span>
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

          <div className="text-xs text-muted-foreground">Preview is read-only (students won’t see answers).</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Question {index + 1}</CardTitle>
            <Badge variant="secondary">{q.type === "single_choice" ? "Single choice" : q.type === "multi_choice" ? "Multiple choice" : q.type}</Badge>
          </div>
          {initial.exam.description ? <CardDescription>{initial.exam.description}</CardDescription> : null}
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-base font-medium">{q.text}</p>

          <div className="grid gap-2">
            {sortedChoices.map((choice) => (
              <label key={choice.id} className="flex cursor-not-allowed items-center gap-3 rounded-md border p-3 opacity-90">
                <input
                  disabled
                  type={q.type === "single_choice" ? "radio" : "checkbox"}
                  name={q.id}
                  checked={false}
                  readOnly
                />
                <span className="text-sm">{choice.text}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
