import type { Metadata } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import ClientShell from "@/components/ClientShell";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const bebas = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bebas",
});

export const metadata: Metadata = {
  title: "Cinematic Trader",
  description: "Cinematic AI trading experience",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${bebas.variable}`}>
      <body className="min-h-screen bg-black font-body text-text-primary antialiased">
        <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-b from-black via-surface to-black text-white">
          <ClientShell>{children}</ClientShell>
        </div>
      </body>
    </html>
  );
}
