import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Lock, User } from "lucide-react";
import { useState } from "react";

interface SignupPageProps {
  onSwitchToLogin: () => void;
}

export function SignupPage({ onSwitchToLogin }: SignupPageProps) {
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Username is required.");
      return;
    }
    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }
    if (password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 100));
    const result = register(username.trim(), password);
    setIsLoading(false);
    if ("err" in result) {
      setError(result.err);
    }
    // On ok the AuthContext auto-logs in, so the app will re-render to the main view
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
            Create an account
          </h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Join Q&#8209;Insight Assessment Platform
          </p>
        </div>

        <Card className="border-border/60 shadow-lg">
          <CardHeader className="pb-2 pt-6 px-6">
            <p className="text-xs text-muted-foreground font-body uppercase tracking-widest">
              New Account
            </p>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="signup-username"
                  className="font-body text-sm font-medium"
                >
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-username"
                    type="text"
                    autoComplete="username"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-9 font-body"
                    autoFocus
                    data-ocid="signup.username_input"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="signup-password"
                  className="font-body text-sm font-medium"
                >
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Choose a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 font-body"
                    data-ocid="signup.password_input"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="signup-confirm"
                  className="font-body text-sm font-medium"
                >
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-confirm"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-9 font-body"
                    data-ocid="signup.confirm_password_input"
                  />
                </div>
              </div>

              {error && (
                <p
                  className="text-sm text-destructive font-body bg-destructive/10 px-3 py-2 rounded-md"
                  data-ocid="signup.error_state"
                >
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full spice-gradient text-white border-0 gap-2 mt-2"
                disabled={isLoading}
                data-ocid="signup.submit_button"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLoading ? "Creating account…" : "Create Account"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground font-body">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="text-accent hover:underline font-medium font-body"
                  data-ocid="signup.login_link"
                >
                  Sign in
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
