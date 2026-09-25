'use client'

import { useEffect, useState } from 'react'
import {
  buildPostShowcaseUrl,
  type PostShowcaseItem,
  type PostShowcaseProps,
} from '@/lib/puck/post-showcase'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isPostShowcaseItem(value: unknown): value is PostShowcaseItem {
  return isRecord(value)
    && typeof value.id === 'number'
    && typeof value.title === 'string'
    && typeof value.slug === 'string'
    && typeof value.excerpt === 'string'
    && typeof value.date === 'string'
    && (value.thumbnailUrl === undefined || typeof value.thumbnailUrl === 'string')
}

function formatDate(date: string): string {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(parsed)
}

function itemHref(slug: string): string {
  return slug.startsWith('/') ? slug : `/${slug}`
}

function ShowcaseCard({ item, showExcerpt, showDate }: Pick<PostShowcaseProps, 'showExcerpt' | 'showDate'> & { item: PostShowcaseItem }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface">
      {item.thumbnailUrl ? (
        <img src={item.thumbnailUrl} alt="" className="h-44 w-full object-cover" />
      ) : null}
      <div className="space-y-2 p-4">
        {showDate ? <time className="text-xs text-text-secondary" dateTime={item.date}>{formatDate(item.date)}</time> : null}
        <h3 className="text-lg font-semibold text-white">
          <a href={itemHref(item.slug)} className="hover:text-primary">{item.title}</a>
        </h3>
        {showExcerpt && item.excerpt ? <p className="text-sm leading-relaxed text-text-secondary">{item.excerpt}</p> : null}
      </div>
    </article>
  )
}

function ShowcaseState({ children }: { children: string }) {
  return <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-text-secondary">{children}</div>
}

export function PostShowcase({
  postType,
  limit,
  category,
  layout,
  showExcerpt,
  showDate,
  items: providedItems,
}: PostShowcaseProps) {
  const [items, setItems] = useState<PostShowcaseItem[]>(providedItems ?? [])
  const [loading, setLoading] = useState(providedItems === undefined)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (providedItems !== undefined) {
      setItems(providedItems.filter(isPostShowcaseItem))
      setLoading(false)
      setHasError(false)
      return
    }

    const controller = new AbortController()
    let active = true

    setLoading(true)
    setHasError(false)

    fetch(buildPostShowcaseUrl({ postType, limit, category }), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Failed to load showcase: ${response.status}`)
        return response.json() as Promise<unknown>
      })
      .then((payload) => {
        if (!active) return
        const nextItems = Array.isArray(payload) ? payload.filter(isPostShowcaseItem) : []
        setItems(nextItems)
        setLoading(false)
      })
      .catch((error: unknown) => {
        if (!active || (isRecord(error) && error.name === 'AbortError')) return
        setItems([])
        setLoading(false)
        setHasError(true)
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [category, limit, postType, providedItems])

  if (loading) return <ShowcaseState>Carregando conteúdo...</ShowcaseState>
  if (hasError) return <ShowcaseState>Não foi possível carregar este conteúdo.</ShowcaseState>
  if (items.length === 0) return <ShowcaseState>Nenhum conteúdo encontrado.</ShowcaseState>

  const className = layout === 'list'
    ? 'space-y-4'
    : layout === 'carousel'
      ? 'flex gap-4 overflow-x-auto pb-2'
      : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'

  return (
    <div className={className} data-layout={layout}>
      {items.map((item) => (
        <div key={item.id} className={layout === 'carousel' ? 'min-w-[280px] max-w-sm flex-1' : undefined}>
          <ShowcaseCard item={item} showExcerpt={showExcerpt} showDate={showDate} />
        </div>
      ))}
    </div>
  )
}
