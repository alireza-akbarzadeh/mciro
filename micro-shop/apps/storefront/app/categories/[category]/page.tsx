import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MfeFrame } from '@micro-shop/ui/components/mfe-frame';
import { CategoryNav } from '../../../components/category-nav';
import { ProductGrid } from '../../../components/product-grid';
import { findCategory, getCategories, getProductsInCategory } from '../../../lib/catalog';

// /categories/<slug>: one prerendered, indexable page per category. New
// categories added to the database later are rendered on first request.

type Props = { params: Promise<{ category: string }> };

export const revalidate = 300;

export async function generateStaticParams() {
  return (await getCategories()).map((category) => ({ category: category.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await findCategory((await params).category);
  if (!category) return {};
  return {
    title: category.name,
    description: category.description,
    alternates: { canonical: `/categories/${category.slug}` },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category: slug } = await params;
  const [category, categories, products] = await Promise.all([
    findCategory(slug),
    getCategories(),
    getProductsInCategory(slug),
  ]);
  if (!category) notFound();

  return (
    <MfeFrame label="STOREFRONT" accent="rose">
      <div className="grid gap-6 p-5">
        <div className="grid gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{category.name}</h1>
          <p className="text-muted-foreground">{category.description}</p>
        </div>
        <CategoryNav categories={categories} current={category.slug} />
        <ProductGrid products={products} />
      </div>
    </MfeFrame>
  );
}
