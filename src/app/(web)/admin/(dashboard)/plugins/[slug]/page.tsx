import { Fragment, type ReactNode } from 'react'
import { ensureActivePluginsLoaded } from '@/services/plugin-factory'
import { HookService } from '@/services/hook.service'

export const dynamic = 'force-dynamic'

type PluginPageProps = {
  params: Promise<{ slug: string }>
}

function hasContent(value: ReactNode): value is Exclude<ReactNode, null | undefined | boolean> {
  return value !== null && value !== undefined && value !== false
}

function PluginPageFallback({ slug }: { slug: string }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-8 text-center" data-plugin-page-fallback={slug}>
      <h1 className="text-2xl font-semibold text-text">Plugin page not found</h1>
      <p className="mt-2 text-sm text-text-muted">
        No plugin has registered an admin page for <code>{slug}</code>.
      </p>
    </section>
  )
}

export default async function PluginPage({ params }: PluginPageProps) {
  const { slug } = await params

  await ensureActivePluginsLoaded()
  const contents = (await HookService.doAction(`admin_plugin_page_${slug}`)).filter(hasContent)

  if (contents.length === 0) {
    return <PluginPageFallback slug={slug} />
  }

  return (
    <>
      {contents.map((content, index) => (
        <Fragment key={`plugin-page-${slug}-${index}`}>{content}</Fragment>
      ))}
    </>
  )
}
