import * as React from 'react';
import { cn } from '../lib/utils';

// Not a shadcn component: a learning aid. Draws a labelled, dashed boundary so
// you can see which application rendered which part of the page.
//
// It knows colours, not domains. Which app uses which accent is decided by the
// app itself; the design system must not contain a list of business domains.

const accents = {
  blue: { frame: 'border-blue-600', label: 'bg-blue-600' },
  violet: { frame: 'border-violet-600', label: 'bg-violet-600' },
  emerald: { frame: 'border-emerald-600', label: 'bg-emerald-600' },
  amber: { frame: 'border-amber-500', label: 'bg-amber-500' },
} as const;

type Accent = keyof typeof accents;

function MfeLabel({
  label,
  accent,
  className,
}: {
  label: string;
  accent: Accent;
  className?: string;
}) {
  return (
    <span
      data-slot="mfe-label"
      className={cn(
        'rounded px-2 py-0.5 font-mono text-[11px] leading-snug font-bold tracking-widest text-white',
        accents[accent].label,
        className,
      )}
    >
      {label}
    </span>
  );
}

function MfeFrame({
  label,
  accent,
  className,
  children,
  ...props
}: React.ComponentProps<'section'> & { label: string; accent: Accent }) {
  return (
    <section
      data-slot="mfe-frame"
      className={cn('relative rounded-xl border-2 border-dashed p-1', accents[accent].frame, className)}
      {...props}
    >
      <MfeLabel label={label} accent={accent} className="absolute -top-2.5 left-3.5 z-10" />
      {children}
    </section>
  );
}

export { MfeFrame, MfeLabel, type Accent };
