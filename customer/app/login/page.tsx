'use client';

import React, { Suspense } from 'react';
import Login from "@/features/profile/Login";
import ProfileHero from "@/features/profile/ProfileHero";
import { useAuth } from "@/shared/context/AuthContext";

function LoginContent() {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <ProfileHero /> : <Login />;
}

export default function LoginPage() {
  return (
    <main className="w-full">
      <Suspense fallback={<div className="min-h-screen bg-[#FAF6F2]" />}>
        <LoginContent />
      </Suspense>
    </main>
  );
}