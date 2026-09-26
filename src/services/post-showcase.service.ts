import prisma from '@/lib/prisma'
import { contentTypeRegistry } from '@/modules/content'
import { ensureActivePluginsLoaded } from './plugin-factory'
import { TaxonomyService } from './taxonomy.service'

const CORE_POST_TYPES = new Set(['post', 'page'])
const MAX_SHOWCASE_LIMIT = 12

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

export function normalizePostShowcaseQuery(input: {
  postType?: unknown
  limit?: unknown
  category?: unknown
}): PostShowcaseQuery {
  const postType = typeof input.postType === 'string' ? input.postType.trim() : ''
  if (!postType) throw new Error('Invalid post type')

  const rawLimit = typeof input.limit === 'number' ? input.limit : Number(input.limit ?? 6)
  const safeLimit = Number.isFinite(rawLimit) ? rawLimit : 6
  const limit = Math.min(MAX_SHOWCASE_LIMIT, Math.max(1, Math.floor(safeLimit)))
  const category = typeof input.category === 'string' ? input.category.trim() : undefined

  return category ? { postType, limit, category } : { postType, limit }
}

export async function getPublishedPostShowcase(
  query: PostShowcaseQuery,
): Promise<PostShowcaseItem[]> {
  await ensureActivePluginsLoaded()

  const normalized = normalizePostShowcaseQuery(query)
  const activePostTypes = new Set([
    ...CORE_POST_TYPES,
    ...contentTypeRegistry.list().map((definition) => definition.id),
  ])
  if (!activePostTypes.has(normalized.postType)) {
    throw new Error(`Invalid post type: ${normalized.postType}`)
  }

  const where: {
    postStatus: string
    postType: string
    id?: { in: number[] }
  } = {
    postStatus: 'publish',
    postType: normalized.postType,
  }

  if (normalized.category) {
    const postIds = await TaxonomyService.getPostIdsByTermSlug(normalized.category, 'category')
    if (postIds.length === 0) return []
    where.id = { in: postIds }
  }

  const posts = await prisma.post.findMany({
    where,
    orderBy: { postDate: 'desc' },
    take: normalized.limit,
    select: {
      id: true,
      postTitle: true,
      postName: true,
      postExcerpt: true,
      postDate: true,
      meta: {
        where: { metaKey: '_thumbnail_url' },
        select: { metaValue: true },
      },
    },
  })

  return posts.map((post) => {
    const thumbnailUrl = post.meta[0]?.metaValue ?? undefined
    return {
      id: post.id,
      title: post.postTitle,
      slug: post.postName,
      excerpt: post.postExcerpt,
      date: post.postDate.toISOString(),
      ...(thumbnailUrl ? { thumbnailUrl } : {}),
    }
  })
}
