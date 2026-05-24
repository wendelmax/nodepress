"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { FileText, File, MessageSquare, Users, Search, BarChart, Sparkles, PenTool, SlidersHorizontal } from 'lucide-react'
import { Card } from "@/components/admin/Card"
import QuickDraft from "@/components/admin/QuickDraft"
import {
  DashboardSettings,
  StatCardId,
  WidgetId,
  loadSettings,
} from "@/components/admin/dashboard-settings"

const DashboardCustomizer = dynamic(() => import("@/components/admin/DashboardCustomizer"), { ssr: false })

// ── Sparkline SVG ─────────────────────────────────────────────────────────────
function Sparkline({ color, values }: { color: string; values: number[] }) {
  const w = 120, h = 40, pad = 2
  const max = Math.max(...values, 1)
  const min = Math.min(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => {
    const x = pad + (i / Math.max(values.length - 1, 1)) * (w - pad * 2)
    const y = h - pad - ((v - min) / range) * (h - pad * 2)
    return `${x},${y}`
  })
  const pathD = `M ${pts.join(' L ')}`
  const areaD = `M ${pts[0]} L ${pts.join(' L ')} L ${w - pad},${h} L ${pad},${h} Z`
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" className="mt-1 opacity-90 block">
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#sg-${color.replace('#', '')})`} />
      <path d={pathD} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Area Chart SVG ─────────────────────────────────────────────────────────────
function AreaChart({ window: win }: { window: { date: string; views: number; visitors: number }[] }) {
  const w = 560, h = 140, padX = 32, padY = 16
  const views = win.map(d => d.views)
  const maxV = Math.max(...views, 1)
  const color = '#4F7CFF'
  const pts = views.map((v, i) => {
    const x = padX + (i / Math.max(views.length - 1, 1)) * (w - padX * 2)
    const y = padY + (1 - v / maxV) * (h - padY * 2)
    return [x, y] as [number, number]
  })
  const pathD = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x},${y}`).join(' ')
  const areaD = `${pathD} L ${pts[pts.length - 1][0]},${h - padY} L ${pts[0][0]},${h - padY} Z`
  const labels = win.map(d => { const [, mm, dd] = d.date.split('-'); return `${dd}/${mm}` })
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h + 24}`} className="w-full h-auto mt-2 block">
      <defs>
        <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map(pct => {
        const y = padY + (1 - pct) * (h - padY * 2)
        return <line key={pct} x1={padX} y1={y} x2={w - padX} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
      })}
      <path d={areaD} fill="url(#area-grad)" />
      <path d={pathD} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill={color} stroke="rgba(13,19,34,1)" strokeWidth="1.5" />
      ))}
      {labels.map((label, i) => {
        const x = padX + (i / Math.max(labels.length - 1, 1)) * (w - padX * 2)
        return <text key={i} x={x} y={h + 16} textAnchor="middle" fontSize="9" fill="rgba(167,176,192,0.6)" fontFamily="Inter, sans-serif" fontWeight="500">{label}</text>
      })}
    </svg>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────
export interface DashboardData {
  stats: {
    id: StatCardId
    label: string
    value: string
    trend: string
    up: boolean
    icon: React.ReactNode
    color: string
    spark: number[]
  }[]
  window7: { date: string; views: number; visitors: number }[]
  analytics: { totalViews: number; totalVisitors: number }
  viewsTrend: { val: number; str: string; up: boolean }
  visitorsTrend: { val: number; str: string; up: boolean }
  totalViews7d: number
  totalVisitors7d: number
  recentPosts: any[]
  recentComments: any[]
  activities: { icon: React.ReactNode; bg: string; title: string; desc: string; time: string }[]
  postCount: number
  pageCount: number
  commentCount: number
  userCount: number
  draftCount: number
}

