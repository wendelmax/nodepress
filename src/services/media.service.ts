import prisma from '@/lib/prisma'
import { writeFile } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

export class MediaService {
  /**
   * Get all media attachments
   */
  static async getAll() {
    return prisma.post.findMany({
      where: {
        postType: 'attachment',
        postStatus: 'inherit',
      },
      orderBy: {
        postDate: 'desc'
      },
      select: {
        id: true,
        postTitle: true,
        postMimeType: true,
        postDate: true,
        guid: true,
        author: {
          select: { displayName: true, userLogin: true }
        }
      }
    })
  }

  /**
   * Upload a file and create an attachment record
   */
  static async upload(file: File, authorId: number) {
    // Generate a unique filename to prevent collisions
    const ext = path.extname(file.name)
    const basename = path.basename(file.name, ext).replace(/[^a-z0-9]/gi, '-').toLowerCase()
    const uniqueId = crypto.randomBytes(4).toString('hex')
    const finalName = `${basename}-${uniqueId}${ext}`

    // Ensure it's in public/uploads
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    const filePath = path.join(uploadDir, finalName)
    const fileUrl = `/uploads/${finalName}`

    // Convert File to Buffer and write to disk
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    await writeFile(filePath, buffer)

    // Save attachment in database
    const attachment = await prisma.post.create({
      data: {
        postTitle: file.name, // original name
        postContent: '',
        postStatus: 'inherit', // WP uses inherit for attachments usually
        postName: finalName,
        postAuthor: authorId,
        postType: 'attachment',
        postMimeType: file.type,
        guid: fileUrl, // using guid to store the public URL
        postExcerpt: '',
        postPassword: '',
        toPing: '',
        pinged: '',
        postContentFiltered: '',
      }
    })

    return attachment
  }

  /**
   * Delete an attachment
   */
  static async delete(id: number) {
    // Ideally we should also delete the physical file here.
    // We'll leave the physical file for now to prevent accidental breaks,
    // but we will delete the DB record.
    return prisma.post.delete({
      where: { id, postType: 'attachment' }
    })
  }
}
