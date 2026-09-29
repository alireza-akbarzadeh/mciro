import type * as React from 'react';
import { Toaster as Sonner, toast, type ToasterProps } from 'sonner';

// shadcn/ui sonner (toasts), copied in, WITHOUT next-themes: this design system
// runs in Rspack remotes as well as Next.js, so the theme comes from the page's
// own CSS variables instead.
//
// Sonner keeps its toasts in module state. Each app bundles its own copy of
// this package, so an app shows toasts from ITS <Toaster />: render one inside
// the app (e.g. at the top of a remote) and call `toast` from the same app.

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { toast, Toaster };
