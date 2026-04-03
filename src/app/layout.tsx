import type { Metadata } from "next";
import "./globals.css";

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
