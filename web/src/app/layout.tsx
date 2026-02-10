import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Leashline",
  description: "Dog escape detection & tracking",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="h-screen overflow-hidden">{children}</body>
    </html>
  );
}
