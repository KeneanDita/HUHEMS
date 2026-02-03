"use client";

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

type StudentRow = {
  id: string;
  userId: string;
  username: string;
  email: string;
  fullName: string;
  year: number;
  department: string;
  createdAt: string;
};

type StudentSort = "newest" | "oldest" | "name_asc" | "name_desc";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

function normalizeStudent(raw: unknown): StudentRow {
  const r = asRecord(raw);
  return {
    id: String(r?.id ?? r?.ID ?? ""),
    userId: String(r?.userId ?? r?.UserID ?? r?.userID ?? ""),
    username: String(r?.username ?? r?.Username ?? ""),
    email: String(r?.email ?? r?.Email ?? ""),
    fullName: String(r?.fullName ?? r?.FullName ?? ""),
    year: Number(r?.year ?? r?.Year ?? 0),
    department: String(r?.department ?? r?.Department ?? ""),
    createdAt: String(r?.createdAt ?? r?.CreatedAt ?? ""),
  };
}

export function AdminStudentsClient() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<StudentSort>("newest");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [year, setYear] = useState(1);
  const [department, setDepartment] = useState("");

  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editFullName, setEditFullName] = useState("");
  const [editYear, setEditYear] = useState(1);
  const [editDepartment, setEditDepartment] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteStudentId, setDeleteStudentId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    setImportResult(null);
    try {
      const res = await fetch("/api/admin/students", { cache: "no-store" });
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
        throw new Error(`(${res.status}) ${msg || "Failed to load students"}`);
      }

      setStudents(Array.isArray(data) ? data.map(normalizeStudent).filter((s) => Boolean(s.id)) : []);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to load students"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const total = useMemo(() => students.length, [students.length]);
  const visibleStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = students.filter((s) => {
      if (!q) return true;
      const hay = `${s.fullName} ${s.username} ${s.email} ${s.department} ${s.year}`.toLowerCase();
      return hay.includes(q);
    });

    const createdMs = (value: string) => {
      const ms = Date.parse(value);
      return Number.isFinite(ms) ? ms : 0;
    };

    const nameKey = (s: StudentRow) => (s.fullName || s.username || "").trim();

    filtered.sort((a, b) => {
      if (sort === "name_asc") {
        const byName = nameKey(a).localeCompare(nameKey(b), undefined, { sensitivity: "base" });
        return byName !== 0 ? byName : a.id.localeCompare(b.id);
      }
      if (sort === "name_desc") {
        const byName = nameKey(b).localeCompare(nameKey(a), undefined, { sensitivity: "base" });
        return byName !== 0 ? byName : a.id.localeCompare(b.id);
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
  }, [students, query, sort]);

  const visibleCount = useMemo(() => visibleStudents.length, [visibleStudents.length]);

  function formatDateTime(value: string): string {
    const ms = Date.parse(value);
    if (!Number.isFinite(ms) || ms <= 0) return "—";
    return new Date(ms).toLocaleString();
  }
  const deleteTarget = useMemo(
    () => (deleteStudentId ? students.find((s) => s.id === deleteStudentId) ?? null : null),
    [deleteStudentId, students]
  );

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Created Students</h2>
        <p className="mt-1 text-sm text-muted-foreground">Browse and delete student accounts.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {loading ? "Loading..." : `${visibleCount} of ${total} student(s)`}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-64">
            <Label htmlFor="studentSearch" className="sr-only">
              Search students
            </Label>
            <Input
              id="studentSearch"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search students..."
              disabled={loading}
            />
          </div>
          <div>
            <Label htmlFor="studentSort" className="sr-only">
              Sort students
            </Label>
            <select
              id="studentSort"
              className="h-9 rounded-md border bg-background px-3 text-sm shadow-sm"
              value={sort}
              onChange={(e) => setSort(e.target.value as StudentSort)}
              disabled={loading}
            >
              <option value="newest">Date: Newest</option>
              <option value="oldest">Date: Oldest</option>
              <option value="name_asc">Name: A → Z</option>
              <option value="name_desc">Name: Z → A</option>
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
          <CardTitle>Student List</CardTitle>
          <CardDescription>{loading ? "Loading…" : "Filter, sort, edit, or delete students."}</CardDescription>
        </CardHeader>
        <CardContent>
          {!loading && visibleStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students yet. Create your first student below.</p>
          ) : null}

          {visibleStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-left">
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Username</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Year</th>
                    <th className="px-3 py-2 font-medium">Department</th>
                    <th className="px-3 py-2 font-medium">Created</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleStudents.map((s, idx) => (
                    <tr key={s.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium">
                        {editId === s.id ? (
                          <Input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
                        ) : (
                          s.fullName || "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {editId === s.id ? (
                          <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
                        ) : (
                          <>@{s.username}</>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {editId === s.id ? (
                          <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                        ) : (
                          s.email
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editId === s.id ? (
                          <Input
                            type="number"
                            min={1}
                            value={editYear}
                            onChange={(e) => setEditYear(Number(e.target.value || 1))}
                          />
                        ) : (
                          <Badge variant="secondary">Year {s.year}</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editId === s.id ? (
                          <Input value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)} />
                        ) : (
                          <Badge variant="secondary">{s.department || "—"}</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{formatDateTime(s.createdAt)}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          {editId === s.id ? (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                disabled={
                                  savingEdit ||
                                  !editFullName.trim() ||
                                  !editDepartment.trim() ||
                                  !editEmail.trim()
                                }
                                onClick={async () => {
                                  setSavingEdit(true);
                                  setError(null);
                                  try {
                                    const payload: Record<string, unknown> = {};
                                    if (editFullName.trim() !== (s.fullName ?? "").trim()) payload.fullName = editFullName;
                                    if (editDepartment.trim() !== (s.department ?? "").trim()) payload.department = editDepartment;
                                    if (Number(editYear) !== Number(s.year)) payload.year = editYear;
                                    if (editUsername.trim() !== (s.username ?? "").trim()) payload.username = editUsername;
                                    if (editEmail.trim().toLowerCase() !== (s.email ?? "").trim().toLowerCase()) payload.email = editEmail;

                                    if (typeof payload.username === "string") {
                                      const nextUsername = payload.username.trim().toLowerCase();
                                      const dup = students.some(
                                        (other) => other.id !== s.id && other.username.trim().toLowerCase() === nextUsername
                                      );
                                      if (dup) {
                                        setError("Username already exists in the student list.");
                                        return;
                                      }
                                    }

                                    if (Object.keys(payload).length === 0) {
                                      setError("No changes to save.");
                                      return;
                                    }

                                    const res = await fetch(`/api/admin/students/${s.id}`, {
                                      method: "PUT",
                                      headers: { "content-type": "application/json" },
                                      body: JSON.stringify(payload),
                                    });

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
                                      throw new Error(`(${res.status}) ${msg || "Failed to update student"}`);
                                    }

                                    setEditId(null);
                                    await load();
                                  } catch (e: unknown) {
                                    setError(getErrorMessage(e, "Failed to update student"));
                                  } finally {
                                    setSavingEdit(false);
                                  }
                                }}
                              >
                                {savingEdit ? "Saving..." : "Save"}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={savingEdit}
                                onClick={() => {
                                  setEditId(null);
                                }}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={busyId === s.id}
                                onClick={() => {
                                  setEditId(s.id);
                                  setEditUsername(s.username);
                                  setEditEmail(s.email);
                                  setEditFullName(s.fullName);
                                  setEditYear(s.year);
                                  setEditDepartment(s.department);
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                disabled={busyId === s.id || editId === s.id}
                                onClick={() => {
                                  setError(null);
                                  setDeleteStudentId(s.id);
                                }}
                              >
                                {busyId === s.id ? "Deleting..." : "Delete"}
                              </Button>
                            </>
                          )}
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
        <h2 className="text-xl font-semibold tracking-tight">Import Students (CSV)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a CSV to create many student accounts at once.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Import Students</CardTitle>
          <CardDescription>
            Columns: <span className="font-medium">username,email,password,fullName,year,department</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="studentImportFile">CSV file</Label>
            <Input
              id="studentImportFile"
              type="file"
              accept=".csv,text/csv"
              disabled={importing}
              onChange={(e) => {
                setImportResult(null);
                const f = e.target.files?.[0] ?? null;
                setImportFile(f);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Header row is optional. If present, columns can be reordered.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              disabled={importing || !importFile}
              onClick={async () => {
                if (!importFile) return;
                setImporting(true);
                setError(null);
                setImportResult(null);
                try {
                  const formData = new FormData();
                  formData.append("file", importFile);

                  const res = await fetch("/api/admin/students/import", {
                    method: "POST",
                    body: formData,
                  });

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
                    throw new Error(msg || "Failed to import students");
                  }

                  const r = asRecord(data);
                  const created = r && typeof r.createdStudents === "number" ? r.createdStudents : null;
                  setImportResult(
                    created !== null ? `Imported ${created} student(s) successfully.` : "Imported students successfully."
                  );
                  setImportFile(null);
                  await load();
                } catch (e: unknown) {
                  setError(getErrorMessage(e, "Failed to import students"));
                } finally {
                  setImporting(false);
                }
              }}
            >
              {importing ? "Importing..." : "Import"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={importing}
              onClick={() => {
                setImportFile(null);
                setImportResult(null);
              }}
            >
              Clear
            </Button>
          </div>

          {importResult ? <p className="text-sm font-medium text-emerald-600">{importResult}</p> : null}
          {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xl font-semibold tracking-tight">Create Student</h2>
        <p className="mt-1 text-sm text-muted-foreground">Creates a user account with the student role.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Student</CardTitle>
          <CardDescription>Creates a user account with the student role.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setCreating(true);
              setError(null);
              try {
                const res = await fetch("/api/admin/students", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ username, email, password, fullName, year, department }),
                });

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
                  throw new Error(msg || "Failed to create student");
                }

                setUsername("");
                setEmail("");
                setPassword("");
                setFullName("");
                setYear(1);
                setDepartment("");
                await load();
              } catch (e: unknown) {
                setError(getErrorMessage(e, "Failed to create student"));
              } finally {
                setCreating(false);
              }
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. student001" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student001@huhems.local" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Student Name" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="year">Year</Label>
              <Input id="year" type="number" min={1} value={year} onChange={(e) => setYear(Number(e.target.value))} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="department">Department</Label>
              <Input id="department" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Computer Science" />
            </div>

            <Button disabled={creating} type="submit">
              {creating ? "Creating..." : "Create Student"}
            </Button>

            {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
          </form>
        </CardContent>
      </Card>

      <AlertDialog
        open={Boolean(deleteStudentId)}
        onOpenChange={(open) => {
          if (!open) setDeleteStudentId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete student?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? (
                <>
                  Delete <span className="font-medium text-foreground">{deleteTarget.fullName || deleteTarget.username}</span>? This will also delete their attempts and answers.
                </>
              ) : (
                <>This will also delete their attempts and answers.</>
              )}
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
                disabled={deleteBusy || !deleteStudentId}
                onClick={async () => {
                  if (!deleteStudentId) return;
                  setDeleteBusy(true);
                  setError(null);
                  try {
                    const res = await fetch(`/api/admin/students/${deleteStudentId}`, { method: "DELETE" });
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
                      throw new Error(msg || "Failed to delete student");
                    }
                    setDeleteStudentId(null);
                    await load();
                  } catch (e: unknown) {
                    setError(getErrorMessage(e, "Failed to delete student"));
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
