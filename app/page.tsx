"use client";
import dynamic from "next/dynamic";

// Dynamic import for Phaser
const MathRaceGame = dynamic(() => {
  return import('./MathRaceGameComponent').then((mod) => mod.default);
}, {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <div className="text-white text-xl">Loading game...</div>
    </div>
  )
});

export default function Page() {
  return <MathRaceGame />;
}
