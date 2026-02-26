import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PDF AI Analyzer",
  description: "Analyze and chat with your PDF documents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased font-sans bg-gray-50 text-gray-900">
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
