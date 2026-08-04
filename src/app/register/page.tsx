import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  const googleEnabled = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
  );

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="mb-8">
        <Logo />
      </div>
      <RegisterForm googleEnabled={googleEnabled} />
    </div>
  );
}
