import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/react";
import React from 'react';
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: '--font-outfit' });

export const metadata: Metadata = {
  title: "Popku",
  description: "An interactive learning application that uses AI to generate live, hands-on simulations for any concept a user wants to understand.",
  metadataBase: new URL('https://popku.com'),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <script async src="https://www.googletagmanager.com/gtag/js?id=G-7Y6YH2EXW9"></script>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'G-7Y6YH2EXW9');
              `,
            }}
          />
        </head>
        <body className={outfit.className}>
          {children}
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}