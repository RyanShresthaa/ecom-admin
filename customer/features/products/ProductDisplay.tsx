'use client';

import React, { useState, useMemo, useDeferredValue, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useSearchParams } from 'next/navigation';
import type { Product } from '@/shared/data/productData';
import ProductCard from '@/shared/ui/ProductCard';
import { mapApiProducts } from '@/lib/mapProduct';
import { fetchProducts } from '@/lib/api';
import { useShopLocale } from '@/shared/context/ShopLocaleContext';

const ProductDisplay = () => {
  // State Hooks
  // Search parameter reading (Next.js)
  const searchParams = useSearchParams();
  const { settings, loading: localeLoading, currency, usdNprRate, priceBaseCurrency, regionMode } =
    useShopLocale();

  // Parse initial category from URL
  const urlCategory = useMemo(() => {
    const cat = searchParams.get('category');
    return cat ? cat : null;
  }, [searchParams]);

  // State Hooks
  const [selectedCategory, setSelectedCategory] = useState<string | null>(urlCategory);
  const [prevUrlCategory, setPrevUrlCategory] = useState<string | null>(urlCategory);
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [openDropdown, setOpenDropdown] = useState<'category' | 'origin' | 'price' | null>(null);
  const [visibleFilteredCount, setVisibleFilteredCount] = useState(8);
  const [visibleCategoriesCount, setVisibleCategoriesCount] = useState(3);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync state if urlCategory changes during navigation (render phase adjustment)
  if (urlCategory !== prevUrlCategory) {
    setPrevUrlCategory(urlCategory);
    setSelectedCategory(urlCategory);
  }

  // Refs for click outside detection
  const categoryRef = useRef<HTMLDivElement>(null);
  const originRef = useRef<HTMLDivElement>(null);
  const priceRef = useRef<HTMLDivElement>(null);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        (categoryRef.current && !categoryRef.current.contains(event.target as Node)) &&
        (originRef.current && !originRef.current.contains(event.target as Node)) &&
        (priceRef.current && !priceRef.current.contains(event.target as Node))
      ) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load products from API (remap when region / FX settings settle)
  useEffect(() => {
    if (localeLoading) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const rows = await fetchProducts(100);
        if (!cancelled) {
          setProducts(mapApiProducts(rows, settings));
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load products');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [localeLoading, currency, usdNprRate, priceBaseCurrency, regionMode, settings]);

  // Update query params without full reload
  const updateUrlParam = (paramName: string, value: string | null) => {
    const url = new URL(window.location.href);
    if (value) {
      url.searchParams.set(paramName, value);
    } else {
      url.searchParams.delete(paramName);
    }
    window.history.pushState({}, '', url.toString());
  };

  // Flattened products list for unified searching & filtering
  const allProducts = products;

  const categories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category))).sort();
  }, [products]);
  
  const categoryGroups = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of products) {
      const list = map.get(p.category) ?? [];
      list.push(p);
      map.set(p.category, list);
    }
    return Array.from(map.entries()).map(([name, items]) => ({
      name,
      description: `${items.length} handcrafted piece${items.length === 1 ? '' : 's'}`,
      products: items,
    }));
  }, [products]);

  const origins = useMemo(() => {
    const locs = allProducts.map(p => p.location);
    return Array.from(new Set(locs)).sort();
  }, [allProducts]);

  const priceRanges = [
    { id: 'under-50', label: 'Under $50' },
    { id: '50-100', label: '$50 - $100' },
    { id: '100-200', label: '$100 - $200' },
    { id: 'over-200', label: 'Over $200' }
  ];

  const getPriceRangeLabel = (id: string | null) => {
    if (!id) return '';
    return priceRanges.find(p => p.id === id)?.label || '';
  };

  // Deferred search value for high performance
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Filtering logic
  const filteredProducts = useMemo(() => {
    let result = allProducts;

    // 1. Filter by category
    if (selectedCategory) {
      result = result.filter(
      (p) => p.category.toLowerCase() === selectedCategory.toLowerCase(),
      );
    }

    // 2. Filter by origin
    if (selectedOrigin) {
      result = result.filter(p => p.location.toLowerCase() === selectedOrigin.toLowerCase());
    }

    // 3. Filter by price (amounts already in display currency)
    if (selectedPriceRange) {
      result = result.filter(p => {
        const priceNum = parseFloat(String(p.price).replace(/[^0-9.]/g, '')) || 0;
        if (selectedPriceRange === 'under-50') return priceNum < 50;
        if (selectedPriceRange === '50-100') return priceNum >= 50 && priceNum <= 100;
        if (selectedPriceRange === '100-200') return priceNum > 100 && priceNum <= 200;
        if (selectedPriceRange === 'over-200') return priceNum > 200;
        return true;
      });
    }

    // 4. Search query
    if (deferredSearchQuery.trim()) {
      const query = deferredSearchQuery.toLowerCase().trim();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        p.location.toLowerCase().includes(query)
      );
    }

    return result;
  }, [selectedCategory, selectedOrigin, selectedPriceRange, deferredSearchQuery, allProducts]);

  // Is filtering active?
  const isFiltering = useMemo(() => {
    return !!(selectedCategory || selectedOrigin || selectedPriceRange || searchQuery.trim());
  }, [selectedCategory, selectedOrigin, selectedPriceRange, searchQuery]);

  // Handler functions
  const toggleDropdown = (type: 'category' | 'origin' | 'price') => {
    setOpenDropdown(prev => prev === type ? null : type);
  };

  const handleCategorySelect = (catName: string | null) => {
    setSelectedCategory(catName);
    updateUrlParam('category', catName);
    setOpenDropdown(null);
    setVisibleFilteredCount(8);
  };

  const handleOriginSelect = (originName: string | null) => {
    setSelectedOrigin(originName);
    setOpenDropdown(null);
    setVisibleFilteredCount(8);
  };

  const handlePriceSelect = (rangeId: string | null) => {
    setSelectedPriceRange(rangeId);
    setOpenDropdown(null);
    setVisibleFilteredCount(8);
  };

  const resetAllFilters = () => {
    setSelectedCategory(null);
    setSelectedOrigin(null);
    setSelectedPriceRange(null);
    setSearchQuery('');
    updateUrlParam('category', null);
    setOpenDropdown(null);
    setVisibleFilteredCount(8);
    setVisibleCategoriesCount(3);
  };

  // Pagination conditions
  const hasMoreFiltered = filteredProducts.length > visibleFilteredCount;
  const hasMoreCategories = categoryGroups.length > visibleCategoriesCount;

  // Split view of categories for unfiltered view
  const visibleCategories = useMemo(() => {
    return categoryGroups.slice(0, visibleCategoriesCount);
  }, [categoryGroups, visibleCategoriesCount]);

  if (loading) {
    return (
      <div className="w-full px-4 sm:px-8 lg:px-[5vw] lg:max-w-none mx-auto py-20 lg:py-[5vw]">
        <div className="w-full lg:max-w-none mx-auto bg-white rounded-3xl lg:rounded-[1.5vw] border border-primary/10 p-10 lg:p-[3vw] text-center font-secondary text-sm lg:text-[0.85vw] text-body/70">
          Loading products…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full px-4 sm:px-8 lg:px-[5vw] lg:max-w-none mx-auto py-20 lg:py-[5vw]">
        <div className="w-full lg:max-w-none mx-auto bg-white rounded-3xl lg:rounded-[1.5vw] border border-red-200 p-10 lg:p-[3vw] text-center">
          <h3 className="font-heading text-xl lg:text-[1.4vw] font-medium text-[#2A170F] mb-2 lg:mb-[0.5vw]">
            Could not load products
          </h3>
          <p className="font-secondary text-sm lg:text-[0.85vw] text-red-700 mb-6 lg:mb-[1.5vw]">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 lg:px-[1.8vw] py-3 lg:py-[0.7vw] rounded-full bg-[#8C523A] text-white text-xs lg:text-[0.75vw] font-semibold uppercase tracking-wider"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="w-full py-20 lg:py-[5vw] px-4 sm:px-8 lg:px-[5vw] bg-background">
        <div className="w-full lg:max-w-none mx-auto bg-white rounded-3xl lg:rounded-[1.5vw] border border-primary/10 p-12 lg:p-[3.5vw] text-center flex flex-col items-center">
          <div className="w-16 h-16 lg:w-[4vw] lg:h-[4vw] rounded-full bg-[#F5ECE8] text-primary flex items-center justify-center mb-6 lg:mb-[1.5vw]">
            <Icon icon="ph:basket-light" className="w-8 h-8 lg:w-[2vw] lg:h-[2vw]" />
          </div>
          <h3 className="font-heading text-2xl lg:text-[1.8vw] font-medium text-[#2A170F] mb-2 lg:mb-[0.5vw]">
            Catalog coming soon
          </h3>
          <p className="font-secondary text-sm lg:text-[0.85vw] text-body/70 mb-2 lg:mb-[0.5vw] w-full lg:max-w-none">
            No products are published yet. Check back soon for handmade pieces from Nepal.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="w-full py-12 sm:py-16 lg:py-[5vw] select-none bg-background animate-in fade-in duration-300">
      <div className="w-full px-4 sm:px-8 lg:px-[5vw] lg:max-w-none mx-auto">
      
        {/* Filters Top Bar */}
        <div className="bg-secondary-lighter/40 border border-primary/10 rounded-2xl lg:rounded-[1.2vw] p-4 sm:p-5 lg:p-[1.2vw] mb-12 sm:mb-16 lg:mb-[3vw] flex flex-col md:flex-row gap-4 lg:gap-[1.2vw] justify-between items-center z-40 relative w-full lg:max-w-none">
          <div className="flex flex-wrap items-center gap-3 lg:gap-[0.8vw] w-full md:w-auto">
            {/* Category Dropdown */}
            <div ref={categoryRef} className="relative">
              <div 
                onClick={() => toggleDropdown('category')}
                className={`min-w-[140px] lg:min-w-[9vw] bg-white rounded-full border px-4 lg:px-[1vw] py-2 lg:py-[0.5vw] flex items-center justify-between text-xs sm:text-sm lg:text-[0.75vw] cursor-pointer font-secondary select-none transition-all duration-200 ${
                  selectedCategory 
                    ? 'border-primary bg-primary-lighter/45 text-primary font-semibold' 
                    : 'border-primary/15 text-primary-dark hover:border-primary/45'
                }`}
              >
                <span>{selectedCategory || 'All Categories'}</span>
                <Icon 
                  icon="lucide:chevron-down" 
                  className={`w-4 h-4 lg:w-[1vw] lg:h-[1vw] text-primary/60 ml-2 lg:ml-[0.5vw] transition-transform duration-250 ${
                    openDropdown === 'category' ? 'rotate-180' : ''
                  }`} 
                />
              </div>
              
              {openDropdown === 'category' && (
                <div className="absolute left-0 mt-2 lg:mt-[0.5vw] w-56 lg:w-[14vw] bg-white border border-primary/15 rounded-2xl lg:rounded-[1vw] py-2 lg:py-[0.5vw] shadow-soft z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div 
                    onClick={() => handleCategorySelect(null)}
                    className={`px-4 lg:px-[1vw] py-2.5 lg:py-[0.5vw] text-xs sm:text-sm lg:text-[0.75vw] cursor-pointer transition-colors duration-150 rounded-t-2xl lg:rounded-t-[1vw] ${
                      !selectedCategory 
                        ? 'bg-primary-lighter/60 text-primary font-semibold' 
                        : 'text-primary-dark hover:bg-accent-lighter/60'
                    }`}
                  >
                    All Categories
                  </div>
                  {categories.map((cat, idx) => (
                    <div 
                      key={cat}
                      onClick={() => handleCategorySelect(cat)}
                      className={`px-4 lg:px-[1vw] py-2.5 lg:py-[0.5vw] text-xs sm:text-sm lg:text-[0.75vw] cursor-pointer transition-colors duration-150 ${
                        idx === categories.length - 1 ? 'rounded-b-2xl lg:rounded-b-[1vw]' : ''
                      } ${
                        selectedCategory === cat 
                          ? 'bg-primary-lighter/60 text-primary font-semibold' 
                          : 'text-primary-dark hover:bg-accent-lighter/60'
                      }`}
                    >
                      {cat}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Origin Dropdown */}
            <div ref={originRef} className="relative">
              <div 
                onClick={() => toggleDropdown('origin')}
                className={`min-w-[140px] lg:min-w-[9vw] bg-white rounded-full border px-4 lg:px-[1vw] py-2 lg:py-[0.5vw] flex items-center justify-between text-xs sm:text-sm lg:text-[0.75vw] cursor-pointer font-secondary select-none transition-all duration-200 ${
                  selectedOrigin 
                    ? 'border-primary bg-primary-lighter/45 text-primary font-semibold' 
                    : 'border-primary/15 text-primary-dark hover:border-primary/45'
                }`}
              >
                <span>{selectedOrigin || 'All Origins'}</span>
                <Icon 
                  icon="lucide:chevron-down" 
                  className={`w-4 h-4 lg:w-[1vw] lg:h-[1vw] text-primary/60 ml-2 lg:ml-[0.5vw] transition-transform duration-250 ${
                    openDropdown === 'origin' ? 'rotate-180' : ''
                  }`} 
                />
              </div>
              
              {openDropdown === 'origin' && (
                <div className="absolute left-0 mt-2 lg:mt-[0.5vw] w-48 lg:w-[12vw] bg-white border border-primary/15 rounded-2xl lg:rounded-[1vw] py-2 lg:py-[0.5vw] shadow-soft z-50 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200">
                  <div 
                    onClick={() => handleOriginSelect(null)}
                    className={`px-4 lg:px-[1vw] py-2.5 lg:py-[0.5vw] text-xs sm:text-sm lg:text-[0.75vw] cursor-pointer transition-colors duration-150 rounded-t-2xl lg:rounded-t-[1vw] ${
                      !selectedOrigin 
                        ? 'bg-primary-lighter/60 text-primary font-semibold' 
                        : 'text-primary-dark hover:bg-accent-lighter/60'
                    }`}
                  >
                    All Origins
                  </div>
                  {origins.map((origin, idx) => (
                    <div 
                      key={origin}
                      onClick={() => handleOriginSelect(origin)}
                      className={`px-4 lg:px-[1vw] py-2.5 lg:py-[0.5vw] text-xs sm:text-sm lg:text-[0.75vw] cursor-pointer transition-colors duration-150 ${
                        idx === origins.length - 1 ? 'rounded-b-2xl lg:rounded-b-[1vw]' : ''
                      } ${
                        selectedOrigin === origin 
                          ? 'bg-primary-lighter/60 text-primary font-semibold' 
                          : 'text-primary-dark hover:bg-accent-lighter/60'
                      }`}
                    >
                      {origin}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Price Dropdown */}
            <div ref={priceRef} className="relative">
              <div 
                onClick={() => toggleDropdown('price')}
                className={`min-w-[140px] lg:min-w-[9vw] bg-white rounded-full border px-4 lg:px-[1vw] py-2 lg:py-[0.5vw] flex items-center justify-between text-xs sm:text-sm lg:text-[0.75vw] cursor-pointer font-secondary select-none transition-all duration-200 ${
                  selectedPriceRange 
                    ? 'border-primary bg-primary-lighter/45 text-primary font-semibold' 
                    : 'border-primary/15 text-primary-dark hover:border-primary/45'
                }`}
              >
                <span>{getPriceRangeLabel(selectedPriceRange) || 'All Prices'}</span>
                <Icon 
                  icon="lucide:chevron-down" 
                  className={`w-4 h-4 lg:w-[1vw] lg:h-[1vw] text-primary/60 ml-2 lg:ml-[0.5vw] transition-transform duration-250 ${
                    openDropdown === 'price' ? 'rotate-180' : ''
                  }`} 
                />
              </div>
              
              {openDropdown === 'price' && (
                <div className="absolute left-0 mt-2 lg:mt-[0.5vw] w-48 lg:w-[12vw] bg-white border border-primary/15 rounded-2xl lg:rounded-[1vw] py-2 lg:py-[0.5vw] shadow-soft z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div 
                    onClick={() => handlePriceSelect(null)}
                    className={`px-4 lg:px-[1vw] py-2.5 lg:py-[0.5vw] text-xs sm:text-sm lg:text-[0.75vw] cursor-pointer transition-colors duration-150 rounded-t-2xl lg:rounded-t-[1vw] ${
                      !selectedPriceRange 
                        ? 'bg-primary-lighter/60 text-primary font-semibold' 
                        : 'text-primary-dark hover:bg-accent-lighter/60'
                    }`}
                  >
                    All Prices
                  </div>
                  {priceRanges.map((range, idx) => (
                    <div 
                      key={range.id}
                      onClick={() => handlePriceSelect(range.id)}
                      className={`px-4 lg:px-[1vw] py-2.5 lg:py-[0.5vw] text-xs sm:text-sm lg:text-[0.75vw] cursor-pointer transition-colors duration-150 ${
                        idx === priceRanges.length - 1 ? 'rounded-b-2xl lg:rounded-b-[1vw]' : ''
                      } ${
                        selectedPriceRange === range.id 
                          ? 'bg-primary-lighter/60 text-primary font-semibold' 
                          : 'text-primary-dark hover:bg-accent-lighter/60'
                      }`}
                    >
                      {range.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Search Input Bar */}
          <div className="relative w-full md:max-w-md lg:max-w-none lg:w-[22vw]">
            <input 
              type="text" 
              placeholder="Search products..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white rounded-full border border-primary/15 pl-10 lg:pl-[2.4vw] pr-10 lg:pr-[2.4vw] py-2 lg:py-[0.5vw] text-xs sm:text-sm lg:text-[0.75vw] text-primary-dark focus:outline-none focus:border-primary font-secondary transition-colors"
            />
            <Icon icon="lucide:search" className="absolute left-3.5 lg:left-[0.8vw] top-1/2 -translate-y-1/2 w-4 h-4 lg:w-[1vw] lg:h-[1vw] text-primary/60" />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 lg:right-[0.8vw] top-1/2 -translate-y-1/2 w-4 h-4 lg:w-[1vw] lg:h-[1vw] text-primary/60 hover:text-primary cursor-pointer flex items-center justify-center"
              >
                <Icon icon="lucide:x" className="w-3.5 h-3.5 lg:w-[0.9vw] lg:h-[0.9vw]" />
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Chips */}
        {isFiltering && (
          <div className="flex flex-wrap items-center gap-2 lg:gap-[0.5vw] mb-10 lg:mb-[2.5vw] -mt-6 lg:-mt-[1.5vw] text-xs lg:text-[0.75vw] font-secondary text-body/80 select-none">
            <span className="font-semibold text-primary-dark flex items-center gap-1.5 lg:gap-[0.4vw]">
              <Icon icon="ph:funnel-light" className="w-3.5 h-3.5 lg:w-[0.9vw] lg:h-[0.9vw] text-primary" />
              <span>Active Filters:</span>
            </span>
            {selectedCategory && (
              <span className="flex items-center gap-1.5 lg:gap-[0.4vw] bg-primary-lighter/80 text-primary px-3.5 lg:px-[0.9vw] py-1.5 lg:py-[0.4vw] rounded-full border border-primary/15 transition-all hover:bg-primary-lighter">
                <span>Category: {selectedCategory}</span>
                <button 
                  onClick={() => handleCategorySelect(null)} 
                  className="hover:text-primary-dark cursor-pointer font-bold ml-1 lg:ml-[0.2vw] text-sm lg:text-[0.85vw] leading-none"
                >
                  &times;
                </button>
              </span>
            )}
            {selectedOrigin && (
              <span className="flex items-center gap-1.5 lg:gap-[0.4vw] bg-primary-lighter/80 text-primary px-3.5 lg:px-[0.9vw] py-1.5 lg:py-[0.4vw] rounded-full border border-primary/15 transition-all hover:bg-primary-lighter">
                <span>Origin: {selectedOrigin}</span>
                <button 
                  onClick={() => handleOriginSelect(null)} 
                  className="hover:text-primary-dark cursor-pointer font-bold ml-1 lg:ml-[0.2vw] text-sm lg:text-[0.85vw] leading-none"
                >
                  &times;
                </button>
              </span>
            )}
            {selectedPriceRange && (
              <span className="flex items-center gap-1.5 lg:gap-[0.4vw] bg-primary-lighter/80 text-primary px-3.5 lg:px-[0.9vw] py-1.5 lg:py-[0.4vw] rounded-full border border-primary/15 transition-all hover:bg-primary-lighter">
                <span>Price: {getPriceRangeLabel(selectedPriceRange)}</span>
                <button 
                  onClick={() => handlePriceSelect(null)} 
                  className="hover:text-primary-dark cursor-pointer font-bold ml-1 lg:ml-[0.2vw] text-sm lg:text-[0.85vw] leading-none"
                >
                  &times;
                </button>
              </span>
            )}

            {searchQuery.trim() && (
              <span className="flex items-center gap-1.5 lg:gap-[0.4vw] bg-primary-lighter/80 text-primary px-3.5 lg:px-[0.9vw] py-1.5 lg:py-[0.4vw] rounded-full border border-primary/15 transition-all hover:bg-primary-lighter">
                <span>Search: &quot;{searchQuery}&quot;</span>
                <button 
                  onClick={() => setSearchQuery('')} 
                  className="hover:text-primary-dark cursor-pointer font-bold ml-1 lg:ml-[0.2vw] text-sm lg:text-[0.85vw] leading-none"
                >
                  &times;
                </button>
              </span>
            )}
            <button 
              onClick={resetAllFilters} 
              className="text-primary hover:text-primary-dark hover:underline font-semibold cursor-pointer ml-2 lg:ml-[0.5vw] text-xs lg:text-[0.75vw] transition-colors"
            >
              Clear All
            </button>
          </div>
        )}

        {/* View Layout (Filtered Grid vs Unfiltered Sections) */}
        {!isFiltering ? (
          /* UNFILTERED VIEW (Grouped by category sections) */
          <>
            {visibleCategories.map((category) => (
              <div key={category.name} className="mb-12 sm:mb-16 lg:mb-[4vw] animate-in fade-in duration-300 w-full lg:max-w-none">
                
                {/* Category Header */}
                <div className="mb-6 sm:mb-8 lg:mb-[2vw] text-left">
                  <h3 className="font-heading text-2xl sm:text-3xl lg:text-[2vw] font-normal leading-tight lg:leading-[1.2] text-primary-dark mb-1 lg:mb-[0.3vw]">
                    {category.name}
                  </h3>
                  <span className="font-secondary text-xs sm:text-sm lg:text-[0.8vw] text-body/85">
                    {category.description}
                  </span>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-[2vw] w-full">
                  {category.products.slice(0, 3).map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* View All Category CTA */}
                <div className="flex justify-center mt-8 sm:mt-10 lg:mt-[2.5vw]">
                  <button 
                    onClick={() => handleCategorySelect(category.name)}
                    className="inline-flex items-center gap-2 lg:gap-[0.5vw] font-secondary text-xs sm:text-sm lg:text-[0.8vw] font-semibold text-primary hover:text-primary-dark transition-colors group cursor-pointer border-b border-transparent hover:border-current pb-0.5"
                  >
                    <span>View All {category.name}</span>
                    <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </button>
                </div>

              </div>
            ))}

            {/* Load More Button for Unfiltered View */}
            {hasMoreCategories && (
              <div className="flex justify-center mt-12 md:mt-16 lg:mt-[3.5vw]">
                <button 
                  onClick={() => setVisibleCategoriesCount(prev => prev + 3)}
                  className="px-9 lg:px-[2.2vw] py-3 lg:py-[0.8vw] rounded-full border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all duration-300 font-semibold text-[11px] lg:text-[0.7vw] uppercase tracking-[0.18em] cursor-pointer active:scale-[0.97] hover:scale-[1.02]"
                >
                  Load More Categories
                </button>
              </div>
            )}
          </>
        ) : (
          /* FILTERED VIEW (Unified Single Grid) */
          <div className="animate-in fade-in duration-300 w-full lg:max-w-none">
            {filteredProducts.length > 0 ? (
              <>
                {/* Results Info */}
                <div className="mb-8 lg:mb-[2vw] text-left flex justify-between items-center w-full lg:max-w-none">
                  <div>
                    <h3 className="font-heading text-2xl sm:text-3xl lg:text-[2vw] font-normal leading-tight lg:leading-[1.2] text-primary-dark mb-1 lg:mb-[0.3vw]">
                      Search Results
                    </h3>
                    <span className="font-secondary text-xs sm:text-sm lg:text-[0.8vw] text-body/85">
                      Found {filteredProducts.length} product{filteredProducts.length === 1 ? '' : 's'} matching your filters
                    </span>
                  </div>
                  <button 
                    onClick={resetAllFilters}
                    className="text-primary hover:text-primary-dark text-xs sm:text-sm lg:text-[0.8vw] font-semibold hover:underline cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-[2vw] w-full">
                  {filteredProducts.slice(0, visibleFilteredCount).map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* Load More Button for Filtered View */}
                {hasMoreFiltered && (
                  <div className="flex justify-center mt-12 md:mt-16 lg:mt-[3.5vw]">
                    <button 
                      onClick={() => setVisibleFilteredCount(prev => prev + 8)}
                      className="px-9 lg:px-[2.2vw] py-3 lg:py-[0.8vw] rounded-full border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all duration-300 font-semibold text-[11px] lg:text-[0.7vw] uppercase tracking-[0.18em] cursor-pointer active:scale-[0.97] hover:scale-[1.02]"
                    >
                      Load More Products
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* EMPTY STATE */
              <div className="flex flex-col items-center justify-center py-16 lg:py-[4vw] px-4 sm:px-8 lg:px-[5vw] bg-white rounded-3xl lg:rounded-[1.5vw] border border-primary/10 shadow-soft text-center w-full lg:max-w-none mx-auto my-8 lg:my-[2vw] animate-in fade-in duration-300">
                <div className="w-16 h-16 lg:w-[4vw] lg:h-[4vw] rounded-full bg-primary-lighter flex items-center justify-center mb-6 lg:mb-[1.5vw] text-primary">
                  <Icon icon="ph:magnifying-glass-light" className="w-8 h-8 lg:w-[2vw] lg:h-[2vw]" />
                </div>
                <h3 className="font-heading text-2xl lg:text-[1.8vw] font-normal text-primary-dark mb-2 lg:mb-[0.5vw]">
                  No Products Found
                </h3>
                <p className="font-secondary text-sm lg:text-[0.85vw] text-body/80 w-full lg:max-w-none mb-8 lg:mb-[2vw] leading-relaxed">
                  We couldn&apos;t find any products matching your active filters. Try adjusting your search query or reset the filters.
                </p>
                <button 
                  onClick={resetAllFilters}
                  className="px-8 lg:px-[2vw] py-3 lg:py-[0.8vw] rounded-full bg-primary text-white hover:bg-primary-dark transition-all duration-300 font-semibold text-[11px] lg:text-[0.7vw] uppercase tracking-[0.18em] cursor-pointer active:scale-[0.97]"
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </section>
  );
};

export default ProductDisplay;