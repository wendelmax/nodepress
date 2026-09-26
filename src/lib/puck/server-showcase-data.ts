import {
  getPublishedPostShowcase,
  normalizePostShowcaseQuery,
} from '@/services/post-showcase.service'
import type { PostShowcaseItem } from './post-showcase'

type PuckContentNode = {
  type: string
  props: Record<string, any>
  [key: string]: unknown
}

export type PuckRenderData = {
  root: Record<string, unknown>
  content: PuckContentNode[]
  [key: string]: unknown
}

function isInvalidShowcaseConfiguration(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith('Invalid post type')
}

export async function resolvePostShowcaseData(data: PuckRenderData): Promise<PuckRenderData> {
  const cache = new Map<string, Promise<PostShowcaseItem[]>>()

  const content = await Promise.all(data.content.map(async (node) => {
    if (node.type !== 'PostShowcase') return node

    const props = node.props ?? {}

    try {
      const query = normalizePostShowcaseQuery({
        postType: props.postType,
        limit: props.limit,
        category: props.category,
      })
      const cacheKey = JSON.stringify(query)
      let itemsPromise = cache.get(cacheKey)

      if (!itemsPromise) {
        itemsPromise = getPublishedPostShowcase(query)
        cache.set(cacheKey, itemsPromise)
      }

      const items = await itemsPromise
      return {
        ...node,
        props: { ...props, items },
      }
    } catch (error) {
      if (!isInvalidShowcaseConfiguration(error)) throw error

      return {
        ...node,
        props: { ...props, items: [] },
      }
    }
  }))

  return {
    ...data,
    content,
  }
}
