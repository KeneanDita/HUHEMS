import { LoginForm } from "@/components/auth/login-form";

export default function AdminLoginPage() {
  return (
    <LoginForm
      title="Admin Login"
      description="Sign in as an administrator to access management dashboards."
      expectedRole="admin"
      defaultRedirectPath="/admin"
      allowNextPrefix="/admin"
    />
  );
}
