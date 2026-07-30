'use client';

import React, { Suspense } from 'react';
import AccountSetting from "@/features/profile/AccountSetting";
import Login from "@/features/profile/Login";
import { useAuth } from "@/shared/context/AuthContext";

function SettingsContent() {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <AccountSetting /> : <Login />;
}

export default function SettingsPage() {
  return (
    <main className="w-full">
      <Suspense fallback={<div className="min-h-screen bg-[#FAF6F2]" />}>
        <SettingsContent />
      </Suspense>
    </main>
  );
}
