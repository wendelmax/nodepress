import prisma from "@/lib/prisma"
import { AnalyticsService } from "@/services/analytics.service"
import DashboardShell, { DashboardData } from "@/components/admin/DashboardShell"
import { StatCardId } from "@/components/admin/dashboard-settings"

export default async function DashboardPage() {
  // ── Counters ──
  let postCount = 0, pageCount = 0, commentCount = 0, userCount = 0
  let draftCount = 0

  // ── Recent items ──
  let recentPosts: any[] = []
  let recentComments: any[] = []
  let latestPost: any = null
  let latestComment: any = null
  let latestUser: any = null

  try {
    ;[postCount, pageCount, commentCount, userCount, draftCount] = await Promise.all([
      prisma.post.count({ where: { postType: 'post', postStatus: 'publish' } }),
      prisma.post.count({ where: { postType: 'page', postStatus: { not: 'trash' } } }),
      prisma.comment.count({ where: { commentApproved: '1' } }),
      prisma.user.count(),
      prisma.post.count({ where: { postType: 'post', postStatus: 'draft' } }),
    ])

    recentPosts = await prisma.post.findMany({
      where: { postType: 'post', postStatus: { not: 'trash' } },
      orderBy: { postDate: 'desc' },
      take: 5,
      select: { id: true, postTitle: true, postStatus: true, postDate: true, author: { select: { displayName: true, userLogin: true } } },
    })

    recentComments = await prisma.comment.findMany({
      orderBy: { commentDate: 'desc' },
      take: 4,
      select: {
        commentId: true,
        commentAuthor: true,
        commentContent: true,
        commentDate: true,
        commentApproved: true,
        post: { select: { postTitle: true, postName: true } },
      },
    })

    latestPost = await prisma.post.findFirst({
      where: { postType: 'post', postStatus: 'publish' },
      orderBy: { postDate: 'desc' },
      select: { postTitle: true, postDate: true },
    })

    latestComment = await prisma.comment.findFirst({
      where: { commentApproved: '1' },
      orderBy: { commentDate: 'desc' },
      select: { commentAuthor: true, commentContent: true, commentDate: true },
    })

    latestUser = await prisma.user.findFirst({
      orderBy: { userRegistered: 'desc' },
      select: { displayName: true, userLogin: true, userRegistered: true },
    })
  } catch { /* DB not ready */ }

  // ── Analytics ──
  const analytics = await AnalyticsService.getAnalytics()
  const window7 = AnalyticsService.getDailyWindow(analytics, 7)

  const sparkVisitors = window7.map(d => d.visitors)
  const sparkViews = window7.map(d => d.views)

  // Per-day post and comment counts from DB
  const sparkPosts = await Promise.all(
    window7.map(async ({ date }) => {
      try {
        const start = new Date(date + 'T00:00:00.000Z')
        const end = new Date(date + 'T23:59:59.999Z')
        return prisma.post.count({ where: { postType: 'post', postDate: { gte: start, lte: end } } })
      } catch { return 0 }
    })
  )

  const sparkComments = await Promise.all(
    window7.map(async ({ date }) => {
      try {
        const start = new Date(date + 'T00:00:00.000Z')
        const end = new Date(date + 'T23:59:59.999Z')
        return prisma.comment.count({ where: { commentDate: { gte: start, lte: end } } })
      } catch { return 0 }
    })
  )

  // ── Trend calculations (today vs. yesterday from real analytics) ──
  const todayStats    = window7[6] ?? { views: 0, visitors: 0 }
  const yesterdayStats = window7[5] ?? { views: 0, visitors: 0 }

  const calcTrend = (today: number, yesterday: number) => {
    if (yesterday === 0) return { val: 0, str: today > 0 ? '+∞%' : '0%', up: today >= 0 }
    const val = ((today - yesterday) / yesterday) * 100
    return { val, str: `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`, up: val >= 0 }
  }

  const viewsTrend     = calcTrend(todayStats.views, yesterdayStats.views)
  const visitorsTrend  = calcTrend(todayStats.visitors, yesterdayStats.visitors)

  // Comments trend: today vs yesterday
  const commentsTrend = calcTrend(sparkComments[6] ?? 0, sparkComments[5] ?? 0)
  // Posts trend: today vs yesterday
  const postsTrend = calcTrend(sparkPosts[6] ?? 0, sparkPosts[5] ?? 0)

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)

  // ── Stat cards definition ──
  const stats: DashboardData['stats'] = [
    { id: 'visitors', label: 'Visitantes',    value: fmt(analytics.totalVisitors), trend: visitorsTrend.str,    up: visitorsTrend.up,    icon: '👥', color: 'blue',   spark: sparkVisitors },
    { id: 'views',    label: 'Visualizações', value: fmt(analytics.totalViews),    trend: viewsTrend.str,      up: viewsTrend.up,      icon: '👁️', color: 'purple', spark: sparkViews },
    { id: 'posts',    label: 'Posts',         value: String(postCount),            trend: postsTrend.str,       up: postsTrend.up,       icon: '📝', color: 'cyan',   spark: sparkPosts },
    { id: 'comments', label: 'Comentários',   value: String(commentCount),         trend: commentsTrend.str,    up: commentsTrend.up,    icon: '💬', color: 'rose',   spark: sparkComments },
  ]

  // ── Activity feed (all real) ──
  const timeAgo = (date: Date | string) => {
    const ms = Date.now() - new Date(date).getTime()
    const mins  = Math.floor(ms / 60_000)
    const hours = Math.floor(mins / 60)
    const days  = Math.floor(hours / 24)
    if (mins < 1)  return 'Agora mesmo'
    if (mins < 60) return `${mins}m atrás`
    if (hours < 24) return `${hours}h atrás`
    return `${days}d atrás`
  }

  const activities: { icon: string; bg: string; title: string; desc: string; time: string }[] = []

  if (latestPost) activities.push({
    icon: '✏️', bg: 'bg-primary/10 text-primary',
    title: 'Novo post publicado',
    desc: latestPost.postTitle || '(Sem título)',
    time: timeAgo(latestPost.postDate),
  })

  if (latestComment) activities.push({
    icon: '💬', bg: 'bg-success/10 text-success',
    title: 'Comentário aprovado',
    desc: `Por ${latestComment.commentAuthor}: "${latestComment.commentContent.slice(0, 40)}${latestComment.commentContent.length > 40 ? '...' : ''}"`,
    time: timeAgo(latestComment.commentDate),
  })

  if (latestUser) activities.push({
    icon: '👤', bg: 'bg-accent-cyan/10 text-accent-cyan',
    title: 'Novo usuário registrado',
    desc: latestUser.displayName || latestUser.userLogin,
    time: timeAgo(latestUser.userRegistered),
  })

  if (draftCount > 0) activities.push({
    icon: '📋', bg: 'bg-accent-purple/10 text-accent-purple',
    title: `${draftCount} rascunho${draftCount > 1 ? 's' : ''} pendente${draftCount > 1 ? 's' : ''}`,
    desc: 'Clique para continuar editando',
    time: '',
  })

  // ── Quick summary numbers for chart footer ──
  const totalViews7d    = window7.reduce((s, d) => s + d.views, 0)
  const totalVisitors7d = window7.reduce((s, d) => s + d.visitors, 0)

  const dashboardData: DashboardData = {
    stats,
    window7,
    analytics,
    viewsTrend,
    visitorsTrend,
    totalViews7d,
    totalVisitors7d,
    recentPosts,
    recentComments,
    activities,
    postCount,
    pageCount,
    commentCount,
    userCount,
    draftCount,
  }

  return <DashboardShell data={dashboardData} />
}