const colorMap: Record<string, string> = {
  blue: '#4F7CFF', purple: '#8B5CF6', cyan: '#22D3EE', rose: '#EC4899',
}
const topBarCls: Record<string, string> = {
  blue: 'bg-gradient-to-r from-primary to-primary-light',
  purple: 'bg-gradient-to-r from-accent-purple to-purple-400',
  cyan: 'bg-gradient-to-r from-accent-cyan to-cyan-300',
  rose: 'bg-gradient-to-r from-accent-pink to-pink-400',
}
const iconCls: Record<string, string> = {
  blue: 'bg-primary/10 text-primary',
  purple: 'bg-accent-purple/10 text-accent-purple',
  cyan: 'bg-accent-cyan/10 text-accent-cyan',
  rose: 'bg-accent-pink/10 text-accent-pink',
}

// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardShell({ data }: { data: DashboardData }) {
  const [settings, setSettings] = useState<DashboardSettings | null>(null)
  const [customizerOpen, setCustomizerOpen] = useState(false)

  // Load from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    Promise.resolve().then(() => setSettings(loadSettings()))
  }, [])

  // While loading, show skeleton
  if (!settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const has = (id: WidgetId) => settings.widgets.includes(id)
  const hasCard = (id: StatCardId) => settings.statCards.includes(id)

  const visibleStats = data.stats.filter(s => hasCard(s.id as StatCardId))
  const gap = settings.compact ? 'gap-3' : 'gap-5'
  const mb  = settings.compact ? 'mb-4' : 'mb-6'

  // Grid cols: 3 = sidebar (lg:grid-cols-3), 2 = wide left (lg:grid-cols-2)
  const gridCls = settings.gridCols === 3 ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1 lg:grid-cols-2'
  const leftSpan = settings.gridCols === 3 ? 'lg:col-span-2' : 'lg:col-span-1'

  const { recentPosts, recentComments, activities, window7, analytics, viewsTrend, visitorsTrend, totalViews7d, totalVisitors7d } = data
  const { postCount, pageCount, commentCount, userCount } = data

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)

  return (
    <>
      {/* ── Page Header ── */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${mb}`}>
        <div>
          <h1 className="text-2xl font-bold text-text leading-tight">Dashboard</h1>
          <p className="text-text-muted text-sm mt-1">Bem-vindo(a) de volta! Resumo real do seu site.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCustomizerOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-border text-text-secondary hover:text-white hover:bg-white/10 hover:border-primary/30 rounded-xl text-xs font-semibold transition-all duration-200"
            title="Personalizar Dashboard"
          >
            <SlidersHorizontal size={16} /> Personalizar
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      {visibleStats.length > 0 && (
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${visibleStats.length >= 4 ? 'lg:grid-cols-4' : `lg:grid-cols-${visibleStats.length}`} gap-4 ${mb}`}>
          {visibleStats.map(stat => (
            <Card key={stat.id} className="p-5 flex flex-col gap-4 relative overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-0.5 ${topBarCls[stat.color]}`} />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{stat.label}</span>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${iconCls[stat.color]}`}>{stat.icon}</div>
              </div>
              <div className="text-3xl font-extrabold text-white tracking-tight leading-none">{stat.value}</div>
              <Sparkline color={colorMap[stat.color]} values={stat.spark} />
              <div className="flex items-center justify-between text-xs mt-1 text-text-muted">
                <span className={`font-bold ${stat.up ? 'text-success' : 'text-danger'}`}>{stat.up ? '↑' : '↓'} {stat.trend}</span>
                <span>hoje vs. ontem</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Main Grid ── */}
      <div className={`grid ${gridCls} ${gap}`}>
        {/* Left column */}
        <div className={`${leftSpan} flex flex-col ${gap}`}>

          {/* Traffic Chart */}
          {has('traffic_chart') && (
            <Card className="p-5 md:p-6 flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <div className="text-sm font-semibold text-text">Tráfego dos últimos 7 dias</div>
                  <div className="text-xs text-text-muted mt-0.5">Visualizações por dia — dados reais</div>
                </div>
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-success/10 border border-success/20 text-success">● Ao vivo</span>
              </div>
              <AreaChart window={window7} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-5 border-t border-border">
                {[
                  { label: 'Visitantes (7d)',    value: fmt(totalVisitors7d), trend: `${visitorsTrend.up ? '↑' : '↓'} ${Math.abs(visitorsTrend.val).toFixed(1)}%`, up: visitorsTrend.up },
                  { label: 'Visualizações (7d)', value: fmt(totalViews7d),    trend: `${viewsTrend.up ? '↑' : '↓'} ${Math.abs(viewsTrend.val).toFixed(1)}%`, up: viewsTrend.up },
                  { label: 'Total visitantes',   value: fmt(analytics.totalVisitors), trend: 'acumulado', up: true },
                  { label: 'Total views',        value: fmt(analytics.totalViews),    trend: 'acumulado', up: true },
                ].map(item => (
                  <div key={item.label}>
                    <div className="text-[10px] uppercase font-bold tracking-widest text-text-muted mb-1">{item.label}</div>
                    <div className="text-lg font-bold text-text">{item.value}</div>
                    <div className={`text-xs font-semibold mt-0.5 ${item.up ? 'text-success' : 'text-danger'}`}>{item.trend}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Recent Posts */}
          {has('recent_posts') && (
            <Card className="p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="text-sm font-semibold text-text">Posts recentes</div>
                <Link href="/admin/posts" className="text-xs font-semibold text-primary hover:text-primary-light transition-colors no-underline">Ver todos →</Link>
              </div>
              {recentPosts.length === 0 ? (
                <p className="text-text-muted text-xs py-2">
                  Nenhum post ainda.{' '}
                  <Link href="/admin/posts/new" className="text-primary hover:text-primary-light transition-colors">Crie o primeiro!</Link>
                </p>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left text-sm min-w-[400px]">
                    <tbody>
                      {recentPosts.map(post => (
                        <tr key={post.id} className="border-b border-border/40 last:border-none hover:bg-white/[0.01] transition-colors">
                          <td className="py-3 pr-4">
                            <Link href={`/admin/posts/${post.id}/edit`} className="text-text font-medium hover:text-primary transition-colors no-underline block leading-snug">
                              {post.postTitle || '(sem título)'}
                            </Link>
                            <span className="text-text-muted text-xs mt-0.5 block">
                              {new Date(post.postDate).toLocaleDateString('pt-BR')} · {post.author?.displayName || post.author?.userLogin || '—'}
                            </span>
                          </td>
                          <td className="py-3 text-right whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                              post.postStatus === 'publish' ? 'bg-success/10 text-success' :
                              post.postStatus === 'draft'   ? 'bg-primary/10 text-primary'  :
                              'bg-danger/10 text-danger'
                            }`}>
                              {post.postStatus === 'publish' ? 'Publicado' : post.postStatus === 'draft' ? 'Rascunho' : post.postStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* Recent Comments */}
          {has('recent_comments') && recentComments.length > 0 && (
            <Card className="p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="text-sm font-semibold text-text">Comentários recentes</div>
                <Link href="/admin/comments" className="text-xs font-semibold text-primary hover:text-primary-light transition-colors no-underline">Ver todos →</Link>
              </div>
              <div className="flex flex-col gap-3">
                {recentComments.map((c: any) => (
                  <div key={c.commentId} className="flex items-start gap-3 border-b border-border/30 last:border-none pb-3 last:pb-0">
                    <div className="w-8 h-8 rounded-full bg-accent-purple/20 flex items-center justify-center text-xs font-bold text-accent-purple flex-shrink-0">
                      {c.commentAuthor.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-text">{c.commentAuthor}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${c.commentApproved === '1' ? 'bg-success/10 text-success' : c.commentApproved === 'spam' ? 'bg-danger/10 text-danger' : 'bg-yellow-500/10 text-yellow-400'}`}>
                          {c.commentApproved === '1' ? '✓' : c.commentApproved === 'spam' ? '⚠' : '○'}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-muted mt-0.5 line-clamp-1">{c.commentContent}</p>
                      {c.post && <span className="text-[10px] text-text-muted">Em: <span className="text-primary-light">{c.post.postTitle}</span></span>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className={`flex flex-col ${gap}`}>

          {/* Site at a Glance */}
          {has('glance') && (
            <Card className="p-5 flex flex-col gap-3">
              <div className="text-sm font-semibold text-text border-b border-border pb-4 mb-1">Visão do Site</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { href: '/admin/posts',    icon: <FileText size={18} />, label: `${postCount} Post${postCount !== 1 ? 's' : ''}`,   sub: 'publicados',  color: 'text-primary' },
                  { href: '/admin/pages',    icon: <File size={18} />, label: `${pageCount} Pág${pageCount !== 1 ? 's' : ''}`,    sub: 'ativas',      color: 'text-accent-cyan' },
                  { href: '/admin/comments', icon: <MessageSquare size={18} />, label: `${commentCount} Com.`,                              sub: 'aprovados',   color: 'text-success' },
                  { href: '/admin/users',    icon: <Users size={18} />, label: `${userCount} User${userCount !== 1 ? 's' : ''}`,   sub: 'cadastrados', color: 'text-accent-purple' },
                ].map(item => (
                  <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-white/[0.03] border border-border hover:bg-white/[0.06] hover:border-primary/20 transition-all duration-200 no-underline text-center">
                    <span className="text-xl">{item.icon}</span>
                    <span className={`text-sm font-bold ${item.color}`}>{item.label}</span>
                    <span className="text-[10px] text-text-muted">{item.sub}</span>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {/* Activity Feed */}
          {has('activity') && (
            <Card className="p-5 flex flex-col gap-4">
              <div className="text-sm font-semibold text-text border-b border-border pb-4">Atividades recentes</div>
              {activities.length === 0 ? (
                <p className="text-xs text-text-muted py-2">Nenhuma atividade ainda.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {activities.map((act, i) => (
                    <div key={i} className="flex items-start gap-3 py-3 border-b border-border/40 last:border-none">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mt-0.5 ${act.bg}`}>{act.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-text">{act.title}</div>
                        <div className="text-xs text-text-muted mt-0.5 leading-snug line-clamp-2">{act.desc}</div>
                      </div>
                      {act.time && <div className="text-[10px] text-text-muted font-medium ml-auto flex-shrink-0 mt-0.5">{act.time}</div>}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Quick Draft */}
          {has('quick_draft') && (
            <Card className="p-5 flex flex-col gap-3">
              <div className="text-sm font-semibold text-text border-b border-border pb-4 mb-1">Rascunho rápido</div>
              <QuickDraft />
            </Card>
          )}

          {/* AI Assistant */}
          {has('ai_assistant') && (
            <Card className="p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-border pb-4 mb-1">
                <div className="text-sm font-semibold text-text">AI Assistant</div>
                <span className="flex items-center bg-primary-gradient text-white text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider">
                  <Sparkles size={10} className="mr-1" /> BETA
                </span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">Como posso te ajudar hoje?</p>
              <div className="flex flex-col gap-1.5 my-1">
                {[
                  { icon: <Sparkles size={16} />, label: 'Gerar ideias de posts' },
                  { icon: <Search size={16} />, label: 'Melhorar conteúdo SEO' },
                  { icon: <BarChart size={16} />, label: 'Analisar performance' },
                  { icon: <PenTool size={16} />, label: 'Configurar AI' },
                ].map(s => (
                  <Link key={s.label} href="/admin/settings/ai" className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white/5 border border-border hover:bg-white/10 hover:border-primary/30 text-xs font-semibold text-text-secondary hover:text-white transition-all duration-200 no-underline leading-none">
                    <span>{s.icon}</span>
                    <span>{s.label}</span>
                  </Link>
                ))}
              </div>
            </Card>
          )}

        </div>
      </div>

      {/* Customizer panel */}
      <DashboardCustomizer
        isOpen={customizerOpen}
        onClose={() => setCustomizerOpen(false)}
        settings={settings}
        onChange={setSettings}
      />
    </>
  )
}
