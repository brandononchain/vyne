"use client";

import dynamic from "next/dynamic";

// Load the entire app client-side only — no SSR/SSG prerendering.
// This prevents framer-motion's useContext from crashing during
// Next.js static generation of /_global-error.
const App = dynamic(() => import("@/components/app"), { ssr: false });

export default function Home() {
  return <App />;
}
