import type { Metadata } from "next";
import "./globals.css";
import { GlobalLanguageSwitcher } from "@/components/ui/GlobalLanguageSwitcher";
import { TranslationProvider } from "@/components/ui/TranslationProvider";

export const metadata: Metadata = {
  title: "Momentum | Disaster Response Command Center",
  description: "Static disaster response coordination prototype",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <TranslationProvider />
        <GlobalLanguageSwitcher />
        {children}
      </body>
    </html>
  );
}
