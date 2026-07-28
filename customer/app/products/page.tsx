import { Suspense } from 'react';
import ProductsHero from "@/features/products/ProductsHero";
import ProductDisplay from "@/features/products/ProductDisplay";

export default function Home() {
  return (
    <div>
        <ProductsHero />
        <Suspense fallback={
          <div className="w-full py-16 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        }>
          <ProductDisplay />
        </Suspense>
    </div>
  );
}

