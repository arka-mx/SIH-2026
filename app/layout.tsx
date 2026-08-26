import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Momentum | Disaster Response Command Center",
  description: "Static disaster response coordination prototype",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
