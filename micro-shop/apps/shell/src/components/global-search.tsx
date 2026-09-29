import type { AppPath } from "@micro-shop/contracts";
import { Button } from "@micro-shop/ui/components/button";
import { Input } from "@micro-shop/ui/components/input";

export function CatalogSearch() {
  const action: AppPath = '/search';
  return (
    <form action={action} method="get" role="search" aria-label="Search the store" className="relative flex items-center">
      <label htmlFor="shell-catalog-search" className="sr-only">
        Search the store
      </label>
      <div className="relative flex items-center w-full max-w-xs">
        <svg
          className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <Input
          id="shell-catalog-search"
          type="search"
          name="q"
          placeholder="Search products…"
          maxLength={100}
          autoComplete="off"
          className="w-36 sm:w-52 rounded-full pl-9 pr-14 text-xs h-9 bg-slate-100/70 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-slate-900 dark:border-slate-800 transition-all"
        />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="absolute right-1 h-7 rounded-full px-2 text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
        >
          ⌘K
        </Button>
      </div>
    </form>
  );
}
