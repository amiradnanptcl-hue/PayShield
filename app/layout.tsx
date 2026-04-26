import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://payshield.io"),
  title: {
    default: "PayShield — predict who pays late, before you invoice",
    template: "%s · PayShield",
  },
  description:
    "Xero shows you who paid late. PayShield tells you who will. A risk score, plain-English reasoning, and a recommended action for every UK & Northern Ireland B2B invoice.",
  applicationName: "PayShield",
  authors: [{ name: "PayShield" }],
  keywords: [
    "late payment",
    "UK SME",
    "Northern Ireland SME",
    "Belfast",
    "invoice risk",
    "credit risk",
    "Companies House",
    "B2B payments",
  ],
  openGraph: {
    title: "PayShield — predict who pays late, before you invoice",
    description:
      "Type a UK or Northern Ireland company name. Get a risk score, the reasoning, and a recommended action in under eight seconds.",
    type: "website",
    locale: "en_GB",
    siteName: "PayShield",
  },
  twitter: {
    card: "summary_large_image",
    title: "PayShield",
    description:
      "Predict which customers will pay late, before you send the invoice.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-GB"
      className={`${fraunces.variable} ${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="relative min-h-full flex flex-col text-ink bg-wash">
        <div className="relative z-10 flex min-h-dvh flex-col">{children}</div>
      </body>
    </html>
  );
}
