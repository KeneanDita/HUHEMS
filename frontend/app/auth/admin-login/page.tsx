import { LoginForm } from "@/components/auth/login-form";

export default function AdminLoginPage() {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-96 w-96 rounded-full bg-linear-to-br from-purple-200/30 via-blue-100/20 to-transparent blur-3xl dark:from-purple-900/20 dark:via-blue-900/10" />
      </div>

      <LoginForm
        title="Admin Login"
        description="Sign in as an administrator to access management dashboards."
        expectedRole="admin"
        defaultRedirectPath="/admin"
        allowNextPrefix="/admin"
      />
    </div>
  );
}
