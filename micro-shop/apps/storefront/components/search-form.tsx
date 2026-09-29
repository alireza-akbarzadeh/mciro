import Form from 'next/form';
import { Button } from '@micro-shop/ui/components/button';
import { Input } from '@micro-shop/ui/components/input';
import { cn } from '@micro-shop/ui/lib/utils';
import { MAX_QUERY_LENGTH } from '../lib/catalog';

// next/form with a string action is a GET form: submitting navigates to
// /search?q=... Without JavaScript it is a plain HTML form (full page load); with
// JavaScript, Next.js navigates client-side. Search works either way.

type SearchFormProps = {
  /** Unique per page: the header and the search page both render a form. */
  id: string;
  label: string;
  defaultValue?: string;
  className?: string;
};

export function SearchForm({ id, label, defaultValue, className }: SearchFormProps) {
  return (
    <Form action="/search" role="search" aria-label={label} className={cn('flex gap-2', className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Input
        id={id}
        type="search"
        name="q"
        placeholder="Search products…"
        defaultValue={defaultValue}
        maxLength={MAX_QUERY_LENGTH}
        autoComplete="off"
      />
      <Button type="submit" variant="outline">
        Search
      </Button>
    </Form>
  );
}
