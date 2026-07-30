'use client';

import React, { Suspense } from 'react';
import Address from "@/features/profile/Address";
import Login from "@/features/profile/Login";
import { useAuth } from "@/shared/context/AuthContext";

function AddressesContent() {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <Address /> : <Login />;
}

export default function AddressesPage() {
  return (
    <main className="w-full">
      <Suspense fallback={<div className="min-h-screen bg-[#FAF6F2]" />}>
        <AddressesContent />
      </Suspense>
    </main>
  );
}
