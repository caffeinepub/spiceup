import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Lock, User } from "lucide-react";
import { useState } from "react";

interface LoginPageProps {
  onSwitchToSignup: () => void;
}

export function LoginPage({ onSwitchToSignup }: LoginPageProps) {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("Please enter both username and password.");
      return;
    }
    setIsLoading(true);
    // Small delay to show loading state
    await new Promise((r) => setTimeout(r, 100));
    const result = login(username.trim(), password);
    setIsLoading(false);
    if ("err" in result) {
      setError(result.err);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/assets/generated/infineon-logo.png"
            alt="Q-Insight"
            className="h-10 w-auto object-contain mb-4"
          />
          <h1 className="text-2xl font-bold font-heading text-foreground tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Sign in to your Q&#8209;Insight account
          </p>
        </div>

        <Card className="border-border/60 shadow-lg">
          <CardHeader className="pb-2 pt-6 px-6">
            <p className="text-xs text-muted-foreground font-body uppercase tracking-widest">
              Sign In
            </p>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="login-username"
                  className="font-body text-sm font-medium"
                >
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-username"
                    type="text"
                    autoComplete="username"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-9 font-body"
                    autoFocus
                    data-ocid="login.username_input"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="login-password"
                  className="font-body text-sm font-medium"
                >
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 font-body"
                    data-ocid="login.password_input"
                  />
                </div>
              </div>

              {error && (
                <p
                  className="text-sm text-destructive font-body bg-destructive/10 px-3 py-2 rounded-md"
                  data-ocid="login.error_state"
                >
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full spice-gradient text-white border-0 gap-2 mt-2"
                disabled={isLoading}
                data-ocid="login.submit_button"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLoading ? "Signing in…" : "Sign In"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground font-body">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={onSwitchToSignup}
                  className="text-accent hover:underline font-medium font-body"
                  data-ocid="login.signup_link"
                >
                  Sign up
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground/40 font-body mt-6">
          © {new Date().getFullYear()} ·{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-muted-foreground/60 transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
