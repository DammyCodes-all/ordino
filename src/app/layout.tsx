import type { Metadata } from "next";
import { Comfortaa, Geist, Geist_Mono } from "next/font/google";
import {
  ThemeProvider,
  themeInitScript,
} from "@/components/theme/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const comfortaa = Comfortaa({
  variable: "--font-comfortaa",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Ordino",
  description:
    "Chat-first document generation — plan, write, review, and export professional PDFs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${comfortaa.variable} h-full antialiased`}
    >
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: FOUC prevention for theme
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body className="flex min-h-full flex-col text-foreground">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
