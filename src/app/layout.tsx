import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import StyledComponentsRegistry from "@/lib/components/styled-components-registry";
import { ErrorBoundary, NotificationProvider } from "@/components";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Multi-Format Image Converter",
  description:
    "Convert images between JPEG, PNG, GIF, WebP, AVIF, SVG, and ICO formats - all client-side for privacy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <StyledComponentsRegistry>
          <ErrorBoundary>
            <NotificationProvider>{children}</NotificationProvider>
          </ErrorBoundary>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
