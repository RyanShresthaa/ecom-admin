'use client';

import React, { Suspense } from 'react';
import Orders from "@/features/profile/Orders";
import Login from "@/features/profile/Login";
import { useAuth } from "@/shared/context/AuthContext";

function OrdersContent() {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <Orders /> : <Login />;
}

export default function OrdersPage() {
  return (
    <main className="w-full">
      <Suspense fallback={<div className="min-h-screen bg-[#FAF6F2]" />}>
        <OrdersContent />
      </Suspense>
    </main>
  );
}
