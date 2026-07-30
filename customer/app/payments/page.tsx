'use client';

import React, { Suspense } from 'react';
import Payment from "@/features/profile/Payment";
import Login from "@/features/profile/Login";
import { useAuth } from "@/shared/context/AuthContext";

function PaymentsContent() {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <Payment /> : <Login />;
}

export default function PaymentsPage() {
  return (
    <main className="w-full">
      <Suspense fallback={<div className="min-h-screen bg-[#FAF6F2]" />}>
        <PaymentsContent />
      </Suspense>
    </main>
  );
}
