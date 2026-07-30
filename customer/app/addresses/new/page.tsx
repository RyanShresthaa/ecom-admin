'use client';

import React, { Suspense } from 'react';
import NewAddress from "@/features/profile/NewAddress";
import Login from "@/features/profile/Login";
import { useAuth } from "@/shared/context/AuthContext";

function NewAddressContent() {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <NewAddress /> : <Login />;
}

export default function NewAddressPage() {
  return (
    <main className="w-full">
      <Suspense fallback={<div className="min-h-screen bg-[#FAF6F2]" />}>
        <NewAddressContent />
      </Suspense>
    </main>
  );
}
