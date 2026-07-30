'use client';

import React, { Suspense } from 'react';
import Signup from "@/features/profile/Signup";
import ProfileHero from "@/features/profile/ProfileHero";
import { useAuth } from "@/shared/context/AuthContext";

function SignupContent() {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <ProfileHero /> : <Signup />;
}

export default function SignupPage() {
  return (
    <main className="w-full">
      <Suspense fallback={<div className="min-h-screen bg-[#FAF6F2]" />}>
        <SignupContent />
      </Suspense>
    </main>
  );
}
