import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/providers/auth-provider";
import Script from "next/script";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Serene - Simplified Document Reading",
  description: "Upload your documents and get an enhanced reading experience with customizable options.",
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
        
        <Script id="fix-jquery-warnings" strategy="afterInteractive">
          {`
            if (window.jQuery) {
              const originalReady = jQuery.fn.ready;
              jQuery.fn.ready = function() {
                try {
                  return originalReady.apply(this, arguments);
                } catch(e) {
                  console.warn("Prevented jQuery error:", e);
                  return this;
                }
              };
            }
          `}
        </Script>
      </body>
    </html>
  );
}
