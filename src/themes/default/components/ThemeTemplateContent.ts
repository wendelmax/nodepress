import { parseBuilderDocument } from '@/lib/puck/document'

export function getBuilderContentSlot(post: { postContent: unknown; postTitle: string }): unknown[] | null {
  const parsed = parseBuilderDocument(post.postContent)
  if (parsed.kind !== 'puck') return null
  return [
    { type: 'Heading', props: { title: post.postTitle, level: 'h1', align: 'center' } },
    ...parsed.document.content,
  ]
}
