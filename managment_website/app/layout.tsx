import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Menu Admin",
  description: "Management website for restaurants / categories / dishes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, Arial", margin: 0 }}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
