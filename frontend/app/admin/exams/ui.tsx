"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type Exam = {
  id: string;
  title: string;
  description?: string;
  published: boolean;
  maxAttempts: number;
  durationMinutes: number;
  questionsPerPage: number;
  createdAt: string;
};

type ExamSort = "newest" | "oldest" | "title_asc" | "title_desc";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

function normalizeExam(raw: unknown): Exam {
  const r = asRecord(raw);
  return {
    id: String(r?.id ?? r?.ID ?? ""),
    title: String(r?.title ?? r?.Title ?? ""),
    description: (r?.description ?? r?.Description) ? String(r?.description ?? r?.Description) : undefined,
    published: Boolean(r?.published ?? r?.Published ?? false),
    maxAttempts: Number(r?.maxAttempts ?? r?.MaxAttempts ?? 1),
    durationMinutes: Number(r?.durationMinutes ?? r?.DurationMinutes ?? 30),
    questionsPerPage: Number(r?.questionsPerPage ?? r?.QuestionsPerPage ?? 5),
    createdAt: String(r?.createdAt ?? r?.CreatedAt ?? ""),
  };
}

export function AdminExamsClient() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ExamSort>("newest");

  const [deleteExamId, setDeleteExamId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [questionsPerPage, setQuestionsPerPage] = useState(5);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/exams", { cache: "no-store" });
      const text = await res.text();
      const data = (() => {
        try {
          return JSON.parse(text);
        } catch {
          return null;
        }
      })();
      if (!res.ok) throw new Error(data?.message ?? text ?? "Failed to load exams");
      setExams(Array.isArray(data) ? data.map(normalizeExam).filter((e) => Boolean(e.id)) : []);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to load exams"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const publishedCount = useMemo(() => exams.filter((e) => e.published).length, [exams]);
  const deleteTarget = useMemo(() => (deleteExamId ? exams.find((e) => e.id === deleteExamId) ?? null : null), [deleteExamId, exams]);

  const visibleExams = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = exams.filter((e) => {
      if (!q) return true;
      const hay = `${e.title} ${(e.description ?? "")} `.toLowerCase();
      return hay.includes(q);
    });

    const createdMs = (value: string) => {
      const ms = Date.parse(value);
      return Number.isFinite(ms) ? ms : 0;
    };

    filtered.sort((a, b) => {
      if (sort === "title_asc") {
        const byTitle = a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
        return byTitle !== 0 ? byTitle : a.id.localeCompare(b.id);
      }
      if (sort === "title_desc") {
        const byTitle = b.title.localeCompare(a.title, undefined, { sensitivity: "base" });
        return byTitle !== 0 ? byTitle : a.id.localeCompare(b.id);
      }
      if (sort === "oldest") {
        const byDate = createdMs(a.createdAt) - createdMs(b.createdAt);
        return byDate !== 0 ? byDate : a.id.localeCompare(b.id);
      }
      // newest
      const byDate = createdMs(b.createdAt) - createdMs(a.createdAt);
      return byDate !== 0 ? byDate : a.id.localeCompare(b.id);
    });

    return filtered;
  }, [exams, query, sort]);

  const visibleCount = useMemo(() => visibleExams.length, [visibleExams.length]);

  function formatDateTime(value: string): string {
    const ms = Date.parse(value);
    if (!Number.isFinite(ms) || ms <= 0) return "—";
    return new Date(ms).toLocaleString();
  }

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Created Exams</h2>
        <p className="mt-1 text-sm text-muted-foreground">Open, preview, generate reports, or delete exams.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {loading
            ? "Loading..."
            : `${visibleCount} of ${exams.length} exam(s) (${publishedCount} published)`}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-64">
            <Label htmlFor="examSearch" className="sr-only">
              Search exams
            </Label>
            <Input
              id="examSearch"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search exams..."
              disabled={loading}
            />
          </div>
          <div>
            <Label htmlFor="examSort" className="sr-only">
              Sort exams
            </Label>
            <select
              id="examSort"
              className="h-9 rounded-md border bg-background px-3 text-sm shadow-sm"
              value={sort}
              onChange={(e) => setSort(e.target.value as ExamSort)}
              disabled={loading}
            >
              <option value="newest">Date: Newest</option>
              <option value="oldest">Date: Oldest</option>
              <option value="title_asc">Title: A → Z</option>
              <option value="title_desc">Title: Z → A</option>
            </select>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Exam List</CardTitle>
          <CardDescription>
            {loading ? "Loading…" : "Filter, sort, and manage exams."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!loading && visibleExams.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {exams.length === 0 ? "No exams yet. Create your first exam below." : "No exams match your search."}
            </p>
          ) : null}

          {visibleExams.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-left">
                    <th className="px-3 py-2 font-medium">Title</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Options</th>
                    <th className="px-3 py-2 font-medium">Created</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleExams.map((exam) => (
                    <tr key={exam.id} className="border-b align-top last:border-b-0">
                      <td className="px-3 py-2">
                        <div className="font-medium">{exam.title}</div>
                        {exam.description ? (
                          <div className="mt-1 text-xs text-muted-foreground">{exam.description}</div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        {exam.published ? <Badge>Published</Badge> : <Badge variant="secondary">Draft</Badge>}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        <div>Duration: <span className="text-foreground">{exam.durationMinutes} min</span></div>
                        <div>Attempts: <span className="text-foreground">{exam.maxAttempts}</span></div>
                        <div>Q/page: <span className="text-foreground">{exam.questionsPerPage}</span></div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{formatDateTime(exam.createdAt)}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm">
                            <Link href={`/admin/exams/${exam.id}`}>Open</Link>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/admin/exams/${exam.id}/preview`}>Preview</Link>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/admin/exams/${exam.id}/report`}>Reports</Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setDeleteError(null);
                              setDeleteExamId(exam.id);
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xl font-semibold tracking-tight">Create Exam</h2>
        <p className="mt-1 text-sm text-muted-foreground">Create an exam, then add questions in the editor.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Exam</CardTitle>
          <CardDescription>Start with a title, then add questions.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setCreating(true);
              setError(null);
              try {
                const res = await fetch("/api/admin/exams", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    title,
                    description,
                    maxAttempts,
                    durationMinutes,
                    questionsPerPage,
                  }),
                });
                const text = await res.text();
                const data = (() => {
                  try {
                    return JSON.parse(text);
                  } catch {
                    return null;
                  }
                })();
                if (!res.ok) throw new Error(data?.message ?? text ?? "Failed to create exam");

                setTitle("");
                setDescription("");
                setMaxAttempts(1);
                setDurationMinutes(30);
                setQuestionsPerPage(5);
                await load();
              } catch (e: unknown) {
                setError(getErrorMessage(e, "Failed to create exam"));
              } finally {
                setCreating(false);
              }
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Mid-Semester Exam" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="durationMinutes">Exam time (minutes)</Label>
              <Input
                id="durationMinutes"
                type="number"
                min={1}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="maxAttempts">Max attempts</Label>
                <Input
                  id="maxAttempts"
                  type="number"
                  min={1}
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(Number(e.target.value || 1))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="qpp">Questions per page</Label>
                <Input
                  id="qpp"
                  type="number"
                  min={1}
                  value={questionsPerPage}
                  onChange={(e) => setQuestionsPerPage(Number(e.target.value || 5))}
                />
              </div>
            </div>

            {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}

            <Button type="submit" disabled={creating || !title.trim()}>
              {creating ? "Creating..." : "Create Exam"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <AlertDialog
        open={Boolean(deleteExamId)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteExamId(null);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete exam?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? (
                <>
                  This will permanently delete <span className="font-medium text-foreground">{deleteTarget.title}</span> and all its questions.
                </>
              ) : (
                <>This will permanently delete the exam and all its questions.</>
              )}
              {deleteError ? <span className="mt-2 block text-destructive">{deleteError}</span> : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button type="button" variant="outline" disabled={deleteBusy}>
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteBusy || !deleteExamId}
                onClick={async () => {
                  if (!deleteExamId) return;
                  setDeleteBusy(true);
                  setDeleteError(null);
                  try {
                    const res = await fetch(`/api/admin/exams/${deleteExamId}`, { method: "DELETE" });
                    const text = await res.text();
                    if (!res.ok) {
                      const data = (() => {
                        try {
                          return JSON.parse(text) as unknown;
                        } catch {
                          return null;
                        }
                      })();
                      const r = asRecord(data);
                      const msg = r && typeof r.message === "string" ? r.message : text;
                      throw new Error(msg || "Failed to delete exam");
                    }
                    setDeleteExamId(null);
                    await load();
                  } catch (e: unknown) {
                    setDeleteError(getErrorMessage(e, "Failed to delete exam"));
                  } finally {
                    setDeleteBusy(false);
                  }
                }}
              >
                {deleteBusy ? "Deleting..." : "Delete"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
