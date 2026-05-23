import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"

export class UserService {
  /**
   * Get all users for admin list
   */
  static async getAll() {
    return prisma.user.findMany({
      select: {
        id: true,
        userLogin: true,
        userEmail: true,
        displayName: true,
        userRegistered: true,
        meta: {
          where: { metaKey: 'capabilities' },
          select: { metaValue: true }
        },
        _count: {
          select: { posts: true }
        }
      },
      orderBy: {
        userRegistered: 'asc'
      }
    })
  }

  /**
   * Get specific user by ID
   */
  static async getById(id: number) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        userLogin: true,
        userEmail: true,
        displayName: true,
        userUrl: true,
        userNicename: true,
        meta: {
          where: { metaKey: 'capabilities' },
          select: { metaValue: true }
        }
      }
    })
  }

  /**
   * Update user details including optional password hash
   */
  static async update(id: number, data: { email?: string; displayName?: string; url?: string; newPassword?: string; role?: string }) {
    const updateData: any = {}

    if (data.email) updateData.userEmail = data.email
    if (data.displayName) {
      updateData.displayName = data.displayName
    }
    if (data.url !== undefined) updateData.userUrl = data.url

    if (data.newPassword) {
      const hash = await bcrypt.hash(data.newPassword, 10)
      updateData.userPass = hash
    }

    if (data.role) {
      const capability = await prisma.userMeta.findFirst({
        where: { userId: id, metaKey: 'capabilities' }
      })
      if (capability) {
        await prisma.userMeta.update({
          where: { umetaId: capability.umetaId },
          data: { metaValue: data.role }
        })
      } else {
        await prisma.userMeta.create({
          data: {
            userId: id,
            metaKey: 'capabilities',
            metaValue: data.role
          }
        })
      }
    }

    return prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        userLogin: true,
        userEmail: true,
        displayName: true,
        userUrl: true,
        meta: {
          where: { metaKey: 'capabilities' },
          select: { metaValue: true }
        }
      }
    })
  }
}
