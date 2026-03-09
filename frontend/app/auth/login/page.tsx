import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="relative grid gap-4">
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-96 w-96 rounded-full bg-linear-to-br from-blue-200/30 via-purple-100/20 to-transparent blur-3xl dark:from-blue-900/20 dark:via-purple-900/10" />
      </div>

      <LoginForm
        title="Student Login"
        description="Sign in to access your student dashboard and exams."
        expectedRole="student"
        defaultRedirectPath="/student"
        allowNextPrefix="/student"
      />

      <div className="mx-auto w-full max-w-md text-center text-xs text-muted-foreground">
        <p>
          Admin?{" "}
          <Button asChild variant="link" className="h-auto px-0 text-xs">
            <Link href="/auth/admin-login">Go to Admin Login</Link>
          </Button>
        </p>
      </div>
    </div>
  );
}
