'use client';

import React, { Suspense } from 'react';
import EditCard from "@/features/profile/EditCard";
import Login from "@/features/profile/Login";
import { useAuth } from "@/shared/context/AuthContext";

function EditCardContent() {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <EditCard /> : <Login />;
}

export default function EditCardPage() {
  return (
    <main className="w-full">
      <Suspense fallback={<div className="min-h-screen bg-[#FAF6F2]" />}>
        <EditCardContent />
      </Suspense>
    </main>
  );
}
