"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Role = "admin" | "student";

type LoginFormProps = {
  title: string;
  description: string;
  expectedRole: Role;
  defaultRedirectPath: string;
  allowNextPrefix: string;
};

export function LoginForm({
  title,
  description,
  expectedRole,
  defaultRedirectPath,
  allowNextPrefix,
}: LoginFormProps) {
  const router = useRouter();

  const [nextPath, setNextPath] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(params.get("next"));
  }, []);

  const safeNextPath = useMemo(() => {
    if (!nextPath) return null;
    if (!nextPath.startsWith("/")) return null;
    if (!nextPath.startsWith(allowNextPrefix)) return null;
    return nextPath;
  }, [allowNextPrefix, nextPath]);

  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="mx-auto w-full max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              setIsLoading(true);
              try {
                const res = await fetch("/api/auth/login", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ usernameOrEmail, password, expectedRole }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                  setError(data?.message ?? "Login failed");
                  return;
                }

                const role = data?.role as Role | undefined;
                if (!role) {
                  setError("Login succeeded, but role is missing.");
                  return;
                }

                if (role !== expectedRole) {
                  setError(
                    expectedRole === "admin"
                      ? "This account is not an admin. Use Student Login instead."
                      : "This account is not a student. Use Admin Login instead.",
                  );
                  return;
                }

                const destination = safeNextPath ?? defaultRedirectPath;
                router.push(destination);
                router.refresh();
              } catch {
                setError("Network error. Please try again.");
              } finally {
                setIsLoading(false);
              }
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="usernameOrEmail">Email</Label>
              <Input
                id="usernameOrEmail"
                type="text"
                placeholder="username or email"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Login"}
            </Button>

            <div className="flex items-center justify-center gap-3">
              <Button asChild variant="link" className="px-0">
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
