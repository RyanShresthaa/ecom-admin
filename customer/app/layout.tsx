import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LenisProvider from "@/shared/providers/LenisProvider";
import Navbar from "@/shared/layout/Navbar";
import Footer from "@/shared/layout/Footer";
import { CartProvider } from "@/shared/context/CartContext";
import { WishlistProvider } from "@/shared/context/WishlistContext";
import { ShopLocaleProvider } from "@/shared/context/ShopLocaleContext";
import { AuthProvider } from "@/shared/context/AuthContext";

export const metadata: Metadata = {
  title: "Matina Crafts - Authentic Nepalese Handicrafts",
  description: "Handcrafted artisan products from Nepal by Matina Crafts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className=" h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <ShopLocaleProvider>
          <AuthProvider>
            <WishlistProvider>
              <CartProvider>
                <LenisProvider>
                  <Navbar />
                  {children}
                  <Footer />
                </LenisProvider>
              </CartProvider>
            </WishlistProvider>
          </AuthProvider>
        </ShopLocaleProvider>
      </body>
    </html>
  );
}
