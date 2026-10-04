import type { ContentRecord } from '@/modules/content'
import BlockRenderer from './BlockRenderer'

export default async function LandingPageRenderer({ record }: { record: ContentRecord }) {
  const document = record.data.document

  return (
    <main data-landing-page={record.slug} className="min-h-screen bg-surface text-text">
      <BlockRenderer content={JSON.stringify(document)} context="landing" />
    </main>
  )
}
