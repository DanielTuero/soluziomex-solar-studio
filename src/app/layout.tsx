import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Solar Studio · Soluziomex",
  description: "Project development, sourcing, economics and aligned revenue sharing for solar assets.",
  icons: {
    icon: [
      { url: "/solar-studio.ico", type: "image/x-icon" },
      { url: "/solar-studio-icon.png", type: "image/png", sizes: "1024x1024" },
    ],
    shortcut: "/solar-studio.ico",
    apple: "/solar-studio-icon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('solar-studio-theme');if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
