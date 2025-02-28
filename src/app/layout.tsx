import type { Metadata } from "next";
import { GoogleAnalytics } from '@next/third-parties/google';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'What Can See - Accessible Web Tool for Visual Impairment & Color Blindness',
  description:
    'What Can See is a tool that lets users upload images and preview how they appear to people with visual impairments and color blindness. Discover ways to create inclusive, accessible digital experiences for everyone.',
  keywords: [
    'accessibility',
    'visual impairment',
    'color blindness',
    'inclusive design',
    'accessible design',
    'image simulation',
    'What Can See'
  ],
  openGraph: {
    title: 'What Can See - Inclusive Design Tool',
    description:
      'Upload your images and see how they appear to users with visual impairments and color blindness. Ensure your designs are accessible for everyone.',
    url: 'https://www.whatcansee.com',
    siteName: 'What Can See',
    images: [
      {
        url: '/img/ogCard.jpg',
        width: 600,
        height: 600,
        alt: 'What Can See - Inclusive Design Tool'
      }
    ],
    locale: 'en_US',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'What Can See - Accessible Design Tool',
    description:
      'A tool to preview your images in the eyes of people with visual impairments and color blindness, helping you create inclusive digital experiences.',
    images: ['/img/ogCard.jpg']
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
      <GoogleAnalytics gaId="G-9ZR5KX0L1V" />
    </html>
  );
}
