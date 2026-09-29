import { useId, useRef, useState, type ComponentType, type FormEvent, type KeyboardEvent, type ReactNode, type SVGProps } from 'react';
import {
  ArrowRight,
  CircleAlert,
  Eye,
  EyeOff,
  LoaderCircle,
  Lock,
  Mail,
  ShoppingBag,
  Sparkles,
  User,
} from 'lucide-react';
import { MIN_PASSWORD_LENGTH } from '@micro-shop/auth-api/api-types';
import { Alert, AlertDescription } from '@micro-shop/ui/components/alert';
import { Button } from '@micro-shop/ui/components/button';
import { Input } from '@micro-shop/ui/components/input';
import { Label } from '@micro-shop/ui/components/label';
import { cn } from '@micro-shop/ui/lib/utils';
import { AuthShowcase } from './AuthShowcase';
import { passwordStrength } from './password-strength';
import {
  demoCredentials,
  EmailTakenError,
  InvalidCredentialsError,
  login,
  register,
} from './session-store';
import './auth.css';

type Mode = 'sign-in' | 'sign-up';

const copy = {
  'sign-in': {
    tab: 'Sign in',
    title: 'Welcome back',
    description: 'Sign in to pick up where you left off.',
    submit: 'Sign in',
    pending: 'Signing in…',
    unavailable: 'Sign-in is unavailable right now. Please try again in a moment.',
  },
  'sign-up': {
    tab: 'Create account',
    title: 'Create your account',
    description: 'It takes a few seconds, and you’re signed in right away.',
    submit: 'Create account',
    pending: 'Creating account…',
    unavailable: 'Sign-up is unavailable right now. Please try again in a moment.',
  },
} as const;

const modes: Mode[] = ['sign-in', 'sign-up'];

/** Strong ease-out: responds at once, settles softly. */
const easeOut = 'ease-[cubic-bezier(0.23,1,0.32,1)]';

