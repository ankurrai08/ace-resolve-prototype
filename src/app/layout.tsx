import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ACE Resolve (ACER) — Servicing Intelligence for Agentic Commerce",
  description:
    "When an AI agent buys on a Card Member's behalf, ACER decides whether the agent honored their intent.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
