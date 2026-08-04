import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="mb-8">
        <Logo />
      </div>
      <ResetPasswordForm />
    </div>
  );
}