import React from "react"
import { notFound, permanentRedirect, redirect } from "next/navigation"
import Link from "next/link"
import { PostService } from "@/services/post.service"
import { TaxonomyService } from "@/services/taxonomy.service"
import { OptionService } from "@/services/option.service"
import { CommentService } from "@/services/comment.service"
import { generatePermalink } from "@/lib/permalinks"
import { ThemeService } from "@/services/theme.service"
import type { Metadata } from "next"
import { getLandingPageService } from '@/plugins/landing-pages/factory'
import { getPublicAccess, isLandingPagesActive } from '@/lib/public-access'
import { MaintenanceScreen } from '@/components/public/MaintenanceScreen'
import LandingPageRenderer from '@/themes/default/components/LandingPageRenderer'
import { SeoService } from '@/plugins/seo-optimizer/service'

export const dynamic = 'force-dynamic'
// export const dynamic = 'force-static' // Not strictly needed if we don't have dynamic functions, and generateStaticParams will tell it to be static anyway.

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params
  const postName = slug[slug.length - 1]
  const landingPagesActive = isLandingPagesActive(await OptionService.getActivePluginIds())
  if (landingPagesActive) {
    const landingPage = await getLandingPageService().findPublicBySlug(postName)
    if (landingPage) {
      return SeoService.toNextMetadata(await SeoService.metadataForLandingPage(landingPage, `/${slug.join('/')}`))
    }
  }
  const post = await PostService.getBySlug(postName)

  if (!post) {
    return {}
  }

  return SeoService.toNextMetadata(await SeoService.metadataForPost(post, `/${slug.join('/')}`))
}

export default async function SinglePostPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params

  const access = await getPublicAccess(`/${slug.join('/')}`)
  if (!access.allowed) return <MaintenanceScreen />

  const accessedPath = '/' + slug.join('/')
  const customRedirect = await SeoService.getRedirect(accessedPath)
  if (customRedirect) {
    if (customRedirect.status === 301) permanentRedirect(customRedirect.path)
    redirect(customRedirect.path)
  }

  // Extract the actual postName which is always the last segment
  const postName = slug[slug.length - 1]

  if (isLandingPagesActive(await OptionService.getActivePluginIds())) {
    const landingPage = await getLandingPageService().findPublicBySlug(postName)
    if (landingPage) return <LandingPageRenderer record={landingPage} />
  }

  // Fetch the post
  const post = await PostService.getBySlug(postName)

  if (!post) {
    return notFound()
  }

  // Handle SEO Redirection if permalink structure doesn't match the URL accessed
  const options = await OptionService.getOptions(['permalink_structure', 'page_for_posts', 'acf_field_groups'])
  const structure = options['permalink_structure'] || '/%postname%/'
  
  const idealPermalink = generatePermalink(post, structure)
  if (accessedPath !== idealPermalink) {
    redirect(idealPermalink) // 301 Permanent Redirect
  }

  // Get Active Theme
  const Theme = await ThemeService.getActiveTheme()
  const themeOptions = await ThemeService.getRenderOptions(options)

  // If this page is set as the Posts page (Blog Feed)
  if (options['page_for_posts'] && post.id === parseInt(options['page_for_posts'])) {
    let posts = await PostService.getLatestPublished(10)
    posts = posts.map(p => ({
      ...p,
      permalink: generatePermalink(p, structure)
    }))

    return <Theme.Archive posts={posts} title={post.postTitle} options={themeOptions} />
  }

  const isPage = post.postType === 'page'

  // Fetch Categories and Tags for this post (only if it's a post)
  let categories: any[] = []
  let tags: any[] = []
  let initialComments: any[] = []
  
  if (!isPage) {
    categories = await TaxonomyService.getPostTerms(post.id, 'category')
    tags = await TaxonomyService.getPostTerms(post.id, 'post_tag')
    initialComments = await CommentService.getApprovedComments(post.id)
  }

  if (isPage) {
    return <Theme.SinglePage post={post} options={themeOptions} />
  }

  return (
    <Theme.SinglePost 
      post={post} 
      categories={categories} 
      tags={tags} 
      initialComments={initialComments} 
      options={themeOptions}
    />
  )
}
