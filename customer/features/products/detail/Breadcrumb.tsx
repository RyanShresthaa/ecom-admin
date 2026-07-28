import Link from 'next/link';
import type { Product } from '@/shared/data/productData';

interface BreadcrumbProps {
  product: Product;
}

export default function Breadcrumb({ product }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 font-secondary text-xs sm:text-sm text-body/70 flex-wrap select-none mb-8 sm:mb-10">
      <Link
        href="/"
        className="hover:text-primary transition-colors no-underline text-body/70"
      >
        Home
      </Link>
      <span className="text-body/40">›</span>
      <Link
        href="/products"
        className="hover:text-primary transition-colors no-underline text-body/70"
      >
        Products
      </Link>
      {product.category && (
        <>
          <span className="text-body/40">›</span>
          <Link
            href={`/products?category=${encodeURIComponent(product.category)}`}
            className="hover:text-primary transition-colors no-underline text-body/70"
          >
            {product.category}
          </Link>
        </>
      )}
      <span className="text-body/40">›</span>
      <span className="text-primary-dark font-semibold">{product.name}</span>
    </nav>
  );
}
