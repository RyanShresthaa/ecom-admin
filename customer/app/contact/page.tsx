import { Suspense } from "react";
import Contact from "@/features/contact/Contact";

export default function ContactPage() {
  return (
    <div>
      <Suspense fallback={<div className="min-h-screen bg-[#FAF6F2]" />}>
        <Contact />
      </Suspense>
    </div>
  );
}
