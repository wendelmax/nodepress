import prisma from "@/lib/prisma"

export class PostService {
  /**
   * Fetch the latest published posts for the public feed.
   */
  static async getLatestPublished(limit: number = 10, postType: string = 'post') {
    return prisma.post.findMany({
      where: { postType, postStatus: 'publish' },
      orderBy: { postDate: 'desc' },
      take: limit,
      include: {
        author: {
          select: { displayName: true, userLogin: true }
        },
        meta: {
          where: { metaKey: '_thumbnail_url' }
        }
      }
    })
  }

  /**
   * Publish scheduled posts whose postDate has arrived.
   */
  static async publishScheduledPosts() {
    const now = new Date()
    
    // Find posts to publish
    const postsToPublish = await prisma.post.findMany({
      where: {
        postStatus: 'future',
        postDate: { lte: now }
      },
      select: { id: true }
    })

    if (postsToPublish.length === 0) return 0

    // Update their status
    const result = await prisma.post.updateMany({
      where: {
        id: { in: postsToPublish.map(p => p.id) }
      },
      data: {
        postStatus: 'publish',
        postModified: now,
        postModifiedGmt: now
      }
    })

    return result.count
  }

  /**
   * Fetch published posts by an array of IDs.
   */
  static async getPostsByIds(ids: number[], limit: number = 10) {
    if (!ids || ids.length === 0) return []
    
    return prisma.post.findMany({
      where: { 
        id: { in: ids },
        postStatus: 'publish',
        postType: 'post'
      },
      orderBy: { postDate: 'desc' },
      take: limit,
      include: {
        author: {
          select: { displayName: true, userLogin: true }
        },
        meta: {
          where: { metaKey: '_thumbnail_url' }
        }
      }
    })
  }

  /**
   * Fetch a single published post or page by its slug.
   */
  static async getBySlug(slug: string, postType?: string) {
    const whereClause: any = {
      postName: slug,
      postStatus: 'publish'
    }
    
    if (postType) {
      whereClause.postType = postType
    } else {
      whereClause.postType = { in: ['post', 'page'] }
    }

    return prisma.post.findFirst({
      where: whereClause,
      include: {
        author: {
          select: { displayName: true, userLogin: true }
        },
        meta: {
          where: { metaKey: { in: ['_thumbnail_url', '_thumbnail_id'] } }
        }
      }
    })
  }

