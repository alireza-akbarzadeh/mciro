import { useState, type FormEvent } from 'react';
import { MIN_PASSWORD_LENGTH } from '@micro-shop/auth-api/api-types';
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
import {
  demoCredentials,
  EmailTakenError,
  InvalidCredentialsError,
  login,
  register,
} from './session-store';

type Mode = 'sign-in' | 'sign-up';

const copy = {
  'sign-in': {
    title: 'Welcome back',
    description: 'Sign in to continue to your account.',
    submit: 'Sign in',
    pending: 'Signing in…',
    switchPrompt: 'Don’t have an account?',
    switchAction: 'Create one',
  },
  'sign-up': {
    title: 'Create your account',
    description: 'It takes a few seconds. You’ll be signed in right away.',
    submit: 'Create account',
    pending: 'Creating account…',
    switchPrompt: 'Already have an account?',
    switchAction: 'Sign in',
  },
} as const;

// Auth's one screen, in two modes: sign in, or create an account (which signs
// you in too). Hosts render it wherever sign-in is required; once the session
// exists, the host's useSession() sees it and shows what was asked for.
export default function LoginForm() {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState<string>(demoCredentials.email);
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signingUp = mode === 'sign-up';
  const text = copy[mode];

  function switchMode() {
    setMode(signingUp ? 'sign-in' : 'sign-up');
    setError(null);
    setPassword('');
    // The demo email is a sign-in convenience; don't offer it as a new account.
    if (!signingUp && email === demoCredentials.email) setEmail('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPending(true);
    setError(null);

    try {
      if (signingUp) await register(name, email, password);
      else await login(email, password);
    } catch (cause) {
      setError(
        cause instanceof InvalidCredentialsError || cause instanceof EmailTakenError
          ? cause.message
          : signingUp
            ? 'Sign-up is unavailable right now. Please try again in a moment.'
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
              {text.title}
            </CardTitle>

            <CardDescription className="text-sm leading-6">
              {text.description}
            </CardDescription>
          </div>
        </CardHeader>

        <form
          onSubmit={handleSubmit}
          aria-labelledby="auth-login-title"
        >
          <CardContent className="space-y-5 px-8 pb-7">
            {/* Name (sign-up only) */}
            {signingUp && (
              <div className="space-y-2">
                <Label
                  htmlFor="auth-name"
                  className="text-[13px] font-medium"
                >
                  Full name
                </Label>

                <Input
                  id="auth-name"
                  autoComplete="name"
                  placeholder="Ada Lovelace"
                  required
                  maxLength={100}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-11 rounded-lg"
                />
              </div>
            )}

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
                autoComplete={signingUp ? 'email' : 'username'}
                autoCapitalize="none"
                spellCheck={false}
                placeholder="you@example.com"
                required
                maxLength={200}
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
                autoComplete={signingUp ? 'new-password' : 'current-password'}
                placeholder={signingUp ? 'Choose a password' : 'Enter your password'}
                required
                minLength={signingUp ? MIN_PASSWORD_LENGTH : undefined}
                maxLength={200}
                aria-invalid={error ? true : undefined}
                aria-describedby={signingUp ? 'auth-password-hint' : undefined}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 rounded-lg"
              />

              {signingUp && (
                <p id="auth-password-hint" className="text-[11px] text-muted-foreground">
                  At least {MIN_PASSWORD_LENGTH} characters.
                </p>
              )}
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
            {!signingUp && (
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
            )}
          </CardContent>

          <CardFooter className="flex-col gap-4 px-8 pb-8">
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
                  {text.pending}
                </>
              ) : (
                text.submit
              )}
            </Button>

            <p className="text-xs text-muted-foreground">
              {text.switchPrompt}{' '}
              <button
                type="button"
                onClick={switchMode}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                {text.switchAction}
              </button>
            </p>
          </CardFooter>
        </form>
      </Card>

      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        Secure authentication powered by Auth
      </p>
    </div>
  );
}
