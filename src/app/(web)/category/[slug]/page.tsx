import { notFound } from "next/navigation"
import Link from "next/link"
import { TaxonomyService } from "@/services/taxonomy.service"
import { PostService } from "@/services/post.service"
import { OptionService } from "@/services/option.service"
import { ThemeService } from "@/services/theme.service"
import { generatePermalink } from "@/lib/permalinks"

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  // 1. Fetch term info
  const term = await TaxonomyService.getTermBySlug(slug, 'category')
  if (!term) return notFound()

  // 2. Fetch post IDs for this term
  const postIds = await TaxonomyService.getPostIdsByTermSlug(slug, 'category')

  // 3. Fetch full posts
  let posts = await PostService.getPostsByIds(postIds)

  // 4. Attach permalinks
  const options = await OptionService.getOptions(['permalink_structure'])
  const structure = options['permalink_structure'] || '/%postname%/'
  
  posts = posts.map(post => ({
    ...post,
    permalink: generatePermalink(post, structure)
  }))

  const Theme = await ThemeService.getActiveTheme()

  return <Theme.Archive posts={posts} title={`Category: ${term.name}`} options={options} />
}
