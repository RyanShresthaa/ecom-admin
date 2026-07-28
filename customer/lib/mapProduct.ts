import type { Product, Artisan } from '@/shared/data/productData';
import { generateSlug } from '@/shared/data/productData';
import { formatMoney, type ApiProduct } from '@/lib/api';
import { setShopFxSettings, toDisplayAmount, getShopFxSettings } from '@/lib/currency';

const PLACEHOLDER_IMAGE = '/images/logo/Vector.png';

export { setShopFxSettings, getShopFxSettings };

const defaultArtisan: Artisan = {
  name: 'Matina Crafts Artisan',
  bio: ['Handcrafted in Nepal with traditional techniques.'],
  image: PLACEHOLDER_IMAGE,
  stats: {
    yearsOfCraft: 0,
    itemsCreated: 0,
    apprentices: 0,
  },
};

/** Turn API image URLs into local Next.js paths when possible. */
function toLocalPath(url: unknown): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  const stripped = trimmed.replace(/^https?:\/\/(localhost|127\.0\.0\.1):\d+/i, '');
  if (stripped.startsWith('/')) return stripped;
  if (trimmed.startsWith('/')) return trimmed;
  return trimmed;
}

/**
 * Convert one backend product into the storefront Product shape.
 * Catalog prices (usually NPR) are converted to the active display currency.
 */
export function mapApiProduct(
  row: ApiProduct,
  settings: ReturnType<typeof getShopFxSettings> = getShopFxSettings(),
): Product {
  const details = (
    typeof row.more_details === 'string'
      ? JSON.parse(row.more_details || '{}')
      : (row.more_details ?? {})
  ) as Record<string, any>;

  const name = row.name?.trim() || 'Untitled';
  const localImages = (Array.isArray(row.image) ? row.image : [])
    .filter(Boolean)
    .map(toLocalPath);

  const primary = localImages[0] || toLocalPath(row.image_url) || '';
  const discountNum = Number(row.discount ?? 0);
  const fx = { ...getShopFxSettings(), ...settings };
  const basePrice = Number(row.price ?? 0);
  const displayPrice = toDisplayAmount(basePrice, fx);
  const currency =
    fx.currency ||
    (String(fx.region_mode || '').toLowerCase() === 'nepal' ? 'NPR' : 'USD');

  const artisanRaw = details.artisan;
  const artisan: Artisan = artisanRaw
    ? {
        name: artisanRaw.name || defaultArtisan.name,
        bio: Array.isArray(artisanRaw.bio) ? artisanRaw.bio : defaultArtisan.bio,
        image: toLocalPath(artisanRaw.image),
        stats: artisanRaw.stats || defaultArtisan.stats,
      }
    : defaultArtisan;

  return {
    id: String(row.id ?? row._id),
    name,
    slug: details.slug || generateSlug(name) || String(row.id ?? row._id),
    category: row.category?.[0]?.name ?? 'Uncategorized',
    location: details.location || 'Nepal',
    price: formatMoney(displayPrice, currency),
    basePrice,
    image: primary,
    subtitle: details.subtitle || row.unit?.trim() || '',
    description: row.description?.trim() || '',
    originalPrice: details.originalPrice || '',
    discount: discountNum > 0 ? `${discountNum}% OFF` : '',
    medium: details.medium || '',
    dimensions: details.dimensions || '',
    age: details.age || '',
    school: details.school || '',
    stock: Number(row.stock ?? 0),
    galleryImages: localImages.length > 0 ? localImages : [primary],
    tags: Array.isArray(details.tags) ? details.tags : [],
    artisan,
  };
}

/** Map a list of API products using the active shop FX settings. */
export function mapApiProducts(
  rows: ApiProduct[],
  settings?: ReturnType<typeof getShopFxSettings>,
): Product[] {
  return rows.map((row) => mapApiProduct(row, settings));
}
