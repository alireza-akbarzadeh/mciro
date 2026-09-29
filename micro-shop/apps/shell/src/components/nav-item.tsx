import type { AppPath } from "@micro-shop/contracts";
import { buttonVariants } from "@micro-shop/ui/components/button";
import { NavLink } from "react-router";

export function NavItem({ to, children }: { to: AppPath; children: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        buttonVariants({
          variant: isActive ? 'secondary' : 'ghost',
          size: 'sm',
        }) +
        ` rounded-full text-xs transition-all font-medium ${
          isActive
            ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
        }`
      }
    >
      {children}
    </NavLink>
  );
}