  /**
   * Fetch a post by ID (for admin editing).
   */
  static async getById(id: number) {
    return prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, displayName: true, userLogin: true }
        },
        meta: true
      }
    })
  }

  /**
   * Create a new post.
   */
  static async create(data: { title: string; content: string; status: string; authorId: number; type?: string; thumbnailId?: number; thumbnailUrl?: string; metaData?: Record<string, string>; postDate?: Date; parentId?: number | null }) {
    const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')

    return prisma.post.create({
      data: {
        postTitle: data.title,
        postContent: data.content,
        postStatus: data.status || 'publish',
        postName: slug,
        postAuthor: data.authorId,
        postType: data.type || 'post',
        postParent: data.parentId ?? undefined,
        postDate: data.postDate || new Date(),
        postDateGmt: data.postDate || new Date(),
        postExcerpt: '',
        postPassword: '',
        toPing: '',
        pinged: '',
        postContentFiltered: '',
        guid: '', 
        postMimeType: '',
        meta: {
          create: [
            ...(data.thumbnailId ? [{ metaKey: '_thumbnail_id', metaValue: data.thumbnailId.toString() }] : []),
            ...(data.thumbnailUrl ? [{ metaKey: '_thumbnail_url', metaValue: data.thumbnailUrl }] : []),
            ...(data.metaData ? Object.entries(data.metaData).map(([key, value]) => ({ metaKey: key, metaValue: value })) : [])
          ]
        }
      }
    })
  }

  /**
   * Update an existing post.
   */
  static async update(id: number, data: { title?: string; content?: string; status?: string; type?: string; thumbnailId?: number; thumbnailUrl?: string; metaData?: Record<string, string>; postDate?: Date; parentId?: number | null }) {
    // 1. Fetch current post state to create a revision
    const currentPost = await prisma.post.findUnique({ where: { id } })
    
    // Only create a revision if we are updating the actual title or content of an existing post/page (not for trash/revisions itself)
    if (currentPost && currentPost.postStatus !== 'trash' && currentPost.postType !== 'revision') {
      if ((data.title !== undefined && data.title !== currentPost.postTitle) || 
          (data.content !== undefined && data.content !== currentPost.postContent)) {
        
        // Create revision of the OLD state before we apply the update
        await prisma.post.create({
          data: {
            postTitle: currentPost.postTitle,
            postContent: currentPost.postContent,
            postStatus: 'inherit',
            postName: `${id}-revision-v1-${Date.now()}`,
            postAuthor: currentPost.postAuthor,
            postType: 'revision',
            postParent: currentPost.id,
            postExcerpt: currentPost.postExcerpt,
            postPassword: currentPost.postPassword,
            toPing: currentPost.toPing,
            pinged: currentPost.pinged,
            postContentFiltered: currentPost.postContentFiltered,
            guid: `${currentPost.guid}-revision-${Date.now()}`,
            postMimeType: currentPost.postMimeType
          }
        })
      }
    }

    const updateData: any = {}
    if (data.title !== undefined) updateData.postTitle = data.title
    if (data.content !== undefined) updateData.postContent = data.content
    if (data.status !== undefined) updateData.postStatus = data.status
    if (data.type !== undefined) updateData.postType = data.type
    if (data.parentId !== undefined) updateData.postParent = data.parentId
    if (data.postDate !== undefined) {
      updateData.postDate = data.postDate
      updateData.postDateGmt = data.postDate
    }

    updateData.postModified = new Date()
    updateData.postModifiedGmt = new Date()

    const post = await prisma.post.update({
      where: { id },
      data: updateData
    })

    if (data.thumbnailId !== undefined || data.thumbnailUrl !== undefined) {
      if (data.thumbnailId) {
        // Delete old and create new to avoid duplicates since postId+metaKey is not unique
        await prisma.postMeta.deleteMany({ where: { postId: id, metaKey: '_thumbnail_id' } })
        await prisma.postMeta.create({ data: { postId: id, metaKey: '_thumbnail_id', metaValue: data.thumbnailId.toString() } })
      } else if (data.thumbnailId === null) {
        await prisma.postMeta.deleteMany({ where: { postId: id, metaKey: '_thumbnail_id' } })
      }

      if (data.thumbnailUrl) {
        await prisma.postMeta.deleteMany({ where: { postId: id, metaKey: '_thumbnail_url' } })
        await prisma.postMeta.create({ data: { postId: id, metaKey: '_thumbnail_url', metaValue: data.thumbnailUrl } })
      } else if (data.thumbnailUrl === null) {
        await prisma.postMeta.deleteMany({ where: { postId: id, metaKey: '_thumbnail_url' } })
      }
    }

    if (data.metaData) {
      const metaPromises = Object.entries(data.metaData).map(async ([key, value]) => {
        await prisma.postMeta.deleteMany({ where: { postId: id, metaKey: key } })
        if (value !== null && value !== '') {
          await prisma.postMeta.create({ data: { postId: id, metaKey: key, metaValue: value } })
        }
      })
      await Promise.all(metaPromises)
    }

    return post
  }

  /**
   * Delete a post (hard or soft).
   */
  static async delete(id: number, force: boolean = false) {
    const post = await prisma.post.findUnique({ where: { id } })
    if (!post) throw new Error('Not found')

    if (force || post.postStatus === 'trash') {
      await prisma.post.delete({ where: { id } })
      return { deleted: true, previous: post }
    } else {
      return prisma.post.update({
        where: { id },
        data: { postStatus: 'trash' }
      })
    }
  }

  /**
   * Get all non-trashed posts for admin dashboard.
   */
  static async getAdminList(postType: string = 'post', status: string = 'all', page: number = 1, limit: number = 20) {
    const where: any = { postType }

    if (status === 'all') {
      where.postStatus = { not: 'trash' }
    } else if (status === 'trash') {
      where.postStatus = 'trash'
    } else {
      where.postStatus = status
    }

    const skip = (page - 1) * limit

    const posts = await prisma.post.findMany({
      where,
      orderBy: { postDate: 'desc' },
      skip,
      take: limit,
      include: {
        author: {
          select: { id: true, displayName: true, userLogin: true }
        }
      }
    })

    const total = await prisma.post.count({ where })

    return {
      posts,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Get post counts by status for admin tabs.
   */
  static async getAdminCounts(postType: string = 'post') {
    const counts = await prisma.post.groupBy({
      by: ['postStatus'],
      where: { postType },
      _count: {
        postStatus: true,
      },
    })

    const result = {
      all: 0,
      publish: 0,
      draft: 0,
      private: 0,
      trash: 0,
    }

    counts.forEach(item => {
      const status = item.postStatus as keyof typeof result
      if (result[status] !== undefined) {
        result[status] = item._count.postStatus
      }
      if (status !== 'trash') {
        result.all += item._count.postStatus
      }
    })

    return result
  }

  /**
   * Get all revisions for a specific post.
   */
  static async getRevisions(postId: number) {
    return prisma.post.findMany({
      where: {
        postParent: postId,
        postType: 'revision'
      },
      orderBy: { postDate: 'desc' },
      select: {
        id: true,
        postTitle: true,
        postDate: true,
        author: {
          select: { displayName: true, userLogin: true }
        }
      }
    })
  }

  /**
   * Restore a post to a specific revision.
   */
  static async restoreRevision(revisionId: number) {
    const revision = await prisma.post.findUnique({ where: { id: revisionId } })
    if (!revision || revision.postType !== 'revision' || !revision.postParent) {
      throw new Error('Invalid revision')
    }

    // Call update on the parent post using the revision's content
    // This will naturally trigger the creation of a new revision of the CURRENT state before overriding it!
    return this.update(revision.postParent, {
      title: revision.postTitle,
      content: revision.postContent
    })
  }
}
