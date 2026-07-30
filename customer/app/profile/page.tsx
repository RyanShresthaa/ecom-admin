'use client';

import React, { Suspense } from 'react';
import ProfileHero from "@/features/profile/ProfileHero";
import Login from "@/features/profile/Login";
import { useAuth } from "@/shared/context/AuthContext";

function ProfileContent() {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <ProfileHero /> : <Login />;
}

export default function ProfilePage() {
  return (
    <main className="w-full">
      <Suspense fallback={<div className="min-h-screen bg-[#FAF6F2]" />}>
        <ProfileContent />
      </Suspense>
    </main>
  );
}