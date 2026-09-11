import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "StreamNet Web Player",
  description:
    "Self-hosted StreamNet media player shell with ARVIO-inspired UX",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
