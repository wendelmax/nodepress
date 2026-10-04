import type { Metadata } from "next";
import { Fragment, type ReactNode } from "react"
import { OptionService } from "@/services/option.service"
import { ensureActivePluginsLoaded } from "@/services/plugin-factory"
import { HookService } from "@/services/hook.service"
import { ThemeService } from "@/services/theme.service"
import "./globals.css";

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
  const options = await OptionService.getOptions(['analytics_ga4_id', 'site_language'])
  const analyticsId = options['analytics_ga4_id']
  const themeHeadSlots = await ThemeService.renderActionSlot('theme_head', {
    locale: options['site_language'] || 'pt-BR',
    analyticsId,
  })
  const themeFooterSlots = await ThemeService.renderActionSlot('theme_footer', {
    locale: options['site_language'] || 'pt-BR',
    analyticsId,
  })
  let consentSlots: ReactNode[] = []
  if (process.env.DATABASE_URL) {
    try {
      await ensureActivePluginsLoaded()
      consentSlots = await HookService.doAction('public_body_end', {
        locale: options['site_language'] || 'pt-BR',
        analyticsId,
      })
    } catch {
      consentSlots = []
    }
  }

  return (
    <html lang="en">
      <head>
        {themeHeadSlots.map((slot, index) => <Fragment key={`theme-head-slot-${index}`}>{slot}</Fragment>)}
      </head>
      <body>
        {children}
        {themeFooterSlots.map((slot, index) => <Fragment key={`theme-footer-slot-${index}`}>{slot}</Fragment>)}
        {consentSlots.map((slot, index) => <Fragment key={`public-slot-${index}`}>{slot}</Fragment>)}
      </body>
    </html>
  );
}
