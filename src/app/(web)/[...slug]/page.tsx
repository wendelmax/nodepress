import React from "react"
import { notFound, redirect } from "next/navigation"
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

export const dynamic = 'force-dynamic'
// export const dynamic = 'force-static' // Not strictly needed if we don't have dynamic functions, and generateStaticParams will tell it to be static anyway.

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params
  const postName = slug[slug.length - 1]
  const landingPagesActive = isLandingPagesActive(await OptionService.getActivePluginIds())
  if (landingPagesActive) {
    const landingPage = await getLandingPageService().findPublicBySlug(postName)
    if (landingPage) {
      const seo = landingPage.data.seo as { title?: string; description?: string } | undefined
      return {
        title: seo?.title || landingPage.title,
        description: seo?.description || undefined,
      }
    }
  }
  const post = await PostService.getBySlug(postName)

  if (!post) {
    return {}
  }

  const seoTitle = post.meta?.find((m: any) => m.metaKey === '_seo_title')?.metaValue
  const seoDesc = post.meta?.find((m: any) => m.metaKey === '_seo_description')?.metaValue
  const thumbnailUrl = post.meta?.find((m: any) => m.metaKey === '_thumbnail_url')?.metaValue

  return {
    title: seoTitle || post.postTitle,
    description: seoDesc || undefined,
    openGraph: {
      title: seoTitle || post.postTitle,
      description: seoDesc || undefined,
      images: thumbnailUrl ? [thumbnailUrl] : [],
      type: post.postType === 'post' ? 'article' : 'website'
    }
  }
}

export default async function SinglePostPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params

  const access = await getPublicAccess(`/${slug.join('/')}`)
  if (!access.allowed) return <MaintenanceScreen />

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
  const accessedPath = '/' + slug.join('/')

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
