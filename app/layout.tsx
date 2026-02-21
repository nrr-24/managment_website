import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { GlobalUIProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "Menu Admin",
  description: "Management website for restaurants / categories / dishes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#f8f8fa" />
      </head>
      <body className="antialiased" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" }}>
        <AuthProvider>
          <GlobalUIProvider>
            {children}
          </GlobalUIProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
