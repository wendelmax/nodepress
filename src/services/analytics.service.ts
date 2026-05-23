import prisma from "@/lib/prisma"
import { OptionService } from "./option.service"

interface DailyStat {
  views: number
  visitors: number
}

export interface AnalyticsData {
  totalViews: number
  totalVisitors: number
  dailyStats: Record<string, DailyStat>
}

/**
 * AnalyticsService
 *
 * Stores real page-view and visitor data in the `site_analytics` option (JSON).
 *
 * Flow:
 *  1. Next.js Middleware intercepts every public page request.
 *  2. Middleware checks for the `np_sid` session cookie.
 *     - If absent → new visitor. Set cookie + call POST /api/analytics/track { isNewVisitor: true }
 *     - If present → returning visitor. Call POST /api/analytics/track { isNewVisitor: false }
 *  3. This service records the event, no randomisation.
 */
export class AnalyticsService {
  // ────────────────────────────────────────────────────────────
  // Public API
  // ────────────────────────────────────────────────────────────

  /** Retrieve stored analytics. Returns zeroed structure if nothing saved yet. */
  static async getAnalytics(): Promise<AnalyticsData> {
    try {
      const opts = await OptionService.getOptions(['site_analytics'])
      const raw = opts['site_analytics']
      if (raw) return JSON.parse(raw) as AnalyticsData
    } catch { /* DB not ready */ }
    return this.empty()
  }

  /**
   * Record a page view.
   * @param isNewVisitor - true when the visitor had no session cookie (set by middleware).
   */
  static async recordPageView({ isNewVisitor }: { isNewVisitor: boolean } = { isNewVisitor: false }): Promise<void> {
    if (!process.env.DATABASE_URL) return
    try {
      const data = await this.getAnalytics()
      const today = this.today()

      if (!data.dailyStats[today]) {
        data.dailyStats[today] = { views: 0, visitors: 0 }
      }

      data.totalViews += 1
      data.dailyStats[today].views += 1

      if (isNewVisitor) {
        data.totalVisitors += 1
        data.dailyStats[today].visitors += 1
      }

      this.prune(data, 30)
      await this.save(data)
    } catch (err) {
      console.error('[Analytics] recordPageView error:', err)
    }
  }

  /**
   * Returns the last `days` days as a continuous array (oldest → newest).
   * Days without recorded data are filled with zeros so charts are always smooth.
   */
  static getDailyWindow(data: AnalyticsData, days: number): { date: string; views: number; visitors: number }[] {
    const result = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = this.fmt(d)
      const stat = data.dailyStats[key] ?? { views: 0, visitors: 0 }
      result.push({ date: key, ...stat })
    }
    return result
  }

  // ────────────────────────────────────────────────────────────
  // Private helpers
  // ────────────────────────────────────────────────────────────

  private static empty(): AnalyticsData {
    return { totalViews: 0, totalVisitors: 0, dailyStats: {} }
  }

  private static today(): string {
    return this.fmt(new Date())
  }

  private static fmt(date: Date): string {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  private static prune(data: AnalyticsData, maxDays: number): void {
    const keys = Object.keys(data.dailyStats).sort()
    if (keys.length > maxDays) {
      keys.slice(0, keys.length - maxDays).forEach(k => delete data.dailyStats[k])
    }
  }

  private static async save(data: AnalyticsData): Promise<void> {
    await prisma.option.upsert({
      where: { optionName: 'site_analytics' },
      update: { optionValue: JSON.stringify(data) },
      create: { optionName: 'site_analytics', optionValue: JSON.stringify(data) },
    })
  }
}
