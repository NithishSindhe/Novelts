import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "@/app/globals.css";
import { AuthBar } from "@/components/AuthBar";

export const metadata: Metadata = {
  title: "Novelts",
  description: "Novelts tracks words, characters, notes, and check-ins with local-first + cloud sync."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <AuthBar />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
