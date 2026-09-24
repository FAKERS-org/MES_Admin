import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";

export const metadata: Metadata = {
  title: {
    default: "MES Admin",
    template: "%s · MES Admin",
  },
  description:
    "Back-office for the MES University Info API: manage universities and their study programs.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfd" },
    { media: "(prefers-color-scheme: dark)", color: "#16171c" },
  ],
};

/** Applies the stored theme before first paint to avoid a flash of the wrong theme. */
const themeScript = `(function(){try{var t=localStorage.getItem("mes-theme");var dark=t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(dark){document.documentElement.classList.add("dark")}}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
