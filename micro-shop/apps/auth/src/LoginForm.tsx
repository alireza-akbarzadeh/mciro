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
import { MfeFrame } from '@micro-shop/ui/components/mfe-frame';
import { demoCredentials, InvalidCredentialsError, login } from './session-store';
import './auth.css';

// PUBLIC API of Auth (exposed as `auth/LoginForm`). No props on purpose: the host
// doesn't need a callback because it subscribes to `auth/session` and re-renders
// when the session appears.

export default function LoginForm() {
  const [email, setEmail] = useState<string>(demoCredentials.email);
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await login(email, password);
    } catch (cause) {
      setError(
        cause instanceof InvalidCredentialsError ? cause.message : 'Sign-in failed, try again',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <MfeFrame label="AUTH" accent="violet" className="w-full max-w-sm">
      <Card className="border-0 shadow-none">
        <form onSubmit={handleSubmit} className="grid gap-6" aria-labelledby="auth-login-title">
          <CardHeader>
            <CardTitle id="auth-login-title" className="text-xl">
              Sign in
            </CardTitle>
            <CardDescription>
              Mock login: <code>{demoCredentials.email}</code> or <code>grace@example.com</code>,
              password <code>{demoCredentials.password}</code>.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="auth-email">Email</Label>
              <Input
                id="auth-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="auth-password">Password</Label>
              <Input
                id="auth-password"
                type="password"
                autoComplete="current-password"
                required
                aria-invalid={error ? true : undefined}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>

          <CardFooter>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Signing in…' : 'Sign in'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </MfeFrame>
  );
}
