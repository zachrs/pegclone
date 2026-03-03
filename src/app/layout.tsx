import type { Metadata } from "next";
import { Raleway, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/providers/session-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
        className={`${raleway.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </SessionProvider>
        <Toaster />
      </body>
    </html>
  );
}
