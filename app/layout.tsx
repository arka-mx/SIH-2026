import type { Metadata } from "next";
import "./globals.css";
import { GlobalLanguageSwitcher } from "@/components/ui/GlobalLanguageSwitcher";
import { AutoTranslateProvider } from "@/components/i18n/AutoTranslateProvider";
import { EmergencyAlertsWidget } from "@/components/alerts/EmergencyAlertsWidget";

export const metadata: Metadata = {
  title: "Sanket | Disaster Response Command Center",
  description: "Static disaster response coordination prototype",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <GlobalLanguageSwitcher />
        <AutoTranslateProvider>{children}</AutoTranslateProvider>
        <EmergencyAlertsWidget />
      </body>
    </html>
  );
}
