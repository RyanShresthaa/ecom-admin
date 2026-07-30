'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import type { Product } from '@/shared/data/productData';
import { useCart } from '@/shared/context/CartContext';
import { useWishlist } from '@/shared/context/WishlistContext';
import { fetchProductReviews } from '@/lib/api';
import { useProductPrice } from '@/shared/hooks/useProductPrice';

interface ProductInfoProps {
  product: Product;
}

export default function ProductInfo({ product }: ProductInfoProps) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [stockError, setStockError] = useState('');
  const [avg, setAvg] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const { addToCart, cart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const router = useRouter();
  const wishlisted = isInWishlist(product.id) || isInWishlist(product.slug);
  const priceLabel = useProductPrice(product);

  const inCartQty =
    cart.find((item) => item.id === product.id || item.slug === product.slug)?.quantity || 0;
  const stock = Math.max(0, Math.floor(Number(product.stock) || 0));
  const remaining = Math.max(0, stock - inCartQty);
  const outOfStock = stock < 1;

  useEffect(() => {
    let cancelled = false;
    fetchProductReviews(product.id)
      .then(({ summary }) => {
        if (cancelled) return;
        setAvg(summary.count > 0 ? summary.avg : null);
        setReviewCount(summary.count);
      })
      .catch(() => {
        /* keep empty state */
      });
    return () => {
      cancelled = true;
    };
  }, [product.id]);

  useEffect(() => {
    setQuantity((prev) => {
      if (remaining < 1) return 1;
      return Math.min(Math.max(1, prev), remaining);
    });
  }, [remaining]);

  const decrease = () => setQuantity((prev) => Math.max(1, prev - 1));
  const increase = () =>
    setQuantity((prev) => Math.min(Math.max(1, remaining), prev + 1));

  const handleAddToCart = () => {
    setStockError('');
    if (outOfStock || remaining < 1) {
      setStockError(outOfStock ? 'This item is out of stock.' : 'No more stock available to add.');
      return;
    }
    const ok = addToCart(product, Math.min(quantity, remaining));
    if (!ok) {
      setStockError('No more stock available to add.');
      return;
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };

  const handleBuyNow = () => {
    setStockError('');
    if (outOfStock || remaining < 1) {
      setStockError(outOfStock ? 'This item is out of stock.' : 'No more stock available to add.');
      return;
    }
    const ok = addToCart(product, Math.min(quantity, remaining));
    if (!ok) {
      setStockError('No more stock available to add.');
      return;
    }
    router.push('/cart');
  };

  const details = [
    { label: 'Origin', value: `${product.location}, Nepal` },
    { label: 'Medium', value: product.medium },
    { label: 'Dimensions', value: product.dimensions },
    { label: 'Age', value: product.age },
    { label: 'School', value: product.school },
    { label: 'Artisan', value: product.artisan.name },
  ];

  const starFill = avg != null ? Math.round(avg) : 0;

  return (
    <div className="flex flex-col gap-6 select-none">
      {/* Tags */}
      <div className="flex flex-wrap items-center gap-2">
        {product.tags.map((tag) => (
          <span
            key={tag}
            className="px-4 py-1.5 rounded-full border border-primary/20 text-[11px] font-secondary font-semibold text-primary-dark tracking-wide bg-primary-lighter/30"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Title & Subtitle */}
      <div>
        <h1 className="font-heading text-3xl sm:text-4xl lg:text-[42px] font-normal leading-tight text-primary-dark">
          {product.name}
        </h1>
        <p className="font-secondary text-sm sm:text-base text-body/80 mt-1.5">
          {product.subtitle}
        </p>
      </div>

      {/* Rating */}
      <div className="flex items-center gap-2">
        <div className="flex items-center text-[#c89b5d]">
          {Array.from({ length: 5 }).map((_, i) => (
            <Icon
              key={i}
              icon={avg != null && i < starFill ? 'ph:star-fill' : 'ph:star'}
              className="w-4 h-4"
            />
          ))}
        </div>
        {avg != null ? (
          <>
            <span className="font-secondary text-sm font-semibold text-primary-dark">
              {avg.toFixed(2)}
            </span>
            <span className="font-secondary text-xs text-body/50">
              ({reviewCount} review{reviewCount === 1 ? '' : 's'})
            </span>
          </>
        ) : (
          <span className="font-secondary text-xs text-body/50">No reviews yet</span>
        )}
      </div>

      {/* Price Block */}
      <div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="font-heading text-3xl sm:text-4xl font-bold text-primary leading-none">
            {priceLabel}
          </span>
          <span className="font-secondary text-base text-body/40 line-through">
            {product.originalPrice}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-green-600 text-white text-[10px] font-bold uppercase tracking-wider">
            {product.discount}
          </span>
        </div>
        <p className="font-secondary text-xs text-body/60 mt-1.5">
          Free worldwide shipping — arrives in 7–10 days
        </p>
      </div>

      {/* Description */}
      <p className="font-secondary text-sm leading-relaxed text-body/80 max-w-lg">
        {product.description}
      </p>

      {/* Details Table */}
      <div className="border border-primary/10 rounded-2xl overflow-hidden">
        {details.map((detail, idx) => (
          <div
            key={detail.label}
            className={`flex justify-between items-start px-5 py-3.5 font-secondary text-sm ${
              idx !== details.length - 1 ? 'border-b border-primary/8' : ''
            }`}
          >
            <span className="text-body/60 min-w-[100px]">{detail.label}</span>
            <span className="text-primary-dark text-right font-medium">{detail.value}</span>
          </div>
        ))}
      </div>

      {/* Quantity Selector */}
      <div className="flex items-center gap-4 pt-1">
        <div className="flex items-center border border-primary/15 rounded-full overflow-hidden">
          <button
            type="button"
            onClick={decrease}
            disabled={outOfStock || remaining < 1}
            className="w-10 h-10 flex items-center justify-center text-primary-dark hover:bg-primary-lighter/40 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Icon icon="ph:minus" className="w-4 h-4" />
          </button>
          <span className="w-10 text-center font-secondary text-sm font-semibold text-primary-dark select-none">
            {quantity}
          </span>
          <button
            type="button"
            onClick={increase}
            disabled={outOfStock || quantity >= remaining}
            className="w-10 h-10 flex items-center justify-center text-primary-dark hover:bg-primary-lighter/40 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Icon icon="ph:plus" className="w-4 h-4" />
          </button>
        </div>
        <span className="font-secondary text-xs text-body/60">
          {outOfStock
            ? 'Out of stock'
            : remaining < stock
              ? `${remaining} left to add (${stock} in stock)`
              : `Only ${stock} in stock`}
        </span>
      </div>

      {stockError ? (
        <p className="text-xs text-red-600 font-secondary -mt-2">{stockError}</p>
      ) : null}

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 pt-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={outOfStock || remaining < 1}
            className={`flex-1 py-3.5 rounded-full text-white font-semibold text-sm uppercase tracking-[0.15em] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${
              added ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-primary hover:bg-primary-dark'
            }`}
          >
            <Icon icon={added ? 'ph:check-bold' : 'ph:shopping-cart-simple'} className="w-5 h-5" />
            <span>
              {outOfStock || remaining < 1
                ? outOfStock
                  ? 'Out of Stock'
                  : 'Max in Cart'
                : added
                  ? 'Added to Cart ✓'
                  : 'Add to Cart'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => toggleWishlist(product)}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            className={`w-12 h-12 shrink-0 rounded-full border-2 flex items-center justify-center transition-all duration-300 cursor-pointer active:scale-[0.96] ${
              wishlisted
                ? 'border-primary bg-primary text-white'
                : 'border-primary/20 text-primary hover:border-primary hover:bg-primary-lighter/40'
            }`}
          >
            <Icon icon={wishlisted ? 'ph:heart-fill' : 'ph:heart'} className="w-5 h-5" />
          </button>
        </div>
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={outOfStock || remaining < 1}
          className="w-full py-3.5 rounded-full border-2 border-primary text-primary font-semibold text-sm uppercase tracking-[0.15em] hover:bg-primary hover:text-white transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-primary disabled:active:scale-100"
        >
          <span>{outOfStock ? 'Out of Stock' : 'Buy Now'}</span>
        </button>
      </div>

      {/* Trust Badges */}
      <div className="grid grid-cols-3 gap-4 pt-2 ">
        {[
          { icon: 'ph:seal-check', label: '100% Authentic' },
          { icon: 'ph:package', label: 'Free Shipping' },
          { icon: 'ph:arrow-counter-clockwise', label: '30-Day Returns' },
        ].map((badge) => (
          <div key={badge.label} className="flex border border-primary/30 rounded-2xl flex-col items-center gap-1.5 py-3">
            <Icon icon={badge.icon} className="w-6 h-6 text-primary/70" />
            <span className="font-secondary text-[10px] sm:text-[11px] text-body/70 font-medium text-center leading-tight">
              {badge.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
