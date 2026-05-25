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

  /** Retrieve stored analytics from the database. */
  static async getAnalytics(): Promise<AnalyticsData> {
    const data: AnalyticsData = { totalViews: 0, totalVisitors: 0, dailyStats: {} }
    if (!process.env.DATABASE_URL) return data

    try {
      // Get all events from the last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const events = await prisma.analyticsEvent.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true, isNewVisitor: true }
      })

      // Aggregate
      events.forEach(event => {
        const dateKey = this.fmt(event.createdAt)
        if (!data.dailyStats[dateKey]) {
          data.dailyStats[dateKey] = { views: 0, visitors: 0 }
        }
        
        data.totalViews += 1
        data.dailyStats[dateKey].views += 1

        if (event.isNewVisitor) {
          data.totalVisitors += 1
          data.dailyStats[dateKey].visitors += 1
        }
      })
    } catch (err) {
      console.error('[Analytics] getAnalytics error:', err)
    }

    return data
  }

  /**
   * Record a page view.
   * @param params - Contains isNewVisitor, path and sessionId.
   */
  static async recordPageView({ isNewVisitor, path, sessionId }: { isNewVisitor: boolean, path: string, sessionId: string }): Promise<void> {
    if (!process.env.DATABASE_URL) return
    try {
      await prisma.analyticsEvent.create({
        data: {
          sessionId,
          path,
          isNewVisitor
        }
      })
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

}
