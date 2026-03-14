import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Get Speak - Connect with the World",
  description: "Get Speak is a revolutionary chat application that connects you with people from all around the world with real-time chat, AI assistant, and random matching.",
  keywords: ["Get Speak", "Chat", "Real-time", "AI Assistant", "Global Community", "Messaging"],
  authors: [{ name: "Ganesh Baradkar" }],
  icons: {
    icon: "C:\Users\barad\OneDrive\Desktop\Gemini_Generated_Image_hjz907hjz907hjz9.png",
  },
  openGraph: {
    title: "Get Speak - Connect with the World",
    description: "Real-time chat with AI assistant and global community",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
