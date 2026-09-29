import { useState, type FormEvent } from 'react';
import { Alert, AlertDescription } from '@micro-shop/ui/components/alert';
import { Button } from '@micro-shop/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@micro-shop/ui/components/card';
import { Input } from '@micro-shop/ui/components/input';
import { Label } from '@micro-shop/ui/components/label';
import { demoCredentials, InvalidCredentialsError, login } from './session-store';

export default function LoginForm() {
  const [email, setEmail] = useState(demoCredentials.email);
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPending(true);
    setError(null);

    try {
      await login(email, password);
    } catch (cause) {
      setError(
        cause instanceof InvalidCredentialsError
          ? cause.message
          : 'Sign-in is unavailable right now. Please try again in a moment.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-full w-full flex-col items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-[420px] overflow-hidden border-border/60 shadow-sm">
        <CardHeader className="space-y-7 px-8 pb-6 pt-8">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-lg bg-foreground text-sm font-bold text-background">
              A
            </div>

            <span className="text-sm font-semibold tracking-tight">
              Auth
            </span>
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <CardTitle
              id="auth-login-title"
              className="text-[26px] font-semibold tracking-[-0.035em]"
            >
              Welcome back
            </CardTitle>

            <CardDescription className="text-sm leading-6">
              Sign in to continue to your account.
            </CardDescription>
          </div>
        </CardHeader>

        <form
          onSubmit={handleSubmit}
          aria-labelledby="auth-login-title"
        >
          <CardContent className="space-y-5 px-8 pb-7">
            {/* Email */}
            <div className="space-y-2">
              <Label
                htmlFor="auth-email"
                className="text-[13px] font-medium"
              >
                Email address
              </Label>

              <Input
                id="auth-email"
                type="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="you@example.com"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 rounded-lg"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="auth-password"
                  className="text-[13px] font-medium"
                >
                  Password
                </Label>

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>

              <Input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                required
                aria-invalid={error ? true : undefined}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 rounded-lg"
              />
            </div>

            {/* Error */}
            {error && (
              <Alert variant="destructive" className="rounded-lg">
                <AlertDescription className="text-xs">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Demo credentials */}
            <div className="flex gap-2.5 rounded-lg border border-border/60 bg-muted/40 px-3.5 py-3">
              <span
                className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500"
                aria-hidden="true"
              />

              <div className="min-w-0 space-y-0.5">
                <p className="text-[11px] font-semibold text-foreground">
                  Demo account
                </p>

                <p className="truncate font-mono text-[11px] text-muted-foreground">
                  {demoCredentials.email} · {demoCredentials.password}
                </p>
              </div>
            </div>
          </CardContent>

          <CardFooter className="px-8 pb-8">
            <Button
              type="submit"
              className="h-11 w-full rounded-lg text-sm font-medium"
              disabled={pending}
            >
              {pending ? (
                <>
                  <span
                    className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
                    aria-hidden="true"
                  />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        Secure authentication powered by Auth
      </p>
    </div>
  );
}