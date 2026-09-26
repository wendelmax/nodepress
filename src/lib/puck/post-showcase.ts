import type { ComponentConfig } from '@measured/puck'
import { PostShowcase } from '@/components/puck/PostShowcase'

export type PostShowcaseLayout = 'grid' | 'list' | 'carousel'

export type PostShowcaseItem = {
  id: number
  title: string
  slug: string
  excerpt: string
  date: string
  thumbnailUrl?: string
}

export type PostShowcaseQuery = {
  postType: string
  limit: number
  category?: string
}

export type PostShowcaseProps = PostShowcaseQuery & {
  layout: PostShowcaseLayout
  showExcerpt: boolean
  showDate: boolean
  items?: PostShowcaseItem[]
}

type ContentTypeOption = {
  id: string
  label: string
}

type ContentTypeResponse = {
  types?: ContentTypeOption[]
}

export function buildPostShowcaseUrl(query: PostShowcaseQuery): string {
  const params = new URLSearchParams({
    type: query.postType,
    limit: String(query.limit),
  })

  if (query.category?.trim()) {
    params.set('category', query.category.trim())
  }

  return `/api/posts/showcase?${params.toString()}`
}

async function fetchContentTypes(search?: string): Promise<Array<{ value: string; label: string }>> {
  const query = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''
  const response = await fetch(`/api/content-types${query}`)
  if (!response.ok) throw new Error(`Failed to load content types: ${response.status}`)

  const payload = await response.json() as ContentTypeResponse
  return (payload.types ?? []).map((type) => ({
    value: type.id,
    label: type.label,
  }))
}

export const postShowcaseComponent: ComponentConfig<PostShowcaseProps> = {
  fields: {
    postType: {
      type: 'external',
      label: 'Content type',
      fetchList: (data: { query: string; filters: Record<string, unknown> }) => fetchContentTypes(data.query),
      getItemSummary: (item: string) => item,
    },
    limit: {
      type: 'number',
      label: 'Items',
      min: 1,
      max: 12,
    },
    category: {
      type: 'text',
      label: 'Category slug',
    },
    layout: {
      type: 'select',
      label: 'Layout',
      options: [
        { label: 'Grid', value: 'grid' },
        { label: 'List', value: 'list' },
        { label: 'Carousel', value: 'carousel' },
      ],
    },
    showExcerpt: {
      type: 'radio',
      label: 'Show excerpt',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    showDate: {
      type: 'radio',
      label: 'Show date',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
  },
  defaultProps: {
    postType: 'post',
    limit: 6,
    category: '',
    layout: 'grid',
    showExcerpt: true,
    showDate: true,
  },
  render: PostShowcase,
}
