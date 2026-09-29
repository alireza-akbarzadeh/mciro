import type { ComponentType, SVGProps } from 'react';
import { PackageCheck, ShieldCheck, ShoppingBag, ShoppingCart, Truck } from 'lucide-react';

// The brand side of the sign-in screen, shown next to the form when there's
// room (LoginForm's container is at least 48rem wide). Decorative, except for
// the text: it says what an account is for.

type Feature = { icon: ComponentType<SVGProps<SVGSVGElement>>; title: string; body: string };

const features: Feature[] = [
  { icon: ShoppingCart, title: 'Your cart comes with you', body: 'Shop as a guest; sign in only when you check out.' },
  { icon: PackageCheck, title: 'Every order in one place', body: 'Totals, items and status, from checkout onwards.' },
  { icon: Truck, title: 'Shipping you can follow', body: 'See the moment a parcel is on its way.' },
];

// Soft light from the top-left corner, and a faint grid that fades out.
const glow = {
  backgroundImage:
    'radial-gradient(120% 80% at 0% 0%, oklch(0.55 0.2 285 / 0.45), transparent 60%), radial-gradient(90% 60% at 100% 100%, oklch(0.6 0.15 200 / 0.25), transparent 60%)',
};
const grid = {
  backgroundImage:
    'linear-gradient(to right, oklch(1 0 0 / 0.06) 1px, transparent 1px), linear-gradient(to bottom, oklch(1 0 0 / 0.06) 1px, transparent 1px)',
  backgroundSize: '32px 32px',
  maskImage: 'radial-gradient(ellipse at 30% 20%, black 20%, transparent 70%)',
};

export function AuthShowcase() {
  return (
    <aside className="relative isolate hidden flex-col justify-between gap-12 overflow-hidden bg-zinc-950 p-10 text-zinc-50 @3xl:flex">
      <div aria-hidden="true" className="absolute inset-0 -z-10" style={glow} />
      <div aria-hidden="true" className="absolute inset-0 -z-10" style={grid} />

      <div className="auth-rise flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
          <ShoppingBag className="size-4.5" aria-hidden="true" />
        </span>
        <span className="text-sm font-semibold tracking-tight">micro-shop</span>
      </div>

      <div className="space-y-8">
        <div className="auth-rise space-y-3" style={{ animationDelay: '60ms' }}>
          <h2 className="text-3xl leading-[1.15] font-semibold tracking-[-0.03em] text-balance">
            One account for your carts, orders and deliveries.
          </h2>
          <p className="text-sm leading-6 text-zinc-400">
            Sign in once. Every part of the shop knows it’s you.
          </p>
        </div>

        <ul className="space-y-5">
          {features.map(({ icon: Icon, title, body }, index) => (
            <li
              key={title}
              className="auth-rise flex gap-3.5"
              style={{ animationDelay: `${120 + index * 50}ms` }}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/[0.07] ring-1 ring-white/10">
                <Icon className="size-4 text-zinc-200" aria-hidden="true" />
              </span>
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{title}</p>
                <p className="text-[13px] leading-5 text-zinc-400">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="auth-rise flex items-center gap-2 text-xs text-zinc-500" style={{ animationDelay: '300ms' }}>
        <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
        Passwords are hashed with scrypt. Sessions live in HttpOnly cookies.
      </p>
    </aside>
  );
}
