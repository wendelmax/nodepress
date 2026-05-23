import PostEditor from "@/components/admin/PostEditor"
import { PostService } from "@/services/post.service"
import { TaxonomyService } from "@/services/taxonomy.service"
import { OptionService } from "@/services/option.service"
import { notFound } from "next/navigation"

export default async function EditPostPage({
  searchParams,
}: {
  searchParams: Promise<{ post?: string; action?: string }>
}) {
  const params = await searchParams
  const postId = parseInt(params.post || "0")

  if (!postId || params.action !== 'edit') {
    return notFound()
  }

  const post = await PostService.getById(postId)

  if (!post || (post.postType !== 'post' && post.postType !== 'page')) {
    return notFound()
  }

  // Fetch taxonomies (categories and tags)
  const categories = await TaxonomyService.getPostTerms(postId, 'category')
  const tags = await TaxonomyService.getPostTerms(postId, 'post_tag')

  const thumbnailIdMeta = post.meta?.find((m: any) => m.metaKey === '_thumbnail_id')?.metaValue
  const thumbnailUrlMeta = post.meta?.find((m: any) => m.metaKey === '_thumbnail_url')?.metaValue

  const metaData: Record<string, string> = {}
  if (post.meta) {
    post.meta.forEach((m: any) => {
      if (m.metaKey !== '_thumbnail_id' && m.metaKey !== '_thumbnail_url') {
        metaData[m.metaKey] = m.metaValue
      }
    })
  }

  const initialData = {
    title: post.postTitle,
    content: post.postContent,
    status: post.postStatus,
    categories: categories.map(c => c.id),
    tags: tags.map(t => t.id),
    thumbnailId: thumbnailIdMeta ? parseInt(thumbnailIdMeta) : null,
    thumbnailUrl: thumbnailUrlMeta || null,
    metaData,
    postDate: post.postDate
  }

  const options = await OptionService.getOptions(['acf_field_groups'])
  const fieldGroups = options.acf_field_groups ? JSON.parse(options.acf_field_groups) : []

  return <PostEditor postId={postId} initialData={initialData} postType={post.postType} fieldGroups={fieldGroups} />
}
