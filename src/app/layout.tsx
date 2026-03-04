import type { Metadata } from "next";
import localFont from "next/font/local";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/providers/session-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const raleway = localFont({
  src: "../../node_modules/@fontsource-variable/raleway/files/raleway-latin-wght-normal.woff2",
  variable: "--font-raleway",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Patient Education Genius",
  description:
    "Send patient education materials via SMS, email, or QR code — no app download required.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${raleway.variable} ${GeistMono.variable} antialiased`}
      >
        <SessionProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </SessionProvider>
        <Toaster />
      </body>
    </html>
  );
}
