import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getLandingPageService } from '@/plugins/landing-pages/factory'
import { getPublicAccess } from '@/lib/public-access'
import LandingPageRenderer from '@/themes/default/components/LandingPageRenderer'
import { MaintenanceScreen } from '@/components/public/MaintenanceScreen'

export const dynamic = 'force-dynamic'

interface PreviewPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}

async function resolvePreview({ params, searchParams }: PreviewPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  if (!query.token) return undefined
  return getLandingPageService().findPreviewById(id, query.token)
}

export async function generateMetadata(props: PreviewPageProps): Promise<Metadata> {
  const page = await resolvePreview(props)
  if (!page) return {}
  const seo = page.data.seo as { title?: string; description?: string } | undefined
  return { title: seo?.title || page.title, description: seo?.description }
}

export default async function LandingPagePreview(props: PreviewPageProps) {
  const page = await resolvePreview(props)
  if (!page) notFound()

  const access = await getPublicAccess('/preview/landing-pages', true)
  if (!access.allowed) return <MaintenanceScreen />
  return <LandingPageRenderer record={page} />
}
