import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GoogleAnalytics } from '@next/third-parties/google'
import { OptionService } from "@/services/option.service"
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const options = await OptionService.getOptions(['seo_site_title', 'seo_meta_description', 'seo_og_image', 'seo_twitter_handle'])
  
  return {
    title: options['seo_site_title'] || "NodePress CMS",
    description: options['seo_meta_description'] || "A powerful CMS built with Next.js",
    openGraph: {
      images: options['seo_og_image'] ? [options['seo_og_image']] : [],
    },
    twitter: {
      card: 'summary_large_image',
      creator: options['seo_twitter_handle'] || undefined,
    }
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const options = await OptionService.getOptions(['analytics_ga4_id'])
  const analyticsId = options['analytics_ga4_id']

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        {children}
        {analyticsId && <GoogleAnalytics gaId={analyticsId} />}
      </body>
    </html>
  );
}
