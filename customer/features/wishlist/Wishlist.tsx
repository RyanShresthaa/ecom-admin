'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { useWishlist, wishlistItemToProduct } from '@/shared/context/WishlistContext';
import { useCart } from '@/shared/context/CartContext';
import RelatedProduct from '@/features/products/detail/RelatedProduct';
import { ApiError, createWishlistShare, fetchMyWishlistShare } from '@/lib/api';
import { useAuth } from '@/shared/context/AuthContext';

const Wishlist: React.FC = () => {
    const { wishlist, removeFromWishlist } = useWishlist();
    const { addToCart } = useCart();
    const { isLoggedIn } = useAuth();
    const router = useRouter();

    const [activeFilter, setActiveFilter] = useState<'all' | 'inStock' | 'onSale' | 'newArrivals'>('all');
    const [sortBy, setSortBy] = useState<'date' | 'priceLow' | 'priceHigh'>('date');
    const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});
    const [sharedToast, setSharedToast] = useState(false);
    const [shareBusy, setShareBusy] = useState(false);
    const [shareError, setShareError] = useState('');

    // Filter items based on active tab
    const filteredItems = wishlist.filter((item) => {
        if (activeFilter === 'inStock') return item.inStock;
        if (activeFilter === 'onSale') return item.onSale || !!item.originalPrice;
        if (activeFilter === 'newArrivals') return item.isNewArrival || item.badge?.includes('New');
        return true;
    });

    // Sort items
    const sortedItems = [...filteredItems].sort((a, b) => {
        if (sortBy === 'priceLow') return a.price - b.price;
        if (sortBy === 'priceHigh') return b.price - a.price;
        return 0;
    });

    const handleAddToCart = (e: React.MouseEvent, item: (typeof wishlist)[number]) => {
        e.stopPropagation();
        e.preventDefault();
        if (!item.inStock) return;
        const ok = addToCart(wishlistItemToProduct(item), 1);
        if (!ok) return;

        setAddedItems((prev) => ({ ...prev, [item.id]: true }));
        setTimeout(() => {
            setAddedItems((prev) => ({ ...prev, [item.id]: false }));
        }, 2000);
    };

    const handleAddAllToCart = () => {
        wishlist
            .filter((item) => item.inStock)
            .forEach((item) => addToCart(wishlistItemToProduct(item), 1));
    };

    const handleShareList = async () => {
        setShareError('');
        if (!isLoggedIn) {
            router.push('/login?next=/wishlist');
            return;
        }
        setShareBusy(true);
        try {
            let share = await fetchMyWishlistShare();
            if (!share?.url) {
                share = await createWishlistShare();
            }
            if (navigator.clipboard && share.url) {
                await navigator.clipboard.writeText(share.url);
            }
            setSharedToast(true);
            setTimeout(() => setSharedToast(false), 3000);
        } catch (err) {
            setShareError(
                err instanceof ApiError || err instanceof Error
                    ? err.message
                    : 'Could not create share link',
            );
            setTimeout(() => setShareError(''), 4000);
        } finally {
            setShareBusy(false);
        }
    };

    return (
        <div className="w-full bg-[#FAF6F2] min-h-screen pt-28 pb-20 select-none">
            <div className="container-custom max-w-7xl mx-auto px-4 sm:px-6">

                {/* Share Toast Notification */}
                {sharedToast && (
                    <div className="fixed bottom-6 right-6 bg-[#2A170F] text-white px-5 py-3 rounded-2xl shadow-xl z-50 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
                        <Icon icon="ph:check-circle-fill" className="w-4 h-4 text-emerald-400" />
                        <span>Public wishlist link copied!</span>
                    </div>
                )}
                {shareError && (
                    <div className="fixed bottom-6 right-6 bg-red-800 text-white px-5 py-3 rounded-2xl shadow-xl z-50 text-xs font-semibold">
                        {shareError}
                    </div>
                )}

                {/* Top Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                    <div>
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#9E7D6F] mb-2 block font-secondary">
                            YOUR COLLECTION
                        </span>
                        <h1 className="font-heading text-4xl sm:text-5xl font-bold text-[#2A170F] tracking-tight">
                            My Wishlist
                        </h1>
                        <div className="flex items-center gap-2 text-sm text-body/70 mt-2 font-secondary">
                            <Icon icon="ph:heart" className="w-4 h-4 text-primary" />
                            <span>{wishlist.length} handcrafted {wishlist.length === 1 ? 'piece' : 'pieces'} saved for later</span>
                        </div>
                    </div>

                    {wishlist.length > 0 && (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => void handleShareList()}
                                disabled={shareBusy}
                                className="px-5 py-2.5 rounded-full border border-primary/20 bg-white text-body/80 hover:bg-primary-lighter/40 font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-60"
                            >
                                <Icon
                                    icon={shareBusy ? 'lucide:loader-2' : 'ph:share-network'}
                                    className={`w-4 h-4 text-primary ${shareBusy ? 'animate-spin' : ''}`}
                                />
                                <span>{shareBusy ? 'Sharing…' : 'Share List'}</span>
                            </button>

                            <button
                                onClick={handleAddAllToCart}
                                className="px-5 py-2.5 rounded-full border-2 border-primary text-primary hover:bg-primary hover:text-white font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                            >
                                <Icon icon="ph:shopping-cart-simple" className="w-4 h-4" />
                                <span>Add All to Cart</span>
                            </button>
                        </div>
                    )}
                </div>

                {wishlist.length === 0 ? (
                    /* Empty Wishlist State */
                    <div className="bg-white rounded-3xl p-12 text-center border border-primary/10 shadow-xs flex flex-col items-center justify-center my-8">
                        <div className="w-20 h-20 rounded-full bg-[#F5ECE8] text-primary flex items-center justify-center mb-6">
                            <Icon icon="ph:heart-light" className="w-10 h-10" />
                        </div>
                        <h2 className="font-heading text-2xl sm:text-3xl font-medium text-primary-dark mb-2">
                            Your wishlist is empty
                        </h2>
                        <p className="font-secondary text-sm text-body/70 max-w-md mb-8">
                            Explore our collection of authentic Nepalese handicrafts and click the heart icon to save your favorites here.
                        </p>
                        <Link
                            href="/products"
                            className="px-8 py-4 rounded-full bg-[#8C523A] text-white font-semibold text-xs uppercase tracking-wider hover:bg-primary-dark transition-all duration-300 shadow-md"
                        >
                            Explore Collection
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* Filter & Sort Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">

                            {/* Filter Tabs */}
                            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
                                {[
                                    { id: 'all', label: 'All Items' },
                                    { id: 'inStock', label: 'In Stock' },
                                    { id: 'onSale', label: 'On Sale' },
                                    { id: 'newArrivals', label: 'New Arrivals' },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveFilter(tab.id as any)}
                                        className={`px-5 py-2 rounded-full text-xs font-semibold transition-all duration-300 whitespace-nowrap cursor-pointer ${activeFilter === tab.id
                                                ? 'bg-[#8C523A] text-white shadow-xs'
                                                : 'bg-white border border-primary/15 text-body/80 hover:bg-primary-lighter/30'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Sort Dropdown */}
                            <div className="flex items-center gap-2 text-xs font-secondary text-body/70 self-end sm:self-auto">
                                <span>Sort by:</span>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                    className="bg-white border border-primary/15 rounded-full px-4 py-2 text-xs font-semibold text-primary-dark focus:outline-none cursor-pointer"
                                >
                                    <option value="date">Date Added</option>
                                    <option value="priceLow">Price: Low to High</option>
                                    <option value="priceHigh">Price: High to Low</option>
                                </select>
                            </div>

                        </div>

                        {/* Wishlist Product Cards Grid (3 Columns) */}
                        {sortedItems.length === 0 ? (
                          <div className="bg-white rounded-3xl p-10 text-center border border-primary/10 flex flex-col items-center my-4">
                            <h3 className="font-heading text-xl font-medium text-[#2A170F] mb-2">
                              No pieces match this filter
                            </h3>
                            <p className="font-secondary text-sm text-body/70 mb-6 max-w-md">
                              Try another filter or view all saved items.
                            </p>
                            <button
                              type="button"
                              onClick={() => setActiveFilter('all')}
                              className="px-6 py-3 rounded-full bg-[#8C523A] text-white font-semibold text-xs uppercase tracking-wider"
                            >
                              Show all items
                            </button>
                          </div>
                        ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                            {sortedItems.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => router.push(`/products/${item.slug}`)}
                                    className="group bg-white rounded-3xl border border-primary/10 overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-md hover:border-primary/20 h-full select-none cursor-pointer"
                                >
                                    <div>
                                        {/* Image Container with Badges & Remove Icon */}
                                        <div className="relative w-full aspect-[4/3] overflow-hidden bg-[#FAF6F2]">
                                            {item.image ? (
                                              <Image
                                                src={item.image}
                                                alt={item.name}
                                                fill
                                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                                              />
                                            ) : (
                                              <div className="flex h-full w-full items-center justify-center text-xs text-primary/50">
                                                No image
                                              </div>
                                            )}

                                            {/* Top-Left Badge */}
                                            {item.badge && (
                                                <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs text-[10px] font-bold text-primary px-3 py-1 rounded-full uppercase tracking-wider shadow-xs z-20">
                                                    {item.badge}
                                                </span>
                                            )}

                                            {/* Out of Stock Overlay */}
                                            {!item.inStock && (
                                                <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10 pointer-events-none">
                                                    <span className="px-4 py-1.5 rounded-full bg-white border border-primary/20 text-xs font-bold text-primary-dark shadow-xs">
                                                        Out of Stock
                                                    </span>
                                                </div>
                                            )}

                                            {/* Top-Right Remove Wishlist Button (Highest Z-Index) */}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    removeFromWishlist(item.id);
                                                }}
                                                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white text-red-500 shadow-xs flex items-center justify-center cursor-pointer hover:scale-110 transition-all z-30 pointer-events-auto"
                                                title="Remove from wishlist"
                                                aria-label="Remove from wishlist"
                                            >
                                                <Icon icon="ph:heart-fill" className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Product Details */}
                                        <div className="p-5 flex flex-col items-start text-left gap-2">
                                            <span className="text-[11px] font-secondary text-body/60 font-medium">
                                                {item.category}
                                            </span>

                                            <h3 className="font-heading font-semibold text-primary-dark text-base sm:text-lg leading-tight group-hover:text-primary transition-colors cursor-pointer line-clamp-1">
                                                {item.name}
                                            </h3>

                                            <p className="text-xs text-body/60 font-secondary">
                                                {item.artisanName}, {item.artisanLocation}
                                            </p>

                                            {item.reviewsCount > 0 ? (
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <div className="flex items-center text-[#c89b5d] text-xs">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Icon
                                                          key={i}
                                                          icon={i < Math.round(item.rating || 0) ? 'ph:star-fill' : 'ph:star'}
                                                          className="w-3.5 h-3.5"
                                                        />
                                                    ))}
                                                </div>
                                                <span className="font-secondary text-xs font-bold text-primary-dark ml-1">
                                                    {item.rating}
                                                </span>
                                                <span className="font-secondary text-xs text-body/50">
                                                    ({item.reviewsCount})
                                                </span>
                                            </div>
                                            ) : (
                                              <span className="text-[11px] text-body/50 font-secondary uppercase tracking-wider mt-0.5">
                                                Handmade in Nepal
                                              </span>
                                            )}

                                            {/* Price Row */}
                                            <div className="flex items-baseline gap-2 mt-1">
                                                <span className="font-heading text-xl font-bold text-primary">
                                                    {item.priceString}
                                                </span>
                                                {item.originalPrice && (
                                                    <span className="font-secondary text-xs text-body/40 line-through">
                                                        {item.originalPrice}
                                                    </span>
                                                )}
                                                {item.discountBadge && (
                                                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                                                        {item.discountBadge}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons Row */}
                                    <div className="px-5 pb-5 pt-1 flex items-center gap-2 w-full">
                                        {item.inStock ? (
                                            <button
                                                type="button"
                                                onClick={(e) => handleAddToCart(e, item)}
                                                className={`flex-1 py-3 text-xs font-semibold uppercase tracking-wider rounded-full flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer shadow-xs active:scale-[0.98] ${addedItems[item.id]
                                                        ? 'bg-emerald-700 text-white'
                                                        : 'bg-[#8C523A] text-white hover:bg-primary-dark'
                                                    }`}
                                            >
                                                <Icon icon={addedItems[item.id] ? 'ph:check-bold' : 'ph:shopping-bag-simple'} className="w-4 h-4" />
                                                <span>{addedItems[item.id] ? 'Added to Cart ✓' : 'Add to Cart'}</span>
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                disabled
                                                onClick={(e) => e.stopPropagation()}
                                                className="flex-1 py-3 bg-neutral-200 text-body/50 font-semibold text-xs uppercase tracking-wider rounded-full text-center cursor-not-allowed"
                                            >
                                                Notify Me
                                            </button>
                                        )}

                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(`/products/${item.slug}`);
                                            }}
                                            className="w-11 h-11 rounded-full bg-[#FAF6F2] hover:bg-primary-lighter/40 text-primary flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                                            title="Quick View"
                                        >
                                            <Icon icon="ph:eye" className="w-5 h-5" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        )}

                        {/* Bottom CTA Banner */}
                        <div className="bg-[#4E291B] text-white rounded-3xl p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md mt-16">
                            <div className="flex flex-col text-center md:text-left">
                                <h3 className="font-heading  text-white text-3xl sm:text-4xl font-bold">
                                    Ready to bring Nepal home?
                                </h3>
                                <p className="font-secondary text-sm sm:text-base text-white/80 mt-2 max-w-xl">
                                    Add all wishlist items to your cart and complete your collection of ethical Nepalese craftsmanship.
                                </p>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 flex-wrap justify-center">
                                <button
                                    onClick={handleAddAllToCart}
                                    className="px-8 py-4 rounded-full bg-[#c89b5d] hover:bg-[#b5884a] text-[#2A170F] font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer active:scale-[0.98]"
                                >
                                    Add All to Cart
                                </button>

                                <Link
                                    href="/products"
                                    className="px-8 py-4 rounded-full border-2 border-white text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer text-center"
                                >
                                    Explore More
                                </Link>
                            </div>
                        </div>

                    </>
                )}

                {/* You Might Also Love Recommendations */}
                <RelatedProduct
                    excludeIds={wishlist.flatMap((item) => [item.id, item.slug])}
                />

            </div>
        </div>
    );
};

export default Wishlist;