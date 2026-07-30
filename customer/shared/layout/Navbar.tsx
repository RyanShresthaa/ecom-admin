'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Icon } from '@iconify/react';
import { useCart } from '@/shared/context/CartContext';
import { useWishlist } from '@/shared/context/WishlistContext';
import { useAuth } from '@/shared/context/AuthContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);
  const pathname = usePathname();
  const { totalItems } = useCart();
  const { totalWishlistItems } = useWishlist();
  const { isLoggedIn } = useAuth();

  // The home route features the Hero section, where text should be black
  const isHome = pathname === '/';
  const isAbout = pathname === '/about';
  const isProductsPage = pathname === '/products';
  const isProductDetail = pathname.startsWith('/products/');
  const isContact = pathname === '/contact';
  const isBlog = pathname.startsWith('/blog') || pathname.startsWith('/blogs');
  const isWishlist = pathname === '/wishlist';
  const isCart = pathname === '/cart';
  const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/profile' || pathname.startsWith('/orders') || pathname.startsWith('/addresses') || pathname.startsWith('/payments') || pathname === '/settings' || pathname === '/checkout';

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Determine scrolled state (backdrop, border padding, etc.)
      setScrolled(currentScrollY > 20);

      // Hide/show logic: hide on scroll down, show on scroll up
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setVisible(false);
      } else {
        setVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Class helper for active state lines
  const isActive = (path: string) => pathname === path;

  return (
    <>
      <nav
        className={`w-full z-50 transition-all duration-500 ease-in-out ${isHome || isAbout || isProductsPage || isContact || isBlog || isWishlist || isAuthPage || isCart ? 'fixed' : 'sticky'
          } top-0 left-0 ${visible ? 'translate-y-0' : '-translate-y-full'
          } ${isAbout || isProductDetail || isContact || isBlog || isWishlist || isAuthPage || isCart
            ? (scrolled
              ? 'bg-[#FAF6F2]/90 backdrop-blur-md border-b border-primary/10 py-1'
              : 'bg-transparent py-1 border-b border-transparent')
            : scrolled
              ? (isHome || isProductsPage
                ? 'bg-[#FAF6F2] backdrop-blur-md border-b border-primary/10 py-1'
                : 'bg-primary/95 backdrop-blur-md py-1')
              : (isHome || isProductsPage
                ? 'bg-transparent py-1 border-b border-transparent'
                : 'bg-primary py-1 border-b border-transparent')
          } ${isAbout || isProductDetail || isContact || isBlog || isWishlist || isAuthPage || isCart
            ? 'text-[#2A170F]'
            : (isHome || isProductsPage) && !scrolled
              ? 'text-white'
              : (isHome || isProductsPage) && scrolled
                ? 'text-[#2A170F]'
                : 'text-white'
          }`}
      >
        <div className="container-custom flex items-center justify-between lg:grid lg:grid-cols-3">

          {/* Left Column — Logo (Desktop) / Hamburger (Mobile) */}
          <div className="flex items-center">
            {/* Mobile Hamburger */}
            <button
              onClick={() => setIsOpen(true)}
              className="lg:hidden p-2 -ml-2 focus:outline-none hover:opacity-80 transition-opacity"
              aria-label="Open menu"
            >
              <Icon icon="lucide:menu" className="w-6 h-6" />
            </button>

            {/* Desktop Logo */}
            <Link
              href="/"
              className="hidden lg:flex items-center transition-transform duration-300 hover:scale-[1.03]"
              aria-label="Matina Crafts Home"
            >
              <div className={`transition-all duration-300 ${(isHome || isProductsPage || (isContact && !scrolled)) && !scrolled ? 'brightness-0 invert' : ''
                }`}>
                <Image
                  src="/images/logo/Vector.png"
                  alt="Matina Crafts Logo"
                  width={130}
                  height={40}
                  className="h-8 md:h-18 w-auto object-contain"
                  priority
                />
              </div>
            </Link>

            {/* Mobile Logo (centered via parent flex) */}
            <Link
              href="/"
              className="lg:hidden flex items-center ml-3"
              aria-label="Matina Crafts Home"
            >
              <div className={`transition-all duration-300 ${(isHome || isProductsPage || (isContact && !scrolled)) && !scrolled ? 'brightness-0 invert' : ''
                }`}>
                <Image
                  src="/images/logo/Vector.png"
                  alt="Matina Crafts Logo"
                  width={100}
                  height={30}
                  className="h-7 w-auto object-contain"
                  priority
                />
              </div>
            </Link>
          </div>

          {/* Center Column — Navigation Links (Desktop only) */}
          <div className="hidden lg:flex items-center  justify-center gap-12 text-[12px] font-semibold uppercase tracking-[0.18em]">
            <Link
              href="/"
              className={`relative py-2 transition-colors duration-300 group ${isContact && !scrolled
                ? 'text-white hover:text-white/80'
                : (isAbout || isProductDetail || isContact || isBlog || isWishlist
                  ? 'hover:text-primary-dark'
                  : (isHome || isProductsPage)
                    ? (scrolled ? 'hover:text-primary' : 'hover:text-secondary')
                    : 'hover:text-secondary')
                }`}
            >
              <span>Home</span>
              <span className={`absolute bottom-0 left-0 w-full h-[1.5px] bg-current transition-transform duration-300 origin-center ${isActive('/') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                }`} />
            </Link>
            <Link
              href="/products"
              className={`relative py-2 transition-colors duration-300 group ${isContact && !scrolled
                ? 'text-white hover:text-white/80'
                : (isAbout || isProductDetail || isContact || isBlog || isWishlist
                  ? 'hover:text-primary-dark'
                  : (isHome || isProductsPage)
                    ? (scrolled ? 'hover:text-primary' : 'hover:text-secondary')
                    : 'hover:text-secondary')
                }`}
            >
              <span>Shop</span>
              <span className={`absolute bottom-0 left-0 w-full h-[1.5px] bg-current transition-transform duration-300 origin-center ${isActive('/products') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                }`} />
            </Link>
            <Link
              href="/about"
              className={`relative py-2 transition-colors duration-300 group ${isAbout || isProductDetail || isContact || isBlog || isWishlist
                ? 'hover:text-primary-dark'
                : (isHome || isProductsPage)
                  ? (scrolled ? 'hover:text-primary' : 'hover:text-secondary')
                  : 'hover:text-secondary'
                }`}
            >
              <span>About</span>
              <span className={`absolute bottom-0 left-0 w-full h-[1.5px] bg-current transition-transform duration-300 origin-center ${isActive('/about') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                }`} />
            </Link>
            <Link
              href="/blog"
              className={`relative py-2 transition-colors duration-300 group ${isAbout || isProductDetail || isContact || isBlog || isWishlist
                ? 'hover:text-primary-dark'
                : (isHome || isProductsPage)
                  ? (scrolled ? 'hover:text-primary' : 'hover:text-secondary')
                  : 'hover:text-secondary'
                }`}
            >
              <span>Blogs</span>
              <span className={`absolute bottom-0 left-0 w-full h-[1.5px] bg-current transition-transform duration-300 origin-center ${isBlog ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                }`} />
            </Link>
            <Link
              href="/contact"
              className={`relative py-2 transition-colors duration-300 group ${isAbout || isProductDetail || isContact || isBlog || isWishlist
                ? 'hover:text-primary-dark'
                : (isHome || isProductsPage)
                  ? (scrolled ? 'hover:text-primary' : 'hover:text-secondary')
                  : 'hover:text-secondary'
                }`}
            >
              <span>Contact</span>
              <span className={`absolute bottom-0 left-0 w-full h-[1.5px] bg-current transition-transform duration-300 origin-center ${isActive('/contact') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                }`} />
            </Link>
          </div>

          {/* Right Column — Icon Actions */}
          <div className="flex items-center justify-end gap-5">
            {/* Profile */}
            <Link
              href="/profile"
              className={`hidden lg:flex items-center justify-center transition-all duration-300 hover:scale-110 ${isAbout || isProductDetail || isContact || isBlog || isWishlist
                ? 'hover:text-primary-dark'
                : (isHome || isProductsPage)
                  ? (scrolled ? 'hover:text-primary' : 'hover:text-secondary')
                  : 'hover:text-secondary'
                }`}
              aria-label="Profile"
            >
              <Icon icon="lucide:user" className="w-[18px] h-[18px]" />
            </Link>

            {/* Wishlist / Heart */}
            <Link
              href="/wishlist"
              className={`relative hidden lg:flex items-center justify-center transition-all duration-300 hover:scale-110 ${isAbout || isProductDetail || isContact || isBlog || isWishlist
                ? 'hover:text-primary-dark'
                : (isHome || isProductsPage)
                  ? (scrolled ? 'hover:text-primary' : 'hover:text-secondary')
                  : 'hover:text-secondary'
                }`}
              aria-label="Wishlist"
            >
              <Icon icon="lucide:heart" className="w-[18px] h-[18px]" />
              {totalWishlistItems > 0 && (
                <span className="absolute -top-2 -right-2.5 w-4 h-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
                  {totalWishlistItems}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              className={`relative flex items-center justify-center transition-all duration-300 hover:scale-110 ${isAbout || isProductDetail || isContact || isBlog || isWishlist
                ? 'hover:text-primary-dark'
                : (isHome || isProductsPage)
                  ? (scrolled ? 'hover:text-primary' : 'hover:text-secondary')
                  : 'hover:text-secondary'
                }`}
              aria-label="Shopping bag"
            >
              <Icon icon="lucide:shopping-bag" className="w-[18px] h-[18px]" />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2.5 w-4 h-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
                  {totalItems}
                </span>
              )}
            </Link>
          </div>

        </div>
      </nav>

      {/* Mobile Drawer Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-500 lg:hidden ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Mobile Drawer Panel */}
      <div
        className={`fixed top-0 left-0 h-full w-[310px] bg-[#FAF6F2] text-[#2A170F] z-50 shadow-2xl transition-transform duration-500 ease-out transform lg:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full p-8">

          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-6 border-b border-primary/10">
            <Link
              href="/"
              className="flex items-center"
              onClick={() => setIsOpen(false)}
            >
              <Image
                src="/images/logo/Vector.png"
                alt="Matina Crafts Logo"
                width={110}
                height={34}
                className="h-7 w-auto object-contain"
              />
            </Link>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-primary/5 rounded-full transition-colors focus:outline-none"
              aria-label="Close menu"
            >
              <Icon icon="lucide:x" className="w-5 h-5 text-[#2A170F]" />
            </button>
          </div>

          {/* Drawer Nav Links */}
          <nav className="flex flex-col gap-6 py-10 text-xs font-semibold uppercase tracking-[0.2em]">
            <Link
              href="/"
              className={`hover:text-[#8C523A] transition-colors py-2 flex items-center justify-between ${isActive('/') ? 'text-[#8C523A] font-bold' : ''
                }`}
              onClick={() => setIsOpen(false)}
            >
              <span>Home</span>
              {isActive('/') && <span className="w-1.5 h-1.5 rounded-full bg-[#8C523A]" />}
            </Link>
            <Link
              href="/products"
              className={`hover:text-[#8C523A] transition-colors py-2 flex items-center justify-between ${isActive('/products') ? 'text-[#8C523A] font-bold' : ''
                }`}
              onClick={() => setIsOpen(false)}
            >
              <span>Shop</span>
              {isActive('/products') && <span className="w-1.5 h-1.5 rounded-full bg-[#8C523A]" />}
            </Link>
            <Link
              href="/our-story"
              className={`hover:text-[#8C523A] transition-colors py-2 flex items-center justify-between ${isActive('/our-story') ? 'text-[#8C523A] font-bold' : ''
                }`}
              onClick={() => setIsOpen(false)}
            >
              <span>Our Story</span>
              {isActive('/our-story') && <span className="w-1.5 h-1.5 rounded-full bg-[#8C523A]" />}
            </Link>
            <Link
              href="/collections"
              className={`hover:text-[#8C523A] transition-colors py-2 flex items-center justify-between ${isActive('/collections') ? 'text-[#8C523A] font-bold' : ''
                }`}
              onClick={() => setIsOpen(false)}
            >
              <span>Collections</span>
              {isActive('/collections') && <span className="w-1.5 h-1.5 rounded-full bg-[#8C523A]" />}
            </Link>
          </nav>

          {/* Drawer Bottom Actions */}
          <div className="mt-auto border-t border-primary/10 pt-8 flex flex-col gap-5 text-xs font-semibold uppercase tracking-[0.2em]">
            <Link
              href="/profile"
              className="flex items-center gap-3.5 hover:text-[#8C523A] transition-colors py-2.5"
              onClick={() => setIsOpen(false)}
            >
              <Icon icon="lucide:user" className="w-5 h-5 text-[#2A170F]" />
              <span>My Profile</span>
            </Link>
            <Link
              href="/wishlist"
              className="flex items-center gap-3.5 hover:text-[#8C523A] transition-colors py-2.5"
              onClick={() => setIsOpen(false)}
            >
              <Icon icon="lucide:heart" className="w-5 h-5 text-[#2A170F]" />
              <span>Wishlist ({totalWishlistItems})</span>
            </Link>
            <Link
              href="/cart"
              className="flex items-center gap-3.5 hover:text-[#8C523A] transition-colors py-2.5"
              onClick={() => setIsOpen(false)}
            >
              <Icon icon="lucide:shopping-bag" className="w-5 h-5 text-[#2A170F]" />
              <span>Cart ({totalItems})</span>
            </Link>
          </div>

        </div>
      </div>
    </>
  );
};

export default Navbar;