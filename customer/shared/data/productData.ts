// ─────────────────────────────────────────────
// Shared product types & helpers.
// Catalog data comes from the API via mapProduct — no mock listings here.
// ─────────────────────────────────────────────

export interface Artisan {
  name: string;
  bio: string[];
  image: string;
  stats: {
    yearsOfCraft: number;
    itemsCreated: number;
    apprentices: number;
  };
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  location: string;
  /** Formatted price in the active shop display currency. */
  price: string;
  /** Catalog/base amount (usually NPR) before FX conversion. */
  basePrice?: number;
  image: string;
  subtitle: string;
  description: string;
  originalPrice: string;
  discount: string;
  medium: string;
  dimensions: string;
  age: string;
  school: string;
  stock: number;
  galleryImages: string[];
  tags: string[];
  artisan: Artisan;
}

export interface CategoryGroup {
  name: string;
  description: string;
  products: Product[];
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** @deprecated Catalog is API-backed; kept for type-compatible empty fallbacks. */
export const productCategories: CategoryGroup[] = [];

export function getAllProducts(): Product[] {
  return [];
}

export function getProductBySlug(_slug: string): Product | undefined {
  return undefined;
}

export function getCategoryForProduct(_product: Product): CategoryGroup | undefined {
  return undefined;
}
