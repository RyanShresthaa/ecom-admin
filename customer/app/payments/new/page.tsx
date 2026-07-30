'use client';

import React, { Suspense } from 'react';
import NewCard from "@/features/profile/NewCard";
import Login from "@/features/profile/Login";
import { useAuth } from "@/shared/context/AuthContext";

function NewCardContent() {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <NewCard /> : <Login />;
}

export default function NewCardPage() {
  return (
    <main className="w-full">
      <Suspense fallback={<div className="min-h-screen bg-[#FAF6F2]" />}>
        <NewCardContent />
      </Suspense>
    </main>
  );
}
