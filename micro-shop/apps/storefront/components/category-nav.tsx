import Link from 'next/link';
import { buttonVariants } from '@micro-shop/ui/components/button';
import { cn } from '@micro-shop/ui/lib/utils';
import type { Category } from '../lib/catalog';

// Category navigation as real links (/categories/<slug>): every category is its
// own crawlable, shareable, prerendered page, not a filter hidden in JavaScript.

export function CategoryNav({ categories, current }: { categories: readonly Category[]; current?: string }) {
  return (
    <nav aria-label="Categories" className="flex flex-wrap gap-2">
      <Link
        href="/"
        aria-current={current === undefined ? 'page' : undefined}
        className={cn(buttonVariants({ variant: current === undefined ? 'default' : 'outline', size: 'sm' }), 'rounded-full')}
      >
        All
      </Link>
      {categories.map((category) => (
        <Link
          key={category.slug}
          href={`/categories/${category.slug}`}
          aria-current={current === category.slug ? 'page' : undefined}
          className={cn(
            buttonVariants({ variant: current === category.slug ? 'default' : 'outline', size: 'sm' }),
            'rounded-full',
          )}
        >
          {category.name}
        </Link>
      ))}
    </nav>
  );
}
