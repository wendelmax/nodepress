import prisma from '@/lib/prisma'
import path from 'path'
import crypto from 'crypto'
import { StorageDriverFactory } from '@/storage/StorageDriverFactory'

export class MediaService {
  /**
   * Get all media attachments (ordered newest first)
   */
  static async getAll(page: number = 1, limit: number = 30) {
    const skip = (page - 1) * limit
    const where = {
      postType: 'attachment',
      postStatus: 'inherit',
    }
    
    const media = await prisma.post.findMany({
      where,
      orderBy: { postDate: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        postTitle: true,
        postMimeType: true,
        postDate: true,
        guid: true,
        author: {
          select: { displayName: true, userLogin: true },
        },
      },
    })
    
    const total = await prisma.post.count({ where })
    
    return {
      media,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Upload a file through the active storage driver and persist an attachment record.
   *
   * The MediaService is completely decoupled from the storage backend:
   * it delegates the actual file I/O to whichever driver StorageDriverFactory returns.
   */
  static async upload(file: File, authorId: number) {
    // Generate a unique, sanitized filename to prevent collisions and path traversal
    const ext = path.extname(file.name)
    const basename = path.basename(file.name, ext).replace(/[^a-z0-9]/gi, '-').toLowerCase()
    const uniqueId = crypto.randomBytes(4).toString('hex')
    const finalName = `${basename}-${uniqueId}${ext}`

    // Convert Web API File → Node.js Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Delegate to the active driver (Local or S3/R2/MinIO)
    const driver = await StorageDriverFactory.get()
    const publicUrl = await driver.upload(buffer, finalName, file.type)

    // Persist the attachment record in the database
    const attachment = await prisma.post.create({
      data: {
        postTitle: file.name,
        postContent: '',
        postStatus: 'inherit',
        postName: finalName,
        postAuthor: authorId,
        postType: 'attachment',
        postMimeType: file.type,
        guid: publicUrl, // URL returned by the active driver
        postExcerpt: '',
        postPassword: '',
        toPing: '',
        pinged: '',
        postContentFiltered: '',
      },
    })

    return attachment
  }

  /**
   * Delete an attachment from both storage and the database.
   */
  static async delete(id: number) {
    // Fetch the guid (stored URL) before deleting so we can remove the file
    const record = await prisma.post.findUnique({
      where: { id },
      select: { guid: true },
    })

    // Delete from storage (silently skipped if record not found)
    if (record?.guid) {
      const driver = await StorageDriverFactory.get()
      await driver.delete(record.guid).catch((err) => {
        // Log but don't throw — the DB record should still be removed
        console.warn('[MediaService] Storage delete warning:', err?.message)
      })
    }

    // Remove from the database
    return prisma.post.delete({
      where: { id, postType: 'attachment' },
    })
  }
}
