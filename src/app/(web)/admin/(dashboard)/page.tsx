import prisma from "@/lib/prisma"
import { AnalyticsService } from "@/services/analytics.service"
import DashboardShell, { DashboardData } from "@/components/admin/DashboardShell"
import { StatCardId } from "@/components/admin/dashboard-settings"
import { Users, Eye, FileText, MessageSquare, Edit3, UserPlus, ClipboardList } from "lucide-react"
import { OptionService } from "@/services/option.service"
import { getAdminDictionary } from "@/i18n"

export default async function DashboardPage() {
  const options = await OptionService.getOptions(['site_language'])
  const dict = getAdminDictionary(options['site_language'] || 'pt-BR')

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
    })

    recentComments = await prisma.comment.findMany({
      orderBy: { commentDate: 'desc' },
      take: 5,
      include: { post: { select: { postTitle: true } } }
    })

    latestPost = recentPosts[0]
    latestComment = recentComments[0]
    latestUser = await prisma.user.findFirst({ orderBy: { userRegistered: 'desc' } })

  } catch (e) {
    console.error("Dashboard count error:", e)
  }

  // ── Analytics ──
  const analytics = await AnalyticsService.getAnalytics()
  const window7 = AnalyticsService.getDailyWindow(analytics, 7)

  const sparkVisitors = window7.map(d => d.visitors)
  const sparkViews = window7.map(d => d.views)

  // Per-day post and comment counts from DB
  let sparkPosts = window7.map(() => 0)
  let sparkComments = window7.map(() => 0)

  if (window7.length > 0) {
    const startDate = new Date(`${window7[0].date}T00:00:00.000Z`)
    const endDate = new Date(`${window7[window7.length - 1].date}T23:59:59.999Z`)

    const [postRows, commentRows] = await Promise.all([
      prisma.$queryRaw<Array<{ day: Date; count: number }>>`
        SELECT DATE(post_date) AS day, COUNT(*)::int AS count
        FROM np_posts
        WHERE post_type = 'post' AND post_date >= ${startDate} AND post_date <= ${endDate}
        GROUP BY DATE(post_date)
      `,
      prisma.$queryRaw<Array<{ day: Date; count: number }>>`
        SELECT DATE(comment_date) AS day, COUNT(*)::int AS count
        FROM np_comments
        WHERE comment_date >= ${startDate} AND comment_date <= ${endDate}
        GROUP BY DATE(comment_date)
      `
    ])

    const postMap = new Map(postRows.map(row => [new Date(row.day).toISOString().slice(0, 10), Number(row.count) || 0]))
    const commentMap = new Map(commentRows.map(row => [new Date(row.day).toISOString().slice(0, 10), Number(row.count) || 0]))

    sparkPosts = window7.map(({ date }) => postMap.get(date) ?? 0)
    sparkComments = window7.map(({ date }) => commentMap.get(date) ?? 0)
  }

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
    { id: 'visitors', label: dict.dashboard.visitors,    value: fmt(analytics.totalVisitors), trend: visitorsTrend.str,    up: visitorsTrend.up,    icon: <Users size={20} />, color: 'blue',   spark: sparkVisitors },
    { id: 'views',    label: dict.dashboard.views,       value: fmt(analytics.totalViews),    trend: viewsTrend.str,      up: viewsTrend.up,      icon: <Eye size={20} />, color: 'purple', spark: sparkViews },
    { id: 'posts',    label: dict.dashboard.posts,       value: String(postCount),            trend: postsTrend.str,       up: postsTrend.up,       icon: <FileText size={20} />, color: 'cyan',   spark: sparkPosts },
    { id: 'comments', label: dict.dashboard.comments,    value: String(commentCount),         trend: commentsTrend.str,    up: commentsTrend.up,    icon: <MessageSquare size={20} />, color: 'rose',   spark: sparkComments },
  ]

  // ── Activity feed (all real) ──
  const timeAgo = (date: Date | string) => {
    // eslint-disable-next-line react-hooks/purity
    const ms = Date.now() - new Date(date).getTime()
    const mins  = Math.floor(ms / 60_000)
    const hours = Math.floor(mins / 60)
    const days  = Math.floor(hours / 24)
    if (mins < 1)  return dict.dashboard.now
    if (mins < 60) return `${mins}${dict.dashboard.mins_ago}`
    if (hours < 24) return `${hours}${dict.dashboard.hours_ago}`
    return `${days}${dict.dashboard.days_ago}`
  }

  const activities: { icon: React.ReactNode; bg: string; title: string; desc: string; time: string }[] = []

  if (latestPost) activities.push({
    icon: <Edit3 size={16} />, bg: 'bg-primary/10 text-primary',
    title: dict.dashboard.new_post,
    desc: latestPost.postTitle || '(Sem título)',
    time: timeAgo(latestPost.postDate),
  })
  if (latestComment) activities.push({
    icon: <MessageSquare size={16} />, bg: 'bg-rose-500/10 text-rose-500',
    title: dict.dashboard.new_comment,
    desc: `${dict.dashboard.on} "${latestComment.post?.postTitle || 'Post desconhecido'}"`,
    time: timeAgo(latestComment.commentDate),
  })
  if (latestUser) activities.push({
    icon: <UserPlus size={16} />, bg: 'bg-cyan-500/10 text-cyan-500',
    title: dict.dashboard.new_user,
    desc: latestUser.displayName || latestUser.userLogin,
    time: timeAgo(latestUser.userRegistered),
  })

  if (draftCount > 0) activities.push({
    icon: <ClipboardList size={16} />, bg: 'bg-accent-purple/10 text-accent-purple',
    title: `${draftCount} ${draftCount > 1 ? dict.dashboard.drafts : dict.dashboard.draft} ${dict.dashboard.pending}`,
    desc: dict.dashboard.click_to_edit,
    time: '',
  })

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
