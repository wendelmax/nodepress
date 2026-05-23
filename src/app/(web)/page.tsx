import { checkInstallation } from "@/lib/install"
import { PostService } from "@/services/post.service"
import { OptionService } from "@/services/option.service"
import { ThemeService } from "@/services/theme.service"
import { generatePermalink } from "@/lib/permalinks"

export default async function HomePage() {
  await checkInstallation()

  // Determine permalinks and homepage settings
  const options = await OptionService.getOptions(['permalink_structure', 'show_on_front', 'page_on_front'])
  const structure = options['permalink_structure'] || '/%postname%/'
  const showOnFront = options['show_on_front'] || 'posts'
  const pageOnFront = options['page_on_front']

  // Get the Active Theme
  const Theme = await ThemeService.getActiveTheme()

  // If a static page is set as homepage
  if (showOnFront === 'page' && pageOnFront) {
    const pageId = parseInt(pageOnFront)
    if (!isNaN(pageId)) {
      const page = await PostService.getById(pageId)
      if (page && page.postStatus === 'publish') {
        return <Theme.SinglePage post={page} options={options} />
      }
    }
  }

  // Fallback to Latest Posts (Blog Feed)
  let posts = await PostService.getLatestPublished(10)
  
  posts = posts.map(post => ({
    ...post,
    permalink: generatePermalink(post, structure)
  }))

  return <Theme.Archive posts={posts} options={options} />
}

