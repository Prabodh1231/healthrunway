import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteNav } from "@/components/SiteNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HealthRunway: medical-shock early warning for families",
  description:
    "Find out whether a medical bill could push your family into financial crisis, and cut medicine costs with Jan Aushadhi generics.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteNav />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-6 text-xs leading-relaxed text-muted">
            HealthRunway gives financial planning support, not medical advice. Always confirm medicine changes with
            your doctor or pharmacist. Your data stays in this browser. Prices: Jan Aushadhi (PMBJP) MRP list and a
            public Indian medicine price dataset; check current prices at the store.
          </div>
        </footer>
      </body>
    </html>
  );
}
