import type { Metadata } from "next";
import "./globals.css";
import { GlobalLanguageSwitcher } from "@/components/ui/GlobalLanguageSwitcher";
import { AutoTranslateProvider } from "@/components/i18n/AutoTranslateProvider";
import { EmergencyAlertsWidget } from "@/components/alerts/EmergencyAlertsWidget";
import { TranslationProvider } from "@/components/ui/TranslationProvider";

export const metadata: Metadata = {
  title: "Sanket | Disaster Response Command Center",
  description: "Static disaster response coordination prototype",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <TranslationProvider />
        <GlobalLanguageSwitcher />
        <AutoTranslateProvider>{children}</AutoTranslateProvider>
        <EmergencyAlertsWidget />
      </body>
    </html>
  );
}
