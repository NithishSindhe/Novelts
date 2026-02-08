import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "@/app/globals.css";
import { AuthBar } from "@/components/AuthBar";

export const metadata: Metadata = {
  title: "Novelts",
  description: "Novelts tracks words, characters, notes, and check-ins with local-first + cloud sync.",
  themeColor: "#0f1425"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-[#0f1425]">
      <body className="min-h-dvh bg-[#0f1425]">
        <ClerkProvider>
          <AuthBar />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
