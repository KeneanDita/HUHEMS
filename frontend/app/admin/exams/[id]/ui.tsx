"use client";

import { useEffect, useMemo, useState } from "react";

import { UploadIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Choice = {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
};

type Question = {
  id: string;
  text: string;
  type: "single_choice" | "multi_choice";
  choices: Choice[];
};

type Exam = {
  id: string;
  title: string;
  description?: string;
  published: boolean;
  maxAttempts: number;
  questionsPerPage: number;
  durationMinutes: number;
};

type ExamDetail = {
  exam: Exam;
  questions: Question[];
};

export type { ExamDetail };

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

export function ExamEditorClient({ examId, initial }: { examId: string; initial: ExamDetail }) {
  const [data, setData] = useState<ExamDetail>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [unpublishOpen, setUnpublishOpen] = useState(false);
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);
  const [deleteQuestionText, setDeleteQuestionText] = useState<string | null>(null);

  const [tab, setTab] = useState<"settings" | "questions" | "reports">("questions");

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editType, setEditType] = useState<Question["type"]>("single_choice");
  const [editChoices, setEditChoices] = useState<Array<{ text: string; isCorrect: boolean }>>([]);

  const [qText, setQText] = useState("");
  const [qType, setQType] = useState<Question["type"]>("single_choice");
  const [choices, setChoices] = useState<Array<{ text: string; isCorrect: boolean }>>([
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const [report, setReport] = useState<Report | null>(null);

  const [sTitle, setSTitle] = useState(initial.exam.title);
  const [sDescription, setSDescription] = useState(initial.exam.description ?? "");
  const [sDurationMinutes, setSDurationMinutes] = useState<number>(Number(initial.exam.durationMinutes ?? 30));
  const [sMaxAttempts, setSMaxAttempts] = useState<number>(Number(initial.exam.maxAttempts ?? 1));
  const [sQuestionsPerPage, setSQuestionsPerPage] = useState<number>(Number(initial.exam.questionsPerPage ?? 5));

  useEffect(() => {
    setSTitle(data.exam.title);
    setSDescription(data.exam.description ?? "");
    setSDurationMinutes(Number(data.exam.durationMinutes ?? 30));
    setSMaxAttempts(Number(data.exam.maxAttempts ?? 1));
    setSQuestionsPerPage(Number(data.exam.questionsPerPage ?? 5));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.exam.id]);

  async function reload() {
    const res = await fetch(`/api/admin/exams/${examId}`, { cache: "no-store" });
    const next = await res.json().catch(() => null);
    if (!res.ok) throw new Error(next?.message ?? "Failed to reload exam");
    setData(next as ExamDetail);
  }

  function enforceSingleChoice(next: Array<{ text: string; isCorrect: boolean }>): Array<{ text: string; isCorrect: boolean }> {
    const firstCorrectIndex = next.findIndex((c) => c.isCorrect);
    const idx = firstCorrectIndex >= 0 ? firstCorrectIndex : 0;
    return next.map((c, i) => ({ ...c, isCorrect: i === idx }));
  }

  function beginEdit(q: Question) {
    setEditingQuestionId(q.id);
    setEditText(q.text);
    setEditType(q.type);
    setEditChoices(
      q.choices
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((c) => ({ text: c.text, isCorrect: c.isCorrect })),
    );
  }

  function cancelEdit() {
    setEditingQuestionId(null);
    setEditText("");
    setEditType("single_choice");
    setEditChoices([]);
  }

  const questionCount = useMemo(() => data.questions.length, [data.questions.length]);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button variant={tab === "settings" ? "default" : "outline"} onClick={() => setTab("settings")}>
            Settings
          </Button>
          <Button variant={tab === "questions" ? "default" : "outline"} onClick={() => setTab("questions")}>
            Questions
          </Button>
          <Button variant={tab === "reports" ? "default" : "outline"} onClick={() => setTab("reports")}>
            Reports
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          Questions: <span className="text-foreground">{questionCount}</span>
        </div>
      </div>

      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}

      {tab === "settings" ? (
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Exam Settings</CardTitle>
            <div className="flex items-center gap-2">
              {data.exam.published ? <Badge>Published</Badge> : <Badge variant="secondary">Draft</Badge>}
              <Button variant="outline" disabled={busy} onClick={() => setTab("questions")}>
                Questions
              </Button>
              {data.exam.published ? (
                <AlertDialog open={unpublishOpen} onOpenChange={setUnpublishOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={busy}>
                      Unpublish
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Unpublish this exam?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Students will no longer see this exam in their dashboard. Existing attempts/results are not deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel asChild>
                        <Button variant="outline">Cancel</Button>
                      </AlertDialogCancel>
                      <AlertDialogAction asChild>
                        <Button
                          variant="destructive"
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            setError(null);
                            try {
                              const res = await fetch(`/api/admin/exams/${examId}`, {
                                method: "PUT",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify({ published: false }),
                              });
                              const j = await res.json().catch(() => ({}));
                              if (!res.ok) throw new Error(j?.message ?? "Failed to unpublish");
                              setUnpublishOpen(false);
                              await reload();
                            } catch (e: unknown) {
                              setError(getErrorMessage(e, "Failed to unpublish"));
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          {busy ? "Unpublishing..." : "Unpublish"}
                        </Button>
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button
                  variant="default"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError(null);
                    try {
                      const res = await fetch(`/api/admin/exams/${examId}/publish`, { method: "POST" });
                      const j = await res.json().catch(() => ({}));
                      if (!res.ok) throw new Error(j?.message ?? "Failed to publish");
                      await reload();
                    } catch (e: unknown) {
                      setError(getErrorMessage(e, "Failed to publish"));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Publish
                </Button>
              )}
            </div>
          </div>
          <CardDescription>
            Questions: <span className="text-foreground">{questionCount}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError(null);
              try {
                const res = await fetch(`/api/admin/exams/${examId}`, {
                  method: "PUT",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    title: sTitle,
                    description: sDescription,
                    durationMinutes: sDurationMinutes,
                    maxAttempts: sMaxAttempts,
                    questionsPerPage: sQuestionsPerPage,
                  }),
                });
                const j = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(j?.message ?? "Failed to update exam settings");
                await reload();
              } catch (e: unknown) {
                setError(getErrorMessage(e, "Failed to update exam settings"));
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="sTitle">Name</Label>
              <Input id="sTitle" value={sTitle} onChange={(e) => setSTitle(e.target.value)} placeholder="Exam name" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sDesc">Description</Label>
              <textarea
                id="sDesc"
                className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm"
                value={sDescription}
                onChange={(e) => setSDescription(e.target.value)}
                placeholder="Optional"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="sDuration">Time (minutes)</Label>
                <Input
                  id="sDuration"
                  type="number"
                  min={1}
                  value={sDurationMinutes}
                  onChange={(e) => setSDurationMinutes(Number(e.target.value || 1))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sAttempts">Max attempts</Label>
                <Input
                  id="sAttempts"
                  type="number"
                  min={1}
                  value={sMaxAttempts}
                  onChange={(e) => setSMaxAttempts(Number(e.target.value || 1))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sQpp">Questions per page</Label>
                <Input
                  id="sQpp"
                  type="number"
                  min={1}
                  value={sQuestionsPerPage}
                  onChange={(e) => setSQuestionsPerPage(Number(e.target.value || 1))}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={busy || !sTitle.trim()}>
                {busy ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </form>

          <p className="mt-4 text-sm text-muted-foreground">
            Publish validation: each question needs ≥ 2 options and at least one correct option (single-choice requires exactly one).
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  const res = await fetch(`/api/admin/exams/${examId}/report`, { cache: "no-store" });
                  const j = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(j?.message ?? "Failed to load report");
                  setReport(j as Report);
                } catch (e: unknown) {
                  setError(getErrorMessage(e, "Failed to load report"));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Load Report
            </Button>
              <Button variant="outline" disabled={busy} onClick={() => setTab("reports")}>
                View Reports
              </Button>
          </div>
        </CardContent>
      </Card>

      ) : null}

      {tab === "questions" ? (
      <>
      <Card>
        <CardHeader>
          <CardTitle>Import Questions (CSV)</CardTitle>
          <CardDescription>
            CSV columns: <span className="font-medium text-foreground">text,type,choices,correct</span>. Choices and correct are pipe-separated.
            Example: <span className="font-medium text-foreground">"2+2?",single_choice,"2|3|4|5","3"</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="csvImport">CSV file</Label>
            <Input
              id="csvImport"
              type="file"
              accept=".csv,text/csv"
              disabled={busy || importBusy}
              onChange={(e) => {
                setImportError(null);
                setImportSuccess(null);
                setImportFile(e.target.files?.[0] ?? null);
              }}
            />
          </div>

          {importError ? <p className="text-sm font-medium text-destructive">{importError}</p> : null}
          {importSuccess ? <p className="text-sm font-medium text-emerald-700">{importSuccess}</p> : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy || importBusy || !importFile}
              onClick={async () => {
                if (!importFile) return;
                setImportBusy(true);
                setImportError(null);
                setImportSuccess(null);
                try {
                  const fd = new FormData();
                  fd.set("file", importFile);
                  const res = await fetch(`/api/admin/exams/${examId}/questions/import`, {
                    method: "POST",
                    body: fd,
                  });
                  const text = await res.text();
                  const j = (() => {
                    try {
                      return JSON.parse(text);
                    } catch {
                      return null;
                    }
                  })();

                  if (!res.ok) {
                    const msg = (j && typeof j === "object" && (j as any).message) ? String((j as any).message) : (text || "Failed to import questions");
                    throw new Error(msg);
                  }

                  const created = Number((j && typeof j === "object" ? (j as any).createdQuestions : 0) ?? 0);
                  setImportSuccess(created > 0 ? `Imported ${created} question(s).` : "Import complete.");
                  setImportFile(null);
                  const el = document.getElementById("csvImport") as HTMLInputElement | null;
                  if (el) el.value = "";
                  await reload();
                } catch (e: unknown) {
                  setImportError(getErrorMessage(e, "Failed to import questions"));
                } finally {
                  setImportBusy(false);
                }
              }}
            >
              <UploadIcon className="size-4" />
              {importBusy ? "Importing..." : "Import"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Question</CardTitle>
          <CardDescription>Add options and mark the correct answer(s).</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError(null);
              try {
                const res = await fetch(`/api/admin/exams/${examId}/questions`, {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    text: qText,
                    type: qType,
                    choices: choices.map((c, idx) => ({ text: c.text, isCorrect: c.isCorrect, order: idx + 1 })),
                  }),
                });
                const j = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(j?.message ?? "Failed to add question");

                setQText("");
                setQType("single_choice");
                setChoices([
                  { text: "", isCorrect: true },
                  { text: "", isCorrect: false },
                  { text: "", isCorrect: false },
                  { text: "", isCorrect: false },
                ]);
                await reload();
              } catch (e: unknown) {
                setError(getErrorMessage(e, "Failed to add question"));
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="qText">Question</Label>
              <textarea
                id="qText"
                className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm"
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                placeholder="Enter the question text"
              />
            </div>

            <div className="grid gap-2">
              <Label>Type</Label>
              <select
                className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-sm"
                value={qType}
                onChange={(e) => setQType(e.target.value as Question["type"])}
              >
                <option value="single_choice">Single choice</option>
                <option value="multi_choice">Multiple choice</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label>Options</Label>
              <div className="grid gap-2">
                {choices.map((c, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={c.text}
                      onChange={(e) => {
                        const next = choices.slice();
                        next[idx] = { ...next[idx], text: e.target.value };
                        setChoices(next);
                      }}
                      placeholder={`Option ${idx + 1}`}
                    />
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={c.isCorrect}
                        onChange={(e) => {
                          const next = choices.slice();
                          if (qType === "single_choice") {
                            // Only one correct.
                            for (let i = 0; i < next.length; i++) next[i] = { ...next[i], isCorrect: i === idx };
                          } else {
                            // Keep at least one correct checked.
                            const willBeCorrect = e.target.checked;
                            const correctCount = next.filter((x) => x.isCorrect).length;
                            if (!willBeCorrect && correctCount === 1 && next[idx]?.isCorrect) return;
                            next[idx] = { ...next[idx], isCorrect: willBeCorrect };
                          }
                          setChoices(next);
                        }}
                      />
                      Correct
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (choices.length <= 2) return;
                        const next = choices.filter((_, i) => i !== idx);
                        setChoices(next);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setChoices((prev) => [...prev, { text: "", isCorrect: false }])}
              >
                Add option
              </Button>
            </div>

            {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}

            <Button type="submit" disabled={busy || !qText.trim()}>
              {busy ? "Saving..." : "Add Question"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Questions</CardTitle>
          <CardDescription>Review and delete questions.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <ol className="list-decimal space-y-4 pl-6">
            {data.questions.map((q) => (
            <li key={q.id} className="rounded-md border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{q.type === "single_choice" ? "Single" : "Multi"}</Badge>
                  </div>
                  <p className="mt-2 font-medium">{q.text}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setError(null);
                      if (editingQuestionId === q.id) {
                        cancelEdit();
                      } else {
                        beginEdit(q);
                      }
                    }}
                  >
                    {editingQuestionId === q.id ? "Cancel" : "Edit"}
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={busy}
                    onClick={() => {
                      setError(null);
                      setDeleteQuestionId(q.id);
                      setDeleteQuestionText(q.text);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {editingQuestionId === q.id ? (
                <form
                  className="mt-4 grid gap-4"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    setError(null);
                    try {
                      let nextChoices = editChoices.slice();
                      if (editType === "single_choice") {
                        nextChoices = enforceSingleChoice(nextChoices);
                      }

                      const res = await fetch(`/api/admin/questions/${q.id}`, {
                        method: "PUT",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({
                          text: editText,
                          type: editType,
                          choices: nextChoices.map((c, idx) => ({
                            text: c.text,
                            isCorrect: c.isCorrect,
                            order: idx + 1,
                          })),
                        }),
                      });

                      const j = await res.json().catch(() => ({}));
                      if (!res.ok) throw new Error(j?.message ?? "Failed to update question");
                      cancelEdit();
                      await reload();
                    } catch (err: unknown) {
                      setError(getErrorMessage(err, "Failed to update question"));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <div className="grid gap-2">
                    <Label>Question</Label>
                    <textarea
                      className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Type</Label>
                    <select
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-sm"
                      value={editType}
                      onChange={(e) => {
                        const nextType = e.target.value as Question["type"];
                        setEditType(nextType);
                        if (nextType === "single_choice") {
                          setEditChoices((prev) => enforceSingleChoice(prev.slice()));
                        }
                      }}
                    >
                      <option value="single_choice">Single choice</option>
                      <option value="multi_choice">Multiple choice</option>
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Options</Label>
                    <div className="grid gap-2">
                      {editChoices.map((c, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Input
                            value={c.text}
                            onChange={(e) => {
                              const next = editChoices.slice();
                              next[idx] = { ...next[idx], text: e.target.value };
                              setEditChoices(next);
                            }}
                            placeholder={`Option ${idx + 1}`}
                          />
                          <label className="flex items-center gap-2 text-sm text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={c.isCorrect}
                              onChange={(e) => {
                                const next = editChoices.slice();
                                if (editType === "single_choice") {
                                  for (let i = 0; i < next.length; i++) next[i] = { ...next[i], isCorrect: i === idx };
                                } else {
                                  const willBeCorrect = e.target.checked;
                                  const correctCount = next.filter((x) => x.isCorrect).length;
                                  if (!willBeCorrect && correctCount === 1 && next[idx]?.isCorrect) return;
                                  next[idx] = { ...next[idx], isCorrect: willBeCorrect };
                                }
                                setEditChoices(next);
                              }}
                            />
                            Correct
                          </label>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              if (editChoices.length <= 2) return;
                              const next = editChoices.filter((_, i) => i !== idx);
                              setEditChoices(editType === "single_choice" ? enforceSingleChoice(next) : next);
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditChoices((prev) => [...prev, { text: "", isCorrect: false }])}
                    >
                      Add option
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={busy || !editText.trim()}>
                      Save changes
                    </Button>
                    <Button type="button" variant="outline" disabled={busy} onClick={cancelEdit}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : null}

              <ul className="mt-3 grid gap-2 text-sm">
                {q.choices
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((ch) => (
                    <li key={ch.id} className="flex items-center justify-between gap-2 rounded bg-muted/40 px-3 py-2">
                      <span>{ch.text}</span>
                      {ch.isCorrect ? <Badge>Correct</Badge> : <span className="text-muted-foreground">&nbsp;</span>}
                    </li>
                  ))}
              </ul>

              <AlertDialog
                open={Boolean(deleteQuestionId)}
                onOpenChange={(open) => {
                  if (!open) {
                    setDeleteQuestionId(null);
                    setDeleteQuestionText(null);
                  }
                }}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this question?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove it from the exam.
                      {deleteQuestionText ? (
                        <span className="mt-2 block text-foreground">{deleteQuestionText}</span>
                      ) : null}
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
                        variant="destructive"
                        disabled={busy || !deleteQuestionId}
                        onClick={async () => {
                          if (!deleteQuestionId) return;
                          setBusy(true);
                          setError(null);
                          try {
                            const res = await fetch(`/api/admin/questions/${deleteQuestionId}`, { method: "DELETE" });
                            if (!res.ok) {
                              const j = await res.json().catch(() => ({}));
                              throw new Error(j?.message ?? "Failed to delete question");
                            }
                            if (editingQuestionId === deleteQuestionId) cancelEdit();
                            setDeleteQuestionId(null);
                            setDeleteQuestionText(null);
                            await reload();
                          } catch (e: unknown) {
                            setError(getErrorMessage(e, "Failed to delete question"));
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        {busy ? "Deleting..." : "Delete"}
                      </Button>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </li>
          ))}
          </ol>

          {data.questions.length === 0 ? <p className="text-sm text-muted-foreground">No questions yet.</p> : null}
        </CardContent>
      </Card>

      </>
      ) : null}

      {tab === "reports" ? (

      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
          <CardDescription>Basic analytics from submitted attempts.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {report ? (
            <div className="grid gap-4">
              <div className="grid gap-2 text-sm">
                <div>
                  Attempts: <span className="text-foreground">{report.attemptsTotal}</span> · Submitted:{" "}
                  <span className="text-foreground">{report.submittedTotal}</span>
                </div>
                <div>
                  Avg score: <span className="text-foreground">{report.averageScore.toFixed(2)}</span> · Min:{" "}
                  <span className="text-foreground">{report.minScore.toFixed(2)}</span> · Max:{" "}
                  <span className="text-foreground">{report.maxScore.toFixed(2)}</span>
                </div>
              </div>

              <ol className="list-decimal space-y-3 pl-6">
                {report.questionReports.map((qr) => (
                  <li key={qr.questionId} className="rounded-md border p-4">
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
                          <li key={cc.choiceId} className="flex items-center justify-between gap-2 rounded bg-muted/40 px-3 py-2">
                            <span>{cc.text}</span>
                            <span className="flex items-center gap-2">
                              {cc.correct ? <Badge>Correct</Badge> : null}
                              <Badge variant="secondary">{cc.count}</Badge>
                            </span>
                          </li>
                        ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No report loaded yet. Click “Load Report” under Exam Settings.</p>
          )}
        </CardContent>
      </Card>

      ) : null}
    </div>
  );
}
