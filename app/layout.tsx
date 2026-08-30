import type { Metadata } from "next";
import "./globals.css";
import { GlobalLanguageSwitcher } from "@/components/ui/GlobalLanguageSwitcher";

export const metadata: Metadata = {
  title: "Momentum | Disaster Response Command Center",
  description: "Static disaster response coordination prototype",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <GlobalLanguageSwitcher />
        {children}
      </body>
    </html>
  );
}
