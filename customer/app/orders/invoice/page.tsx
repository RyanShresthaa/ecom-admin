'use client';

import React, { Suspense } from 'react';
import Invoice from "@/features/profile/Invoice";
import Login from "@/features/profile/Login";
import { useAuth } from "@/shared/context/AuthContext";

function InvoiceContent() {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <Invoice /> : <Login />;
}

export default function InvoicePage() {
  return (
    <main className="w-full">
      <Suspense fallback={<div className="min-h-screen bg-[#FAF6F2]" />}>
        <InvoiceContent />
      </Suspense>
    </main>
  );
}
