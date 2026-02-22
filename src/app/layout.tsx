import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gemini PDF Analyzer",
  description: "Analyze and chat with your PDFs using Gemini AI",
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
