import { checkInstallation } from "@/lib/install"
import { PostService } from "@/services/post.service"
import { OptionService } from "@/services/option.service"
import { ThemeService } from "@/services/theme.service"
import { generatePermalink } from "@/lib/permalinks"
import type { Metadata } from "next"

// The home page depends on runtime-only configuration and database state.
// Static generation can capture the setup redirect before the container loads
// its persisted DATABASE_URL, leaving an installed site stuck in the wizard.
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const options = await OptionService.getOptions(['blogname', 'blogdescription', 'show_on_front', 'page_on_front'])
  const siteName = options['blogname'] || 'NodePress'
  const siteDesc = options['blogdescription'] || ''

  if (options['show_on_front'] === 'page' && options['page_on_front']) {
    const pageId = parseInt(options['page_on_front'])
    if (!isNaN(pageId)) {
      const page = await PostService.getById(pageId)
      if (page && page.postStatus === 'publish') {
        const seoTitle = page.meta?.find((m: any) => m.metaKey === '_seo_title')?.metaValue
        const seoDesc = page.meta?.find((m: any) => m.metaKey === '_seo_description')?.metaValue
        return {
          title: seoTitle || `${page.postTitle} - ${siteName}`,
          description: seoDesc || siteDesc,
          openGraph: {
            title: seoTitle || `${page.postTitle} - ${siteName}`,
            description: seoDesc || siteDesc,
            type: 'website'
          }
        }
      }
    }
  }

  return {
    title: `${siteName} - ${siteDesc}`,
    description: siteDesc,
    openGraph: {
      title: `${siteName} - ${siteDesc}`,
      description: siteDesc,
      type: 'website'
    }
  }
}

export default async function HomePage() {
  await checkInstallation()

  // Determine permalinks and homepage settings
  const options = await OptionService.getOptions(['permalink_structure', 'show_on_front', 'page_on_front'])
  const themeOptions = await ThemeService.getRenderOptions(options)
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
        return <Theme.SinglePage post={page} options={themeOptions} />
      }
    }
  }

  // Fallback to Latest Posts (Blog Feed)
  let posts = await PostService.getLatestPublished(10)
  
  posts = posts.map(post => ({
    ...post,
    permalink: generatePermalink(post, structure)
  }))

  return <Theme.Archive posts={posts} options={themeOptions} />
}

