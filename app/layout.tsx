import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CreditRamp - Stripe-backed DeFi for SMBs",
  description: "Convert Stripe cashflows into stablecoins and access instant credit on Stellar/Blend Capital",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script src="https://js.stripe.com/clover/stripe.js" async></script>
        <script src="https://crypto-js.stripe.com/crypto-onramp-outer.js" async></script>
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
