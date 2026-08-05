'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Icon } from '@iconify/react';
import type { Product } from '@/shared/data/productData';
import { useCart } from '@/shared/context/CartContext';
import { useWishlist } from '@/shared/context/WishlistContext';
import { useProductPrice } from '@/shared/hooks/useProductPrice';
import Button from '@/shared/ui/Button';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [added, setAdded] = useState(false);
  const { addToCart, cart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const priceLabel = useProductPrice(product);

  const isWishlisted = isInWishlist(product.id) || isInWishlist(product.slug);
  const stock = Math.max(0, Math.floor(Number(product.stock) || 0));
  const inCartQty =
    cart.find((item) => item.id === product.id || item.slug === product.slug)?.quantity || 0;
  const canAdd = stock > 0 && inCartQty < stock;

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canAdd) return;
    const ok = addToCart(product, 1);
    if (!ok) return;
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="group bg-white rounded-2xl lg:rounded-[1.2vw] border border-primary/10 overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-md hover:border-primary/20 h-full select-none w-full">
      <div>
        {/* Image Container */}
        <div className="relative w-full aspect-[4/3] overflow-hidden bg-[#FAF6F2]">
          <Link href={`/products/${product.slug}`} className="block relative w-full h-full">
            {product.image ? (
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-primary/50">
                No image
              </div>
            )}
          </Link>
        </div>

        {/* Product Details */}
        <div className="p-4 sm:p-5 lg:p-[1.2vw] flex flex-col items-start text-left gap-1.5 lg:gap-[0.4vw]">
          <Link href={`/products/${product.slug}`}>
            <h4 className="font-heading font-semibold text-primary-dark text-sm sm:text-base lg:text-[1.05vw] leading-tight hover:text-primary transition-colors cursor-pointer line-clamp-1">
              {product.name}
            </h4>
          </Link>

          {/* Star Rating */}
          <div className="flex items-center text-[#c89b5d] text-xs lg:text-[0.75vw] gap-0.5 lg:gap-[0.1vw]">
            <Icon icon="ph:star-fill" className="w-3.5 h-3.5 lg:w-[0.9vw] lg:h-[0.9vw]" />
            <Icon icon="ph:star-fill" className="w-3.5 h-3.5 lg:w-[0.9vw] lg:h-[0.9vw]" />
            <Icon icon="ph:star-fill" className="w-3.5 h-3.5 lg:w-[0.9vw] lg:h-[0.9vw]" />
            <Icon icon="ph:star-fill" className="w-3.5 h-3.5 lg:w-[0.9vw] lg:h-[0.9vw]" />
            <Icon icon="ph:star-fill" className="w-3.5 h-3.5 lg:w-[0.9vw] lg:h-[0.9vw]" />
          </div>

          {/* Category & Location */}
          <div className="flex flex-col gap-0.5 lg:gap-[0.1vw] font-secondary text-[10px] sm:text-[11px] lg:text-[0.7vw] text-body/75 tracking-wide leading-tight">
            <span>{product.category}</span>
            <span>{product.location}</span>
          </div>

          {/* Price & Wishlist Row */}
          <div className="w-full flex items-center justify-between mt-1 lg:mt-[0.3vw]">
            <span className="font-secondary font-bold text-primary text-[15px] sm:text-[16px] lg:text-[1.1vw] leading-tight">
              {priceLabel}
            </span>

            <button
              type="button"
              onClick={handleWishlistToggle}
              className={`p-1 lg:p-[0.2vw] rounded-full transition-colors cursor-pointer ${
                isWishlisted ? 'text-red-500' : 'text-primary hover:text-red-500'
              }`}
              aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Icon
                icon={isWishlisted ? 'ph:heart-fill' : 'ph:heart'}
                className="w-5 h-5 lg:w-[1.2vw] lg:h-[1.2vw] transition-transform duration-300 active:scale-125"
              />
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="px-4 sm:px-5 lg:px-[1.2vw] pb-4 sm:pb-5 lg:pb-[1.2vw] pt-1 lg:pt-[0.2vw] flex items-center gap-2 lg:gap-[0.5vw] w-full">
        <Link href={`/products/${product.slug}`} className="flex-1 min-w-0">
          <Button
            variant="primary"
            className="w-full !px-1.5 !py-2.5 lg:!py-[0.6vw] text-[9.5px] sm:text-[10.5px] lg:text-[0.65vw] tracking-wide whitespace-nowrap"
          >
            View Product
          </Button>
        </Link>

        <div className="flex-1 min-w-0">
          <Button
            variant="secondary"
            onClick={handleAddToCart}
            disabled={!canAdd && !added}
            className={`w-full !px-1.5 !py-2.5 lg:!py-[0.6vw] text-[9.5px] sm:text-[10.5px] lg:text-[0.65vw] tracking-wide whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${
              added ? 'bg-emerald-700 border-emerald-700 text-white hover:bg-emerald-800' : ''
            }`}
          >
            {stock < 1 ? 'Out of Stock' : added ? 'Added ✓' : canAdd ? 'Add to Cart' : 'Max in Cart'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