// Auth's one screen, in two modes: sign in, or create an account (which signs
// you in too). Hosts render it wherever sign-in is required; once the session
// exists, the host's useSession() sees it and shows what was asked for.
//
// The layout follows the space the host gives it (a container query), not the
// viewport: form only when narrow, form + brand panel from 48rem.
export default function LoginForm() {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState<string>(demoCredentials.email);
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tabRefs = useRef<Record<Mode, HTMLButtonElement | null>>({ 'sign-in': null, 'sign-up': null });
  const submitRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const signingUp = mode === 'sign-up';
  const text = copy[mode];
  const strength = passwordStrength(password);

  function selectMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    setError(null);
    setPassword('');
    // The demo email is a sign-in convenience; don't offer it as a new account.
    if (next === 'sign-up' && email === demoCredentials.email) setEmail('');
  }

  // Tabs pattern: arrow keys move between the two modes.
  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const next = mode === 'sign-in' ? 'sign-up' : 'sign-in';
    selectMode(next);
    tabRefs.current[next]?.focus();
  }

  function fillDemoAccount() {
    setEmail(demoCredentials.email);
    setPassword(demoCredentials.password);
    setError(null);
    submitRef.current?.focus();
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
          : text.unavailable,
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="@container w-full">
      <div className="mx-auto grid w-full overflow-hidden rounded-2xl border border-border/70 bg-card text-card-foreground shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_40px_-12px_rgb(0_0_0/0.12)] @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <AuthShowcase />

        <section className="flex flex-col justify-center px-6 py-8 @sm:px-10 @sm:py-12">
          <div className="mx-auto w-full max-w-sm space-y-7">
            {/* Brand: the showcase carries it when there's room. */}
            <div className="flex items-center gap-2.5 @3xl:hidden">
              <span className="grid size-8 place-items-center rounded-lg bg-foreground text-background">
                <ShoppingBag className="size-4" aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold tracking-tight">micro-shop</span>
            </div>

            {/* Mode switch: a segmented control with a sliding indicator. */}
            <div
              role="tablist"
              aria-label="Account"
              className="relative grid grid-cols-2 rounded-xl bg-muted p-1"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-lg bg-background shadow-sm ring-1 ring-border/60 transition-transform duration-250 motion-reduce:transition-none',
                  easeOut,
                  signingUp && 'translate-x-full',
                )}
              />
              {modes.map((option) => (
                <button
                  key={option}
                  ref={(element) => {
                    tabRefs.current[option] = element;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={mode === option}
                  aria-controls={panelId}
                  tabIndex={mode === option ? 0 : -1}
                  onClick={() => selectMode(option)}
                  onKeyDown={handleTabKey}
                  className={cn(
                    'relative z-10 h-9 rounded-lg text-[13px] font-medium transition-colors duration-200 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    mode === option ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {copy[option].tab}
                </button>
              ))}
            </div>

            {/* Heading: re-mounted per mode, so it fades in with the new words. */}
            <div key={mode} className="auth-swap space-y-1.5">
              <h2 id={`${panelId}-title`} className="text-[26px] leading-tight font-semibold tracking-[-0.035em]">
                {text.title}
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">{text.description}</p>
            </div>

            <form
              id={panelId}
              role="tabpanel"
              aria-labelledby={`${panelId}-title`}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {signingUp && (
                <Field
                  id="auth-name"
                  label="Full name"
                  icon={User}
                  className={cn('transition-[opacity,transform] duration-300 starting:-translate-y-1 starting:opacity-0', easeOut)}
                >
                  <Input
                    id="auth-name"
                    autoComplete="name"
                    placeholder="Ada Lovelace"
                    required
                    maxLength={100}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className={fieldInput}
                  />
                </Field>
              )}

              <Field id="auth-email" label="Email address" icon={Mail}>
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
                  className={fieldInput}
                />
              </Field>

              <Field
                id="auth-password"
                label="Password"
                icon={Lock}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                }
              >
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
                  className={cn(fieldInput, 'pr-11')}
                />
              </Field>

              {signingUp && (
                <div id="auth-password-hint" className="space-y-1.5">
                  <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
                    {[1, 2, 3, 4].map((step) => (
                      <span
                        key={step}
                        className={cn(
                          'h-1 rounded-full bg-muted transition-colors duration-300',
                          strength.score >= step && strengthColor[strength.score],
                        )}
                      />
                    ))}
                  </div>
                  <p className="flex justify-between text-[11px] text-muted-foreground">
                    <span>At least {MIN_PASSWORD_LENGTH} characters.</span>
                    {strength.label && <span className="font-medium text-foreground">{strength.label}</span>}
                  </p>
                </div>
              )}

              {error && (
                <Alert
                  variant="destructive"
                  className={cn(
                    'rounded-lg border-destructive/30 bg-destructive/5 transition-[opacity,transform] duration-200 starting:-translate-y-1 starting:opacity-0',
                    easeOut,
                  )}
                >
                  <CircleAlert className="size-4" aria-hidden="true" />
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                ref={submitRef}
                type="submit"
                disabled={pending}
                className={cn(
                  'group mt-2 h-11 w-full rounded-lg text-sm font-medium transition-transform duration-150 active:scale-[0.97] motion-reduce:active:scale-100',
                  easeOut,
                )}
              >
                {pending ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                    {text.pending}
                  </>
                ) : (
                  <>
                    {text.submit}
                    <ArrowRight
                      className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </>
                )}
              </Button>
            </form>

            {!signingUp && (
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-background ring-1 ring-border/70">
                  <Sparkles className="size-3.5 text-muted-foreground" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">Just looking around?</p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    {demoCredentials.email} · {demoCredentials.password}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={fillDemoAccount}
                  className="h-8 rounded-lg text-xs transition-transform duration-150 active:scale-[0.97]"
                >
                  Use demo
                </Button>
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground">
              {signingUp ? 'Already have an account?' : 'New here?'}{' '}
              <button
                type="button"
                onClick={() => selectMode(signingUp ? 'sign-in' : 'sign-up')}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                {signingUp ? 'Sign in instead' : 'Create an account'}
              </button>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

const fieldInput = 'h-11 rounded-lg bg-background pl-10';

const strengthColor: Record<number, string> = {
  1: 'bg-red-500',
  2: 'bg-amber-500',
  3: 'bg-lime-500',
  4: 'bg-emerald-500',
};

function Field({
  id,
  label,
  icon: Icon,
  trailing,
  className,
  children,
}: {
  id: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  trailing?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id} className="text-[13px] font-medium">
        {label}
      </Label>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        {children}
        {trailing && <div className="absolute top-1/2 right-1.5 -translate-y-1/2">{trailing}</div>}
      </div>
    </div>
  );
}
