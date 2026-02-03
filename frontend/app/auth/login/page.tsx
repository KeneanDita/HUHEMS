import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="grid gap-4">
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
