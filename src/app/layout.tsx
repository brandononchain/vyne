import type { Metadata } from "next";
import "./globals.css";

// Force all pages to render dynamically — skip static generation entirely.
// This prevents the /_global-error SSG crash (useContext null in React 19)
// and is the correct mode for a fully client-side SPA like Vyne.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vyne — Visual AI Agent Workflow Builder",
  description:
    "Build powerful AI agent teams visually. Drag, connect, and deploy multi-agent workflows without writing code.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
