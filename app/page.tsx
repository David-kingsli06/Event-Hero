"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { VerraHero } from "@/components/verra/VerraHero";

function HeroContent() {
  const searchParams = useSearchParams();
  const isRecording = searchParams.get("rec") === "1";

  return <VerraHero isRecording={isRecording} />;
}

export default function Page() {
  return (
    <Suspense fallback={<div className="w-screen h-screen bg-black" />}>
      <HeroContent />
    </Suspense>
  );
}
