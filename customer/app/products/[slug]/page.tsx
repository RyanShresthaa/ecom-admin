import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { fetchProductBySlug, fetchProducts, fetchShopSettings } from '@/lib/api';
import { mapApiProduct, mapApiProducts } from '@/lib/mapProduct';
import { applyShopSettingsToFx } from '@/lib/currency';
import Breadcrumb from '@/features/products/detail/Breadcrumb';
import ProductGallery from '@/features/products/detail/ProductGallery';
import ProductInfo from '@/features/products/detail/ProductInfo';
import ArtisanSection from '@/features/products/detail/ArtisanSection';
import RelatedProduct from '@/features/products/detail/RelatedProduct';
import ProductReviews from '@/features/products/detail/ProductReviews';

export const dynamic = 'force-dynamic';

async function loadFx() {
  try {
    return applyShopSettingsToFx(await fetchShopSettings());
  } catch {
    return applyShopSettingsToFx({});
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const fx = await loadFx();
    const row = await fetchProductBySlug(slug);
    const product = mapApiProduct(row, fx);
    return {
      title: `${product.name} | ${product.category} | Matina Crafts`,
      description: product.description,
    };
  } catch {
    return { title: 'Product Not Found | Matina Crafts' };
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const fx = await loadFx();

  let product;
  try {
    product = mapApiProduct(await fetchProductBySlug(slug), fx);
  } catch {
    notFound();
  }

  const catalog = mapApiProducts(await fetchProducts(100).catch(() => []), fx);
  const related = catalog
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 3);

  const fill = catalog
    .filter((p) => p.id !== product.id && !related.some((r) => r.id === p.id))
    .slice(0, Math.max(0, 3 - related.length));

  const relatedProducts = [...related, ...fill];

  return (
    <main className="w-full bg-background py-8 sm:py-12 select-none">
      <div className="container-custom max-w-7xl mx-auto px-4">
        <Breadcrumb product={product} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 lg:gap-20">
          <ProductGallery images={product.galleryImages} productName={product.name} />
          <ProductInfo product={product} />
        </div>

        <ArtisanSection artisan={product.artisan} />

        <ProductReviews productId={product.id} />

        <RelatedProduct currentProduct={product} products={relatedProducts} />
      </div>
    </main>
  );
}
